import {
  sql,
  loadEcoSettings,
  loadMetaPixelId,
} from "../repositories/index.js";
import type { StorefrontConfig } from "../../shared/storefront.js";
import { deliveryFees } from "./delivery-fees.js";

/** Resolves to undefined instead of failing or waiting longer than `ms`. */
function settle<T>(task: () => Promise<T>, ms: number): Promise<T | undefined> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(undefined), ms);
    task().then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(undefined);
      }
    );
  });
}

/**
 * Public values the landing page needs before the visitor can order. Each part
 * is optional: when it is missing the browser falls back to its API call.
 */
export async function loadStorefrontConfig(): Promise<StorefrontConfig> {
  if (!sql) return {};
  const [pixelId, fees] = await Promise.all([
    settle(() => loadMetaPixelId(), 1200),
    settle(async () => deliveryFees(await loadEcoSettings()), 1500),
  ]);
  const config: StorefrontConfig = {};
  if (pixelId !== undefined) config.pixelId = pixelId;
  if (fees?.length) config.fees = fees;
  return config;
}
