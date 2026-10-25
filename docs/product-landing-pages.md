# Products and landing pages

إدارة المنتجات من `/admin/products`، عبر زر **المنتجات +** في لوحة Atlasio أو رابط القائمة على الكمبيوتر والهاتف. `/admin/pages` Alias للتوافق.

المنتج هنا هو Catalog entry مع صفحة هبوط. مخزون الشحن لكل Provider يبقى منفصلًا في **الإعدادات ← رسوم التوصيل وإدارة المخزون المحلي**؛ إضافة منتج للصفحة لا تضيف مخزونًا فعليًا لدى EcoTrack. عند شحن الطلب اختر حساب الشركة وSKU المناسب.

## Lifecycle

- Create: قالب فارغ به Slug وContent ID جديدان. النسخ ينسخ المحتوى والعروض ويولّد هوية مستقلة.
- Save: تحقق على الخادم من النص والصور والأسعار والعروض. Slug محجوز وغير قابل للتغيير بعد الحفظ. Create لا يستبدل منتجًا موجودًا.
- Preview: بيانات Session storage؛ لا Pixel ولا Orders. الشكل هو القالب الأصلي، مع أقسام اختيارية وترتيب صور اختياري.
- Publish: ينشر المسودة المحفوظة ويحفظ Revision. الزر يتعطل أثناء تعديلات غير محفوظة. يتأكد SQL أن المسودة لم تتغير من تبويب آخر قبل النشر.
- Restore: يُعيد Revision إلى المسودة للمراجعة؛ النشر خطوة مستقلة.

روابط الصور: HTTPS أو `/images/filename`. لا يوجد Object storage/File upload في هذه النسخة. لا يُقبل JavaScript أو HTML مخصص. يستدعي Public API النسخة المنشورة فقط؛ Draft منتج جديد يرجع 404 للعامة.

## Preserved contracts

- الزهور دائمًا على `/`، والمنتجات الأخرى `/p/:slug`.
- Tracking Content ID وCampaign للزهور محميان بالخادم.
- أحداث Lead وInitiateCheckout وPurchase وتوقيتها تبقى ضمن Checkout hook الأصلي، مع Dedupe مستقل لكل منتج.
- السعر الأساسي يساوي سعر العرض الأول. لكل عرض Quantity واحدة غير مكررة وسعر إجمالي صحيح. Backend يتجاهل السعر المرسل من المتصفح ويستخدم العرض المنشور.
- Order snapshot يحتفظ بالاسم والعروض والهوية وقت إنشاء الطلب؛ تعديل الصفحة لا يغيّر الطلب السابق أو الشحنة.

Frontend: `products/product-model.ts` للقالب والروابط، `useProductEditor.ts` للحالة وحفظ المسودات، `ProductFields.tsx` للحقول، و`PageEditor.tsx` للقائمة والصفحة. API: `api/pages.ts`، والتحقق في `backend/services/pages.ts`. التخزين: `mv_landing_pages` و`mv_page_revisions`.
