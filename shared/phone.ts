/** Algerian mobile number in E.164 digits without "+", e.g. 213551234567. */
export function internationalPhone(phone: unknown) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (/^0[5-7]\d{8}$/.test(digits)) return "213" + digits.slice(1);
  if (/^213[5-7]\d{8}$/.test(digits)) return digits;
  return undefined;
}
