/* ═══════════════════════════════════════════════════════════
   kync-quests2.js — 가족 퀘스트
   구성: 진행 중 → 받은 제안 → 보낸 제안 → 새 퀘스트 추가 → 완료
   규칙:
     - 제안한 사람은 자동 동의, 상대가 '같이 할래요' 누르면 시작
     - 하루는 부모·자녀 둘 다 '오늘 했어요'를 눌러야 채워짐
     - 채운 날 수가 기간만큼 되면 완료
   데이터: families/{코드}/quests2/{id}
═══════════════════════════════════════════════════════════ */

const KyncQuests2 = {

  TEMPLATES: [
    { id:'t1', title:'밥 먹을 땐 폰 뒤집기',     desc:'같이 먹을 때 둘 다',                 days:7 },
    { id:'t2', title:'잘 자 인사하고 자기',       desc:'말로 해도, 카톡으로 해도',           days:5 },
    { id:'t3', title:'오늘 있었던 일 하나씩',     desc:'자기 전에 하나만 얘기하기',          days:7 },
    { id:'t4', title:'성적·공부 얘기 금지',       desc:'먼저 꺼내는 사람이 지는 거',         days:3 },
    { id:'t5', title:'10분 같이 걷기',            desc:'동네 한 바퀴라도',                   days:5 },
    { id:'t6', title:'고마운 거 하나 말하기',     desc:'사소한 거라도',                      days:7 },
    { id:'t7', title:'노래 한 곡씩 추천하기',     desc:'서로 하나씩 보내고 들어보기',        days:5 },
    { id:'t8', title:'포스트잇 한 장',            desc:'짧게 써서 눈에 띄는 데 붙이기',      days:3 },
  ],

  _quests: [],
  _containerId: null,
  _role: null,
  _unsub: null,
  _showDone: false,

  _fc() { return localStorage.getItem('kync_family_code'); },
  _other(role) { return role === 'parent' ? 'child' : 'parent'; },
  _otherLabel(role) { return role === 'parent' ? '자녀' : '부모님'; },
  _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[c]));
  },
  _today() { return typeof todayKey === 'function' ? todayKey() : new Date().toISOString().slice(0,10); },
  _ref(id) { return db.collection('families').doc(this._fc()).collection('quests2').doc(id); },

  stop() { if (this._unsub) { try { this._unsub(); } catch(e) {} this._unsub = null; } },

  // 둘 다 체크한 날 수
  _doneDays(q) {
    return Object.values(q.checks || {}).filter(c => c?.parent && c?.child).length;
  },

  /* ── 초기화 ── */
  init(containerId, myRole) {
    this._containerId = containerId;
    this._role = myRole;
    const fc = this._fc();

    if (this._unsub) { try { this._unsub(); } catch(e) {} this._unsub = null; }

    // 서버 값 오기 전 캐시로 먼저 그림
    try { this._quests = JSON.parse(localStorage.getItem(`kync_quests2_${fc}`) || '[]'); }
    catch(e) { this._quests = []; }
    this.render();

    if (!fc || typeof db === 'undefined') return;
    this._unsub = db.collection('families').doc(fc).collection('quests2')
      .onSnapshot(snap => {
        this._quests = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        try { localStorage.setItem(`kync_quests2_${fc}`, JSON.stringify(this._quests)); } catch(e) {}
        this.render();
        if (typeof KyncInbox !== 'undefined') KyncInbox.refresh();
      }, err => console.warn('quests listen:', err));
  },

  // 예전 이름 호환
  open(containerId, myRole) { this.init(containerId, myRole); },

  /* ── 전체 그리기 ── */
  render() {
    const el = document.getElementById(this._containerId);
    if (!el) return;
    const role = this._role;

    if (!this._fc()) {
      el.innerHTML = `<div class="qx-empty">${KyncBrand.curled(40)}${tone('가족과 연결하면 퀘스트를 할 수 있어요.', '가족이랑 연결하면 퀘스트 할 수 있어.')}</div>`;
      return;
    }

    const byNew = (a, b) => String(b.id).localeCompare(String(a.id));
    const qs = this._quests.filter(q => q.status !== 'declined' && q.status !== 'stopped').sort(byNew);
    const active   = qs.filter(q => q.status === 'active');
    const received = qs.filter(q => q.status === 'pending' && !q.agreed?.[role]);
    const sent     = qs.filter(q => q.status === 'pending' && q.agreed?.[role]);
    const done     = qs.filter(q => q.status === 'done');

    let html = '';

    html += `<div class="qx-section">진행 중</div>`;
    html += active.length
      ? active.map(q => this._activeCard(q)).join('')
      : `<div class="qx-empty">${KyncBrand.mascot('sleepy', 44, { shadow: false })}<span>${tone('진행 중인 퀘스트가 없어요.', '진행 중인 퀘스트 없음.')}<br>${tone('아래에서 하나 골라 제안해보세요.', '아래에서 하나 골라서 제안해봐.')}</span></div>`;

    if (received.length) {
      html += `<div class="qx-section">받은 제안 <span class="qx-count">${received.length}</span></div>`;
      html += received.map(q => this._receivedCard(q)).join('');
    }

    if (sent.length) {
      html += `<div class="qx-section">보낸 제안</div>`;
      html += sent.map(q => this._sentCard(q)).join('');
    }

    html += `<button class="qx-add" onclick="KyncQuests2.openAddSheet()">${ic('plus', 20)}퀘스트 제안하기</button>`;

    if (done.length) {
      html += `<button class="qx-toggle" onclick="KyncQuests2.toggleDone()" aria-expanded="${this._showDone}">
        완료한 퀘스트 ${done.length}개 ${ic(this._showDone ? 'up' : 'down', 18)}</button>`;
      if (this._showDone) html += done.map(q => this._doneCard(q)).join('');
    }

    el.innerHTML = html;
  },

  toggleDone() { this._showDone = !this._showDone; this.render(); },

  /* ── 카드들 ── */
  _activeCard(q) {
    const role = this._role, other = this._other(role);
    const doneDays = this._doneDays(q);
    const pct = Math.min(100, Math.round(doneDays / q.days * 100));
    const today = q.checks?.[this._today()] || {};
    const mine = !!today[role], theirs = !!today[other];

    let status;
    if (mine && theirs) status = tone('오늘 칸 채웠어요', '오늘 칸 채움');
    else if (mine)      status = tone(`${this._otherLabel(role)}만 체크하면 돼요`, `${this._otherLabel(role)}만 체크하면 돼`);
    else if (theirs)    status = tone(`${this._otherLabel(role)}은(는) 오늘 했대요`, `${this._otherLabel(role)}은 오늘 했대`);
    else                status = tone('둘 다 체크해야 하루가 채워져요', '둘 다 체크해야 하루가 채워져');

    return `
      <div class="qx-card">
        <div class="qx-title">${this._esc(q.title)}</div>
        ${q.desc ? `<div class="qx-desc">${this._esc(q.desc)}</div>` : ''}
        <div class="qx-progress-row">
          <span><b>${doneDays}</b> / ${q.days}일</span>
          <span>${pct}%</span>
        </div>
        <div class="bar"><div style="width:${pct}%"></div></div>
        <div class="qx-today">
          <div class="qx-who ${(role === 'parent' ? mine : theirs) ? 'on' : ''}">${(role === 'parent' ? mine : theirs) ? ic('check', 15) : ''}부모님</div>
          <div class="qx-who ${(role === 'child' ? mine : theirs) ? 'on' : ''}">${(role === 'child' ? mine : theirs) ? ic('check', 15) : ''}자녀</div>
        </div>
        <button class="btn btn-block ${mine ? 'done' : 'btn-primary'}" ${mine ? 'disabled' : ''}
          onclick="KyncQuests2.checkToday('${q.id}')">${mine ? ic('check', 18) + tone('오늘 체크함', '오늘 체크함') : tone('오늘 했어요', '오늘 했어')}</button>
        <div class="qx-status">${status}</div>
        <button class="text-btn qx-stop" onclick="KyncQuests2.stopQuest('${q.id}')">그만하기</button>
      </div>`;
  },

  _receivedCard(q) {
    return `
      <div class="qx-card">
        <div class="qx-from">${q.createdBy === 'parent' ? '부모님' : '자녀'}의 제안 · ${q.days}일</div>
        <div class="qx-title">${this._esc(q.title)}</div>
        ${q.desc ? `<div class="qx-desc">${this._esc(q.desc)}</div>` : ''}
        <div class="qx-actions">
          <button class="btn btn-soft" onclick="KyncQuests2.decline('${q.id}')">다음에</button>
          <button class="btn btn-primary" onclick="KyncQuests2.accept('${q.id}')">${tone('같이 할게요', '같이 할래')}</button>
        </div>
      </div>`;
  },

  _sentCard(q) {
    return `
      <div class="qx-card qx-muted">
        <div class="qx-title">${this._esc(q.title)}</div>
        <div class="qx-desc">${q.days}일 · ${this._otherLabel(this._role)} ${tone('대답 기다리는 중', '대답 기다리는 중')}</div>
        <button class="text-btn" style="margin-top:6px" onclick="KyncQuests2.cancel('${q.id}')">제안 취소</button>
      </div>`;
  },

  _doneCard(q) {
    return `
      <div class="qx-card qx-done">
        ${ic('checkCircle', 22)}
        <div><div class="qx-title" style="font-size:15px">${this._esc(q.title)}</div>
        <div class="qx-desc">${q.days}일 완료${q.doneAt ? ', ' + this._esc(q.doneAt.replace(/-/g, '.')) : ''}</div></div>
      </div>`;
  },

  /* ── 동작 ── */
  async _write(id, data) {
    try { await this._ref(id).set(data, { merge: true }); }
    catch(e) { toast('저장하지 못했어요. 다시 시도해주세요.', 'error'); throw e; }
  },

  async accept(id) {
    await this._write(id, {
      agreed: { [this._role]: true },
      status: 'active',
      startDate: this._today(),
    });
    const q = this._quests.find(x => x.id === id);
    if (q) this._popStarted(q.title);
  },

  async decline(id) {
    if (!await KyncUI.confirm({ title: tone('이번엔 안 할까요?', '이번엔 안 할래?'), ok: '다음에' })) return;
    await this._write(id, { status: 'declined', declinedBy: this._role });
  },

  async cancel(id) {
    if (!await KyncUI.confirm({ title: tone('보낸 제안을 취소할까요?', '보낸 제안 취소할까?'), ok: '취소', cancel: '그대로 두기' })) return;
    await this._write(id, { status: 'declined', declinedBy: this._role });
  },

  async stopQuest(id) {
    if (!await KyncUI.confirm({ title: tone('이 퀘스트를 그만할까요?', '이거 그만할까?'), message: tone('채운 날은 지워지고 목록에서 사라져요.', '채운 날은 지워지고 목록에서 없어져.'), ok: '그만하기', danger: true })) return;
    await this._write(id, { status: 'stopped', stoppedBy: this._role });
  },

  async checkToday(id) {
    const role = this._role, day = this._today();
    try {
      await this._ref(id).update({ [`checks.${day}.${role}`]: true });
      // 채운 날 수가 기간만큼 되면 완료
      const snap = await this._ref(id).get();
      const q = snap.data();
      if (q && q.status === 'active' && this._doneDays(q) >= q.days) {
        await this._ref(id).set({ status: 'done', doneAt: day }, { merge: true });
        this._popDone(q.title);
      }
    } catch(e) { toast('저장하지 못했어요. 다시 시도해주세요.', 'error'); }
  },

  async _addQuest(q) {
    const fc = this._fc();
    if (!fc) { toast('먼저 가족과 연결해주세요.', 'error'); return; }
    const role = this._role;
    const id = 'q_' + Date.now();
    await this._write(id, {
      id,
      title: q.title,
      desc: q.desc || '',
      days: q.days,
      status: 'pending',
      agreed: { parent: role === 'parent', child: role === 'child' },
      createdBy: role,
      createdAt: this._today(),
      checks: {},
    });
    this.closeAddSheet();
    toast(tone(`${this._otherLabel(role)}에게 제안했어요`, `${this._otherLabel(role)}한테 제안했어`), 'ok');
  },

  addFromTemplate(templateId) {
    const t = this.TEMPLATES.find(t => t.id === templateId);
    if (t) this._addQuest(t);
  },

  addCustom() {
    const title = document.getElementById('qx-custom-title')?.value?.trim();
    const desc  = document.getElementById('qx-custom-desc')?.value?.trim();
    const days  = Math.min(30, Math.max(1, parseInt(document.getElementById('qx-custom-days')?.value) || 7));
    if (!title) { toast(tone('이름을 써주세요', '이름 써줘'), 'error'); return; }
    this._addQuest({ title, desc, days });
  },

  /* ── 추가 시트 ── */
  openAddSheet() {
    this._sheet = KyncUI.sheet(`
      <h2>퀘스트 제안하기</h2>
      <p class="sheet-sub">${tone(`${this._otherLabel(this._role)}이(가) 같이 한다고 하면 시작돼요.`, `${this._otherLabel(this._role)}이 같이 한다고 하면 시작돼.`)}</p>
      <div class="label" style="margin-bottom:8px">골라서 바로</div>
      <div class="qx-templates">
        ${this.TEMPLATES.map(t => `
          <button class="qx-template" onclick="KyncQuests2.addFromTemplate('${t.id}')">
            <div class="qx-t-title">${this._esc(t.title)}</div>
            <div class="qx-t-meta">${this._esc(t.desc)}<br>${t.days}일</div>
          </button>`).join('')}
      </div>
      <div class="label" style="margin:20px 0 8px">직접 만들기</div>
      <div class="stack" style="gap:8px">
        <input id="qx-custom-title" class="input" maxlength="20" placeholder="퀘스트 이름" aria-label="퀘스트 이름">
        <input id="qx-custom-desc" class="input" maxlength="40" placeholder="어떻게 할지 (안 써도 됨)" aria-label="어떻게 할지">
        <div class="row">
          <label class="qx-days"><input id="qx-custom-days" type="number" min="1" max="30" value="7" aria-label="기간(일)">일</label>
          <button class="btn btn-primary grow" onclick="KyncQuests2.addCustom()">제안하기</button>
        </div>
      </div>`, { id: 'qx-sheet' });
  },

  closeAddSheet() { this._sheet?.close(); this._sheet = null; },

  /* ── 알림 ── */
  _popStarted(title) {
    KyncUI.confirm({ title: tone('시작했어요', '시작!'), message: `“${title}”\n${tone('둘 다 체크한 날만 하루로 쳐요.', '둘 다 체크한 날만 하루로 쳐.')}`, ok: tone('확인', '오케이'), cancel: null, mascot: 'happy' });
  },
  _popDone(title) {
    KyncUI.confirm({ title: tone('다 채웠어요', '다 채웠다'), message: `“${title}”`, ok: tone('확인', '오케이'), cancel: null, mascot: 'happy' });
  },
};

window.KyncQuests2 = KyncQuests2;
