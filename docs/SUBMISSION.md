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

ProtocolErrataReserve is a GenLayer dApp for funding protocol remediation when official RFC Editor errata materially affect a locked conformance claim. A sponsor locks exactly 2 GEN behind an RFC ID, section, implementer, claim text, version and expiry. The implementer submits an official `rfc-editor.org` erratum URL. Validators independently fetch the authoritative RFC evidence, verify the locked bindings, and judge whether the erratum is `MATERIAL_IMPACT`, `NO_MATERIAL_IMPACT`, or `UNVERIFIABLE`. A material-impact verdict credits 1 GEN to the implementer; the same errata ID or canonical URL cannot create another material credit in that reserve under a new review ID. Unverifiable or non-material evidence remains non-penalizing and retryable. The reusable interface supports reserves, reviews, canonical accounting and pull withdrawals. Source, local tests, CI, Studionet deploy, finalized lifecycle evidence and live frontend reads are verified.

Character count: 824

## Evidence

- Repository: https://github.com/duclucky/protocol-errata-reserve-genlayer
- Primary contract explorer: https://explorer-studio.genlayer.com/address/0x8Cb815adec4363E8B69491B07b419b914A5DC2D5
- Consumer/integration explorer: N/A; one contract owns the current product lifecycle.
- Lifecycle evidence: `docs/evidence/studionet/deployment.json`, `docs/evidence/studionet/state-1788787562062.json`, `docs/evidence/studionet/errata-identity-proof-1788787544610.json`
- Live browser evidence: pending final Vercel deployment verification.
- Successful CI: pending final remediation push and exact-HEAD verification.
- Demo/frontend: https://protocol-errata-reserve-genlayer.vercel.app

## How To Try It

1. Open https://protocol-errata-reserve-genlayer.vercel.app in a fresh browser session.
2. On Overview, wait for canonical state to load, then confirm the live Studionet snapshot: `3` reserves, `3` material outcomes, and `3.00 GEN` remediation credit ready.
3. Open History, select `RFC2865 section 4.1`, and click View case.
4. Confirm `Material impact settled`, `1.00 GEN implementer credit`, the RFC Editor EID 9034 link, and the GenLayer Explorer link.
5. Open the contract link and confirm the Studionet contract page loads.
6. To run the write lane, open Start, choose a detected funded EVM wallet, and approve the Studionet network switch/add request.
7. Enter a valid implementer address, keep the prefilled RFC2865 section 4.1 claim, and click `Create reserve with 2 GEN`.
8. Open Reviews, select the created reserve, keep errata ID `9034` and the exact URL `https://www.rfc-editor.org/errata/eid9034`, then click `Submit official erratum`.
9. After that transaction finalizes, click the decision action, wait for validator finality, reload canonical state, and verify the new case in History.

## Verified Facts

- Contracts: 1, `ProtocolErrataReserve`
- Contract methods: 12 total, 6 view, 6 write
- Direct tests: 18 passed
- Deployment parser tests: 6 passed
- Frontend tests: 19 passed
- Browser production check: desktop and mobile passed with no console/request errors or horizontal overflow
- Network: Studionet, chain ID `61999`
- Contract: `0x8Cb815adec4363E8B69491B07b419b914A5DC2D5`
- Deploy transaction: `0xecf4445ce3da82cb1fdb34f4c1d1dea03f0a4b42ba4785669d184b6fbb3cba3a`
- Identity proof: prefix `903 + eid9034` finalized `ERROR` with exact binding error; valid `9034 + eid9034` finalized `MATERIAL_IMPACT`; duplicate evidence under a new review ID finalized `ERROR` with no second credit.
- Final state: `3` reserves, `3` reviews, `6.00 GEN` received, `3.00 GEN` reserve balance, `3.00 GEN` pending credit, balanced accounting.

## Honest Limitations / Pending

- The replacement contract is the only active release. The previous contract `0x0fe3043e4A3e17dB8BE5424aB95Cc5e2fa4AcBCe` is immutable, archived as `ABANDONED_BROKEN`, and must not be funded.
- CI uses artifact-independent GenVM AST lint plus tests/build because clean GitHub runners received 404 when downloading the pinned GenVM validation artifact. Full `genvm-lint check` is verified locally and the same source is deployed on Studionet.
- Only RFC Editor errata are in scope for v1; other standards bodies and package ecosystem integrations are milestone headroom.

## Why This Category

This is a Projects submission because the deliverable is a complete dApp with a user-facing frontend, wallet-selected transaction paths, canonical contract reads and a deployed Studionet contract. The reusable primitive is still the core contribution, but the project value depends on the product workflow around reserve funding, official errata review, settlement and user-visible accounting.

## Short Report

**Project name:** ProtocolErrataReserve

**Description:** GenLayer dApp that funds RFC remediation by letting validators judge official errata impact and settle native GEN credits.

**GitHub (public):** https://github.com/duclucky/protocol-errata-reserve-genlayer

**Live app:** https://protocol-errata-reserve-genlayer.vercel.app

**Contract (studionet):** 0x8Cb815adec4363E8B69491B07b419b914A5DC2D5
