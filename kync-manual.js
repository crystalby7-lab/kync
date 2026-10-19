/* ═══════════════════════════════════════════════════════════
   kync-manual.js — 나 사용 설명서
   - 자녀의 기록(기분·에너지·메모·취향·대화 유형)을 규칙으로 정리해 자녀에게만 보여줌
   - 자녀가 켠 항목만 families/{코드}/manual/{자녀uid} 에 요약본으로 올라가 부모 화면에 보임
   - 부모는 '고마워'만 누를 수 있음 (캐묻는 기능 없음)
   - 효과 측정용 사용 기록: families/{코드}/events
   데이터
     users/{uid}.manual = { needs:[id], needsNote, wish, share:{섹션:true} }
     families/{코드}/manual/{자녀uid} = { mood, energy, taste, talk, needs, wish, updatedAt, thanks:{섹션:시각} }
═══════════════════════════════════════════════════════════ */

const KyncManual = {

  SECTIONS: [
    { id: 'mood',   title: '요즘 내 기분' },
    { id: 'energy', title: '에너지가 차고 빠지는 때' },
    { id: 'needs',  title: '힘들 때 나한테 필요한 것' },
    { id: 'wish',   title: '부모님이 알아줬으면 하는 것' },
    { id: 'taste',  title: '내 취향' },
    { id: 'talk',   title: '내 대화 방식' },
  ],

  NEEDS: [
    { id: 'alone',   label: '혼자 있을 시간' },
    { id: 'listen',  label: '조언 말고 그냥 들어주기' },
    { id: 'solve',   label: '같이 해결 방법 찾기' },
    { id: 'later',   label: '나중에 다시 물어봐 주기' },
    { id: 'noask',   label: '아무것도 묻지 않기' },
    { id: 'beside',  label: '말없이 옆에 있어 주기' },
    { id: 'food',    label: '맛있는 거' },
    { id: 'sleep',   label: '푹 자기' },
  ],

  STOP: new Set(['그냥','너무','진짜','오늘','내일','어제','조금','좀','많이','엄청','계속','그리고','근데','그래서','하고','해서','있어','없어','있음','없음','같아','같은','나는','내가','이제','아직','다시','정말','완전','약간']),
  DAYS: ['일','월','화','수','목','금','토'],

  _data: null,     // 계산 결과
  _mine: null,     // users/{uid}.manual
  _shared: null,   // families/.../manual/{uid}
  _loading: false,

  _esc(s) { return KyncUI.esc(s); },
  _fc() { return localStorage.getItem('kync_family_code'); },
  _uid() { return KyncAuth?.current?.uid || localStorage.getItem('kync_user_uid'); },
  _role() { return localStorage.getItem('kync_role'); },
  _sharedRef(childUid) { return db.collection('families').doc(this._fc()).collection('manual').doc(childUid); },

  /* ── 사용 기록 (효과 측정) ── */
  log(type, meta = {}) {
    const fc = this._fc(), uid = this._uid();
    if (!fc || !uid || typeof db === 'undefined') return;
    db.collection('families').doc(fc).collection('events').add({
      uid, role: this._role(), type, meta, day: todayKey(),
      at: firebase.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});
  },
  // 하루 한 번만 남기는 기록
  logOnce(type, meta) {
    const k = `kync_ev_${type}_${todayKey()}`;
    try { if (localStorage.getItem(k)) return; localStorage.setItem(k, '1'); } catch (e) {}
    this.log(type, meta);
  },

  /* ════════ 자녀: 열기 ════════ */
  async open() {
    KyncUI.openLayer('layer-manual');
    const body = document.getElementById('manual-body');
    body.innerHTML = `<div class="mn-loading">${KyncBrand.curled(56)}<span>기록 모으는 중</span></div>`;
    this.log('manual_open');
    try {
      await this._load();
      this.render();
      await this._syncShared();
    } catch (e) {
      console.warn('manual:', e);
      body.innerHTML = `<div class="empty"><b>불러오지 못했어</b><p>인터넷 연결 확인하고 다시 열어줘.</p></div>`;
    }
  },

  async _load() {
    const fc = this._fc(), uid = this._uid();
    const famRef = db.collection('families').doc(fc);
    const [recSnap, tasteSnap, balSnap, user, shared] = await Promise.all([
      famRef.collection('records').orderBy(firebase.firestore.FieldPath.documentId(), 'desc').limit(30).get(),
      famRef.collection('balance_answers').where('role', '==', 'child').limit(120).get().catch(() => null),
      famRef.collection('balance').limit(60).get().catch(() => null),
      KyncDB.getUser(uid).catch(() => null),
      this._sharedRef(uid).get().catch(() => null),
    ]);
    this._mine = { needs: [], needsNote: '', wish: '', share: {}, ...(user?.manual || {}) };
    this._shared = shared?.exists ? shared.data() : {};

    const checkins = recSnap.docs.map(d => ({ day: d.id, ...(d.data().checkin || {}) })).filter(c => c.emotion);
    const taste = [];
    tasteSnap?.forEach(d => {
      const v = d.data(); const q = KyncBalance.QUESTIONS.find(x => x.id === v.qId);
      if (q) taste.push({ q: q.q, a: v.answer, t: String(v.day || '') });
    });
    balSnap?.forEach(d => { const v = d.data(); if (v.child && v.child_q) taste.push({ q: v.child_q, a: v.child, t: d.id }); });

    let talk = null;
    const qr = user?.quizResult || (() => { try { return JSON.parse(localStorage.getItem('kync_quiz_result') || 'null'); } catch (e) { return null; } })();
    if (qr?.type && qr.role === 'child') talk = { type: qr.type, sub: qr.sub || '' };

    this._data = {
      mood: this._calcMood(checkins),
      energy: this._calcEnergy(checkins),
      taste: taste.slice(-200).reverse().slice(0, 8),
      tasteCount: taste.length,
      talk,
    };
  },

  /* ── 규칙 기반 계산 ── */
  _calcMood(list) {
    const n = list.length;
    if (n < 3) return { need: 3 - n, n };
    const count = {};
    list.forEach(c => { count[c.emotion] = (count[c.emotion] || 0) + 1; });
    const top = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, c]) => {
      const e = App.EMOTIONS_CHILD.find(x => x.id === id);
      return { id, label: e?.label || id, count: c, pct: Math.round(c / n * 100) };
    });
    const avg = k => { const v = list.map(c => +c[k]).filter(Boolean); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null; };
    // 최근 7일 vs 그 전 기록 스트레스 비교
    const recent = list.slice(0, 7), before = list.slice(7);
    const avgOf = (arr, k) => { const v = arr.map(c => +c[k]).filter(Boolean); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    const sNow = avgOf(recent, 'stress'), sBefore = avgOf(before, 'stress');
    let trend = null;
    if (sNow != null && sBefore != null && before.length >= 3) {
      const d = Math.round((sNow - sBefore) * 10) / 10;
      trend = Math.abs(d) < 0.8 ? 'same' : d > 0 ? 'up' : 'down';
    }
    return { n, top, stress: avg('stress'), energy: avg('energy'), trend };
  },

  _calcEnergy(list) {
    const n = list.length;
    if (n < 7) return { need: 7 - n, n };
    const byDay = {};
    list.forEach(c => {
      if (!c.energy) return;
      const [y, m, d] = c.day.split('-').map(Number);
      const wd = new Date(y, m - 1, d).getDay();
      (byDay[wd] = byDay[wd] || []).push(+c.energy);
    });
    const days = Object.entries(byDay).map(([wd, v]) => ({ day: this.DAYS[wd], avg: Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 }))
      .sort((a, b) => b.avg - a.avg);
    const high = days[0], low = days[days.length - 1];
    // 스트레스 높은 날(7 이상) 메모에 2번 이상 나온 말
    const words = {};
    list.filter(c => +c.stress >= 7 && c.memo).forEach(c => {
      new Set(String(c.memo).replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/)
        .map(w => w.replace(/(이랑|에서|까지|부터|이라|해서|하고|이야|이고|은|는|이|가|을|를|에|도|만|랑|와|과|의|로)$/, ''))
        .filter(w => w.length >= 2 && !this.STOP.has(w))).forEach(w => { words[w] = (words[w] || 0) + 1; });
    });
    const stressWords = Object.entries(words).filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w]) => w);
    return { n, high, low: low !== high ? low : null, spread: high && low ? Math.round((high.avg - low.avg) * 10) / 10 : 0, stressWords };
  },

  /* ════════ 자녀 화면 그리기 ════════ */
  render() {
    const body = document.getElementById('manual-body');
    if (!body || !this._data) return;
    const d = this._data;
    const sec = (id, inner, canShare = true) => {
      const s = this.SECTIONS.find(x => x.id === id);
      const on = !!this._mine.share?.[id];
      const thanked = this._shared?.thanks?.[id];
      return `
        <section class="mn-sec" id="mnsec-${id}">
          <div class="mn-sec-head">
            <h3>${s.title}</h3>
            ${canShare ? `<label class="mn-share"><span>${on ? '부모님께 보임' : '나만 보기'}</span>
              <span class="switch"><input type="checkbox" ${on ? 'checked' : ''} onchange="KyncManual.toggleShare('${id}', this.checked)" aria-label="${s.title} 부모님께 보이기"><span class="track"></span></span></label>` : ''}
          </div>
          ${inner}
          ${on && thanked ? `<div class="mn-thanks">${ic('heart', 14)}부모님이 고마워했어</div>` : ''}
        </section>`;
    };
    const wait = (need, what) => `<p class="mn-wait">${what} ${need}번 더 남기면 보여.</p>`;

    // 기분
    let mood;
    if (d.mood.need) mood = sec('mood', wait(d.mood.need, '기분을'), false);
    else {
      const m = d.mood;
      const trendTxt = m.trend === 'up' ? '지난주보다 스트레스가 올라갔어' : m.trend === 'down' ? '지난주보다 스트레스가 내려갔어' : m.trend === 'same' ? '스트레스는 지난주랑 비슷해' : '';
      mood = sec('mood', `
        <p class="mn-lead">최근 기록 ${m.n}일 중 제일 많았던 기분은 <b>‘${this._esc(m.top[0].label)}’</b></p>
        <div class="mn-bars">${m.top.map(t => {
          const e = App.EMOTIONS_CHILD.find(x => x.id === t.id);
          return `<div class="mn-bar"><span class="mn-bar-l">${e?.img ? `<img src="${e.img}" alt="" width="22" height="22">` : ''}${this._esc(t.label)}</span>
            <span class="mn-bar-t"><i style="width:${t.pct}%"></i></span><span class="mn-bar-v">${t.count}일</span></div>`;
        }).join('')}</div>
        <div class="mn-stats">
          <div><small>평균 스트레스</small><b>${m.stress ?? '—'}</b></div>
          <div><small>평균 에너지</small><b>${m.energy ?? '—'}</b></div>
        </div>
        ${trendTxt ? `<p class="mn-note">${trendTxt}</p>` : ''}`);
    }

    // 에너지
    let energy;
    if (d.energy.need) energy = sec('energy', wait(d.energy.need, '기분을'), false);
    else {
      const e = d.energy;
      energy = sec('energy', `
        <div class="mn-stats">
          <div><small>에너지 높은 요일</small><b>${e.high ? `${e.high.day}요일` : '—'}</b><em>${e.high ? `평균 ${e.high.avg}` : ''}</em></div>
          <div><small>에너지 낮은 요일</small><b>${e.low ? `${e.low.day}요일` : '—'}</b><em>${e.low ? `평균 ${e.low.avg}` : ''}</em></div>
        </div>
        ${e.stressWords.length ? `<p class="mn-note">스트레스 높은 날 메모에 자주 나온 말: ${e.stressWords.map(w => `<b>${this._esc(w)}</b>`).join(', ')}</p>` : ''}
        ${e.spread < 1 ? `<p class="mn-note">요일마다 큰 차이는 없어.</p>` : ''}`);
    }

    // 필요한 것 (직접 고름)
    const needs = sec('needs', `
      <p class="mn-sub">최대 3개</p>
      <div class="mn-chips">${this.NEEDS.map(n => {
        const on = this._mine.needs.includes(n.id);
        return `<button type="button" class="mn-chip ${on ? 'on' : ''}" aria-pressed="${on}" onclick="KyncManual.toggleNeed('${n.id}')">${n.label}</button>`;
      }).join('')}</div>
      <input id="mn-needs-note" class="input" maxlength="60" placeholder="덧붙일 말 (안 써도 돼)" value="${this._esc(this._mine.needsNote || '')}" onchange="KyncManual.saveText('needsNote', this.value)">`);

    // 알아줬으면 하는 것
    const wish = sec('wish', `
      <textarea id="mn-wish" class="textarea mn-wish" maxlength="120" placeholder="요즘 나에 대해 부모님이 알아줬으면 하는 것" onchange="KyncManual.saveText('wish', this.value)">${this._esc(this._mine.wish || '')}</textarea>
      <div class="count"><span>${(this._mine.wish || '').length}</span>/120</div>`);

    // 취향
    const taste = d.taste.length ? sec('taste', `
      <div class="mn-list">${d.taste.map(t => `<div><small>${this._esc(t.q)}</small><b>${this._esc(t.a)}</b></div>`).join('')}</div>
      ${d.tasteCount > d.taste.length ? `<p class="mn-note">최근 ${d.taste.length}개만 보여줘.</p>` : ''}`)
      : sec('taste', `<p class="mn-wait">활동 탭에서 취향 맞추기나 밸런스 게임을 하면 여기 모여.</p>`, false);

    // 대화 방식
    const talk = d.talk ? sec('talk', `<p class="mn-lead"><b>${this._esc(d.talk.type)}</b></p><p class="mn-note">${this._esc(d.talk.sub)}</p>`)
      : sec('talk', `<p class="mn-wait">활동 탭에서 대화 유형 검사를 하면 여기 들어가.</p>`, false);

    const sharedCount = Object.values(this._mine.share || {}).filter(Boolean).length;
    body.innerHTML = `
      <div class="mn-intro">
        <p>내 기록에서 찾은 나.</p>
        <p>처음엔 전부 나만 보여. 부모님께 보여줄 건 항목마다 내가 골라.</p>
        <div class="mn-count">${ic('lock', 14)}${sharedCount ? `${sharedCount}개 항목을 부모님께 보여주는 중` : '지금은 전부 나만 보기'}</div>
      </div>
      ${mood}${energy}${needs}${wish}${taste}${talk}
      <p class="mn-foot">기록을 정리한 거지 성격 진단은 아니야. 기록이 쌓일수록 정확해져.</p>`;
  },

  /* ── 자녀 입력 ── */
  async _saveMine(patch) {
    Object.assign(this._mine, patch);
    try { await KyncDB.setUser(this._uid(), { manual: { ...this._mine, updatedAt: firebase.firestore.FieldValue.serverTimestamp() } }); }
    catch (e) { toast('저장 못 했어. 인터넷 연결 확인해줘', 'error'); }
  },

  async toggleNeed(id) {
    const cur = this._mine.needs || [];
    let next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
    if (next.length > 3) { toast('3개까지만 고를 수 있어', 'error'); return; }
    await this._saveMine({ needs: next });
    this.log('manual_needs', { count: next.length });
    this.render();
    if (this._mine.share?.needs) this._syncShared();
  },

  async saveText(key, value) {
    value = String(value || '').trim();
    if ((this._mine[key] || '') === value) return;
    await this._saveMine({ [key]: value });
    this.log('manual_text', { key, len: value.length });
    const sec = key === 'wish' ? 'wish' : 'needs';
    if (this._mine.share?.[sec]) this._syncShared();
    toast('저장했어', 'ok');
    this.render();
  },

  async toggleShare(id, on) {
    if (on && !this._sectionValue(id)) { toast('아직 보여줄 내용이 없어', 'error'); this.render(); return; }
    const share = { ...(this._mine.share || {}), [id]: on };
    await this._saveMine({ share });
    this.log(on ? 'manual_share_on' : 'manual_share_off', { section: id });
    await this._syncShared();
    toast(on ? '부모님 화면에 보여' : '다시 나만 보기로 바꿨어', 'ok');
    this.render();
  },

  // 부모에게 올라갈 요약본 (섹션별)
  _sectionValue(id) {
    const d = this._data || {}, m = this._mine || {};
    if (id === 'mood')   return d.mood && !d.mood.need ? { n: d.mood.n, top: d.mood.top.map(({ id, label, count }) => ({ id, label, count })), stress: d.mood.stress, energy: d.mood.energy, trend: d.mood.trend } : null;
    if (id === 'energy') return d.energy && !d.energy.need ? { high: d.energy.high || null, low: d.energy.low || null, stressWords: d.energy.stressWords } : null;
    if (id === 'needs')  return m.needs?.length ? { items: m.needs.map(x => this.NEEDS.find(n => n.id === x)?.label).filter(Boolean), note: m.needsNote || '' } : null;
    if (id === 'wish')   return m.wish ? m.wish : null;
    if (id === 'taste')  return d.taste?.length ? d.taste.map(({ q, a }) => ({ q, a })) : null;
    if (id === 'talk')   return d.talk || null;
    return null;
  },

  // 켜진 항목만 요약본을 가족 문서에 반영 (꺼진 항목은 지움)
  async _syncShared() {
    const fc = this._fc(), uid = this._uid();
    if (!fc || !uid) return;
    const del = firebase.firestore.FieldValue.delete();
    const data = { updatedAt: firebase.firestore.FieldValue.serverTimestamp(), name: localStorage.getItem('kync_user_name') || '' };
    let any = false;
    this.SECTIONS.forEach(s => {
      const v = this._mine.share?.[s.id] ? this._sectionValue(s.id) : null;
      data[s.id] = v ?? del;
      if (v) any = true;
    });
    data.any = any;
    try { await this._sharedRef(uid).set(data, { merge: true }); } catch (e) { console.warn('manual share:', e); }
  },

  /* ════════ 부모 화면: 아이가 알려준 것 ════════ */
  _unsub: null,
  listenParent() {
    const fc = this._fc();
    const el = document.getElementById('p-manual-card');
    if (!fc || !el || typeof db === 'undefined') return;
    if (this._unsub) { try { this._unsub(); } catch (e) {} }
    this._unsub = db.collection('families').doc(fc).collection('manual').onSnapshot(snap => {
      const docs = snap.docs.map(d => ({ uid: d.id, ...d.data() })).filter(x => x.any);
      this._parentDocs = docs;
      this.renderParent();
      if (typeof KyncActivity !== 'undefined') KyncActivity.render();
      if (typeof KyncInbox !== 'undefined') KyncInbox.refresh();
    }, e => console.warn('manual listen:', e));
  },
  stop() { if (this._unsub) { try { this._unsub(); } catch (e) {} this._unsub = null; } },

  renderParent() {
    const el = document.getElementById('p-manual-card');
    if (!el) return;
    const docs = this._parentDocs || [];
    if (!docs.length) { el.classList.add('hidden'); el.innerHTML = ''; return; }
    el.classList.remove('hidden');
    this.logOnce('manual_parent_view', { sections: docs.reduce((n, x) => n + this.SECTIONS.filter(s => x[s.id]).length, 0) });
    el.innerHTML = docs.map(x => {
      const name = this._esc(x.name || '아이');
      const parts = this.SECTIONS.filter(s => x[s.id]).map(s => {
        const v = x[s.id], thanked = !!x.thanks?.[s.id];
        let inner = '';
        if (s.id === 'mood') inner = `<p>최근 ${v.n}일 중 가장 많았던 기분은 <b>‘${this._esc(v.top?.[0]?.label || '')}’</b>예요. 평균 스트레스 ${v.stress ?? '—'}, 에너지 ${v.energy ?? '—'}.</p>`;
        if (s.id === 'energy') inner = `<p>${v.high ? `에너지가 높은 날은 <b>${v.high.day}요일</b>` : ''}${v.low ? `, 낮은 날은 <b>${v.low.day}요일</b>이에요.` : '.'}</p>${v.stressWords?.length ? `<p class="mn-note">스트레스가 높았던 날 자주 나온 말: ${v.stressWords.map(w => this._esc(w)).join(', ')}</p>` : ''}`;
        if (s.id === 'needs') inner = `<div class="mn-chips">${v.items.map(t => `<span class="mn-chip on">${this._esc(t)}</span>`).join('')}</div>${v.note ? `<p class="mn-note">“${this._esc(v.note)}”</p>` : ''}`;
        if (s.id === 'wish') inner = `<p class="mn-quote">“${this._esc(v)}”</p>`;
        if (s.id === 'taste') inner = `<div class="mn-list">${v.slice(0, 4).map(t => `<div><small>${this._esc(t.q)}</small><b>${this._esc(t.a)}</b></div>`).join('')}</div>`;
        if (s.id === 'talk') inner = `<p><b>${this._esc(v.type)}</b> <span class="mn-note">${this._esc(v.sub)}</span></p>`;
        return `<div class="mn-p-sec">
          <div class="mn-p-head"><h4>${s.title.replace('나한테', '아이에게').replace('내 ', '').replace('요즘 ', '')}</h4>
            <button class="mn-thx ${thanked ? 'on' : ''}" ${thanked ? 'disabled' : ''} onclick="KyncManual.thank('${x.uid}','${s.id}')">${ic('heart', 14)}${thanked ? '고마워 보냄' : '고마워'}</button></div>
          ${inner}</div>`;
      }).join('');
      return `<div class="card-head"><h2>${name}의 사용 설명서</h2></div>
        <p class="mn-p-sub">아이가 직접 고른 것만 보여요.</p>${parts}`;
    }).join('');
  },

  async thank(childUid, section) {
    try {
      await db.collection('families').doc(this._fc()).collection('manual').doc(childUid)
        .set({ thanks: { [section]: Date.now() } }, { merge: true });
      this.log('manual_parent_thanks', { section });
    } catch (e) { toast('보내지 못했어요. 다시 눌러주세요.', 'error'); }
  },
};

window.KyncManual = KyncManual;
