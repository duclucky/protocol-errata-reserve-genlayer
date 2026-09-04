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
2. On Overview, wait for canonical state to load and confirm `1` active record, `1` material outcome, and `1.00 GEN` remediation credit ready.
3. Open History, select `RFC2865 section 4.1`, and click View case.
4. Confirm `Material impact settled`, `1.00 GEN implementer credit`, the RFC Editor EID 9034 link, and the GenLayer Explorer link.
5. Open the contract link and confirm the Studionet contract page loads.
6. To run a live write, open Start and choose a detected funded EVM wallet from the centered wallet-selection dialog.
7. Approve the Studionet network switch/add request, enter a valid implementer address, keep the prefilled RFC2865 section 4.1 claim, and click `Create reserve with 2 GEN`.
8. Open Reviews, select the created reserve, keep errata ID `9034` and URL `https://www.rfc-editor.org/errata/eid9034`, then click `Submit official erratum`.
9. After finality, use the decision action, wait for validator finality, reload canonical state, and verify the result in History and View case.

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
Tests 13 passed
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

The deployed app has the public contract address configured in Vercel and routes browser reads through the same-origin `/genlayer-rpc` proxy. The local browser app uses ignored `frontend/.env.local` for the same public address.

```powershell
cd "D:\Genlayer Project\protocol-errata-reserve\frontend"
npx vite --host 127.0.0.1 --port 5178
```

Open `http://127.0.0.1:5178/`. The first screen should show the finalized reserve, one material outcome, and `1.00 GEN` remediation credit ready. Write buttons remain disabled until the user selects a detected EVM wallet.
