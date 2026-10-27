/* ═══════════════════════════════════════════════════════════
   kync-ui.js — 공통 UI
   - KYNC_CONFIG: 버전, 문의 메일, 약관 버전
   - ic(): 선 아이콘
   - KyncBrand: 마스코트 '도치'(고슴도치)와 로고
   - KyncUI: 토스트, 확인창, 바텀시트, 전체화면 페이지, 로딩
═══════════════════════════════════════════════════════════ */

const KYNC_CONFIG = {
  version: '1.8.3',
  contactEmail: 'xoun148@gmail.com',
  termsVersion: '2026-10-12',   // 약관 내용이 바뀌면 날짜를 바꾸면 다시 동의를 받아요
};

/* ── 선 아이콘 (24x24) ── */
(function () {
  const P = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
    book: '<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5z"/><path d="M5 20.5A2.5 2.5 0 0 1 7.5 18H19v3H7.5"/><path d="M9 7.5h6"/>',
    play: '<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><circle cx="8.6" cy="8.6" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.4" cy="8.6" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="8.6" cy="15.4" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.4" cy="15.4" r="1.1" fill="currentColor" stroke="none"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4.5c4-2 6 2 10 0 1.4-.7 2.6-.8 4-.5v9c-1.4-.3-2.6-.2-4 .5-4 2-6-2-10 0"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1-1"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    chev: '<path d="M9 5l7 7-7 7"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    up: '<path d="M6 15l6-6 6 6"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.8 2.8L16.5 9.5"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
    unlock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 7.6-1.7"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    feed: '<rect x="4" y="4" width="16" height="7" rx="2"/><rect x="4" y="13" width="16" height="7" rx="2"/>',
    heart: '<path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.8 4 7.4 4c2 0 3.5 1.1 4.6 2.7C13.1 5.1 14.6 4 16.6 4c3.6 0 5.8 3.6 4.6 7.1-1.7 4.8-9.2 9.4-9.2 9.4z"/>',
    send: '<path d="M21 3 10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-4.5"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V4.5h6V7"/><path d="M6 7l1 13h10l1-13"/>',
    logout: '<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h10"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".6" fill="currentColor"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><circle cx="12" cy="16.5" r=".6" fill="currentColor"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.1.7 3.5 2.8 3.5 5.7"/>',
    chat: '<path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4A8 8 0 1 1 20 12z"/>',
    doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/>',
    bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    sparkle: '<path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7z"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>',
    phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.6L4 8"/><path d="M4 3.5V8h4.5"/><path d="M4 13a8 8 0 0 0 14.3 4.6L20 16"/><path d="M20 20.5V16h-4.5"/>',
    share: '<path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M5 11v9h14v-9"/>',
    download: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2 0-1.4-1.2-1.6-1.2-2.8 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.5 17 3 12 3z"/><circle cx="7.5" cy="11" r="1" fill="currentColor"/><circle cx="10" cy="7" r="1" fill="currentColor"/><circle cx="15" cy="7" r="1" fill="currentColor"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    cloud: '<path d="M7 18.5h10a4 4 0 0 0 .6-8 5.5 5.5 0 0 0-10.6-1.3A4.7 4.7 0 0 0 7 18.5z"/>',
    rain: '<path d="M7 15h10a4 4 0 0 0 .6-8 5.5 5.5 0 0 0-10.6-1.3A4.4 4.4 0 0 0 7 15z"/><path d="M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5"/>',
    snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M9.5 4.5 12 6l2.5-1.5M9.5 19.5 12 18l2.5 1.5"/>',
    wind: '<path d="M3 9h11a3 3 0 1 0-3-3"/><path d="M3 15h15a3 3 0 1 1-3 3"/><path d="M3 12h8"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-8.5 8.5"/>',
    music: '<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    pin: '<path d="M12 21s-6.5-6.1-6.5-11a6.5 6.5 0 0 1 13 0c0 4.9-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    shrink: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
    marker: '<path d="M14.5 4.5l5 5L10 19H5v-5z"/><path d="M4 21h16"/>',
    font: '<path d="M5 19 10.5 5h1L17 19"/><path d="M7.3 14h7.4"/>',
    sticker: '<path d="M20 12.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6.5z"/><path d="M12.5 20c0-4.2 3.3-7.5 7.5-7.5"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5q3.5 3 7 0"/><circle cx="9" cy="10" r=".9" fill="currentColor"/><circle cx="15" cy="10" r=".9" fill="currentColor"/>',
  };
  window.ic = function (name, size, cls) {
    const s = size || 22;
    return `<svg class="ic ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
  };
  window.GOOGLE_G = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
})();

/* ── 브랜드: 고슴도치 '도치' (images/char) ──
   부모 화면은 어른 고슴도치, 자녀 화면은 아기 고슴도치가 기본으로 나와요. */
const KyncBrand = (function () {
  const R = {'rest': 0.868, 'love': 0.984, 'study': 0.979, 'pair': 0.702, 'child': 0.963, 'school': 1.011, 'laptop': 0.953, 'talk': 0.708, 'peek': 0.562, 'cheer': 0.877, 'parent': 0.99, 'explore': 0.932, 'play': 0.934};
  // 역할별 기분(mood) → 그림
  const SET = {
    parent: { default: 'parent', happy: 'cheer', love: 'love', wow: 'parent', sleepy: 'rest', wait: 'rest', work: 'laptop' },
    child:  { default: 'child',  happy: 'play',  love: 'child', wow: 'explore', sleepy: 'study', wait: 'study', work: 'school' },
  };
  const SRC = 'images/char/parent.png';
  const role = r => r || (localStorage.getItem('kync_role') === 'child' ? 'child' : 'parent');

  // size = 가로 폭(px). opts.role로 역할을 직접 정할 수 있어요
  function mascot(mood, size, opts) {
    opts = opts || {};
    const set = SET[role(opts.role)];
    const name = set[mood] || set.default;
    return `<img class="mascot ${opts.cls || ''}" src="images/char/${name}.png" width="${size}" height="${Math.round(size * (R[name] || 1))}" alt="" aria-hidden="true" draggable="false">`;
  }
  // 기다리는 중·로딩
  function curled(size, cls) { return mascot('wait', size, { cls }); }
  // 부모·아이 같이
  function pair(size, cls) { return `<img class="mascot ${cls || ''}" src="images/char/pair.png" width="${size}" height="${Math.round(size * R.pair)}" alt="" aria-hidden="true" draggable="false">`; }
  function wordmark(cls) {
    return `<button type="button" class="wordmark ${cls || ''}" aria-label="kync 홈으로" onclick="goHomeTab(this)"><span class="wm-mark"><i></i></span><span class="wm-text">kync</span></button>`;
  }
  return { mascot, curled, pair, wordmark, SRC };
})();

/* ── 화면 도구 ── */
const KyncUI = {
  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  /* 토스트 — type: 'ok' | 'error' | 기본 */
  toast(msg, type) {
    document.querySelectorAll('.toast').forEach(t => t.remove());
    const t = document.createElement('div');
    t.className = 'toast' + (type ? ' toast-' + type : '');
    t.setAttribute('role', 'status');
    t.innerHTML = (type === 'ok' ? ic('checkCircle', 18) : type === 'error' ? ic('alert', 18) : '') + `<span>${this.esc(msg)}</span>`;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 250); }, 2600);
  },

  /* 가운데 확인창 → Promise<boolean> */
  confirm({ title, message, ok = '확인', cancel = '취소', danger = false, mascot = null } = {}) {
    return new Promise(resolve => {
      const bg = document.createElement('div');
      bg.className = 'dialog-bg';
      bg.innerHTML = `
        <div class="dialog" role="alertdialog" aria-modal="true">
          ${mascot ? `<div class="dialog-art">${KyncBrand.mascot(mascot, 84, { shadow: false })}</div>` : ''}
          ${title ? `<h3 class="dialog-title">${this.esc(title)}</h3>` : ''}
          ${message ? `<p class="dialog-msg">${this.esc(message).replace(/\n/g, '<br>')}</p>` : ''}
          <div class="dialog-actions">
            ${cancel ? `<button class="btn btn-soft" data-r="0">${this.esc(cancel)}</button>` : ''}
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-r="1">${this.esc(ok)}</button>
          </div>
        </div>`;
      const close = r => { bg.classList.remove('show'); setTimeout(() => bg.remove(), 180); resolve(r); };
      bg.addEventListener('click', e => {
        const b = e.target.closest('[data-r]');
        if (b) close(b.dataset.r === '1');
        else if (e.target === bg && cancel) close(false);
      });
      document.body.appendChild(bg);
      requestAnimationFrame(() => bg.classList.add('show'));
      bg.querySelector('[data-r="1"]').focus();
    });
  },

  alert(message, title) {
    return this.confirm({ title, message, cancel: null });
  },

  /* 바텀시트 — html을 넣고 { el, close } 반환 */
  sheet(html, { onClose, id } = {}) {
    if (id) document.getElementById(id)?.remove();
    const bg = document.createElement('div');
    bg.className = 'sheet-bg';
    if (id) bg.id = id;
    bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="sheet-handle"></div>${html}</div>`;
    const close = () => {
      bg.classList.remove('show');
      setTimeout(() => bg.remove(), 220);
      if (onClose) onClose();
    };
    bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
    document.body.appendChild(bg);
    requestAnimationFrame(() => bg.classList.add('show'));
    return { el: bg, close };
  },

  /* 위로 덮는 전체 화면 (설정, 약관 등) */
  openLayer(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('open');
    el.scrollTop = 0;
    const body = el.querySelector('.layer-body');
    if (body) body.scrollTop = 0;
  },
  closeLayer(id) {
    document.getElementById(id)?.classList.remove('open');
  },

  loader(on, text) {
    const el = document.getElementById('kync-global-loader');
    if (!el) return;
    // 그때 역할에 맞는 캐릭터로 다시 그림 (부모: 어른, 자녀: 아기)
    if (on) { const m = el.querySelector('.mascot, [data-curled]'); if (m) m.outerHTML = KyncBrand.curled(72); }
    const t = el.querySelector('.loader-text');
    if (t) t.textContent = text || '';
    el.classList.toggle('show', !!on);
  },

  /* 버튼 누르는 동안 잠그기 */
  async busy(btn, label, fn) {
    if (!btn || btn.dataset.busy) return;
    const prev = btn.innerHTML;
    btn.dataset.busy = '1';
    btn.disabled = true;
    if (label) btn.textContent = label;
    try { return await fn(); }
    finally { delete btn.dataset.busy; btn.disabled = false; btn.innerHTML = prev; }
  },
};

