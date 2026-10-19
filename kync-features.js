/* ═══════════════════════════════════════════════════════════
   kync-features.js — 한마디, 연속 기록
═══════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════
   1. 칭찬 카드
════════════════════════════════════════ */
const KyncPraise = {

  // 부모 → 자녀
  TEMPLATES: [
    '오늘 고생 많았어',
    '아까 그거 진짜 멋있었다',
    '밥은 꼭 챙겨 먹어',
    '네 덕분에 오늘 웃었어',
    '무리하지 말고 쉬엄쉬엄 해',
    '무슨 일 있으면 언제든 말해',
    '믿고 있어',
    '그냥, 사랑한다고',
  ],

  // 자녀 → 부모님
  TEMPLATES_CHILD: [
    '오늘도 수고하셨어요',
    '밥 맛있었어요',
    '아까 고마웠어요',
    '너무 무리하지 마세요',
    '저 생각보다 잘 지내요',
    '요즘 많이 챙겨줘서 고마워요',
    '말은 잘 안 해도 사랑해요',
    '오늘 기분 좋아 보여서 좋았어요',
  ],

  _templates: null,
  _sheet: null,
  selectedText: null,

  openSendModal(fromRole) {
    this._templates = fromRole === 'child' ? this.TEMPLATES_CHILD : this.TEMPLATES;
    this.selectedText = null;
    const to = fromRole === 'parent' ? '자녀' : '부모님';
    this._sheet = KyncUI.sheet(`
      <h2>${to}에게 한마디</h2>
      <p class="sheet-sub">${fromRole === 'child' ? '골라도 되고 직접 써도 돼.' : '골라도 되고 직접 써도 돼요.'}</p>
      <div class="praise-grid">
        ${this._templates.map((t, i) => `<button class="praise-opt" data-i="${i}" onclick="KyncPraise.selectTemplate(${i})">${KyncUI.esc(t)}</button>`).join('')}
      </div>
      <div class="field" style="margin-top:16px">
        <label class="label" for="praise-custom-input">${fromRole === 'child' ? '직접 쓸래' : '직접 쓰기'}</label>
        <input id="praise-custom-input" class="input" maxlength="60" placeholder="60자까지" oninput="KyncPraise.onCustomInput(this)">
      </div>
      <button id="praise-send-btn" class="btn btn-primary btn-block" style="margin-top:16px" onclick="KyncPraise.sendCard('${fromRole}')" disabled>
        ${ic('send', 18)}보내기</button>`, { id: 'praise-sheet' });
  },

  selectTemplate(idx) {
    this.selectedText = this._templates[idx];
    const input = document.getElementById('praise-custom-input');
    if (input) input.value = '';
    document.querySelectorAll('#praise-sheet .praise-opt').forEach(el => el.classList.toggle('on', +el.dataset.i === idx));
    document.getElementById('praise-send-btn').disabled = false;
  },

  onCustomInput(el) {
    this.selectedText = el.value.trim() || null;
    document.querySelectorAll('#praise-sheet .praise-opt').forEach(e => e.classList.remove('on'));
    document.getElementById('praise-send-btn').disabled = !this.selectedText;
  },

  async sendCard(fromRole) {
    const text = this.selectedText;
    if (!text) return;
    const familyCode = localStorage.getItem('kync_family_code');
    if (!familyCode) { toast(tone('먼저 가족과 연결해주세요.', '먼저 가족이랑 연결해줘'), 'error'); return; }

    await KyncUI.busy(document.getElementById('praise-send-btn'), '보내는 중', async () => {
      try {
        await db.collection('families').doc(familyCode).collection('praise').add({
          from:   fromRole,
          to:     fromRole === 'parent' ? 'child' : 'parent',
          text,
          sentAt: firebase.firestore.FieldValue.serverTimestamp(),
          read:   false,
        });
        this._sheet?.close();
        toast(tone('보냈어요', '보냈어'), 'ok');
      } catch(e) {
        console.error(e);
        toast(tone('못 보냈어요. 인터넷 연결을 확인해주세요.', '못 보냈어. 인터넷 연결 확인해줘'), 'error');
      }
    });
  },

  // 받은 카드 알림 (위에서 내려옴)
  showReceivedCard(card) {
    document.getElementById('praise-received-popup')?.remove();
    const pop = document.createElement('div');
    pop.id = 'praise-received-popup';
    pop.className = 'praise-pop';
    pop.setAttribute('role', 'status');
    pop.innerHTML = `${KyncBrand.mascot('happy', 44, { shadow: false })}
      <div><small>${card.from === 'parent' ? '부모님한테서' : '자녀한테서'} 온 한마디</small><b>${KyncUI.esc(card.text)}</b></div>`;
    const close = () => { pop.classList.remove('show'); setTimeout(() => pop.remove(), 300); };
    pop.addEventListener('click', close);
    document.body.appendChild(pop);
    requestAnimationFrame(() => pop.classList.add('show'));
    setTimeout(close, 4500);
  },

  // 안 읽은 카드 실시간 감시
  listenForCards(familyCode, myRole) {
    if (!familyCode || typeof db === 'undefined') return;
    return db.collection('families').doc(familyCode).collection('praise')
      .where('to', '==', myRole)
      .where('read', '==', false)
      .onSnapshot(snap => {
        let got = false;
        snap.docChanges().forEach(change => {
          if (change.type === 'added') {
            this.showReceivedCard(change.doc.data());
            change.doc.ref.update({ read: true }).catch(() => {});
            got = true;
          }
        });
        if (got && typeof KyncInbox !== 'undefined') KyncInbox.refresh();
        if (got) this.renderReceivedCards(`${myRole === 'parent' ? 'p' : 'c'}-praise-list`, myRole).catch(() => {});
      }, err => console.warn('praise listen:', err));
  },

  async renderReceivedCards(containerId, myRole) {
    const familyCode = localStorage.getItem('kync_family_code');
    const container = document.getElementById(containerId);
    if (!familyCode || !container) return;

    const snap = await db.collection('families').doc(familyCode).collection('praise')
      .where('to', '==', myRole).orderBy('sentAt', 'desc').limit(5).get();

    if (snap.empty) {
      container.innerHTML = `<p class="small sub center" style="padding:10px 0">${tone('아직 받은 게 없어요.', '아직 받은 게 없어.')}</p>`;
      return;
    }
    container.innerHTML = snap.docs.map(doc => {
      const c = doc.data();
      const d = c.sentAt?.toDate?.();
      const time = d ? `${d.getMonth() + 1}월 ${d.getDate()}일` : '';
      return `
        <div class="praise-item">
          <div class="praise-ic">${ic('heart', 20)}</div>
          <div class="grow"><b>${KyncUI.esc(c.text)}</b><small>${c.from === 'parent' ? '부모님' : '자녀'} · ${time}</small></div>
        </div>`;
    }).join('');
  },
};

