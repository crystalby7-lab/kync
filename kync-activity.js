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
    const balance = !bs[role] ? { pill: tone('고르기', '고르기'), cls: 'pill-honey' }
      : bs[other] ? { pill: tone('결과 나옴', '결과 나옴'), cls: 'pill-moss' } : { pill: `${otherLabel} 차례`, cls: 'pill-dark' };

    // 취향 맞추기
    const tasteCount = Object.keys(KyncBalance._getTodayState(fc).data.answers || {}).length;
    const tasteMax = KyncBalance.MAX_PER_DAY || 10;

    // 서로 맞히기
    const period = Math.floor(day / 3);
    const qq = KyncTogether.QUIZ_Q[period % KyncTogether.QUIZ_Q.length];
    const qs = this._read(`kync_quiz_${fc}_p${period}`, {});
    const quiz = !qs[`${role}_self`] ? '내 답 쓰기'
      : !qs[`${role}_guess`] ? `${otherLabel} 답 맞히기`
      : qs[`${other}_self`] ? '결과 보기' : `${otherLabel} 차례`;

    const result = this._read('kync_quiz_result', null);
    const myUid = KyncAuth?.current?.uid || localStorage.getItem('kync_user_uid');
    const theirType = Object.entries(KyncAccount?.family?.members || {}).find(([uid, m]) => uid !== myUid && m.role === other && m.talkType)?.[1]?.talkType;
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
          <div class="ax-tile-foot">${tasteCount >= tasteMax ? '오늘 끝' : tasteCount ? '이어서' : '시작'}${ic('chev', 15)}</div>
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
          <b>${result?.type ? `나는 ${this._esc(result.type)}` : '대화 유형 검사'}</b>
          <small>${theirType ? `${otherLabel}은(는) ${this._esc(theirType)}` : result?.type ? tone(`${otherLabel}이(가) 하면 여기 같이 떠요`, `${otherLabel}이 하면 여기 같이 떠`) : tone('20문항, 5분쯤 걸려요', '20문항, 5분쯤 걸려')}</small>
        </div>
        <span class="chev">${ic('chev', 20)}</span>
      </button>`;
  },
};

window.KyncActivity = KyncActivity;
