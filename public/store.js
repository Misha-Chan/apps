// ============================================================
//  apps.hostaka.fun — صفحة المتجر (/) — تصفح التطبيقات
// ============================================================
const CATEGORY_ORDER = ['Tools', 'Games', 'Social', 'Productivity', 'Education', 'Entertainment', 'Other'];
const CATEGORY_I18N_KEY = {
  Tools: 'store.catTools', Games: 'store.catGames', Social: 'store.catSocial',
  Productivity: 'store.catProductivity', Education: 'store.catEducation',
  Entertainment: 'store.catEntertainment', Other: 'store.catOther'
};

let ALL_APPS = [];
let activeCategory = ''; // '' = الكل

function starsLabel(app){
  if (!app.avg_rating) return t('store.noRatingsYet');
  return Number(app.avg_rating).toFixed(1);
}

function appCardHtml(app){
  const initial = esc((app.name || '?').charAt(0).toUpperCase());
  return `
    <a class="app-card" href="/app?id=${encodeURIComponent(app.token)}">
      <div class="app-card-icon">${app.icon ? `<img src="${esc(app.icon)}" alt="">` : initial}</div>
      <div class="app-card-name">${esc(app.name)}</div>
      <div class="app-card-meta">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        ${esc(starsLabel(app))}
      </div>
    </a>`;
}

function renderStore(){
  const wrap = document.getElementById('storeContent');
  let apps = ALL_APPS;
  if (activeCategory) apps = apps.filter(a => a.category === activeCategory);

  if (!apps.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="10" y1="18" x2="14" y2="18"/></svg>
        <div class="empty-state-title" data-i18n="store.emptyTitle">No apps yet</div>
        <div data-i18n="store.emptyDesc">Be the first to publish an app here.</div>
      </div>`;
    if (window.applyTranslations) window.applyTranslations(wrap);
    return;
  }

  if (activeCategory) {
    wrap.innerHTML = `<div class="cat-row">${apps.map(appCardHtml).join('')}</div>`;
    return;
  }

  // بدون تصنيف محدد: نجمع حسب الفئة، كل فئة فيها تطبيقات تصير قسم مستقل
  const byCategory = {};
  apps.forEach(a => {
    const cat = CATEGORY_ORDER.includes(a.category) ? a.category : 'Other';
    (byCategory[cat] = byCategory[cat] || []).push(a);
  });
  const sections = CATEGORY_ORDER.filter(c => byCategory[c] && byCategory[c].length);
  wrap.innerHTML = sections.map(cat => `
    <div class="cat-section">
      <div class="cat-section-title" data-i18n="${CATEGORY_I18N_KEY[cat]}">${esc(cat)}</div>
      <div class="cat-row">${byCategory[cat].map(appCardHtml).join('')}</div>
    </div>
  `).join('');
  if (window.applyTranslations) window.applyTranslations(wrap);
}

function renderCategoryPills(){
  const pillsEl = document.getElementById('catPills');
  const cats = ['', ...CATEGORY_ORDER];
  pillsEl.innerHTML = cats.map(cat => {
    const key = cat ? CATEGORY_I18N_KEY[cat] : 'store.catAll';
    return `<button class="cat-pill ${cat === activeCategory ? 'active' : ''}" data-i18n="${key}" onclick="setActiveCategory('${cat}')">${cat ? esc(cat) : 'All'}</button>`;
  }).join('');
  if (window.applyTranslations) window.applyTranslations(pillsEl);
}

function setActiveCategory(cat){
  activeCategory = cat;
  renderCategoryPills();
  renderStore();
}
window.setActiveCategory = setActiveCategory;

async function loadStore(){
  try {
    ALL_APPS = await apiFetch('/api/apps');
    if (!Array.isArray(ALL_APPS)) ALL_APPS = [];
  } catch (e) {
    ALL_APPS = [];
    showToast(t('store.loadFail'), 'error');
  }
  document.getElementById('loader').style.display = 'none';
  renderCategoryPills();
  renderStore();
}

document.addEventListener('hostaka:langchange', renderStore);
initAuthArea();
loadStore();
