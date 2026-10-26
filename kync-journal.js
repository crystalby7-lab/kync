/* ═══════════════════════════════════════════════════════════
   kync-journal.js — 일기 (자녀)
   - 월·수·금에 오늘 탭에 '오늘의 일기' 카드가 뜸. 그 외에도 언제든 쓸 수 있음
   - 글은 users/{uid}/journal/{id} 에 저장 (본인만)
   - 글마다 '부모님께 보내기'를 켜면 families/{코드}/journal_shared/{id} 에 복사
   - 위험한 표현이 있으면 본인에게만 상담 전화 안내 (부모에게 알리지 않음)
   - 분석은 규칙 기반 (analyze) → 나 사용 설명서 '일기에서 보이는 것'
   - 쓰기 화면: 기본은 깔끔하게, '꾸미기'를 열면 종이·글씨·형광펜·사진·노래·스티커
═══════════════════════════════════════════════════════════ */

const KyncJournal = {

  MAX: 1500,
  PROMPT_DAYS: [1, 3, 5],   // 월·수·금

  TOPICS: [
    { id: 'me',     label: '요즘 나',     prompts: ['요즘 제일 자주 떠오르는 생각', '이번 주에 나를 제일 많이 흔든 일', '요즘 나한테 제일 필요한 것'] },
    { id: 'school', label: '학교·공부',   prompts: ['요즘 공부하면서 제일 답답한 것', '이번 주 학교에서 기억에 남는 일', '성적 말고, 요즘 학교생활은 어때'] },
    { id: 'friend', label: '친구',        prompts: ['요즘 친구 관계에서 신경 쓰이는 것', '최근에 고마웠던 친구', '요즘 같이 있으면 편한 사람'] },
    { id: 'family', label: '가족',        prompts: ['가족한테 하고 싶었는데 못 한 말', '최근 집에서 편했던 순간이나 불편했던 순간', '부모님이 몰랐으면 하는 것, 알았으면 하는 것'] },
    { id: 'future', label: '진로·미래',   prompts: ['요즘 미래를 생각하면 드는 기분', '해보고 싶은데 아직 말 못 한 것', '5년 뒤 나한테 하고 싶은 말'] },
    { id: 'mind',   label: '마음',        prompts: ['아무한테도 말 안 한 것', '요즘 나를 지치게 하는 것', '오늘 하루 중 제일 솔직했던 순간'] },
  ],

  // 주제 사전 (분석용)
  THEMES: {
    '공부·학교': ['공부','시험','성적','학원','숙제','수업','과제','학교','선생','수행','중간','기말','모의고사','등급','내신','독서실','자습'],
    '친구':      ['친구','반','단톡','걔','무리','절친','선배','후배','동아리'],
    '가족':      ['엄마','아빠','부모','동생','언니','형','누나','오빠','가족','집','할머니','할아버지'],
    '진로·미래': ['진로','대학','꿈','미래','직업','입시','수시','정시','전공','취업','적성'],
    '몸·잠':     ['잠','피곤','졸려','졸림','아파','아픔','두통','운동','몸','살','다이어트','밥','못잤','밤샘'],
    '연애':      ['좋아하는','남친','여친','연애','고백','썸','짝사랑','헤어'],
    '돈':        ['돈','용돈','알바','지출','저축'],
    '취미':      ['게임','노래','영상','유튜브','웹툰','음악','그림','드라마','영화','책','덕질','공연'],
  },
  NEG: ['힘들','힘듦','짜증','불안','걱정','우울','슬프','슬퍼','화나','화남','외롭','외로','무섭','무서','지치','지침','싫','답답','서운','억울','스트레스','막막','부담','후회','눈물','울었'],
  POS: ['좋','행복','재밌','재미','신나','뿌듯','고마','편하','편해','설레','웃','즐거','기쁘','기뻐','다행','만족','괜찮'],
  RISK: ['죽고 싶','죽고싶','자살','자해','사라지고 싶','사라지고싶','살기 싫','살기싫','없어지고 싶','없어지고싶','손목','극단적','죽어버리','죽는 게 나'],
  STOP: new Set(['그냥','너무','진짜','오늘','내일','어제','조금','많이','엄청','계속','그리고','근데','그래서','하고','해서','있어','없어','있음','없음','같아','같은','나는','내가','이제','아직','다시','정말','완전','약간','했음','했다','해야','하는','되는','같음','그게','이게','저게','뭔가','이번','요즘','때문','생각','지금','나도','내가','우리','그런','이런','저런','하나','정도','진짜로','있는','없는','했는데','하는데','근데','그거','이거']),

  _entries: [],
  _topic: 'me',
  _share: false,

  _esc(s) { return KyncUI.esc(s); },
  _uid() { return KyncAuth?.current?.uid || localStorage.getItem('kync_user_uid'); },
  _fc() { return localStorage.getItem('kync_family_code'); },
  _col() { return db.collection('users').doc(this._uid()).collection('journal'); },
  _fmt(day) { const [y, m, d] = String(day).split('-'); return `${+m}월 ${+d}일`; },

  isPromptDay(d = new Date()) { return this.PROMPT_DAYS.includes(d.getDay()); },
  // 오늘 뜨는 질문 (날짜로 고정)
  todayPrompt() {
    const all = this.TOPICS.flatMap(t => t.prompts.map(p => ({ topic: t.id, label: t.label, prompt: p })));
    return all[Math.floor(localDayNum() / 2) % all.length];
  },
  // 이번 주(월요일 시작) 쓴 개수
  weekCount(entries = this._entries) {
    const now = new Date(), mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7)); mon.setHours(0, 0, 0, 0);
    const k = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`;
    return new Set(entries.filter(e => e.day >= k).map(e => e.day)).size;
  },

  async load() {
    if (!this._uid() || typeof db === 'undefined') return [];
    try {
      const snap = await this._col().orderBy(firebase.firestore.FieldPath.documentId(), 'desc').limit(120).get();
      this._entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('journal load:', e);
      try { const snap = await this._col().limit(120).get(); this._entries = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.id.localeCompare(a.id)); }
      catch (e2) { this._entries = []; throw e2; }
    }
    // 부모님이 읽음 표시
    const fc = this._fc();
    if (fc && this._entries.some(e => e.shared)) {
      try {
        const sh = await db.collection('families').doc(fc).collection('journal_shared').where('uid', '==', this._uid()).get();
        const read = {}; sh.forEach(d => { if (d.data().thanks) read[d.id] = true; });
        this._entries.forEach(e => { e.read = !!read[e.id]; });
      } catch (e) {}
    }
    return this._entries;
  },

  /* ════════ 오늘 탭 카드 (자녀) ════════ */
  async renderTodayCard() {
    const el = document.getElementById('c-journal-card');
    if (!el) return;
    if (localStorage.getItem('kync_role') !== 'child') { el.innerHTML = ''; return; }
    try { await this.load(); } catch (e) {}
    const wrote = this._entries.some(e => e.day === todayKey());
    const wc = this.weekCount();
    if (typeof KyncActivity !== 'undefined') KyncActivity.render();
    if (!this.isPromptDay() && !wrote) { el.innerHTML = ''; el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const p = this.todayPrompt();
    el.innerHTML = wrote ? `
      <div class="jr-today done">
        <div><small>오늘의 일기</small><b>오늘 썼어</b></div>
        <span class="jr-week">이번 주 ${wc}/3</span>
      </div>` : `
      <button class="jr-today" onclick="KyncJournal.open('${p.topic}', ${JSON.stringify(p.prompt).replace(/"/g, '&quot;')})">
        <div><small>오늘의 일기 · ${this._esc(p.label)}</small><b>${this._esc(p.prompt)}</b></div>
        <span class="jr-week">이번 주 ${wc}/3</span>
      </button>`;
  },

  /* ════════ 꾸미기 옵션 ════════ */
  PAPERS: [{ id: 'plain', label: '무지' }, { id: 'line', label: '줄노트' }, { id: 'grid', label: '모눈' }],
  FONTS:  [{ id: 'base', label: '기본' }, { id: 'hand', label: '손글씨' }, { id: 'serif', label: '명조' }],
  SIZES:  [{ id: 's', label: '작게' }, { id: 'm', label: '보통' }, { id: 'l', label: '크게' }],
  HL:     [{ id: 'y', label: '노랑' }, { id: 'p', label: '분홍' }, { id: 'g', label: '초록' }],
  WEATHER: [{ id: 'sun', label: '맑음' }, { id: 'cloud', label: '흐림' }, { id: 'rain', label: '비' }, { id: 'snow', label: '눈' }, { id: 'wind', label: '바람' }],
  STICKERS: ['child', 'play', 'explore', 'study', 'school', 'rest', 'love', 'cheer', 'talk'],
  TAPES: [{ id: 'honey', c: '#F4C56A' }, { id: 'pink', c: '#F2A7BC' }, { id: 'mint', c: '#9FD8BE' }, { id: 'sky', c: '#9EC3E8' }, { id: 'kraft', c: '#CDB08C' }],
  COVERS: ['#7A4E36', '#2B2421', '#3D8A5A', '#4F7FAF', '#C9677A', '#D9952F'],
  DAYS: ['일', '월', '화', '수', '목', '금', '토'],
  MAX_PHOTOS: 2,
  MAX_STICKERS: 3,

  _mode: 'list',
  _d: null,          // 쓰는 중인 일기
  _deco: false,      // 꾸미기 서랍 열림
  _tab: 'paper',
  _focus: false,
  _viewId: null,
  _lastSel: null,
  _saveT: null,

  _loadFonts() {
    if (document.getElementById('jr-fonts')) return;
    const l = document.createElement('link');
    l.id = 'jr-fonts'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=Nanum+Pen+Script&display=swap';
    document.head.appendChild(l);
  },
  _layer() { return document.getElementById('layer-journal'); },
  _blank(topic, prompt) {
    const mood = (App?._lastRecord?.checkin?.emotion) || '';
    return { text: '', marks: [], paper: 'line', font: 'base', size: 'm', mood, weather: '', place: '', song: { t: '', a: '' }, photos: [], stickers: [], tape: '', topic: prompt ? (topic || '') : '', prompt: prompt || '' };
  },
  _draftKey() { return `kync_jr_draft_${this._uid()}`; },
  _readDraft() { try { return JSON.parse(localStorage.getItem(this._draftKey()) || 'null'); } catch (e) { return null; } },
  _writeDraft() {
    const d = this._d; if (!d) return;
    try { localStorage.setItem(this._draftKey(), JSON.stringify(d)); }
    catch (e) { try { localStorage.setItem(this._draftKey(), JSON.stringify({ ...d, photos: [] })); } catch (e2) {} }
    const st = document.getElementById('jr-saved'); if (st) { st.textContent = '임시 저장됨'; st.classList.add('on'); }
  },
  _clearDraft() { try { localStorage.removeItem(this._draftKey()); } catch (e) {} },

  // 표지
  _coverKey() { return `kync_jr_cover_${this._uid()}`; },
  _cover() {
    let c = null;
    try { c = JSON.parse(localStorage.getItem(this._coverKey()) || 'null'); } catch (e) {}
    c = c || KyncAccount?.profile?.journalCover || {};
    return { color: c.color || this.COVERS[0], title: c.title || '나의 기록' };
  },

  /* ════════ 열기 ════════ */
  // topic/prompt가 오면 바로 쓰기, 아니면 일기장
  async open(topic, prompt) {
    this._loadFonts();
    KyncUI.openLayer('layer-journal');
    const body = document.getElementById('journal-body');
    if (topic !== undefined) { this.write(topic, prompt); KyncManual?.log?.('journal_open', { from: 'prompt' }); }
    else { this._mode = 'list'; body.innerHTML = `<div class="mn-loading">${KyncBrand.curled(56)}</div>`; KyncManual?.log?.('journal_open', { from: 'self' }); }
    try { await this.load(); } catch (e) {}
    if (this._mode === 'list') this.render();
  },

  render() {
    if (this._mode === 'write') return this._renderWriter();
    if (this._mode === 'view') return this._renderView();
    this._layer()?.classList.remove('writing', 'focus');
    const body = document.getElementById('journal-body');
    if (!body) return;
    const cv = this._cover(), wc = this.weekCount();
    const t = this.TOPICS.find(x => x.id === this._topic) || this.TOPICS[0];
    const p = this.todayPrompt();
    const draft = this._readDraft();
    body.innerHTML = `
      <div class="jr-cover" style="--cv:${cv.color}">
        <div class="jr-cover-band"></div>
        <div class="jr-cover-in">
          <small>${this._esc(localStorage.getItem('kync_user_name') || '')}</small>
          <b>${this._esc(cv.title)}</b>
          <span>이번 주 ${wc}/3 · 모두 ${this._entries.length}장</span>
        </div>
        ${KyncBrand.mascot('sleepy', 70, { role: 'child', cls: 'jr-cover-char' })}
        <button class="jr-cover-edit" onclick="KyncJournal.editCover()" aria-label="표지 꾸미기">${ic('palette', 18)}</button>
      </div>
      ${draft?.text ? `<button class="jr-draft" onclick="KyncJournal.write()">${ic('edit', 16)}<span>쓰던 일기 이어 쓰기</span>${ic('chev', 16)}</button>` : ''}
      <button class="jr-new" onclick="KyncJournal.write('${p.topic}', ${JSON.stringify(p.prompt).replace(/"/g, '&quot;')})">
        <small>오늘의 질문 · ${this._esc(p.label)}</small><b>${this._esc(p.prompt)}</b><span>${ic('edit', 16)}쓰기</span>
      </button>
      <div class="jr-topics" role="tablist">${this.TOPICS.map(x => `
        <button class="${x.id === t.id ? 'on' : ''}" onclick="KyncJournal.pickTopic('${x.id}')">${x.label}</button>`).join('')}</div>
      <div class="jr-prompts">
        ${t.prompts.map(q => `<button data-p="${this._esc(q)}" onclick="KyncJournal.write('${t.id}', this.dataset.p)">${this._esc(q)}</button>`).join('')}
        <button onclick="KyncJournal.write('', null, true)">질문 없이 쓰기</button>
      </div>
      <div class="qx-section">지난 일기 <span class="qx-count">${this._entries.length}</span></div>
      <div class="jr-list">${this._entries.length ? this._entries.map(e => this._mini(e)).join('') : `<p class="mn-wait">아직 없어. 첫 장을 써봐.</p>`}</div>`;
    body.querySelectorAll('.jr-page.mini').forEach(pg => this._applyPage(pg, this._entries.find(e => e.id === pg.dataset.id)));
    this._newId = null;
  },

  pickTopic(id) { this._topic = id; this.render(); },

  /* ════════ 쓰기 ════════ */
  write(topic, prompt, fresh) {
    this._loadFonts();
    const draft = this._readDraft();
    if (!fresh && draft && draft.text && (topic === undefined || !prompt || draft.prompt === prompt)) {
      this._d = { ...this._blank(), ...draft };
    } else this._d = this._blank(topic, prompt);
    this._mode = 'write'; this._deco = false; this._focus = false; this._tab = 'paper';
    this._renderWriter();
    setTimeout(() => document.getElementById('jr-ed')?.focus(), 250);
  },

  _renderWriter() {
    const body = document.getElementById('journal-body');
    if (!body) return;
    const L = this._layer(); L?.classList.add('writing'); L?.classList.toggle('focus', this._focus);
    const d = this._d;
    body.innerHTML = `
      <div class="jr-w">
        <div class="jr-wtop">
          <button class="icon-btn" onclick="KyncJournal.closeWriter()" aria-label="일기장으로">${ic('back', 22)}</button>
          <span id="jr-saved" class="jr-saved"></span>
          <button class="jr-tbtn ${this._focus ? 'on' : ''}" onclick="KyncJournal.toggleFocus()" aria-label="집중 모드">${ic(this._focus ? 'shrink' : 'expand', 19)}</button>
          <button class="jr-tbtn ${this._deco ? 'on' : ''}" id="jr-deco-btn" onclick="KyncJournal.toggleDeco()">${ic('sparkle', 17)}<span>꾸미기</span></button>
          <button class="btn btn-primary btn-sm" id="jr-save" onclick="KyncJournal.save()">저장</button>
        </div>
        <div class="jr-basic">
          <div class="jr-moods" role="group" aria-label="오늘 기분">${App.EMOTIONS_CHILD.filter(e => !e.legacy).map(e => `
            <button class="${d.mood === e.id ? 'on' : ''}" style="--c:${e.color}" onclick="KyncJournal.set('mood', '${e.id}')" aria-label="${e.label}" title="${e.label}"></button>`).join('')}</div>
          <div class="jr-weather" role="group" aria-label="날씨">${this.WEATHER.map(w => `
            <button class="${d.weather === w.id ? 'on' : ''}" onclick="KyncJournal.set('weather', '${w.id}')" aria-label="${w.label}">${ic(w.id, 19)}</button>`).join('')}</div>
        </div>
        <div class="jr-page-wrap"><div class="jr-page" id="jr-page">${this._pageHtml(d, true)}</div></div>
        <div class="jr-wfoot">
          <label class="jr-share"><span class="switch"><input type="checkbox" id="jr-share" ${this._share ? 'checked' : ''} onchange="KyncJournal._share=this.checked"><span class="track"></span></span><span>부모님께 보내기</span></label>
          <span class="count"><span id="jr-count">${d.text.length}</span>/${this.MAX}</span>
        </div>
        <p class="jr-note">끄면 나만 봐. 사진은 보내도 나만 봐.</p>
        <div class="jr-tray ${this._deco ? 'open' : ''}" id="jr-tray">${this._deco ? this._trayHtml() : ''}</div>
      </div>`;
    this._applyPage();
    this._bindEditor();
  },

  // 페이지 (쓰기·보기·미리보기 공통)
  _pageHtml(d, editable, opt = {}) {
    const day = d.day || todayKey(), dt = new Date(day + 'T00:00:00');
    const w = this.WEATHER.find(x => x.id === d.weather);
    const tape = this.TAPES.find(x => x.id === d.tape);
    const body = editable
      ? `<div id="jr-ed" class="jr-ed" contenteditable="plaintext-only" role="textbox" aria-multiline="true" aria-label="일기" data-ph="생각나는 대로">${this._markup(d.text, d.marks)}</div>`
      : `<div class="jr-ed read">${this._markup(opt.clip ? this._clip(d.text, opt.clip) : d.text, d.marks)}</div>`;
    return `
      ${tape ? `<i class="jr-tape" style="--tc:${tape.c}"></i>` : ''}
      <div class="jr-stamp"><b>${dt.getDate()}</b><span>${dt.getMonth() + 1}월 · ${this.DAYS[dt.getDay()]}요일</span>${w ? `<em>${ic(w.id, 16)}${w.label}</em>` : ''}</div>
      ${d.prompt ? `<div class="jr-pq">${this._esc(d.prompt)}</div>` : ''}
      ${body}
      <div class="jr-attach" id="${editable ? 'jr-attach' : ''}">${this._attachHtml(d, editable, opt)}</div>
      <div class="jr-stk" id="${editable ? 'jr-stk' : ''}">${(d.stickers || []).map((n, i) => `<img class="s${i}" src="images/char/${n}.png" alt="">`).join('')}</div>`;
  },
  _attachHtml(d, editable, opt = {}) {
    const ph = opt.noPhotos ? [] : (d.photos || []);
    const song = d.song?.t ? `<div class="jr-song">${ic('music', 16)}<div><b>${this._esc(d.song.t)}</b>${d.song.a ? `<small>${this._esc(d.song.a)}</small>` : ''}</div></div>` : '';
    const place = d.place ? `<span class="jr-place">${ic('pin', 14)}${this._esc(d.place)}</span>` : '';
    return `${ph.length ? `<div class="jr-photos n${ph.length}">${ph.map((p, i) => `<figure class="jr-pol r${i}"><img src="${p}" alt="">${editable ? `<button onclick="KyncJournal.removePhoto(${i})" aria-label="사진 빼기">${ic('x', 14)}</button>` : ''}</figure>`).join('')}</div>` : ''}${song || place ? `<div class="jr-meta">${song}${place}</div>` : ''}`;
  },
  _applyPage(el = document.getElementById('jr-page'), d = this._d) {
    if (!el || !d) return;
    const emo = App.EMOTIONS_CHILD.find(e => e.id === d.mood);
    const keep = ['mini', 'p', 'flip'].filter(c => el.classList.contains(c)).join(' ');
    el.className = `jr-page paper-${d.paper || 'plain'} font-${d.font || 'base'} size-${d.size || 'm'} ${keep}`;
    el.style.setProperty('--mood', emo?.color || '#FFFFFF');
  },
  _clip(t, n) { return t.length > n ? t.slice(0, n) + '…' : t; },

  // 글 + 형광펜 → HTML
  _markup(text, marks = []) {
    text = String(text || '');
    const ms = (marks || []).filter(m => m.e > m.s && m.s < text.length).sort((a, b) => a.s - b.s);
    let out = '', pos = 0;
    ms.forEach(m => {
      const s = Math.max(m.s, pos), e = Math.min(m.e, text.length);
      if (e <= s) return;
      out += this._esc(text.slice(pos, s)) + `<mark class="hl-${m.c}" data-c="${m.c}">${this._esc(text.slice(s, e))}</mark>`;
      pos = e;
    });
    return out + this._esc(text.slice(pos));
  },
  // 편집 영역 → 글 + 형광펜 위치
  _serialize(root) {
    let text = ''; const marks = [];
    const walk = (node, c) => {
      node.childNodes.forEach(n => {
        if (n.nodeType === 3) { const s = text.length; text += n.nodeValue; if (c && n.nodeValue) marks.push({ s, e: text.length, c }); }
        else if (n.nodeName === 'BR') text += '\n';
        else if (n.nodeName === 'MARK') walk(n, n.dataset.c || 'y');
        else { if ((n.nodeName === 'DIV' || n.nodeName === 'P') && text && !text.endsWith('\n')) text += '\n'; walk(n, c); }
      });
    };
    walk(root, null);
    const merged = [];
    marks.forEach(m => { const l = merged[merged.length - 1]; if (l && l.c === m.c && l.e === m.s) l.e = m.e; else merged.push({ ...m }); });
    return { text, marks: merged };
  },
  _offsets(ed, r) {
    const pre = document.createRange(); pre.selectNodeContents(ed); pre.setEnd(r.startContainer, r.startOffset);
    const wrap = n => { const d = document.createElement('div'); d.appendChild(n); return d; };
    const s = this._serialize(wrap(pre.cloneContents())).text.length;
    return { s, e: s + this._serialize(wrap(r.cloneContents())).text.length };
  },
  _bindEditor() {
    const ed = document.getElementById('jr-ed');
    if (!ed) return;
    if (ed.contentEditable !== 'plaintext-only') ed.contentEditable = 'true';
    ed.addEventListener('input', () => this._sync());
    ed.addEventListener('paste', e => {
      e.preventDefault();
      const txt = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, txt);
    });
    if (!this._selBound) {
      this._selBound = true;
      document.addEventListener('selectionchange', () => {
        const ed2 = document.getElementById('jr-ed'), sel = getSelection();
        if (!ed2 || !sel.rangeCount) return;
        const r = sel.getRangeAt(0);
        if (!r.collapsed && ed2.contains(r.commonAncestorContainer)) this._lastSel = this._offsets(ed2, r);
      });
    }
  },
  _sync() {
    const ed = document.getElementById('jr-ed');
    if (!ed || !this._d) return;
    let { text, marks } = this._serialize(ed);
    if (text.length > this.MAX) { text = text.slice(0, this.MAX); marks = marks.filter(m => m.s < this.MAX).map(m => ({ ...m, e: Math.min(m.e, this.MAX) })); ed.innerHTML = this._markup(text, marks); toast(`${this.MAX}자까지 쓸 수 있어`, 'error'); }
    this._d.text = text; this._d.marks = marks;
    const c = document.getElementById('jr-count'); if (c) c.textContent = text.length;
    const st = document.getElementById('jr-saved'); if (st) st.classList.remove('on');
    clearTimeout(this._saveT); this._saveT = setTimeout(() => this._writeDraft(), 600);
  },

  set(key, val) {
    if (!this._d) return;
    this._d[key] = this._d[key] === val && (key === 'mood' || key === 'weather' || key === 'tape') ? '' : val;
    if (key === 'mood' || key === 'weather') {
      document.querySelectorAll(key === 'mood' ? '.jr-moods button' : '.jr-weather button').forEach(b => b.classList.toggle('on', b.getAttribute('onclick').includes(`'${this._d[key]}'`) && !!this._d[key]));
    }
    this._refreshPage();
    if (this._deco) this._renderTray();
    this._writeDraft();
  },
  // 글은 그대로 두고 장식만 다시 그림
  _refreshPage() {
    const page = document.getElementById('jr-page'), ed = document.getElementById('jr-ed');
    if (!page || !ed) return;
    const d = this._d, w = this.WEATHER.find(x => x.id === d.weather), tape = this.TAPES.find(x => x.id === d.tape);
    const stamp = page.querySelector('.jr-stamp em');
    if (stamp) stamp.remove();
    if (w) page.querySelector('.jr-stamp').insertAdjacentHTML('beforeend', `<em>${ic(w.id, 16)}${w.label}</em>`);
    page.querySelector('.jr-tape')?.remove();
    if (tape) page.insertAdjacentHTML('afterbegin', `<i class="jr-tape" style="--tc:${tape.c}"></i>`);
    document.getElementById('jr-attach').innerHTML = this._attachHtml(d, true);
    document.getElementById('jr-stk').innerHTML = (d.stickers || []).map((n, i) => `<img class="s${i}" src="images/char/${n}.png" alt="">`).join('');
    this._applyPage();
  },

  toggleDeco() {
    this._deco = !this._deco;
    document.getElementById('jr-deco-btn')?.classList.toggle('on', this._deco);
    const tr = document.getElementById('jr-tray');
    tr.classList.toggle('open', this._deco);
    if (this._deco) this._renderTray(); else tr.innerHTML = '';
    KyncManual?.logOnce?.('journal_deco_open');
  },
  toggleFocus() {
    this._focus = !this._focus;
    this._layer()?.classList.toggle('focus', this._focus);
    const b = document.querySelector('.jr-wtop .jr-tbtn');
    if (b) { b.classList.toggle('on', this._focus); b.innerHTML = ic(this._focus ? 'shrink' : 'expand', 19); }
    if (this._focus && this._deco) this.toggleDeco();
    document.getElementById('jr-ed')?.focus();
  },
  tab(id) { this._tab = id; this._renderTray(); },
  _renderTray() { const tr = document.getElementById('jr-tray'); if (tr) tr.innerHTML = this._trayHtml(); },
  _trayHtml() {
    const d = this._d, T = this._tab;
    const tabs = [['paper', 'font', '종이·글씨'], ['hl', 'marker', '형광펜'], ['photo', 'image', '사진'], ['song', 'music', '노래·장소'], ['stk', 'sticker', '스티커']];
    let inner = '';
    if (T === 'paper') inner = `
      <div class="jr-opt"><span>종이</span><div class="jr-chips">${this.PAPERS.map(p => `<button class="jr-paper-chip paper-${p.id} ${d.paper === p.id ? 'on' : ''}" onclick="KyncJournal.set('paper','${p.id}')">${p.label}</button>`).join('')}</div></div>
      <div class="jr-opt"><span>글씨</span><div class="jr-chips">${this.FONTS.map(f => `<button class="font-${f.id} ${d.font === f.id ? 'on' : ''}" onclick="KyncJournal.set('font','${f.id}')">${f.label}</button>`).join('')}</div></div>
      <div class="jr-opt"><span>크기</span><div class="jr-chips">${this.SIZES.map(f => `<button class="${d.size === f.id ? 'on' : ''}" onclick="KyncJournal.set('size','${f.id}')">${f.label}</button>`).join('')}</div></div>`;
    else if (T === 'hl') inner = `
      <p class="jr-hint">칠할 글자를 길게 눌러 고른 다음 색을 눌러</p>
      <div class="jr-chips">${this.HL.map(h => `<button class="jr-hl-chip hl-${h.id}" onpointerdown="event.preventDefault()" onclick="KyncJournal.highlight('${h.id}')"><i></i>${h.label}</button>`).join('')}
        <button onpointerdown="event.preventDefault()" onclick="KyncJournal.highlight('')">지우기</button></div>`;
    else if (T === 'photo') inner = `
      <p class="jr-hint">최대 ${this.MAX_PHOTOS}장 · 부모님께 보내도 사진은 나만 봐</p>
      <label class="jr-add ${d.photos.length >= this.MAX_PHOTOS ? 'off' : ''}">${ic('image', 18)}<span>사진 넣기 ${d.photos.length}/${this.MAX_PHOTOS}</span>
        <input type="file" accept="image/*" hidden ${d.photos.length >= this.MAX_PHOTOS ? 'disabled' : ''} onchange="KyncJournal.addPhoto(this)"></label>`;
    else if (T === 'song') inner = `
      <div class="jr-fields">
        <input class="input" maxlength="40" placeholder="오늘의 노래" value="${this._esc(d.song?.t || '')}" oninput="KyncJournal.setSong('t', this.value)">
        <input class="input" maxlength="30" placeholder="가수" value="${this._esc(d.song?.a || '')}" oninput="KyncJournal.setSong('a', this.value)">
        <input class="input" maxlength="30" placeholder="장소" value="${this._esc(d.place || '')}" oninput="KyncJournal.setPlace(this.value)">
      </div>`;
    else inner = `
      <div class="jr-opt"><span>스티커 ${d.stickers.length}/${this.MAX_STICKERS}</span></div>
      <div class="jr-stk-grid">${this.STICKERS.map(n => `<button class="${d.stickers.includes(n) ? 'on' : ''}" onclick="KyncJournal.toggleSticker('${n}')"><img src="images/char/${n}.png" alt=""></button>`).join('')}</div>
      <div class="jr-opt"><span>마스킹테이프</span><div class="jr-chips">${this.TAPES.map(t => `<button class="jr-tape-chip ${d.tape === t.id ? 'on' : ''}" style="--tc:${t.c}" onclick="KyncJournal.set('tape','${t.id}')" aria-label="테이프"></button>`).join('')}</div></div>`;
    return `<div class="jr-tabs">${tabs.map(([id, icn, lb]) => `<button class="${T === id ? 'on' : ''}" onclick="KyncJournal.tab('${id}')">${ic(icn, 16)}<span>${lb}</span></button>`).join('')}</div><div class="jr-tray-body">${inner}</div>`;
  },

  highlight(c) {
    const ed = document.getElementById('jr-ed');
    if (!ed) return;
    const sel = getSelection();
    let rng = null;
    if (sel.rangeCount) { const r = sel.getRangeAt(0); if (!r.collapsed && ed.contains(r.commonAncestorContainer)) rng = this._offsets(ed, r); }
    rng = rng || this._lastSel;
    if (!rng || rng.e <= rng.s) { toast('칠할 글자를 먼저 골라줘', 'error'); return; }
    const cur = this._serialize(ed);
    const marks = [];
    cur.marks.forEach(m => {
      if (m.e <= rng.s || m.s >= rng.e) { marks.push(m); return; }
      if (m.s < rng.s) marks.push({ s: m.s, e: rng.s, c: m.c });
      if (m.e > rng.e) marks.push({ s: rng.e, e: m.e, c: m.c });
    });
    if (c) marks.push({ s: rng.s, e: rng.e, c });
    ed.innerHTML = this._markup(cur.text, marks.sort((a, b) => a.s - b.s));
    this._lastSel = null; getSelection().removeAllRanges();
    this._sync();
  },
  async addPhoto(input) {
    const f = input.files?.[0]; input.value = '';
    if (!f || this._d.photos.length >= this.MAX_PHOTOS) return;
    const raw = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.onerror = () => r(null); fr.readAsDataURL(f); });
    const out = await this._compress(raw);
    if (!out) { toast('사진을 못 넣었어. 다른 사진으로 해봐', 'error'); return; }
    this._d.photos.push(out);
    this._refreshPage(); this._renderTray(); this._writeDraft();
  },
  removePhoto(i) { this._d.photos.splice(i, 1); this._refreshPage(); if (this._deco) this._renderTray(); this._writeDraft(); },
  _compress(dataUrl, maxSize = 900, maxBytes = 280000) {
    if (typeof KyncDiary !== 'undefined' && KyncDiary._compressImage) return KyncDiary._compressImage(dataUrl, maxSize, maxBytes);
    return Promise.resolve(dataUrl && dataUrl.length <= maxBytes ? dataUrl : null);
  },
  setSong(k, v) { this._d.song = { ...(this._d.song || {}), [k]: v.trim() }; document.getElementById('jr-attach').innerHTML = this._attachHtml(this._d, true); this._writeDraft(); },
  setPlace(v) { this._d.place = v.trim(); document.getElementById('jr-attach').innerHTML = this._attachHtml(this._d, true); this._writeDraft(); },
  toggleSticker(n) {
    const s = this._d.stickers;
    const i = s.indexOf(n);
    if (i >= 0) s.splice(i, 1);
    else if (s.length >= this.MAX_STICKERS) { toast(`스티커는 ${this.MAX_STICKERS}개까지`, 'error'); return; }
    else s.push(n);
    this._refreshPage(); this._renderTray(); this._writeDraft();
  },

  closeWriter() {
    if (this._d?.text) this._writeDraft();
    this._mode = 'list'; this._focus = false;
    this.render();
  },

  _risky(text) { const t = String(text).replace(/\s+/g, ' '); return this.RISK.some(w => t.includes(w)); },

  async save() {
    const ed = document.getElementById('jr-ed');
    if (ed) this._sync();
    const d = this._d;
    const text = (d?.text || '').trim();
    if (!text) { toast('한 줄이라도 써줘', 'error'); return; }
    const share = !!document.getElementById('jr-share')?.checked;
    const id = 'j_' + Date.now();
    // 앞뒤 공백을 지우면 형광펜 위치도 맞춰줌
    const lead = d.text.length - d.text.trimStart().length;
    const marks = (d.marks || []).map(m => ({ s: m.s - lead, e: m.e - lead, c: m.c })).filter(m => m.e > 0 && m.s < text.length).map(m => ({ ...m, s: Math.max(0, m.s), e: Math.min(text.length, m.e) }));
    const entry = {
      text, marks, topic: d.prompt ? d.topic : '', prompt: d.prompt || '', day: todayKey(), shared: share,
      paper: d.paper, font: d.font, size: d.size, mood: d.mood || '', weather: d.weather || '', place: d.place || '',
      song: d.song?.t ? { t: d.song.t, a: d.song.a || '' } : null, photos: d.photos || [], stickers: d.stickers || [], tape: d.tape || '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    const btn = document.getElementById('jr-save');
    let ok = false;
    await KyncUI.busy(btn, '저장 중', async () => {
      try {
        await this._col().doc(id).set(entry);
        if (share) await this._pushShared(id, entry);
        ok = true;
      } catch (e) {
        console.warn('journal save:', e);
        toast(`저장 못 했어 (${e?.code || '연결 확인'})`, 'error');
      }
    });
    if (!ok) return;
    this._entries.unshift({ id, ...entry });
    KyncManual?.log?.('journal_write', { len: text.length, topic: entry.topic, prompt: !!entry.prompt, shared: share,
      deco: { paper: entry.paper, font: entry.font, hl: marks.length, photos: entry.photos.length, song: !!entry.song, place: !!entry.place, stickers: entry.stickers.length, tape: !!entry.tape, mood: !!entry.mood, weather: !!entry.weather } });
    this._clearDraft();
    // 페이지 넘기기
    const page = document.getElementById('jr-page');
    page?.classList.add('flip');
    await new Promise(r => setTimeout(r, 560));
    this._d = null; this._share = false; this._mode = 'list'; this._focus = false; this._newId = id;
    this.render();
    this.renderTodayCard();
    toast(share ? '저장하고 부모님께 보냈어' : '한 장 저장했어', 'ok');
    window.KyncDaily?.refresh?.();
    if (document.getElementById('layer-manual')?.classList.contains('open')) KyncManual.open();
    if (this._risky(text)) this._riskSheet();
  },

  // 공유본: 사진은 빼고
  async _pushShared(id, e) {
    const fc = this._fc();
    if (!fc) return;
    await db.collection('families').doc(fc).collection('journal_shared').doc(id).set({
      text: e.text, marks: e.marks || [], prompt: e.prompt || '', topic: e.topic || '', day: e.day, uid: this._uid(),
      paper: e.paper || 'plain', font: e.font || 'base', size: e.size || 'm', mood: e.mood || '', weather: e.weather || '', place: e.place || '',
      song: e.song || null, stickers: e.stickers || [], tape: e.tape || '',
      name: localStorage.getItem('kync_user_name') || '', at: firebase.firestore.FieldValue.serverTimestamp(),
    });
  },

  /* ════════ 일기장 목록 · 한 장 보기 ════════ */
  _mini(e) {
    const isNew = this._newId === e.id;
    return `
      <button class="jr-mini ${isNew ? 'new' : ''}" onclick="KyncJournal.view('${e.id}')">
        <div class="jr-page mini" data-id="${e.id}" style="--mood:${App.EMOTIONS_CHILD.find(x => x.id === e.mood)?.color || '#FFFFFF'}">${this._pageHtml(e, false, { clip: 110 })}</div>
        ${e.shared ? `<span class="pill ${e.read ? 'pill-moss' : 'pill-honey'} jr-mini-pill">${e.read ? '부모님이 읽음' : '보냄'}</span>` : ''}
      </button>`;
  },
  view(id) { this._viewId = id; this._mode = 'view'; this._renderView(); },
  _renderView() {
    const e = this._entries.find(x => x.id === this._viewId);
    if (!e) { this._mode = 'list'; return this.render(); }
    const L = this._layer(); L?.classList.add('writing'); L?.classList.remove('focus');
    const body = document.getElementById('journal-body');
    body.innerHTML = `
      <div class="jr-w">
        <div class="jr-wtop">
          <button class="icon-btn" onclick="KyncJournal._mode='list';KyncJournal.render()" aria-label="일기장으로">${ic('back', 22)}</button>
          <span class="jr-saved on">${this._fmt(e.day)}</span>
          ${e.shared ? `<span class="pill ${e.read ? 'pill-moss' : 'pill-honey'}">${e.read ? '부모님이 읽음' : '보냄'}</span>` : ''}
        </div>
        <div class="jr-page-wrap"><div class="jr-page" id="jr-vpage">${this._pageHtml(e, false)}</div></div>
        <div class="jr-item-actions">
          <button class="text-btn" onclick="KyncJournal.setShared('${e.id}', ${!e.shared})">${e.shared ? '부모님께 보낸 거 거두기' : '부모님께 보내기'}</button>
          <button class="text-btn danger" onclick="KyncJournal.remove('${e.id}')">지우기</button>
        </div>
      </div>`;
    this._applyPage(document.getElementById('jr-vpage'), e);
  },

  editCover() {
    const cv = this._cover();
    this._coverSheet = KyncUI.sheet(`
      <h2>표지</h2>
      <div class="jr-cover-colors">${this.COVERS.map(c => `<button class="${c === cv.color ? 'on' : ''}" style="background:${c}" data-c="${c}" onclick="this.parentNode.querySelectorAll('button').forEach(b=>b.classList.remove('on'));this.classList.add('on')" aria-label="표지 색"></button>`).join('')}</div>
      <label class="label" for="jr-cover-title">제목</label>
      <input id="jr-cover-title" class="input" maxlength="16" value="${this._esc(cv.title)}">
      <button class="btn btn-primary btn-block" style="margin-top:16px" onclick="KyncJournal.saveCover()">저장</button>`, { id: 'jr-cover-sheet' });
  },
  async saveCover() {
    const color = document.querySelector('.jr-cover-colors button.on')?.dataset.c || this.COVERS[0];
    const title = document.getElementById('jr-cover-title')?.value.trim() || '나의 기록';
    const c = { color, title };
    try { localStorage.setItem(this._coverKey(), JSON.stringify(c)); } catch (e) {}
    if (KyncAccount?.profile) KyncAccount.profile.journalCover = c;
    try { KyncDB?.updateUser?.(this._uid(), { journalCover: c })?.catch?.(() => {}); } catch (e) {}
    this._coverSheet?.close();
    KyncManual?.log?.('journal_cover', { color });
    this.render();
  },

  async setShared(id, on) {
    const e = this._entries.find(x => x.id === id);
    if (!e) return;
    try {
      await this._col().doc(id).update({ shared: on });
      const ref = db.collection('families').doc(this._fc()).collection('journal_shared').doc(id);
      if (on) await this._pushShared(id, e); else await ref.delete();
      e.shared = on;
      KyncManual?.log?.(on ? 'journal_share_on' : 'journal_share_off');
      toast(on ? '부모님께 보냈어' : '거뒀어', 'ok');
      this.render();
    } catch (err) { toast(`바꾸지 못했어 (${err?.code || '연결 확인'})`, 'error'); }
  },

  async remove(id) {
    if (!await KyncUI.confirm({ title: '이 일기를 지울까?', message: '부모님께 보낸 거라면 거기서도 지워져.', ok: '지우기', danger: true })) return;
    try {
      await this._col().doc(id).delete();
      if (this._fc()) await db.collection('families').doc(this._fc()).collection('journal_shared').doc(id).delete().catch(() => {});
      this._entries = this._entries.filter(x => x.id !== id);
      this._mode = 'list';
      this.render();
      this.renderTodayCard();
    } catch (e) { toast('지우지 못했어', 'error'); }
  },

  _riskSheet() {
    KyncUI.sheet(`
      <h2>많이 힘들었구나</h2>
      <p class="sheet-sub">지금 바로 얘기할 수 있는 곳이 있어. 이 내용은 부모님께 따로 알리지 않아.</p>
      <div class="jr-help">
        <a href="tel:1388" class="jr-help-row"><b>청소년상담 1388</b><small>전화·문자·카카오톡, 24시간</small></a>
        <a href="tel:109" class="jr-help-row"><b>자살예방상담 109</b><small>24시간</small></a>
      </div>
      <button class="btn btn-soft btn-block" data-close style="margin-top:14px">닫기</button>`, { id: 'jr-help-sheet' });
    KyncManual?.log?.('journal_risk_help');
  },

  /* ════════ 규칙 기반 분석 ════════ */
  // checkinByDay: { 'YYYY-MM-DD': { stress, energy, emotion } }
  analyze(entries, checkinByDay = {}) {
    const n = entries.length;
    if (n < 3) return { need: 3 - n, n };
    const tokens = text => String(text).replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
    const has = (text, w) => text.includes(w);
    const theme = {}, themeDays = {}, words = {}, posWords = {};
    let negN = 0, posN = 0;
    const rows = entries.map(e => {
      const t = e.text || '';
      const themes = Object.entries(this.THEMES).filter(([, ws]) => ws.some(w => has(t, w))).map(([k]) => k);
      themes.forEach(k => { theme[k] = (theme[k] || 0) + 1; (themeDays[k] = themeDays[k] || []).push(e.day); });
      const neg = this.NEG.filter(w => has(t, w)).length, pos = this.POS.filter(w => has(t, w)).length;
      const tone = neg > pos ? 'neg' : pos > neg ? 'pos' : 'mid';
      if (tone === 'neg') negN++; if (tone === 'pos') posN++;
      const uniq = new Set(tokens(t).map(w => w.replace(/(이랑|에서|까지|부터|이라|해서|하고|이야|이고|은|는|이|가|을|를|에|도|만|랑|와|과|의|로|야|요)$/, ''))
        .filter(w => w.length >= 2 && !this.STOP.has(w)));
      uniq.forEach(w => { words[w] = (words[w] || 0) + 1; if (tone === 'pos') posWords[w] = (posWords[w] || 0) + 1; });
      return { day: e.day, tone, themes };
    });
    const topThemes = Object.entries(theme).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, c]) => {
      const st = themeDays[k].map(d => +checkinByDay[d]?.stress).filter(Boolean);
      return { theme: k, count: c, pct: Math.round(c / n * 100), stress: st.length >= 2 ? Math.round(st.reduce((a, b) => a + b, 0) / st.length * 10) / 10 : null };
    });
    const themeWords = new Set(Object.values(this.THEMES).flat());
    const repeated = Object.entries(words).filter(([w, c]) => c >= 3 && !themeWords.has(w)).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w, c]) => ({ w, c }));
    const lift = Object.entries(posWords).filter(([w, c]) => c >= 2 && !this.POS.some(p => w.includes(p))).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([w]) => w);

    // 이번 달 vs 지난달
    const ym = d => d.slice(0, 7);
    const now = todayKey().slice(0, 7);
    const prevD = new Date(); prevD.setDate(1); prevD.setMonth(prevD.getMonth() - 1);
    const prev = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}`;
    const cur = rows.filter(r => ym(r.day) === now), last = rows.filter(r => ym(r.day) === prev);
    const negRate = arr => arr.length ? Math.round(arr.filter(r => r.tone === 'neg').length / arr.length * 100) : null;
    const month = { count: cur.length, negRate: negRate(cur), lastCount: last.length, lastNegRate: negRate(last) };

    return { n, topThemes, negPct: Math.round(negN / n * 100), posPct: Math.round(posN / n * 100), repeated, lift, month };
  },

  /* ════════ 부모 화면: 아이가 보낸 일기 ════════ */
  _sharedDocs: [],
  _unsub: null,
  listenParent() {
    const fc = this._fc();
    if (!fc || typeof db === 'undefined') return;
    if (this._unsub) { try { this._unsub(); } catch (e) {} }
    this._unsub = db.collection('families').doc(fc).collection('journal_shared').onSnapshot(snap => {
      this._sharedDocs = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.id.localeCompare(a.id));
      this.renderParent();
      if (typeof KyncInbox !== 'undefined') KyncInbox.refresh();
    }, e => console.warn('journal listen:', e));
  },
  stop() { if (this._unsub) { try { this._unsub(); } catch (e) {} this._unsub = null; } this._sharedDocs = []; },

  renderParent() {
    const el = document.getElementById('p-journal-card');
    if (!el) return;
    const docs = this._sharedDocs || [];
    if (!docs.length) { el.classList.add('hidden'); el.innerHTML = ''; return; }
    el.classList.remove('hidden');
    this._loadFonts();
    KyncManual?.logOnce?.('journal_parent_view', { count: docs.length });
    el.innerHTML = `
      <div class="card-head"><h2>아이가 보낸 일기</h2><span class="pill">${docs.length}</span></div>
      <div class="jr-p-list">${docs.slice(0, 5).map(d => `
        <div class="jr-p-item">
          <div class="jr-page p" style="--mood:${App.EMOTIONS_CHILD.find(x => x.id === d.mood)?.color || '#FFFFFF'}">${this._pageHtml(d, false, { noPhotos: true })}</div>
          <button class="mn-thx ${d.thanks ? 'on' : ''}" ${d.thanks ? 'disabled' : ''} onclick="KyncJournal.thank('${d.id}')">${ic('heart', 14)}${d.thanks ? '보냄' : '읽었어요'}</button>
        </div>`).join('')}</div>`;
    el.querySelectorAll('.jr-page.p').forEach((pg, i) => this._applyPage(pg, docs[i]));
  },

  async thank(id) {
    try {
      await db.collection('families').doc(this._fc()).collection('journal_shared').doc(id).set({ thanks: Date.now() }, { merge: true });
      KyncManual?.log?.('journal_parent_read');
    } catch (e) { toast('보내지 못했어요. 다시 눌러주세요.', 'error'); }
  },
};

window.KyncJournal = KyncJournal;
