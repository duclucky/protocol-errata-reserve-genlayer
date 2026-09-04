from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

CONTRACT_PATH = Path("contracts/protocol_errata_reserve.py")
GEN = 10**18
RESERVE_ID = "reserve-rfc2865-radius-auth"
REVIEW_ID = "review-eid9034"
RFC_URL = "https://www.rfc-editor.org/errata/eid9034"


def ts(days: int = 30) -> int:
    return int((datetime.now(timezone.utc) + timedelta(days=days)).timestamp())


def create_reserve(contract, vm, sponsor, implementer, reserve_id=RESERVE_ID):
    vm.sender = sponsor
    vm.value = 2 * GEN
    contract.create_reserve(
        reserve_id,
        implementer,
        "RFC2865",
        "4.1",
        "Implementation accepts Access-Request packets from valid RADIUS clients without requiring Message-Authenticator.",
        "claim-v1",
        ts(30),
    )
    vm.value = 0
    return reserve_id


def open_review(contract, vm, implementer, reserve_id=RESERVE_ID, review_id=REVIEW_ID, errata_id="9034", url=RFC_URL):
    vm.sender = implementer
    vm.value = 0
    contract.open_review(review_id, reserve_id, errata_id, url)
    return review_id


def mock_official_errata(vm, body=None):
    if body is None:
        body = """
        Errata-ID: 9034
        RFC2865 Remote Authentication Dial In User Service
        Status: Held for Document Update
        Type: Technical
        Section 4.1 says:
        Upon receipt of an Access-Request from a valid client, an appropriate reply MUST be transmitted.
        It should say:
        Access-Request packets MUST contain a Message-Authenticator attribute.
        Upon receipt of an Access-Request from a valid client, an appropriate reply MUST be transmitted.
        """
    vm.mock_web(r".*rfc-editor\.org/errata/eid9034.*", {"method": "GET", "status": 200, "body": body})


def mock_verdict(vm, verdict="MATERIAL_IMPACT", rationale="The corrected MUST changes Access-Request authentication requirements."):
    vm.mock_llm(
        r".*official RFC Editor erratum.*",
        json.dumps({"verdict": verdict, "rationale": rationale}),
    )
