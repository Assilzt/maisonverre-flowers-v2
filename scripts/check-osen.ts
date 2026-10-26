// Read-only verification. Load credentials with --env-file=.env.osen.local.
import { validateOsenConnection } from "../backend/integrations/osen/connection.js";
import {
  fetchEcoTrackWilayas,
  fetchEcoTrackCommunes,
  fetchEcoTrackFees,
  fetchEcoTrackProducts,
} from "../backend/integrations/ecotrack/client.js";
const settings = {
  kind: "osen" as const,
  provider: "osen-express",
  token: process.env.OSEN_API_TOKEN,
  merchantId: process.env.OSEN_MERCHANT_ID,
  storeId: process.env.OSEN_STORE_ID,
};
if (!(await validateOsenConnection(settings)))
  throw new Error(
    "Osen authentication or merchant/store identity did not match"
  );
const wilayas = await fetchEcoTrackWilayas(settings);
const communes = wilayas.length
  ? await fetchEcoTrackCommunes(String(wilayas[0].id), settings)
  : [];
const fees = await fetchEcoTrackFees(settings);
const stock = await fetchEcoTrackProducts(settings);
console.log(
  JSON.stringify(
    {
      authenticated: true,
      wilayas: wilayas.length,
      sampleWilayaCommunes: communes.length,
      feeRows: fees.length,
      stockProducts: stock.length,
      shipmentWrites: 0,
    },
    null,
    2
  )
);
