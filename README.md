# MaisonVerre Flowers V2 · Atlasio Operations

نسخة مستقلة من Source ZIP الخاص بالمشروع. تحتفظ بواجهة الزهور ولوحة Atlasio الأصلية، وتفصل Frontend وBackend وAPI وDatabase. لا يتضمن هذا Repository بيانات العملاء أو مفاتيح الخدمات أو ربط Vercel القديم.

## إضافة منتج من التطبيق

افتح `/admin` وسجّل الدخول، ثم **المنتجات +** أو **المنتجات وصفحات الهبوط** في القائمة. الرابط المباشر `/admin/products`، والرابط القديم `/admin/pages` ما زال يعمل.

1. **إضافة منتج جديد** لإنشاء منتج مستقل، أو **نسخ المنتج** للبدء من منتج موجود.
2. أدخل الاسم وSlug والعروض والصورة والوصف. السعر الأساسي يُستمد من أول عرض. الصور تقبل HTTPS URL أو ملفًا موجودًا داخل `/images/`؛ رفع الملفات إلى خدمة تخزين غير مشمول.
3. **حفظ المسودة**، ثم **معاينة**. المعاينة لا تحفظ طلبات ولا ترسل أحداث Pixel.
4. **نشر المنتج** ثم افتح `/p/your-slug`. تبقى الزهور على `/`.

المسودات لا تغيّر الصفحة المنشورة. يُثبّت الرابط بعد أول حفظ، وتُرفض الروابط المتكررة. لكل منتج Tracking identity مستقلة؛ هوية الزهور الأصلية محمية. تعديلات المنتجات لا تعيد تسعير الطلبات السابقة؛ يُحفظ Product snapshot مع الطلب.

## Code structure

```text
frontend/                 React UI, CSS, images
  src/features/storefront/ Original flower landing template
  src/features/checkout/   Phone capture, drafts, checkout
  src/features/tracking/   Original Pixel initialization/event contract
  src/features/admin/      Original Atlasio dashboard and extra tools
    products/              Product editor state, fields, product model
  src/services/            Browser API client
backend/
  handlers/                Order reads and individual order actions
  services/                Pricing, pages, SSR, shipping synchronization
  integrations/ecotrack/   Transport, inventory, parcels, tracking, actions
  integrations/telegram/   Telegram client
  repositories/            SQL for orders, stock, settings
  auth/                    Signed HttpOnly sessions
  jobs/                    Durable notification worker
api/                       Thin Vercel HTTP entry points
shared/                    Catalog types, order types, shipping status mapping
database/migrations/       Versioned SQL
scripts/                   Development, build, migration and test commands
tests/                     Isolated PostgreSQL-compatible and behavior tests
docs/                      Product, order, architecture and staging guides
```

`frontend` يعرض البيانات؛ قواعد التسعير وحماية الطلبات داخل `backend`. مسارات `api` تستقبل HTTP وتستدعي الخدمات. اتصال Database على الخادم فقط. فصل المجلدات لا يستلزم نشر مشاريع منفصلة.

## Run locally

Node.js 22.6+ وpnpm 10.4.1:

```sh
pnpm install --frozen-lockfile
```

للمعاينة دون أي حساب خارجي:

```sh
pnpm dev:fixture
```

افتح `http://127.0.0.1:5173` و`/admin`. كلمة المرور التجريبية `local-preview-only`. البيانات في الذاكرة وتختفي عند إيقاف API. EcoTrack وTelegram وهميان، وPixel معطل. هذا الوضع مخصص للاختبار المحلي.

لربط نسخة Staging حقيقية، انسخ `.env.example` إلى `.env` وضع قيمًا خاصة بقاعدة V2 والخدمات التجريبية، ثم:

```sh
pnpm db:migrate
pnpm dev
```

لا تشغّل Migration على قاعدة V1 قبل Backup وخطة Cutover. راجع [دليل النشر](docs/deployment.md).

## Validation

```sh
pnpm format:check
pnpm check
pnpm test
pnpm build
pnpm audit --prod --audit-level high
```

تستخدم الاختبارات PGlite مع Migrations الفعلية، وتفرّغ متغيرات الخدمات الحقيقية. يتحقق CI من التنسيق وTypeScript والسلوك وProduction build وDependencies.

## Reliability and performance

- DB write وTelegram outbox في SQL statement واحدة. فشل Telegram لا يلغي الطلب؛ Worker يعيد المحاولة.
- الأسعار محسوبة من Published product على الخادم، مع حماية Lead token ومنع تكرار الطلب أو تخفيض حالته بواسطة Draft متأخر.
- Sync مستقل عن فتح لوحة الإدارة، مع سجل الحالة والخطأ وآخر نجاح. يحتاج Scheduler فعليًا.
- Stock push يحتفظ بعقد الطلب الأصلي. نتيجة إنشاء شحنة غير مؤكدة تُعزل للمطابقة بدل تكرار الإنشاء آليًا.
- SSR/Prerender يعرضان المنتج والاستمارة قبل JavaScript. Dashboard وPDF tools تُحمّل عند الحاجة، مع CSS منفصل وImage preload.

لا يوجد ضمان Zero loss عند تعطل Database بالكامل، أو Exactly once عند انقطاع الشبكة بعد قبول Telegram للرسالة. لا يتضمن الفحص المحلي اعتمادًا لحساب EcoTrack الحقيقي أو قياس PageSpeed على Vercel؛ هذه خطوات Staging.

التفاصيل: [المنتجات](docs/product-landing-pages.md)، [الطلبات](docs/order-workflow.md)، [المعمارية](docs/architecture.md)، [النشر](docs/deployment.md).
