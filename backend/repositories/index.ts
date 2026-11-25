/** Database access only: queries for orders, settings and stock. */
export * from "./settings.js";
export * from "./orders.js";
export * from "./stock.js";
export { sql, requireDatabase } from "./connection.js";
export type { Order as OrderRow, StockProduct } from "../../shared/orders.js";
