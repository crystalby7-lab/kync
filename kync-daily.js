/* ═══════════════════════════════════════════════════════════
   kync-daily.js — 오늘 탭 위쪽
   1) 스토리 줄: 가족 동그라미. 오늘 뭔가 남긴 사람은 테두리에 색. 누르면 그 사람 오늘 기록을 한 장씩
   2) 오늘 할 일 3개 (듀오링고 퀘스트처럼)
   3) 3개 다 하면 축하 화면 (하루 한 번)
═══════════════════════════════════════════════════════════ */

const KyncDaily = {
  _record: {},
  _praiseToday: false,
  _diaryToday: [],
  _timer: null,

  _role() { return localStorage.getItem('kync_role') === 'child' ? 'child' : 'parent'; },
  _uid() { return KyncAuth?.current?.uid || localStorage.getItem('kync_user_uid'); },
  _fc() { return localStorage.getItem('kync_family_code'); },
  _esc(s) { return KyncUI.esc(s); },

  // 오늘 할 일 (역할별)
  tasks() {
    const role = this._role(), r = this._record || {}, today = todayKey();
    const tasteToday = Object.keys(KyncBalance?._getTodayState?.(this._fc() || 'local')?.data?.answers || {}).length;
    if (role === 'child') {
      const journalDay = typeof KyncJournal !== 'undefined' && KyncJournal.isPromptDay();
      const wroteJournal = typeof KyncJournal !== 'undefined' && (KyncJournal._entries || []).some(e => e.day === today);
      return [
        { id: 'mood',   label: '기분 남기기',     done: !!r.checkin, go: () => document.getElementById('c-checkin')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) },
        { id: 'answer', label: '오늘의 질문 답하기', done: !!r.child?.content, go: () => document.getElementById('c-myAnswer')?.focus() },
        journalDay
          ? { id: 'journal', label: '오늘의 일기',   done: wroteJournal, go: () => KyncJournal.open() }
          : { id: 'taste',   label: '취향 맞추기 1개', done: tasteToday > 0, go: () => { location.href = 'activity-balance.html'; } },
      ];
    }
    return [
      { id: 'answer', label: '오늘의 질문 답하기', done: !!r.parent?.content, go: () => document.getElementById('p-myAnswer')?.focus() },
      { id: 'praise', label: '한마디 보내기',      done: this._praiseToday, go: () => KyncPraise.openSendModal('parent') },
      { id: 'record', label: '기록 하나 남기기',   done: this._diaryToday.some(e => e.uid === this._uid()), go: () => selectTab('p-recordTab') },
    ];
  },

  async load() {
    const fc = this._fc();
    if (!fc || typeof db === 'undefined') return;
    const fam = db.collection('families').doc(fc);
    const role = this._role();
    const [rec, praise] = await Promise.all([
      fam.collection('records').doc(todayKey()).get().catch(() => null),
      fam.collection('praise').where('from', '==', role).limit(30).get().catch(() => null),
    ]);
    this._record = rec?.exists ? rec.data() : {};
    const start = new Date(); start.setHours(0, 0, 0, 0);
    this._praiseToday = !!praise?.docs.some(d => { const t = d.data().sentAt?.toDate?.(); return t && t >= start; });
    this._diaryToday = (typeof KyncDiary !== 'undefined' ? KyncDiary._getEntries() : []).filter(e => e.dateKey === todayKey() || KyncDiary._entryDate?.(e) === todayKey());
  },

  // 다른 곳에서 뭔가 하면 불러줌 (짧게 모아서 한 번)
  refresh() {
    clearTimeout(this._timer);
    this._timer = setTimeout(async () => {
      try { await this.load(); } catch (e) {}
      this.render();
    }, 300);
  },

  /* ════════ 그리기 ════════ */
  render() {
    const role = this._role(), pre = role === 'parent' ? 'p' : 'c';
    const stories = document.getElementById(`${pre}-stories`);
    const card = document.getElementById(`${pre}-daily`);
    if (stories) stories.innerHTML = this._storiesHtml();
    if (!card) return;
    const tasks = this.tasks();
    const n = tasks.filter(t => t.done).length;
    const pct = Math.round(n / tasks.length * 100);
    card.innerHTML = `
      <div class="dl-head">
        <div class="dl-ring" style="--p:${pct}"><span>${n}/${tasks.length}</span></div>
        <div class="grow"><b>${n === tasks.length ? tone('오늘 할 일 끝', '오늘 할 거 끝') : '오늘 할 일'}</b>
          <small>${n === tasks.length ? tone('내일 또 만나요', '내일 또 보자') : tone(`${tasks.length - n}개 남았어요`, `${tasks.length - n}개 남았어`)}</small></div>
      </div>
      <div class="dl-list">${tasks.map((t, i) => `
        <button class="dl-item ${t.done ? 'done' : ''}" ${t.done ? 'disabled' : ''} onclick="KyncDaily.go(${i})">
          <span class="dl-check">${t.done ? ic('check', 16) : ''}</span>
          <span class="grow">${t.label}</span>
          ${t.done ? '' : ic('chev', 16)}
        </button>`).join('')}</div>`;
    this._maybeCelebrate(n === tasks.length);
  },

  go(i) { this.tasks()[i]?.go?.(); },

  _storiesHtml() {
    const fam = KyncAccount?.family?.members || {};
    const me = this._uid();
    const list = Object.entries(fam).map(([uid, m]) => ({ uid, ...m }))
      .sort((a, b) => (b.uid === me) - (a.uid === me));
    if (!list.length) return '';
    return list.map(m => {
      const active = this._activeFor(m);
      return `<button class="st-item" onclick="KyncDaily.openStory('${m.uid}')">
        <span class="st-ring ${active ? 'on' : ''}">${KyncUI.avatar(m.uid, m.role, 'st-av')}</span>
        <span class="st-name">${m.uid === me ? '나' : this._esc(m.name || (m.role === 'parent' ? '부모님' : '자녀'))}</span>
      </button>`;
    }).join('');
  },

  _activeFor(m) {
    const r = this._record || {};
    if (r[m.role]?.content) return true;
    if (m.role === 'child' && r.checkin) return true;
    return this._diaryToday.some(e => e.uid === m.uid);
  },

  /* ── 스토리 보기 ── */
  openStory(uid) {
    const fam = KyncAccount?.family?.members || {};
    const m = { uid, ...(fam[uid] || {}) };
    const me = this._uid(), mine = uid === me, myRole = this._role();
    const r = this._record || {}, slides = [];
    const label = mine ? '나' : (m.name || (m.role === 'parent' ? '부모님' : '자녀'));
    if (m.role === 'child' && r.checkin) {
      const emo = App.EMOTIONS_CHILD.find(e => e.id === r.checkin.emotion);
      slides.push(`<div class="sv-slide" style="background:${emo?.color || '#7A5A48'}">
        <small>지금 기분</small><b class="sv-big">${this._esc(emo?.label || '')}</b>
        <div class="sv-meta">스트레스 ${r.checkin.stress || '—'} · 에너지 ${r.checkin.energy || '—'}</div>
        ${r.checkin.memo ? `<p>“${this._esc(r.checkin.memo)}”</p>` : ''}</div>`);
    }
    const ans = r[m.role]?.content;
    if (ans) {
      const open = mine || r[myRole]?.content;
      slides.push(`<div class="sv-slide dark"><small>오늘의 질문</small><b>${this._esc(r[m.role].question || '')}</b>
        ${open ? `<p class="sv-ans">${this._esc(ans)}</p>` : `<p class="sv-lock">${ic('lock', 18)}${tone('내 답을 올리면 보여요', '내 답 올리면 보여')}</p>`}</div>`);
    }
    this._diaryToday.filter(e => e.uid === uid).forEach(e => {
      slides.push(`<div class="sv-slide photo" ${e.img ? `style="background-image:url('${e.img}')"` : ''}>
        <small>기록</small>${e.memo ? `<p class="sv-cap">${this._esc(e.memo)}</p>` : ''}</div>`);
    });
    if (!slides.length) slides.push(`<div class="sv-slide empty">${KyncBrand.mascot('sleepy', 120, { role: m.role })}<b>${tone('아직 오늘 남긴 게 없어요', '아직 오늘 남긴 거 없어')}</b></div>`);

    const view = document.createElement('div');
    view.className = 'sv';
    view.innerHTML = `
      <div class="sv-bars">${slides.map(() => '<i><em></em></i>').join('')}</div>
      <div class="sv-top">${KyncUI.avatar(m.uid, m.role, 'sm')}<b>${this._esc(label)}</b><span>오늘</span>
        <button class="sv-x" aria-label="닫기">${ic('x', 22)}</button></div>
      <div class="sv-stage">${slides.join('')}</div>
      <button class="sv-prev" aria-label="이전"></button><button class="sv-next" aria-label="다음"></button>`;
    document.body.appendChild(view);
    let i = 0, t = null;
    const show = k => {
      if (k >= slides.length) return close();
      i = Math.max(0, k);
      view.querySelectorAll('.sv-slide').forEach((s, j) => s.classList.toggle('on', j === i));
      view.querySelectorAll('.sv-bars i').forEach((b, j) => { b.className = j < i ? 'done' : j === i ? 'run' : ''; });
      clearTimeout(t); t = setTimeout(() => show(i + 1), 5000);
    };
    const close = () => { clearTimeout(t); view.classList.add('out'); setTimeout(() => view.remove(), 200); };
    view.querySelector('.sv-x').onclick = close;
    view.querySelector('.sv-prev').onclick = () => show(i - 1);
    view.querySelector('.sv-next').onclick = () => show(i + 1);
    requestAnimationFrame(() => { view.classList.add('in'); show(0); });
    window.KyncManual?.log?.('story_view', { mine, slides: slides.length });
  },

  /* ── 축하 ── */
  _maybeCelebrate(allDone) {
    if (!allDone) return;
    const k = `kync_daily_done_${this._uid()}_${todayKey()}`;
    try { if (localStorage.getItem(k)) return; localStorage.setItem(k, '1'); } catch (e) { return; }
    const streak = (typeof KyncStreak !== 'undefined' ? KyncStreak._read(this._uid()).count : 0) || 1;
    const el = document.createElement('div');
    el.className = 'cel';
    const colors = ['#F2A93B', '#FF6A4D', '#3D8A5A', '#4F7FAF', '#EE7FA0', '#FFC72C'];
    el.innerHTML = `<div class="cel-bits">${Array.from({ length: 36 }, (_, i) =>
        `<i style="left:${Math.random() * 100}%;background:${colors[i % colors.length]};animation-delay:${Math.random() * .5}s;transform:rotate(${Math.random() * 360}deg)"></i>`).join('')}</div>
      <div class="cel-box">
        ${KyncBrand.mascot('happy', 150, { cls: 'cel-char' })}
        <b>${tone('오늘 할 일 끝', '오늘 할 거 끝')}</b>
        <p>${streak}${tone('일째 이어가는 중이에요', '일째 이어가는 중')}</p>
        <button class="btn btn-primary btn-block">${tone('확인', '오케이')}</button>
      </div>`;
    document.body.appendChild(el);
    try { navigator.vibrate?.(40); } catch (e) {}
    requestAnimationFrame(() => el.classList.add('in'));
    el.querySelector('button').onclick = () => { el.classList.remove('in'); setTimeout(() => el.remove(), 250); };
    window.KyncManual?.log?.('daily_complete', { streak });
  },
};

window.KyncDaily = KyncDaily;
