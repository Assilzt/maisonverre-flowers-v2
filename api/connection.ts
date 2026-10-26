import {
  isAdmin,
  Request,
  Response,
  loadEcoSettings,
  queryValue,
} from "../backend/repositories/index.js";
import {
  ecoFetch,
  getBaseUrl,
  getHeaders,
} from "../backend/integrations/ecotrack/client.js";
import { validateOsenConnection } from "../backend/integrations/osen/connection.js";
export default async function connection(request: Request, response: Response) {
  if (!isAdmin(request)) {
    response.status(401).json({ error: "غير مصرح" });
    return;
  }
  try {
    const settings = await loadEcoSettings(queryValue(request, "providerId"));
    if (settings.kind === "osen") {
      response
        .status(200)
        .json({ valid: await validateOsenConnection(settings) });
      return;
    }
    const result = await ecoFetch(
      getBaseUrl(settings) +
        "/validate/token?api_token=" +
        encodeURIComponent(settings.token),
      { headers: getHeaders(settings) }
    );
    const data = (await result.json()) as { success?: boolean };
    response.status(200).json({ valid: result.ok && data.success === true });
  } catch {
    response.status(200).json({ valid: false });
  }
}
