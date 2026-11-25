// Isolated UI fixture: no real DB, carrier account, Pixel or Telegram service.
export {};
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "";
process.env.OSEN_API_TOKEN = "";
process.env.OSEN_MERCHANT_ID = "";
process.env.OSEN_STORE_ID = "";
process.env.DASHBOARD_PASSWORD = "local-preview-only";
process.env.SESSION_SECRET = "local-preview-session-secret-not-for-production";
process.env.TELEGRAM_BOT_TOKEN = "fixture-token";
process.env.TELEGRAM_CHAT_ID = "fixture-chat";
const { testDatabase } = await import("./database");
const db = await testDatabase();
const { seedPreviewOrders } = await import("./preview-data");
const { previewCommunes, previewFees } = await import("./preview-catalog");
await seedPreviewOrders(db);
await db.query(
  "UPDATE atlasio_settings SET value='' WHERE key='meta_pixel_id'"
);
await db.query(
  "UPDATE atlasio_settings SET value='fixture-token' WHERE key='ecotrack_token'"
);
await db.query(
  "INSERT INTO atlasio_stock_products(name,sku,quantity,provider_id) VALUES('بذور الزهور','FLOWERS-SKU',100,'default')"
);
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  if (
    url.hostname === "backendmain.osenexpress.com" &&
    url.pathname === "/v2/ecomanager/auth/validate"
  ) {
    const body = JSON.parse(String(init?.body || "{}"));
    return Response.json(
      body.api_id === "merchant-fixture" &&
        body.api_token === "fixture-osen-token"
        ? {
            valid: true,
            scope: "MERCHANT",
            user_id: "merchant-fixture",
            store: { id: "store-fixture" },
          }
        : { valid: false }
    );
  }
  if (url.hostname === "api.telegram.org")
    return Response.json({ ok: true, result: { message_id: 101 } });
  if (
    url.hostname.endsWith(".ecotrack.dz") ||
    url.hostname === "backendmain.osenexpress.com"
  ) {
    if (url.pathname.endsWith("/get/wilayas"))
      return Response.json([
        { wilaya_id: 5, wilaya_name: "Batna" },
        { wilaya_id: 16, wilaya_name: "Alger" },
      ]);
    if (url.pathname.endsWith("/get/communes"))
      return Response.json(
        previewCommunes(Number(url.searchParams.get("wilaya_id") || 0))
      );
    if (url.pathname.endsWith("/get/fees"))
      return Response.json({ livraison: previewFees() });
    if (url.pathname.endsWith("/get/products/list"))
      return Response.json({
        products: [
          {
            reference: "FLOWERS-SKU",
            title: "بذور الزهور",
            is_active: 1,
            stock_disponible: 100,
          },
        ],
        pagination: { last_page: 1 },
      });
    if (url.pathname.endsWith("/create/order"))
      return Response.json({
        success: true,
        tracking: "FIXTURE-" + Date.now(),
      });
    if (url.pathname.endsWith("/get/trackings/info"))
      return Response.json({
        data: Object.fromEntries(
          url.searchParams.getAll("trackings[]").map(tracking => [
            tracking,
            {
              status: "vers_wilaya",
              activity: [
                {
                  date: "2026-10-25",
                  time: "10:00:00",
                  status: "vers_wilaya",
                  station: "Station Batna",
                },
              ],
            },
          ])
        ),
      });
    if (url.pathname.endsWith("/get/tracking/info"))
      return Response.json({
        activity: [
          { date: "2026-10-25", time: "10:00:00", status: "vers_wilaya" },
        ],
      });
    if (url.pathname.endsWith("/get/maj")) return Response.json([]);
    if (url.pathname.endsWith("/get/orders"))
      return Response.json({ data: [], last_page: 1 });
    if (url.pathname.endsWith("/validate/token"))
      return Response.json({ success: true });
    return Response.json({ success: true });
  }
  return realFetch(input, init);
};
await import("../backend/dev-server");
console.log("Isolated preview login: local-preview-only");
