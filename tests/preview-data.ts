import type { testDatabase } from "./database";
export async function seedPreviewOrders(
  db: Awaited<ReturnType<typeof testDatabase>>
) {
  if (process.env.NODE_ENV !== "test" || process.env.DATABASE_URL)
    throw new Error("Preview data requires an isolated fixture database");
  const rows = [
    ["complete", "0551234567"],
    ["confirmed", "0661234567"],
    ["shipped", "0771234567"],
    ["cancelled", "0551234567"],
    ["complete", "0661234567"],
    ["abandoned", "055"],
  ];
  for (let i = 0; i < rows.length; i++)
    await db.query(
      `INSERT INTO atlasio_orders(lead_id,status,phone,full_name,wilaya,commune,price,delivery_fee,quantity,product_slug,order_snapshot,shipping_provider_id,shipping_provider_name,ecotrack_tracking,ecotrack_status,shipment_status)
 VALUES($1,$2,$3,$4,'05 - باتنة','Batna',3900,0,3,'flower-seed-mix',$5::jsonb,'default','حساب تجريبي',$6,$7,$8)`,
      [
        "UI-PREVIEW-" + (i + 1),
        rows[i][0],
        rows[i][1],
        "عميل تجريبي " + String(i + 1).padStart(2, "0"),
        JSON.stringify({ name: "مجموعة بذور الزهور" }),
        i === 2 ? "FIXTURE-PREVIEW-3" : null,
        i === 2 ? "vers_wilaya" : null,
        i === 2 ? "in_transit" : "pending",
      ]
    );
}
