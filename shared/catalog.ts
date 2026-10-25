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
    subheadline: "زينيا وكوزموس وروز هندي ومارغريت في مجموعة واحدة",
    description:
      "كل مجموعة تضم أربعة أنواع من بذور الزهور الظاهرة في الصورة: زينيا، كوزموس، روز هندي ومارغريت. اختر طلباً واحداً أو باقة من طلبين أو ثلاثة طلبات؛ التوصيل مجاني عند اختيار باقة 3 طلبات. تختلف نتائج الإنبات والإزهار حسب جودة البذور والموسم وظروف الزراعة والعناية.",
    price: 1900,
    freeShippingQuantity: 3,
    bundles: [
      { quantity: 1, price: 1900, label: "طلب واحد" },
      { quantity: 2, price: 2900, label: "طلبان" },
      { quantity: 3, price: 3900, label: "3 طلبات — توصيل مجاني" },
    ],
    currency: "دج",
    images: [
      {
        src: "/images/flower-seed-mix.webp",
        alt: "مجموعة بذور زهور بأربعة أنواع: زينيا وكوزموس وروز هندي ومارغريت، بسعر 1900 دج",
        label: "مجموعة بذور الزهور",
      },
    ],
    features: [
      {
        name: "زينيا",
        emoji: "🌺",
        accent: "bg-pink-100 text-pink-700",
        details: "نوع من بذور الزهور",
        area: "ضمن المجموعة",
      },
      {
        name: "كوزموس",
        emoji: "🌸",
        accent: "bg-fuchsia-100 text-fuchsia-700",
        details: "نوع من بذور الزهور",
        area: "ضمن المجموعة",
      },
      {
        name: "روز هندي",
        emoji: "🌼",
        accent: "bg-orange-100 text-orange-700",
        details: "نوع من بذور الزهور",
        area: "ضمن المجموعة",
      },
      {
        name: "مارغريت",
        emoji: "🌼",
        accent: "bg-yellow-100 text-yellow-700",
        details: "نوع من بذور الزهور",
        area: "ضمن المجموعة",
      },
    ],
    trustBadges: [
      "4 أنواع من الزهور",
      "ابدأ الزراعة اليوم",
      "الدفع عند الاستلام",
    ],
    resultEyebrow: "مجموعة من أربعة أنواع",
    resultTitle: "أضف ألواناً متنوعة إلى حديقتك",
    resultDescription:
      "تضم المجموعة بذور زينيا وكوزموس وروز هندي ومارغريت. تختلف نتائج الإنبات والإزهار بحسب الموسم وجودة البذور وظروف الزراعة والعناية، ولا يمكن ضمان إنبات كل بذرة.",
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
