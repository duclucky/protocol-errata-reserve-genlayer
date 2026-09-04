# ProtocolErrataReserve Postmortem

## Validated

- GenLayer fit: validators decide the semantic impact of official RFC Editor errata against a locked conformance claim.
- Evidence authority: consequential evidence is fetched from `rfc-editor.org`; actor-controlled URLs, mirrors, screenshots or pasted text do not create authority.
- Value flow: a 2 GEN reserve settled to a 1 GEN implementer credit on `MATERIAL_IMPACT`, with canonical accounting balanced.
- Frontend proof: local and production browser checks read finalized Studionet state through a same-origin GenLayer RPC path.

## Pending Or Limited

- Browser-wallet writes are wired and tested through the adapter, but this run did not include a live user wallet signature from an installed browser extension.
- The first lifecycle script version did not save the `create_reserve` and `open_review` transaction hashes before the adjudication wait timeout. The adjudication transaction was recovered and finalized, then canonical state proved the full settlement outcome.
- CI uses artifact-independent AST lint plus tests/build because clean GitHub runners received 404 when downloading the GenVM validation artifact for the pinned runner. Full `genvm-lint check` is proven locally and by successful Studionet deployment.

## Next Milestone Headroom

A substantial milestone can add W3C, WHATWG or IANA authority adapters, package-manifest exposure graphs, multi-component reserve allocation, or downstream SDK marketplace integration. The milestone must add a new authority matrix and value path; a restyle or rename is not enough.
