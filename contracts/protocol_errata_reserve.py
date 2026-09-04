# v0.2.17
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from genlayer import *

GEN = bigint(1000000000000000000)
RESERVE_AMOUNT = bigint(2000000000000000000)
MATERIAL_CREDIT = bigint(1000000000000000000)
REVIEW_WINDOW = 3 * 24 * 60 * 60


def _sender() -> Address:
    try:
        return gl.message.sender_address
    except Exception:
        return gl.message.sender


def _as_address(account: Address) -> Address:
    if hasattr(account, "as_bytes"):
        return account
    return Address(account)


def _addr_str(addr: Address) -> str:
    try:
        return addr.as_hex
    except Exception:
        return str(addr)


def _now() -> int:
    return int(datetime.now(timezone.utc).timestamp())


def _format_gen(amount: bigint) -> str:
    value = int(amount)
    whole = value // 1000000000000000000
    hundredths = (value % 1000000000000000000) // 10000000000000000
    return str(whole) + "." + str(hundredths).zfill(2)


def _host(url: str) -> str:
    if not url.startswith("https://"):
        return ""
    return url[8:].split("/", 1)[0].split(":", 1)[0].lower()


def _normalize_rfc(value: str) -> str:
    normalized = value.strip().upper().replace(" ", "")
    if normalized.startswith("RFC") and len(normalized) > 3:
        return normalized
    return ""


def _official_rfc_label(rfc_id: str) -> str:
    return "RFC " + rfc_id.replace("RFC", "")


@gl.evm.contract_interface
class _EoaRecipient:
    class View:
        pass

    class Write:
        pass


@allow_storage
@dataclass
class ReserveRecord:
    reserve_id: str
    sponsor: Address
    implementer: Address
    rfc_id: str
    section: str
    claim_text: str
    claim_version: str
    status: str
    reserve_balance: bigint
    material_credit: bigint
    created_at: u64
    expires_at: u64
    review_count: u32


@allow_storage
@dataclass
class ReviewRecord:
    review_id: str
    reserve_id: str
    errata_id: str
    errata_url: str
    status: str
    verdict: str
    rationale: str
    settlement_credit: bigint
    created_at: u64
    review_deadline: u64
    finalized_at: u64


