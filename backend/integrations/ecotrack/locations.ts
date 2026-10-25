import { EcoTrackSettings } from "./types.js";
import { getHeaders, getBaseUrl, ensureToken, ecoFetch } from "./transport.js";

// EcoTrack uses the official Algerian codes for the 10 newer wilayas.
// Keep this explicit so a provider-specific mapping cannot silently reorder 49-58.
export const officialToEcoTrack: Record<number, number> = {
  49: 49, // Timimoun
  50: 50, // Bordj Badji Mokhtar
  51: 51, // Ouled Djellal
  52: 52, // Béni Abbès
  53: 53, // In Salah
  54: 54, // In Guezzam
  55: 55, // Touggourt
  56: 56, // Djanet
  57: 57, // El M'Ghair
  58: 58, // El Meniaa
};

export const normalizeLocationText = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/[يى]/g, "ي")
    .replace(/[ة]/g, "ه")
    .replace(/[\s_-]+/g, " ");

export const locationAliases: Record<string, string> = {
  mahelma: "maalma",
  ouzellaguen: "ouzellaguene",
  msirda: "msirda fouaga",
  ouaguenoun: "ouaguenoune",
  yakouren: "yakourene",
  "ziama mansouriah": "ziama mansouria",
  ziama: "ziama mansouria",
  "oued el bar": "oued el barad",
  "el harrouch": "el arrouch",
  hamma: "hamadi krouma",
  kanouar: "kanoua",
  khezaras: "khezara",
  "hammam n'bails": "hammam n'bail",
  "el ksir": "ain ouksir",
  "el meed": "el houamed",
  "el menaoua": "menaa",
  nesmoth: "nesmot",
  "el abiodh sidi cheikh": "el biodh sidi cheikh",
  "zemmouri el bahri": "zemmouri",
  grarem: "grarem gouga",
  oulhaca: "oulhaca el gheraba",
  "el fedjoudj boughrara": "el fedjoudj boughrara sa",
  "عين قزام": "in guezzam",
  "إن قزام": "in guezzam",
  "ain guezzam": "in guezzam",
  "in guezzam": "in guezzam",
};

export const canonicalLocationText = (value: string) =>
  locationAliases[normalizeLocationText(value)] || normalizeLocationText(value);

export const comparableLocationText = (value: string) =>
  canonicalLocationText(value)
    .replace(/['’]/g, " ")
    .replace(/^(les|el|al|l)\s*/i, "")
    .replace(/[\s-]/g, "")
    .replace(/(.)\1+/g, "$1");

export const wilayaCode = (value: string) => {
  const raw = String(value || "");
  const match = raw.match(/^\s*(\d{1,2})/);
  if (match) {
    const official = Number(match[1]);
    if (Number.isInteger(official) && official >= 1 && official <= 58)
      return officialToEcoTrack[official] || official;
  }
  const normalized = canonicalLocationText(
    raw.replace(/^\s*\d{1,2}\s*[-–:]?\s*/, "")
  );
  if (normalized === "in guezzam") return 54;
  const official = Number(raw);
  if (!Number.isInteger(official) || official < 1 || official > 58) return null;
  return officialToEcoTrack[official] || official;
};

export const canonicalCommuneForEcoTrack = async (
  wilaya: string,
  commune: string,
  settings?: EcoTrackSettings
) => {
  const code = wilayaCode(wilaya);
  const communes = await fetchEcoTrackCommunes(wilaya, settings);
  const selected = comparableLocationText(commune);
  const match = communes.find(
    item => comparableLocationText(item.name) === selected
  );
  if (!match)
    throw new Error(
      `البلدية «${commune}» غير متاحة في EcoTrack لولاية ${wilaya}`
    );
  return { name: match.name, code, postalCode: match.codePostal };
};

export async function fetchEcoTrackWilayas(settings?: EcoTrackSettings) {
  ensureToken(settings);
  const response = await ecoFetch(`${getBaseUrl(settings)}/get/wilayas`, {
    headers: getHeaders(settings),
  });
  if (!response.ok)
    throw new Error(`تعذر جلب قائمة الولايات (${response.status})`);
  const data = (await response.json()) as unknown;
  const items = Array.isArray(data)
    ? data
    : (data as { data?: unknown[]; wilayas?: unknown[] })?.data ||
      (data as { wilayas?: unknown[] })?.wilayas ||
      [];
  return (items as Array<Record<string, unknown>>)
    .map(item => ({
      id: Number(item.wilaya_id ?? item.id ?? item.code),
      name: String(item.wilaya_name ?? item.nom ?? item.name ?? ""),
    }))
    .filter(item => Number.isInteger(item.id) && item.id > 0);
}

export async function fetchEcoTrackFees(settings?: EcoTrackSettings) {
  ensureToken(settings);
  const response = await ecoFetch(`${getBaseUrl(settings)}/get/fees`, {
    headers: getHeaders(settings),
  });
  if (!response.ok)
    throw new Error(`تعذر جلب أسعار التوصيل (${response.status})`);
  const data = (await response.json()) as { livraison?: unknown[] };
  return data.livraison || [];
}

export async function fetchEcoTrackCommunes(
  wilaya: string,
  settings?: EcoTrackSettings
) {
  ensureToken(settings);
  const code = wilayaCode(wilaya);
  if (!code) throw new Error("رقم الولاية غير صالح");
  const response = await ecoFetch(
    `${getBaseUrl(settings)}/get/communes?wilaya_id=${encodeURIComponent(code)}`,
    { headers: getHeaders(settings) }
  );
  if (!response.ok) throw new Error(`تعذر جلب البلديات (${response.status})`);
  const data = (await response.json()) as unknown;
  const record =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const items = Array.isArray(data)
    ? data
    : Array.isArray(record.data)
      ? record.data
      : Array.isArray(record.communes)
        ? record.communes
        : Object.values(record).filter(
            item => item && typeof item === "object"
          );
  return (items as Array<Record<string, unknown>>)
    .filter(
      item =>
        item.is_active !== 0 &&
        item.is_active !== "0" &&
        item.is_active !== false &&
        (item.wilaya_id == null || Number(item.wilaya_id) === code)
    )
    .map(item => ({
      name: String(item.nom || item.name || item.commune_name || ""),
      codePostal: String(item.code_postal || item.codePostal || "") || null,
      hasStopDesk: Number(item.has_stop_desk ?? 0) === 1,
    }))
    .filter(item => item.name);
}
