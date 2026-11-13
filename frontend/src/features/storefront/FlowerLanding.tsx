import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { DEFAULT_PRODUCT, type ProductLandingConfig } from "@shared/catalog";
import { WILAYAS } from "@shared/locations";
import { useCheckout } from "../checkout/useCheckout";
import { ProductSections } from "./ProductSections";

const money = (value: number) => value.toLocaleString("en-US");
export default function FlowerLanding({
  product = DEFAULT_PRODUCT,
}: {
  product?: ProductLandingConfig;
}) {
  const {
    fullName,
    setFullName,
    wilaya,
    setWilaya,
    commune,
    setCommune,
    phone,
    setPhone,
    communes,
    deliveryFeesStatus,
    isSubmitting,
    submitted,
    setSelectedBundleQuantity,
    phoneInputRef,
    selectedBundle,
    offerPrice,
    compareAtTotal,
    phoneError,
    hasDeliveryFee,
    isFreeShipping,
    deliveryFee,
    trackInitiateCheckout,
    handleSubmit,
    startNewOrder,
  } = useCheckout(product);
  return (
    <div className="min-h-screen relative overflow-hidden flower-landing">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(236,253,245,0.95),_transparent_52%),linear-gradient(135deg,_#fff7ed_0%,_#fdf2f8_48%,_#ecfdf5_100%)]">
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm"></div>
      </div>

      <div className="flower-announcement" role="note" dir="rtl">
        🌼{" "}
        {product.slug === DEFAULT_PRODUCT.slug
          ? "مجموعة 4 أنواع من بذور الزهور"
          : product.name}{" "}
        <span aria-hidden="true">·</span> الدفع عند الاستلام
      </div>

      <div
        className={`relative z-10 container mx-auto px-4 py-8 max-w-6xl flower-content`}
      >
        <div className={`grid md:grid-cols-2 gap-8 items-start flower-layout`}>
          <div
            className={`order-2 md:order-none bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 md:p-8 border border-pink-100 flower-copy-card`}
          >
            <h1
              className="text-2xl md:text-3xl font-bold text-center mb-3 text-gray-800"
              dir="rtl"
            >
              {product.headline} 🌼
            </h1>
            <div
              className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-center shadow-sm"
              dir="rtl"
            >
              <p className="text-base font-extrabold text-emerald-800">
                🌼 {product.subheadline}
              </p>
            </div>

            <p className="flower-seed-note" dir="rtl">
              {product.description}
            </p>

            {submitted ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✅</div>
                <h2
                  className="text-xl font-semibold text-green-600 mb-2"
                  dir="rtl"
                >
                  تم استلام طلبك!
                </h2>
                <p className="text-gray-600" dir="rtl">
                  سنتصل بك خلال 24 ساعة لتأكيد الطلب.
                  <br />
                  احتفظ بهاتفك قريبًا منك.
                </p>
                <Button
                  onClick={startNewOrder}
                  className="mt-4 bg-pink-500 hover:bg-pink-600"
                >
                  طلب جديد
                </Button>
              </div>
            ) : (
              <div className="rounded-3xl border border-pink-100 bg-white/95 p-4 shadow-[0_8px_30px_rgba(244,114,182,0.08)] ring-1 ring-white/60 md:p-6">
                {
                  <div className="flower-order-header" dir="rtl">
                    <h2>استمارة الطلب</h2>
                    <p>املأ بياناتك وسنتصل بك لتأكيد الطلب</p>
                  </div>
                }
                <form
                  id="lead-form"
                  onSubmit={handleSubmit}
                  onFocus={trackInitiateCheckout}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label
                      htmlFor="phone"
                      className="flex items-center gap-2 text-base font-bold text-gray-800"
                    >
                      <span className="text-lg">📱</span>
                      <span>رقم الهاتف</span>
                    </Label>
                    <div className="relative">
                      <Input
                        ref={phoneInputRef}
                        id="phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        required
                        placeholder="0551234567"
                        className="border-2 border-pink-200 bg-pink-50/30 px-4 py-3 text-right text-base font-medium shadow-sm transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100 placeholder:text-gray-400"
                        dir="rtl"
                        aria-invalid={Boolean(phone && phoneError)}
                        aria-describedby="phone-help"
                      />
                    </div>
                    <p
                      id="phone-help"
                      className={
                        "flower-field-help" +
                        (phone && phoneError ? " is-error" : "")
                      }
                      role={phone && phoneError ? "alert" : undefined}
                      dir="rtl"
                    >
                      {phone && phoneError
                        ? phoneError
                        : "مثال: 0551234567 أو ‎+213551234567‎"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="fullName"
                      className="flex items-center gap-2 text-base font-bold text-gray-800"
                    >
                      <span className="text-lg">👤</span>
                      <span>الاسم</span>
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      autoComplete="name"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="أدخل اسمك الكامل"
                      className="border-2 border-emerald-200 bg-emerald-50/40 px-4 py-3 text-right text-base font-medium shadow-sm transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      dir="rtl"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor="wilaya"
                        className="text-base font-bold text-gray-800"
                      >
                        الولاية
                      </Label>
                      <select
                        id="wilaya"
                        value={wilaya}
                        onChange={event => setWilaya(event.target.value)}
                        className="h-12 w-full rounded-4xl border-2 border-amber-200 bg-amber-50/40 px-4 text-right text-base font-medium shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                        dir="rtl"
                      >
                        <option value="">اختر الولاية</option>
                        {WILAYAS.map(w => (
                          <option key={w} value={w}>
                            {w}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="commune"
                        className="text-base font-bold text-gray-800"
                      >
                        البلدية
                      </Label>
                      <select
                        id="commune"
                        value={commune}
                        onChange={event => setCommune(event.target.value)}
                        disabled={!wilaya || communes.length === 0}
                        className="h-12 w-full rounded-4xl border-2 border-amber-200 bg-amber-50/40 px-4 text-right text-base font-medium shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-70"
                        dir="rtl"
                      >
                        <option value="">
                          {!wilaya
                            ? "اختر الولاية أولاً"
                            : communes.length
                              ? "اختر البلدية من القائمة"
                              : "جارٍ تحميل البلديات…"}
                        </option>
                        {communes.map(item => (
                          <option key={item.name} value={item.name}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {product.bundles && (
                    <div
                      className={`flower-package-grid ${product.bundles.length === 1 ? "flower-package-grid-single" : ""}`}
                      dir="rtl"
                      role="group"
                      aria-label={"اختر عدد الطلبات: " + product.name}
                    >
                      {product.bundles.map(bundle => (
                        <button
                          key={bundle.quantity}
                          type="button"
                          aria-label={`باقة ${bundle.label} بسعر ${bundle.price} ${product.currency}${bundle.quantity === 3 ? "، والتوصيل مجاني" : ""}`}
                          aria-pressed={
                            selectedBundle?.quantity === bundle.quantity
                          }
                          onClick={() =>
                            setSelectedBundleQuantity(bundle.quantity)
                          }
                          className={`flower-package-option ${selectedBundle?.quantity === bundle.quantity ? "selected" : ""}`}
                        >
                          <span className="flower-package-heading">
                            <span className="flower-package-count">
                              {bundle.quantity}
                            </span>
                            <span className="flower-package-unit">
                              {bundle.quantity === 1
                                ? "طلب واحد"
                                : bundle.quantity === 2
                                  ? "طلبان"
                                  : "طلبات"}
                            </span>
                          </span>
                          <span className="flower-package-price">
                            {bundle.price.toLocaleString("en-US")}{" "}
                            <small>{product.currency}</small>
                          </span>
                          <span
                            className={`flower-package-detail${bundle.quantity === 3 ? " flower-package-detail-free" : ""}`}
                          >
                            {bundle.quantity === 3
                              ? "توصيل مجاني"
                              : `${Math.round(bundle.price / bundle.quantity).toLocaleString("en-US")} دج لكل طلب`}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div
                    className={`text-center py-3 px-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 flower-price-summary`}
                    dir="rtl"
                  >
                    <p className="text-base font-semibold text-gray-800">
                      {"سعر الباقة:"}{" "}
                      <span className="text-xl font-extrabold text-emerald-700">
                        {money(offerPrice)} {product.currency}
                      </span>
                    </p>
                    {compareAtTotal && offerPrice < compareAtTotal && (
                      <p className="mt-1 text-xs font-semibold text-gray-500">
                        <span className="line-through">
                          {money(compareAtTotal)} {product.currency}
                        </span>
                        <span className="mx-2 rounded-full bg-rose-100 px-2 py-1 text-rose-700">
                          خصم{" "}
                          {Math.round(
                            ((compareAtTotal - offerPrice) / compareAtTotal) *
                              100
                          )}
                          %
                        </span>
                      </p>
                    )}
                    <div
                      className="mt-3 flex items-center justify-between gap-3 border-t border-emerald-200 pt-3 text-sm font-semibold text-gray-700"
                      dir="rtl"
                    >
                      <span>التوصيل إلى المنزل</span>
                      <span className="text-gray-900">
                        {isFreeShipping
                          ? "مجاني"
                          : deliveryFeesStatus === "ready" && hasDeliveryFee
                            ? `${money(deliveryFee)} ${product.currency}`
                            : !wilaya
                              ? "يُحسب بعد اختيار الولاية"
                              : deliveryFeesStatus === "loading"
                                ? "جارٍ احتسابه…"
                                : deliveryFeesStatus === "error"
                                  ? "تعذّر تحميل الرسم"
                                  : "غير متاح لهذه الولاية"}
                      </span>
                    </div>
                    {isFreeShipping ||
                    (deliveryFeesStatus === "ready" && hasDeliveryFee) ? (
                      <p className="flower-final-total mt-2 text-lg font-black text-gray-950">
                        الإجمالي النهائي: {money(offerPrice + deliveryFee)}{" "}
                        {product.currency}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs font-semibold text-gray-600">
                        {!wilaya
                          ? "اختر الولاية لعرض المبلغ النهائي شامل التوصيل"
                          : deliveryFeesStatus === "loading"
                            ? "سيظهر المبلغ النهائي بعد احتساب التوصيل"
                            : "لا يمكن تأكيد الإجمالي حتى تتوفر رسوم التوصيل"}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:via-amber-600 hover:to-orange-700 text-white font-black text-lg py-6 shadow-lg shadow-orange-300/50 transition-all duration-200 active:scale-[0.99]"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        جاري الإرسال...
                      </>
                    ) : (
                      "أرسل الطلب للتأكيد"
                    )}
                  </Button>
                </form>
              </div>
            )}
          </div>

          <ProductSections product={product} />
        </div>
      </div>
    </div>
  );
}
