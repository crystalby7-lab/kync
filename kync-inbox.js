/* ═══════════════════════════════════════════════════════════
   kync-inbox.js — 알림함 (상단 종 아이콘)
   가족이 남긴 것들을 한곳에 모아 보여줘요.
   - 칭찬 카드, 상대의 오늘 답변, 자녀 감정 기록(부모), 기록 탭 글
   - 퀘스트 제안·시작·완료, 보호자 동의 요청(부모)
   읽은 시각은 이 기기에 저장돼요 (kync_inbox_seen_{uid}).
═══════════════════════════════════════════════════════════ */

const KyncInbox = {
  _items: [],
  _timer: null,

  _ctx() {
    const role = localStorage.getItem('kync_role');
    return {
      role,
      other: role === 'parent' ? 'child' : 'parent',
      otherLabel: role === 'parent' ? (this._childName() || '자녀') : '부모님',
      fc: localStorage.getItem('kync_family_code'),
      uid: KyncAuth?.current?.uid || localStorage.getItem('kync_user_uid'),
    };
  },
  _childName() {
    return Object.values(KyncAccount.family?.members || {}).find(m => m.role === 'child')?.name || '';
  },
  _seenKey(uid) { return `kync_inbox_seen_${uid}`; },
  _seen(uid) { return +(localStorage.getItem(this._seenKey(uid)) || 0); },
  _ms(v) {
    if (!v) return 0;
    if (typeof v === 'number') return v;
    if (v.toDate) return v.toDate().getTime();
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { const [y, m, d] = v.split('-'); return new Date(+y, m - 1, +d, 9).getTime(); }
    const t = new Date(v).getTime();
    return isNaN(t) ? 0 : t;
  },
  // 이(가) 붙이기
  _ga(name) {
    const c = name.charCodeAt(name.length - 1) - 0xAC00;
    return name + (c >= 0 && c <= 11171 && c % 28 ? '이' : '가');
  },

  /* ── 모으기 ── */
  async _collect() {
    const { role, other, otherLabel, fc, uid } = this._ctx();
    if (!fc || !uid || (role !== 'parent' && role !== 'child')) return [];
    const who = this._ga(otherLabel);
    const items = [];

    // 보호자 동의 요청 (부모)
    if (role === 'parent') {
      KyncAccount.pendingMinors().forEach(c => items.push({
        t: Date.now(), pin: true, ic: 'shield', tone: 'berry',
        title: `${c.name || '자녀'}의 보호자 동의가 필요해요`, sub: '동의해야 자녀가 앱을 쓸 수 있어요',
        go: () => KyncAccount.openGuardian(c.uid),
      }));
    }

    const jobs = [];
    // 칭찬 카드
    jobs.push(db.collection('families').doc(fc).collection('praise')
      .where('to', '==', role).orderBy('sentAt', 'desc').limit(20).get()
      .then(snap => snap.forEach(d => {
        const c = d.data();
        items.push({ t: this._ms(c.sentAt), ic: 'heart', tone: 'honey', title: tone(`${who} 한마디를 보냈어요`, `${who} 한마디 보냄`), sub: `“${c.text}”`, go: 'today' });
      })).catch(e => console.warn('inbox praise:', e)));

    // 최근 7일 오늘의 질문 답변·감정 기록
    jobs.push(db.collection('families').doc(fc).collection('records')
      .orderBy(firebase.firestore.FieldPath.documentId(), 'desc').limit(7).get()
      .then(snap => snap.forEach(d => {
        const r = d.data();
        if (r[other]?.content) {
          const mine = !!r[role]?.content;
          items.push({ t: this._ms(r[other].at) || this._ms(d.id), ic: mine ? 'unlock' : 'lock', tone: 'sky',
            title: `${who} 오늘의 질문에 답했어요`, sub: mine ? '답이 열렸어요' : '나도 답하면 볼 수 있어요', go: 'today' });
        }
        if (r.react?.[other] && r[role]?.content) {
          items.push({ t: this._ms(r[other].at) || this._ms(d.id), ic: 'heart', tone: 'honey',
            title: tone(`${who} 내 답에 반응했어요`, `${who} 내 답에 반응함`), sub: r.react[other], go: 'today' });
        }
        if (role === 'parent' && r.checkin) {
          const emo = App.EMOTIONS_CHILD.find(e => e.id === r.checkin.emotion)?.label || '';
          items.push({ t: this._ms(r.checkin.at) || this._ms(d.id), ic: 'smile', tone: 'moss',
            title: `${who} 오늘 기분을 남겼어요`, sub: [emo, r.checkin.memo].filter(Boolean).join(', '), go: 'today' });
        }
      })).catch(e => console.warn('inbox records:', e)));
    await Promise.all(jobs);

    // 퀘스트 (퀘스트 탭이 이미 실시간으로 받아둔 것)
    (typeof KyncQuests2 !== 'undefined' ? KyncQuests2._quests : []).forEach(q => {
      if (q.status === 'pending' && !q.agreed?.[role])
        items.push({ t: this._ms(q.createdAt) || this._ms(+String(q.id).replace('q_', '')), ic: 'flag', tone: 'honey', title: `${who} 퀘스트를 제안했어요`, sub: q.title, go: 'quest' });
      else if (q.status === 'active' && q.createdBy === role)
        items.push({ t: this._ms(q.startDate), ic: 'flag', tone: 'moss', title: `${who} 퀘스트를 같이 하기로 했어요`, sub: q.title, go: 'quest' });
      else if (q.status === 'done')
        items.push({ t: this._ms(q.doneAt), ic: 'checkCircle', tone: 'moss', title: '퀘스트를 함께 끝냈어요', sub: q.title, go: 'quest' });
    });

    // 기록 탭 (상대가 남긴 글)
    (typeof KyncDiary !== 'undefined' ? (KyncDiary._entries || []) : []).filter(e => e.role === other).slice(0, 20).forEach(e => {
      items.push({ t: this._ms(e.savedAt), ic: 'book', tone: 'sky', title: `${who} 기록을 남겼어요`, sub: e.memo || (e.img ? '사진' : ''), go: 'record' });
    });

    const weekAgo = Date.now() - 14 * 86400000;
    return items.filter(i => i.pin || i.t > weekAgo).sort((a, b) => (b.pin - a.pin) || (b.t - a.t)).slice(0, 40);
  },

  /* ── 안 읽은 표시 ── */
  refresh() {
    clearTimeout(this._timer);
    this._timer = setTimeout(async () => {
      try {
        this._items = await this._collect();
        this._paintDot();
        if (document.getElementById('layer-inbox')?.classList.contains('open')) this.render(false);
      } catch (e) { console.warn('inbox:', e); }
    }, 700);
  },
  _paintDot() {
    const seen = this._seen(this._ctx().uid);
    const unread = this._items.some(i => i.pin || i.t > seen);
    document.querySelectorAll('.bell .badge-dot').forEach(d => d.classList.toggle('hidden', !unread));
    document.querySelectorAll('.bell').forEach(b => b.setAttribute('aria-label', unread ? '알림, 새 알림 있음' : '알림'));
  },

  /* ── 알림함 열기 ── */
  async open() {
    KyncUI.openLayer('layer-inbox');
    this.render(true);
    try { this._items = await this._collect(); } catch (e) {}
    this.render(true);
  },

  _dayLabel(t) {
    const d = new Date(t), today = new Date();
    const diff = localDayNum(today) - localDayNum(d);
    if (diff === 0) return '오늘';
    if (diff === 1) return '어제';
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  },
  _time(t) {
    const d = new Date(t);
    const mins = Math.round((Date.now() - t) / 60000);
    if (mins < 1) return '방금';
    if (mins < 60) return `${mins}분 전`;
    if (localDayNum() === localDayNum(d)) return `${Math.floor(mins / 60)}시간 전`;
    return `${d.getHours() < 12 ? '오전' : '오후'} ${(d.getHours() % 12) || 12}시`;
  },

  render(markSeen) {
    const body = document.getElementById('inbox-body');
    if (!body) return;
    const { uid } = this._ctx();
    const seen = this._seen(uid);
    if (!this._items.length) {
      body.innerHTML = `<div class="empty" style="padding-top:80px">${KyncBrand.mascot('sleepy', 96)}<b>아직 알림이 없어요</b><p>${tone('가족이 한마디를 보내거나 답을 쓰면 여기 모여요.', '가족이 한마디 보내거나 답 쓰면 여기 모여.')}</p></div>`;
    } else {
      let html = '', lastDay = '';
      this._items.forEach((i, idx) => {
        const day = i.pin ? '확인이 필요해요' : this._dayLabel(i.t);
        if (day !== lastDay) { html += `<div class="inbox-day">${day}</div>`; lastDay = day; }
        html += `
          <button class="inbox-item ${i.pin || i.t > seen ? 'new' : ''}" onclick="KyncInbox.go(${idx})">
            <span class="inbox-ic ${i.tone}">${ic(i.ic, 20)}</span>
            <span class="grow"><b>${KyncUI.esc(i.title)}</b>${i.sub ? `<small>${KyncUI.esc(i.sub)}</small>` : ''}</span>
            ${i.pin ? '' : `<time>${this._time(i.t)}</time>`}
          </button>`;
      });
      body.innerHTML = html;
    }
    if (markSeen && uid) {
      localStorage.setItem(this._seenKey(uid), String(Date.now()));
      this._paintDot();
    }
  },

  go(idx) {
    const i = this._items[idx];
    if (!i) return;
    const pre = localStorage.getItem('kync_role') === 'parent' ? 'p' : 'c';
    if (typeof i.go === 'function') { i.go(); return; }
    KyncUI.closeLayer('layer-inbox');
    selectTab(`${pre}-${{ today: 'todayTab', quest: 'questTab', record: 'recordTab' }[i.go]}`);
  },
};

window.KyncInbox = KyncInbox;
