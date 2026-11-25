export type ProductImage = {
  src: string;
  alt: string;
  label: string;
};

export type ProductFeature = {
  name: string;
  emoji: string;
  accent: string;
  details: string;
  area: string;
};

export type ProductBundle = {
  quantity: number;
  price: number;
  label: string;
};

export type ProductFaq = {
  question: string;
  answer: string;
};

/** One step of the planting guide shown below the order form. */
export type ProductGuideStep = {
  title: string;
  text: string;
  image?: string;
};

/** A real customer review entered by the shop owner. Never ship invented reviews. */
export type ProductReview = {
  name: string;
  place: string;
  text: string;
};

export type ProductLandingConfig = {
  slug: string;
  name: string;
  shortName: string;
  headline: string;
  subheadline: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  bundles?: ProductBundle[];
  /** Bundle selected when the page opens; falls back to the first bundle. */
  defaultBundleQuantity?: number;
  freeShippingQuantity?: number;
  sections?: {
    features?: boolean;
    results?: boolean;
    trust?: boolean;
    description?: boolean;
  };
  sectionOrder?: Array<"image" | "features" | "results" | "trust">;
  currency: string;
  images: ProductImage[];
  features: ProductFeature[];
  trustBadges: string[];
  resultEyebrow: string;
  resultTitle: string;
  resultDescription: string;
  faq?: ProductFaq[];
  reviews?: ProductReview[];
  guide?: ProductGuideStep[];
  gift?: {
    enabled: boolean;
    title: string;
    description: string;
    valueLabel: string;
    durationMinutes: number;
  };
  limitedOffer?: {
    enabled: boolean;
    durationMinutes: number;
  };
  tracking: {
    contentId: string;
    campaignName: string;
  };
};

