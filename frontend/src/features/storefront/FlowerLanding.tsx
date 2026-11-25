import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_PRODUCT,
  type ProductBundle,
  type ProductLandingConfig,
} from "@shared/catalog";
import { WILAYAS } from "@shared/locations";
import type { StorefrontConfig } from "@shared/storefront";
import {
  formatPhone,
  phoneOperator,
  useCheckout,
} from "../checkout/useCheckout";
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

/** "4 أكياس", "8 أكياس", "12 كيسًا": Arabic counting for the bag count. */
const bagsText = (count: number) =>
  count === 1
    ? "كيس واحد"
    : count === 2
      ? "كيسان"
      : count <= 10
        ? `${count} أكياس`
        : `${count} كيسًا`;

const GUIDE_ICONS = ["🪴", "🌱", "💧", "☀️"];

const STEPS: Array<[string, string]> = [
  ["📝", "اطلب"],
  ["📞", "نتصل بك"],
  ["🚚", "نوصّل"],
  ["💵", "ادفع"],
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
    phoneValid,
    phoneDigitsLeft,
    setPhoneTouched,
    wilayaFees,
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
  const bags = product.bagsPerPack || 0;
  // The next bigger offer, suggested with its real extra cost.
  const upgrade = bundles
    .filter(b => b.quantity > (selectedBundle?.quantity || 0))
    .sort((a, b) => a.quantity - b.quantity)[0];
  const guide =
    product.guide ??
    (product.slug === DEFAULT_PRODUCT.slug ? DEFAULT_PRODUCT.guide : undefined);
  const faq =
    product.faq ??
    (product.slug === DEFAULT_PRODUCT.slug ? DEFAULT_PRODUCT.faq : undefined);
  const feeReady =
    isFreeShipping || (deliveryFeesStatus === "ready" && hasDeliveryFee);
  const total = offerPrice + (feeReady ? deliveryFee : 0);
  const fieldError = (field: string) =>
    formError?.field === field ? formError.message : "";

  // Sticky button: only when neither the hero button nor the form is visible.
  const orderRef = useRef<HTMLElement | null>(null);
  const heroCtaRef = useRef<HTMLAnchorElement | null>(null);
  const [orderVisible, setOrderVisible] = useState(true);
  const [heroCtaVisible, setHeroCtaVisible] = useState(true);
  const finalRef = useRef<HTMLElement | null>(null);
  const [finalVisible, setFinalVisible] = useState(false);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const watch = (
      target: Element | null,
      onChange: (visible: boolean) => void
    ) => {
      if (!target) return undefined;
      const observer = new IntersectionObserver(
        ([entry]) => onChange(entry.isIntersecting),
        { rootMargin: "0px 0px -15% 0px" }
      );
      observer.observe(target);
      return observer;
    };
    const observers = [
      watch(orderRef.current, setOrderVisible),
      watch(heroCtaRef.current, setHeroCtaVisible),
      watch(finalRef.current, setFinalVisible),
    ];
    return () => observers.forEach(observer => observer?.disconnect());
  }, []);
  const stickyHidden = orderVisible || heroCtaVisible || finalVisible;

  // Once the phone is complete, guide to the name; after a wilaya, to the commune.
  const nameRef = useRef<HTMLInputElement | null>(null);
  const communeRef = useRef<HTMLSelectElement | null>(null);
  const wasValid = useRef(false);
  useEffect(() => {
    if (
      phoneValid &&
      !wasValid.current &&
      document.activeElement?.id === "phone"
    )
      nameRef.current?.focus();
    wasValid.current = phoneValid;
  }, [phoneValid]);
  useEffect(() => {
    if (communesStatus === "ready" && document.activeElement?.id === "wilaya")
      communeRef.current?.focus();
  }, [communesStatus]);
  const step = !phoneValid ? 1 : !wilaya || !commune ? 2 : 3;
  const stopDeskSaving =
    wilayaFees && wilayaFees.home > wilayaFees.stopDesk
      ? wilayaFees.home - wilayaFees.stopDesk
      : 0;

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
        {(showTrust && product.trustBadges.length
          ? product.trustBadges
          : ["الدفع عند الاستلام", "توصيل للمنزل أو المكتب"]
        )
          .slice(0, 2)
          .map((badge, i) => (
            <span key={i}>
              <CheckIcon />
              {badge}
            </span>
          ))}
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
            <a className="mv-hero-cta" href="#order" ref={heroCtaRef}>
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
                <h2 id="order-title">اختر عرضك وأكمل طلبك</h2>
                <ol className="mv-progress" aria-label="خطوات الطلب">
                  {["اختر العرض", "بياناتك", "التأكيد"].map((label, i) => (
                    <li
                      key={label}
                      className={
                        i + 1 < step ? "done" : i + 1 === step ? "current" : ""
                      }
                    >
                      <span>{i + 1}</span>
                      {label}
                    </li>
                  ))}
                </ol>
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
                        {bags > 0 && (
                          <span className="mv-offer-bags">
                            {bagsText(bundle.quantity * bags)}
                          </span>
                        )}
                        {savings > 0 && (
                          <s className="mv-offer-was num">
                            {money(bundle.price + savings)}
                          </s>
                        )}
                        <span className="mv-offer-price">
                          {money(bundle.price)}{" "}
                          <small>{product.currency}</small>
                        </span>
                        <span className="mv-offer-note">
                          {savings > 0
                            ? `وفّر ${money(savings)} ${product.currency}`
                            : free
                              ? "توصيل مجاني"
                              : " "}
                        </span>
                        {free && savings > 0 && (
                          <span className="mv-offer-free">+ توصيل مجاني</span>
                        )}
                        {bags > 0 && (
                          <span className="mv-offer-unit num">
                            {money(
                              Math.round(
                                bundle.price / (bundle.quantity * bags)
                              )
                            )}{" "}
                            {product.currency} للكيس
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {upgrade && (
                <button
                  type="button"
                  className="mv-upsell"
                  onClick={() => setSelectedBundleQuantity(upgrade.quantity)}
                >
                  <span className="mv-upsell-plus num">
                    +{money(upgrade.price - offerPrice)} {product.currency}
                  </span>
                  <span>
                    {upgrade.quantity === product.freeShippingQuantity
                      ? `أضف علبة واحصل على ${bags ? bagsText(upgrade.quantity * bags) : upgrade.label} مع توصيل مجاني`
                      : `أضف علبة واحصل على ${bags ? bagsText(upgrade.quantity * bags) : upgrade.label}`}
                  </span>
                </button>
              )}

              <form
                id="lead-form"
                onSubmit={handleSubmit}
                onFocus={trackInitiateCheckout}
                className="mv-form"
                noValidate
              >
                <div className="mv-field mv-phone-field">
                  <label htmlFor="phone">رقم هاتفك</label>
                  <div
                    className={
                      "mv-phone" +
                      (phoneValid ? " is-valid" : "") +
                      (phoneError || fieldError("phone") ? " is-error" : "")
                    }
                  >
                    <input
                      ref={phoneInputRef}
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={formatPhone(phone)}
                      onChange={e => setPhone(e.target.value)}
                      onBlur={() => setPhoneTouched(true)}
                      required
                      maxLength={17}
                      placeholder="0555 12 34 56"
                      dir="ltr"
                      aria-invalid={Boolean(phoneError || fieldError("phone"))}
                      aria-describedby="phone-help"
                    />
                    {phoneValid && (
                      <span className="mv-phone-ok">
                        <CheckIcon />
                        {phoneOperator(phone)}
                      </span>
                    )}
                  </div>
                  <p
                    id="phone-help"
                    className={
                      "mv-help" +
                      (phoneError || fieldError("phone") ? " is-error" : "") +
                      (phoneValid ? " is-ok" : "")
                    }
                    role={fieldError("phone") ? "alert" : undefined}
                  >
                    {fieldError("phone") ||
                      phoneError ||
                      (phoneValid
                        ? "رقم صحيح — نتصل بك عليه لتأكيد الطلب"
                        : phone && phoneDigitsLeft > 0
                          ? `باقي ${phoneDigitsLeft} أرقام`
                          : "نتصل بك مرة واحدة لتأكيد الطلب فقط")}
                  </p>
                </div>

                <div className="mv-field">
                  <label htmlFor="fullName">الاسم واللقب</label>
                  <input
                    ref={nameRef}
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="مثال: محمد بن علي"
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
                      ref={communeRef}
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
                    <span>
                      إلى باب المنزل
                      <small>يصلك الطلب إلى بيتك</small>
                    </span>
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
                      من مكتب شركة التوصيل
                      <small>
                        {!commune
                          ? "اختر البلدية أولاً"
                          : !stopDeskAvailable
                            ? "غير متوفر في هذه البلدية"
                            : stopDeskSaving > 0 && !isFreeShipping
                              ? `وفّر ${money(stopDeskSaving)} ${product.currency}`
                              : "تستلمه من المكتب القريب منك"}
                      </small>
                    </span>
                  </label>
                </fieldset>

                <div className="mv-summary-card" aria-live="polite">
                  <p>
                    <span>
                      {selectedBundle?.label || product.name}
                      {bags > 0 && selectedBundle
                        ? ` (${bagsText(selectedBundle.quantity * bags)})`
                        : ""}
                    </span>
                    {" · "}
                    {compareAtTotal && offerPrice < compareAtTotal && (
                      <s className="num">{money(compareAtTotal)}</s>
                    )}{" "}
                    <span className="num">
                      {money(offerPrice)} {product.currency}
                    </span>
                    {" + التوصيل "}
                    <span className={isFreeShipping ? "is-free" : "num"}>
                      {deliveryText}
                    </span>
                  </p>
                  <strong>
                    {feeReady ? "تدفع عند الاستلام: " : "المجموع: "}
                    <span className="num">
                      {money(total)} {product.currency}
                    </span>
                    {!feeReady && <small> + التوصيل</small>}
                  </strong>
                  {wilaya && commune && (
                    <p className="mv-summary-place">
                      {deliveryType === "stop_desk"
                        ? "استلام من مكتب التوصيل"
                        : "توصيل إلى المنزل"}{" "}
                      · {commune}، {wilaya.replace(/^\d+\s*-\s*/, "")}
                    </p>
                  )}
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
                    "أكّد طلبي — الدفع عند الاستلام"
                  )}
                </button>
                <p className="mv-reassure">
                  لن تدفع شيئًا الآن · سنتصل بك قبل الإرسال
                </p>
              </form>
            </>
          )}
        </section>

        <section className="mv-steps" aria-label="كيف يتم الطلب">
          <ol>
            {STEPS.map(([icon, label], i) => (
              <li key={i}>
                <span aria-hidden="true">{icon}</span>
                {label}
              </li>
            ))}
          </ol>
        </section>

        {guide && guide.length > 0 && (
          <section className="mv-guide" aria-labelledby="guide-title">
            <h2 id="guide-title">خطوات الزراعة</h2>
            <p className="mv-guide-sub">
              أفضل وقت للزراعة: الربيع وبداية الصيف
            </p>
            {guide.some(item => item.image) && (
              <div className="mv-guide-photos">
                {guide
                  .filter(item => item.image)
                  .slice(0, 2)
                  .map(item => (
                    <figure key={item.image}>
                      <img
                        src={item.image}
                        alt={item.title}
                        width={550}
                        height={550}
                        loading="lazy"
                        decoding="async"
                      />
                      <figcaption>{item.title}</figcaption>
                    </figure>
                  ))}
              </div>
            )}
            <div className="mv-guide-steps">
              {guide.map((item, i) => (
                <details key={i} open={i === 0}>
                  <summary>
                    <span className="mv-guide-icon" aria-hidden="true">
                      {GUIDE_ICONS[i % GUIDE_ICONS.length]}
                    </span>
                    <strong>
                      <span className="num">{i + 1}.</span> {item.title}
                    </strong>
                  </summary>
                  {item.text && <p>{item.text}</p>}
                </details>
              ))}
            </div>
            <a className="mv-guide-cta" href="#order">
              جاهز للزراعة؟ اطلب بذورك الآن
            </a>
          </section>
        )}

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

        <section className="mv-final" ref={finalRef}>
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
          className={"mv-sticky" + (stickyHidden ? "" : " is-visible")}
          aria-hidden={stickyHidden}
        >
          <div>
            <strong>
              {money(offerPrice)} {product.currency}
            </strong>
            <span>{selectedBundle?.label}</span>
          </div>
          <a href="#order" tabIndex={stickyHidden ? -1 : 0}>
            اطلب الآن
          </a>
        </div>
      )}
    </div>
  );
}
