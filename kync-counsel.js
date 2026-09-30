/* ═══════════════════════════════════════════════════════════
   kync-counsel.js — 연결 탭 AI 상담
   - 하루 1번: 고민 1개 보내고 답 1번 받기
   - 기록은 users/{uid}/counsel/{날짜} 에 저장, 본인만 볼 수 있음
   - 대화유형 결과·최근 감정 체크인을 함께 보내 AI가 참고
═══════════════════════════════════════════════════════════ */

// Cloudflare Worker 주소 (배포 후 여기에 붙여넣기). 비어 있으면 '준비 중'으로 표시
const KYNC_COUNSEL_URL = '';

const KyncCounsel = {
  MAX: 500,
  _items: [],       // 이전 상담 (최신순)
  _role: null,
  _showHistory: false,
  _openDay: null,
  _sending: false,

  _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[c]));
  },
  _nl(s) { return this._esc(s).replace(/\n/g, '<br>'); },
  _el() { return document.getElementById(this._role === 'parent' ? 'p-counsel' : 'c-counsel'); },
  _col(uid) { return db.collection('users').doc(uid).collection('counsel'); },
  _fmt(day) { const [y, m, d] = String(day).split('-'); return `${+m}월 ${+d}일`; },

  async init(role) {
    this._role = role;
    this._showHistory = false;
    this._openDay = null;
    this.render();
    const uid = KyncAuth?.current?.uid;
    if (!uid || typeof db === 'undefined') return;
    try {
      const snap = await this._col(uid)
        .orderBy(firebase.firestore.FieldPath.documentId(), 'desc').limit(30).get();
      this._items = snap.docs.map(d => ({ day: d.id, ...d.data() }));
    } catch (e) {
      console.warn('counsel load:', e);
      this._items = [];
    }
    this.render();
  },

  render() {
    const el = this._el();
    if (!el) return;
    const today = todayKey();
    const todayItem = this._items.find(i => i.day === today);
    const past = this._items.filter(i => i.day !== today);
    const ready = !!KYNC_COUNSEL_URL;

    let body;
    if (todayItem) {
      body = `
        <div class="cs-bubble cs-me">${this._nl(todayItem.message)}</div>
        <div class="cs-bubble cs-ai">${this._nl(todayItem.reply)}</div>
        <div class="cs-note">오늘 상담은 여기까지예요. 내일 또 이야기해요.</div>`;
    } else if (this._sending) {
      body = `
        <div class="cs-bubble cs-me">${this._nl(this._pending)}</div>
        <div class="cs-bubble cs-ai cs-typing">답변을 쓰고 있어요…</div>`;
    } else {
      body = `
        <textarea id="cs-input" class="cs-input" maxlength="${this.MAX}" ${ready ? '' : 'disabled'}
          placeholder="${ready ? (this._role === 'parent' ? '자녀와 관련된 고민을 편하게 적어주세요' : '요즘 고민을 편하게 적어봐') : '상담 기능을 준비하고 있어요'}"
          oninput="document.getElementById('cs-count').textContent=this.value.length"></textarea>
        <div class="cs-row">
          <span class="cs-count"><span id="cs-count">0</span>/${this.MAX}</span>
          <button class="cs-send" ${ready ? '' : 'disabled'} onclick="KyncCounsel.send()">보내기</button>
        </div>`;
    }

    const history = past.length ? `
      <button class="cs-history-toggle" onclick="KyncCounsel.toggleHistory()">
        이전 상담 ${past.length}개 <span>${this._showHistory ? '접기 ▲' : '보기 ▼'}</span>
      </button>
      ${this._showHistory ? past.map(i => `
        <div class="cs-past" onclick="KyncCounsel.togglePast('${i.day}')">
          <div class="cs-past-head">
            <span class="cs-past-date">${this._fmt(i.day)}</span>
            <span class="cs-past-msg">${this._esc(i.message)}</span>
          </div>
          ${this._openDay === i.day ? `
            <div class="cs-bubble cs-me">${this._nl(i.message)}</div>
            <div class="cs-bubble cs-ai">${this._nl(i.reply)}</div>` : ''}
        </div>`).join('') : ''}` : '';

    el.innerHTML = `
      <div class="cs-head">
        <div class="cs-title">AI 상담</div>
        <div class="cs-sub">하루 한 번 · 나만 볼 수 있어요</div>
      </div>
      ${body}
      ${history}
      <div class="cs-foot">AI 답변은 참고용이에요. 많이 힘들 땐 ${this._role === 'child' ? '청소년상담 1388, ' : ''}자살예방상담 109에 바로 연락할 수 있어요.</div>`;
  },

  toggleHistory() { this._showHistory = !this._showHistory; this.render(); },
  togglePast(day) { this._openDay = this._openDay === day ? null : day; this.render(); },

  /* ── AI가 참고할 정보 ── */
  async _context() {
    const ctx = {};
    try {
      const q = JSON.parse(localStorage.getItem('kync_quiz_result') || 'null');
      if (q?.type) { ctx.quizType = q.type; ctx.quizSub = q.sub || ''; }
    } catch (e) {}

    const fc = localStorage.getItem('kync_family_code');
    if (fc && typeof db !== 'undefined') {
      try {
        const snap = await db.collection('families').doc(fc).collection('records')
          .orderBy(firebase.firestore.FieldPath.documentId(), 'desc').limit(7).get();
        const label = id => (typeof App !== 'undefined' && App.EMOTIONS_CHILD?.find(e => e.id === id)?.label) || id;
        ctx.checkins = snap.docs
          .filter(d => d.data().checkin)
          .map(d => { const c = d.data().checkin; return { date: d.id, emotion: label(c.emotion), stress: c.stress, energy: c.energy, memo: c.memo || '' }; });
      } catch (e) { console.warn('counsel context:', e); }
    }
    return ctx;
  },

  async send() {
    if (this._sending || !KYNC_COUNSEL_URL) return;
    const input = document.getElementById('cs-input');
    const message = input?.value?.trim();
    if (!message) { alert('고민을 적어주세요.'); return; }
    const user = KyncAuth?.current;
    if (!user) { alert('로그인 정보가 없어요. 다시 로그인해주세요.'); return; }

    this._sending = true;
    this._pending = message;
    this.render();

    try {
      const [token, context] = await Promise.all([user.getIdToken(), this._context()]);
      const res = await fetch(KYNC_COUNSEL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ message, role: this._role, context }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '상담 연결에 실패했어요.');

      const item = { day: data.day || todayKey(), role: this._role, message, reply: data.reply };
      await this._col(user.uid).doc(item.day).set({
        ...item, createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      this._items = [item, ...this._items.filter(i => i.day !== item.day)];
      this._sending = false;
      this.render();
    } catch (e) {
      this._sending = false;
      this.render();
      const box = document.getElementById('cs-input');
      if (box) { box.value = message; document.getElementById('cs-count').textContent = message.length; }
      alert(e.message);
    }
  },
};

window.KyncCounsel = KyncCounsel;
