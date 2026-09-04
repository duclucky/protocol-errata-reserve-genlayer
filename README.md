# ProtocolErrataReserve

ProtocolErrataReserve is a GenLayer dApp for funding protocol remediation when official RFC Editor errata materially affect a locked conformance claim.

## Live App

https://protocol-errata-reserve-genlayer.vercel.app

## Deployed Contract

- Network: GenLayer Studionet
- Chain ID: `61999`
- Contract: `0xEB12772823ab2d4F14fEF52A5d452C01FE514dbc`
- Explorer: https://explorer-studio.genlayer.com/address/0xEB12772823ab2d4F14fEF52A5d452C01FE514dbc
- Deploy transaction: `0x48d6dd8118b7e260403cd35821b0c39ec131a13b5085b22b955f0d3eb4c4f246`

## What It Does

A sponsor locks exactly 2 GEN behind a specific RFC conformance claim. An implementer submits an official RFC Editor erratum URL. GenLayer validators fetch the authoritative RFC Editor evidence and decide whether the erratum materially affects the locked claim. A material-impact verdict credits 1 GEN to the implementer; no-material-impact or unverifiable evidence remains non-penalizing.

The current Studionet lifecycle used RFC2865 section 4.1 and RFC Editor erratum 9034. The finalized verdict is `MATERIAL_IMPACT`; canonical accounting shows 2.00 GEN received, 1.00 GEN still reserved, 1.00 GEN pending implementer credit, and balanced accounting.

## Why GenLayer

The consequential question is semantic: whether official standards text materially changes a locked implementation obligation. A normal database, backend, or EVM-only contract can store the erratum status, but it cannot provide validator-replayed semantic consensus over the official evidence while enforcing native GEN accounting.

## Architecture

- One Intelligent Contract: `ProtocolErrataReserve`
- Contract source: `contracts/protocol_errata_reserve.py`
- Frontend: Vite, React, TypeScript, `genlayer-js`
- Evidence authority: `rfc-editor.org` only
- Browser reads: GenLayer IC RPC through same-origin `/genlayer-rpc`
- Browser writes: selected EVM wallet provider on Studionet

## Contract Interface

Write methods:

- `create_reserve` receives exactly 2 GEN and locks sponsor, implementer, RFC ID, section, claim, version, and expiry.
- `open_review` accepts the official RFC Editor erratum URL from the implementer.
- `adjudicate_review` runs nondeterministic official evidence review and settles the result.
- `recover_review_timeout` marks a stuck review non-penalizing after its deadline.
- `close_reserve` credits remaining reserve funds to the sponsor when legal.
- `withdraw_credits` pays credited GEN through pull withdrawal.

View methods:

- `get_reserve`
- `get_review`
- `get_all_reserves`
- `get_all_reviews`
- `get_credits`
- `get_accounting`

## Run Locally

```powershell
npm ci
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
npm run check
```

To run the frontend against the deployed contract, create `frontend/.env.local`:

```text
VITE_CONTRACT_ADDRESS=0xEB12772823ab2d4F14fEF52A5d452C01FE514dbc
VITE_GENLAYER_EXPLORER_URL=https://explorer-studio.genlayer.com
```

Then:

```powershell
cd frontend
npx vite --host 127.0.0.1 --port 5178
```

## Studionet Commands

```powershell
node scripts\studionet.mjs inspect
node scripts\studionet.mjs state
```

Deployment and lifecycle evidence is in `docs/evidence/studionet`.

## Verification

Fresh local verification:

- `npm run check`: passed
- GenVM lint: passed, `ProtocolErrataReserve`, 12 methods, 6 view, 6 write
- Direct tests: 12 passed
- Deployment parser tests: 6 passed
- Frontend tests: 6 passed
- Frontend typecheck and production build: passed
- Browser-local Playwright checks: desktop and mobile loaded finalized contract state with no CORS error and no horizontal overflow

## Honest Limits

- Current browser proof verifies deployed contract reads and the same-origin IC RPC proxy. It does not claim a live browser-wallet write was signed by an installed wallet in this environment.
- The first lifecycle script version did not save `create_reserve` and `open_review` hashes before an adjudication wait timeout. The adjudication hash was recovered, finalized, and the final state was read from canonical views.
- Only RFC Editor errata are in scope for v1. W3C, WHATWG, IANA, package manifests, and SDK marketplace integrations are milestone headroom, not current claims.
