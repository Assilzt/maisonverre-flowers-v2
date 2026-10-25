import {
  issueSession,
  secureEqual,
  verifySession,
} from "../backend/auth/session.js";
import {
  getBody,
  headerValue,
  Request,
  Response,
} from "../backend/repositories/index.js";
import { consumeBudget } from "../backend/services/rate-limit.js";
export default async function session(request: Request, response: Response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method === "GET") {
    response.status(200).json({
      authenticated: verifySession(headerValue(request, "cookie") || ""),
    });
    return;
  }
  if (request.method === "DELETE") {
    response.setHeader(
      "Set-Cookie",
      "mv_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0" +
        (process.env.VERCEL ? "; Secure" : "")
    );
    response.status(200).json({ ok: true });
    return;
  }
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const ip = String(headerValue(request, "x-forwarded-for") || "local").split(
      ","
    )[0];
    await consumeBudget("login:" + ip, 10, 60);
    const password = String(getBody(request.body).password || "");
    if (
      !process.env.DASHBOARD_PASSWORD ||
      !secureEqual(password, process.env.DASHBOARD_PASSWORD)
    ) {
      response.status(401).json({ error: "بيانات الدخول غير صحيحة" });
      return;
    }
    response.setHeader(
      "Set-Cookie",
      `mv_session=${issueSession()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.VERCEL ? "; Secure" : ""}`
    );
    response.status(200).json({ ok: true });
  } catch {
    response.status(429).json({ error: "تعذر تسجيل الدخول؛ حاول لاحقًا" });
  }
}
