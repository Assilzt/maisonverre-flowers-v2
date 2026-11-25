import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_PRODUCT,
  type ProductBundle,
  type ProductLandingConfig,
} from "@shared/catalog";
import { WILAYAS } from "@shared/locations";
import type { StorefrontConfig } from "@shared/storefront";
import { useCheckout } from "../checkout/useCheckout";
import { ProductSections } from "./ProductSections";
import { ProductImage } from "./ProductImage";
import { CheckIcon, Spinner } from "./icons";

const money = (value: number) => value.toLocaleString("en-US");

/** Savings versus buying single units at the first bundle's unit price. */
function bundleSavings(bundle: ProductBundle, bundles: ProductBundle[]) {
  const base = bundles[0];
  if (!base || bundle === base) return 0;
  const unit = base.price / base.quantity;
  return Math.max(0, Math.round(unit * bundle.quantity - bundle.price));
}

const STEPS = [
  "اختر العرض واملأ الاستمارة",
  "نتصل بك لتأكيد الطلب",
  "نرسل الطلب إلى منزلك أو مكتب الشحن",
  "تدفع عند الاستلام",
];

export default function FlowerLanding({
  product = DEFAULT_PRODUCT,
  storefront = {},
}: {
  product?: ProductLandingConfig;
  storefront?: StorefrontConfig;
}) {
  const checkout = useCheckout(product, storefront.fees);
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
    communesStatus,
    retryCommunes,
    deliveryFeesStatus,
    retryDeliveryFees,
    lowestDeliveryFee,
    deliveryType,
    setDeliveryType,
    stopDeskAvailable,
    isSubmitting,
    submitted,
    lastOrder,
    formError,
    selectedBundleQuantity,
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
  } = checkout;

  const bundles = product.bundles || [];
  const lowestPrice = bundles.length
    ? Math.min(...bundles.map(b => b.price))
    : product.price;
  const bestValue =
    bundles.length > 1
      ? bundles.reduce((best, b) =>
          b.price / b.quantity < best.price / best.quantity ? b : best
        )
      : undefined;
  const showTrust = product.sections?.trust !== false;
  const faq =
    product.faq ??
    (product.slug === DEFAULT_PRODUCT.slug ? DEFAULT_PRODUCT.faq : undefined);
  const feeReady =
    isFreeShipping || (deliveryFeesStatus === "ready" && hasDeliveryFee);
  const total = offerPrice + (feeReady ? deliveryFee : 0);
  const fieldError = (field: string) =>
    formError?.field === field ? formError.message : "";

  // Sticky call-to-action, shown only while the order form is off screen.
  const orderRef = useRef<HTMLElement | null>(null);
  const [orderVisible, setOrderVisible] = useState(true);
  useEffect(() => {
    const target = orderRef.current;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setOrderVisible(entry.isIntersecting),
      { rootMargin: "0px 0px -15% 0px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const deliveryText = isFreeShipping
    ? "مجاني"
    : deliveryFeesStatus === "ready" && hasDeliveryFee
      ? `${money(deliveryFee)} ${product.currency}`
      : !wilaya
        ? lowestDeliveryFee !== null
          ? `ابتداءً من ${money(lowestDeliveryFee)} ${product.currency}`
          : "يُحسب بعد اختيار الولاية"
        : deliveryFeesStatus === "loading"
          ? "جارٍ احتسابه…"
          : deliveryFeesStatus === "error"
            ? "تعذّر تحميل السعر"
            : "غير متاح لهذه الولاية";

  return (
    <div className="mv-landing" dir="rtl">
      <div className="mv-topbar" role="note">
        <span>الدفع عند الاستلام</span>
        <span aria-hidden="true">•</span>
        <span>توصيل للمنزل أو مكتب الشحن</span>
      </div>

      <main className="mv-main">
        <section className="mv-hero">
          <div className="mv-media">
            <ProductImage images={product.images} />
          </div>
          <div className="mv-hero-copy">
            <h1>{product.headline}</h1>
            {product.subheadline && (
              <p className="mv-sub">{product.subheadline}</p>
            )}
            <p className="mv-price-line">
              ابتداءً من{" "}
              <strong>
                {money(lowestPrice)} {product.currency}
              </strong>
              {product.compareAtPrice &&
                product.compareAtPrice > lowestPrice && (
                  <s>
                    {money(product.compareAtPrice)} {product.currency}
                  </s>
                )}
            </p>
            {showTrust && product.trustBadges.length > 0 && (
              <ul className="mv-chips">
                {product.trustBadges.map((badge, i) => (
                  <li key={i}>
                    <CheckIcon />
                    {badge}
                  </li>
                ))}
              </ul>
            )}
            <a className="mv-hero-cta" href="#order">
              اطلب الآن
            </a>
          </div>
        </section>

        <section
          id="order"
          ref={orderRef}
          className="mv-order"
          aria-labelledby="order-title"
        >
          {submitted ? (
            <div className="mv-success" role="status">
              <div className="mv-success-icon" aria-hidden="true">
                <CheckIcon />
              </div>
              <h2>تم استلام طلبك!</h2>
              <p>
                سنتصل بك خلال 24 ساعة لتأكيد الطلب. احتفظ بهاتفك قريبًا منك.
              </p>
              {lastOrder && (
                <dl className="mv-summary">
                  <div>
                    <dt>العرض</dt>
                    <dd>{lastOrder.bundleLabel}</dd>
                  </div>
                  <div>
                    <dt>التوصيل</dt>
                    <dd>
                      {lastOrder.deliveryType === "stop_desk"
                        ? "مكتب الشحن"
                        : "إلى المنزل"}{" "}
                      — {lastOrder.commune}،{" "}
                      {lastOrder.wilaya.replace(/^\d+\s*-\s*/, "")}
                    </dd>
                  </div>
                  <div className="mv-summary-total">
                    <dt>المبلغ عند الاستلام</dt>
                    <dd>
                      {money(lastOrder.price + lastOrder.deliveryFee)}{" "}
                      {product.currency}
                    </dd>
                  </div>
                </dl>
              )}
              <button
                type="button"
                className="mv-link-button"
                onClick={startNewOrder}
              >
                طلب جديد
              </button>
            </div>
          ) : (
            <>
              <div className="mv-order-head">
                <h2 id="order-title">اطلب الآن والدفع عند الاستلام</h2>
                <p>اختر العرض، املأ بياناتك وسنتصل بك لتأكيد الطلب</p>
              </div>

              {bundles.length > 0 && (
                <div
                  className={
                    "mv-offers" + (bundles.length === 1 ? " is-single" : "")
                  }
                  role="group"
                  aria-label={"اختر العرض: " + product.name}
                >
                  {bundles.map(bundle => {
                    const selected = selectedBundleQuantity === bundle.quantity;
                    const savings = bundleSavings(bundle, bundles);
                    const free =
                      bundle.quantity === product.freeShippingQuantity;
                    const badge =
                      bundle === bestValue
                        ? "أفضل قيمة"
                        : bundle.quantity === product.defaultBundleQuantity
                          ? "خيار مقترح"
                          : "";
                    return (
                      <button
                        key={bundle.quantity}
                        type="button"
                        aria-pressed={selected}
                        aria-label={`${bundle.label} بسعر ${money(bundle.price)} ${product.currency}${free ? "، والتوصيل مجاني" : ""}`}
                        onClick={() =>
                          setSelectedBundleQuantity(bundle.quantity)
                        }
                        className={
                          "mv-offer" + (selected ? " is-selected" : "")
                        }
                      >
                        {badge && (
                          <span className="mv-offer-badge">{badge}</span>
                        )}
                        <span className="mv-offer-radio" aria-hidden="true" />
                        <span className="mv-offer-label">{bundle.label}</span>
                        <span className="mv-offer-price">
                          {money(bundle.price)}{" "}
                          <small>{product.currency}</small>
                        </span>
                        <span className="mv-offer-note">
                          {free
                            ? "توصيل مجاني"
                            : savings > 0
                              ? `وفّر ${money(savings)} ${product.currency}`
                              : bundle.quantity > 1
                                ? `${money(Math.round(bundle.price / bundle.quantity))} ${product.currency} للواحد`
                                : " "}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <form
                id="lead-form"
                onSubmit={handleSubmit}
                onFocus={trackInitiateCheckout}
                className="mv-form"
                noValidate
              >
                <div className="mv-field">
                  <label htmlFor="phone">رقم الهاتف</label>
                  <input
                    ref={phoneInputRef}
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    required
                    maxLength={16}
                    placeholder="0551234567"
                    dir="ltr"
                    aria-invalid={Boolean(
                      (phone && phoneError) || fieldError("phone")
                    )}
                    aria-describedby="phone-help"
                  />
                  <p
                    id="phone-help"
                    className={
                      "mv-help" +
                      ((phone && phoneError) || fieldError("phone")
                        ? " is-error"
                        : "")
                    }
                    role={fieldError("phone") ? "alert" : undefined}
                  >
                    {fieldError("phone") ||
                      (phone && phoneError) ||
                      "سنتصل بك على هذا الرقم لتأكيد الطلب"}
                  </p>
                </div>

                <div className="mv-field">
                  <label htmlFor="fullName">الاسم الكامل</label>
                  <input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="الاسم واللقب"
                  />
                </div>

                <div className="mv-row">
                  <div className="mv-field">
                    <label htmlFor="wilaya">الولاية</label>
                    <select
                      id="wilaya"
                      value={wilaya}
                      onChange={event => setWilaya(event.target.value)}
                      aria-invalid={Boolean(fieldError("wilaya"))}
                      aria-describedby={
                        fieldError("wilaya") ? "wilaya-error" : undefined
                      }
                    >
                      <option value="">اختر الولاية</option>
                      {WILAYAS.map(w => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                    {fieldError("wilaya") && (
                      <p
                        id="wilaya-error"
                        className="mv-help is-error"
                        role="alert"
                      >
                        {fieldError("wilaya")}
                      </p>
                    )}
                  </div>

                  <div className="mv-field">
                    <label htmlFor="commune">البلدية</label>
                    <select
                      id="commune"
                      value={commune}
                      onChange={event => setCommune(event.target.value)}
                      disabled={!wilaya || communes.length === 0}
                      aria-invalid={Boolean(fieldError("commune"))}
                      aria-describedby={
                        fieldError("commune") ? "commune-error" : undefined
                      }
                    >
                      <option value="">
                        {!wilaya
                          ? "اختر الولاية أولاً"
                          : communesStatus === "loading"
                            ? "جارٍ تحميل البلديات…"
                            : communes.length
                              ? "اختر البلدية"
                              : "تعذّر تحميل البلديات"}
                      </option>
                      {communes.map(item => (
                        <option key={item.name} value={item.name}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    {communesStatus === "error" && wilaya && (
                      <button
                        type="button"
                        className="mv-link-button mv-retry"
                        onClick={retryCommunes}
                      >
                        إعادة تحميل البلديات
                      </button>
                    )}
                    {fieldError("commune") && (
                      <p
                        id="commune-error"
                        className="mv-help is-error"
                        role="alert"
                      >
                        {fieldError("commune")}
                      </p>
                    )}
                  </div>
                </div>

                <fieldset className="mv-delivery">
                  <legend>طريقة التوصيل</legend>
                  <label
                    className={deliveryType === "home" ? "is-selected" : ""}
                  >
                    <input
                      type="radio"
                      name="deliveryType"
                      value="home"
                      checked={deliveryType === "home"}
                      onChange={() => setDeliveryType("home")}
                    />
                    <span>إلى المنزل</span>
                  </label>
                  <label
                    className={
                      (deliveryType === "stop_desk" ? "is-selected" : "") +
                      (!stopDeskAvailable ? " is-disabled" : "")
                    }
                  >
                    <input
                      type="radio"
                      name="deliveryType"
                      value="stop_desk"
                      checked={deliveryType === "stop_desk"}
                      disabled={!stopDeskAvailable}
                      onChange={() => setDeliveryType("stop_desk")}
                    />
                    <span>
                      مكتب الشحن
                      <small>
                        {!commune
                          ? "اختر البلدية أولاً"
                          : stopDeskAvailable
                            ? "أرخص عادةً"
                            : "غير متوفر في هذه البلدية"}
                      </small>
                    </span>
                  </label>
                </fieldset>

                <div className="mv-total" aria-live="polite">
                  <div>
                    <span>{selectedBundle?.label || "سعر المنتج"}</span>
                    <span>
                      {compareAtTotal && offerPrice < compareAtTotal && (
                        <s>
                          {money(compareAtTotal)} {product.currency}
                        </s>
                      )}{" "}
                      {money(offerPrice)} {product.currency}
                    </span>
                  </div>
                  <div>
                    <span>التوصيل</span>
                    <span className={isFreeShipping ? "is-free" : ""}>
                      {deliveryText}
                    </span>
                  </div>
                  <div className="mv-total-final">
                    <span>{feeReady ? "المجموع عند الاستلام" : "المجموع"}</span>
                    <strong>
                      {money(total)} {product.currency}
                      {!feeReady && <small> + التوصيل</small>}
                    </strong>
                  </div>
                </div>

                {(formError?.field === "fees" ||
                  formError?.field === "save") && (
                  <div className="mv-alert" role="alert">
                    <p>{formError.message}</p>
                    {formError.field === "fees" && (
                      <button
                        type="button"
                        className="mv-link-button"
                        onClick={retryDeliveryFees}
                      >
                        إعادة المحاولة
                      </button>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className="mv-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner />
                      جاري الإرسال...
                    </>
                  ) : (
                    "اطلب الآن — الدفع عند الاستلام"
                  )}
                </button>
                <p className="mv-reassure">
                  لن تدفع شيئاً الآن. سنتصل بك لتأكيد الطلب قبل الإرسال.
                </p>
              </form>
            </>
          )}
        </section>

        <section className="mv-steps" aria-labelledby="steps-title">
          <h2 id="steps-title">كيف يتم الطلب؟</h2>
          <ol>
            {STEPS.map((step, i) => (
              <li key={i}>
                <span aria-hidden="true">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <ProductSections product={product} />

        {product.reviews && product.reviews.length > 0 && (
          <section className="mv-reviews" aria-labelledby="reviews-title">
            <h2 id="reviews-title">آراء الزبائن</h2>
            <ul>
              {product.reviews.map((review, i) => (
                <li key={i}>
                  <p>{review.text}</p>
                  <footer>
                    <strong>{review.name}</strong>
                    {review.place && <span> — {review.place}</span>}
                  </footer>
                </li>
              ))}
            </ul>
          </section>
        )}

        {faq && faq.length > 0 && (
          <section className="mv-faq" aria-labelledby="faq-title">
            <h2 id="faq-title">أسئلة شائعة</h2>
            {faq.map((item, i) => (
              <details key={i}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </section>
        )}

        <section className="mv-final">
          <p>
            {product.name} — ابتداءً من {money(lowestPrice)} {product.currency}
          </p>
          <a className="mv-hero-cta" href="#order">
            اطلب الآن
          </a>
        </section>
      </main>

      {!submitted && (
        <div
          className={"mv-sticky" + (orderVisible ? "" : " is-visible")}
          aria-hidden={orderVisible}
        >
          <div>
            <strong>
              {money(offerPrice)} {product.currency}
            </strong>
            <span>{selectedBundle?.label}</span>
          </div>
          <a href="#order" tabIndex={orderVisible ? -1 : 0}>
            اطلب الآن
          </a>
        </div>
      )}
    </div>
  );
}
