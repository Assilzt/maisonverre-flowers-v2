import { isAdmin, Request, Response } from "../backend/repositories/index.js";
import { flushNotifications } from "../backend/jobs/notifications.js";
export default async function telegram(request: Request, response: Response) {
  if (!isAdmin(request)) {
    response.status(401).json({ error: "غير مصرح" });
    return;
  }
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }
  response.status(200).json(await flushNotifications());
}
