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
import {
  consumeBudget,
  RateLimitError,
} from "../backend/services/rate-limit.js";
export default async function session(request: Request, response: Response) {
  response.setHeader("Cache-Control", "no-store");
  const cookieSecurity = process.env.VERCEL
    ? "SameSite=None; Secure"
    : "SameSite=Lax";
  if (request.method === "GET") {
    response.status(200).json({
      authenticated: verifySession(headerValue(request, "cookie") || ""),
    });
    return;
  }
  if (request.method === "DELETE") {
    response.setHeader(
      "Set-Cookie",
      `mv_session=; HttpOnly; ${cookieSecurity}; Path=/; Max-Age=0`
    );
    response.status(200).json({ ok: true });
    return;
  }
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const password = String(getBody(request.body).password || "");
    if (!process.env.DASHBOARD_PASSWORD) {
      response.status(503).json({
        error:
          "لوحة الإدارة غير مهيأة: أضف DASHBOARD_PASSWORD إلى Environment Variables ثم أعد النشر",
      });
      return;
    }
    const ip = String(headerValue(request, "x-forwarded-for") || "local").split(
      ","
    )[0];
    await consumeBudget("login:" + ip, 10, 60);
    if (!secureEqual(password, process.env.DASHBOARD_PASSWORD)) {
      response.status(401).json({ error: "بيانات الدخول غير صحيحة" });
      return;
    }
    response.setHeader(
      "Set-Cookie",
      `mv_session=${issueSession()}; HttpOnly; ${cookieSecurity}; Path=/; Max-Age=28800`
    );
    response.status(200).json({ ok: true });
  } catch (error) {
    if (error instanceof RateLimitError) {
      response.setHeader("Retry-After", String(error.retryAfter));
      response.status(429).json({
        error: `تم تجاوز عدد المحاولات؛ أعد المحاولة بعد ${error.retryAfter} ثانية`,
      });
      return;
    }
    console.error(
      "Dashboard login",
      error instanceof Error ? error.message : "unknown error"
    );
    response.status(503).json({
      error:
        "تعذر تهيئة تسجيل الدخول؛ تحقق من DATABASE_URL وتشغيل migrations ثم أعد النشر",
    });
  }
}
