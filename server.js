// ============================================================
//  apps — سيرفر مستقل يخدّم تطبيقات هوستاكا (Hostaka Apps) — apps.hostaka.fun
//  كل منطق المصادقة/قاعدة البيانات يبقى على السيرفر الرئيسي (hostaka.fun)؛
//  هذا السيرفر واجهة + بروكسي شفاف لـ /api/* تجاهه، بنفس أسلوب
//  orbithub/aethercast/console بالضبط.
// ============================================================
const express = require('express');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

const app = express();

// النطاق الرئيسي لهوستاكا (وين تعيش فعلياً كل الـ API + قاعدة البيانات)
const HOSTAKA_API_BASE = process.env.HOSTAKA_API_BASE || 'https://hostaka.fun';

app.disable('x-powered-by');
// نثق بوكيل واحد فقط (بروكسي Vercel) قبل الطلب، بدل `true` اللي يثق بأي
// X-Forwarded-For ويسمح بتزوير req.ip — نفس نمط aethercast/orbithub.
app.set('trust proxy', 1);

// رؤوس أمان أساسية على كل الردود (كانت غائبة).
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  next();
});

// ============================================================
// بروكسي /api/* — نفس أسلوب orbithub/aethercast بالضبط
// ============================================================
app.use('/api', express.raw({ type: '*/*', limit: '10mb' }), async (req, res) => {
  try {
    const targetUrl = HOSTAKA_API_BASE + '/api' + req.url;

    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (['host', 'connection', 'content-length', 'accept-encoding'].includes(key.toLowerCase())) continue;
      headers[key] = value;
    }

    const hasBody = req.body && Buffer.isBuffer(req.body) && req.body.length > 0;
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: hasBody ? req.body : undefined,
      redirect: 'manual'
    });

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) return;
      res.setHeader(key, value);
    });

    const buf = await upstream.buffer();
    res.send(buf);
  } catch (e) {
    console.error('❌ apps proxy error:', e);
    res.status(502).json({ error: 'تعذر الاتصال بخادم هوستاكا الرئيسي' });
  }
});

// ============================================================
// وسوم Open Graph — لما حد يشارك رابط تطبيق، نحقن عنوان ووصف
// وأيقونة صحيحة بـ <head> قبل ما نرسل الصفحة، عشان بوتات
// واتساب/تويتر/ديسكورد (اللي ما تنفّذ جافاسكريبت) تشوف معاينة صحيحة.
// ============================================================
const SITE_NAME    = 'Hostaka Apps';
const DEFAULT_DESC = 'Hostaka Apps — تصفح ونزّل تطبيقات المجتمع، أو انشر تطبيقك.';
const DEFAULT_IMG  = '/apps-icon.png';

