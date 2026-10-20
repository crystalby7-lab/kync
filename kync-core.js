/* ═══════════════════════════════════════════════════════════
   kync-core.js — 앱 핵심 엔진
   오늘 탭(날짜, 자녀 상태, 오늘의 질문, 답변 공개, 감정 체크인), 연결 탭 정보
═══════════════════════════════════════════════════════════ */

const App = {

  // 부모와 자녀가 같은 질문에 답함. 가볍고 구체적인 질문 위주로, 가끔 속마음 질문
  QUESTIONS: [
    '오늘 먹은 것 중에 제일 맛있었던 거',
    '요즘 자주 듣는 노래 한 곡',
    '이번 주에 제일 웃겼던 일',
    '오늘 기분을 날씨로 하면?',
    '요즘 폰에서 제일 많이 여는 앱',
    '요즘 은근히 신경 쓰이는 거 하나',
    '지금 하루를 통째로 쉰다면 뭐 할 거야?',
    '요즘 빠져 있는 거 하나',
    '최근에 산 것 중에 제일 잘 산 거',
    '오늘 누가 해준 말 중에 기억나는 거',
    '우리 집에서 제일 좋아하는 자리',
    '요즘 제일 기다려지는 날',
    '다시 가보고 싶은 곳',
    '최근에 혼자 뿌듯했던 순간',
    '요즘 미루고 있는 일 하나',
    '어릴 때 꿈이 뭐였어?',
    '오늘 제일 귀찮았던 일',
    '최근에 좀 서운했던 일 있어?',
    '집에 오면 제일 먼저 하는 거',
    '요즘 제일 자주 먹는 간식',
    '하루만 다른 사람으로 살 수 있다면 누구?',
    '오늘 잘 넘긴 일 하나',
    '최근에 본 영상 중에 추천하고 싶은 거',
    '가족이랑 했던 것 중에 또 하고 싶은 거',
    '요즘 나한테 점수를 준다면 10점 만점에 몇 점? 왜?',
    '요즘 새로 알게 된 거 하나',
    '지금 방 상태를 한 단어로',
    '올해 가기 전에 해보고 싶은 거',
    '최근에 꾼 꿈 중에 기억나는 거',
    '친구나 동료한테 자주 듣는 말',
    '요즘 쉬는 날엔 주로 뭐 해?',
    '지금 제일 갖고 싶은 거 하나',
    '최근에 마음이 좀 놓였던 일',
    '요즘 누가 해줬으면 하는 말',
    '제일 자신 있는 요리 (라면도 됨)',
    '오늘 나를 웃게 한 거',
    '요즘 머릿속을 제일 많이 차지하는 거',
    '고민 하나가 사라진다면 뭐였으면 해?',
    '이번 달 나만의 작은 목표',
    '우리 가족한테 별명을 붙인다면?',
    '요즘 들으면 마음이 편해지는 소리나 냄새',
    '최근에 처음 해본 거',
    '하루 중 제일 좋은 시간대',
    '최근에 본 것 중 제일 예뻤던 장면',
    '내일 아침에 일어나서 제일 먼저 할 거',
    '좋아하는 계절이랑 그 이유',
    '최근에 울컥했던 적 있어?',
    '요즘 고마웠던 사람 한 명',
    '요즘 제일 아끼는 물건',
    '이번 주말에 꼭 하고 싶은 거',
    '어릴 때 제일 좋아했던 놀이',
    '요즘 나를 제일 지치게 하는 거',
    '지금 먹고 싶은데 참고 있는 음식',
    '오늘 하루 중 제일 조용했던 순간',
    '요즘 나한테 해주고 싶은 말 한마디',
  ],

  // 감정 (stressed는 예전 기록 표시용, 고르는 칸에는 안 나옴)
  EMOTIONS_CHILD: [
    { id:'happy', label:'좋아',     color:'#F2B53B' },
    { id:'excited', label:'신나',     color:'#EE7FA0' },
    { id:'calm', label:'괜찮아',   color:'#6DBB8F' },
    { id:'tired', label:'피곤해',   color:'#A8B0BD' },
    { id:'anxious', label:'불안해',   color:'#EE8B5E' },
    { id:'sad', label:'슬퍼',     color:'#7C93C9' },
    { id:'angry', label:'화나',     color:'#C9423A' },
    { id:'lonely', label:'외로워',   color:'#9B86B5' },
    { id:'stressed', label:'스트레스', color:'#E0645A', legacy:true },
  ],

  REACTIONS: ['공감해', 'ㅋㅋㅋ', '고마워', '이따 얘기해'],

  _selectedEmotion: null,
  _week: {},
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
    this._loadWeek();
    if (typeof KyncInbox !== 'undefined') KyncInbox.refresh();
  },

  // 로그아웃·연결 끊기 때 실시간 감시 정리
  reset() {
    if (this._todayUnsub) { try { this._todayUnsub(); } catch(e) {} this._todayUnsub = null; }
    if (this._praiseUnsub) { try { this._praiseUnsub(); } catch(e) {} this._praiseUnsub = null; }
    if (typeof KyncDiary !== 'undefined') KyncDiary.stop?.();
    if (typeof KyncQuests2 !== 'undefined') KyncQuests2.stop?.();
    if (typeof KyncManual !== 'undefined') KyncManual.stop?.();
    if (typeof KyncJournal !== 'undefined') KyncJournal.stop?.();
    this._lastRecord = null;
    this._selectedEmotion = null;
    ['p','c'].forEach(pre => {
      const t = document.getElementById(`${pre}-myAnswer`);
      if (t) { t.value = ''; t.disabled = false; }
      const b = document.getElementById(`${pre}-submitAnswer`);
      if (b) { b.disabled = false; b.textContent = '올리기'; b.classList.remove('done'); }
      const c = document.getElementById(`${pre}-charCount`);
      if (c) c.textContent = '0';
    });
    const ciBtn = document.getElementById('c-checkin-btn');
    if (ciBtn) { ciBtn.disabled = false; ciBtn.textContent = '저장'; ciBtn.classList.remove('done'); }
    this._week = {};
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
    if (role === 'parent' && typeof KyncManual !== 'undefined') KyncManual.listenParent();
    if (typeof KyncJournal !== 'undefined') { if (role === 'parent') KyncJournal.listenParent(); else KyncJournal.renderTodayCard(); }
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
          ${KyncUI.avatar(m.uid, m.role)}
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
    const html = role => `<div class="th-text"><div class="th-day">${days[now.getDay()]}요일</div><div class="th-date">${now.getMonth()+1}월 ${now.getDate()}일</div></div>${KyncBrand.mascot('default', 66, { role, cls: 'th-char' })}`;
    [['p-todayDate', 'parent'], ['c-todayDate', 'child']].forEach(([id, r]) => { const el = document.getElementById(id); if (el) el.innerHTML = html(r); });

    const userName = localStorage.getItem('kync_user_name') || '';
    if (userName) {
      ['p-username','c-username'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = userName; });
      const myUid = KyncAuth?.current?.uid || localStorage.getItem('kync_user_uid');
      [['p-avatar', 'parent'], ['c-avatar', 'child']].forEach(([id, r]) => { const el = document.getElementById(id); if (el) el.outerHTML = KyncUI.avatar(myUid, r, 'lg').replace('class="avatar', `id="${id}" class="avatar`); });
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
    grid.innerHTML = this.EMOTIONS_CHILD.filter(e => !e.legacy).map(e => `
      <button class="emo-btn ${this._selectedEmotion === e.id ? 'on' : ''}" style="${this._selectedEmotion === e.id ? `background:${e.color}` : ''}" data-id="${e.id}" aria-pressed="${this._selectedEmotion === e.id}"
        onclick="App._selectEmotion('${e.id}')"><i style="background:${e.color}"></i>${e.label}</button>`).join('');
  },

  _selectEmotion(id) {
    this._selectedEmotion = id;
    document.querySelectorAll('#c-emotionGrid .emo-btn').forEach(b => {
      const on = b.dataset.id === id;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on);
      b.style.background = on ? (this.EMOTIONS_CHILD.find(e => e.id === b.dataset.id)?.color || '') : '';
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
    // 누가 먼저 답했으면 그때 질문으로 고정 (질문 목록이 바뀌어도 둘이 같은 질문)
    const fixedQ = record.parent?.question || record.child?.question;
    if (fixedQ && fixedQ !== this._currentQuestion) {
      this._currentQuestion = fixedQ;
      ['p-questionText','c-questionText'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = fixedQ; });
    }
    if (mine?.content) {
      const textarea = document.getElementById(`${pre}-myAnswer`);
      const btn = document.getElementById(`${pre}-submitAnswer`);
      if (textarea) { textarea.value = mine.content; textarea.disabled = true; }
      const count = document.getElementById(`${pre}-charCount`);
      if (count) count.textContent = mine.content.length;
      if (btn) { btn.innerHTML = `${ic('check', 16)}올림`; btn.disabled = true; btn.classList.add('done'); }
    }
    this._renderOpponent(mine, theirs, record.react || {});

    if (role === 'parent') { this._week[todayKey()] = record.checkin?.emotion || null; this._renderChildCard(record.checkin || null); }

    // 자녀: 새로고침해도 오늘 체크인 복원
    if (role === 'child' && record.checkin) {
      const ci = record.checkin;
      if (ci.emotion) this._selectEmotion(ci.emotion);
      [['c-stressSlider','c-stress-val', ci.stress], ['c-energySlider','c-energy-val', ci.energy]].forEach(([s, v, val]) => {
        const el = document.getElementById(s);
        if (el && val) { el.value = val; this._syncSlider(el, v); }
      });
      const memoEl = document.getElementById('c-emotionMemo');
      if (memoEl && ci.memo && !memoEl.value) memoEl.value = ci.memo;
      const pill = document.getElementById('c-checkin-pill');
      if (pill) { pill.className = 'pill pill-moss'; pill.innerHTML = `${ic('check', 13)}저장됨`; }
      const ciBtn = document.getElementById('c-checkin-btn');
      if (ciBtn && !ciBtn.dataset.busy) ciBtn.textContent = '고쳐서 저장';
    }
  },

  // 상대 답변: 둘 다 답하기 전엔 몸을 만 도치, 열리면 웃는 도치 + 반응 달기
  _renderOpponent(mine, theirs, react = {}) {
    const role = this._role();
    if (role !== 'parent' && role !== 'child') return;
    const wrap = document.getElementById(`${role[0]}-opponent-wrap`);
    if (!wrap) return;
    const label = this._otherLabel(role);
    const other = role === 'parent' ? 'child' : 'parent';
    if (mine?.content && theirs?.content) {
      wrap.dataset.state = 'open';
      const myReact = react[role], theirReact = react[other];
      wrap.innerHTML = `
        <div class="their open">
          ${KyncBrand.mascot('happy', 46, { shadow: false })}
          <div class="grow"><div class="who">${label}의 답</div><div class="what">${this._esc(theirs.content)}</div>
            <div class="react-row" role="group" aria-label="반응">
              ${this.REACTIONS.map(r => `<button type="button" class="${myReact === r ? 'on' : ''}" aria-pressed="${myReact === r}" onclick="App.react('${r}')">${r}</button>`).join('')}
            </div>
            ${theirReact ? `<div class="react-got">${josa(label, '이/가')} 내 답에 <b>${this._esc(theirReact)}</b></div>` : ''}
          </div>
        </div>`;
      return;
    }
    wrap.dataset.state = 'locked';
    const sub = !mine?.content
      ? (theirs?.content ? tone(`${josa(label, '은/는')} 썼어요. 내 답을 올리면 보여요.`, `${josa(label, '은/는')} 썼어. 내 답 올리면 보여.`) : tone('아직 둘 다 안 썼어요', '아직 둘 다 안 썼어'))
      : tone(`${josa(label, '은/는')} 아직 안 썼어요`, `${josa(label, '은/는')} 아직 안 썼어`);
    wrap.innerHTML = `
      <div class="their locked">
        ${KyncBrand.curled(44)}
        <div class="grow"><b>${label}의 답</b><small>${sub}</small></div>
        ${ic('lock', 18, 'muted')}
      </div>`;
  },

  async react(r) {
    const role = this._role(), fc = localStorage.getItem('kync_family_code');
    if (!fc) return;
    const cur = this._lastRecord?.react?.[role];
    const val = cur === r ? firebase.firestore.FieldValue.delete() : r;
    try {
      await db.collection('families').doc(fc).collection('records').doc(todayKey()).set({ react: { [role]: val } }, { merge: true });
    } catch (e) { toast(tone('반응을 못 남겼어요. 다시 눌러주세요.', '반응을 못 남겼어. 다시 눌러줘'), 'error'); }
  },

  /* ── 지난 질문 모아보기 ── */
  async openHistory() {
    const role = this._role(), fc = localStorage.getItem('kync_family_code');
    if (!fc) { toast(tone('가족과 연결하면 볼 수 있어요', '가족이랑 연결하면 볼 수 있어'), 'error'); return; }
    const other = role === 'parent' ? 'child' : 'parent';
    const label = this._otherLabel(role);
    const sheet = KyncUI.sheet(`<h2>지난 질문</h2><p class="sheet-sub">${tone('둘 다 쓴 날만 서로의 답이 보여요.', '둘 다 쓴 날만 서로의 답이 보여.')}</p><div id="hist-list" class="hist-list"><div class="hist-empty">불러오는 중</div></div>`, { id: 'hist-sheet' });
    try {
      const snap = await db.collection('families').doc(fc).collection('records')
        .orderBy(firebase.firestore.FieldPath.documentId(), 'desc').limit(40).get();
      const items = snap.docs.filter(d => d.id !== todayKey()).map(d => ({ day: d.id, ...d.data() }))
        .filter(r => r[role]?.content || r[other]?.content);
      const el = document.getElementById('hist-list');
      if (!el) return;
      if (!items.length) { el.innerHTML = `<div class="hist-empty">${tone('아직 지난 질문이 없어요. 내일부터 여기 쌓여요.', '아직 지난 질문이 없어. 내일부터 여기 쌓여.')}</div>`; return; }
      const fmt = day => { const [y, m, d] = day.split('-'); return `${+m}월 ${+d}일`; };
      el.innerHTML = items.map(r => {
        const q = r[role]?.question || r[other]?.question || '';
        const mine = r[role]?.content, theirs = r[other]?.content;
        return `<div class="hist-item">
          <div class="hist-day">${fmt(r.day)}</div>
          <div class="hist-q">${this._esc(q)}</div>
          <div class="hist-a"><small>나</small>${mine ? this._esc(mine) : `<span class="muted">${tone('안 썼어요', '안 썼어')}</span>`}</div>
          <div class="hist-a"><small>${label}</small>${mine && theirs ? this._esc(theirs) : `<span class="muted">${theirs ? tone('내가 안 써서 잠겨 있어요', '내가 안 써서 잠겨 있어') : tone('안 썼어요', '안 썼어')}</span>`}</div>
        </div>`;
      }).join('');
    } catch (e) {
      const el = document.getElementById('hist-list');
      if (el) el.innerHTML = `<div class="hist-empty">${tone('불러오지 못했어요. 인터넷 연결을 확인해주세요.', '불러오지 못했어. 인터넷 연결을 확인해줘.')}</div>`;
    }
    return sheet;
  },

  /* ── 부모 화면: 최근 7일 기분 ── */
  async _loadWeek() {
    const fc = localStorage.getItem('kync_family_code');
    if (!fc || this._role() !== 'parent') return;
    try {
      const snap = await db.collection('families').doc(fc).collection('records')
        .orderBy(firebase.firestore.FieldPath.documentId(), 'desc').limit(7).get();
      snap.docs.forEach(d => { this._week[d.id] = d.data().checkin?.emotion || null; });
      this._renderChildCard(this._lastRecord?.checkin || null);
    } catch (e) { console.warn('week:', e); }
  },

  _weekStrip() {
    const days = ['일','월','화','수','목','금','토'];
    const cells = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const emo = this.EMOTIONS_CHILD.find(e => e.id === this._week[key]);
      cells.push(`<div class="wk ${i === 0 ? 'today' : ''}" title="${emo ? emo.label : '기록 없음'}">${emo?.img ? `<img src="${emo.img}" alt="${emo.label}" width="26" height="26">` : `<i style="${emo ? `background:${emo.color}` : ''}"></i>`}<span>${i === 0 ? '오늘' : days[d.getDay()]}</span></div>`);
    }
    return `<div class="week-strip" aria-label="최근 7일 기분">${cells.join('')}</div>`;
  },

  // 부모 화면: 자녀의 오늘 상태
  _renderChildCard(ci) {
    const el = document.getElementById('p-child-card');
    if (!el) return;
    const child = Object.values(KyncAccount.family?.members || {}).find(m => m.role === 'child');
    const name = this._esc(child?.name || '자녀');
    if (!ci) {
      el.innerHTML = `
        <div class="card-head"><h2>${name}의 오늘</h2><span class="pill">아직</span></div>
        <div class="mood-main">
          <div class="mood-dot">${KyncBrand.mascot('wait', 40, { role: 'child' })}</div>
          <div><div class="mood-label muted">아직 안 남겼어요</div><div class="mood-memo">${josa(name, '이/가')} 기분을 남기면 여기 떠요.</div></div>
        </div>
        ${this._weekStrip()}`;
      return;
    }
    const emo = this.EMOTIONS_CHILD.find(e => e.id === ci.emotion);
    const segs = n => Array.from({ length: 10 }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
    const stress = +ci.stress || 0, energy = +ci.energy || 0;
    el.innerHTML = `
      <div class="card-head"><h2>${name}의 오늘</h2>${stress >= 7 ? '<span class="pill pill-berry">스트레스 높음</span>' : ''}</div>
      <div class="mood-main">
        <div class="mood-dot">${emo?.img ? `<img src="${emo.img}" alt="" width="40" height="40">` : `<i style="background:${emo?.color || 'var(--faint)'}"></i>`}</div>
        <div class="grow"><div class="mood-label">${this._esc(emo?.label || ci.emotion || '—')}</div>
          ${ci.memo ? `<div class="mood-memo">“${this._esc(ci.memo)}”</div>` : ''}</div>
      </div>
      <div class="meters">
        <div class="meter stress"><div class="meter-top">스트레스<b>${stress || '—'}</b></div><div class="meter-segs">${segs(stress)}</div></div>
        <div class="meter energy"><div class="meter-top">에너지<b>${energy || '—'}</b></div><div class="meter-segs">${segs(energy)}</div></div>
      </div>
      ${this._weekStrip()}`;
  },

  /* ── 답변 제출 ── */
  async submitAnswer(role) {
    const pre = role === 'parent' ? 'p' : 'c';
    const textarea = document.getElementById(`${pre}-myAnswer`);
    const btn      = document.getElementById(`${pre}-submitAnswer`);
    const content  = textarea?.value?.trim();
    if (!content) { toast(tone('한 글자라도 써주세요', '한 글자라도 써줘'), 'error'); textarea?.focus(); return; }
    const fc = localStorage.getItem('kync_family_code');
    if (!fc) { toast(tone('먼저 가족과 연결해주세요.', '먼저 가족이랑 연결해줘'), 'error'); return; }

    btn.textContent = '올리는 중';
    btn.disabled = true;
    try {
      await KyncDB.submitAnswer(fc, role, content, this._currentQuestion);
      textarea.disabled = true;
      btn.innerHTML = `${ic('check', 16)}올림`;
      btn.classList.add('done');
      toast(tone('올렸어요', '올렸어'), 'ok');
      const uid = KyncAuth?.current?.uid;
      if (uid && typeof KyncStreak !== 'undefined') KyncStreak.onCheckin(uid).catch(() => {});
    } catch(e) {
      btn.textContent = '올리기';
      btn.disabled = false;
      toast(tone('못 올렸어요. 인터넷 연결을 확인해주세요.', '못 올렸어. 인터넷 연결 확인해줘'), 'error');
    }
  },

  /* ── 체크인 저장 (자녀) ── */
  async saveCheckin() {
    const emotion = this._selectedEmotion;
    if (!emotion) { toast('기분 하나만 골라줘', 'error'); return; }
    const fc = localStorage.getItem('kync_family_code');
    if (!fc) { toast('먼저 가족이랑 연결해줘', 'error'); return; }

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
        toast('저장했어. 부모님 화면에 보여', 'ok');
      } catch(e) {
        toast('저장 못 했어. 인터넷 연결 확인해줘', 'error');
      }
    });
    if (saved) btn.textContent = '고쳐서 저장';
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
