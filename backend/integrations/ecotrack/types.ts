export type EcoTrackSettings = {
  provider?: string | null;
  token?: string | null;
};

export type EcoTrackProduct = {
  id: string;
  name: string;
  reference: string | null;
  quantity: number;
  active: boolean;
};

export type EcoTrackTrackingActivity = {
  reason?: string | null;
  details?: string | null;
  station?: string | null;
  driver?: string | null;
  driver_phone?: string | null;
  desk_phone?: string | null;
  date?: string | null;
  time?: string | null;
  postponed_to?: string | null;
  [key: string]: unknown;
};

export type EcoTrackShippingMode = "stock" | "without_stock";
