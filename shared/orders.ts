export type OrderStatus =
  | "abandoned"
  | "complete"
  | "confirmed"
  | "not_responding"
  | "cancelled"
  | "shipped"
  | "delivered"
  | "returned"
  | "trashed";
export type ProviderProfile = {
  kind?: "ecotrack" | "osen";
  merchantId?: string;
  storeId?: string;
  id: string;
  name: string;
  provider: string;
  token?: string;
  tokenConfigured?: boolean;
  deliveryFees?: Record<string, { home: number; stopDesk: number }>;
};
export type StockProduct = {
  id: number;
  name: string;
  sku: string | null;
  quantity: number;
  active: boolean;
  provider_product_id?: string | null;
  created_at: string;
  updated_at: string;
};
export type OrderEvent = {
  id: number;
  order_id: number;
  event_type: string;
  message: string;
  created_at: string;
};
export type ShipmentUpdate = {
  id: number;
  order_id: number;
  tracking: string;
  source: string;
  status: string | null;
  reason: string | null;
  details: string | null;
  station: string | null;
  driver: string | null;
  driver_phone: string | null;
  desk_phone: string | null;
  activity_date: string | null;
  activity_time: string | null;
  postponed_to: string | null;
  raw_payload: Record<string, unknown>;
  created_at: string;
};
export type Order = {
  id: number;
  lead_id: string;
  source_url: string | null;
  product_slug?: string;
  order_snapshot?: { name?: string; duplicateOf?: string };
  status: OrderStatus;
  status_before_trash: OrderStatus | null;
  trashed_at: string | null;
  campaign: string;
  price: number;
  quantity: number;
  delivery_fee: number;
  delivery_type: string | null;
  phone: string;
  full_name: string | null;
  wilaya: string | null;
  commune: string | null;
  ecotrack_tracking: string | null;
  ecotrack_status: string | null;
  remote_validated?: boolean;
  ecotrack_sync_error?: string | null;
  ecotrack_driver: string | null;
  ecotrack_driver_phone: string | null;
  ecotrack_desk_phone: string | null;
  ecotrack_station: string | null;
  ecotrack_last_note: string | null;
  ecotrack_last_activity_at: string | null;
  ecotrack_last_synced_at: string | null;
  gift_booklet: boolean;
  shipping_provider_id: string | null;
  shipping_provider_name: string | null;
  stock_product_id: number | null;
  stock_product_name: string | null;
  ship_from_stock: boolean;
  confirmation_status: string;
  contact_result: string;
  contact_attempts: number;
  last_contacted_at: string | null;
  follow_up_at: string | null;
  shipment_status: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
};
