# Single Material Credit Per Evidence Design

## Context

`ProtocolErrataReserve` currently makes `review_id` unique, but it does not retain a permanent record that an official RFC erratum has already produced a material credit for a reserve. After a material review settles, the implementer can open another review with a new `review_id`, reuse the same errata evidence, and receive the reserve's second 1 GEN credit.

The reviewer requires an errata ID or URL to earn at most one material credit for the same reserve, including after settlement. Retries that previously ended as `NO_MATERIAL_IMPACT` or `UNVERIFIABLE` must remain possible.

## Scope

This change applies only to the contract evidence and accounting invariant. It does not change the 2 GEN reserve amount, the 1 GEN material credit, validator prompts, verdict classes, wallet behavior, or frontend navigation.

Because the deployed contract is immutable, completing the remediation later requires a new Studionet deployment and updating the frontend and submission evidence to the new address. The current implementation task must not describe the old deployment as fixed.

## Chosen Design

The contract will append two permanent storage indexes:

```python
credited_errata_ids: TreeMap[str, bool]
credited_errata_urls: TreeMap[str, bool]
```

Each key is scoped to one reserve:

```text
<reserve_id>|id|<canonical errata id>
<reserve_id>|url|<canonical official URL>
```

The canonical errata ID is the validated decimal string already stored on the review. The canonical URL is derived deterministically as:

```text
https://www.rfc-editor.org/errata/eid<errata_id>
```

Deriving the URL identity from the validated ID prevents query strings, fragments, trailing text, or alternate textual URL forms from bypassing the lock. The two indexes make both reviewer terms explicit while resolving to the same official evidence identity.

`open_review` will reject a new review when either scoped key is already marked, using the stable error `errata already credited for reserve`. This check runs before creating a `ReviewRecord`, incrementing `review_count`, or appending `review_keys`.

`_settle_review` will mark both keys only on the successful `MATERIAL_IMPACT` path, after confirming the reserve can fund the 1 GEN material credit and immediately before debiting the reserve and crediting the implementer. `NO_MATERIAL_IMPACT`, `UNVERIFIABLE`, timeout recovery, and insufficient-funds fallback do not mark either key.

## State And Accounting Invariants

For every reserve and canonical errata identity:

```text
material-credit count <= 1
sum of settlement_credit for that evidence <= 1 GEN
```

After one material settlement:

- implementer pending credit increases by exactly 1 GEN;
- reserve balance decreases from 2 GEN to 1 GEN;
- both evidence keys remain locked permanently, including after withdrawal or reserve closure;
- a duplicate `open_review` with a new review ID leaves reviews, `review_count`, reserve balance, pending credits, withdrawals, and total accounting unchanged;
- `get_accounting().balanced` remains `true` and `accounted_total_gen` remains equal to `total_received_gen`.

## Retry Semantics

- A prior `NO_MATERIAL_IMPACT` review does not lock the evidence and may be retried with a new review ID.
- A prior `UNVERIFIABLE` or timeout-recovered review does not lock the evidence and may be retried with a new review ID.
- The first successfully funded `MATERIAL_IMPACT` settlement locks both evidence identities permanently for that reserve.
- The same erratum may still be used in a different reserve because every key includes `reserve_id`.

## Write-Method Safety Cards

### `open_review`

- Caller authorization: only the reserve implementer.
- Allowed reserve states: `ACTIVE`, `IMPACT_SETTLED`, `NO_IMPACT_SETTLED`, `UNVERIFIABLE`.
- Forbidden states: missing, closed, expired, or already holding an open review.
- Temporal gate: transaction time must satisfy `now < reserve.expires_at`.
- Idempotency: duplicate `review_id` is rejected; evidence already materially credited in the same reserve is rejected even under a new review ID.
- Value effect: none.
- Canonical views affected on success: reserve `review_count`, review record, all-reviews view.
- Required negative proof: duplicate evidence after material settlement changes no review, reserve, credit, or accounting state.

### `_settle_review` Material Path

- Caller authorization: internal transition reached from adjudication of an open review.
- Allowed state: review is `OPEN` and reserve has at least 1 GEN available.
- Forbidden states: already finalized review or insufficient reserve balance for a material credit.
- Temporal gate: enforced by `adjudicate_review`; timeout recovery can only settle `UNVERIFIABLE`.
- Idempotency: finalized review cannot settle again; successful material settlement records both permanent evidence keys before value accounting mutations.
- Value effect: debit reserve by 1 GEN and add exactly 1 GEN implementer credit.
- Canonical views affected: review, reserve, implementer credits, accounting, both evidence indexes.
- Required negative proof: repeating the evidence under a new review ID cannot create a second credit or consume the final reserve GEN.

## Regression Tests

The primary regression test will execute the reviewer scenario against real direct-mode contract behavior:

1. Create one 2 GEN reserve.
2. Open `review-eid9034` for errata ID `9034` and its official RFC Editor URL.
3. Settle it as `MATERIAL_IMPACT`.
4. Attempt to open `review-eid9034-repeat` with the same evidence.
5. Assert rejection with `errata already credited for reserve`.
6. Assert only the first review exists and `review_count` remains `1`.
7. Assert implementer credit is `1.00 GEN` and reserve balance is `1.00 GEN`.
8. Assert accounting is balanced: 2.00 GEN received, 1.00 GEN in reserves, 1.00 GEN pending credit, 0.00 GEN withdrawn, and 2.00 GEN accounted.

Additional focused tests will prove retries remain available after `NO_MATERIAL_IMPACT` and `UNVERIFIABLE`, and that the same errata can earn one credit in each of two different reserves.

## Verification And Release

Implementation must follow RED-GREEN-REFACTOR. The primary regression test must first fail because the second review currently opens successfully. After the minimum contract change, run GenVM lint before direct tests, then the full `npm run check` acceptance suite.

Deployment is a separate, explicit release task in the implementation plan: deploy the corrected contract to Studionet, update the active deployment manifest and public frontend configuration, deploy Vercel, and repeat the live reviewer path. Wallet confirmation remains manual. No deployment or frontend mutation is part of writing this design or the TDD plan.

## Non-Goals

- Preventing the same erratum from earning credit across different reserves.
- Locking evidence after non-material or unverifiable outcomes.
- Changing reserve or credit denominations.
- Adding a new verdict class.
- Migrating state from the superseded contract.
