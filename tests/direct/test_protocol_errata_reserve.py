import json

import pytest

from tests.direct.helpers import GEN, RESERVE_ID, RFC_URL, create_reserve, mock_official_errata, mock_verdict, open_review


def test_create_reserve_locks_claim_and_accounting(direct_deploy, direct_vm, direct_alice, direct_bob):
    contract = direct_deploy("contracts/protocol_errata_reserve.py")
    create_reserve(contract, direct_vm, direct_alice, direct_bob)

    reserve = json.loads(contract.get_reserve(RESERVE_ID))
    assert reserve["reserve_id"] == RESERVE_ID
    assert reserve["rfc_id"] == "RFC2865"
    assert reserve["section"] == "4.1"
    assert reserve["status"] == "ACTIVE"
    assert reserve["reserve_balance_gen"] == "2.00"
    assert reserve["material_credit_gen"] == "1.00"

    accounting = json.loads(contract.get_accounting())
    assert accounting["total_received_gen"] == "2.00"
    assert accounting["balanced"] is True


def test_create_reserve_rejects_wrong_amount_duplicate_and_same_party(direct_deploy, direct_vm, direct_alice, direct_bob):
    contract = direct_deploy("contracts/protocol_errata_reserve.py")

    direct_vm.sender = direct_alice
    direct_vm.value = GEN
    with pytest.raises(Exception, match="exactly 2 GEN"):
        contract.create_reserve("bad-amount", direct_bob, "RFC2865", "4.1", "claim", "v1", 1900000000)

    direct_vm.value = 2 * GEN
    with pytest.raises(Exception, match="sponsor and implementer must differ"):
        contract.create_reserve("same-party", direct_alice, "RFC2865", "4.1", "claim", "v1", 1900000000)


def test_open_review_requires_implementer_and_official_url(direct_deploy, direct_vm, direct_alice, direct_bob, direct_charlie):
    contract = direct_deploy("contracts/protocol_errata_reserve.py")
    create_reserve(contract, direct_vm, direct_alice, direct_bob)

    direct_vm.sender = direct_charlie
    with pytest.raises(Exception, match="only implementer"):
        contract.open_review("review-wrong-caller", RESERVE_ID, "9034", RFC_URL)

    direct_vm.sender = direct_bob
    with pytest.raises(Exception, match="official RFC Editor"):
        contract.open_review("review-wrong-host", RESERVE_ID, "9034", "https://example.com/errata/eid9034")

    contract.open_review("review-ok", RESERVE_ID, "9034", RFC_URL)
    review = json.loads(contract.get_review("review-ok"))
    assert review["status"] == "OPEN"
    assert review["errata_id"] == "9034"


def test_material_impact_credits_implementer_once(direct_deploy, direct_vm, direct_alice, direct_bob):
    contract = direct_deploy("contracts/protocol_errata_reserve.py")
    create_reserve(contract, direct_vm, direct_alice, direct_bob)
    open_review(contract, direct_vm, direct_bob)
    mock_official_errata(direct_vm)
    mock_verdict(direct_vm, "MATERIAL_IMPACT")

    direct_vm.sender = direct_alice
    contract.adjudicate_review("review-eid9034")

    review = json.loads(contract.get_review("review-eid9034"))
    assert review["status"] == "MATERIAL_IMPACT"
    assert review["verdict"] == "MATERIAL_IMPACT"
    assert review["settlement_credit_gen"] == "1.00"
    assert contract.get_credits(direct_bob) == "1.00"

    reserve = json.loads(contract.get_reserve(RESERVE_ID))
    assert reserve["reserve_balance_gen"] == "1.00"
    assert reserve["status"] == "IMPACT_SETTLED"

    with pytest.raises(Exception, match="review already finalized"):
        contract.adjudicate_review("review-eid9034")


