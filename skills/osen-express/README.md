# Osen Express API Skill

حزمة مرجعية للمطورين ومساعدي AI الذين يربطون المواقع بـ **Osen Express**. تتضمن إرشادات AI، مرجعًا عمليًا، فهرسًا مستخرجًا من OpenAPI الرسمي، وسكربتات مستقلة تعمل بـNode.js 22+ دون مكتبات إضافية.

هذه حزمة مجتمعية وليست منتجًا رسميًا من Osen. مصادر الـAPI نفسها رسمية ومذكورة داخل المرجع. لا تحتوي الحزمة على مفاتيح أو بيانات حساب أو طلبات عملاء.

## الاستخدام مع AI

انسخ مجلد `osen-express` كاملًا إلى مجلد Skills الخاص بالأداة. في Codex يكون المسار الافتراضي `~/.codex/skills/` أو `$CODEX_HOME/skills/` إذا كان مضبوطًا.

```text
Use $osen-express to integrate Osen Express with my store.
Preserve my existing carrier and inspect the current official contract first.
```

مع أدوات AI الأخرى، أعطِ المساعد ملف `SKILL.md` والمراجع المرتبطة به. الملف `agents/openai.yaml` خاص بعرض المهارة في الأدوات المتوافقة، ويمكن تجاهله عند القراءة البشرية.

## الاستخدام للمطورين

ابدأ من [مرجع API](references/api-contract.md)، ثم [ملاحظات التكامل](references/integration-notes.md). الفهرس [contract-index.json](references/contract-index.json) يحتوي العمليات والـSchemas المناسبة لهذا التكامل، مع المصدر والتاريخ والفجوات المعروفة.

تحديث المرجع من المصدر العام، دون مفاتيح:

```sh
node scripts/refresh-contract.mjs
node scripts/refresh-contract.mjs --write
```

فحص الحزمة دون شبكة أو حساب:

```sh
node --test scripts/self-test.mjs
```

فحص حقيقي للقراءة فقط باستخدام ملف أسرار خارج مجلد الحزمة:

```sh
node --env-file=/path/to/private/osen.env scripts/read-only-check.mjs
```

صيغة ملف الأسرار، بقيمك الخاصة:

```dotenv
OSEN_API_TOKEN=
OSEN_MERCHANT_ID=
OSEN_STORE_ID=
```

السكربت يتحقق من المصادقة وتطابق المتجر، ثم يقرأ الولايات وبلديات ولاية واحدة والرسوم وصفحة المخزون الأولى. يعرض أعدادًا فقط. لا ينشئ شحنة أو مفتاحًا أو Webhook ولا يطبع أسرارك.

## English quick start

- AI instructions: `SKILL.md`.
- Developer API reference: `references/api-contract.md`.
- Status, stock and retry guidance: `references/integration-notes.md`.
- Machine-readable public contract subset: `references/contract-index.json`.
- Refresh public documentation: `node scripts/refresh-contract.mjs --write`.
- Offline tests: `node --test scripts/self-test.mjs`.
- Credentialed read-only smoke test: `node --env-file=/path/to/private/osen.env scripts/read-only-check.mjs`.

Use the API family appropriate to the project: Osen's EcoTrack v1 compatibility API and EcoManager v2 have different input formats. Documented endpoints do not imply that all request schemas, webhook signatures or mutation encodings are specified. Read the recorded gaps before writing production operations.

## Sources and sharing

- [Official Swagger](https://backendmain.osenexpress.com/api)
- [Official OpenAPI](https://backendmain.osenexpress.com/api-json)
- [Merchant developer settings](https://osenexpress.com/settings/api)

You may share this folder or its ZIP. Keep private environment files outside it. The authored guide and helper scripts use the MIT license in `LICENSE`; upstream API definitions and trademarks are not relicensed.