class ProtocolErrataReserve(gl.Contract):
    reserves: TreeMap[str, ReserveRecord]
    reviews: TreeMap[str, ReviewRecord]
    credits: TreeMap[str, bigint]
    reserve_keys: DynArray[str]
    review_keys: DynArray[str]
    total_received: bigint
    total_withdrawn: bigint

    def __init__(self) -> None:
        pass

    def _require_reserve(self, reserve_id: str) -> ReserveRecord:
        if reserve_id not in self.reserves:
            raise gl.vm.UserError("reserve not found")
        return self.reserves[reserve_id]

    def _credit(self, account: Address, amount: bigint) -> None:
        if amount <= bigint(0):
            return
        key = _addr_str(account)
        previous = self.credits[key] if key in self.credits else bigint(0)
        self.credits[key] = previous + amount

    def _has_open_review(self, reserve_id: str) -> bool:
        for i in range(len(self.review_keys)):
            key = self.review_keys[i]
            if key in self.reviews:
                review = self.reviews[key]
                if review.reserve_id == reserve_id and review.status == "OPEN":
                    return True
        return False

    def _official_url(self, errata_id: str, url: str) -> bool:
        return _host(url) == "www.rfc-editor.org" and ("/errata/eid" + errata_id) in url

    def _official_fields_match(self, page_text: str, reserve: ReserveRecord, review: ReviewRecord) -> bool:
        if len(page_text) == 0:
            return False
        if ("Errata-ID: " + review.errata_id) not in page_text and ("Errata ID " + review.errata_id) not in page_text:
            return False
        if reserve.rfc_id not in page_text and _official_rfc_label(reserve.rfc_id) not in page_text:
            return False
        if ("Section " + reserve.section) not in page_text and ("section " + reserve.section) not in page_text:
            return False
        has_good_status = "Verified" in page_text or "Held for Document Update" in page_text
        if not has_good_status:
            return False
        if "Rejected" in page_text:
            return False
        if "Technical" not in page_text:
            return False
        return True

    @gl.public.write.payable
    def create_reserve(
        self,
        reserve_id: str,
        implementer: Address,
        rfc_id: str,
        section: str,
        claim_text: str,
        claim_version: str,
        expires_at: u64,
    ) -> None:
        if reserve_id in self.reserves:
            raise gl.vm.UserError("reserve ID already exists")
        if len(reserve_id) == 0 or len(section) == 0 or len(claim_text) == 0 or len(claim_version) == 0:
            raise gl.vm.UserError("invalid reserve parameters")
        normalized_rfc = _normalize_rfc(rfc_id)
        if len(normalized_rfc) == 0:
            raise gl.vm.UserError("invalid RFC ID")
        sponsor = _as_address(_sender())
        implementer_addr = _as_address(implementer)
        if _addr_str(sponsor) == _addr_str(implementer_addr):
            raise gl.vm.UserError("sponsor and implementer must differ")
        if bigint(gl.message.value) != RESERVE_AMOUNT:
            raise gl.vm.UserError("reserve requires exactly 2 GEN")
        now = _now()
        if int(expires_at) <= now:
            raise gl.vm.UserError("reserve expiry must be in the future")

        self.reserves[reserve_id] = ReserveRecord(
            reserve_id=reserve_id,
            sponsor=sponsor,
            implementer=implementer_addr,
            rfc_id=normalized_rfc,
            section=section,
            claim_text=claim_text,
            claim_version=claim_version,
            status="ACTIVE",
            reserve_balance=RESERVE_AMOUNT,
            material_credit=MATERIAL_CREDIT,
            created_at=u64(now),
            expires_at=expires_at,
            review_count=u32(0),
        )
        self.reserve_keys.append(reserve_id)
        self.total_received = self.total_received + RESERVE_AMOUNT

    @gl.public.write
    def open_review(self, review_id: str, reserve_id: str, errata_id: str, errata_url: str) -> None:
        if review_id in self.reviews:
            raise gl.vm.UserError("review ID already exists")
        reserve = self._require_reserve(reserve_id)
        caller = _as_address(_sender())
        if _addr_str(caller) != _addr_str(reserve.implementer):
            raise gl.vm.UserError("only implementer may open review")
        if reserve.status not in ("ACTIVE", "IMPACT_SETTLED", "NO_IMPACT_SETTLED", "UNVERIFIABLE"):
            raise gl.vm.UserError("reserve is not reviewable")
        if _now() >= int(reserve.expires_at):
            raise gl.vm.UserError("reserve has expired")
        if not errata_id.isdigit():
            raise gl.vm.UserError("invalid errata ID")
        if not self._official_url(errata_id, errata_url):
            raise gl.vm.UserError("review requires official RFC Editor errata URL")
        if self._has_open_review(reserve_id):
            raise gl.vm.UserError("reserve already has an open review")

        now = _now()
        self.reviews[review_id] = ReviewRecord(
            review_id=review_id,
            reserve_id=reserve_id,
            errata_id=errata_id,
            errata_url=errata_url,
            status="OPEN",
            verdict="PENDING",
            rationale="",
            settlement_credit=bigint(0),
            created_at=u64(now),
            review_deadline=u64(now + REVIEW_WINDOW),
            finalized_at=u64(0),
        )
        reserve.review_count = u32(int(reserve.review_count) + 1)
        self.reserves[reserve_id] = reserve
        self.review_keys.append(review_id)

    @gl.public.write
    def adjudicate_review(self, review_id: str) -> None:
        if review_id not in self.reviews:
            raise gl.vm.UserError("review not found")
        review = self.reviews[review_id]
        if review.status != "OPEN":
            raise gl.vm.UserError("review already finalized")
        if _now() >= int(review.review_deadline):
            raise gl.vm.UserError("review deadline has passed; use timeout recovery")
        reserve = self.reserves[review.reserve_id]

        def leader_fn():
            try:
                page_text = gl.nondet.web.render(review.errata_url, mode="text")
            except Exception:
                page_text = ""
            if not self._official_fields_match(page_text, reserve, review):
                return {"verdict": "UNVERIFIABLE", "rationale": "Official RFC Editor fields did not match the locked reserve."}
            prompt = (
                "You are judging an official RFC Editor erratum against a locked reserve.\n"
                "Only the contract state defines parties, payout and authority.\n"
                "Locked RFC: " + reserve.rfc_id + "\n"
                "Locked section: " + reserve.section + "\n"
                "Locked claim version: " + reserve.claim_version + "\n"
                "Locked claim: " + reserve.claim_text + "\n\n"
                "Official RFC Editor erratum text:\n" + page_text[:5000] + "\n\n"
                "Return JSON only: {\"verdict\":\"MATERIAL_IMPACT\"|\"NO_MATERIAL_IMPACT\"|\"UNVERIFIABLE\","
                "\"rationale\":\"concise reason\"}."
            )
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            if isinstance(raw, str):
                try:
                    return json.loads(raw)
                except Exception:
                    return {"verdict": "UNVERIFIABLE", "rationale": "Validator output was malformed."}
            return raw

        def validator_fn(leader_res) -> bool:
            if not isinstance(leader_res, gl.vm.Return) or not isinstance(leader_res.calldata, dict):
                return False
            mine = leader_fn()
            if not isinstance(mine, dict):
                return False
            return mine.get("verdict") == leader_res.calldata.get("verdict")

        result = gl.vm.run_nondet(leader_fn, validator_fn)
        verdict = result.get("verdict", "UNVERIFIABLE") if isinstance(result, dict) else "UNVERIFIABLE"
        rationale = result.get("rationale", "Adjudicated by GenLayer validators.") if isinstance(result, dict) else "Validator output was malformed."
        if verdict not in ("MATERIAL_IMPACT", "NO_MATERIAL_IMPACT", "UNVERIFIABLE"):
            verdict = "UNVERIFIABLE"
            rationale = "Validator output used an invalid verdict."
        self._settle_review(review_id, verdict, rationale)

    @gl.public.write
    def recover_review_timeout(self, review_id: str) -> None:
        if review_id not in self.reviews:
            raise gl.vm.UserError("review not found")
        review = self.reviews[review_id]
        if review.status != "OPEN":
            raise gl.vm.UserError("review already finalized")
        if _now() < int(review.review_deadline):
            raise gl.vm.UserError("review has not timed out")
        self._settle_review(review_id, "UNVERIFIABLE", "Review timed out without a validator decision.")

    def _settle_review(self, review_id: str, verdict: str, rationale: str) -> None:
        review = self.reviews[review_id]
        if review.status != "OPEN":
            raise gl.vm.UserError("review already finalized")
        reserve = self.reserves[review.reserve_id]
        if verdict == "MATERIAL_IMPACT":
            if reserve.reserve_balance < reserve.material_credit:
                verdict = "UNVERIFIABLE"
                review.settlement_credit = bigint(0)
            else:
                reserve.reserve_balance = reserve.reserve_balance - reserve.material_credit
                review.settlement_credit = reserve.material_credit
                reserve.status = "IMPACT_SETTLED"
                self._credit(reserve.implementer, reserve.material_credit)
        elif verdict == "NO_MATERIAL_IMPACT":
            reserve.status = "NO_IMPACT_SETTLED"
            review.settlement_credit = bigint(0)
        else:
            verdict = "UNVERIFIABLE"
            reserve.status = "UNVERIFIABLE"
            review.settlement_credit = bigint(0)
        review.status = verdict
        review.verdict = verdict
        review.rationale = rationale[:1000]
        review.finalized_at = u64(_now())
        self.reviews[review_id] = review
        self.reserves[review.reserve_id] = reserve

    @gl.public.write
    def close_reserve(self, reserve_id: str) -> None:
        reserve = self._require_reserve(reserve_id)
        if _addr_str(_as_address(_sender())) != _addr_str(reserve.sponsor):
            raise gl.vm.UserError("only sponsor may close reserve")
        if reserve.status == "CLOSED":
            raise gl.vm.UserError("reserve already closed")
        if self._has_open_review(reserve_id):
            raise gl.vm.UserError("cannot close reserve with open review")
        has_final_review = reserve.review_count > u32(0)
        if not has_final_review and _now() < int(reserve.expires_at):
            raise gl.vm.UserError("reserve has not expired")
        remaining = reserve.reserve_balance
        reserve.reserve_balance = bigint(0)
        reserve.status = "CLOSED"
        self.reserves[reserve_id] = reserve
        self._credit(reserve.sponsor, remaining)

    @gl.public.write
    def withdraw_credits(self) -> None:
        caller = _as_address(_sender())
        key = _addr_str(caller)
        amount = self.credits[key] if key in self.credits else bigint(0)
        if amount <= bigint(0):
            raise gl.vm.UserError("no credits")
        self.credits[key] = bigint(0)
        self.total_withdrawn = self.total_withdrawn + amount
        _EoaRecipient(caller).emit_transfer(value=u256(amount))

    @gl.public.view
    def get_reserve(self, reserve_id: str) -> str:
        reserve = self._require_reserve(reserve_id)
        return json.dumps(
            {
                "reserve_id": reserve.reserve_id,
                "sponsor": _addr_str(reserve.sponsor),
                "implementer": _addr_str(reserve.implementer),
                "rfc_id": reserve.rfc_id,
                "section": reserve.section,
                "claim_text": reserve.claim_text,
                "claim_version": reserve.claim_version,
                "status": reserve.status,
                "reserve_balance_gen": _format_gen(reserve.reserve_balance),
                "material_credit_gen": _format_gen(reserve.material_credit),
                "created_at": int(reserve.created_at),
                "expires_at": int(reserve.expires_at),
                "review_count": int(reserve.review_count),
            }
        )

    @gl.public.view
    def get_review(self, review_id: str) -> str:
        if review_id not in self.reviews:
            raise gl.vm.UserError("review not found")
        review = self.reviews[review_id]
        return json.dumps(
            {
                "review_id": review.review_id,
                "reserve_id": review.reserve_id,
                "errata_id": review.errata_id,
                "errata_url": review.errata_url,
                "status": review.status,
                "verdict": review.verdict,
                "rationale": review.rationale,
                "settlement_credit_gen": _format_gen(review.settlement_credit),
                "created_at": int(review.created_at),
                "review_deadline": int(review.review_deadline),
                "finalized_at": int(review.finalized_at),
            }
        )

    @gl.public.view
    def get_all_reserves(self) -> str:
        rows = []
        for i in range(len(self.reserve_keys)):
            key = self.reserve_keys[i]
            if key in self.reserves:
                rows.append(json.loads(self.get_reserve(key)))
        return json.dumps(rows)

    @gl.public.view
    def get_all_reviews(self) -> str:
        rows = []
        for i in range(len(self.review_keys)):
            key = self.review_keys[i]
            if key in self.reviews:
                rows.append(json.loads(self.get_review(key)))
        return json.dumps(rows)

    @gl.public.view
    def get_credits(self, account: Address) -> str:
        key = _addr_str(_as_address(account))
        amount = self.credits[key] if key in self.credits else bigint(0)
        return _format_gen(amount)

    @gl.public.view
    def get_accounting(self) -> str:
        reserve_balances = bigint(0)
        for i in range(len(self.reserve_keys)):
            key = self.reserve_keys[i]
            if key in self.reserves:
                reserve_balances = reserve_balances + self.reserves[key].reserve_balance
        credits = bigint(0)
        seen_credit_keys = []
        for i in range(len(self.reserve_keys)):
            key = self.reserve_keys[i]
            if key in self.reserves:
                reserve = self.reserves[key]
                sponsor_key = _addr_str(reserve.sponsor)
                implementer_key = _addr_str(reserve.implementer)
                if sponsor_key in self.credits and sponsor_key not in seen_credit_keys:
                    credits = credits + self.credits[sponsor_key]
                    seen_credit_keys.append(sponsor_key)
                if implementer_key in self.credits and implementer_key not in seen_credit_keys:
                    credits = credits + self.credits[implementer_key]
                    seen_credit_keys.append(implementer_key)
        accounted = reserve_balances + credits + self.total_withdrawn
        return json.dumps(
            {
                "total_received_gen": _format_gen(self.total_received),
                "reserve_balances_gen": _format_gen(reserve_balances),
                "credits_pending_gen": _format_gen(credits),
                "total_withdrawn_gen": _format_gen(self.total_withdrawn),
                "accounted_total_gen": _format_gen(accounted),
                "balanced": int(accounted) == int(self.total_received),
            }
        )
