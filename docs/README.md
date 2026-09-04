# ProtocolErrataReserve Specification

## Identity

- Idea ID: `IDEA-023`
- Project name: `ProtocolErrataReserve`
- Project slug: `protocol-errata-reserve`
- Category: `Projects`
- Target network: `studionet` (chain ID `61999`, RPC `https://studio.genlayer.com/api`)
- Status: `STUDIONET VERIFIED`

## Product hook

Fund protocol remediation before an official RFC erratum becomes a blame fight.

## Trust problem

Sponsors and implementers cannot trust either party to neutrally judge whether an official RFC Editor erratum materially changes a funded protocol conformance obligation. The sponsor has an incentive to deny impact and recover unused funds. The implementer has an incentive to overstate impact and unlock remediation funds.

## Scope

In scope:

- One reserve for one locked RFC conformance claim.
- Official RFC Editor errata evidence from `rfc-editor.org`.
- GenLayer semantic adjudication of material impact.
- 2 GEN demo reserve, 1 GEN material-impact remediation credit, pull withdrawals.
- Multi-page frontend with wallet selection, real transactions, finality states and canonical state reload.

Out of scope:

- Legal liability, vulnerability severity scoring, source-code proof, package scanning and automatic patch deployment.
- Non-RFC standards authorities in v1.
- Any actor-controlled evidence path that changes payout or authority.

## Fingerprint

1. **Trust problem:** Neutral settlement of official standards errata impact on a funded protocol conformance claim.
2. **Actors/adversary:** Sponsor, implementer/maintainer, downstream integrator.
3. **Evidence/authenticity:** Official RFC Editor errata and RFC text from `rfc-editor.org`, bound to locked reserve fields.
4. **Consensus question:** `MATERIAL_IMPACT`, `NO_MATERIAL_IMPACT`, or `UNVERIFIABLE`.
5. **State machine:** `ACTIVE -> REVIEW_OPEN -> MATERIAL_IMPACT | NO_MATERIAL_IMPACT | UNVERIFIABLE -> CLOSED`.
6. **Consequence:** Material impact credits 1 GEN to implementer; no-material keeps sponsor refund rights; unverifiable blocks penalty.
7. **Reuse:** SDKs, dependency programs, compliance marketplaces and maintainer funding pools.

## Mandatory gate matrix

| Gate | Result | Reason |
| --- | --- | --- |
| Replacement | `PASS` | A centralized operator would control disputed standards-impact funds. |
| Judgment | `PASS` | Material impact is semantic, not a deterministic field comparison. |
| Evidence availability | `PASS` | RFC Editor errata JSON/page and RFC source text were fetched in the spike. |
| Evidence authenticity | `PASS` | Consequential fields come only from `rfc-editor.org`; actor prose is ignored for authority. |
| Equivalence | `PASS` | Validators compare verdict enum, source coverage and bounded impact dimensions. |
| Consequence | `PASS` | Verdict changes GEN credit/refund rights and reserve status. |
| Adversarial | `PASS` | Sponsor and implementer have opposed incentives. |
| State model | `PASS` | Per-reserve/per-review maps isolate storage and prevent duplicate settlement. |
| Reuse | `PASS` | Any RFC-backed protocol claim can use the same reserve interface. |
| Contract count | `PASS` | One contract owns reserve, review, settlement, credits and views. |
| Differentiation | `PASS` | Not API compatibility, license drift, regulatory docket impact, or agent SLA. |
| Claim-to-code | `PASS` | Every claim maps to a method, view, test and evidence target below. |
| Full lifecycle | `PASS` | Browser and script lifecycle can cover fund, review, finalize, reload and withdraw. |
| Scope honesty | `PASS` | The project does not claim source-code compliance or legal truth. |

## Evidence Authority Matrix

| Path | Canonical objective | Authority and bindings | Failure result | Consequences blocked |
| --- | --- | --- | --- | --- |
| `EA-RESERVE` | Lock sponsor, implementer, RFC ID, section, claim version, expiry and 2 GEN reserve | Sponsor transaction plus contract state | Revert | Reviews and credits |
| `EA-RFC-ERRATUM` | Establish official erratum | `rfc-editor.org`; exact errata ID, RFC ID, status, type, section, original/corrected text, update date | `UNVERIFIABLE` | Material-impact credit |
| `EA-VERDICT` | Interpret official erratum against locked claim | Independent leader/validator replay plus deterministic invariants | Revert or `UNVERIFIABLE` | Every value movement |

## Value destination matrix

| Value | Source | Locked state | Release/refund/forfeit destination | Duplicate/late behavior | Proof view |
| --- | --- | --- | --- | --- | --- |
| Reserve funding | Sponsor, exactly 2 GEN demo amount | `ACTIVE` reserve | 1 GEN to implementer on material impact; remaining sponsor refund after close | Duplicate reserve ID reverts | `get_reserve`, `get_accounting` |
| Remediation credit | Reserve balance | `MATERIAL_IMPACT` review | Implementer credit, withdrawn by pull payment | Second withdrawal reverts | `get_credits` |
| Sponsor refund | Remaining reserve balance | `NO_MATERIAL_IMPACT`, `UNVERIFIABLE`, or `CLOSED` | Sponsor credit/withdrawal | Late duplicate close reverts | `get_credits`, `get_accounting` |

