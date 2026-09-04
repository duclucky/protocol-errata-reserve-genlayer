# Submission Packet

## Recommended Category

Projects

Status: Preview, because the deployed contract is on GenLayer Studionet.

Logo: `docs/listing/logo.svg`

One-liner: Fund protocol remediation when official RFC errata materially affect a locked conformance claim.

Short description: For protocol sponsors and implementers, ProtocolErrataReserve locks a 2 GEN reserve, lets GenLayer validators judge official RFC Editor errata, and credits remediation when the erratum materially changes the claim.

## Title

ProtocolErrataReserve: Official RFC Errata Impact Reserves

## Notes / Description

ProtocolErrataReserve is a GenLayer dApp for funding protocol remediation when official RFC Editor errata materially affect a locked conformance claim. A sponsor locks exactly 2 GEN behind an RFC ID, section, implementer, claim text, version and expiry. The implementer submits an official `rfc-editor.org` erratum URL. Validators independently fetch the authoritative RFC evidence, verify the locked bindings, and judge whether the erratum is `MATERIAL_IMPACT`, `NO_MATERIAL_IMPACT`, or `UNVERIFIABLE`. A material-impact verdict credits 1 GEN to the implementer; unverifiable or non-material evidence is non-penalizing. The reusable interface supports reserves, reviews, canonical accounting and pull withdrawals. Source, local tests, CI, Studionet deploy, finalized lifecycle evidence and live frontend reads are verified.

Character count: 824

## Evidence

- Repository: https://github.com/duclucky/protocol-errata-reserve-genlayer
- Primary contract explorer: https://explorer-studio.genlayer.com/address/0xEB12772823ab2d4F14fEF52A5d452C01FE514dbc
- Consumer/integration explorer: N/A; one contract owns the current product lifecycle.
- Lifecycle evidence: `docs/evidence/studionet/deployment.json`, `docs/evidence/studionet/state-1788544366980.json`
- Successful CI: https://github.com/duclucky/protocol-errata-reserve-genlayer/actions/runs/33905071686
- Demo/frontend: https://protocol-errata-reserve-genlayer.vercel.app

## How To Try It

1. Open https://protocol-errata-reserve-genlayer.vercel.app in a fresh browser session.
2. Confirm the Overview page shows the product name, Projects category, and GenLayer Explorer link.
3. Open Start.
4. Connect a funded EVM wallet and switch/add GenLayer Studionet if you want to submit a live write.
5. Create a reserve with exactly 2 GEN, one implementer wallet address, and one locked RFC claim.
6. Open Reviews and submit an official RFC Editor errata URL for the active reserve.
7. Wait for finality, reload canonical state, then open History and View case.
8. Confirm the validator outcome, GEN consequence, and the contract link on GenLayer Explorer.

## Verified Facts

- Contracts: 1, `ProtocolErrataReserve`
- Contract methods: 12 total, 6 view, 6 write
- Direct tests: 12 passed
- Deployment parser tests: 6 passed
- Frontend tests: 6 passed
- Network: Studionet, chain ID `61999`
- Contract: `0xEB12772823ab2d4F14fEF52A5d452C01FE514dbc`
- Deploy transaction: `0x48d6dd8118b7e260403cd35821b0c39ec131a13b5085b22b955f0d3eb4c4f246`
- Adjudication transaction: `0x9041670c346668cf0e7b7414af0fe6925076de2b344b01af20db4486af6e6ed0`
- Lifecycle: reserve `reserve-rfc2865-mtn91esz`, review `review-9034-mtn91esz`, verdict `MATERIAL_IMPACT`, 1.00 GEN implementer credit pending, accounting balanced.

## Honest Limitations / Pending

- Browser production proof verifies deployed contract reads through the Vercel same-origin GenLayer RPC rewrite. It does not claim a live browser-wallet write signed by an installed extension during this run.
- CI uses artifact-independent GenVM AST lint plus tests/build because clean GitHub runners received 404 when downloading the pinned GenVM validation artifact. Full `genvm-lint check` is verified locally and the same source is deployed on Studionet.
- Only RFC Editor errata are in scope for v1; other standards bodies and package ecosystem integrations are milestone headroom.

## Why This Category

This is a Projects submission because the deliverable is a complete dApp with a user-facing frontend, wallet-selected transaction paths, canonical contract reads and a deployed Studionet contract. The reusable primitive is still the core contribution, but the project value depends on the product workflow around reserve funding, official errata review, settlement and user-visible accounting.

## Short Report

**Project name:** ProtocolErrataReserve

**Description:** GenLayer dApp that funds RFC remediation by letting validators judge official errata impact and settle native GEN credits.

**GitHub (public):** https://github.com/duclucky/protocol-errata-reserve-genlayer

**Live app:** https://protocol-errata-reserve-genlayer.vercel.app

**Contract (studionet):** 0xEB12772823ab2d4F14fEF52A5d452C01FE514dbc
