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
        ${KyncBrand.mascot('wow', 84, { role: 'child', cls: 'ax-hero-char' })}
        <div class="ax-hero-label">나 사용 설명서</div>
        <div class="ax-hero-q">내 기록으로 정리한 나</div>
        <div class="ax-hero-sub">기분, 에너지, 성향, 대화하는 법. 부모님께 보여줄 건 항목마다 직접 고르면 돼.</div>
        <div class="ax-hero-cta">열기${ic('chev', 16)}</div>
      </button>` : `
      <button class="ax-hero" onclick="selectTab('p-todayTab'); setTimeout(() => document.getElementById('p-manual-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)">
        ${KyncBrand.mascot('default', 80, { role: 'child', cls: 'ax-hero-char' })}
        <div class="ax-hero-label">아이의 사용 설명서</div>
        <div class="ax-hero-q">${shared ? `공개된 항목 ${shared}개` : '아직 공개된 항목 없음'}</div>
        <div class="ax-hero-sub">아이가 직접 공개한 항목만 오늘 탭에 보여요.</div>
        ${shared ? `<div class="ax-hero-cta">보기${ic('chev', 16)}</div>` : ''}
      </button>`;

    el.innerHTML = `
      <div class="qx-section">나를 알기</div>
      ${hero}

      <div class="qx-section">오늘 해볼 것</div>
      <div class="ax-tiles">
        ${role === 'child' ? (() => {
          const wc = KyncJournal.weekCount();
          return `
        <button class="ax-card honey" onclick="KyncJournal.open()">
          <div class="ax-card-top"><b>일기</b><span class="ax-card-sub">이번 주</span></div>
          <div class="ax-dots">${[0, 1, 2].map(i => `<i class="${i < wc ? 'on' : ''}"></i>`).join('')}<em>${wc}/3</em></div>
          ${KyncBrand.mascot('sleepy', 74, { role: 'child', cls: 'ax-card-char' })}
          <div class="ax-card-cta">${wc >= 3 ? '이번 주 다 썼어' : '쓰러 가기'}${ic('chev', 15)}</div>
        </button>`;
        })() : `
        <button class="ax-card honey" onclick="selectTab('p-todayTab'); setTimeout(() => document.getElementById('p-journal-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)">
          <div class="ax-card-top"><b>아이가 보낸 일기</b></div>
          <div class="ax-big">${(KyncJournal._sharedDocs || []).length}<small>개</small></div>
          ${KyncBrand.mascot('work', 74, { role: 'parent', cls: 'ax-card-char' })}
          <div class="ax-card-cta">보기${ic('chev', 15)}</div>
        </button>`}
        <button class="ax-card moss" onclick="location.href='activity-balance.html'">
          <div class="ax-card-top"><b>취향 맞추기</b><span class="ax-card-sub">오늘</span></div>
          <div class="ax-big">${tasteCount}<small>/${tasteMax}</small></div>
          <div class="ax-bar"><i style="width:${Math.round(tasteCount / tasteMax * 100)}%"></i></div>
          ${KyncBrand.mascot('happy', 70, { cls: 'ax-card-char' })}
          <div class="ax-card-cta">${tasteCount >= tasteMax ? '오늘 끝' : tasteCount ? '이어서' : '시작'}${ic('chev', 15)}</div>
        </button>
      </div>

      <button class="ax-card sky wide" onclick="location.href='quiz.html'">
        <div class="ax-card-top"><b>대화 유형 검사</b><span class="ax-card-sub">20문항 · 5분</span></div>
        <div class="ax-types">
          <div><small>나</small><b>${result?.type ? this._esc(result.type) : '아직'}</b></div>
          <div><small>${otherLabel}</small><b>${theirType ? this._esc(theirType) : '아직'}</b></div>
        </div>
        ${KyncBrand.pair(118, 'ax-card-char')}
        <div class="ax-card-cta">${result?.type ? tone('다시 하기', '다시 하기') : tone('검사하기', '검사하기')}${ic('chev', 15)}</div>
      </button>`;
  },
};

window.KyncActivity = KyncActivity;
