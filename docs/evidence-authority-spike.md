# ProtocolErrataReserve Evidence Authority Spike

Date: 2026-09-05

## Commands and observed output

```powershell
$e = Invoke-RestMethod 'https://www.rfc-editor.org/errata.json'
$x = @($e | Where-Object { $_.errata_id -eq '9034' })[0]
$x.PSObject.Properties | Select-Object Name,Value | ConvertTo-Json -Depth 3
```

Observed fields:

- `errata_id`: `9034`
- `doc-id`: `RFC2865`
- `errata_status_code`: `Held for Document Update`
- `errata_type_code`: `Technical`
- `section`: `4.1`
- `correct_text`: includes `Access-Request packets MUST contain a Message-Authenticator attribute.`
- `submit_date`: `2026-07-22`
- `verifier_name`: `Mohamed Boucadair`
- `update_date`: `2026-08-26 12:56:48`

```powershell
$html = (Invoke-WebRequest 'https://www.rfc-editor.org/errata/eid9034' -UseBasicParsing).Content
@('Errata-ID: 9034','Held for Document Update','Technical','Access-Request packets MUST contain a Message-Authenticator attribute','CVE-2024-3596','RFC2865 will be updated') | ForEach-Object { if ($html -like "*$_*") { "FOUND: $_" } else { "MISSING: $_" } }
```

Observed output:

```text
FOUND: Errata-ID: 9034
FOUND: Held for Document Update
FOUND: Technical
FOUND: Access-Request packets MUST contain a Message-Authenticator attribute
FOUND: CVE-2024-3596
FOUND: RFC2865 will be updated
```

```powershell
$text = (Invoke-WebRequest 'https://www.rfc-editor.org/rfc/rfc2865.txt' -UseBasicParsing).Content
@('Remote Authentication Dial In User Service (RADIUS)','This document specifies an Internet standards track protocol','Upon receipt of an Access-Request from a valid client') | ForEach-Object { if ($text -like "*$_*") { "FOUND: $_" } else { "MISSING: $_" } }
```

Observed output:

```text
FOUND: Remote Authentication Dial In User Service (RADIUS)
FOUND: This document specifies an Internet standards track protocol
FOUND: Upon receipt of an Access-Request from a valid client
```

## Authority conclusion

The consequential facts can be fetched from `rfc-editor.org`, which is the official RFC Editor host. A claimant-controlled mirror, screenshot, hash, summary, or pasted errata body is not authority. The contract must compare the fetched official fields with locked reserve fields before any semantic review can affect credits.

## Bounded LLM judgment

Question: does official erratum `9034` materially affect the locked claim?

Stable positive case: a reserve claim says the implementation accepts RFC2865 Access-Request packets from valid clients without requiring a Message-Authenticator attribute. The official corrected text adds a MUST requirement for that attribute, so the material-impact verdict is stable.

Stable negative case: a reserve claim concerns only accounting display of RADIUS response codes and no Access-Request authentication behavior. The same erratum is official but not material to that locked claim.

## Non-penalizing failures

- Wrong host, non-HTTPS URL, wrong `errata_id`, wrong RFC, wrong section, missing status/type, or `Rejected` status: `UNVERIFIABLE`.
- Prompt injection in official notes cannot redefine parties, payout, source authority, or claim text.
- Invalid validator output cannot transfer GEN; deterministic settlement invariants run before mutation.