def test_same_errata_new_review_id_cannot_create_second_material_credit(
    direct_deploy,
    direct_vm,
    direct_alice,
    direct_bob,
):
    contract = direct_deploy("contracts/protocol_errata_reserve.py")
    create_reserve(contract, direct_vm, direct_alice, direct_bob)
    open_review(contract, direct_vm, direct_bob)
    mock_official_errata(direct_vm)
    mock_verdict(direct_vm, "MATERIAL_IMPACT")

    direct_vm.sender = direct_alice
    contract.adjudicate_review("review-eid9034")
    direct_vm.clear_mocks()

    direct_vm.sender = direct_bob
    with pytest.raises(Exception, match="errata already credited for reserve"):
        contract.open_review(
            "review-eid9034-repeat",
            RESERVE_ID,
            "9034",
            RFC_URL,
        )

    first_review = json.loads(contract.get_review("review-eid9034"))
    reserve = json.loads(contract.get_reserve(RESERVE_ID))
    accounting = json.loads(contract.get_accounting())

    assert first_review["settlement_credit_gen"] == "1.00"
    with pytest.raises(Exception, match="review not found"):
        contract.get_review("review-eid9034-repeat")
    assert reserve["review_count"] == 1
    assert reserve["reserve_balance_gen"] == "1.00"
    assert contract.get_credits(direct_bob) == "1.00"
    assert accounting == {
        "total_received_gen": "2.00",
        "reserve_balances_gen": "1.00",
        "credits_pending_gen": "1.00",
        "total_withdrawn_gen": "0.00",
        "accounted_total_gen": "2.00",
        "balanced": True,
    }


def test_non_material_and_unverifiable_evidence_remain_retryable(
    direct_deploy,
    direct_vm,
    direct_alice,
    direct_bob,
):
    contract = direct_deploy("contracts/protocol_errata_reserve.py")

    create_reserve(
        contract,
        direct_vm,
        direct_alice,
        direct_bob,
        reserve_id="reserve-no-impact-retry",
    )
    open_review(
        contract,
        direct_vm,
        direct_bob,
        reserve_id="reserve-no-impact-retry",
        review_id="review-no-impact-first",
    )
    mock_official_errata(direct_vm)
    mock_verdict(direct_vm, "NO_MATERIAL_IMPACT")
    contract.adjudicate_review("review-no-impact-first")
    direct_vm.clear_mocks()

    open_review(
        contract,
        direct_vm,
        direct_bob,
        reserve_id="reserve-no-impact-retry",
        review_id="review-no-impact-retry",
    )
    assert json.loads(contract.get_review("review-no-impact-retry"))["status"] == "OPEN"
    assert json.loads(contract.get_reserve("reserve-no-impact-retry"))["review_count"] == 2

    create_reserve(
        contract,
        direct_vm,
        direct_alice,
        direct_bob,
        reserve_id="reserve-unverifiable-retry",
    )
    open_review(
        contract,
        direct_vm,
        direct_bob,
        reserve_id="reserve-unverifiable-retry",
        review_id="review-unverifiable-first",
    )
    direct_vm.mock_web(
        r".*rfc-editor\.org/errata/eid9034.*",
        {"method": "GET", "status": 500, "body": ""},
    )
    contract.adjudicate_review("review-unverifiable-first")
    direct_vm.clear_mocks()

    open_review(
        contract,
        direct_vm,
        direct_bob,
        reserve_id="reserve-unverifiable-retry",
        review_id="review-unverifiable-retry",
    )
    assert json.loads(contract.get_review("review-unverifiable-retry"))["status"] == "OPEN"
    assert json.loads(contract.get_reserve("reserve-unverifiable-retry"))["review_count"] == 2


def test_accounting_counts_shared_actor_credits_once_across_reserves(direct_deploy, direct_vm, direct_alice, direct_bob):
    contract = direct_deploy("contracts/protocol_errata_reserve.py")

    for suffix in ("one", "two"):
        reserve_id = f"reserve-rfc2865-{suffix}"
        review_id = f"review-eid9034-{suffix}"
        create_reserve(contract, direct_vm, direct_alice, direct_bob, reserve_id=reserve_id)
        open_review(contract, direct_vm, direct_bob, reserve_id=reserve_id, review_id=review_id)
        mock_official_errata(direct_vm)
        mock_verdict(direct_vm, "MATERIAL_IMPACT")
        direct_vm.sender = direct_alice
        contract.adjudicate_review(review_id)
        direct_vm.clear_mocks()

    accounting = json.loads(contract.get_accounting())
    assert accounting["total_received_gen"] == "4.00"
    assert accounting["reserve_balances_gen"] == "2.00"
    assert accounting["credits_pending_gen"] == "2.00"
    assert accounting["accounted_total_gen"] == "4.00"
    assert accounting["balanced"] is True


