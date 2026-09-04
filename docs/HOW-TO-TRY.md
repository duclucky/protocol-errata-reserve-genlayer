# How To Try ProtocolErrataReserve

## Listing Summary

- Name: ProtocolErrataReserve
- Category: Projects
- Status: Preview, because this deployment is on GenLayer Studionet.
- Logo: `docs/listing/logo.svg`
- One-liner: Fund protocol remediation when official RFC errata materially affect a locked conformance claim.
- Website: https://protocol-errata-reserve-genlayer.vercel.app
- Contract: https://explorer-studio.genlayer.com/address/0xEB12772823ab2d4F14fEF52A5d452C01FE514dbc

## Fresh Reviewer Steps

1. Open https://protocol-errata-reserve-genlayer.vercel.app in a fresh browser session.
2. Confirm the Overview page shows the product name, Projects category, and GenLayer Explorer link.
3. Open Start.
4. Connect a funded EVM wallet if you want to submit a live Studionet write.
5. Create a reserve with exactly 2 GEN, one implementer wallet address, and a locked RFC claim.
6. Open Reviews and submit an official RFC Editor errata URL for the active reserve.
7. Wait for finality and reload canonical state.
8. Open History, select View case, and confirm the validator outcome and GEN consequence.
9. Open the GenLayer Explorer contract link and confirm the contract page loads.

## Local Checks

```powershell
cd "D:\Genlayer Project\protocol-errata-reserve"
npm run check
```

Expected high-signal output includes:

```text
Project protocol-errata-reserve -Category projects
NO BLOCKER
12 passed
tests 6
Tests 6 passed
built
```

## Studionet State

```powershell
node scripts\studionet.mjs inspect
node scripts\studionet.mjs state
```

Expected state summary:

```json
{
  "contractAddress": "0xEB12772823ab2d4F14fEF52A5d452C01FE514dbc",
  "reserves": 1,
  "reviews": 1,
  "accounting": {
    "total_received_gen": "2.00",
    "reserve_balances_gen": "1.00",
    "credits_pending_gen": "1.00",
    "total_withdrawn_gen": "0.00",
    "accounted_total_gen": "2.00",
    "balanced": true
  }
}
```

## Browser App

The local browser app uses ignored `frontend/.env.local` for the public contract address and routes browser reads through the Vite same-origin `/genlayer-rpc` proxy.

```powershell
cd "D:\Genlayer Project\protocol-errata-reserve\frontend"
npx vite --host 127.0.0.1 --port 5178
```

Open `http://127.0.0.1:5178/`. The first screen should show the finalized reserve, review `review-9034-mtn91esz`, verdict `MATERIAL_IMPACT`, pending credits `1.00`, and accounting `Balanced`. Write buttons remain disabled until the user selects a detected EVM wallet.
