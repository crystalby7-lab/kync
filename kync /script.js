/* ════════════════════════════════════════════════════════════════
   kync-core.js  — Kync 핵심 기술 엔진 (기존 script.js 보완/확장)
 
   [1] 비동기 상호 잠금 해제  (Mutual Async Disclosure)
   [2] AI 감정 번역          (NLP 맥락 분석 시뮬레이션)
   [3] 쌍방 합의 퀘스트 엔진  (Consent-based Action Engine)
   [4] 게이미피케이션         (포인트 · 레벨 · 배지)
   [5] 감정 상세 기록         (8종 · 강도 슬라이더 · 메모)
════════════════════════════════════════════════════════════════ */
 
/* ──────────────────────────────────────────
   데이터 상수
────────────────────────────────────────── */
const QUESTIONS = [
  "오늘 하루 중 가장 기억에 남는 순간은 언제인가요?",
  "요즘 가장 힘든 게 뭐예요?",
  "오늘 딱 한 가지만 잘됐다면?",
  "지금 나한테 가장 듣고 싶은 말이 뭐야?",
  "요즘 우리 사이가 어떤 것 같아?",
  "지금 가장 무서운 게 뭐야?",
  "요즘 나한테 미안한 게 있어?",
  "내가 몰랐으면 하는 게 있어?",
];
 
const PARENT_AI_ANSWERS = [
  "퇴근하고 차 안에 잠깐 혼자 있을 때. 그때 네 생각 많이 해.",
  "네가 힘든 걸 내가 모르고 있을까 봐.",
  "오늘 아침 네가 밥 먹는 거 봤을 때.",
  "그냥 잘하고 있다고. 정말로.",
  "더 자주 얘기 나눌 수 있었으면 해.",
  "네가 힘든 걸 내가 모르고 있을까 봐.",
  "자꾸 물어보는 거. 미안해. 답답해서 그런 거야.",
  "다 알고 싶은 게 아니라, 그냥 네 편이고 싶어.",
];
 
const CHILD_AI_ANSWERS = [
  "수학 문제 하나를 드디어 혼자 풀었어요. 별거 아닌데 뿌듯했어요.",
  "수능 망치는 것보다 엄마 아빠 실망시키는 게 더 무서워요.",
  "모의고사 망했는데 그냥 덤덤했어요. 그게 더 무서웠어요.",
  "그냥 잘하고 있다고. 결과가 아니라 지금 이 순간이요.",
  "좀 멀어진 것 같아요. 제 탓인 것 같아서 미안해요.",
  "수능 망치는 것. 근데 더 무서운 건 혼자 감당하는 거예요.",
  "짜증 냈던 거요. 뭐라 해도 퉁명스럽게 대답해서 미안해요.",
  "성적이 생각보다 많이 안 나왔어요. 말하기 싫었던 것뿐이에요.",
];
 
/* AI 번역 가이드 — 부모용 */
const AI_GUIDES_PARENT = [
  "자녀의 말투는 짧지만, 연결되고 싶어 하는 에너지가 느껴져요. '오늘 고생했어'라는 격려로 대화를 시작해보세요.",
  "자녀가 많이 지쳐있어요. 오늘은 먼저 말 걸지 않고, 좋아하는 간식을 조용히 두고 오는 건 어떨까요?",
  "자녀의 뿌듯함 뒤에 '인정받고 싶다'는 마음이 있어요. '그거 혼자 해냈구나, 대단하다'고 말해주세요.",
  "자녀는 결과보다 과정을 인정받고 싶어 해요. '잘하고 있어'보다 '열심히 하는 거 보여'가 더 닿아요.",
  "자녀도 거리를 느끼고 있어요. 먼저 공통 관심사 얘기로 가볍게 시작해보세요.",
  "자녀는 두려움을 숨기고 있어요. '실망 안 해'보다 '네가 먼저야'라는 말이 더 필요해요.",
  "자녀도 미안함을 느끼고 있어요. '괜찮아'보다 '그럴 수 있어'가 더 편하게 만들어줄 수 있어요.",
  "자녀가 결과를 숨겼던 건 실망시킬까 봐였어요. '결과보다 네가 더 중요해'라고 먼저 말해줄 수 있어요.",
];
 
