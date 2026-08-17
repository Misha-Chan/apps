# Apps

نطاق مستقل (`apps.hostaka.fun`) يخدّم متجر التطبيقات من هوستاكا — تصفح
التطبيقات المعتمدة، تحميلها، تقييمها، ونشر تطبيقات جديدة — كمنتج فرعي
منفصل بمستودعه الخاص وسيرفره الخاص، بنفس نمط `orbithub`/`aethercast`/
`console` بالضبط.

## البنية

سيرفر **Express حقيقي** (`server.js`) — نفس نمط المشروع الرئيسي:

```
apps/
├── server.js              ← السيرفر (static + بروكسي /api + حقن OG)
├── package.json
├── vercel.json             ← نفس نمط builds/routes حق المشروع الرئيسي
├── .env.example
└── public/
    ├── index.html / store.js / store.css        ← صفحة تصفح المتجر (/)
    ├── app.html / app-detail.js / app-detail.css ← صفحة تطبيق فردي (/app?id=TOKEN)
    ├── submit.html / submit.js / submit.css      ← صفحة نشر تطبيق (/submit)
    ├── common.js                                 ← إعدادات مشتركة (oauth/ثيم/لغة/api) بين الصفحات الثلاث
    ├── theme.css / shared.css / shared.js
    ├── emoji.css / emoji.js / emoji-catalog.json
    ├── i18n.js / modal.js / protect.js
    ├── translations/ar.json / en.json
    └── apps-icon.png                             ← أيقونة placeholder (لا يوجد شعار مخصص بعد)
```

كل منطق المصادقة وقاعدة البيانات يبقى بالكامل على السيرفر الرئيسي
(`hostaka.fun`). هذا السيرفر بس واجهة + بروكسي شفاف لـ `/api/*` تجاهه.

## كيف يشتغل البروكسي

أي طلب لـ `/api/*` على `apps.hostaka.fun` يوصل لـ `server.js`، اللي
يعيد إرساله (نفس الميثود، الهيدرز، الـ body) لـ `https://hostaka.fun/api/*`
عبر `node-fetch`، ويرجّع الرد كما هو للعميل. بما إن المتصفح يتعامل مع
هذا كطلب لنفس المصدر (apps.hostaka.fun)، **ما فيه مشكلة CORS إطلاقاً
ولا أي تعديل مطلوب على السيرفر الرئيسي لهذا الجزء بالذات**.

نقاط الـ API الجديدة (عامة + إدارية) تعيش بالكامل على `hostaka-main`:

| المسار | الوصف |
|---|---|
| `GET /api/apps` | قائمة التطبيقات المعتمدة (المتجر العام) |
| `GET /api/apps/:token` | تفاصيل تطبيق (المعتمد لأي زائر، وغير المعتمد لصاحبه/الإدارة فقط) |
| `POST /api/apps` | نشر تطبيق جديد (حالة `pending`) — يتطلب تسجيل دخول |
| `POST /api/apps/:token/download` | تسجيل تحميل + إرجاع رابط التحميل |
| `GET /api/apps/:token/reviews` | قائمة التقييمات |
| `POST /api/apps/:token/reviews` | إضافة/تعديل تقييمك (نجوم + تعليق) — يتطلب تسجيل دخول |
| `GET /api/admin/apps` | كل التطبيقات لأي حالة (لوحة المراجعة بـ console) |
| `PUT /api/admin/apps/:id` | موافقة / رفض / ضبط تحذير |
| `DELETE /api/admin/apps/:id` | حذف نهائي (مدراء فقط) |

الصور (أيقونة التطبيق + لقطات الشاشة) تُرفع عبر `/api/upload` الموجود
أصلاً بالسيرفر الرئيسي (base64 → imgbb)، بنفس الطريقة المستخدمة بباقي
المنصة — ما فيه أي endpoint رفع جديد.

## حقن Open Graph لصفحة التطبيق الفردية