export const PRODUCT_CONFIGS: Record<string, ProductLandingConfig> = {
  "flower-seed-mix": {
    slug: "flower-seed-mix",
    name: "مجموعة بذور الزهور",
    shortName: "بذور الزهور",
    headline: "أطلق الألوان في حديقتك مع 4 أنواع من بذور الزهور",
    subheadline: "زينيا وكوزموس وكوليوس ومارغريت في كيس واحد",
    description:
      "كل كيس يضم أربعة أنواع من بذور الزهور: زينيا، كوزموس، كوليوس ومارغريت. ازرعها في الحديقة أو في الأصص واجمع ألواناً وأشكالاً مختلفة في مكان واحد. التوصيل مجاني عند اختيار 3 أكياس.",
    price: 1900,
    freeShippingQuantity: 3,
    defaultBundleQuantity: 2,
    sections: {
      features: true,
      results: false,
      trust: true,
      description: true,
    },
    bundles: [
      { quantity: 1, price: 1900, label: "كيس واحد" },
      { quantity: 2, price: 2900, label: "كيسان" },
      { quantity: 3, price: 3900, label: "3 أكياس" },
    ],
    currency: "دج",
    images: [
      {
        src: "/images/flower-seed-mix.webp",
        alt: "مجموعة بذور زهور بأربعة أنواع: زينيا وكوزموس وكوليوس ومارغريت، بسعر 1900 دج",
        label: "مجموعة بذور الزهور",
      },
    ],
    features: [
      {
        name: "زينيا",
        emoji: "🌺",
        accent: "bg-pink-100 text-pink-700",
        details: "أزهار كبيرة بألوان زاهية، تحب الشمس وتزهر طوال الصيف",
        area: "ضمن المجموعة",
      },
      {
        name: "كوزموس",
        emoji: "🌸",
        accent: "bg-fuchsia-100 text-fuchsia-700",
        details: "أزهار خفيفة متمايلة، سهلة الزراعة وتتحمل قلة الماء",
        area: "ضمن المجموعة",
      },
      {
        name: "كوليوس",
        emoji: "🍃",
        accent: "bg-red-100 text-red-700",
        details:
          "أوراق ملوّنة بالأحمر الداكن والأخضر، تزيّن الحديقة والأصص طوال الموسم",
        area: "ضمن المجموعة",
      },
      {
        name: "مارغريت",
        emoji: "🌼",
        accent: "bg-yellow-100 text-yellow-700",
        details: "بتلات بيضاء وقلب أصفر، مظهر كلاسيكي للحديقة والأصص",
        area: "ضمن المجموعة",
      },
    ],
    trustBadges: [
      "الدفع عند الاستلام",
      "نتصل بك لتأكيد الطلب",
      "توصيل للمنزل أو مكتب الشحن",
    ],
    resultEyebrow: "مجموعة من أربعة أنواع",
    resultTitle: "أضف ألواناً متنوعة إلى حديقتك",
    resultDescription:
      "زينيا وكوزموس وكوليوس ومارغريت: ألوان وأشكال وأطوال مختلفة تملأ أحواض الحديقة والأصص والشرفات.",
    guide: [
      {
        title: "حضّر التربة",
        text: "املأ أصيصًا أو حوضًا بتربة خفيفة ورطبة قليلًا.",
      },
      {
        title: "ازرع البذور",
        text: "ضع البذور الكبيرة على عمق نصف سنتيمتر تقريبًا، وانثر بذور الكوليوس الصغيرة على السطح مع ضغط خفيف.",
      },
      {
        title: "اسقِ بلطف",
        text: "حافظ على التربة رطبة دون إغراق حتى تظهر البراعم.",
      },
      {
        title: "الشمس والصبر",
        text: "ضع الأصيص في مكان مضيء، وتظهر البراعم عادة خلال أسبوع إلى ثلاثة أسابيع.",
      },
    ],
    faq: [
      {
        question: "متى أزرع البذور؟",
        answer:
          "أفضل وقت هو الربيع وبداية الصيف بعد انتهاء البرد. الزينيا والكوزموس والمارغريت تحب الشمس، والكوليوس يفضّل الضوء غير المباشر أو نصف الظل. يمكن الزراعة في الأصص أو مباشرة في الأرض.",
      },
      {
        question: "كيف أزرعها؟",
        answer:
          "ضع البذور على عمق سنتيمتر تقريباً في تربة خفيفة، واسقها بانتظام دون إغراق حتى تنبت، ثم اتركها في الشمس.",
      },
      {
        question: "هل تنبت كل البذور؟",
        answer:
          "تختلف نسبة الإنبات والإزهار حسب الموسم وجودة التربة والسقي والعناية، لذلك لا يمكن ضمان إنبات كل بذرة.",
      },
      {
        question: "كيف يتم الدفع؟",
        answer: "تدفع نقداً عند استلام الطلب. لا يوجد أي دفع مسبق.",
      },
      {
        question: "متى يصلني الطلب؟",
        answer:
          "نتصل بك لتأكيد الطلب، ثم نرسله إلى منزلك أو إلى مكتب شركة الشحن في ولايتك. تختلف مدة التوصيل حسب الولاية.",
      },
      {
        question: "كم سعر التوصيل؟",
        answer:
          "يظهر سعر التوصيل لولايتك في الاستمارة قبل إرسال الطلب، والتوصيل مجاني عند اختيار 3 أكياس.",
      },
    ],
    tracking: {
      contentId: "maisonverre-flower-seed-mix",
      campaignName: "مجموعة بذور الزهور - 4 أنواع",
    },
  },
};

export const DEFAULT_PRODUCT = PRODUCT_CONFIGS["flower-seed-mix"];

export function getProductConfig(
  slug?: string
): ProductLandingConfig | undefined {
  return slug ? PRODUCT_CONFIGS[slug] : DEFAULT_PRODUCT;
}

export function getProductSlugs(): string[] {
  return Object.keys(PRODUCT_CONFIGS);
}

/** Smaller copies of bundled images, used for responsive `srcset`. */
export const IMAGE_VARIANTS: Record<string, string> = {
  "/images/flower-seed-mix.webp":
    "/images/flower-seed-mix-480.webp 480w, /images/flower-seed-mix-800.webp 800w, /images/flower-seed-mix.webp 1024w",
};

export const IMAGE_SIZES =
  "(min-width: 960px) 480px, (min-width: 600px) 560px, 100vw";
