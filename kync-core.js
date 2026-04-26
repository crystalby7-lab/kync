/* ═══════════════════════════════════════════════════════════
   kync-core.js — Kync 앱 핵심 엔진
   화면 초기화, 질문 표시, 답변 제출, 체크인 등
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

  /* ── 초기화 ── */
  async init() {
    this._setDates();
    this._setQuestion();
    this._setupCharCounters();
    this._setupSubmitButtons();
    this._setupEmotionGrids();
    this._loadUserData();
    await this._loadTodayData();
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

    // DAY 배지
    const fc = localStorage.getItem('kync_family_code');
    const joinDate = localStorage.getItem('kync_join_date');
    if (joinDate) {
      const days = Math.floor((Date.now() - new Date(joinDate)) / 86400000) + 1;
      ['p-day-badge','c-day-badge'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = `DAY ${days}`;
      });
      ['p-days','c-days'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = days;
      });
    }
  },

  /* ── 오늘의 질문 ── */
  _setQuestion() {
    const dayNum = Math.floor(Date.now() / 86400000);
    const q = this.QUESTIONS[dayNum % this.QUESTIONS.length];
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
      grid.innerHTML = this.EMOTIONS_CHILD.map(e => `
        <button onclick="App._selectEmotion('${e.id}', this)"
          style="padding:10px 6px;background:#f5f2ed;border:2px solid transparent;
                 border-radius:12px;cursor:pointer;font-family:Nunito,sans-serif;
                 transition:all 0.15s;display:flex;flex-direction:column;
                 align-items:center;gap:4px;">
          <div style="width:10px;height:10px;border-radius:50%;background:${e.color};"></div>
          <div style="font-size:11px;font-weight:700;color:#6b6560;">${e.label}</div>
        </button>
      `).join('');
    }

    // 자녀 일기 감정
    const diaryRow = document.getElementById('c-diaryEmotionRow');
    if (diaryRow) {
      diaryRow.innerHTML = this.EMOTIONS_CHILD.map(e => `
        <button onclick="App._selectDiaryEmotion('${e.id}', this)"
          style="padding:7px 12px;background:#fff;border:1.5px solid #e8e3da;
                 border-radius:20px;cursor:pointer;font-family:Nunito,sans-serif;
                 font-size:12px;font-weight:700;color:#6b6560;
                 transition:all 0.15s;display:inline-flex;align-items:center;gap:5px;">
          <div style="width:7px;height:7px;border-radius:50%;background:${e.color};flex-shrink:0;"></div>
          ${e.label}
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

  _selectedDiaryEmotion: null,
  _selectDiaryEmotion(id, btn) {
    this._selectedDiaryEmotion = id;
    const row = document.getElementById('c-diaryEmotionRow');
    if (!row) return;
    row.querySelectorAll('button').forEach(b => {
      b.style.borderColor = '#e8e3da';
      b.style.background = '#fff';
      b.style.color = '#6b6560';
    });
    btn.style.borderColor = '#3d3530';
    btn.style.background = '#3d3530';
    btn.style.color = '#fff';
  },

  /* ── 사용자 데이터 로드 ── */
  _loadUserData() {
    const points = parseInt(localStorage.getItem('kync_points') || '0');
    ['p-points-badge','c-points-badge'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = `${points} pt`;
    });

    // 가족 코드 표시
    const fc = localStorage.getItem('kync_family_code');
    if (fc) {
      ['p-family-code'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = fc;
      });
    }
  },

  /* ── 오늘 데이터 로드 ── */
  async _loadTodayData() {
    const fc   = localStorage.getItem('kync_family_code');
    const role = localStorage.getItem('kync_role');
    if (!fc) return;

    try {
      if (typeof KyncDB !== 'undefined') {
        const record = await KyncDB.getTodayRecord(fc);
        this._applyTodayRecord(record, role);

        // 실시간 감시
        if (typeof db !== 'undefined') {
          const todayKey = new Date().toLocaleDateString('ko-KR').replace(/\. /g,'-').replace('.','');
          const d = new Date();
          const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          db.collection('families').doc(fc)
            .collection('records').doc(key)
            .onSnapshot(snap => {
              if (snap.exists) this._applyTodayRecord(snap.data(), role);
            });
        }
      }
    } catch(e) { console.warn('loadTodayData:', e); }
  },

  _applyTodayRecord(record, role) {
    if (!record) return;

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
            ${theirData.content}
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
      if (desc) desc.textContent = ci.memo || '오늘 체크인 완료했어요.';
      if (mood) mood.textContent = ci.emotion || '—';
      if (stress) stress.textContent = ci.stress ? `${ci.stress}/10` : '—';
      if (energy) energy.textContent = ci.energy ? `${ci.energy}/10` : '—';

      const dot = document.getElementById('p-status-dot');
      if (dot) {
        const s = parseInt(ci.stress) || 5;
        dot.className = `status-indicator ${s>=7?'ind-high':s>=4?'ind-mid':'ind-low'}`;
      }
    }
  },

  /* ── 답변 제출 ── */
  async submitAnswer(role) {
    const prefix   = role === 'parent' ? 'p' : 'c';
    const textarea = document.getElementById(`${prefix}-myAnswer`);
    const btn      = document.getElementById(`${prefix}-submitAnswer`);
    const content  = textarea?.value?.trim();

    if (!content) { alert('답변을 입력해주세요.'); return; }

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

      // 포인트
      const cur = parseInt(localStorage.getItem('kync_points') || '0') + 50;
      localStorage.setItem('kync_points', cur);
      ['p-points-badge','c-points-badge'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = `${cur} pt`;
      });

      if (typeof KyncDB !== 'undefined' && typeof KyncAuth !== 'undefined' && KyncAuth.current) {
        await KyncDB.addPoints(KyncAuth.current.uid, 50).catch(()=>{});
      }

      // 스트릭
      if (typeof KyncStreak !== 'undefined') {
        const uid = KyncAuth?.current?.uid || localStorage.getItem('kync_user_uid');
        if (uid) await KyncStreak.onCheckin(uid);
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

    const checkin = { emotion, stress: parseInt(stress), energy: parseInt(energy), memo };

    try {
      const fc = localStorage.getItem('kync_family_code');
      if (fc && typeof KyncDB !== 'undefined') {
        await KyncDB.submitCheckin(fc, checkin);
      }

      // 스트릭
      if (typeof KyncStreak !== 'undefined') {
        const uid = KyncAuth?.current?.uid || localStorage.getItem('kync_user_uid');
        if (uid) await KyncStreak.onCheckin(uid);
      }

      // 포인트
      const cur = parseInt(localStorage.getItem('kync_points') || '0') + 20;
      localStorage.setItem('kync_points', cur);

      const btn = document.querySelector('[onclick="App.saveCheckin()"]');
      if (btn) { btn.textContent = '✓ 저장됐어요'; btn.disabled = true; btn.style.opacity = '0.6'; }

      alert('오늘 상태가 저장됐어요!');
    } catch(e) { alert('저장 실패: ' + e.message); }
  },

  /* ── 일기 저장 ── */
  async saveDiary() {
    const text    = document.getElementById('c-diaryInput')?.value?.trim();
    const emotion = this._selectedDiaryEmotion;
    if (!text) { alert('일기 내용을 입력해주세요.'); return; }

    const entry = {
      text,
      emotion: emotion || null,
      savedAt: new Date().toISOString(),
      date:    new Date().toLocaleDateString('ko-KR'),
    };

    // localStorage
    const arr = JSON.parse(localStorage.getItem('kync_diary_entries') || '[]');
    arr.unshift(entry);
    localStorage.setItem('kync_diary_entries', JSON.stringify(arr.slice(0, 100)));

    // Firestore
    if (typeof KyncDB !== 'undefined' && KyncAuth?.current) {
      await KyncDB.saveDiaryEntry(KyncAuth.current.uid, entry).catch(()=>{});
    }

    document.getElementById('c-diaryInput').value = '';
    this._selectedDiaryEmotion = null;

    // 리스트 갱신
    this._renderDiaryList();
    alert('일기가 저장됐어요.');
  },

  _renderDiaryList() {
    const list = document.getElementById('c-diaryList');
    if (!list) return;
    const arr = JSON.parse(localStorage.getItem('kync_diary_entries') || '[]');
    if (!arr.length) { list.innerHTML = '<div style="text-align:center;color:#a09890;font-size:13px;padding:16px;">아직 일기가 없어요</div>'; return; }
    list.innerHTML = arr.slice(0,20).map(e => `
      <div style="background:#f5f2ed;border-radius:14px;padding:14px 16px;margin-bottom:8px;">
        <div style="font-size:11px;color:#a09890;margin-bottom:6px;">${e.date}</div>
        <div style="font-size:14px;color:#3d3530;line-height:1.65;">${e.text}</div>
      </div>`).join('');
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
  const params = new URLSearchParams(window.location.search);
  if (!params.get('from')) {
    const role = localStorage.getItem('kync_role');
    if (role) App.init();
  } else {
    App.init();
  }
});

window.App = App; 