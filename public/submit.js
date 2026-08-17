// ============================================================
//  apps.hostaka.fun — صفحة نشر تطبيق (/submit)
// ============================================================
const CATEGORIES = ['Tools', 'Games', 'Social', 'Productivity', 'Education', 'Entertainment', 'Other'];
const CATEGORY_I18N = {
  Tools: 'store.catTools', Games: 'store.catGames', Social: 'store.catSocial',
  Productivity: 'store.catProductivity', Education: 'store.catEducation',
  Entertainment: 'store.catEntertainment', Other: 'store.catOther'
};

let iconUrl = '';
let screenshotUrls = [];
let uploading = false;

function renderGate(){
  document.getElementById('submitWrap').innerHTML = `
    <div class="gate-box">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="10" y1="18" x2="14" y2="18"/></svg>
      <div class="gate-box-title" data-i18n="submit.loginRequiredTitle">Log in to publish an app</div>
      <div class="gate-box-desc" data-i18n="submit.loginRequiredDesc">You need a Hostaka account to submit an app to the store.</div>
      <button class="gate-btn" onclick="goToLogin()" data-i18n="submit.loginBtn">Log in</button>
    </div>`;
  if (window.applyTranslations) window.applyTranslations();
}

function renderSuccess(){
  document.getElementById('submitWrap').innerHTML = `
    <div class="success-box">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <div class="success-box-title" data-i18n="submit.successTitle">Submitted for review!</div>
      <div class="success-box-desc" data-i18n="submit.successDesc">Your app will appear in the store once our team approves it.</div>
      <a class="success-btn" href="/" data-i18n="submit.backToStore">Back to store</a>
    </div>`;
  if (window.applyTranslations) window.applyTranslations();
}

function renderForm(){
  document.getElementById('submitWrap').innerHTML = `
    <div class="page-heading" data-i18n="submit.title">Publish an app</div>
    <div class="field">
      <label data-i18n="submit.iconLabel">App icon</label>
      <div class="icon-picker">
        <div class="icon-preview" id="iconPreview">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="2" width="16" height="20" rx="2"/></svg>
        </div>
        <button type="button" class="upload-btn" onclick="document.getElementById('iconInput').click()" data-i18n="submit.addScreenshot">Add screenshot</button>
        <input type="file" id="iconInput" accept="image/*" style="display:none;" onchange="onIconPicked(event)">
      </div>
      <div class="field-hint" data-i18n="submit.iconHint">Square image recommended</div>
    </div>

    <div class="field">
      <label data-i18n="submit.nameLabel">App name</label>
      <input type="text" id="fName" data-i18n-placeholder="submit.namePlaceholder" placeholder="e.g. Weather Now" maxlength="100">
    </div>

    <div class="field">
      <label data-i18n="submit.descLabel">Description</label>
      <textarea id="fDesc" data-i18n-placeholder="submit.descPlaceholder" placeholder="What does your app do?" maxlength="2000"></textarea>
    </div>

    <div class="field">
      <label data-i18n="submit.categoryLabel">Category</label>
      <select id="fCategory">
        ${CATEGORIES.map(c => `<option value="${c}" data-i18n="${CATEGORY_I18N[c]}">${c}</option>`).join('')}
      </select>
    </div>

    <div class="field">
      <label data-i18n="submit.screenshotsLabel">Screenshots</label>
      <div class="shots-grid" id="shotsGrid">
        <div class="shot-add" onclick="document.getElementById('shotInput').click()">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </div>
      </div>
      <input type="file" id="shotInput" accept="image/*" style="display:none;" onchange="onShotPicked(event)">
      <div class="field-hint" data-i18n="submit.screenshotsHint">Add at least one screenshot</div>
    </div>

    <div class="field">
      <label data-i18n="submit.downloadUrlLabel">Download link</label>
      <input type="url" id="fUrl" data-i18n-placeholder="submit.downloadUrlPlaceholder" placeholder="https://...">
    </div>

    <button class="submit-btn" id="submitBtn" onclick="doSubmit()" data-i18n="submit.submitBtn">Submit for review</button>
  `;
  if (window.applyTranslations) window.applyTranslations();
  renderShots();
}

function renderShots(){
  const grid = document.getElementById('shotsGrid');
  if (!grid) return;
  const addBtn = `<div class="shot-add" onclick="document.getElementById('shotInput').click()">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
  </div>`;
  grid.innerHTML = screenshotUrls.map((url, i) => `
    <div class="shot-item">
      <img src="${esc(url)}" alt="">
      <button type="button" class="shot-remove" onclick="removeShot(${i})">✕</button>
    </div>`).join('') + addBtn;
}
function removeShot(i){ screenshotUrls.splice(i, 1); renderShots(); }
window.removeShot = removeShot;

async function onIconPicked(e){
  const file = e.target.files[0];
  if (!file) return;
  try {
    const url = await uploadImage(file);
    iconUrl = url;
    document.getElementById('iconPreview').innerHTML = `<img src="${esc(url)}" alt="">`;
  } catch (err) { showToast(t('submit.uploadFail'), 'error'); }
  e.target.value = '';
}
window.onIconPicked = onIconPicked;

async function onShotPicked(e){
  const file = e.target.files[0];
  if (!file) return;
  try {
    const url = await uploadImage(file);
    screenshotUrls.push(url);
    renderShots();
  } catch (err) { showToast(t('submit.uploadFail'), 'error'); }
  e.target.value = '';
}
window.onShotPicked = onShotPicked;

async function doSubmit(){
  const name = document.getElementById('fName').value.trim();
  const description = document.getElementById('fDesc').value.trim();
  const category = document.getElementById('fCategory').value;
  const download_url = document.getElementById('fUrl').value.trim();

  if (!name || !download_url) { showToast(t('submit.missingFields'), 'error'); return; }
  if (!screenshotUrls.length) { showToast(t('submit.missingScreenshot'), 'error'); return; }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = t('submit.submitting');
  try {
    const d = await apiFetch('/api/apps', 'POST', { name, description, category, icon: iconUrl, screenshots: screenshotUrls, download_url });
    if (d && d.success) {
      renderSuccess();
    } else {
      showToast(d?.error || t('submit.submitFail'), 'error');
      btn.disabled = false;
      btn.textContent = t('submit.submitBtn');
    }
  } catch (e) {
    showToast(t('submit.submitFail'), 'error');
    btn.disabled = false;
    btn.textContent = t('submit.submitBtn');
  }
}
window.doSubmit = doSubmit;

async function init(){
  const user = await initAuthArea();
  document.getElementById('loader').style.display = 'none';
  if (!user) renderGate();
  else renderForm();
}
init();