/* ════════════════════════════════════════
   2. 연속 기록 (답변이나 체크인을 한 날)
════════════════════════════════════════ */
const KyncStreak = {

  BADGES: [
    { days: 3,  name: '사흘 연속' },
    { days: 7,  name: '일주일 연속' },
    { days: 14, name: '2주 연속' },
    { days: 30, name: '한 달 연속' },
  ],

  _read(uid) {
    try { return JSON.parse(localStorage.getItem(`kync_streak_${uid}`) || '{"count":0,"lastDate":"","badges":[]}'); }
    catch(e) { return { count: 0, lastDate: '', badges: [] }; }
  },

  async onCheckin(uid) {
    const today = new Date().toLocaleDateString('ko-KR');
    const streak = this._read(uid);
    const y = new Date(); y.setDate(y.getDate() - 1);
    if (streak.lastDate === today) return streak;
    streak.count = streak.lastDate === y.toLocaleDateString('ko-KR') ? streak.count + 1 : 1;
    streak.lastDate = today;
    try { await KyncDB.updateUser(uid, { streak: streak.count, streakLastDate: today }); } catch(e) {}

    const newBadge = this.BADGES.find(b => b.days === streak.count && !streak.badges.includes(b.days));
    if (newBadge) {
      streak.badges.push(newBadge.days);
      KyncUI.confirm({ title: `${newBadge.days}일 연속`, message: tone(`${newBadge.days}일 동안 하루도 안 빠졌어요.`, `${newBadge.days}일 동안 하루도 안 빠졌어.`), ok: tone('확인', '오케이'), cancel: null, mascot: 'happy' });
    }
    localStorage.setItem(`kync_streak_${uid}`, JSON.stringify(streak));
    this.renderStreakUI(uid);
    return streak;
  },

  renderStreakUI(uid) {
    const streak = this._read(uid);
    const count = streak.count || 0;
    const next = this.BADGES.find(b => b.days > count);
    document.querySelectorAll('.streak-card').forEach(el => {
      el.innerHTML = `
        <div class="streak-top">
          <b>${count ? `${count}일째 연속` : tone('아직 연속 기록 없음', '아직 연속 기록 없음')}</b>
          <small>${next ? `${next.days}일까지 ${next.days - count}일 남음` : '30일 넘김'}</small>
        </div>
        <div class="streak-marks">
          ${this.BADGES.map(b => `<div class="${streak.badges?.includes(b.days) || count >= b.days ? 'on' : ''}">${b.days}일</div>`).join('')}
        </div>`;
    });
  },

  init(uid) { if (uid) this.renderStreakUI(uid); },
};

window.KyncPraise   = KyncPraise;
window.KyncStreak   = KyncStreak;
