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
    { id:'t1', title:'하루 한 번 안부 묻기',   desc:'공부 얘기 없이 "오늘 어땠어?" 한 마디',   days:3  },
    { id:'t2', title:'밥 먹을 때 폰 내려놓기', desc:'식사 중 둘 다 폰 없이',                   days:7  },
    { id:'t3', title:'자기 전 잘 자 인사',      desc:'자기 전 짧은 인사 주고받기',              days:5  },
    { id:'t4', title:'칭찬 하나씩 매일',        desc:'오늘 상대에게서 좋았던 점 하나 말하기',   days:7  },
    { id:'t5', title:'성적 얘기 없는 3일',      desc:'성적·공부량·학원 얘기 없이 대화',        days:3  },
    { id:'t6', title:'10분 경청 타임',          desc:'10분 동안 끊지 않고 들어주기',            days:7  },
    { id:'t7', title:'좋았던 기억 하나씩',      desc:'함께했던 좋은 기억 하나씩 꺼내기',        days:7  },
    { id:'t8', title:'마음 편지 쓰기',          desc:'평소 못 했던 말을 짧은 편지로',           days:3  },
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
      el.innerHTML = `<div class="qx-empty">가족과 연결하면 퀘스트를 시작할 수 있어요.</div>`;
      return;
    }

    const byNew = (a, b) => String(b.id).localeCompare(String(a.id));
    const qs = this._quests.filter(q => q.status !== 'declined').sort(byNew);
    const active   = qs.filter(q => q.status === 'active');
    const received = qs.filter(q => q.status === 'pending' && !q.agreed?.[role]);
    const sent     = qs.filter(q => q.status === 'pending' && q.agreed?.[role]);
    const done     = qs.filter(q => q.status === 'done');

    let html = '';

    html += `<div class="qx-section">진행 중</div>`;
    html += active.length
      ? active.map(q => this._activeCard(q)).join('')
      : `<div class="qx-empty">진행 중인 퀘스트가 없어요.</div>`;

    if (received.length) {
      html += `<div class="qx-section">받은 제안 <span class="qx-count">${received.length}</span></div>`;
      html += received.map(q => this._receivedCard(q)).join('');
    }

    if (sent.length) {
      html += `<div class="qx-section">보낸 제안</div>`;
      html += sent.map(q => this._sentCard(q)).join('');
    }

    html += `<button class="qx-add-btn" onclick="KyncQuests2.openAddSheet()">+ 새 퀘스트 제안하기</button>`;

    if (done.length) {
      html += `<button class="qx-done-toggle" onclick="KyncQuests2.toggleDone()">
        완료한 퀘스트 ${done.length}개 <span>${this._showDone ? '접기 ▲' : '보기 ▼'}</span></button>`;
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
    if (mine && theirs) status = '오늘 하루 채웠어요!';
    else if (mine)      status = `${this._otherLabel(role)} 체크를 기다리는 중`;
    else if (theirs)    status = `${role === 'parent' ? '자녀는' : '부모님은'} 오늘 했어요`;
    else                status = '둘 다 체크하면 하루가 채워져요';

    return `
      <div class="qx-card qx-active">
        <div class="qx-title">${this._esc(q.title)}</div>
        ${q.desc ? `<div class="qx-desc">${this._esc(q.desc)}</div>` : ''}
        <div class="qx-progress-row">
          <span><b>${doneDays}</b> / ${q.days}일</span>
          <span>${pct}%</span>
        </div>
        <div class="qx-bar"><div style="width:${pct}%"></div></div>
        <div class="qx-today">
          <div class="qx-who ${role === 'parent' ? (mine ? 'on' : '') : (theirs ? 'on' : '')}">부모님 ${ (role === 'parent' ? mine : theirs) ? '✓' : '' }</div>
          <div class="qx-who ${role === 'child' ? (mine ? 'on' : '') : (theirs ? 'on' : '')}">자녀 ${ (role === 'child' ? mine : theirs) ? '✓' : '' }</div>
        </div>
        <button class="qx-check ${mine ? 'checked' : ''}" ${mine ? 'disabled' : ''}
          onclick="KyncQuests2.checkToday('${q.id}')">${mine ? '오늘 했어요 ✓' : '오늘 했어요'}</button>
        <div class="qx-status">${status}</div>
      </div>`;
  },

  _receivedCard(q) {
    return `
      <div class="qx-card">
        <div class="qx-from">${q.createdBy === 'parent' ? '부모님' : '자녀'}의 제안 · ${q.days}일</div>
        <div class="qx-title">${this._esc(q.title)}</div>
        ${q.desc ? `<div class="qx-desc">${this._esc(q.desc)}</div>` : ''}
        <div class="qx-actions">
          <button class="qx-btn-sub" onclick="KyncQuests2.decline('${q.id}')">넘기기</button>
          <button class="qx-btn-main" onclick="KyncQuests2.accept('${q.id}')">같이 할래요</button>
        </div>
      </div>`;
  },

  _sentCard(q) {
    return `
      <div class="qx-card qx-muted">
        <div class="qx-title">${this._esc(q.title)}</div>
        <div class="qx-desc">${q.days}일 · ${this._otherLabel(this._role)}의 답을 기다리는 중</div>
        <button class="qx-link" onclick="KyncQuests2.cancel('${q.id}')">제안 취소</button>
      </div>`;
  },

  _doneCard(q) {
    return `
      <div class="qx-card qx-done">
        <div class="qx-title">✓ ${this._esc(q.title)}</div>
        <div class="qx-desc">${q.days}일 완료${q.doneAt ? ' · ' + this._esc(q.doneAt) : ''}</div>
      </div>`;
  },

  /* ── 동작 ── */
  async _write(id, data) {
    try { await this._ref(id).set(data, { merge: true }); }
    catch(e) { alert('저장 실패: ' + e.message); throw e; }
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
    if (!confirm('이 제안을 넘길까요?')) return;
    await this._write(id, { status: 'declined', declinedBy: this._role });
  },

  async cancel(id) {
    if (!confirm('보낸 제안을 취소할까요?')) return;
    await this._write(id, { status: 'declined', declinedBy: this._role });
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
    } catch(e) { alert('저장 실패: ' + e.message); }
  },

  async _addQuest(q) {
    const fc = this._fc();
    if (!fc) { alert('먼저 가족과 연결해주세요.'); return; }
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
    this._toast(`${this._otherLabel(role)}에게 제안했어요`);
  },

  addFromTemplate(templateId) {
    const t = this.TEMPLATES.find(t => t.id === templateId);
    if (t) this._addQuest(t);
  },

  addCustom() {
    const title = document.getElementById('qx-custom-title')?.value?.trim();
    const desc  = document.getElementById('qx-custom-desc')?.value?.trim();
    const days  = Math.min(30, Math.max(1, parseInt(document.getElementById('qx-custom-days')?.value) || 7));
    if (!title) { alert('퀘스트 제목을 입력해주세요.'); return; }
    this._addQuest({ title, desc, days });
  },

  /* ── 추가 시트 ── */
  openAddSheet() {
    this.closeAddSheet();
    const wrap = document.createElement('div');
    wrap.id = 'qx-sheet';
    wrap.className = 'qx-sheet-bg';
    wrap.innerHTML = `
      <div class="qx-sheet">
        <div class="qx-handle"></div>
        <div class="qx-sheet-title">새 퀘스트 제안하기</div>
        <div class="qx-sheet-sub">${this._otherLabel(this._role)}이(가) 동의하면 시작돼요</div>

        <div class="qx-label">추천 퀘스트</div>
        <div class="qx-templates">
          ${this.TEMPLATES.map(t => `
            <button class="qx-template" onclick="KyncQuests2.addFromTemplate('${t.id}')">
              <div class="qx-t-title">${this._esc(t.title)}</div>
              <div class="qx-t-meta">${this._esc(t.desc)} · ${t.days}일</div>
            </button>`).join('')}
        </div>

        <div class="qx-label">직접 만들기</div>
        <input id="qx-custom-title" class="qx-input" maxlength="20" placeholder="퀘스트 이름">
        <input id="qx-custom-desc" class="qx-input" maxlength="40" placeholder="어떻게 할지 (선택)">
        <div class="qx-row">
          <div class="qx-days"><input id="qx-custom-days" type="number" min="1" max="30" value="7"><span>일</span></div>
          <button class="qx-btn-main" onclick="KyncQuests2.addCustom()">제안하기</button>
        </div>
      </div>`;
    wrap.addEventListener('click', e => { if (e.target === wrap) this.closeAddSheet(); });
    document.body.appendChild(wrap);
  },

  closeAddSheet() { document.getElementById('qx-sheet')?.remove(); },

  /* ── 알림 ── */
  _toast(msg) {
    const t = document.createElement('div');
    t.className = 'qx-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  },

  _popup(icon, title, sub) {
    const el = document.createElement('div');
    el.className = 'qx-sheet-bg qx-center';
    el.innerHTML = `
      <div class="qx-pop">
        <div class="qx-pop-icon">${icon}</div>
        <div class="qx-pop-title">${title}</div>
        <div class="qx-pop-sub">"${this._esc(sub)}"</div>
        <button class="qx-btn-main" onclick="this.closest('.qx-sheet-bg').remove()">확인</button>
      </div>`;
    el.addEventListener('click', e => { if (e.target === el) el.remove(); });
    document.body.appendChild(el);
  },
  _popStarted(title) { this._popup('✓', '퀘스트 시작!', title); },
  _popDone(title)    { this._popup('★', '퀘스트 완료!', title); },
};

window.KyncQuests2 = KyncQuests2;
