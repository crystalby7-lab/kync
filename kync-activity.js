/* ═══════════════════════════════════════════════════════════
   kync-activity.js — 활동 탭
   - 오늘의 활동: 밸런스 게임 / 취향 맞추기 / 서로 맞히기
   - 나를 알아보기: 대화 유형 검사
   - 각 카드에 오늘 진행 상태 표시 (이 기기에 저장된 값 기준)
   - 밸런스 게임 기록 키: kync_vs_{가족코드}_{날짜} (취향 맞추기와 키가 겹치지 않게)
═══════════════════════════════════════════════════════════ */

const KyncActivity = {

  _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[c]));
  },
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
    const day = localDayNum();
    const dateKey = new Date().toLocaleDateString('ko-KR');

    // 밸런스 게임
    const bq = KyncTogether.BALANCE_Q[day % KyncTogether.BALANCE_Q.length];
    const bs = this._read(`kync_vs_${fc}_${dateKey}`, {});
    const balance = !bs[role] ? { pill: '참여하기', cls: 'pill-honey' }
      : bs[other] ? { pill: '결과 공개', cls: 'pill-moss' } : { pill: `${otherLabel} 기다리는 중`, cls: 'pill-dark' };

    // 취향 맞추기
    const tasteCount = Object.keys(KyncBalance._getTodayState(fc).data.answers || {}).length;
    const tasteMax = KyncBalance.MAX_PER_DAY || 10;

    // 서로 맞히기
    const qIdx = Math.floor(day / 3) % KyncTogether.QUIZ_Q.length;
    const qq = KyncTogether.QUIZ_Q[qIdx];
    const qs = this._read(`kync_quiz_${fc}_w${Math.floor(day / 7)}_${qIdx}`, {});
    const quiz = !qs[`${role}_self`] ? '1단계, 내 답 쓰기'
      : !qs[`${role}_guess`] ? '2단계, 맞혀보기'
      : qs[`${other}_self`] ? '결과 보기' : `${otherLabel} 기다리는 중`;

    const result = this._read('kync_quiz_result', null);
    const tastePct = Math.round(tasteCount / tasteMax * 100);

    el.innerHTML = `
      <div class="qx-section">오늘의 활동</div>

      <button class="ax-hero" onclick="location.href='activity-together.html'">
        <div class="ax-hero-top">
          <span class="ax-hero-label">오늘의 밸런스 게임</span>
          <span class="pill ${balance.cls}">${balance.pill}</span>
        </div>
        <div class="ax-hero-q">${this._esc(bq.q)}</div>
        <div class="ax-hero-opts">
          ${bq.opts.map(o => `<span class="${bs[role] === o ? 'on' : ''}">${this._esc(o)}</span>`).join('')}
        </div>
      </button>

      <div class="ax-grid">
        <button class="ax-tile ax-taste" onclick="location.href='activity-balance.html'">
          <div class="ax-tile-label">취향 맞추기</div>
          <div class="ax-tile-num"><b>${tasteCount}</b> / ${tasteMax}</div>
          <div class="bar"><div style="width:${tastePct}%"></div></div>
          <div class="ax-tile-foot">${tasteCount >= tasteMax ? '오늘 완료' : tasteCount ? '이어하기' : '시작하기'}${ic('chev', 15)}</div>
        </button>
        <button class="ax-tile ax-guess" onclick="location.href='activity-quiz.html'">
          <div class="ax-tile-label">서로 맞히기</div>
          <div class="ax-tile-q">${this._esc(qq.q)}</div>
          <div class="ax-tile-foot">${quiz}${ic('chev', 15)}</div>
        </button>
      </div>

      <div class="qx-section">나를 알아보기</div>

      <button class="ax-row" onclick="location.href='quiz.html'">
        <div class="ax-row-icon">${ic('target', 24)}</div>
        <div class="grow">
          <b>${result?.type ? this._esc(result.type) : '대화 유형 검사'}</b>
          <small>${result?.type ? '내 대화 유형이에요. 다시 검사할 수 있어요.' : '20문항으로 알아보는 나의 대화 방식'}</small>
        </div>
        <span class="chev">${ic('chev', 20)}</span>
      </button>`;
  },
};

window.KyncActivity = KyncActivity;
