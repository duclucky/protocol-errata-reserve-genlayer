# ProtocolErrataReserve Postmortem

## Validated

- GenLayer fit: validators decide the semantic impact of official RFC Editor errata against a locked conformance claim.
- Evidence authority: consequential evidence is fetched from `rfc-editor.org`; actor-controlled URLs, mirrors, screenshots or pasted text do not create authority.
- Value flow: a 2 GEN reserve settled to a 1 GEN implementer credit on `MATERIAL_IMPACT`, with canonical accounting balanced.
- Frontend proof: the route-based product UI and production browser checks read finalized Studionet state through a same-origin GenLayer RPC path on desktop and mobile. The live path covers Overview, Start, History and case detail without horizontal overflow or browser console/request errors.
- Product correction: the former single dashboard surface is now a Projects-track journey with persistent Overview, Start, Reviews, History, case detail, Account and Help views, user-language statuses, listing identity and exact reviewer instructions.

## Pending Or Limited

- Browser-wallet writes are wired and tested through the adapter, but this run did not include a live user wallet signature from an installed browser extension.
- The live browser evidence therefore proves canonical reads and the read-only reviewer path; it does not prove a funded wallet completed a browser write.
- The first lifecycle script version did not save the `create_reserve` and `open_review` transaction hashes before the adjudication wait timeout. The adjudication transaction was recovered and finalized, then canonical state proved the full settlement outcome.
- CI uses artifact-independent AST lint plus tests/build because clean GitHub runners received 404 when downloading the GenVM validation artifact for the pinned runner. Full `genvm-lint check` is proven locally and by successful Studionet deployment.

## Next Milestone Headroom

A substantial milestone can add W3C, WHATWG or IANA authority adapters, package-manifest exposure graphs, multi-component reserve allocation, or downstream SDK marketplace integration. The milestone must add a new authority matrix and value path; a restyle or rename is not enough.