/* 앱 하단 탭 전환 */
function selectTab(targetId) {
  const panel = document.getElementById(targetId);
  if (!panel) return;
  const page = panel.closest('.page');
  page.querySelectorAll('.tab-panel').forEach(c => c.classList.toggle('active', c === panel));
  page.querySelectorAll('.tab-btn').forEach(b => {
    const on = b.dataset.target === targetId;
    b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  page.querySelector('.app-main').scrollTop = 0;
  if (targetId.endsWith('activityTab') && typeof KyncActivity !== 'undefined') KyncActivity.render();
}
window.selectTab = selectTab;

/* 말투: 부모 화면은 존댓말, 자녀 화면은 반말 */
function tone(polite, casual) { return localStorage.getItem('kync_role') === 'child' ? casual : polite; }
window.tone = tone;

/* 조사 붙이기: josa('자녀', '이/가') → '자녀가' */
function josa(word, pair) {
  word = String(word ?? '');
  const [a, b] = pair.split('/');
  const c = word.charCodeAt(word.length - 1) - 0xAC00;
  const has = c >= 0 && c <= 11171 && c % 28 !== 0;
  // '으로/로'는 받침 ㄹ이면 '로'
  if (a === '으로' && c % 28 === 8) return word + b;
  return word + (has ? a : b);
}
window.josa = josa;

/* 로고 누르면 홈(첫 번째 탭)으로 */
function goHomeTab(el) {
  const page = el.closest('.page');
  const first = page && page.querySelector('.tab-btn[data-target]');
  if (first) selectTab(first.dataset.target);
}
window.goHomeTab = goHomeTab;

/* HTML에 적어둔 자리표시(data-ic, data-mascot 등)를 그림으로 채우기 */
KyncUI.hydrate = function (root) {
  root = root || document;
  root.querySelectorAll('[data-ic]').forEach(el => {
    el.innerHTML = ic(el.dataset.ic, +el.dataset.size || 22);
    el.removeAttribute('data-ic');
  });
  root.querySelectorAll('[data-mascot]').forEach(el => {
    el.outerHTML = KyncBrand.mascot(el.dataset.mascot, +el.dataset.size || 96, { shadow: !el.hasAttribute('data-noshadow') });
  });
  root.querySelectorAll('[data-curled]').forEach(el => { el.outerHTML = KyncBrand.curled(+el.dataset.curled || 72); });
  root.querySelectorAll('[data-google]').forEach(el => { el.outerHTML = GOOGLE_G; });
  root.querySelectorAll('[data-wordmark]').forEach(el => { el.outerHTML = KyncBrand.wordmark(); });
};
// 활동 페이지에서 돌아오는 중이면 로그인 확인이 끝날 때까지 로딩 표시
if (window._returnTab) KyncUI.loader(true);
document.addEventListener('DOMContentLoaded', () => { const v = document.getElementById('login-version'); if (v) v.textContent = 'v' + KYNC_CONFIG.version; });
if (document.readyState !== 'loading') KyncUI.hydrate();
else document.addEventListener('DOMContentLoaded', () => KyncUI.hydrate());

/* ── 프로필 색 ── */
KyncUI.COLORS = ['#7A4E36', '#4F7FAF', '#3D8A5A', '#C98419', '#CF463C', '#8A5DA8'];
KyncUI.avatarColor = function (uid, role) {
  const mine = uid && uid === (KyncAuth?.current?.uid || localStorage.getItem('kync_user_uid'));
  const c = (mine && KyncAccount?.profile?.color) || KyncAccount?.family?.members?.[uid]?.color;
  return c || (role === 'child' ? '#4F7FAF' : '#7A4E36');
};

// 프로필 그림: 부모는 어른 고슴도치, 자녀는 아기 고슴도치. 배경은 고른 색을 연하게
KyncUI.tint = function (hex, amt) {
  const n = parseInt(hex.slice(1), 16), a = amt ?? 0.22;
  const mix = c => Math.round(255 - (255 - c) * a);
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
};
KyncUI.avatar = function (uid, role, cls) {
  const color = KyncUI.avatarColor(uid, role);
  const src = role === 'child' ? 'images/hog-baby.png' : 'images/hog-adult.png';
  return `<div class="avatar hog ${cls || ''}" style="background:${KyncUI.tint(color)};box-shadow:inset 0 0 0 2px ${color}"><img src="${src}" alt="${role === 'child' ? '아기 고슴도치' : '어른 고슴도치'}"></div>`;
};

/* ── 홈 화면에 추가 (앱 설치) ── */
const KyncInstall = {
  _evt: null,
  isStandalone() {
    return window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
  },
  isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  },
  // 처음 소개 다음에 한 번 보여줄지
  shouldShow() {
    let seen = false;
    try { seen = !!localStorage.getItem('kync_install_seen'); } catch (e) {}
    return !seen && !this.isStandalone();
  },
  show() {
    const ios = this.isIOS();
    document.getElementById('install-ios')?.classList.toggle('hidden', !ios);
    const btn = document.getElementById('install-btn');
    if (btn) btn.textContent = ios ? '확인했어요' : '홈 화면에 추가하기';
    navigateTo('page-install');
  },
  done() {
    try { localStorage.setItem('kync_install_seen', '1'); } catch (e) {}
    navigateTo('page-login');
  },
  skip() { this.done(); },
  async prompt() {
    if (this.isIOS()) { this.done(); return; }
    if (this._evt) {
      this._evt.prompt();
      try { await this._evt.userChoice; } catch (e) {}
      this._evt = null;
      this.done();
    } else {
      KyncUI.alert('브라우저 메뉴(⋮)에서 \'홈 화면에 추가\' 또는 \'앱 설치\'를 눌러주세요.', '홈 화면에 추가하기');
      this.done();
    }
  },
  // 설정에서 열 때
  openSheet() {
    if (this.isStandalone()) { toast('이미 홈 화면에서 쓰고 있어요', 'ok'); return; }
    if (!this.isIOS() && this._evt) { this.prompt(); return; }
    KyncUI.sheet(`
      <h2>홈 화면에 추가하기</h2>
      <p class="sheet-sub">추가하면 주소창 없이 전체 화면으로 열려요.</p>
      <ol class="install-steps">
        ${this.isIOS()
          ? `<li><span class="n">1</span><span>Safari 화면 아래 <b>공유</b> 버튼 ${ic('share', 18)}을 눌러요</span></li>
             <li><span class="n">2</span><span><b>홈 화면에 추가</b>를 골라요</span></li>
             <li><span class="n">3</span><span>오른쪽 위 <b>추가</b>를 눌러요</span></li>`
          : `<li><span class="n">1</span><span>브라우저 오른쪽 위 메뉴(⋮)를 눌러요</span></li>
             <li><span class="n">2</span><span><b>홈 화면에 추가</b> 또는 <b>앱 설치</b>를 골라요</span></li>`}
      </ol>
      <button class="btn btn-primary btn-block" data-close style="margin-top:16px">확인</button>`);
  },
};
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); KyncInstall._evt = e; });