function ogEscape(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function ogTruncate(str, len = 160) {
  const s = String(str || '').replace(/<[^>]*>/g, '').trim();
  return s.length > len ? s.slice(0, len - 1) + '…' : s;
}
function absUrl(req, p) {
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p; // أصلاً رابط مطلق (Cloudinary/imgbb غالباً)
  // مسار نسبي: يعني مستضاف على السيرفر الرئيسي، مو على apps (مثال: أيقونات
  // التطبيقات المرفوعة عبر /api/upload، اللي تُخزَّن وتُخدَّم من hostaka.fun)
  return HOSTAKA_API_BASE + (p.startsWith('/') ? p : '/' + p);
}
// عكس absUrl: لملفات ثابتة تعيش بهذا المستودع نفسه (apps.hostaka.fun)،
// مثل apps-icon.png — لازم تتحلّ لنفس نطاق الطلب الحالي، مو hostaka.fun
function selfUrl(req, p) {
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  return `https://${req.get('host')}${p.startsWith('/') ? p : '/' + p}`;
}

function injectOG(html, meta) {
  const title = ogEscape(meta.title || SITE_NAME);
  const desc  = ogEscape(meta.description || DEFAULT_DESC);
  const image = ogEscape(meta.image || ''); // كل الاستدعاءات بهذا الملف تمرّر meta.image صريح دائماً
  const url   = ogEscape(meta.url || '');
  const type  = meta.type || 'website';
  const robots = meta.robots || 'index, follow';

  let tags = `<meta name="robots" content="${robots}">\n`;
  tags += `  <meta property="og:site_name" content="${SITE_NAME}">\n`;
  tags += `  <meta property="og:title" content="${title}">\n`;
  tags += `  <meta property="og:description" content="${desc}">\n`;
  tags += `  <meta property="og:image" content="${image}">\n`;
  tags += `  <meta property="og:type" content="${type}">\n`;
  if (url) tags += `  <meta property="og:url" content="${url}">\n`;
  tags += `  <meta name="twitter:card" content="summary_large_image">\n`;
  tags += `  <meta name="twitter:title" content="${title}">\n`;
  tags += `  <meta name="twitter:description" content="${desc}">\n`;
  tags += `  <meta name="twitter:image" content="${image}">\n`;
  tags += `  <script src="/ecosystem-switcher.js" defer></script>\n`;

  if (/<title>[\s\S]*?<\/title>/.test(html)) {
    return html.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>\n  ${tags}`);
  }
  return html.replace('</head>', `  ${tags}</head>`);
}

function requestUrl(req) {
  return `https://${req.get('host')}${req.originalUrl}`;
}

// صفحة تطبيق فردية (/app?id=TOKEN) — نجيب بيانات التطبيق من الـ API
// العام على السيرفر الرئيسي عشان نحقن معاينة صحيحة (اسم + وصف + أيقونة)
app.get('/app', async (req, res) => {
  const meta = {
    title: SITE_NAME,
    description: DEFAULT_DESC,
    image: selfUrl(req, DEFAULT_IMG),
    url: requestUrl(req),
    type: 'website'
  };

  const token = (req.query.id || '').trim();
  if (token) {
    try {
      const r = await fetch(`${HOSTAKA_API_BASE}/api/apps/${encodeURIComponent(token)}`);
      if (r.ok) {
        const appData = await r.json();
        if (appData && !appData.error) {
          meta.title = `${appData.name} · ${SITE_NAME}`;
          meta.description = ogTruncate(appData.description) || DEFAULT_DESC;
          if (appData.icon) meta.image = absUrl(req, appData.icon);
          else meta.image = `${HOSTAKA_API_BASE}/api/og-image?type=app&brand=apps&token=${encodeURIComponent(token)}`;
        }
      }
    } catch (e) {
      console.error('⚠️ apps OG lookup failed for token=' + token + ':', e.message);
      // نستمر بالميتاداتا الافتراضية عند أي خطأ — لا نكسر الصفحة بسبب هذا
    }
  }

  const html = fs.readFileSync(path.join(__dirname, 'public', 'app.html'), 'utf-8');
  res.set('Content-Type', 'text/html; charset=utf-8').send(injectOG(html, meta));
});

// الصفحة الرئيسية (Hostaka Apps) — ميتاداتا ثابتة، بس نحقنها بنفس الطريقة
// عشان يكون فيه og:url صحيح ديناميكياً
app.get('/', (req, res) => {
  const meta = {
    title: SITE_NAME,
    description: DEFAULT_DESC,
    image: selfUrl(req, DEFAULT_IMG),
    url: requestUrl(req),
    type: 'website'
  };
  const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf-8');
  res.set('Content-Type', 'text/html; charset=utf-8').send(injectOG(html, meta));
});

// صفحة نشر تطبيق — خاصة (تتطلب تسجيل دخول)، بدون فهرسة، بنفس نمط
// sendPrivate المستخدم بـ console/orbithub بالضبط
function sendPrivate(res, fileName) {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.sendFile(path.join(__dirname, 'public', fileName));
}
app.get('/submit', (req, res) => sendPrivate(res, 'submit.html'));

// ============================================================
// ملفات ثابتة (store.js/css، app-detail.js/css، submit.js/css، الحزم المشتركة...)
// ============================================================
app.use(express.static(path.join(__dirname, 'public')));

app.get('/robots.txt', (req, res) => {
  const origin = `https://${req.get('host')}`;
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /submit\n\nSitemap: ${origin}/sitemap.xml\n`);
});

// ============================================================
// sitemap.xml — Hostaka Apps (apps.hostaka.fun), part of the Hostaka
// Ecosystem. Hostaka's app store — browse and download community apps.
// Dynamically generated from the main Hostaka API (every approved app),
// same pattern used by hostaka.fun/sitemap.xml, so Google can discover
// and index this subdomain's content directly instead of waiting on
// random crawling.
// ============================================================
app.get('/sitemap.xml', async (req, res) => {
  try {
    const origin = `https://${req.get('host')}`;
    const urls = [];
    const addUrl = (loc, lastmod, priority) => {
      urls.push(`  <url><loc>${ogEscape(loc)}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ''}<priority>${priority}</priority></url>`);
    };

    addUrl(`${origin}/`, null, '1.0');

    try {
      const r = await fetch(`${HOSTAKA_API_BASE}/api/apps`);
      if (r.ok) {
        const apps = await r.json();
        for (const a of apps) {
          if (a.token) addUrl(`${origin}/app?id=${encodeURIComponent(a.token)}`, a.created_at, '0.6');
        }
      }
    } catch (e) { console.warn('sitemap: could not fetch apps', e.message); }

    res.type('application/xml').send(
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`);
  } catch (e) {
    console.error('❌ sitemap generation failed:', e);
    res.status(500).type('text/plain').send('sitemap generation failed');
  }
});

// أي مسار غير معروف يرجع للمتجر (بدل 404 فاضي)
app.use((req, res) => res.redirect('/'));

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`✅ apps server running on port ${PORT} (proxying /api to ${HOSTAKA_API_BASE})`));
}

module.exports = app;
