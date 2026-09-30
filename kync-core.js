/* ═══════════════════════════════════════════════════════════
   kync-core.js — Kync 앱 핵심 엔진
   화면 초기화, 질문 표시, 답변 제출, 체크인 등
   ★ 버그 수정:
     - 새로고침 시 자녀 화면에 오늘 체크인(기분·스트레스·활동·메모) 다시 불러오기
     - 부모 화면에 감정이 영어 id 대신 한글로 표시
     - init이 여러 번 호출돼도 버튼 이벤트·실시간 감시 중복 안 되게
     - 가족 연결 안 된 상태에서 저장하면 안내 (저장된 척하고 사라지는 문제)
     - 역할 정보 없을 때 에러로 멈추지 않게
═══════════════════════════════════════════════════════════ */

const App = {

  QUESTIONS: [
    '요즘 가장 행복한 순간은 언제야?',
    '지금 제일 걱정되는 게 뭐야?',
    '오늘 하루 중 가장 기억에 남는 장면은?',
    '요즘 나한테 필요한 게 뭔지 알아?',
    '최근에 누군가에게 고마웠던 순간이 있었어?',
    '지금 당장 가고 싶은 곳이 있어?',
    '요즘 나를 힘들게 하는 게 뭐야?',
    '가장 편하게 쉴 수 있는 방법이 뭐야?',
    '요즘 어떤 생각이 가장 많이 들어?',
    '내가 잘 하고 있다고 느끼는 부분이 있어?',
    '요즘 가장 듣고 싶은 말이 뭐야?',
    '오늘 하루를 한 마디로 표현하면?',
    '지금 이 순간 가장 원하는 게 뭐야?',
    '최근에 나 자신이 자랑스러웠던 순간이 있었어?',
    '요즘 무엇을 할 때 가장 나다운 것 같아?',
    '지금 가장 피하고 싶은 상황이 뭐야?',
    '최근에 뭔가 새롭게 도전해본 게 있어?',
    '나한테 가장 큰 힘이 되는 사람이 누구야?',
    '요즘 혼자만의 시간이 충분해?',
    '지금 내 마음 상태를 색깔로 표현하면 뭐야?',
    '오늘 잘한 일이 있다면 뭐야?',
    '요즘 아쉬운 점이 있다면?',
    '지금 가장 하고 싶은 말이 뭐야?',
    '최근에 웃었던 순간을 떠올려봐',
    '요즘 에너지가 충전되는 게 뭐야?',
    '오늘 감사한 것 하나만 말해줄 수 있어?',
    '지금 내 생각을 이해해주는 사람이 있다고 느껴?',
    '요즘 제일 신경 쓰이는 관계가 있어?',
    '내가 변하고 싶은 부분이 있다면?',
    '지금 이 순간 내 옆에 있어줬으면 하는 사람이 있어?',
  ],

  EMOTIONS_PARENT: [
    { id:'worried',  label:'걱정돼', color:'#e08060' },
    { id:'proud',    label:'뿌듯해', color:'#c17f4a' },
    { id:'happy',    label:'행복해', color:'#f0c040' },
    { id:'tired',    label:'지쳤어', color:'#b0b8c8' },
    { id:'lonely',   label:'외로워', color:'#9080a0' },
    { id:'grateful', label:'감사해', color:'#7ec8a0' },
    { id:'anxious',  label:'불안해', color:'#e06060' },
    { id:'calm',     label:'평온해', color:'#80a0c0' },
  ],

  EMOTIONS_CHILD: [
    { id:'stressed', label:'스트레스', color:'#e06060' },
    { id:'tired',    label:'피곤해',   color:'#b0b8c8' },
    { id:'happy',    label:'좋아',     color:'#f0c040' },
    { id:'anxious',  label:'불안해',   color:'#e08060' },
    { id:'sad',      label:'슬퍼',     color:'#8090c0' },
    { id:'calm',     label:'괜찮아',   color:'#7ec8a0' },
    { id:'angry',    label:'화나',     color:'#e05050' },
    { id:'lonely',   label:'외로워',   color:'#9080a0' },
  ],

  _selectedEmotion: null,

  // [추가] 중복 방지용
  _listenersReady: false,
  _todayUnsub: null,

  // [추가] 글자 안전하게 표시
  _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[c]));
  },

  /* ── 초기화 ── */
  async init() {
    // [수정] 로그인 확인이 끝난 뒤에 데이터 불러오기 (첫 로그인 직후 빈 화면 문제)
    if (typeof KyncAuth !== 'undefined' && KyncAuth.ready) await KyncAuth.ready();

    this._setDates();
    this._setQuestion();
    // [수정] init이 여러 번 불려도 버튼 이벤트가 중복으로 붙지 않게
    if (!this._listenersReady) {
      this._setupCharCounters();
      this._setupSubmitButtons();
      this._listenersReady = true;
    }
    this._setupEmotionGrids();
    this._initFeatures();       // [추가] 기록·퀘스트·칭찬카드·스트릭 (로그인 직후에도 바로 작동)
    this.renderFamilyInfo();    // [추가] 연결된 가족·코드·연결 일수
    await this._loadTodayData();
  },

  /* ── [추가] 탭별 기능 초기화 ── */
  _initFeatures() {
    const role = localStorage.getItem('kync_role');
    const fc   = localStorage.getItem('kync_family_code');
    const uid  = KyncAuth?.current?.uid || localStorage.getItem('kync_user_uid');
    if (role !== 'parent' && role !== 'child') return;
    const pre = role === 'parent' ? 'p' : 'c';

    if (uid && typeof KyncStreak !== 'undefined') KyncStreak.init(uid);
    if (typeof KyncQuests2 !== 'undefined') KyncQuests2.init(`${pre}-quest-list`, role);
    if (typeof KyncDiary !== 'undefined') KyncDiary.render(`${pre}-diary-container`, role);

    if (fc && typeof KyncPraise !== 'undefined') {
      if (this._praiseUnsub) { try { this._praiseUnsub(); } catch(e) {} }
      this._praiseUnsub = KyncPraise.listenForCards(fc, role);
      KyncPraise.renderReceivedCards(`${pre}-praise-list`, role).catch(e => console.warn('praise list:', e));
    }
  },

  /* ── [추가] 연결된 가족·코드·연결 일수 표시 ── */
  async renderFamilyInfo() {
    const fc   = localStorage.getItem('kync_family_code');
    const role = localStorage.getItem('kync_role');
    const myUid = KyncAuth?.current?.uid || localStorage.getItem('kync_user_uid');

    const pCode = document.getElementById('p-family-code');
    if (pCode) pCode.textContent = fc || '—';

    // 자녀: 연결됐으면 코드 입력칸 대신 연결 상태만 표시
    const cInput = document.getElementById('c-code-input');
    const cBtn   = document.getElementById('c-code-join-btn');
    const cCode  = document.getElementById('c-family-code');
    if (cInput) cInput.style.display = fc ? 'none' : '';
    if (cBtn)   cBtn.style.display   = fc ? 'none' : '';
    if (cCode)  cCode.textContent    = fc ? `연결됨 · ${fc}` : '';
    const cHint = document.getElementById('c-code-hint');
    if (cHint) cHint.textContent = fc ? '가족 연결 코드' : '가족 연결 코드 입력';

    const listIds = ['p-familyList','c-familyList'];
    const empty = '<div style="font-size:13px;color:#a09890;padding:8px 0;">아직 연결된 가족이 없어요</div>';
    if (!fc || typeof KyncDB === 'undefined') {
      listIds.forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = empty; });
      return;
    }

    try {
      const fam = await KyncDB.getFamily(fc);
      const members = Object.entries(fam?.members || {}).map(([uid, m]) => ({ uid, ...m }));
      const others = members.filter(m => m.uid !== myUid);
      const html = others.length ? others.map(m => `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;">
          <div style="width:36px;height:36px;border-radius:50%;background:#3d3530;color:#fff;
                      display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;">
            ${this._esc((m.name || '?')[0])}
          </div>
          <div>
            <div style="font-size:15px;font-weight:700;color:#3d3530;">${this._esc(m.name || '이름 없음')}</div>
            <div style="font-size:12px;color:#a09890;">${m.role === 'parent' ? '부모' : '자녀'}</div>
          </div>
        </div>`).join('') : empty;
      listIds.forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = html; });

      // 연결 일수: 가족을 만든 날 기준 (달력 날짜로 계산)
      const created = fam?.created?.toDate?.();
      if (created) {
        localStorage.setItem('kync_join_date', created.toISOString());
        this._renderDays(created);
      }
    } catch(e) { console.warn('renderFamilyInfo:', e); }
  },

  _renderDays(joinDate) {
    const days = localDayNum() - localDayNum(new Date(joinDate)) + 1;
    ['p-days','c-days'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = days;
    });
  },

  /* ── 날짜 표시 ── */
  _setDates() {
    const now = new Date();
    const days = ['일','월','화','수','목','금','토'];
    const str = `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일 ${days[now.getDay()]}요일`;
    const pDate = document.getElementById('p-todayDate');
    const cDate = document.getElementById('c-todayDate');
    if (pDate) pDate.textContent = str;
    if (cDate) cDate.textContent = str;

    // 사용자 이름 표시
    const userName = localStorage.getItem('kync_user_name') || '';
    if (userName) {
      const pUser = document.getElementById('p-username');
      const cUser = document.getElementById('c-username');
      if (pUser) pUser.textContent = userName;
      if (cUser) cUser.textContent = userName;

      const pAvatar = document.getElementById('p-avatar');
      const cAvatar = document.getElementById('c-avatar');
      if (pAvatar) pAvatar.textContent = userName[0];
      if (cAvatar) cAvatar.textContent = userName[0];
    }

    // 연결 일수 (서버 값 오기 전 임시 표시)
    const joinDate = localStorage.getItem('kync_join_date');
    if (joinDate) this._renderDays(joinDate);
  },

  /* ── 오늘의 질문 ── */
  _setQuestion() {
    // [수정] 오전 9시가 아니라 자정에 질문이 바뀌도록 (한국 시간 기준)
    const q = this.QUESTIONS[localDayNum() % this.QUESTIONS.length];
    ['p-questionText','c-questionText'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = q;
    });
    this._currentQuestion = q;
  },

  /* ── 글자 수 카운터 ── */
  _setupCharCounters() {
    const pArea = document.getElementById('p-myAnswer');
    const pCount = document.getElementById('p-charCount');
    if (pArea && pCount) {
      pArea.addEventListener('input', () => pCount.textContent = pArea.value.length);
    }
    const cArea = document.getElementById('c-myAnswer');
    const cCount = document.getElementById('c-charCount');
    if (cArea && cCount) {
      cArea.addEventListener('input', () => cCount.textContent = cArea.value.length);
    }
  },

  /* ── 답변 제출 버튼 ── */
  _setupSubmitButtons() {
    const pBtn = document.getElementById('p-submitAnswer');
    if (pBtn) pBtn.addEventListener('click', () => this.submitAnswer('parent'));

    const cBtn = document.getElementById('c-submitAnswer');
    if (cBtn) cBtn.addEventListener('click', () => this.submitAnswer('child'));
  },

  /* ── 감정 그리드 ── */
  _setupEmotionGrids() {
    // 자녀 홈 감정 체크인
    const grid = document.getElementById('c-emotionGrid');
    if (grid) {
      // [수정] data-id 추가 → 새로고침 후 선택 상태 복원용
      grid.innerHTML = this.EMOTIONS_CHILD.map(e => `
        <button data-id="${e.id}" onclick="App._selectEmotion('${e.id}', this)"
          style="padding:10px 6px;background:#f5f2ed;border:2px solid transparent;
                 border-radius:12px;cursor:pointer;font-family:SUIT,sans-serif;
                 transition:all 0.15s;display:flex;flex-direction:column;
                 align-items:center;gap:4px;">
          <div style="width:10px;height:10px;border-radius:50%;background:${e.color};"></div>
          <div style="font-size:11px;font-weight:700;color:#6b6560;">${e.label}</div>
        </button>
      `).join('');
    }

  },

  _selectEmotion(id, btn) {
    this._selectedEmotion = id;
    const grid = document.getElementById('c-emotionGrid');
    if (!grid) return;
    grid.querySelectorAll('button').forEach(b => {
      b.style.borderColor = 'transparent';
      b.style.background = '#f5f2ed';
    });
    btn.style.borderColor = '#3d3530';
    btn.style.background = '#fff';
  },

  /* ── 오늘 데이터 로드 ── */
  async _loadTodayData() {
    const fc   = localStorage.getItem('kync_family_code');
    const role = localStorage.getItem('kync_role');
    // [수정] 역할 정보 없으면 멈추지 않고 종료
    if (!fc || (role !== 'parent' && role !== 'child')) return;

    // [수정] 이전 실시간 감시 해제 (중복 방지)
    if (this._todayUnsub) {
      try { this._todayUnsub(); } catch(e) {}
      this._todayUnsub = null;
    }

    try {
      if (typeof KyncDB !== 'undefined') {
        const record = await KyncDB.getTodayRecord(fc);
        this._applyTodayRecord(record, role);

        // 실시간 감시
        if (typeof db !== 'undefined') {
          const d = new Date();
          const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          this._todayUnsub = db.collection('families').doc(fc)
            .collection('records').doc(key)
            .onSnapshot(snap => {
              if (snap.exists) this._applyTodayRecord(snap.data(), role);
            }, err => console.warn('today listen:', err)); // [수정] 에러 처리
        }
      }
    } catch(e) { console.warn('loadTodayData:', e); }
  },

  _applyTodayRecord(record, role) {
    if (!record) return;
    if (role !== 'parent' && role !== 'child') return; // [수정]

    // 내 답변 이미 제출했으면 텍스트 표시
    const myData = record[role];
    if (myData?.content) {
      const textarea = document.getElementById(`${role[0]}-myAnswer`);
      const btn = document.getElementById(`${role[0]}-submitAnswer`);
      if (textarea) { textarea.value = myData.content; textarea.disabled = true; }
      if (btn) { btn.textContent = '답변 완료'; btn.disabled = true; btn.style.opacity = '0.6'; }
    }

    // 상대방 답변
    const theirRole = role === 'parent' ? 'child' : 'parent';
    const theirData = record[theirRole];
    const myData2   = record[role];
    const opponentWrap = document.getElementById(`${role[0]}-opponent-wrap`);

    if (opponentWrap && myData2?.content && theirData?.content) {
      // 둘 다 답변 → 공개
      opponentWrap.innerHTML = `
        <div style="background:#f5f2ed;border-radius:16px;padding:18px;">
          <div style="font-size:11px;font-weight:700;color:#a09890;margin-bottom:8px;letter-spacing:0.06em;">
            ${role==='parent'?'자녀':'부모님'} 답변
          </div>
          <div style="font-size:15px;color:#3d3530;font-weight:600;line-height:1.7;">
            ${this._esc(theirData.content)}
          </div>
        </div>`;
    }

    // 자녀 체크인 → 부모 화면 반영
    if (role === 'parent' && record.checkin) {
      const ci = record.checkin;
      const desc = document.getElementById('p-child-desc');
      const mood = document.getElementById('p-stat-mood');
      const stress = document.getElementById('p-stat-stress');
      const energy = document.getElementById('p-stat-energy');
      // [수정] 감정 id → 한글 라벨
      const emoLabel = this.EMOTIONS_CHILD.find(e => e.id === ci.emotion)?.label || ci.emotion || '—';
      if (desc) desc.textContent = ci.memo || '오늘 체크인 완료했어요.';
      if (mood) mood.textContent = emoLabel;
      if (stress) stress.textContent = ci.stress ? `${ci.stress}/10` : '—';
      if (energy) energy.textContent = ci.energy ? `${ci.energy}/10` : '—';

      const dot = document.getElementById('p-status-dot');
      if (dot) {
        const s = parseInt(ci.stress) || 5;
        dot.className = `status-indicator ${s>=7?'ind-high':s>=4?'ind-mid':'ind-low'}`;
      }
    }

    // [추가] 자녀 화면: 새로고침해도 오늘 체크인 복원
    if (role === 'child' && record.checkin) {
      const ci = record.checkin;

      if (ci.emotion) {
        const emoBtn = document.querySelector(`#c-emotionGrid button[data-id="${ci.emotion}"]`);
        if (emoBtn) this._selectEmotion(ci.emotion, emoBtn);
        else this._selectedEmotion = ci.emotion;
      }

      const stressEl = document.getElementById('c-stressSlider');
      if (stressEl && ci.stress != null) {
        stressEl.value = ci.stress;
        stressEl.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const energyEl = document.getElementById('c-energySlider');
      if (energyEl && ci.energy != null) {
        energyEl.value = ci.energy;
        energyEl.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const memoEl = document.getElementById('c-emotionMemo');
      if (memoEl && ci.memo) memoEl.value = ci.memo;

      const ciBtn = document.querySelector('[onclick="App.saveCheckin()"]');
      if (ciBtn) { ciBtn.textContent = '✓ 저장됐어요'; ciBtn.disabled = true; ciBtn.style.opacity = '0.6'; }
    }
  },

  /* ── 답변 제출 ── */
  async submitAnswer(role) {
    const prefix   = role === 'parent' ? 'p' : 'c';
    const textarea = document.getElementById(`${prefix}-myAnswer`);
    const btn      = document.getElementById(`${prefix}-submitAnswer`);
    const content  = textarea?.value?.trim();

    if (!content) { alert('답변을 입력해주세요.'); return; }

    // [수정] 가족 연결 안 됐으면 저장 안 된 채 완료처럼 보이지 않게
    const fcCheck = localStorage.getItem('kync_family_code');
    if (!fcCheck) { alert('먼저 가족과 연결해주세요. (연결 탭)'); return; }

    btn.textContent = '저장 중...';
    btn.disabled = true;

    try {
      const fc = localStorage.getItem('kync_family_code');
      if (fc && typeof KyncDB !== 'undefined') {
        await KyncDB.submitAnswer(fc, role, content, this._currentQuestion);
      }

      textarea.disabled = true;
      btn.textContent = '답변 완료';
      btn.style.opacity = '0.6';

      // 포인트 (서버에 쌓고, 화면은 실시간 반영)
      if (typeof KyncDB !== 'undefined' && typeof KyncAuth !== 'undefined' && KyncAuth.current) {
        await KyncDB.addPoints(KyncAuth.current.uid, 50).catch(()=>{});
      }

      // 스트릭
      if (typeof KyncStreak !== 'undefined') {
        const uid = KyncAuth?.current?.uid || localStorage.getItem('kync_user_uid');
        if (uid) await KyncStreak.onCheckin(uid).catch?.(()=>{});
      }

    } catch(e) {
      btn.textContent = '답변 올리기';
      btn.disabled = false;
      alert('저장 실패: ' + e.message);
    }
  },

  /* ── 체크인 저장 ── */
  async saveCheckin() {
    const emotion = this._selectedEmotion;
    const stress  = document.getElementById('c-stressSlider')?.value || '5';
    const energy  = document.getElementById('c-energySlider')?.value || '5';
    const memo    = document.getElementById('c-emotionMemo')?.value?.trim() || '';

    // [수정] 기분 선택 안 하면 안내
    if (!emotion) { alert('오늘 기분을 선택해주세요.'); return; }

    // [수정] 가족 연결 안 됐으면 안내
    const fcCheck = localStorage.getItem('kync_family_code');
    if (!fcCheck) { alert('먼저 가족과 연결해주세요. (연결 탭)'); return; }

    const checkin = { emotion, stress: parseInt(stress), energy: parseInt(energy), memo };

    const btn = document.querySelector('[onclick="App.saveCheckin()"]');
    const btnText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = '저장 중...'; } // [수정] 중복 저장 방지

    try {
      const fc = localStorage.getItem('kync_family_code');
      if (fc && typeof KyncDB !== 'undefined') {
        await KyncDB.submitCheckin(fc, checkin);
      }

      // 스트릭
      if (typeof KyncStreak !== 'undefined') {
        const uid = KyncAuth?.current?.uid || localStorage.getItem('kync_user_uid');
        if (uid) await KyncStreak.onCheckin(uid).catch?.(()=>{});
      }

      // 포인트 [수정] 기기에만 쌓이던 것 → 서버에 저장
      if (typeof KyncDB !== 'undefined' && KyncAuth?.current) {
        await KyncDB.addPoints(KyncAuth.current.uid, 20).catch(()=>{});
      }

      if (btn) { btn.textContent = '✓ 저장됐어요'; btn.disabled = true; btn.style.opacity = '0.6'; }

      alert('오늘 상태가 저장됐어요!');
    } catch(e) {
      if (btn) { btn.disabled = false; btn.textContent = btnText; }
      alert('저장 실패: ' + e.message);
    }
  },

  /* ── 코드 복사 ── */
  copyCode(btn) {
    const fc = localStorage.getItem('kync_family_code');
    if (!fc) { alert('먼저 가족 코드를 생성해주세요.'); return; }
    navigator.clipboard.writeText(fc).then(() => {
      btn.textContent = '복사됐어요!';
      setTimeout(() => btn.textContent = '코드 복사', 2000);
    }).catch(() => alert('코드: ' + fc));
  },

  /* ── 페이지 이동 ── */
  go(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById(pageId);
    if (el) el.classList.add('active');
    window.scrollTo(0,0);
  },
};

/* ── 앱 시작 ── */
document.addEventListener('DOMContentLoaded', () => {
  // 퀴즈에서 돌아온 경우 제외하고 자동 init
  // [수정] 평소엔 로그인 확인 후 enterApp()이 init을 부름.
  //        활동 페이지에서 돌아와 앱 화면이 먼저 열린 경우만 여기서 바로 init.
  const active = document.querySelector('.page.active')?.id;
  if ((active === 'page-parent' || active === 'page-child') && localStorage.getItem('kync_role')) App.init();
});

window.App = App;