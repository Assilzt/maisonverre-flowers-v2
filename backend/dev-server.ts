import express from "express";
import path from "node:path";
import orders from "../api/orders.js";
import pages from "../api/pages.js";
import session from "../api/session.js";
import shipping from "../api/shipping.js";
import telegram from "../api/telegram.js";
import jobs from "../api/jobs.js";
import connection from "../api/connection.js";
import recovery from "../api/recovery.js";
import render from "../api/render.js";
import media from "../api/media.js";
import type { Request, Response } from "./http/contracts.js";
export const app = express();
app.disable("x-powered-by");
// Image uploads need a larger body; every other API stays small.
app.use("/api/media", express.json({ limit: "3mb" }));
app.use(express.json({ limit: "128kb" }));
const handlers: Record<
  string,
  (request: Request, response: Response) => Promise<void>
> = {
  orders,
  pages,
  session,
  shipping,
  telegram,
  jobs,
  connection,
  recovery,
  render,
  media,
};
app.all("/api/:resource", async (req, res) => {
  const handler = handlers[req.params.resource];
  if (!handler) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  try {
    await handler(req as unknown as Request, res as unknown as Response);
  } catch {
    res.status(500).json({ error: "تعذر تنفيذ الطلب" });
  }
});
if (process.env.NODE_ENV === "production") {
  app.get("/", (req, res) =>
    render(
      { ...req, query: { slug: "flower-seed-mix" } } as unknown as Request,
      res as unknown as Response
    )
  );
  app.get("/p/:slug", (req, res) =>
    render(
      { ...req, query: { slug: req.params.slug } } as unknown as Request,
      res as unknown as Response
    )
  );
  app.use(express.static(path.resolve("dist/public")));
  app.get("*", (_req, res) =>
    res.sendFile(path.resolve("dist/public/index.html"))
  );
}
const port = Number(process.env.PORT || 3001);
app.listen(port, "127.0.0.1", () =>
  console.log(`API ready: http://127.0.0.1:${port}`)
);