def test_no_material_impact_and_unverifiable_do_not_credit_implementer(direct_deploy, direct_vm, direct_alice, direct_bob):
    contract = direct_deploy("contracts/protocol_errata_reserve.py")
    create_reserve(contract, direct_vm, direct_alice, direct_bob, reserve_id="reserve-no-impact")
    open_review(contract, direct_vm, direct_bob, reserve_id="reserve-no-impact", review_id="review-no-impact")
    mock_official_errata(direct_vm)
    mock_verdict(direct_vm, "NO_MATERIAL_IMPACT")

    contract.adjudicate_review("review-no-impact")
    assert json.loads(contract.get_review("review-no-impact"))["status"] == "NO_MATERIAL_IMPACT"
    assert contract.get_credits(direct_bob) == "0.00"

    direct_vm.clear_mocks()
    create_reserve(contract, direct_vm, direct_alice, direct_bob, reserve_id="reserve-unverifiable")
    open_review(contract, direct_vm, direct_bob, reserve_id="reserve-unverifiable", review_id="review-unverifiable")
    direct_vm.mock_web(r".*rfc-editor\.org/errata/eid9034.*", {"method": "GET", "status": 500, "body": ""})
    contract.adjudicate_review("review-unverifiable")
    assert json.loads(contract.get_review("review-unverifiable"))["status"] == "UNVERIFIABLE"
    assert contract.get_credits(direct_bob) == "0.00"


def test_invalid_official_fields_force_unverifiable_before_llm_value(direct_deploy, direct_vm, direct_alice, direct_bob):
    contract = direct_deploy("contracts/protocol_errata_reserve.py")
    create_reserve(contract, direct_vm, direct_alice, direct_bob)
    open_review(contract, direct_vm, direct_bob)
    mock_official_errata(direct_vm, "Errata-ID: 9034\nStatus: Rejected\nType: Technical\nSection 4.1")
    mock_verdict(direct_vm, "MATERIAL_IMPACT")

    contract.adjudicate_review("review-eid9034")

    assert json.loads(contract.get_review("review-eid9034"))["status"] == "UNVERIFIABLE"
    assert contract.get_credits(direct_bob) == "0.00"
    assert json.loads(contract.get_reserve(RESERVE_ID))["reserve_balance_gen"] == "2.00"


def test_timeout_recovery_and_sponsor_close_credit_remaining_reserve(direct_deploy, direct_vm, direct_alice, direct_bob):
    contract = direct_deploy("contracts/protocol_errata_reserve.py")
    create_reserve(contract, direct_vm, direct_alice, direct_bob, reserve_id="reserve-timeout")
    open_review(contract, direct_vm, direct_bob, reserve_id="reserve-timeout", review_id="review-timeout")

    with pytest.raises(Exception, match="review has not timed out"):
        contract.recover_review_timeout("review-timeout")

    direct_vm.warp("2030-01-01T00:00:00Z")
    contract.recover_review_timeout("review-timeout")
    assert json.loads(contract.get_review("review-timeout"))["status"] == "UNVERIFIABLE"

    direct_vm.sender = direct_bob
    with pytest.raises(Exception, match="only sponsor"):
        contract.close_reserve("reserve-timeout")

    direct_vm.sender = direct_alice
    contract.close_reserve("reserve-timeout")
    assert contract.get_credits(direct_alice) == "2.00"
    assert json.loads(contract.get_reserve("reserve-timeout"))["status"] == "CLOSED"


def test_withdraw_credits_debits_before_transfer(direct_deploy, direct_vm, direct_alice, direct_bob):
    contract = direct_deploy("contracts/protocol_errata_reserve.py")
    create_reserve(contract, direct_vm, direct_alice, direct_bob)
    open_review(contract, direct_vm, direct_bob)
    mock_official_errata(direct_vm)
    mock_verdict(direct_vm, "MATERIAL_IMPACT")
    contract.adjudicate_review("review-eid9034")

    direct_vm.sender = direct_bob
    contract.withdraw_credits()
    assert contract.get_credits(direct_bob) == "0.00"
    accounting = json.loads(contract.get_accounting())
    assert accounting["total_withdrawn_gen"] == "1.00"
    assert accounting["balanced"] is True

    with pytest.raises(Exception, match="no credits"):
        contract.withdraw_credits()