/* AI 번역 가이드 — 자녀용 */
const AI_GUIDES_CHILD = [
  "부모님도 당신 생각을 많이 하고 있어요. 짧게라도 오늘 하루 얘기 꺼내면 어떨까요?",
  "부모님의 걱정은 모르는 것에서 오는 두려움이에요. 조금만 알려줘도 많이 달라져요.",
  "부모님도 작은 것에서 기쁨을 찾고 있어요. 같이 잘됐다고 말해줄 수 있어요.",
  "부모님도 당신에게 그 말을 하고 싶어 해요. 먼저 말하면 돌아와요.",
  "부모님도 더 가까워지고 싶어해요. 작은 얘기부터 시작해봐요.",
  "부모님의 가장 큰 걱정은 당신이 혼자 감당할까 봐예요.",
  "부모님도 질문이 부담인 걸 알아요. '그냥 궁금해서'라는 마음이에요.",
  "부모님은 결과보다 당신 편이에요. 말하면 훨씬 가벼워질 수 있어요.",
];
 
/* 감정 8종 */
const EMOTIONS_8 = [
  { id:'happy',   icon:'', label:'평온/기쁨',   color:'#FFD700' },
  { id:'proud',   icon:'', label:'뿌듯함',      color:'#FFA500' },
  { id:'touched', icon:'', label:'감동/감사',   color:'#FFB6C1' },
  { id:'tired',   icon:'', label:'지침/피로',   color:'#A9A9A9' },
  { id:'sad',     icon:'', label:'속상함/우울', color:'#87CEEB' },
  { id:'angry',   icon:'', label:'화남/억울',   color:'#FF4500' },
  { id:'anxious', icon:'', label:'불안/걱정',   color:'#9370DB' },
  { id:'lonely',  icon:'', label:'외로움',      color:'#4682B4' },
];
 
/* 레벨 정의 */
const LEVELS = [
  { name:'씨앗',    min:0,    max:200,  next:'새싹' },
  { name:'새싹',    min:200,  max:500,  next:'나뭇잎' },
  { name:'나뭇잎',  min:500,  max:1000, next:'가지' },
  { name:'가지',    min:1000, max:2000, next:'나무' },
  { name:'나무',    min:2000, max:5000, next:'큰 나무' },
  { name:'큰 나무', min:5000, max:9999, next:'숲' },
];
 
/* 배지 정의 */
const BADGES = [
  { id:'first_answer', label:'첫 답변',   cond: h => h.filter(i=>i.type==='answer').length >= 1 },
  { id:'week_streak',  label:'7일 연속',  cond: _ => false }, // 실제 구현 시 날짜 체크
  { id:'empath',       label:'공감왕',    cond: h => h.filter(i=>i.type==='answer').length >= 10 },
  { id:'diarist',      label:'일기장',    cond: h => h.filter(i=>i.type==='diary').length >= 5 },
  { id:'quest_done',   label:'퀘스트 완료', cond: _ => {
    const qs = JSON.parse(localStorage.getItem('kync_quests')||'[]');
    return qs.some(q=>q.status==='completed');
  }},
];
 
/* 샘플 퀘스트 */
const SAMPLE_QUESTS = [
  {
    id: 1,
    title: '하루 한 번, 안부만 묻기',
    desc: '공부나 성적 얘기 없이, "오늘 어때?"만 한 번 건네봐요. 30일간 매일.',
    duration: 30,
    startDate: null,
    status: 'pending',
    agreed: { parent: false, child: false },
    progress: 0,
  },
  {
    id: 2,
    title: '저녁 식사 중 스마트폰 내려놓기',
    desc: '식사 시간 20분만, 스마트폰 없이 같은 공간에 있어봐요. 2주간.',
    duration: 14,
    startDate: null,
    status: 'pending',
    agreed: { parent: false, child: false },
    progress: 0,
  },
  {
    id: 3,
    title: '주 1회 칭찬 카드 보내기',
    desc: '결과가 아닌 노력에 대한 한마디를 매주 한 번 전해봐요.',
    duration: 28,
    startDate: null,
    status: 'pending',
    agreed: { parent: false, child: false },
    progress: 0,
  },
];
 
