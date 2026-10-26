---
name: osen-express
description: Integrate or troubleshoot Osen Express (osenexpress.com) shipping APIs using official OpenAPI contracts, including its EcoTrack v1 compatibility interface, merchant authentication, stock, tracking and webhook documentation.
---

# Osen Express

Use the official Swagger at <https://backendmain.osenexpress.com/api> and schema at <https://backendmain.osenexpress.com/api-json>. The merchant portal is <https://osenexpress.com/settings/api>. These are different from a native `*.ecotrack.dz` account and from unrelated organizations named OSEN.

## Choose the contract

- Existing EcoTrack-format integration: start with Osen's documented `/api/v1` compatibility API. Keep the native EcoTrack account's original URL, token and request format separate.
- New integration or EcoManager v2 client: read [references/api-contract.md](references/api-contract.md), then the relevant entries in [references/contract-index.json](references/contract-index.json). Do not mix the v1 query protocol with the v2 array/object JSON protocol.
- Status synchronization, stock and recovery: read [references/integration-notes.md](references/integration-notes.md).
- Human onboarding, installation and usage examples: see [README.md](README.md).

The bundled contract index is a dated, curated snapshot, not a complete copy of Osen's internal API. Refresh it before relying on changed or unfamiliar operations:

```sh
node scripts/refresh-contract.mjs
node scripts/refresh-contract.mjs --write
```

The first command reports the current public contract; `--write` updates the bundled index. Missing schemas and undocumented request encodings remain gaps even if an endpoint is present. Explain the gap instead of inventing a DTO or declaring a mutation production-tested.

## Authenticate and verify

Keep credentials server-side, outside this shareable skill folder. Use environment variables `OSEN_API_TOKEN`, `OSEN_MERCHANT_ID`, and `OSEN_STORE_ID`. Never place a real key, merchant/store identifier, customer record or authenticated screenshot in the distribution.

For a store-bound merchant integration, POST `api_id` and `api_token` to `/v2/ecomanager/auth/validate`. HTTP 200 alone is insufficient: require `valid: true`, `scope: MERCHANT`, matching `user_id`, and matching `store.id`. PARTNER-scoped access is a different workflow; do not assume it has a store binding.

Run the portable helper with Node.js 22+ and a private environment file outside the skill:

```sh
node --env-file=/path/to/private/osen.env scripts/read-only-check.mjs
node --test scripts/self-test.mjs
```

The helper validates identity and reads locations, fees and the first stock page. It sends no shipment or account-setting mutation, does not retry failures automatically, and prints counts rather than credentials or customer data. Reuse existing authorization for tests; a documentation request does not itself authorize creating real shipments or issuing credentials.

The merchant portal states permanent keys are shown once, last ten years and cannot be revoked; a new key does not invalidate previous keys. If the saved key is unavailable, do not attempt to recover it from hidden browser state. Obtain explicit authorization under the active tool's confirmation rules before issuing another permanent key, then preserve it in the authorized secret destination before leaving the one-time display.

## Implement with evidence

Use a fixed official origin and reject redirects on authenticated requests. Do not forward an Osen token to an EcoTrack subdomain, a caller-supplied hostname or a label URL on an unverified origin.

Treat transport success, business acceptance, application order status, carrier shipment status and seller payout status separately. A timeout during creation may follow a successful remote write: retain an uncertain state and reconcile by the original reference instead of blindly retrying.

For mutations, distinguish the documented endpoint from inputs inferred from compatibility conventions. Validate required fields, recipient data, stock SKU/quantity and COD amount against the selected contract. Only perform a live write within the user's authorized recipient, environment and operation scope. Preserve existing functioning integrations when adding Osen.

Report separately: offline tests, authenticated read-only checks, controlled live write checks, and production activation. Do not describe mocks or an empty stock response as proof of successful fulfillment. Webhook existence does not prove its signing or payload contract; follow the gaps in the references.
