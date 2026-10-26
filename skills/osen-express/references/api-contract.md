# Osen Express API contract

مرجع عملي / Developer reference. Review date: **2026-10-26**. The dated machine-readable subset is [contract-index.json](contract-index.json); refresh it with `node scripts/refresh-contract.mjs --write`.

## Sources and API families

The authoritative sources are [Osen Swagger](https://backendmain.osenexpress.com/api) and [public OpenAPI JSON](https://backendmain.osenexpress.com/api-json). [Merchant developer settings](https://osenexpress.com/settings/api) provide account identifiers and key management. This guide paraphrases the relevant contracts; it is not vendor-issued documentation.

| Family                    | Base URL                                            | Authentication                                                                      | Choose it for                         |
| ------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------- |
| EcoTrack v1 compatibility | `https://backendmain.osenexpress.com/api/v1`        | `Authorization: Bearer <token>`                                                     | An existing EcoTrack-format adapter   |
| EcoManager v2             | `https://backendmain.osenexpress.com/v2/ecomanager` | Required `X-Api-Id`; token through `X-Api-Token` or `Authorization: Bearer <token>` | A new integration using its JSON DTOs |

Osen is a separate carrier account. A native EcoTrack subdomain and token do not become Osen credentials. V1 operations generally declare bearer security; do not infer a universal v1 requirement for `X-Api-Id` from the v2 header contract. An adapter may send it in addition to bearer authentication.

## Identity validation

`POST /v2/ecomanager/auth/validate` accepts JSON:

```json
{ "api_id": "YOUR_MERCHANT_ID", "api_token": "YOUR_PRIVATE_TOKEN" }
```

The endpoint receives the credentials in the body. It can return HTTP 200 for an invalid token. Inspect `valid`; for a store-bound merchant workflow also require `scope === "MERCHANT"`, `user_id` matching the configured merchant, and `store.id` matching the configured store. `PARTNER` is another supported scope and can have `store: null`; it needs a separate integration design. The successful response also includes token issue/expiry metadata.

An alternate `POST /v1/users/auth/customers/validate-token` takes `{"api_token":"..."}`. V1 `GET /api/v1/validate/token` returns `success` plus `VALID_TOKEN`, `INVALID_TOKEN` or `TOKEN_NOT_ALLOWED`. These weaker checks do not replace store-identity verification.

Keep tokens in server secrets or a private environment file. For reusable diagnostics, use the bundled `scripts/read-only-check.mjs`; it prints counts and has a fixed endpoint allowlist.

## V1 merchant operations

Paths below are relative to `/api/v1`. Inputs listed here are documented parameters, not a promise that every mutation input is fully described upstream.

| Method | Path                    | Documented input / result                                                            |
| ------ | ----------------------- | ------------------------------------------------------------------------------------ |
| GET    | `/get/wilayas`          | Array of `{wilaya_id, wilaya_name}`                                                  |
| GET    | `/get/communes`         | Optional `wilaya_id`; dictionary of commune records                                  |
| GET    | `/get/fees`             | Service groups containing tariff rows                                                |
| POST   | `/create/order`         | Request field schema incomplete; success includes a tracking number                  |
| POST   | `/create/orders`        | Bulk create, up to 100; request field schema incomplete                              |
| POST   | `/update/order`         | Query `tracking`; other update fields incomplete                                     |
| DELETE | `/delete/order`         | Query `tracking`                                                                     |
| POST   | `/valid/order`          | Query `tracking`, optional `ask_collection` string                                   |
| POST   | `/valid/returns`        | Query `trackings` string; list encoding unspecified                                  |
| GET    | `/get/order/label`      | Query `tracking`; PDF bytes, 422 for unknown tracking                                |
| POST   | `/add/maj`              | Query `tracking`, `content`                                                          |
| GET    | `/get/maj`              | Query `tracking`; carrier note records                                               |
| POST   | `/ask/for/order/return` | Query `tracking`                                                                     |
| GET    | `/get/tracking/info`    | Query `tracking`; shipment activity                                                  |
| GET    | `/get/trackings/info`   | Repeated `trackings[]` query; up to 100; map by tracking                             |
| GET    | `/get/orders`           | `page`, `start_date`, `end_date`, `tracking`; Laravel paginator of in-process orders |
| GET    | `/get/orders/status`    | `trackings` and `status` query strings; list encoding unspecified                    |
| GET    | `/get/products/list`    | `page`; products plus pagination                                                     |

Use URL encoding. The documented bulk tracking form is:

```text
/get/trackings/info?trackings[]=TRACKING_A&trackings[]=TRACKING_B
```

`/get/orders` documents 40 rows per page and a default 90-day window; dates use `Y-m-d`. It is not a complete all-time shipment ledger. `/get/products/list` documents 15 products per page. Follow returned pagination rather than hard-coding either page size.

### Location, fees, stock and activity fields

- V1 communes: `nom`, `wilaya_id`, `code_postal`, `has_stop_desk` (0 or 1). Do not substitute a v2 commune object without translating it.
- Fees: `livraison`, `pickup`, `echnage` (upstream spelling), `recouvrement`, `retours`. Each row has `wilaya_id`, `tarif`, `tarif_stopdesk`; tariffs are strings. The official description uses `"0"` for an unavailable service. Do not advertise unavailable stopdesk service as free shipping.
- Products: `reference`, `barcode`, `title`, `is_active`, `image`, `stock_disponible`, `stock_reserve`, `stock_phisique` (upstream spelling). Pagination has `current_page`, `last_page`, `per_page`, `total`, `from`, `to`. Available stock of zero is meaningful; do not replace it with physical stock.
- Activity: `date`, `time`, `status`, optional `scanLocation`. Bulk entries also contain a `status`. Carrier notes use `remarque`, `station`, `livreur`, `created_at`, `tracking`; notes are not necessarily status changes.

### Compatibility request gaps

EcoTrack-format integrations commonly send query fields such as `reference`, `nom_client`, `telephone`, `adresse`, `code_postal`, `commune`, `code_wilaya`, `montant`, `produit`, `type`, `stop_desk`, `stock`, `quantite`, `remarque`, `weight`. Osen's public create/update schemas do not fully declare these fields. Preserve a working adapter and verify its actual field meanings before changing it; these conventions are not a complete Osen contract.

Do not assume `trackings=JSON.stringify([...])` is the officially specified encoding for `/valid/returns`: the schema says string but does not define the serialization. The same caution applies to `/get/orders/status`. Obtain a vendor example or controlled acceptance evidence before production reliance.

## EcoManager v2 operations

Paths below are relative to `/v2/ecomanager`.

| Method | Path              | Body / behavior                                                                                 |
| ------ | ----------------- | ----------------------------------------------------------------------------------------------- |
| POST   | `/orders`         | **JSON array creates shipments**; **JSON object with `trackings` retrieves existing shipments** |
| DELETE | `/orders`         | JSON array of tracking strings; per-item cancellation results                                   |
| POST   | `/orders/confirm` | JSON array of tracking strings; per-item confirmation results                                   |
| POST   | `/orders/labels`  | `{"trackings":["TRACKING_A"]}`; response `file_url`                                             |
| GET    | `/wilayas`        | V2 location records and service availability                                                    |
| GET    | `/communes`       | Optional `wilaya_id`, `updated_since`; commune records and centers                              |

The shape of POST `/orders` changes its side effects. For retrieval, send an object, never an array:

```json
{ "trackings": ["TRACKING_A", "TRACKING_B"] }
```

Bulk creation responds with one result per input: inspect every `success`, `error_code`, `error_message` and tracking value even when HTTP is 200. Cancellation is documented for cancellable states `PLACED` and `AWAITING_PICKUP`; other states can return per-item failure.

Create-order required fields: `order_id`, `recipient_name`, `recipient_phone`, `address`, `wilaya_id`, `commune_id`, `is_stopdesk`, `cod_amount`. Optional fields include secondary phone, center ID, weight/dimensions, note and items. Monetary and physical fields have non-negative constraints in the schema. `commune_id` can be the ONS WWCC geo code or internal numeric ID; the official description gives the geo code precedence if ambiguous.

**Upstream schema inconsistency:** `CreateOrderDto.items` references `OrderItemDto`, but that component currently describes a full internal order entity. The operation's example instead shows product items with `title`, `quantity`, `sku`. Do not generate item inputs blindly from this contradictory `$ref`; confirm the intended fields. No guessed correction is applied in the bundled snapshot.

Retrieved orders use `last_status: {code, label, date}`, optional `last_alert`, `delivery_fee` and `is_return`, alongside recipient/order fields. Interpret these as the selected v2 contract rather than passing the object through a v1 string-status parser.

V2 label URLs must be validated before server-side fetching. A response URL does not authorize forwarding bearer credentials to that host. V1 labels return the PDF directly.

## Errors, limits and remaining gaps

- A v1 create can return HTTP 200 with `success: false` or HTTP 422 validation messages. A tracking value and explicit acceptance must be checked according to the selected response.
- HTTP 401/403, 429 and 5xx are distinct failures. Numeric global rate quotas are not specified in this snapshot; use an application budget, backoff and `Retry-After` when present. Do not describe local limits as Osen's official quotas.
- The public document currently references missing `CreateOrderSuccessDto` and `BusinessErrorDto` components. The refresh script records unresolved refs instead of fabricating them.
- Webhook configuration exists, but the receiving signature header, algorithm, payload version, event ordering and retry contract need confirmation. Configuration DTOs do not establish a verified receiver.
- The snapshot deliberately excludes staff/internal PubSub routes. Presence in a public OpenAPI file is not a merchant integration requirement.

For operational behavior, read [integration-notes.md](integration-notes.md).
