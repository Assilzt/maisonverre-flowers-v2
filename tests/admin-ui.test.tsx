// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { DEFAULT_PRODUCT } from "../shared/catalog";
import { AdminShell } from "../frontend/src/features/admin/ui/AdminShell";
import { OrdersWorkspace } from "../frontend/src/features/admin/views/OrdersWorkspace";
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
it("keeps filters and bulk actions hidden until requested", async () => {
  const c = {
    visibleOrders: [],
    orders: [],
    ordersPage: 1,
    totalRows: 0,
    selectedIds: [],
    query: "",
    section: "orders",
    status: "all",
    datePreset: "all",
    shippingStage: "",
    availableStages: [],
    setQuery: vi.fn(),
    goToSection: vi.fn(),
    setShippingStage: vi.fn(),
  } as unknown as DashboardContext;
  await act(async () => root.render(<OrdersWorkspace context={c} />));
  expect(host.querySelector("#order-filters")).toBeNull();
  expect(host.querySelector(".bulk-toolbar")).toBeNull();
  await act(async () => button("الفلاتر").click());
  expect(host.querySelector("#order-filters")).not.toBeNull();
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