/* ──────────────────────────────────────────
   상태
────────────────────────────────────────── */
const KyncState = {
  role:            localStorage.getItem('kync_role') || 'parent',
  selectedEmotion: null,
  selectedDiaryEmotion: null,
  points:          parseInt(localStorage.getItem('kync_points') || '0'),
  qIdx:            Math.floor(Date.now() / 86400000) % QUESTIONS.length,
};
 
function getHistory()  { return JSON.parse(localStorage.getItem('kync_history')  || '[]'); }
function saveHistory(h){ localStorage.setItem('kync_history', JSON.stringify(h)); }
function getQuests()   { return JSON.parse(localStorage.getItem('kync_quests')   || JSON.stringify(SAMPLE_QUESTS)); }
function saveQuests(q) { localStorage.setItem('kync_quests', JSON.stringify(q)); }
 
/* ──────────────────────────────────────────
   App 객체 (기존 script.js의 App 확장)
────────────────────────────────────────── */
const App = {
 
  /* ── 초기화 ── */
 
  /* ── 퀴즈에서 돌아온 경우 역할 페이지 바로 표시 ── */
  _restoreFromQuiz() {
    const savedRole = localStorage.getItem('kync_role');
    if (savedRole && (savedRole === 'parent' || savedRole === 'child')) {
      const activePage = document.querySelector('.page.active');
      if (activePage && activePage.id === 'page-login') {
        // 로그인 상태였으면 onboard로
        this.go('page-onboard');
      }
    }
  },
 
  init() {
    this._restoreFromQuiz();
    this._setDates();
    this._setQuestion();
    this._renderEmotionGrid();
    this._renderDiaryEmotionRow();
    this._renderQuests();
    this._renderHistory();
    this._checkMutualUnlock();
    this._renderLevelCard();
    this._renderFamilyList();
    this._syncPointBadge();
    this._setupTextareaCounter('p-myAnswer', 'p-charCount');
    this._setupTextareaCounter('c-myAnswer', 'c-charCount');
    document.getElementById('p-submitAnswer')?.addEventListener('click', () => this.submitAnswer('parent'));
    document.getElementById('c-submitAnswer')?.addEventListener('click', () => this.submitAnswer('child'));
  },
 
  /* ── 페이지 이동 ── */
  go(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId)?.classList.add('active');
  },
 
  setRole(role) {
    KyncState.role = role;
    localStorage.setItem('kync_role', role);
    this.go(`page-${role}`);
  },
 
  /* ── 날짜 / 질문 ── */
  _setDates() {
    const now  = new Date();
    const days = ['일','월','화','수','목','금','토'];
    const str  = `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일 ${days[now.getDay()]}요일`;
    const pDate = document.getElementById('p-todayDate');
    const cDate = document.getElementById('c-todayDate');
    if (pDate) pDate.textContent = str;
    if (cDate) cDate.textContent = str;
 
    const joined = parseInt(localStorage.getItem('kync_joined') || String(Date.now()));
    if (!localStorage.getItem('kync_joined')) localStorage.setItem('kync_joined', String(joined));
    const days_connected = Math.floor((Date.now() - joined) / 86400000) + 1;
    ['p-day-badge','c-day-badge'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = `DAY ${days_connected}`;
    });
    const pDays = document.getElementById('p-days');
    const cDays = document.getElementById('c-days');
    if (pDays) pDays.textContent = days_connected;
    if (cDays) cDays.textContent = days_connected;
  },
 
  _setQuestion() {
    const q = QUESTIONS[KyncState.qIdx];
    ['p-questionText','c-questionText'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = q;
    });
  },
 
  /* ── 텍스트에어리어 카운터 ── */
  _setupTextareaCounter(textareaId, countId) {
    const ta = document.getElementById(textareaId);
    const ct = document.getElementById(countId);
    if (!ta || !ct) return;
    ta.addEventListener('input', () => { ct.textContent = ta.value.length; });
  },
 
  /* ════════════════════════════════════════
     [1] 비동기 상호 잠금 해제
  ════════════════════════════════════════ */
  _checkMutualUnlock() {
    const history = getHistory();
    const todayStr = new Date().toLocaleDateString('ko-KR');
    const pAnswer = history.find(h => h.date === todayStr && h.role === 'parent' && h.type === 'answer');
    const cAnswer = history.find(h => h.date === todayStr && h.role === 'child' && h.type === 'answer');
    const bothAnswered = !!(pAnswer && cAnswer);
 
    // 부모 화면: 자녀 답변 공개 여부
    const pWrap = document.getElementById('p-opponent-wrap');
    if (pWrap) {
      if (bothAnswered && cAnswer) {
        pWrap.innerHTML = this._buildRevealedBox('자녀 답변', cAnswer.content, AI_GUIDES_PARENT[KyncState.qIdx]);
      } else if (pAnswer) {
        pWrap.innerHTML = `<div class="locked-box"><div class="lock-icon-wrap">—</div><div class="locked-desc"><strong>자녀 답변</strong><span>자녀가 답변하면 공개돼요</span></div></div>`;
      }
    }
 
    // 자녀 화면: 부모 답변 공개 여부
    const cWrap = document.getElementById('c-opponent-wrap');
    if (cWrap) {
      if (bothAnswered && pAnswer) {
        cWrap.innerHTML = this._buildRevealedBox('부모님 답변', pAnswer.content, AI_GUIDES_CHILD[KyncState.qIdx]);
      } else if (cAnswer) {
        cWrap.innerHTML = `<div class="locked-box"><div class="lock-icon-wrap">—</div><div class="locked-desc"><strong>부모님 답변</strong><span>부모님이 답변하면 공개돼요</span></div></div>`;
      }
    }
 
    // 부모 화면: 자녀 체크인 상태 업데이트
    const checkin = history.find(h => h.date === todayStr && h.role === 'child' && h.type === 'checkin');
    if (checkin) this._updateChildStatus(checkin);
  },
 
  /* ════════════════════════════════════════
     [2] AI 감정 번역 박스 생성
  ════════════════════════════════════════ */
  _buildRevealedBox(label, content, guide) {
    return `
      <div class="revealed-wrap">
        <div class="revealed-answer-header">${label}</div>
        <div class="revealed-answer-body">${content}</div>
        <div class="ai-guide-box">
          <strong>AI 번역 가이드</strong>
          ${guide}
        </div>
      </div>`;
  },
 
  /* 자녀 체크인 → 부모 상태 카드 업데이트 */
  _updateChildStatus(checkin) {
    const emo = EMOTIONS_8.find(e => e.id === checkin.emotion);
    const stress = checkin.stress || 5;
    const energy = checkin.energy || 5;
 
    const dotEl  = document.getElementById('p-status-dot');
    const descEl = document.getElementById('p-child-desc');
    const moodEl = document.getElementById('p-stat-mood');
    const strEl  = document.getElementById('p-stat-stress');
    const engEl  = document.getElementById('p-stat-energy');
 
    if (dotEl) {
      dotEl.className = 'status-indicator ' + (stress >= 7 ? 'ind-high' : stress >= 4 ? 'ind-mid' : 'ind-low');
    }
    if (moodEl)  moodEl.textContent  = emo ? `${emo.icon} ${emo.label}` : '—';
    if (strEl)   strEl.textContent   = `${stress}/10`;
    if (engEl)   engEl.textContent   = `${energy}/10`;
    if (descEl) {
      const stressText = stress >= 7 ? '많이 지쳐있어요. 오늘은 먼저 말 걸지 않는 게 좋아요.' :
                         stress >= 4 ? '약간의 스트레스가 있지만 괜찮아요.' : '오늘 전반적으로 안정적이에요.';
      descEl.textContent = stressText;
      if (checkin.memo) descEl.textContent += ` "${checkin.memo}"`;
    }
  },
 
  /* ════════════════════════════════════════
     [3] 쌍방 합의 퀘스트 엔진
  ════════════════════════════════════════ */
  _renderQuests() {
    const quests = getQuests();
    ['p-quest-list','c-quest-list'].forEach(listId => {
      const el = document.getElementById(listId);
      if (!el) return;
      if (!quests.length) {
        el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">◌</div>아직 퀘스트가 없어요.<br>AI 분석 후 맞춤 퀘스트가 생성돼요.</div>`;
        return;
      }
      el.innerHTML = quests.map(q => this._buildQuestCard(q)).join('');
    });
  },
 
  _buildQuestCard(q) {
    const statusLabel = q.status === 'active' ? '진행 중' : q.status === 'completed' ? '완료' : '동의 대기';
    const statusClass = q.status === 'active' ? 'badge-active' : q.status === 'completed' ? 'badge-done' : 'badge-pending';
    const cardClass   = q.status === 'active' ? 'active-quest' : q.status === 'completed' ? 'completed-quest' : 'pending-quest';
 
    const progressPct = q.status === 'active' ? Math.min(100, Math.round((q.progress / q.duration) * 100)) : 0;
 
    const myRole = KyncState.role;
    const myAgreed = q.agreed[myRole];
    const bothAgreed = q.agreed.parent && q.agreed.child;
 
    const activeCount = getQuests().filter(qt => qt.status === 'active').length;
    const canConsent  = !myAgreed && q.status === 'pending' && activeCount < 2;
 
    const consentSection = q.status === 'pending' ? `
      <div class="consent-row" style="margin-top:12px;margin-bottom:4px;">
        <div class="consent-dot ${q.agreed.parent ? 'agreed' : 'waiting'}"></div>
        <span class="consent-text">부모 ${q.agreed.parent ? '✓ 동의' : '대기 중'}</span>
        <div class="consent-dot ${q.agreed.child ? 'agreed' : 'waiting'}" style="margin-left:12px;"></div>
        <span class="consent-text">자녀 ${q.agreed.child ? '✓ 동의' : '대기 중'}</span>
      </div>
      <button class="consent-btn ${myAgreed ? 'signed' : ''}"
        onclick="App.handleQuestConsent(${q.id})"
        ${!canConsent && !myAgreed ? 'disabled' : ''}>
        ${myAgreed ? '✓ 동의 완료' : canConsent ? '디지털 서명으로 동의하기' : activeCount >= 2 ? '진행 중인 퀘스트 완료 후 가능' : '상대방 동의 대기 중'}
      </button>` : '';
 
    const progressSection = q.status === 'active' ? `
      <div class="quest-progress-wrap">
        <div class="quest-progress-label">
          <span>진행도</span>
          <span>${q.progress}/${q.duration}일</span>
        </div>
        <div class="quest-progress-bg">
          <div class="quest-progress-fill" style="width:${progressPct}%"></div>
        </div>
      </div>` : '';
 
    return `
      <div class="quest-card ${cardClass}">
        <div class="quest-status-row">
          <span class="quest-status-badge ${statusClass}">${statusLabel}</span>
          <span class="quest-days-left">${q.duration}일 퀘스트</span>
        </div>
        <div class="quest-title">${q.title}</div>
        <div class="quest-desc">${q.desc}</div>
        ${consentSection}
        ${progressSection}
      </div>`;
  },
 
  handleQuestConsent(questId) {
    const quests = getQuests();
    const quest  = quests.find(q => q.id === questId);
    if (!quest || quest.status !== 'pending') return;
 
    const activeCount = quests.filter(q => q.status === 'active').length;
    if (activeCount >= 2 && !quest.agreed[KyncState.role]) {
      alert('동시에 진행할 수 있는 퀘스트는 최대 2개예요. 진행 중인 퀘스트를 먼저 완료해주세요.');
      return;
    }
 
    quest.agreed[KyncState.role] = true;
    this._showPointPopup('+30 pt 동의 포인트!');
    this._addPoints(30);
 
    if (quest.agreed.parent && quest.agreed.child) {
      quest.status = 'active';
      quest.startDate = new Date().toLocaleDateString('ko-KR');
      quest.progress = 0;
      alert(`🤝 쌍방 합의 완료!\n"${quest.title}" 퀘스트가 시작됩니다.`);
      this._addPoints(50);
      this._showPointPopup('+50 pt 퀘스트 시작!');
    } else {
      alert('동의했어요! 상대방의 동의를 기다리고 있어요. 디지털 서명이 완료됐습니다.');
    }
 
    saveQuests(quests);
    this._renderQuests();
    this._renderLevelCard();
  },
 
  /* ════════════════════════════════════════
     [5] 감정 상세 기록
  ════════════════════════════════════════ */
  _renderEmotionGrid() {
    const grid = document.getElementById('c-emotionGrid');
    if (!grid) return;
    grid.innerHTML = EMOTIONS_8.map(e => `
      <div class="emo-btn-8" data-id="${e.id}" onclick="App._selectEmotion('${e.id}', this)">
        <div class="emo-icon-8">${e.icon}</div>
        <div class="emo-label-8">${e.label}</div>
      </div>`).join('');
  },
 
  _renderDiaryEmotionRow() {
    const row = document.getElementById('c-diaryEmotionRow');
    if (!row) return;
    const four = EMOTIONS_8.slice(0,4);
    row.innerHTML = four.map(e => `
      <div class="diary-emo-btn" data-id="${e.id}" onclick="App._selectDiaryEmotion('${e.id}', this)">
        <div class="diary-emo-icon">${e.icon}</div>
        <span>${e.label}</span>
      </div>`).join('');
  },
 
  _selectEmotion(id, btn) {
    KyncState.selectedEmotion = id;
    document.querySelectorAll('#c-emotionGrid .emo-btn-8').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  },
 
  _selectDiaryEmotion(id, btn) {
    KyncState.selectedDiaryEmotion = id;
    document.querySelectorAll('#c-diaryEmotionRow .diary-emo-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  },
 
  /* 체크인 저장 */
  saveCheckin() {
    if (!KyncState.selectedEmotion) {
      alert('감정을 먼저 선택해줘!');
      return;
    }
    const stress = parseInt(document.getElementById('c-stressSlider')?.value || '5');
    const energy = parseInt(document.getElementById('c-energySlider')?.value || '5');
    const memo   = document.getElementById('c-emotionMemo')?.value.trim() || '';
 
    const history = getHistory();
    const todayStr = new Date().toLocaleDateString('ko-KR');
    const existing = history.findIndex(h => h.date === todayStr && h.type === 'checkin' && h.role === 'child');
    const entry = {
      id: Date.now(), date: todayStr, role: 'child', type: 'checkin',
      emotion: KyncState.selectedEmotion, stress, energy, memo,
    };
    if (existing >= 0) history[existing] = entry;
    else history.unshift(entry);
    saveHistory(history);
 
    this._addPoints(20);
    this._showPointPopup('+20 pt 체크인 완료!');
 
    // 체크인 카드를 완료 배너로 교체
    const card = document.querySelector('.checkin-card');
    if (card) {
      const emo = EMOTIONS_8.find(e => e.id === KyncState.selectedEmotion);
      card.innerHTML = `
        <div class="checkin-done-banner">
          <div class="checkin-done-icon">${emo ? emo.icon : '✓'}</div>
          <div>
            <div style="font-weight:800;margin-bottom:2px;">오늘 체크인 완료!</div>
            <div style="font-size:12px;opacity:0.75;">${emo ? emo.label : ''} · 스트레스 ${stress}/10 · 에너지 ${energy}/10${memo ? ` · "${memo}"` : ''}</div>
          </div>
        </div>`;
    }
 
    this._checkMutualUnlock();
    this._renderHistory();
    this._renderLevelCard();
  },
 
  /* ── 답변 제출 ── */
  submitAnswer(role) {
    const prefix = role === 'parent' ? 'p' : 'c';
    const ta = document.getElementById(`${prefix}-myAnswer`);
    if (!ta || !ta.value.trim()) { alert('내용을 입력해주세요!'); return; }
 
    const history = getHistory();
    const todayStr = new Date().toLocaleDateString('ko-KR');
    const existing = history.findIndex(h => h.date === todayStr && h.type === 'answer' && h.role === role);
    const entry = {
      id: Date.now(), date: todayStr, role,
      type: 'answer', content: ta.value.trim(),
      question: QUESTIONS[KyncState.qIdx],
    };
    if (existing >= 0) history[existing] = entry;
    else history.unshift(entry);
    saveHistory(history);
 
    ta.value = '';
    const countId = prefix === 'p' ? 'p-charCount' : 'c-charCount';
    const countEl = document.getElementById(countId);
    if (countEl) countEl.textContent = '0';
 
    const submitBtn = document.getElementById(`${prefix}-submitAnswer`);
    if (submitBtn) { submitBtn.textContent = '✓ 답변 완료!'; submitBtn.disabled = true; }
 
    const wrap = document.getElementById(`${prefix}-answer-wrap`);
    if (wrap) wrap.style.opacity = '0.5';
 
    this._addPoints(50);
    this._showPointPopup('+50 pt 답변 완료!');
    this._checkMutualUnlock();
    this._renderHistory();
    this._renderLevelCard();
  },
 
  /* ── 일기 저장 ── */
  saveDiary() {
    const content = document.getElementById('c-diaryInput')?.value.trim();
    if (!content) { alert('내용을 입력해줘!'); return; }
    const history = getHistory();
    history.unshift({
      id: Date.now(),
      date: new Date().toLocaleDateString('ko-KR'),
      role: 'child', type: 'diary',
      content,
      emotion: KyncState.selectedDiaryEmotion,
    });
    saveHistory(history);
    document.getElementById('c-diaryInput').value = '';
 
    this._addPoints(20);
    this._showPointPopup('+20 pt 일기 저장!');
    this._renderHistory();
    this._renderLevelCard();
    alert('나만의 비밀 일기가 저장됐어. 🔒');
  },
 
  /* ── 기록 렌더 ── */
  _renderHistory() {
    const history = getHistory();
    const pList = document.getElementById('p-historyList');
    const pCount = document.getElementById('p-historyCount');
    const cDiaryList = document.getElementById('c-diaryList');
 
    const answers = history.filter(h => h.type === 'answer' || h.type === 'checkin');
    if (pList) {
      pList.innerHTML = answers.length
        ? answers.map(h => this._buildHistoryCard(h)).join('')
        : `<div class="empty-state"><div class="empty-state-icon">◈</div>아직 기록이 없어요.<br>오늘 첫 답변을 남겨봐요.</div>`;
      if (pCount) pCount.textContent = `${answers.length}개의 기록이 쌓였어요`;
    }
 
    const diaries = history.filter(h => h.type === 'diary');
    if (cDiaryList) {
      cDiaryList.innerHTML = diaries.length
        ? diaries.map(h => this._buildHistoryCard(h)).join('')
        : `<div class="empty-state"><div class="empty-state-icon">◈</div>아직 일기가 없어요.</div>`;
    }
  },
 
  _buildHistoryCard(item) {
    const emo = EMOTIONS_8.find(e => e.id === item.emotion);
    const borderColor = emo ? emo.color : 'var(--border)';
    const typeTag = item.type === 'answer' ? '<span class="h-type-tag tag-answer">답변</span>'
                  : item.type === 'diary'  ? '<span class="h-type-tag tag-diary">일기</span>'
                  : '<span class="h-type-tag tag-checkin">체크인</span>';
 
    let emotionRow = '';
    if (emo) {
      emotionRow = `<div class="h-emotion-row">
        <div class="h-emo-icon">${emo.icon}</div>
        <div class="h-emo-label">${emo.label}</div>
        ${item.stress ? `<div class="h-emo-stress">스트레스 ${item.stress}/10</div>` : ''}
      </div>`;
      if (item.memo) emotionRow += `<div class="h-emo-memo">"${item.memo}"</div>`;
    }
 
    const mainContent = item.type === 'checkin'
      ? `${emotionRow}${item.energy ? `<div style="font-size:13px;color:var(--text2);">에너지 ${item.energy}/10</div>` : ''}`
      : `${emotionRow}<div class="h-question" style="font-size:13px;color:var(--text3);margin-bottom:6px;">${item.question || ''}</div>
         <div class="h-question">${item.content}</div>`;
 
    return `
      <div class="history-item" style="border-left:4px solid ${borderColor};">
        <div class="h-date">${item.date}</div>
        ${mainContent}
        ${typeTag}
      </div>`;
  },
 
  /* ════════════════════════════════════════
     [4] 게이미피케이션
  ════════════════════════════════════════ */
  _addPoints(amount) {
    KyncState.points += amount;
    localStorage.setItem('kync_points', String(KyncState.points));
    this._syncPointBadge();
  },
 
  _syncPointBadge() {
    ['p-points-badge','c-points-badge'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = `${KyncState.points} pt`;
      el.classList.add('bump');
      setTimeout(() => el.classList.remove('bump'), 400);
    });
  },
 
  _showPointPopup(text) {
    const existing = document.querySelector('.point-popup');
    if (existing) existing.remove();
    const popup = document.createElement('div');
    popup.className = 'point-popup';
    popup.textContent = text;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 2200);
  },
 
  _getLevel() {
    const pts = KyncState.points;
    return LEVELS.find(l => pts >= l.min && pts < l.max) || LEVELS[LEVELS.length - 1];
  },
 
  _renderLevelCard() {
    const level = this._getLevel();
    const history = getHistory();
    const pct = Math.min(100, Math.round(((KyncState.points - level.min) / (level.max - level.min)) * 100));
 
    const earnedBadges = BADGES.filter(b => b.cond(history));
 
    const html = `
      <div class="level-card">
        <div class="level-top">
          <div class="level-name">Lv. ${level.name}</div>
          <div class="level-pts">${KyncState.points} pt</div>
        </div>
        <div class="level-bar-bg"><div class="level-bar-fill" style="width:${pct}%"></div></div>
        <div class="level-sub">${level.next}까지 ${level.max - KyncState.points}pt 남았어요</div>
        ${earnedBadges.length ? `<div class="badge-row">${earnedBadges.map(b=>`<div class="badge-chip earned">${b.label}</div>`).join('')}</div>` : ''}
      </div>`;
 
    const pCard = document.getElementById('p-level-card');
    const cCard = document.getElementById('c-level-card');
    if (pCard) pCard.outerHTML = `<div id="p-level-card">${html}</div>`.replace('<div id="p-level-card"><div class="level-card">', '<div id="p-level-card"><div class="level-card">');
    if (cCard) cCard.innerHTML = html;
 
    // 직접 교체
    ['p-level-card','c-level-card'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `
        <div class="level-top">
          <div class="level-name">Lv. ${level.name}</div>
          <div class="level-pts">${KyncState.points} pt</div>
        </div>
        <div class="level-bar-bg"><div class="level-bar-fill" style="width:${pct}%"></div></div>
        <div class="level-sub">${level.next}까지 ${level.max - KyncState.points}pt 남았어요</div>
        ${earnedBadges.length ? `<div class="badge-row">${earnedBadges.map(b=>`<div class="badge-chip earned">${b.label}</div>`).join('')}</div>` : ''}`;
    });
  },
 
  /* ── 가족 목록 ── */
  _renderFamilyList() {
    const data = [
      { initial:'엄', name:'엄마', status:'오늘 답변 완료', done: true },
      { initial:'아', name:'아빠', status:'아직 미답변', done: false },
    ];
    ['p-familyList','c-familyList'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = data.map(f => `
        <div class="family-row">
          <div class="family-avatar">${f.initial}</div>
          <div>
            <div class="family-name">${f.name}</div>
            <div class="family-status">${f.status}</div>
          </div>
          <div class="status-dot ${f.done ? 'on' : 'off'}"></div>
        </div>`).join('');
    });
  },
 
  /* ── 코드 복사 ── */
  copyCode(btn) {
    navigator.clipboard?.writeText('KY92').catch(() => {});
    btn.textContent = '복사됐어요!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = '코드 복사하기'; btn.classList.remove('copied'); }, 2000);
  },
};
 
document.addEventListener('DOMContentLoaded', () => App.init());