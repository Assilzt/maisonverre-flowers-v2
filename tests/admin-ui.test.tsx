// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { DEFAULT_PRODUCT } from "../shared/catalog";
import { AdminShell } from "../frontend/src/features/admin/ui/AdminShell";
import { OrdersScreen } from "../frontend/src/features/admin/views/OrdersScreen";
import { orderStatusView } from "../frontend/src/features/admin/views/OrderRow";
import { useProductEditor } from "../frontend/src/features/admin/products/useProductEditor";
import { initialOrderSection } from "../frontend/src/features/admin/model/sections";
import { canConfirmOrder } from "../frontend/src/features/admin/ui/order-ui";
import type { DashboardContext } from "../frontend/src/features/admin/useDashboard";
import type { Order } from "../shared/orders";
let root: Root, host: HTMLDivElement;
beforeEach(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  history.replaceState(null, "", "/admin");
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const button = (name: string) =>
  Array.from(host.querySelectorAll("button")).find(
    b => b.textContent?.trim() === name
  )!;
it("mounts the mobile navigation only while open and restores focus on Escape", async () => {
  await act(async () =>
    root.render(
      <AdminShell active="orders" title="الطلبات">
        <p>content</p>
      </AdminShell>
    )
  );
  expect(host.querySelectorAll("nav")).toHaveLength(1);
  expect(host.querySelector("[role=dialog]")).toBeNull();
  const trigger = host.querySelector<HTMLButtonElement>(
    '[aria-label="فتح قائمة التنقل"]'
  )!;
  trigger.focus();
  await act(async () => trigger.click());
  expect(
    host.querySelector("[role=dialog] nav")?.querySelectorAll("a")
  ).toHaveLength(6);
  expect(document.body.style.overflow).toBe("hidden");
  await act(async () =>
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    )
  );
  expect(host.querySelector("[role=dialog]")).toBeNull();
  expect(document.activeElement).toBe(trigger);
  expect(document.body.style.overflow).toBe("");
});
const order = (extra: Partial<Order> = {}) =>
  ({
    id: 7,
    lead_id: "AT-7",
    status: "complete",
    phone: "0551234567",
    full_name: "Amine Benali",
    wilaya: "05 - باتنة",
    commune: "Batna",
    delivery_type: "stop_desk",
    price: 2900,
    delivery_fee: 400,
    quantity: 2,
    campaign: "Flowers",
    order_snapshot: { name: "مجموعة بذور الزهور" },
    ecotrack_tracking: null,
    ecotrack_status: null,
    created_at: new Date().toISOString(),
    ...extra,
  }) as Order;
const screen = (extra: Record<string, unknown> = {}) =>
  ({
    counts: { complete: 1, confirmed: 2, trashed: 4 },
    confirmationQueueCount: 1,
    shippingQueueCount: 2,
    trackingQueueCount: 0,
    followUpCount: 0,
    section: "orders",
    sectionTitle: "الواردة",
    sectionDescription: "",
    visibleOrders: [order()],
    orders: [order()],
    selectedIds: [],
    totalRows: 1,
    ordersPage: 1,
    query: "",
    datePreset: "all",
    shippingStage: "",
    availableStages: [],
    loading: false,
    error: "",
    allVisibleSelected: false,
    contactBusy: false,
    setQuery: vi.fn(),
    goToSection: vi.fn(),
    setShippingStage: vi.fn(),
    openOrder: vi.fn(),
    toggleSelected: vi.fn(),
    recordContact: vi.fn(),
    runAction: vi.fn(),
    startWork: vi.fn(),
    ...extra,
  }) as unknown as DashboardContext;
