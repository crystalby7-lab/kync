/* ═══════════════════════════════════════════════════════════
   kync-features.js — 칭찬 카드, 연속 기록, 활동 질문 목록
═══════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════
   1. 칭찬 카드
════════════════════════════════════════ */
const KyncPraise = {

  TEMPLATES: [
    '오늘도 버텨줘서 고마워',
    '네가 자랑스러워',
    '힘들었을 텐데 잘 해냈어',
    '오늘 하루도 수고했어',
    '네 편이야, 언제나',
    '사랑해',
    '오늘 쉬어도 괜찮아',
    '네가 있어서 행복해',
  ],

  // 자녀 → 부모님 문구
  TEMPLATES_CHILD: [
    '오늘도 고생 많으셨어요',
    '항상 고마워요',
    '저 믿어줘서 고마워요',
    '오늘 해주신 밥 맛있었어요',
    '요즘 힘드시죠, 쉬엄쉬엄 하세요',
    '말은 잘 안 해도 사랑해요',
    '걱정 안 하셔도 돼요, 잘하고 있어요',
    '엄마 아빠가 제 편이라 든든해요',
  ],

  _templates: null,
  _sheet: null,
  selectedText: null,

  openSendModal(fromRole) {
    this._templates = fromRole === 'child' ? this.TEMPLATES_CHILD : this.TEMPLATES;
    this.selectedText = null;
    const to = fromRole === 'parent' ? '자녀' : '부모님';
    this._sheet = KyncUI.sheet(`
      <h2>칭찬 카드 보내기</h2>
      <p class="sheet-sub">${to}에게 마음을 전해보세요.</p>
      <div class="praise-grid">
        ${this._templates.map((t, i) => `<button class="praise-opt" data-i="${i}" onclick="KyncPraise.selectTemplate(${i})">${KyncUI.esc(t)}</button>`).join('')}
      </div>
      <div class="field" style="margin-top:16px">
        <label class="label" for="praise-custom-input">직접 쓰기</label>
        <input id="praise-custom-input" class="input" maxlength="60" placeholder="하고 싶은 말을 직접 써도 돼요" oninput="KyncPraise.onCustomInput(this)">
      </div>
      <button id="praise-send-btn" class="btn btn-primary btn-block" style="margin-top:16px" onclick="KyncPraise.sendCard('${fromRole}')" disabled>
        ${ic('send', 18)}카드 보내기</button>`, { id: 'praise-sheet' });
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
    if (!familyCode) { toast('먼저 가족과 연결해주세요.', 'error'); return; }

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
        toast(`“${text}” 보냈어요`, 'ok');
      } catch(e) {
        console.error(e);
        toast('보내지 못했어요. 인터넷 연결을 확인해주세요.', 'error');
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
      <div><small>${card.from === 'parent' ? '부모님이' : '자녀가'} 칭찬 카드를 보냈어요</small><b>${KyncUI.esc(card.text)}</b></div>`;
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
      container.innerHTML = `<p class="small sub center" style="padding:10px 0">아직 받은 카드가 없어요.<br>먼저 보내보는 건 어때요?</p>`;
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
      KyncUI.confirm({ title: `${newBadge.name} 기록!`, message: `${newBadge.days}일 동안 하루도 빠짐없이 마음을 나눴어요.`, ok: '좋아요', cancel: null, mascot: 'happy' });
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
          <b>${count ? `${count}일 연속 기록 중` : '오늘부터 연속 기록을 시작해요'}</b>
          <small>${next ? `${next.days}일까지 ${next.days - count}일` : '모두 달성했어요'}</small>
        </div>
        <div class="streak-marks">
          ${this.BADGES.map(b => `<div class="${streak.badges?.includes(b.days) || count >= b.days ? 'on' : ''}">${b.days}일</div>`).join('')}
        </div>`;
    });
  },

  init(uid) { if (uid) this.renderStreakUI(uid); },
};

/* ════════════════════════════════════════
   3. 활동 질문 목록 (화면은 activity-*.html)
════════════════════════════════════════ */
const KyncTogether = {
  // 밸런스 게임 (매일 바뀜)
  BALANCE_Q: [
    { q:'오늘 하루 더 힘들었던 쪽은?',          opts:['부모님','자녀'] },
    { q:'오늘 더 말하고 싶었던 쪽은?',          opts:['부모님','자녀'] },
    { q:'지난주 더 많이 걱정했던 쪽은?',        opts:['부모님','자녀'] },
    { q:'요즘 잠을 더 못 자는 쪽은?',           opts:['부모님','자녀'] },
    { q:'먼저 "미안해"라고 말해야 하는 쪽은?',  opts:['부모님','자녀'] },
  ],

  // 서로 맞히기 (3일마다 바뀜)
  QUIZ_Q: [
    { q:'요즘 내가 제일 좋아하는 음식은?',  type:'text' },
    { q:'요즘 내가 제일 힘든 시간대는?',    opts:['아침','낮','저녁','밤'] },
    { q:'지금 내 기분을 색으로 표현하면?',  opts:['빨강','파랑','노랑','초록','회색'] },
    { q:'요즘 내가 제일 하고 싶은 것은?',   type:'text' },
    { q:'요즘 내가 가장 듣고 싶은 말은?',   type:'text' },
    { q:'지금 나한테 필요한 것은?',         opts:['혼자 있는 시간','누군가와 대화','맛있는 음식','충분한 잠'] },
  ],
};

window.KyncPraise   = KyncPraise;
window.KyncStreak   = KyncStreak;
window.KyncTogether = KyncTogether;
