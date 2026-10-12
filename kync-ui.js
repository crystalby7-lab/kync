/* ═══════════════════════════════════════════════════════════
   kync-ui.js — 공통 UI
   - KYNC_CONFIG: 버전, 문의 메일, 약관 버전
   - ic(): 선 아이콘
   - KyncBrand: 마스코트 '도치'(고슴도치)와 로고
   - KyncUI: 토스트, 확인창, 바텀시트, 전체화면 페이지, 로딩
═══════════════════════════════════════════════════════════ */

const KYNC_CONFIG = {
  version: '1.1.0',
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
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5q3.5 3 7 0"/><circle cx="9" cy="10" r=".9" fill="currentColor"/><circle cx="15" cy="10" r=".9" fill="currentColor"/>',
  };
  window.ic = function (name, size, cls) {
    const s = size || 22;
    return `<svg class="ic ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
  };
  window.GOOGLE_G = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
})();

/* ── 브랜드: 고슴도치 '도치' ── */
const KyncBrand = (function () {
  const C = { quill: '#7A4E36', quill2: '#9A6646', face: '#F6E4CB', ink: '#2B2421', blush: '#EE9C86' };

  // 가시 테두리: 타원 위에 뾰족한 점을 번갈아 찍고, 둥근 선으로 끝을 부드럽게
  function spikes(cx, cy, rx, ry, n, depth, a0, a1) {
    const rad = d => d * Math.PI / 180, f = v => v.toFixed(1), pts = [];
    const step = (a1 - a0) / n;
    for (let i = 0; i <= n; i++) {
      const a = a0 + step * i;
      pts.push([cx + Math.cos(rad(a)) * rx, cy + Math.sin(rad(a)) * ry]);
      if (i < n) {
        const m = a + step / 2;
        pts.push([cx + Math.cos(rad(m)) * (rx + depth), cy + Math.sin(rad(m)) * (ry + depth)]);
      }
    }
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 1; i < pts.length; i++) d += `L${f(pts[i][0])} ${f(pts[i][1])}`;
    return d + `A${rx} ${ry} 0 0 1 ${f(pts[0][0])} ${f(pts[0][1])}Z`;
  }
  const BACK = spikes(60, 60, 44, 36, 13, 11, -205, 25);
  const CROWN = spikes(60, 56, 30, 22, 9, 7, -170, -10);
  const BALL = spikes(60, 58, 36, 34, 18, 9, -270, 90);

  function face(mood) {
    const eye = x => `<ellipse cx="${x}" cy="66" rx="3.6" ry="4.2" fill="${C.ink}"/><circle cx="${x + 1.2}" cy="64.6" r="1.1" fill="#fff"/>`;
    let eyes = eye(48) + eye(72), mouth = `<path d="M56.5 79q3.5 3 7 0" stroke="${C.ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    if (mood === 'happy') {
      eyes = `<path d="M44 67q4-5 8 0M68 67q4-5 8 0" stroke="${C.ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
      mouth = `<path d="M55 79q5 5 10 0" stroke="${C.ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    } else if (mood === 'sleepy') {
      eyes = `<path d="M44 66h8M68 66h8" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`;
      mouth = '';
    } else if (mood === 'wow') {
      mouth = `<ellipse cx="60" cy="81" rx="2.6" ry="3" fill="${C.ink}"/>`;
    }
    return `${eyes}<ellipse cx="60" cy="74" rx="4.4" ry="3.3" fill="${C.ink}"/>${mouth}` +
      `<ellipse cx="40" cy="76" rx="5.5" ry="3.4" fill="${C.blush}" opacity=".55"/><ellipse cx="80" cy="76" rx="5.5" ry="3.4" fill="${C.blush}" opacity=".55"/>`;
  }

  // mood: default | happy | sleepy | wow
  function mascot(mood, size, opts) {
    opts = opts || {};
    const shadow = opts.shadow === false ? '' : `<ellipse cx="60" cy="106" rx="30" ry="4" fill="rgba(43,36,33,.10)"/>`;
    return `<svg class="mascot ${opts.cls || ''}" width="${size}" height="${Math.round(size * 112 / 120)}" viewBox="0 0 120 112" aria-hidden="true">${shadow}
      <path d="${BACK}" fill="${C.quill}" stroke="${C.quill}" stroke-width="5" stroke-linejoin="round"/>
      <path d="${CROWN}" fill="${C.quill2}" stroke="${C.quill2}" stroke-width="4" stroke-linejoin="round" opacity=".9"/>
      <ellipse cx="46" cy="101" rx="7" ry="4.5" fill="${C.quill}"/><ellipse cx="74" cy="101" rx="7" ry="4.5" fill="${C.quill}"/>
      <path d="M24 74C24 56 40 46 60 46s36 10 36 28c0 15-16 26-36 26S24 89 24 74z" fill="${C.face}"/>
      <circle cx="33" cy="49" r="7.5" fill="${C.face}"/><circle cx="33" cy="49" r="3.6" fill="${C.blush}" opacity=".7"/>
      <circle cx="87" cy="49" r="7.5" fill="${C.face}"/><circle cx="87" cy="49" r="3.6" fill="${C.blush}" opacity=".7"/>
      ${face(mood)}</svg>`;
  }

  // 몸을 만 모습 (답을 기다릴 때, 로딩)
  function curled(size, cls) {
    return `<svg class="mascot ${cls || ''}" width="${size}" height="${Math.round(size * 112 / 120)}" viewBox="0 0 120 112" aria-hidden="true">
      <path d="${BALL}" fill="${C.quill}" stroke="${C.quill}" stroke-width="5" stroke-linejoin="round"/>
      <path d="${spikes(60, 52, 22, 18, 8, 6, -170, -10)}" fill="${C.quill2}" stroke="${C.quill2}" stroke-width="4" stroke-linejoin="round" opacity=".85"/>
      <ellipse cx="60" cy="84" rx="14" ry="9" fill="${C.face}"/><ellipse cx="60" cy="82" rx="3.6" ry="2.8" fill="${C.ink}"/></svg>`;
  }

  // 로고: 도치 얼굴 + kync
  function wordmark(cls) {
    return `<span class="wordmark ${cls || ''}" aria-label="kync">${mascot('default', 30, { shadow: false, cls: 'wm-mark' })}<span class="wm-text">kync</span></span>`;
  }

  return { mascot, curled, wordmark, C };
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
if (document.readyState !== 'loading') KyncUI.hydrate();
else document.addEventListener('DOMContentLoaded', () => KyncUI.hydrate());

window.KYNC_CONFIG = KYNC_CONFIG;
window.KyncBrand = KyncBrand;
window.KyncUI = KyncUI;