it("shows queue tabs with counts and opens a queue from its tab", async () => {
  const c = screen();
  await act(async () => root.render(<OrdersScreen context={c} />));
  const tabs = Array.from(host.querySelectorAll("[role=tab]")).map(t =>
    t.textContent?.trim()
  );
  expect(tabs).toEqual([
    "الكل3",
    "تحتاج تأكيد1",
    "جاهزة للشحن2",
    "قيد التوصيل0",
    "تحتاج متابعة0",
  ]);
  const tab = Array.from(
    host.querySelectorAll<HTMLButtonElement>("[role=tab]")
  )[1];
  await act(async () => tab.click());
  expect(c.goToSection).toHaveBeenCalledWith("confirmation");
});
it("shows selection circles only in select mode and the action bar only with a selection", async () => {
  await act(async () => root.render(<OrdersScreen context={screen()} />));
  expect(host.querySelector(".ops-row.selecting")).toBeNull();
  expect(host.querySelector(".ops-bulk")).toBeNull();
  await act(async () => button("تحديد").click());
  expect(host.querySelector(".ops-row.selecting")).not.toBeNull();
  expect(host.querySelector(".ops-bulk")).toBeNull();
  await act(async () =>
    root.render(<OrdersScreen context={screen({ selectedIds: [7] })} />)
  );
  expect(host.querySelector(".ops-bulk")?.textContent).toContain("1 محدد");
  expect(host.querySelector('[aria-label="البحث في الطلبات"]')).not.toBeNull();
});
it("shows the useful order facts in one row and keeps actions from opening it", async () => {
  const c = screen();
  await act(async () => root.render(<OrdersScreen context={c} />));
  const row = host.querySelector(".ops-row")!;
  expect(row.textContent).toContain("Amine Benali");
  expect(row.textContent).toContain("باتنة");
  expect(row.textContent).toContain("مكتب الشحن");
  expect(row.textContent).toContain("3,300");
  await act(async () => button("تأكيد").click());
  expect(c.recordContact).toHaveBeenCalledWith(c.visibleOrders[0], "confirmed");
  expect(c.openOrder).not.toHaveBeenCalled();
  await act(async () => (row as HTMLElement).click());
  expect(c.openOrder).toHaveBeenCalledWith(c.visibleOrders[0]);
});
it("disables confirming an order whose phone is incomplete", async () => {
  const draft = order({ status: "abandoned", phone: "055" });
  await act(async () =>
    root.render(
      <OrdersScreen
        context={screen({ visibleOrders: [draft], orders: [draft] })}
      />
    )
  );
  expect(button("تأكيد").disabled).toBe(true);
});
it("labels carrier states in Arabic with one color per state", () => {
  expect(orderStatusView(order())).toEqual({
    label: "جديد — يحتاج تأكيد",
    tone: "blue",
  });
  expect(
    orderStatusView(
      order({ ecotrack_tracking: "T1", ecotrack_status: "livre_non_encaisse" })
    )
  ).toEqual({ label: "سُلّمت، لم تُحصّل", tone: "green" });
});
it("allows confirmation only for unshipped eligible orders with a valid complete phone", () => {
  const order = {
    status: "complete",
    phone: "0551234567",
    ecotrack_tracking: null,
  } as Order;
  expect(canConfirmOrder(order)).toBe(true);
  expect(canConfirmOrder({ ...order, phone: "055" })).toBe(false);
  expect(canConfirmOrder({ ...order, ecotrack_tracking: "TRACK" })).toBe(false);
  expect(canConfirmOrder({ ...order, status: "cancelled" })).toBe(false);
});
it("opens the requested order queue and safely falls back from unknown query values", () => {
  expect(initialOrderSection("/admin", "?tab=confirmation")).toBe(
    "confirmation"
  );
  expect(initialOrderSection("/admin/shipping", "")).toBe("tracking");
  expect(initialOrderSection("/admin", "?tab=invalid")).toBe("orders");
});
let editor: ReturnType<typeof useProductEditor>;
function EditorHarness() {
  editor = useProductEditor();
  return null;
}
async function renderEditor() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url, init) => {
      if (String(url) === "/api/session")
        return Response.json({ authenticated: true });
      if (init?.method === "POST") return Response.json({ ok: true });
      return Response.json({
        pages: [
          {
            slug: DEFAULT_PRODUCT.slug,
            draft: DEFAULT_PRODUCT,
            published: DEFAULT_PRODUCT,
            revision: 1,
          },
        ],
        revisions: [],
      });
    })
  );
  await act(async () => root.render(<EditorHarness />));
}
it("blocks an invalid new product before sending an API mutation", async () => {
  await renderEditor();
  await act(async () => {
    editor.create();
  });
  await act(async () => {
    editor.save();
  });
  expect(editor.fieldErrors.name).toBeTruthy();
  expect(editor.fieldErrors.images).toBeTruthy();
  expect(
    vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === "POST")
  ).toHaveLength(0);
});
it("blocks publishing unsaved changes and preserves edits when leaving is declined", async () => {
  await renderEditor();
  await act(async () => editor.change("name", "Changed draft"));
  await act(async () => editor.publish());
  expect(editor.error).toContain("احفظ");
  expect(
    vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === "POST")
  ).toHaveLength(0);
  vi.spyOn(window, "confirm").mockReturnValue(false);
  expect(editor.leaveEditor()).toBe(false);
  expect(editor.page.name).toBe("Changed draft");
  vi.spyOn(window, "confirm").mockReturnValue(true);
  await act(async () => {
    expect(editor.leaveEditor()).toBe(true);
  });
  expect(editor.dirty).toBe(false);
  expect(editor.page.name).toBe(DEFAULT_PRODUCT.name);
});