## Write-method safety cards

| Method | Caller | Allowed states | Forbidden states | Temporal gate | Idempotency | Value/accounting | Views | Negative tests |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `create_reserve` | Sponsor | New reserve | Existing reserve | `now < expires_at` | Unique ID | Receives exactly 2 GEN; locks claim | Reserve/accounting | Duplicate, wrong amount, same party, invalid RFC/section |
| `open_review` | Implementer | `ACTIVE` reserve | Closed/finalized | `now < expires_at` | Unique review and no open duplicate errata for reserve | No value | Review/reserve | Wrong caller, wrong URL/host/ID, duplicate |
| `adjudicate_review` | Any | `OPEN` review | Finalized review | `now < review_deadline`; equality late | One settlement | Material credits 1 GEN to implementer; other outcomes no slash | Review/reserve/credits/accounting | Invalid source/LLM output, duplicate, late |
| `recover_review_timeout` | Implementer or sponsor | `OPEN` review | Finalized review | `now >= review_deadline`; equality timeout | One settlement | Marks `UNVERIFIABLE`, no material credit | Review/reserve | Boundary -1/equal/+1, wrong state |
| `close_reserve` | Sponsor | Active/final reserve, no open review | Already closed | `now >= expires_at` unless final review exists | One close | Credits remaining reserve to sponsor | Reserve/credits/accounting | Wrong caller, premature, open review, duplicate |
| `withdraw_credits` | Credited account | Credit > 0 | Zero credit | N/A | Debit before transfer | Pull transfer, increments withdrawn | Credits/accounting | Zero, double withdrawal |

## Claim-to-code matrix

| Product claim | Contract method/state | View | Test | Evidence |
| --- | --- | --- | --- | --- |
| Lock 2 GEN reserve | `create_reserve` / `ACTIVE` | `get_reserve` | Direct create/accounting tests | Local + Studionet receipt |
| Submit official erratum | `open_review` / `OPEN` | `get_review` | Direct URL/authority tests | RFC Editor spike |
| Validator impact review | `adjudicate_review` / nondet | `get_review` | Direct LLM/web mock tests + integration smoke | Studionet lifecycle |
| Credit remediation | settlement + `withdraw_credits` | `get_credits` | Accounting tests | Browser/script finality |
| Honest frontend lifecycle | wallet adapter + canonical reload | app pages | Vitest/Playwright | Browser evidence |

## Frontend blueprint

Screens:

- Dashboard: reserve status, active reviews, accounting, network honesty.
- Create Reserve: sponsor locks a claim and 2 GEN.
- Reviews: implementer opens RFC errata review and tracks finality.
- Reserve Detail: official evidence, validator result and canonical actions.
- Account: wallet address menu, credits, withdrawals.
- Guide: copy-ready reviewer walkthrough.

Frontend directives:

- `FE-PRESERVE`: use the project design system and keep product flows focused on reserve lifecycle.
- `FE-HONEST`: never show fake hashes, fake balances, synthetic finality or local storage as canonical state.
- `FE-WALLET-EVM`: detect EVM wallets via EIP-6963 and injected fallbacks; user chooses the provider.
- `FE-WALLET-ACCOUNT`: configure selected account in `createClient`; no raw string per-call account override.
- `FE-SURFACE`: primary UI shows only user-needed data/actions; raw RPC and validator internals stay out of primary views.
- `FE-PRODUCT`: first screen is the usable app, not a marketing landing page.

## Definition of Done

- `npm run check` passes.
- Contract source is ASCII, pinned, and has exactly one `gl.Contract` subclass.
- Direct tests cover all safety cards, evidence tripwires, settlement invariants and GEN accounting.
- Frontend tests cover wallet selection, transaction states, canonical reload and no fake success.
- Studionet deployment and lifecycle evidence are saved under `docs/evidence/studionet`.
- Precheck prints `Project protocol-errata-reserve -Category projects` with `NO BLOCKER`.

## Studionet Evidence

- Contract: `0xEB12772823ab2d4F14fEF52A5d452C01FE514dbc`
- Live app: `https://protocol-errata-reserve-genlayer.vercel.app`
- Deploy transaction: `0x48d6dd8118b7e260403cd35821b0c39ec131a13b5085b22b955f0d3eb4c4f246`
- Adjudication transaction: `0x9041670c346668cf0e7b7414af0fe6925076de2b344b01af20db4486af6e6ed0`
- Reserve: `reserve-rfc2865-mtn91esz`
- Review: `review-9034-mtn91esz`
- Verdict: `MATERIAL_IMPACT`
- Accounting: 2.00 GEN received, 1.00 GEN reserve balance, 1.00 GEN pending implementer credit, balanced `true`.
- Evidence files: `docs/evidence/studionet/deployment.json`, latest `docs/evidence/studionet/state-*.json`, `browser-desktop.png`, `browser-mobile.png`.

The first lifecycle script run reached `create_reserve` and `open_review`, then timed out while waiting for `adjudicate_review` finality. That pre-resume script version had not yet saved create/open hashes. The adjudication hash above was recovered from the timeout output, finalized with `wait-tx`, and the final reserve/review/accounting state was read from canonical view methods.
