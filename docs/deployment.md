# Staging and deployment

لا تربط Repository الجديد تلقائيًا بمشروع Vercel القديم. النشر والتحويل إلى Production خطوة منفصلة عن Push إلى GitHub.

## Isolated setup

1. أنشئ Vercel project جديدًا وقاعدة Neon أوBranch معزولًا لـV2. خذ Backup من V1 قبل أي Data migration.
2. Node 22.6+ وpnpm 10.4.1. ضع `DATABASE_URL`, `DASHBOARD_PASSWORD`, `SESSION_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `CRON_SECRET` في Environment الخاصة بـStaging. لا تُرفع القيم إلى Git.
3. شغّل `pnpm db:migrate` على قاعدة V2 المعزولة، ثم Build. إعدادات التطبيق تحتوي Provider/Pixel؛ لا تُدخل Production Pixel في معاينة الاختبارات.
4. اضبط EcoTrack التجريبي وTelegram اختبار من إعدادات الإدارة، وتحقق من API permissions قبل تشغيل أوامر الشحن.
5. خطة Vercel Hobby تسمح بـCron واحد يوميًا فقط. لذلك يضبط `vercel.json` مسار `/api/jobs` يوميًا عند 03:00 UTC كي ينجح النشر. زر **مزامنة الحالات الآن** في الإدارة يبقى متاحًا دائمًا للمشغّل.

   لتحديث حالات الشحن وTelegram كل عدة دقائق، استخدم Scheduler خارجيًا يرسل `GET` إلى `/api/jobs` مع `Authorization: Bearer <CRON_SECRET>`، أو رقِّ مشروع Vercel إلى Pro ثم بدّل الجدول إلى `*/5 * * * *`. لا تضف `CRON_SECRET` إلى رابط عام أو إلى Git.

## Acceptance checks before cutover

- افتح الزهور على الهاتف والكمبيوتر وقارن تصميمها بالأصل.
- تحقق عبر Meta Test Events من PageView/ViewContent/Lead/InitiateCheckout/Purchase وDedupe؛ لا تُطلق طلبات اختبار في حملة حقيقية.
- اختبر Partial phone ثمComplete، وRefresh/Double submit، وانقطاع اتصال العميل وفشل Telegram.
- أضف منتجًا جديدًا، Save/Preview/Publish/Restore، واختبر أن Draft غير ظاهر للعامة وأن تعديل السعر لا يغير الطلب السابق.
- Stock push باستخدام Quantity وSKU وحساب الشركة الصحيح. اختبر رفضًا واضحًا وTimeout ومطابقة Recovery، دون إعادة إنشاء غير مؤكدة.
- راقب انتقال حالات الشحن من الشركة إلى Dashboard مع Scheduler والواجهة مغلقة، والتزم بحدود API وصلاحيات حسابك.
- اختبر الرسوم والبلديات وPDF والإرجاع والإلغاء على بيانات مسموح بها في الحساب التجريبي.
- قِس PageSpeed/Core Web Vitals على رابط Staging الحقيقي وشبكة هاتف؛ زمن Localhost لا يمثل Vercel أو Neon.

## Cutover and rollback

احتفظ بمشروع V1 وDatabase دون تغيير. راجع استيراد البيانات، بما فيها تتبع الشحنات وProvider IDs وإعدادات Pixel وقيود Lead القديمة التي لا تملك Token. لا تعرّض بيانات العملاء أو Bot tokens في الملفات أو Screenshots. غيّر Domain/Traffic بعد اعتماد Staging، مع إمكانية إعادته إلى V1. لا تخلط قاعدة V2 الاختبارية ببيانات الطلبات الحقيقية.

## Validation scope

الاختبارات المحلية تستخدم PGlite وتشغّل Migrations وSQL الفعليين. تشمل حماية الطلبات، Outbox، أسعار المنتجات، نشر المسودات وConflict، Status mapping، Stock pagination/push contract، Sessions،SSR وPixel timing. هي لا تثبت صلاحيات حساب EcoTrack الحقيقي أو سلوك الشبكة على Vercel. لم تُنفّذ Migrations أو Deploy على V1 ضمن تجهيز هذا Repository.
