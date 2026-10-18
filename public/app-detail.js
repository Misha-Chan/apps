// ============================================================
//  apps.hostaka.fun — صفحة تطبيق فردية (/app?id=TOKEN)
// ============================================================
let CURRENT_APP = null;
let pickedRating = 0;

function starsSvg(filled){
  return `<svg viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
}
function starsRow(count, cls){
  let html = '';
  for (let i = 1; i <= 5; i++) html += `<span class="${cls}">${starsSvg(i <= count)}</span>`;
  return html;
}

function getTokenFromUrl(){
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || '';
}

function renderNotFound(){
  document.getElementById('appWrap').innerHTML = `
    <div class="not-found">
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <div style="font-weight:800;font-size:1rem;color:var(--text);margin-bottom:6px;" data-i18n="app.notFoundTitle">App not found</div>
      <div data-i18n="app.notFoundDesc">This app may have been removed or is no longer available.</div>
      <div style="margin-top:16px;"><a href="/" style="color:var(--primary);font-weight:700;text-decoration:none;" data-i18n="app.backToStore">Back to store</a></div>
    </div>`;
  if (window.applyTranslations) window.applyTranslations();
}

function openLightbox(src){
  const lb = document.getElementById('lightbox');
  document.getElementById('lightboxImg').src = src;
  lb.classList.add('show');
}
function closeLightbox(){ document.getElementById('lightbox').classList.remove('show'); }
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;

function pickStar(n){
  pickedRating = n;
  document.querySelectorAll('#starPicker svg').forEach((svg, i) => {
    svg.classList.toggle('filled', i < n);
    svg.setAttribute('fill', i < n ? 'currentColor' : 'none');
  });
}
window.pickStar = pickStar;

async function submitReview(){
  if (!pickedRating) { showToast(t('app.reviewFail'), 'error'); return; }
  const comment = document.getElementById('reviewComment').value.trim();
  try {
    const d = await apiFetch(`/api/apps/${encodeURIComponent(CURRENT_APP.token)}/reviews`, 'POST', { rating: pickedRating, comment });
    if (d && d.success) {
      showToast(t('app.reviewSubmitted'));
      document.getElementById('reviewComment').value = '';
      loadReviews();
    } else {
      showToast(d?.error || t('app.reviewFail'), 'error');
    }
  } catch (e) { showToast(t('app.reviewFail'), 'error'); }
}
window.submitReview = submitReview;

function reviewItemHtml(r){
  return `
    <div class="review-item">
      <div class="review-head">
        <div class="review-avatar">${r.user_avatar ? `<img src="${esc(r.user_avatar)}" alt="">` : `<img src="/default-avatar.jpg" alt="">`}</div>
        <span class="review-name">${esc(r.username)}</span>
        <span class="review-stars">${starsRow(r.rating, '')}</span>
        <span class="review-date">${new Date(r.created_at).toLocaleDateString(currentLangSafe())}</span>
      </div>
      ${r.comment ? `<div class="review-comment">${esc(r.comment)}</div>` : ''}
    </div>`;
}
function currentLangSafe(){ return (window.currentLang === 'ar') ? 'ar' : 'en'; }

async function loadReviews(){
  try {
    const reviews = await apiFetch(`/api/apps/${encodeURIComponent(CURRENT_APP.token)}/reviews`);
    const el = document.getElementById('reviewsList');
    if (!Array.isArray(reviews) || !reviews.length) {
      el.innerHTML = `<div style="color:var(--muted);font-size:0.86rem;padding:8px 0;" data-i18n="app.noReviewsYet">No reviews yet — be the first to review</div>`;
      if (window.applyTranslations) window.applyTranslations(el);
      return;
    }
    el.innerHTML = reviews.map(reviewItemHtml).join('');
  } catch (e) {}
}

function renderReviewFormArea(){
  const area = document.getElementById('reviewFormArea');
  if (!area) return; // الصفحة لسا ما بنت محتوى التطبيق (مثلاً: جلسة المستخدم رجعت قبل تحميل التطبيق)
  if (CURRENT_USER) {
    area.innerHTML = `
      <div class="review-form">
        <div style="font-weight:800;font-size:0.9rem;margin-bottom:10px;" data-i18n="app.addReviewTitle">Leave a review</div>
        <div class="star-picker" id="starPicker">${[1,2,3,4,5].map(n => `<span onclick="pickStar(${n})">${starsSvg(false)}</span>`).join('')}</div>
        <textarea id="reviewComment" data-i18n-placeholder="app.reviewPlaceholder" placeholder="What do you think of this app? (optional)"></textarea>
        <button onclick="submitReview()" data-i18n="app.submitReview">Submit review</button>
      </div>`;
  } else {
    area.innerHTML = `<div class="login-hint"><a href="#" onclick="goToLogin();return false;" data-i18n="app.loginToReview">Log in to leave a review</a></div>`;
  }
  if (window.applyTranslations) window.applyTranslations(area);
}

async function doDownload(){
  try {
    const d = await apiFetch(`/api/apps/${encodeURIComponent(CURRENT_APP.token)}/download`, 'POST');
    if (d && d.download_url) {
      window.location.href = d.download_url;
    } else {
      showToast(d?.error || t('app.downloadFail'), 'error');
    }
  } catch (e) { showToast(t('app.downloadFail'), 'error'); }
}
window.doDownload = doDownload;

function renderApp(app){
  CURRENT_APP = app;
  document.title = `${app.name} · Hostaka Apps`;
  const initial = esc((app.name || '?').charAt(0).toUpperCase());
  const screenshots = (() => { try { return JSON.parse(app.screenshots || '[]'); } catch (e) { return []; } })();

  document.getElementById('appWrap').innerHTML = `
    ${app.warning ? `
      <div class="warning-banner">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div><strong data-i18n="app.warningLabel">Notice from the review team</strong><div>${esc(app.warning)}</div></div>
      </div>` : ''}
    <div class="app-head">
      <div class="app-icon">${app.icon ? `<img src="${esc(app.icon)}" alt="">` : initial}</div>
      <div>
        <div class="app-title">${esc(app.name)}</div>
        <div class="app-publisher">${esc(app.publisher_name)}</div>
        <div class="app-rating-row">
          ${app.avg_rating ? `<span style="display:flex;gap:1px;color:#f5a623;">${starsRow(Math.round(app.avg_rating), '')}</span> ${Number(app.avg_rating).toFixed(1)} (${app.reviews_count||0})` : `<span data-i18n="store.noRatingsYet">New</span>`}
          <span class="app-downloads">· ${app.downloads_count||0} <span data-i18n="app.downloads">downloads</span></span>
        </div>
        <button class="dl-btn" onclick="doDownload()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span data-i18n="app.downloadBtn">Download</span>
        </button>
      </div>
    </div>

    ${app.description ? `<div class="app-desc">${esc(app.description)}</div>` : ''}

    ${screenshots.length ? `
      <div class="section-title" data-i18n="app.screenshotsTitle">Screenshots</div>
      <div class="shots-row">${screenshots.map(s => `<img class="shot-thumb" src="${esc(s)}" onclick="openLightbox('${escJs(s)}')">`).join('')}</div>
    ` : ''}

    <div class="section-title" data-i18n="app.reviewsTitle">Reviews</div>
    <div id="reviewFormArea"></div>
    <div id="reviewsList"><div style="color:var(--muted);font-size:0.86rem;" data-i18n="common.loading">Loading...</div></div>
  `;
  if (window.applyTranslations) window.applyTranslations();
  renderReviewFormArea();
  loadReviews();
}

async function loadApp(){
  const token = getTokenFromUrl();
  if (!token) { renderNotFound(); document.getElementById('loader').style.display = 'none'; return; }
  try {
    const app = await apiFetch(`/api/apps/${encodeURIComponent(token)}`);
    if (!app || app.error) renderNotFound();
    else renderApp(app);
  } catch (e) { renderNotFound(); }
  document.getElementById('loader').style.display = 'none';
}

document.addEventListener('apps:authready', renderReviewFormArea);
initAuthArea();
loadApp();
