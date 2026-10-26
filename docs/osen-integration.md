# Osen Express integration

Official references (reviewed 2026-10-26):

- [Swagger UI](https://backendmain.osenexpress.com/api)
- [OpenAPI JSON](https://backendmain.osenexpress.com/api-json)
- [Merchant API settings](https://osenexpress.com/settings/api)

## Integration choice

Osen explicitly publishes an **Ecotrack v1** compatibility API. The application reuses the existing protocol parsers and order format with a fixed Osen origin, rather than duplicating the shipping workflow. Native EcoTrack accounts retain their existing subdomain, headers and request format.

- Osen base URL: `https://backendmain.osenexpress.com/api/v1`.
- Token authentication: `Authorization: Bearer ...`.
- Osen accounts also retain `Merchant ID` and `Store ID`. The API key is checked through the documented `/v2/ecomanager/auth/validate` endpoint. A valid result must match both merchant and store, with MERCHANT scope.
- Hostnames are fixed by integration type. Redirects are rejected so authentication cannot be forwarded to another origin.
- Profiles contain a separate `kind` (`ecotrack` or `osen`). Existing profiles default to EcoTrack. An account with order history cannot be changed into another carrier or store.

## App settings

In **Settings → Shipping accounts**, add an account, choose **Osen Express**, and enter the two IDs and API key. The key is validated before saving and omitted from API responses. Adding Osen does not change the current storefront carrier. **Use in storefront** explicitly switches the default locations/fees account.

For local server-only credentials, use the Git-ignored `.env.osen.local`:

```dotenv
OSEN_API_TOKEN=your-private-key
OSEN_MERCHANT_ID=your-merchant-id
OSEN_STORE_ID=your-store-id
```

This exposes a separate `osen-env` account to a real configured backend. It does not activate Osen automatically. On Vercel, enter the same values as server Environment Variables. No API key is included in this document or the Repository.

The disposable `dev:fixture` environment clears all real Osen environment variables. Its mock accepts only `merchant-fixture`, `store-fixture`, and `fixture-osen-token`; it must not be used to verify real credentials.

## Supported protocol operations

The integration routes the existing order creation, stock push, locations/fees, paginated stock reads, tracking/history, labels, notes, validation, return request, return receipt and cancellation to the documented Osen compatibility endpoints.

Stock fulfillment requires selecting a SKU-backed product for Osen. Quantity and COD total come from the stored order. Reservation, uncertain-create handling, recovery by reference, Telegram isolation and scheduled status synchronization continue through the existing order service. Unknown carrier states are displayed without inventing a final state. Existing `ecotrack_*` database columns remain compatibility storage fields; they are not renamed in this update.

Osen documents return receipt with a `trackings` query string. This adapter serializes the tracking list into that query parameter; native EcoTrack retains its existing JSON body. Live write behavior still requires a controlled carrier-side acceptance test.

## Validation

```sh
pnpm check
pnpm test
pnpm build
pnpm osen:check
```

The last command loads `.env.osen.local` and performs credential validation plus read-only locations, tariffs and stock requests. It logs counts, not credentials or customer records, and does not create shipments.

Contract tests cover fixed routing, separate headers, merchant/store mismatch, stock quantity/SKU/COD, pagination, exact tracking matches, business errors, throttling, and independent return-request formats. Database tests verify masked profiles, default-account preservation, invalid credential rejection and protection of accounts with order history.

## Activation limits

A real API key is required for live verification. The account page states that its permanent keys are shown once, valid for ten years, and cannot be revoked. Creating a new key therefore requires explicit action-time confirmation. Preserve the generated key in a server-only secret store or the ignored local file.

No real shipment or webhook configuration is created as part of read-only verification. Osen offers custom webhooks, but the OpenAPI does not specify the receiving signature/payload contract sufficiently to implement a verified receiver here. Scheduled polling is the active synchronization path; webhook activation needs a public V2 endpoint and a verified delivery/authentication contract.

Live verification on 2026-10-26: merchant/store authentication and read-only wilaya, commune, tariff and stock requests succeeded. A new permanent key was generated with explicit owner authorization and saved only in `.env.osen.local`, which is ignored by Git. No live shipment or webhook configuration was created. Live write acceptance and production activation remain separate steps.
