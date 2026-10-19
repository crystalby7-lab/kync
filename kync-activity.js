/* ═══════════════════════════════════════════════════════════
   kync-activity.js — 활동 탭 (나를 알기)
   - 자녀: 나 사용 설명서 / 취향 맞추기 / 대화 유형 검사
   - 부모: 아이가 알려준 것 / 취향 맞추기 / 대화 유형 검사
═══════════════════════════════════════════════════════════ */

const KyncActivity = {

  _esc(s) { return KyncUI.esc(s); },
  _read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
    catch (e) { return fallback; }
  },

  render() {
    const role = localStorage.getItem('kync_role');
    if (role !== 'parent' && role !== 'child') return;
    const el = document.getElementById(role === 'parent' ? 'p-activity-list' : 'c-activity-list');
    if (!el) return;

    const other = role === 'parent' ? 'child' : 'parent';
    const otherLabel = role === 'parent' ? '자녀' : '부모님';
    const fc = localStorage.getItem('kync_family_code') || 'local';

    const tasteCount = Object.keys(KyncBalance._getTodayState(fc).data.answers || {}).length;
    const tasteMax = KyncBalance.MAX_PER_DAY || 10;

    const result = this._read('kync_quiz_result', null);
    const myUid = KyncAuth?.current?.uid || localStorage.getItem('kync_user_uid');
    const theirType = Object.entries(KyncAccount?.family?.members || {}).find(([uid, m]) => uid !== myUid && m.role === other && m.talkType)?.[1]?.talkType;

    const shared = (typeof KyncManual !== 'undefined' ? KyncManual._parentDocs || [] : [])
      .reduce((n, x) => n + KyncManual.SECTIONS.filter(s => x[s.id]).length, 0);

    const hero = role === 'child' ? `
      <button class="ax-hero" onclick="KyncManual.open()">
        <div class="ax-hero-label">나 사용 설명서</div>
        <div class="ax-hero-q">내 기록으로 정리한 나</div>
        <div class="ax-hero-sub">기분, 에너지, 성향, 대화하는 법. 부모님께 보여줄 건 항목마다 직접 고르면 돼.</div>
        <div class="ax-hero-cta">열기${ic('chev', 16)}</div>
      </button>` : `
      <button class="ax-hero" onclick="selectTab('p-todayTab'); setTimeout(() => document.getElementById('p-manual-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)">
        <div class="ax-hero-label">아이의 사용 설명서</div>
        <div class="ax-hero-q">${shared ? `공개된 항목 ${shared}개` : '아직 공개된 항목 없음'}</div>
        <div class="ax-hero-sub">아이가 직접 공개한 항목만 오늘 탭에 보여요.</div>
        ${shared ? `<div class="ax-hero-cta">보기${ic('chev', 16)}</div>` : ''}
      </button>`;

    el.innerHTML = `
      <div class="qx-section">나를 알기</div>
      ${hero}
      ${role === 'child' ? `
      <button class="ax-row" onclick="KyncJournal.open()">
        <div class="ax-row-icon">${ic('edit', 24)}</div>
        <div class="grow"><b>일기</b><small>이번 주 ${KyncJournal.weekCount()}/3 · 나만 보기, 보낼 것만 골라서</small></div>
        <span class="chev">${ic('chev', 20)}</span>
      </button>` : ''}

      <button class="ax-row" onclick="location.href='activity-balance.html'">
        <div class="ax-row-icon">${ic('target', 24)}</div>
        <div class="grow">
          <b>취향 맞추기</b>
          <small>오늘 ${tasteCount}/${tasteMax}${role === 'child' ? ' · 답이 사용 설명서 성향에 쌓여' : ' · 같은 문제에 자녀 답이 같이 보여요'}</small>
        </div>
        <span class="chev">${ic('chev', 20)}</span>
      </button>

      <button class="ax-row" onclick="location.href='quiz.html'">
        <div class="ax-row-icon">${ic('chat', 24)}</div>
        <div class="grow">
          <b>${result?.type ? this._esc(result.type) : '대화 유형 검사'}</b>
          <small>${theirType ? `${otherLabel}: ${this._esc(theirType)}` : result?.type ? tone('다시 할 수 있어요', '다시 할 수 있어') : tone('20문항, 5분', '20문항, 5분')}</small>
        </div>
        <span class="chev">${ic('chev', 20)}</span>
      </button>`;
  },
};

window.KyncActivity = KyncActivity;
