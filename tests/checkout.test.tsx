// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { DEFAULT_PRODUCT } from "../shared/catalog";
import { useCheckout } from "../frontend/src/features/checkout/useCheckout";
const mocks = vi.hoisted(() => ({ pixel: vi.fn(), sequence: [] as string[] }));
vi.mock("../frontend/src/features/tracking/meta-pixel", () => ({
  trackMetaPixelEventOnce: mocks.pixel,
}));
let checkout: ReturnType<typeof useCheckout>, root: Root;
function Harness() {
  checkout = useCheckout(DEFAULT_PRODUCT);
  return null;
}
beforeEach(async () => {
  vi.useFakeTimers();
  sessionStorage.clear();
  history.replaceState(null, "", "/");
  mocks.pixel.mockReset();
  mocks.sequence.length = 0;
  mocks.pixel.mockImplementation((_key: string, event: string) =>
    mocks.sequence.push(event)
  );
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url, init) => {
      if (String(url).includes("resource=fees"))
        return Response.json({
          fees: [{ wilaya_id: 5, tarif: 700, tarif_stopdesk: 400 }],
        });
      if (String(url).includes("resource=communes"))
        return Response.json({
          communes: [{ name: "Batna", hasStopDesk: true }],
        });
      const payload = JSON.parse(String(init?.body || "{}"));
      mocks.sequence.push("save:" + payload.status);
      return Response.json({ ok: true });
    })
  );
  const element = document.createElement("div");
  document.body.appendChild(element);
  root = createRoot(element);
  await act(async () => root.render(<Harness />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.innerHTML = "";
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const eventCount = (name: string) =>
  mocks.pixel.mock.calls.filter(call => call[1] === name).length;
it("captures a draft after three digits but fires Lead only for a valid phone", async () => {
  expect(eventCount("ViewContent")).toBe(1);
  await act(async () => checkout.setPhone("055"));
  expect(eventCount("InitiateCheckout")).toBe(1);
  expect(eventCount("Lead")).toBe(0);
  await act(async () => vi.advanceTimersByTimeAsync(700));
  expect(mocks.sequence).toContain("save:abandoned");
  await act(async () => checkout.setPhone("0551234567"));
  expect(eventCount("Lead")).toBe(1);
  await act(async () => checkout.setFullName("Customer"));
  expect(eventCount("Lead")).toBe(1);
  expect(eventCount("InitiateCheckout")).toBe(1);
});
it("preserves Purchase timing and flower bundle quantity/price/free delivery", async () => {
  await act(async () => {
    checkout.setPhone("0551234567");
    checkout.setWilaya("05 - باتنة");
    checkout.setSelectedBundleQuantity(3);
  });
  await act(async () => checkout.setCommune("Batna"));
  expect(checkout.offerPrice).toBe(3900);
  expect(checkout.deliveryFee).toBe(0);
  await act(async () =>
    checkout.handleSubmit({ preventDefault() {} } as never)
  );
  expect(eventCount("Purchase")).toBe(1);
  expect(checkout.submitted).toBe(true);
  expect(mocks.sequence.indexOf("Purchase")).toBeLessThan(
    mocks.sequence.indexOf("save:complete")
  );
  const calls = vi.mocked(fetch).mock.calls;
  const complete = calls
    .map(([, init]) => JSON.parse(String(init?.body || "{}")))
    .find(body => body.status === "complete");
  expect(complete).toMatchObject({
    price: 3900,
    quantity: 3,
    deliveryFee: 0,
    productSlug: "flower-seed-mix",
  });
  expect(complete.leadToken.length).toBeGreaterThan(24);
  const purchase = mocks.pixel.mock.calls.find(call => call[1] === "Purchase");
  expect(purchase?.[2]).not.toHaveProperty("currency");
});
it("preview does not save drafts or emit campaign events", async () => {
  history.replaceState(null, "", "/?preview=1");
  mocks.pixel.mockClear();
  await act(async () => checkout.setPhone("0551234567"));
  await act(async () => vi.advanceTimersByTimeAsync(700));
  expect(mocks.pixel).not.toHaveBeenCalled();
  expect(mocks.sequence.filter(e => e.startsWith("save:"))).toHaveLength(0);
});
