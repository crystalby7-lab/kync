/* ═══════════════════════════════════════════════════════════
   kync-core.js — 앱 핵심 엔진
   오늘 탭(날짜, 자녀 상태, 오늘의 질문, 답변 공개, 감정 체크인), 연결 탭 정보
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

  EMOTIONS_CHILD: [
    { id:'stressed', label:'스트레스', color:'#E0645A' },
    { id:'tired',    label:'피곤해',   color:'#A8B0BD' },
    { id:'happy',    label:'좋아',     color:'#F2B53B' },
    { id:'anxious',  label:'불안해',   color:'#EE8B5E' },
    { id:'sad',      label:'슬퍼',     color:'#7C93C9' },
    { id:'calm',     label:'괜찮아',   color:'#6DBB8F' },
    { id:'angry',    label:'화나',     color:'#C9423A' },
    { id:'lonely',   label:'외로워',   color:'#9B86B5' },
  ],

  _selectedEmotion: null,
  _listenersReady: false,
  _todayUnsub: null,
  _praiseUnsub: null,
  _lastRecord: null,

  _esc(s) { return KyncUI.esc(s); },
  _role() { return localStorage.getItem('kync_role'); },
  _otherLabel(role) { return role === 'parent' ? '자녀' : '부모님'; },

  /* ── 초기화 ── */
  async init() {
    if (typeof KyncAuth !== 'undefined' && KyncAuth.ready) await KyncAuth.ready();

    this._setDates();
    this._setQuestion();
    if (!this._listenersReady) {
      this._setupInputs();
      this._listenersReady = true;
    }
    this._setupEmotionGrid();
    this._renderChildCard(null);
    this._renderOpponent(null, null);
    this._initFeatures();
    this.renderFamilyInfo();
    await this._loadTodayData();
    if (typeof KyncInbox !== 'undefined') KyncInbox.refresh();
  },

  // 로그아웃·연결 끊기 때 실시간 감시 정리
  reset() {
    if (this._todayUnsub) { try { this._todayUnsub(); } catch(e) {} this._todayUnsub = null; }
    if (this._praiseUnsub) { try { this._praiseUnsub(); } catch(e) {} this._praiseUnsub = null; }
    if (typeof KyncDiary !== 'undefined') KyncDiary.stop?.();
    if (typeof KyncQuests2 !== 'undefined') KyncQuests2.stop?.();
    this._lastRecord = null;
    this._selectedEmotion = null;
    ['p','c'].forEach(pre => {
      const t = document.getElementById(`${pre}-myAnswer`);
      if (t) { t.value = ''; t.disabled = false; }
      const b = document.getElementById(`${pre}-submitAnswer`);
      if (b) { b.disabled = false; b.textContent = '답변 올리기'; b.classList.remove('done'); }
      const c = document.getElementById(`${pre}-charCount`);
      if (c) c.textContent = '0';
    });
    const ciBtn = document.getElementById('c-checkin-btn');
    if (ciBtn) { ciBtn.disabled = false; ciBtn.textContent = '오늘 상태 저장하기'; ciBtn.classList.remove('done'); }
    const memo = document.getElementById('c-emotionMemo');
    if (memo) memo.value = '';
  },

  /* ── 탭별 기능 초기화 ── */
  _initFeatures() {
    const role = this._role();
    const fc   = localStorage.getItem('kync_family_code');
    const uid  = KyncAuth?.current?.uid || localStorage.getItem('kync_user_uid');
    if (role !== 'parent' && role !== 'child') return;
    const pre = role === 'parent' ? 'p' : 'c';

    if (uid && typeof KyncStreak !== 'undefined') KyncStreak.init(uid);
    if (typeof KyncQuests2 !== 'undefined') KyncQuests2.init(`${pre}-quest-list`, role);
    if (typeof KyncDiary !== 'undefined') KyncDiary.render(`${pre}-diary-container`, role);
    if (typeof KyncCounsel !== 'undefined') KyncCounsel.init(role);
    if (typeof KyncActivity !== 'undefined') KyncActivity.render();

    if (fc && typeof KyncPraise !== 'undefined') {
      if (this._praiseUnsub) { try { this._praiseUnsub(); } catch(e) {} }
      this._praiseUnsub = KyncPraise.listenForCards(fc, role);
      KyncPraise.renderReceivedCards(`${pre}-praise-list`, role).catch(e => console.warn('praise list:', e));
    }
  },

  /* ── 연결된 가족·코드·연결 일수 ── */
  async renderFamilyInfo() {
    const fc    = localStorage.getItem('kync_family_code');
    const myUid = KyncAuth?.current?.uid || localStorage.getItem('kync_user_uid');

    const pCode = document.getElementById('p-family-code');
    if (pCode) pCode.textContent = fc || '—';

    const listIds = ['p-familyList','c-familyList'];
    const empty = `<p class="small sub">아직 연결된 가족이 없어요.</p>`;
    if (!fc) { listIds.forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = empty; }); return; }

    try {
      const fam = KyncAccount.family || await KyncDB.getFamily(fc);
      const members = Object.entries(fam?.members || {}).map(([uid, m]) => ({ uid, ...m }));
      const others = members.filter(m => m.uid !== myUid);
      const html = others.length ? others.map(m => `
        <div class="member">
          <div class="avatar" style="background:${KyncUI.avatarColor(m.uid, m.role)}">${this._esc((m.name || '?')[0])}</div>
          <div><b>${this._esc(m.name || '이름 없음')}</b><small>${m.role === 'parent' ? '부모' : '자녀'}</small></div>
        </div>`).join('') : empty;
      listIds.forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = html; });

      const created = fam?.created?.toDate?.();
      if (created) {
        localStorage.setItem('kync_join_date', created.toISOString());
        this._renderDays(created);
      }
    } catch(e) { console.warn('renderFamilyInfo:', e); }
  },

  _renderDays(joinDate) {
    const days = Math.max(1, localDayNum() - localDayNum(new Date(joinDate)) + 1);
    ['p-days','c-days'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = days; });
  },

  /* ── 날짜·이름 ── */
  _setDates() {
    const now = new Date();
    const days = ['일','월','화','수','목','금','토'];
    const html = `<div class="th-day">${days[now.getDay()]}요일</div><div class="th-date">${now.getMonth()+1}월 ${now.getDate()}일</div>`;
    ['p-todayDate','c-todayDate'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = html; });

    const userName = localStorage.getItem('kync_user_name') || '';
    if (userName) {
      ['p-username','c-username'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = userName; });
      const myColor = KyncUI.avatarColor(KyncAuth?.current?.uid || localStorage.getItem('kync_user_uid'), this._role());
      ['p-avatar','c-avatar'].forEach(id => { const el = document.getElementById(id); if (el) { el.textContent = userName[0]; el.style.background = myColor; } });
    }
    const joinDate = localStorage.getItem('kync_join_date');
    if (joinDate) this._renderDays(joinDate);
  },

  /* ── 오늘의 질문 (자정에 바뀜) ── */
  _setQuestion() {
    const q = this.QUESTIONS[localDayNum() % this.QUESTIONS.length];
    ['p-questionText','c-questionText'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = q; });
    this._currentQuestion = q;
  },

  /* ── 입력칸 (글자 수, 슬라이더, 답변 버튼) ── */
  _setupInputs() {
    ['p','c'].forEach(pre => {
      const area = document.getElementById(`${pre}-myAnswer`), count = document.getElementById(`${pre}-charCount`);
      if (area && count) area.addEventListener('input', () => count.textContent = area.value.length);
    });
    document.getElementById('p-submitAnswer')?.addEventListener('click', () => this.submitAnswer('parent'));
    document.getElementById('c-submitAnswer')?.addEventListener('click', () => this.submitAnswer('child'));
    [['c-stressSlider','c-stress-val'], ['c-energySlider','c-energy-val']].forEach(([s, v]) => {
      const el = document.getElementById(s);
      if (el) el.addEventListener('input', () => this._syncSlider(el, v));
      if (el) this._syncSlider(el, v);
    });
  },

  _syncSlider(el, valId) {
    const pct = (el.value - el.min) / (el.max - el.min) * 100;
    el.style.setProperty('--fill', pct + '%');
    const v = document.getElementById(valId);
    if (v) v.textContent = el.value;
  },

  /* ── 감정 버튼 (자녀) ── */
  _setupEmotionGrid() {
    const grid = document.getElementById('c-emotionGrid');
    if (!grid) return;
    grid.innerHTML = this.EMOTIONS_CHILD.map(e => `
      <button class="emo-btn ${this._selectedEmotion === e.id ? 'on' : ''}" data-id="${e.id}" aria-pressed="${this._selectedEmotion === e.id}"
        onclick="App._selectEmotion('${e.id}')"><i style="background:${e.color}"></i>${e.label}</button>`).join('');
  },

  _selectEmotion(id) {
    this._selectedEmotion = id;
    document.querySelectorAll('#c-emotionGrid .emo-btn').forEach(b => {
      const on = b.dataset.id === id;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on);
    });
  },

  /* ── 오늘 데이터 ── */
  async _loadTodayData() {
    const fc   = localStorage.getItem('kync_family_code');
    const role = this._role();
    if (!fc || (role !== 'parent' && role !== 'child')) return;

    if (this._todayUnsub) { try { this._todayUnsub(); } catch(e) {} this._todayUnsub = null; }
    try {
      this._applyTodayRecord(await KyncDB.getTodayRecord(fc), role);
      this._todayUnsub = db.collection('families').doc(fc).collection('records').doc(todayKey())
        .onSnapshot(snap => this._applyTodayRecord(snap.exists ? snap.data() : {}, role),
          err => console.warn('today listen:', err));
    } catch(e) { console.warn('loadTodayData:', e); }
  },

  _applyTodayRecord(record, role) {
    if (!record || (role !== 'parent' && role !== 'child')) return;
    if (this._lastRecord && JSON.stringify(this._lastRecord) !== JSON.stringify(record)) { if (typeof KyncInbox !== 'undefined') KyncInbox.refresh(); }
    this._lastRecord = record;
    const pre = role[0];

    const mine = record[role], theirs = record[role === 'parent' ? 'child' : 'parent'];
    if (mine?.content) {
      const textarea = document.getElementById(`${pre}-myAnswer`);
      const btn = document.getElementById(`${pre}-submitAnswer`);
      if (textarea) { textarea.value = mine.content; textarea.disabled = true; }
      const count = document.getElementById(`${pre}-charCount`);
      if (count) count.textContent = mine.content.length;
      if (btn) { btn.innerHTML = `${ic('check', 16)}답변 완료`; btn.disabled = true; btn.classList.add('done'); }
    }
    this._renderOpponent(mine, theirs);

    if (role === 'parent') this._renderChildCard(record.checkin || null);

    // 자녀: 새로고침해도 오늘 체크인 복원
    if (role === 'child' && record.checkin) {
      const ci = record.checkin;
      if (ci.emotion) this._selectEmotion(ci.emotion);
      [['c-stressSlider','c-stress-val', ci.stress], ['c-energySlider','c-energy-val', ci.energy]].forEach(([s, v, val]) => {
        const el = document.getElementById(s);
        if (el && val != null) { el.value = val; this._syncSlider(el, v); }
      });
      const memoEl = document.getElementById('c-emotionMemo');
      if (memoEl && ci.memo && !memoEl.value) memoEl.value = ci.memo;
      const pill = document.getElementById('c-checkin-pill');
      if (pill) { pill.className = 'pill pill-moss'; pill.innerHTML = `${ic('check', 13)}오늘 저장함`; }
      const ciBtn = document.getElementById('c-checkin-btn');
      if (ciBtn && !ciBtn.dataset.busy) ciBtn.textContent = '다시 저장하기';
    }
  },

  // 상대 답변: 둘 다 답하기 전엔 몸을 만 도치, 열리면 웃는 도치
  _renderOpponent(mine, theirs) {
    const role = this._role();
    if (role !== 'parent' && role !== 'child') return;
    const wrap = document.getElementById(`${role[0]}-opponent-wrap`);
    if (!wrap) return;
    const label = this._otherLabel(role);
    if (mine?.content && theirs?.content) {
      if (wrap.dataset.state === 'open') return;
      wrap.dataset.state = 'open';
      wrap.innerHTML = `
        <div class="their open">
          ${KyncBrand.mascot('happy', 46, { shadow: false })}
          <div class="grow"><div class="who">${label}의 답변</div><div class="what">${this._esc(theirs.content)}</div></div>
        </div>`;
      return;
    }
    wrap.dataset.state = 'locked';
    const sub = !mine?.content
      ? (theirs?.content ? `${label}은(는) 벌써 답했어요. 내 답을 올리면 열려요.` : '서로 답하면 열려요')
      : `${label}이(가) 답하면 열려요`;
    wrap.innerHTML = `
      <div class="their locked">
        ${KyncBrand.curled(44)}
        <div class="grow"><b>${label}의 답변</b><small>${sub}</small></div>
        ${ic('lock', 18, 'muted')}
      </div>`;
  },

  // 부모 화면: 자녀의 오늘 상태
  _renderChildCard(ci) {
    const el = document.getElementById('p-child-card');
    if (!el) return;
    const child = Object.values(KyncAccount.family?.members || {}).find(m => m.role === 'child');
    const name = this._esc(child?.name || '자녀');
    if (!ci) {
      el.innerHTML = `
        <div class="card-head"><h2>${name}의 오늘</h2><span class="pill">아직 기록 전</span></div>
        <div class="mood-main">
          <div class="mood-dot"><i></i></div>
          <div><div class="mood-label muted">기다리는 중</div><div class="mood-memo">${name}이(가) 오늘 기분을 남기면 여기에 보여요.</div></div>
        </div>`;
      return;
    }
    const emo = this.EMOTIONS_CHILD.find(e => e.id === ci.emotion);
    const segs = n => Array.from({ length: 10 }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
    const stress = +ci.stress || 0, energy = +ci.energy || 0;
    el.innerHTML = `
      <div class="card-head"><h2>${name}의 오늘</h2>${stress >= 7 ? '<span class="pill pill-berry">스트레스 높음</span>' : '<span class="pill pill-moss">기록함</span>'}</div>
      <div class="mood-main">
        <div class="mood-dot"><i style="background:${emo?.color || 'var(--faint)'}"></i></div>
        <div class="grow"><div class="mood-label">${this._esc(emo?.label || ci.emotion || '—')}</div>
          ${ci.memo ? `<div class="mood-memo">“${this._esc(ci.memo)}”</div>` : ''}</div>
      </div>
      <div class="meters">
        <div class="meter stress"><div class="meter-top">스트레스<b>${stress || '—'}</b></div><div class="meter-segs">${segs(stress)}</div></div>
        <div class="meter energy"><div class="meter-top">에너지<b>${energy || '—'}</b></div><div class="meter-segs">${segs(energy)}</div></div>
      </div>`;
  },

  /* ── 답변 제출 ── */
  async submitAnswer(role) {
    const pre = role === 'parent' ? 'p' : 'c';
    const textarea = document.getElementById(`${pre}-myAnswer`);
    const btn      = document.getElementById(`${pre}-submitAnswer`);
    const content  = textarea?.value?.trim();
    if (!content) { toast('답변을 입력해주세요.', 'error'); textarea?.focus(); return; }
    const fc = localStorage.getItem('kync_family_code');
    if (!fc) { toast('먼저 가족과 연결해주세요.', 'error'); return; }

    btn.textContent = '올리는 중';
    btn.disabled = true;
    try {
      await KyncDB.submitAnswer(fc, role, content, this._currentQuestion);
      textarea.disabled = true;
      btn.innerHTML = `${ic('check', 16)}답변 완료`;
      btn.classList.add('done');
      toast('답변을 올렸어요', 'ok');
      const uid = KyncAuth?.current?.uid;
      if (uid && typeof KyncStreak !== 'undefined') KyncStreak.onCheckin(uid).catch(() => {});
    } catch(e) {
      btn.textContent = '답변 올리기';
      btn.disabled = false;
      toast('올리지 못했어요. 인터넷 연결을 확인해주세요.', 'error');
    }
  },

  /* ── 체크인 저장 (자녀) ── */
  async saveCheckin() {
    const emotion = this._selectedEmotion;
    if (!emotion) { toast('오늘 기분을 골라주세요.', 'error'); return; }
    const fc = localStorage.getItem('kync_family_code');
    if (!fc) { toast('먼저 가족과 연결해주세요.', 'error'); return; }

    const checkin = {
      emotion,
      stress: parseInt(document.getElementById('c-stressSlider')?.value || '5'),
      energy: parseInt(document.getElementById('c-energySlider')?.value || '5'),
      memo: document.getElementById('c-emotionMemo')?.value?.trim() || '',
    };
    const btn = document.getElementById('c-checkin-btn');
    let saved = false;
    await KyncUI.busy(btn, '저장하는 중', async () => {
      try {
        await KyncDB.submitCheckin(fc, checkin);
        saved = true;
        const uid = KyncAuth?.current?.uid;
        if (uid && typeof KyncStreak !== 'undefined') KyncStreak.onCheckin(uid).catch(() => {});
        toast('오늘 상태를 저장했어요', 'ok');
      } catch(e) {
        toast('저장하지 못했어요. 인터넷 연결을 확인해주세요.', 'error');
      }
    });
    if (saved) btn.textContent = '다시 저장하기';
  },

  /* ── 코드 복사 ── */
  copyCode() {
    const fc = localStorage.getItem('kync_family_code');
    if (!fc) { toast('아직 가족 연결 코드가 없어요.', 'error'); return; }
    navigator.clipboard.writeText(fc)
      .then(() => toast('코드를 복사했어요', 'ok'))
      .catch(() => KyncUI.alert(fc, '가족 연결 코드'));
  },
};

window.App = App;
