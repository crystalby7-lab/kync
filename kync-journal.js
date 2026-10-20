/* ═══════════════════════════════════════════════════════════
   kync-journal.js — 일기 (자녀)
   - 월·수·금에 오늘 탭에 '오늘의 일기' 카드가 뜸. 그 외에도 언제든 쓸 수 있음
   - 글은 users/{uid}/journal/{id} 에 저장 (본인만)
   - 글마다 '부모님께 보내기'를 켜면 families/{코드}/journal_shared/{id} 에 복사
   - 위험한 표현이 있으면 본인에게만 상담 전화 안내 (부모에게 알리지 않음)
   - 분석은 규칙 기반 (analyze) → 나 사용 설명서 '일기에서 보이는 것'
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
  _prompt: null,
  _share: false,
  _open: null,

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

  /* ════════ 쓰기 화면 ════════ */
  async open(topic, prompt) {
    this._topic = topic || this._topic || 'me';
    this._prompt = prompt === undefined ? null : prompt;
    this._share = false;
    this._open = null;
    KyncUI.openLayer('layer-journal');
    const body = document.getElementById('journal-body');
    body.innerHTML = `<div class="mn-loading">${KyncBrand.curled(56)}</div>`;
    try { await this.load(); } catch (e) {}
    this.render();
    KyncManual?.log?.('journal_open', { from: prompt ? 'prompt' : 'self' });
  },

  render() {
    const body = document.getElementById('journal-body');
    if (!body) return;
    const t = this.TOPICS.find(x => x.id === this._topic) || this.TOPICS[0];
    const draft = document.getElementById('jr-text')?.value || '';
    const wc = this.weekCount();
    body.innerHTML = `
      <div class="jr-head">
        ${KyncBrand.mascot('wait', 64, { role: 'child', cls: 'jr-char' })}
        <div class="jr-week-big">이번 주 <b>${wc}</b>/3</div>
        <p>월·수·금에 질문이 와. 그 외에도 쓰고 싶을 때 써.</p>
      </div>
      <div class="jr-topics" role="tablist">${this.TOPICS.map(x => `
        <button class="${x.id === t.id ? 'on' : ''}" onclick="KyncJournal.pickTopic('${x.id}')">${x.label}</button>`).join('')}</div>
      <div class="jr-prompts">
        ${t.prompts.map(p => `<button class="${p === this._prompt ? 'on' : ''}" data-p="${this._esc(p)}" onclick="KyncJournal.pickPrompt(this.dataset.p)">${this._esc(p)}</button>`).join('')}
        <button class="${this._prompt === null ? 'on' : ''}" onclick="KyncJournal.pickPrompt(null)">질문 없이 쓰기</button>
      </div>
      <div class="jr-compose">
        ${this._prompt ? `<div class="jr-q">${this._esc(this._prompt)}</div>` : ''}
        <textarea id="jr-text" class="textarea jr-text" maxlength="${this.MAX}" placeholder="생각나는 대로" oninput="document.getElementById('jr-count').textContent=this.value.length">${this._esc(draft)}</textarea>
        <div class="jr-row">
          <label class="jr-share"><span class="switch"><input type="checkbox" id="jr-share" ${this._share ? 'checked' : ''} onchange="KyncJournal._share=this.checked"><span class="track"></span></span>
            <span>부모님께 보내기</span></label>
          <span class="count"><span id="jr-count">${draft.length}</span>/${this.MAX}</span>
        </div>
        <button class="btn btn-primary btn-block" id="jr-save" onclick="KyncJournal.save()">저장</button>
        <p class="jr-note">끄면 나만 봐. 보낸 뒤에도 다시 거둘 수 있어.</p>
      </div>
      <div class="qx-section">지난 일기 <span class="qx-count">${this._entries.length}</span></div>
      <div class="jr-list">${this._entries.length ? this._entries.map(e => this._item(e)).join('') : `<p class="mn-wait">아직 없어.</p>`}</div>`;
  },

  _item(e) {
    const open = this._open === e.id;
    const topic = this.TOPICS.find(t => t.id === e.topic)?.label || '';
    return `
      <div class="jr-item ${open ? 'open' : ''}">
        <button class="jr-item-head" onclick="KyncJournal.toggle('${e.id}')">
          <span class="jr-date">${this._fmt(e.day)}${topic ? ` · ${this._esc(topic)}` : ''}</span>
          ${e.shared ? `<span class="pill ${e.read ? 'pill-moss' : 'pill-honey'}">${e.read ? '부모님이 읽음' : '보냄'}</span>` : ''}
        </button>
        ${e.prompt ? `<div class="jr-item-q">${this._esc(e.prompt)}</div>` : ''}
        <div class="jr-item-text">${this._esc(open ? e.text : (e.text.length > 80 ? e.text.slice(0, 80) + '…' : e.text))}</div>
        ${open ? `<div class="jr-item-actions">
          <button class="text-btn" onclick="KyncJournal.setShared('${e.id}', ${!e.shared})">${e.shared ? '부모님께 보낸 거 거두기' : '부모님께 보내기'}</button>
          <button class="text-btn danger" onclick="KyncJournal.remove('${e.id}')">지우기</button>
        </div>` : ''}
      </div>`;
  },

  pickTopic(id) { this._topic = id; this._prompt = null; this.render(); },
  pickPrompt(p) { this._prompt = p; this.render(); document.getElementById('jr-text')?.focus(); },
  toggle(id) { this._open = this._open === id ? null : id; this.render(); },

  _risky(text) { const t = String(text).replace(/\s+/g, ' '); return this.RISK.some(w => t.includes(w)); },

  async save() {
    const text = document.getElementById('jr-text')?.value?.trim();
    if (!text) { toast('한 줄이라도 써줘', 'error'); return; }
    const share = !!document.getElementById('jr-share')?.checked;
    const id = 'j_' + Date.now();
    const entry = { text, topic: this._prompt ? this._topic : '', prompt: this._prompt || '', day: todayKey(), shared: share, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
    const btn = document.getElementById('jr-save');
    let ok = false;
    await KyncUI.busy(btn, '저장하는 중', async () => {
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
    KyncManual?.log?.('journal_write', { len: text.length, topic: this._topic, prompt: !!this._prompt, shared: share });
    document.getElementById('jr-text').value = '';
    this._prompt = null; this._share = false;
    this.render();
    this.renderTodayCard();
    toast(share ? '저장하고 부모님께 보냈어' : '저장했어', 'ok');
    if (document.getElementById('layer-manual')?.classList.contains('open')) KyncManual.open();
    if (this._risky(text)) this._riskSheet();
  },

  async _pushShared(id, e) {
    const fc = this._fc();
    if (!fc) return;
    await db.collection('families').doc(fc).collection('journal_shared').doc(id).set({
      text: e.text, prompt: e.prompt || '', topic: e.topic || '', day: e.day, uid: this._uid(),
      name: localStorage.getItem('kync_user_name') || '', at: firebase.firestore.FieldValue.serverTimestamp(),
    });
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
    KyncManual?.logOnce?.('journal_parent_view', { count: docs.length });
    el.innerHTML = `
      <div class="card-head"><h2>아이가 보낸 일기</h2><span class="pill">${docs.length}</span></div>
      ${docs.slice(0, 5).map(d => `
        <div class="jr-p-item">
          <div class="jr-p-meta">${this._fmt(d.day)}${d.prompt ? ` · ${this._esc(d.prompt)}` : ''}</div>
          <p>${this._esc(d.text)}</p>
          <button class="mn-thx ${d.thanks ? 'on' : ''}" ${d.thanks ? 'disabled' : ''} onclick="KyncJournal.thank('${d.id}')">${ic('heart', 14)}${d.thanks ? '보냄' : '읽었어요'}</button>
        </div>`).join('')}`;
  },

  async thank(id) {
    try {
      await db.collection('families').doc(this._fc()).collection('journal_shared').doc(id).set({ thanks: Date.now() }, { merge: true });
      KyncManual?.log?.('journal_parent_read');
    } catch (e) { toast('보내지 못했어요. 다시 눌러주세요.', 'error'); }
  },
};

window.KyncJournal = KyncJournal;