/* ── 예상 못 한 오류 알림 ── */
(function () {
  const shown = new Set();
  const report = (msg, code) => {
    msg = String(msg || '');
    if (!msg || /ResizeObserver|Script error|cancelled-popup|popup-closed/i.test(msg) || shown.has(msg)) return;
    shown.add(msg);
    console.error('[Kync]', msg);
    if (typeof KyncUI !== 'undefined') KyncUI.toast(code === 'permission-denied' ? '권한이 없어 저장하지 못했어요 (보안 규칙)' : '문제가 생겼어요. 이 화면을 캡처해서 알려주세요: ' + msg.slice(0, 80), 'error');
  };
  window.addEventListener('error', e => report(e.message));
  window.addEventListener('unhandledrejection', e => report(e.reason?.message || e.reason, e.reason?.code));
})();

/* ── 인터넷 연결 표시 ── */
(function () {
  const upd = () => document.getElementById('offline-bar')?.classList.toggle('show', !navigator.onLine);
  window.addEventListener('online', () => { upd(); });
  window.addEventListener('offline', upd);
  if (document.readyState !== 'loading') upd(); else document.addEventListener('DOMContentLoaded', upd);
})();

/* ── 서비스 워커 (인터넷이 끊겨도 마지막 화면이 열리게) ── */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

window.KyncInstall = KyncInstall;
window.KYNC_CONFIG = KYNC_CONFIG;
window.KyncBrand = KyncBrand;
window.KyncUI = KyncUI;
