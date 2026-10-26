# Integration notes: statuses, stock and recovery

هذه ملاحظات تنفيذ / Engineering recommendations. They describe application design choices; they are not undocumented Osen guarantees. For official routes and fields, use [api-contract.md](api-contract.md).

## Status synchronization

Treat these as separate values: local order confirmation, remote creation acceptance, carrier shipment progress, and seller payment/settlement. A state such as “pushed to Osen” records creation only; it cannot represent the rest of the shipment journey.

For each shipment, retain its carrier/account/store identity, local order reference, exact tracking, raw remote status, normalized display status, last remote activity time, last successful sync time and last error. Do not reassign historical shipments when switching the storefront's default carrier.

Use known tracking numbers for polling. V1 `/get/trackings/info` supports batches up to 100; key results by exact tracking rather than array position. V2 retrieval uses the object form of POST `/orders`, with `last_status.code`, `label` and `date`. Inspect per-request failure before replacing saved state. An empty or failed response should retain the prior state and surface a sync error.

Use activity timestamps where available; do not assume the final array element is newest. A note or notification is not a delivery scan. Preserve unknown status codes and display their raw label; do not map every unfamiliar value to delivered, cancelled or returned. The public contract does not establish an exhaustive French status dictionary, so mappings such as “Vers wilaya” must be based on observed carrier values with tests.

Examples of interpretation: `dispatched_to_driver` means handoff to a driver, not proof of delivery; `last_status` is an object in v2; collection/payment status is not the same as a successful customer delivery. Keep timestamps and sync errors visible in the admin UI so stale information is distinguishable from current progress.

Polling requires a deployed scheduler/worker. A manual “Sync now” button alone does not provide ongoing synchronization. After deployment, verify scheduler authentication, execution records and the time of the latest successful sync. If webhooks are added later, keep a periodic reconciliation path for missed events.

## Order creation and uncertain outcomes

Use a stable local reference per order. Before a shipment write, validate recipient, supported location/service, authoritative COD total and the selected fulfillment mode. Persist the intent so a browser disconnect does not discard the operation.

A network timeout or 5xx after sending a create request can hide a successful remote creation. Record the outcome as uncertain, retain the original reference, and reconcile before resubmitting. Do not assume an idempotency header is supported: the cited contract does not specify one.

V1 `/get/orders` can assist bounded reconciliation, but its in-process/default-date scope is not an all-time existence check. Exhaust the selected pages/window and compare exact references. If the reference is absent from that limited view, absence alone does not prove it is safe to create again. Escalate an unresolved case to manual/vendor verification rather than manufacturing a new reference.

For a bulk write, record each result independently. Retrying the full batch after partial success can create duplicate shipments. HTTP 200 is not acceptance of every row.

## Stock fulfillment

Distinguish local catalogue products from the carrier's SKU-backed stock. Map the correct carrier product reference to the order, maintain quantity and compute COD from the saved order snapshot. A display title alone is not a stock identifier.

Read all stock pages using returned pagination. Validate active status and available quantity against `stock_disponible`; zero is valid data. Do not substitute `stock_phisique` for zero available stock. Stock reads are snapshots, not reservations, and can change between fetch and push.

Keep local reservations idempotent. If remote creation is uncertain, do not immediately release stock and resubmit; reconcile first. Do not adjust stock twice on repeated status scans or webhooks. Confirm carrier-specific return/restocking semantics before automatically increasing sellable inventory.

## Actions and admin UX

Show actions appropriate to the selected API family and current remote state: refresh, label, note, confirmation/collection, edit, cancel, return request and return receipt where supported. Keep remote validation results visible; hiding a button is not a server permission or carrier eligibility check.

For bulk actions, show individual success/failure and preserve unprocessed selections. Disable repeat submission while an operation is pending. A destructive or irreversible shipment action needs a clear target and the authorization appropriate to that task; prior authorization for that exact operation should not be requested again.

Do not label an API confirmation action “physical deposit completed” unless the carrier contract supports that meaning. User-facing wording should reflect the actual accepted operation. A return request and acknowledging receipt of a returned parcel are separate operations.

Keep checkout persistence independent of Telegram and carrier availability. Commit an order before queueing downstream delivery. Durable jobs/outbox records, retries with bounded backoff, per-integration errors and manual retry controls reduce lost orders without changing existing Pixel event timing.

## Authentication, testing and evidence

The portable helper reads environment variables and checks merchant/store identity before further calls. Store credentials outside this skill folder; never distribute account exports or screenshots containing a visible key. The helper's fixed origin and no-redirect policy prevent accidental bearer forwarding.

Use four distinct evidence levels:

| Level                          | What it establishes                                               | What it does not establish                    |
| ------------------------------ | ----------------------------------------------------------------- | --------------------------------------------- |
| Offline contract tests         | URL/body/header construction, error handling and local invariants | Carrier-side acceptance                       |
| Authenticated read-only checks | Key/store identity and exercised read endpoints                   | Shipment creation or return behavior          |
| Controlled live write          | The specific tested operation, payload and account                | All untested edge cases or other API families |
| Production activation          | Deployed secrets, scheduler and routing configured and verified   | Future availability without monitoring        |

Run `node --test scripts/self-test.mjs` offline, then the read-only helper with a private environment file. A stock result with zero products is a successful empty read, not proof of a stock shipment. Do not create a real customer shipment merely to demonstrate the documentation skill. Reuse existing live-write authorization if it exists; otherwise make the intended recipient, COD and operation reviewable before seeking it.

For webhook work, first establish the receiving signature/payload contract from Osen and a public HTTPS endpoint. Do not invent a header such as `X-Osen-Signature` or an HMAC algorithm. Verify authentication, replay/deduplication, acknowledgment behavior and event ordering against that confirmed contract before enabling event-driven changes.
