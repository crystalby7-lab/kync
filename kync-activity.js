/* ═══════════════════════════════════════════════════════════
   kync-activity.js — 활동 탭 (퀘스트 탭과 같은 카드 스타일)
   - 오늘의 활동: 밸런스 게임 / 취향 맞추기 / 서로 맞히기
   - 나를 알아보기: 대화 유형 검사
   - 각 카드에 오늘 진행 상태 표시 (이 기기에 저장된 값 기준)
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
    const bs = this._read(`kync_balance_${fc}_${dateKey}`, {});
    const balance = !bs[role]
      ? { pill: '참여하기', cls: 'todo' }
      : bs[other] ? { pill: '결과 공개', cls: 'done' } : { pill: `${otherLabel} 기다리는 중`, cls: 'wait' };

    // 취향 맞추기
    const tasteCount = Object.keys(KyncBalance._getTodayState(fc).data.answers || {}).length;
    const tasteMax = KyncBalance.MAX_PER_DAY || 10;

    // 서로 맞히기
    const qIdx = Math.floor(day / 3) % KyncTogether.QUIZ_Q.length;
    const qq = KyncTogether.QUIZ_Q[qIdx];
    const qs = this._read(`kync_quiz_${fc}_w${Math.floor(day / 7)}_${qIdx}`, {});
    const quiz = !qs[`${role}_self`] ? { pill: '1단계 · 내 답', cls: 'todo' }
      : !qs[`${role}_guess`] ? { pill: '2단계 · 맞히기', cls: 'todo' }
      : qs[`${other}_self`] ? { pill: '결과 공개', cls: 'done' } : { pill: `${otherLabel} 기다리는 중`, cls: 'wait' };

    // 대화 유형 검사
    const result = this._read('kync_quiz_result', null);

    el.innerHTML = `
      <div class="qx-section">오늘의 활동</div>

      <div class="qx-card ax-card" onclick="location.href='activity-together.html'">
        <div class="ax-top">
          <div class="qx-from">밸런스 게임</div>
          <span class="ax-pill ${balance.cls}">${balance.pill}</span>
        </div>
        <div class="qx-title">${this._esc(bq.q)}</div>
        <div class="qx-desc">각자 고르고 서로의 답을 비교해요</div>
      </div>

      <div class="qx-card ax-card" onclick="location.href='activity-balance.html'">
        <div class="ax-top">
          <div class="qx-from">취향 맞추기</div>
          <span class="ax-pill ${tasteCount >= tasteMax ? 'done' : 'todo'}">${tasteCount >= tasteMax ? '오늘 완료' : '이어하기'}</span>
        </div>
        <div class="qx-title">서로의 취향 알아가기</div>
        <div class="qx-progress-row"><span><b>${tasteCount}</b> / ${tasteMax}문제</span><span>하루 최대 ${tasteMax}문제</span></div>
        <div class="qx-bar"><div style="width:${Math.round(tasteCount / tasteMax * 100)}%"></div></div>
      </div>

      <div class="qx-card ax-card" onclick="location.href='activity-quiz.html'">
        <div class="ax-top">
          <div class="qx-from">서로 맞히기</div>
          <span class="ax-pill ${quiz.cls}">${quiz.pill}</span>
        </div>
        <div class="qx-title">${this._esc(qq.q)}</div>
        <div class="qx-desc">내 답을 적고 ${otherLabel}의 답을 예측해요</div>
      </div>

      <div class="qx-section">나를 알아보기</div>

      <div class="qx-card ax-card" onclick="location.href='quiz.html'">
        <div class="ax-top">
          <div class="qx-from">대화 유형 검사</div>
          <span class="ax-pill ${result?.type ? 'done' : 'todo'}">${result?.type ? '다시 하기' : '검사하기'}</span>
        </div>
        <div class="qx-title">${result?.type ? this._esc(result.type) : '나의 대화 유형은?'}</div>
        <div class="qx-desc">${result?.type ? this._esc(result.sub || '') : `20문항 · 4가지 기준으로 분석해요`}</div>
      </div>`;
  },
};

window.KyncActivity = KyncActivity;
