export const orderSections = [
  "orders",
  "incomplete",
  "trash",
  "confirmation",
  "shipping",
  "tracking",
  "returns",
  "completed",
  "analytics",
] as const;
export type OrderSection = (typeof orderSections)[number];
export function initialOrderSection(
  path: string,
  search: string
): OrderSection {
  const tab = new URLSearchParams(search).get("tab");
  return orderSections.includes(tab as OrderSection)
    ? (tab as OrderSection)
    : path === "/admin/shipping"
      ? "tracking"
      : "orders";
}
