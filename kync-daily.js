/* ═══════════════════════════════════════════════════════════
   kync-daily.js — 오늘 탭 위쪽
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
    const card = document.getElementById(`${pre}-daily`);
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