لما حد يشارك رابط `/app?id=TOKEN`، `server.js` يجيب بيانات التطبيق
من `GET /api/apps/:token` على السيرفر الرئيسي **قبل** ما يرسل الصفحة،
ويحقن اسم التطبيق ووصفه وأيقونته كوسوم `<meta>` بالـ `<head>` — عشان
بوتات واتساب/تويتر/ديسكورد (اللي ما تنفّذ جافاسكريبت) تشوف معاينة
صحيحة. نفس الفكرة مطبّقة على `/apps` و`/apps/submit` و`/app/:token`
بالمشروع الرئيسي (صفحات تحويل خفيفة تحمل نفس وسوم OG قبل التحويل
لهذا النطاق).

## اختبار محلي

```bash
npm install
cp .env.example .env   # اختياري، القيمة الافتراضية تكفي
npm start
# افتح http://localhost:3000
```

## النشر على Vercel

1. مشروع Vercel جديد من هذا المستودع (منفصل عن مشروع hostaka.fun).
2. Vercel بيكتشف `vercel.json` تلقائياً (نفس نمط `@vercel/node` المستخدم
   بالمشروع الرئيسي بالضبط).
3. من Settings → Domains: أضف `apps.hostaka.fun`.
4. من DNS حق `hostaka.fun`: أضف سجل `CNAME` باسم `apps` يشاور على
   القيمة اللي يعطيك ياها Vercel بصفحة الـ Domain (عادة
   `cname.vercel-dns.com`).

## متغيرات البيئة على Vercel

| المتغير | مطلوب؟ | القيمة |
|---|---|---|
| `HOSTAKA_API_BASE` | ❌ اختياري | `https://hostaka.fun` (هذي القيمة الافتراضية بالكود أصلاً لو ما ضبطته) |

هذا كل شي. ما فيه قاعدة بيانات ولا JWT secret ولا مفاتيح API هنا —
كلها تبقى على المشروع الرئيسي فقط.

## آلية تمرير تسجيل الدخول بين النطاقين

`localStorage` **ما ينشارك تلقائياً** بين `hostaka.fun` و
`apps.hostaka.fun`. الحل الأساسي هو **oauth.hostaka.fun** (وسيط تحقق
مركزي): عند تحميل `common.js`، لو ما فيه توكن محلي، الصفحة تسأل بصمت
`https://oauth.hostaka.fun/api/token` (`credentials:'include'`). لو
رجع توكن، يتخزّن محلياً هنا تلقائياً — المستخدم يبان مسجّل دخول من غير
ما يسوي أي شي.

**لا حاجة لأي تعديل على `oauth`** — الـ CORS بمستودع `oauth-main` أصلاً
معرّف بـ regex عام (`^https:\/\/([a-z0-9-]+\.)?hostaka\.fun$`) يقبل أي
نطاق فرعي تحت `hostaka.fun`، بما فيه `apps.hostaka.fun`، بدون أي تغيير
بالكود.

**الحل الاحتياطي (fallback):** لو oauth ما رجع شي، تبقى آلية تمرير
التوكن بالرابط تشتغل — مسارات `/apps`، `/apps/submit`، `/app/:token`
بالمشروع الرئيسي تحوّل المستخدم لهذا النطاق مع `?token=...` (مع الحفاظ
على أي query string كانت موجودة)، و`common.js` هنا يقرأه ويخزّنه محلياً
ثم يمسحه فوراً من شريط العنوان.

## لوحة المراجعة (console)

مراجعة التطبيقات المُرسَلة (موافقة/رفض/تحذير/حذف) تصير من
`console.hostaka.fun` — تبويب "Apps" جديد بالسايدبار (بنفس صلاحيات
مراجعة المنشورات: مشرف أو أدمن)، مو من هذا المستودع.

## الشعار

لا يوجد شعار مخصص بعد — `apps-icon.png` أيقونة placeholder مولّدة
(نفس أسلوب أيقونة console placeholder)، بتدرّج ألوان الهوية
(`--avatar-gradient`). تستبدل لاحقاً بشعار حقيقي بنفس الاسم.
