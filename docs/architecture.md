# Architecture

## Frontend

React + TypeScript + Vite. `storefront` يحتفظ بقالب الزهور الأصلي، `checkout` يعزل Phone capture والتسليم، و`tracking` يحتفظ بتوقيت الأحداث وDedupe. Dashboard الأصلي مقسم إلى `model` للحالة والإجراءات و`views` للمكونات، مع نفس HTML/CSS الأساسي. `products` يجمع الحقول وحالة محرر المنتجات دون تكرار قالب Landing Page لكل منتج.

تحميل Dashboard وPage editor وأدوات PDF يتم عبر Dynamic import. CSS الإدارة منفصل عن CSS الزهور. الصورة الأصلية WebP مع Preload وأبعاد ثابتة. Production build يُنتج HTML أوليًا للزهور، و`api/render.ts` يرسم Published config على الخادم للصفحات الديناميكية.

## Backend and APIs

`api/*.ts` واجهات Vercel؛ `backend/dev-server.ts` يشغلها محليًا. `/api/orders` يحتفظ بعنوانه القديم. Handlers تقسم إنشاء وقراءة وإجراءات الطلبات، والخدمات تعزل قواعد المنتج والتسعير وSync وSSR. Clients الخارجية داخل `integrations`؛ HTTP timeouts وRate limits وأخطاء Business واضحة.

`/api/session` يصدر Cookie موقعة، HttpOnly، SameSite=Strict، ثماني ساعات، Secure على Vercel. Dashboard password لا يُحفظ في Browser storage. مفاتيح Telegram وDatabase لا تصل للواجهة. Admin APIs تتطلب الجلسة؛ Scheduler يتطلب `CRON_SECRET`.

## Database

Neon PostgreSQL، SQL parameterized. Migrations مستقلة عن الطلبات؛ لا تُنشأ الجداول أثناء Checkout. `001_baseline.sql` جداول V1 المتوافقة، و`002_platform.sql` يضيف Product snapshots وOutbox وSessions-related budgets وJobs وPages/Revisions وSync metadata. سجّل Migration على قاعدة V2 معزولة أولًا.

- `atlasio_orders`: حالة الطلب، هوية Lead، Snapshot، Tracking ومعلومات المزامنة.
- `atlasio_order_events` و`atlasio_shipment_updates`: أحداث وتاريخ الشركة.
- `atlasio_stock_products`: مخزون محلي مرتبط بحساب الشحن.
- `atlasio_settings`: إعدادات الحسابات وPixel؛ فيها أسرار، لذلك لا تُصدّر محتواها للـRepository.
- `mv_notification_outbox`: Notifications المؤجلة وإعادة المحاولة.
- `mv_landing_pages` و`mv_page_revisions`: Draft وPublished وسجل النشر.
- `mv_jobs` و`mv_provider_sync` و`mv_rate_limits`: تنسيق المهام والحصص المشتركة.

## Boundaries

فصل الملفات لا يعني أن الخدمات الخارجية تعمل دائمًا. Database هي مصدر الحقيقة. حفظ الطلب لا ينتظر Telegram. فشل EcoTrack لا يحذف الطلب. عند Create غامض تبقى نتيجة الشحنة Uncertain وتحتاج Recovery؛ لا يوجد Blind retry ينشئ شحنتين. عند تعطل Database يبقى خطأ الحفظ ظاهرًا للمستخدم، ولا يُعرض نجاح وهمي. المحاكاة المحلية لا تقيس زمن Neon أو EcoTrack الحقيقي.
