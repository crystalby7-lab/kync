/* ═══════════════════════════════════════════════════════════
   kync-manual.js — 나 사용 설명서
   - 자녀 기록(기분·스트레스·에너지·메모·취향 답·대화 유형)을 규칙으로 정리. 기본은 자녀만 봄
   - 자녀가 켠 항목만 families/{코드}/manual/{자녀uid} 에 요약본으로 올라가 부모 화면에 보임
   - 부모는 '고마워'만 누를 수 있음
   - 효과 측정용 사용 기록: families/{코드}/events
   데이터
     users/{uid}.manual = { needs:[id], needsNote, times:[id], avoid, wish, share:{섹션:true} }
     families/{코드}/manual/{자녀uid} = { 섹션별 요약, any, name, updatedAt, thanks:{섹션:시각} }
═══════════════════════════════════════════════════════════ */

const KyncManual = {

  SECTIONS: [
    { id: 'mood',    title: '요즘 기분',            parent: '요즘 기분' },
    { id: 'energy',  title: '에너지',               parent: '에너지' },
    { id: 'journal', title: '일기에서 보이는 것',    parent: '일기에서 보이는 것' },
    { id: 'traits',  title: '성향',                 parent: '성향' },
    { id: 'needs',   title: '힘들 때 필요한 것',     parent: '힘들 때 필요한 것' },
    { id: 'talkhow', title: '나랑 대화하는 법',      parent: '대화하는 법' },
    { id: 'wish',    title: '알아줬으면 하는 것',    parent: '알아줬으면 하는 것' },
    { id: 'talk',    title: '대화 유형',            parent: '대화 유형' },
  ],

  NEEDS: [
    { id: 'alone',  label: '혼자 있을 시간' },
    { id: 'listen', label: '조언 없이 듣기만' },
    { id: 'solve',  label: '같이 방법 찾기' },
    { id: 'later',  label: '나중에 다시 물어보기' },
    { id: 'noask',  label: '아무것도 안 묻기' },
    { id: 'beside', label: '말없이 옆에 있기' },
    { id: 'food',   label: '맛있는 거' },
    { id: 'sleep',  label: '잠' },
  ],

  TIMES: [
    { id: 'morning', label: '아침' },
    { id: 'meal',    label: '밥 먹을 때' },
    { id: 'move',    label: '차 타고 이동할 때' },
    { id: 'evening', label: '저녁에 쉴 때' },
    { id: 'night',   label: '자기 전' },
    { id: 'weekend', label: '주말' },
    { id: 'chat',    label: '메시지로' },
  ],

  STOP: new Set(['그냥','너무','진짜','오늘','내일','어제','조금','좀','많이','엄청','계속','그리고','근데','그래서','하고','해서','있어','없어','있음','없음','같아','같은','나는','내가','이제','아직','다시','정말','완전','약간','했음','했다','해야','하는','되는','같음']),
  DAYS: ['일','월','화','수','목','금','토'],

  _data: null,
  _mine: null,
  _shared: null,
  _parentDocs: [],
  _unsub: null,

  _esc(s) { return KyncUI.esc(s); },
  _fc() { return localStorage.getItem('kync_family_code'); },
  _uid() { return KyncAuth?.current?.uid || localStorage.getItem('kync_user_uid'); },
  _role() { return localStorage.getItem('kync_role'); },
  _sharedRef(childUid) { return db.collection('families').doc(this._fc()).collection('manual').doc(childUid); },
  _emo(id) { return App.EMOTIONS_CHILD.find(e => e.id === id); },

  /* ── 사용 기록 (효과 측정) ── */
  log(type, meta = {}) {
    const fc = this._fc(), uid = this._uid();
    if (!fc || !uid || typeof db === 'undefined') return;
    db.collection('families').doc(fc).collection('events').add({
      uid, role: this._role(), type, meta, day: todayKey(),
      at: firebase.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});
  },
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
    if (!this._fc() || !this._uid()) {
      body.innerHTML = `<div class="empty"><b>가족이랑 연결하면 쓸 수 있어</b></div>`;
      return;
    }
    this.log('manual_open');
    try {
      await this._load();
    } catch (e) {
      console.warn('manual load:', e);
      this._loadError = e?.code || e?.message || 'unknown';
    }
    try {
      this.render();
    } catch (e) {
      console.error('manual render:', e);
      body.innerHTML = `<div class="empty"><b>화면을 그리지 못했어</b><p>이 화면을 캡처해서 알려줘. (${this._esc(e?.message || e)})</p></div>`;
      return;
    }
    this._syncShared().catch(() => {});
  },

  async _load() {
    const fc = this._fc(), uid = this._uid();
    const famRef = db.collection('families').doc(fc);
    this._loadError = null;
    const fail = name => e => { console.warn(`manual ${name}:`, e); this._loadError = this._loadError || `${name}: ${e?.code || e?.message}`; return null; };
    // 어떤 하나가 실패해도 나머지로 화면을 그림
    this._mine = this._mine || { needs: [], needsNote: '', times: [], avoid: '', wish: '', share: {} };
    this._data = this._data || { mood: { need: 3, n: 0 }, energy: { need: 7, n: 0 }, traits: { count: 0, dims: [], others: [] }, talk: null };
    const [recSnap, tasteSnap, user, shared, journal] = await Promise.all([
      famRef.collection('records').orderBy(firebase.firestore.FieldPath.documentId(), 'desc').limit(30).get()
        .catch(() => famRef.collection('records').limit(60).get()).catch(fail('records')),
      famRef.collection('balance_answers').where('role', '==', 'child').limit(300).get().catch(fail('taste')),
      KyncDB.getUser(uid).catch(fail('user')),
      this._sharedRef(uid).get().catch(fail('shared')),
      (typeof KyncJournal !== 'undefined' ? KyncJournal.load() : Promise.resolve([])).catch(fail('journal')),
    ]);
    this._mine = { needs: [], needsNote: '', times: [], avoid: '', wish: '', share: {}, ...(user?.manual || {}) };
    this._shared = shared?.exists ? shared.data() : {};

    // 최신순 체크인
    const checkins = (recSnap?.docs || []).map(d => ({ day: d.id, ...(d.data().checkin || {}) })).filter(c => c.emotion)
      .sort((a, b) => b.day.localeCompare(a.day)).slice(0, 30);

    // 취향 답 → 성향 축 + 그 밖의 답
    const answers = [];
    tasteSnap?.forEach(d => {
      const v = d.data(), q = KyncBalance.QUESTIONS.find(x => x.id === v.qId);
      if (q) answers.push({ q, a: v.answer, day: String(v.day || '') });
    });

    let talk = null;
    const qr = user?.quizResult || (() => { try { return JSON.parse(localStorage.getItem('kync_quiz_result') || 'null'); } catch (e) { return null; } })();
    if (qr?.type && qr.role === 'child') talk = { type: qr.type, sub: qr.sub || '' };

    this._data = {
      mood: this._calcMood(checkins),
      energy: this._calcEnergy(checkins),
      traits: this._calcTraits(answers),
      journal: typeof KyncJournal !== 'undefined'
        ? KyncJournal.analyze(journal || [], Object.fromEntries(checkins.map(c => [c.day, c])))
        : { need: 3, n: 0 },
      talk,
    };
  },

  /* ── 계산: 기분 ── */
  _calcMood(list) {
    const n = list.length;
    if (n < 3) return { need: 3 - n, n };
    const count = {};
    list.forEach(c => { count[c.emotion] = (count[c.emotion] || 0) + 1; });
    const top = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([id, c]) => ({ id, label: this._emo(id)?.label || id, count: c, pct: Math.round(c / n * 100) }));
    const avgOf = (arr, k) => { const v = arr.map(c => +c[k]).filter(Boolean); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null; };
    const recent = list.slice(0, 7), before = list.slice(7);
    let trend = null;
    const sNow = avgOf(recent, 'stress'), sBefore = avgOf(before, 'stress');
    if (sNow != null && sBefore != null && before.length >= 3) {
      const d = sNow - sBefore;
      trend = Math.abs(d) < 0.8 ? 'same' : d > 0 ? 'up' : 'down';
    }
    // 최근 30일 칸 (오래된 날 → 오늘)
    const byDay = Object.fromEntries(list.map(c => [c.day, c.emotion]));
    const strip = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      strip.push({ key, emo: byDay[key] || null, dow: d.getDay(), date: d.getDate() });
    }
    return { n, top, stress: avgOf(list, 'stress'), energy: avgOf(list, 'energy'), trend, strip };
  },

  /* ── 계산: 에너지·스트레스 ── */
  _words(list) {
    const words = {};
    list.filter(c => c.memo).forEach(c => {
      new Set(String(c.memo).replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/)
        .map(w => w.replace(/(이랑|에서|까지|부터|이라|해서|하고|이야|이고|은|는|이|가|을|를|에|도|만|랑|와|과|의|로)$/, ''))
        .filter(w => w.length >= 2 && !this.STOP.has(w))).forEach(w => { words[w] = (words[w] || 0) + 1; });
    });
    return Object.entries(words).filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w]) => w);
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

    // 스트레스 높은 날(7 이상)에 에너지가 얼마나 떨어지는지
    const hi = list.filter(c => +c.stress >= 7), lo = list.filter(c => c.stress && +c.stress < 7);
    const avgE = arr => arr.length ? arr.reduce((a, c) => a + (+c.energy || 0), 0) / arr.length : null;
    const eHi = avgE(hi), eLo = avgE(lo);
    const drain = eHi != null && eLo != null && hi.length >= 2 ? Math.round((eLo - eHi) * 10) / 10 : null;

    // 회복: 스트레스 7 이상인 날 이후 4 이하로 내려오기까지 걸린 날 (기록된 날 기준)
    const asc = list.slice().sort((a, b) => a.day.localeCompare(b.day));
    const gaps = [];
    asc.forEach((c, i) => {
      if (+c.stress < 7) return;
      const j = asc.findIndex((x, k) => k > i && +x.stress <= 4);
      if (j > 0) {
        const t = (new Date(asc[j].day) - new Date(c.day)) / 86400000;
        if (t > 0 && t <= 14) gaps.push(t);
      }
    });
    const recover = gaps.length >= 2 ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length * 10) / 10 : null;

    return {
      n, high, low: low !== high ? low : null, spread: high && low ? Math.round((high.avg - low.avg) * 10) / 10 : 0,
      stressWords: this._words(hi), goodWords: this._words(list.filter(c => +c.energy >= 7)),
      drain, recover,
    };
  },

  /* ── 계산: 성향 (취향 맞추기 답) ── */
  _calcTraits(answers) {
    // 같은 질문에 여러 번 답했으면 마지막 답만
    const last = {};
    answers.sort((a, b) => a.day.localeCompare(b.day)).forEach(x => { last[x.q.id] = x; });
    const list = Object.values(last);
    const dims = [];
    Object.entries(KyncBalance.DIMS).forEach(([key, def]) => {
      const qs = list.filter(x => x.q.dim === key);
      if (qs.length < 2) return;
      const left = qs.filter(x => x.a === x.q.opts[0]).length, right = qs.length - left;
      const side = left === right ? null : left > right ? 0 : 1;
      dims.push({ key, title: def.title, poles: def.poles, short: def.short || def.poles, left, right, total: qs.length, side, label: side == null ? '반반' : def.poles[side] });
    });
    const others = list.filter(x => !x.q.dim).slice(-6).reverse().map(x => ({ q: x.q.q, a: x.a }));
    return { count: list.length, dims, others };
  },

  /* ════════ 자녀 화면 ════════ */
  render() {
    const body = document.getElementById('manual-body');
    if (!body || !this._data) return;
    const d = this._data, e = this._esc.bind(this);
    const sec = (id, inner, canShare = true, sub = '') => {
      const s = this.SECTIONS.find(x => x.id === id);
      const on = !!this._mine.share?.[id];
      const thanked = this._shared?.thanks?.[id];
      return `
        <section class="mn-sec" id="mnsec-${id}">
          <div class="mn-sec-head">
            <div><h3>${s.title}</h3>${sub ? `<p class="mn-sub">${sub}</p>` : ''}</div>
            ${canShare ? `<label class="mn-share"><span>${on ? '공개' : '나만'}</span>
              <span class="switch"><input type="checkbox" ${on ? 'checked' : ''} onchange="KyncManual.toggleShare('${id}', this.checked)" aria-label="${s.title} 부모님께 공개"><span class="track"></span></span></label>` : ''}
          </div>
          ${inner}
          ${on && thanked ? `<div class="mn-thanks">${ic('heart', 14)}부모님이 고마워함</div>` : ''}
        </section>`;
    };
    const wait = (need) => `<p class="mn-wait">기분 기록이 ${need}일 더 있으면 보여.</p>`;

    // 요즘 기분
    let mood;
    if (d.mood.need) mood = sec('mood', wait(d.mood.need, '기분을'), false);
    else {
      const m = d.mood;
      const trendTxt = { up: '최근 7일 스트레스가 그 전보다 높아.', down: '최근 7일 스트레스가 그 전보다 낮아.', same: '최근 7일 스트레스는 그 전이랑 비슷해.' }[m.trend] || '';
      mood = sec('mood', `
        <div class="mn-strip" aria-label="최근 30일 기분">${m.strip.map(c => {
          const em = c.emo && this._emo(c.emo);
          return `<i class="${c.dow === 0 ? 'sun' : ''}" title="${c.key}${em ? ' ' + em.label : ''}" style="${em ? `background:${em.color}` : ''}"></i>`;
        }).join('')}</div>
        <div class="mn-strip-legend"><span>30일 전</span><span>오늘</span></div>
        <div class="mn-bars">${m.top.map(t => {
          const em = this._emo(t.id);
          return `<div class="mn-bar"><span class="mn-bar-l"><i style="background:${em?.color || 'var(--faint)'}"></i>${e(t.label)}</span>
            <span class="mn-bar-t"><i style="width:${t.pct}%"></i></span><span class="mn-bar-v">${t.count}일</span></div>`;
        }).join('')}</div>
        <div class="mn-stats">
          <div><small>평균 스트레스</small><b>${m.stress ?? '—'}</b></div>
          <div><small>평균 에너지</small><b>${m.energy ?? '—'}</b></div>
        </div>
        ${trendTxt ? `<p class="mn-note">${trendTxt}</p>` : ''}`, true, `기록 ${m.n}일`);
    }

    // 에너지
    let energy;
    if (d.energy.need) energy = sec('energy', wait(d.energy.need, '기분을'), false);
    else {
      const x = d.energy;
      const lines = [];
      if (x.drain != null && x.drain >= 1) lines.push(`스트레스가 7 이상인 날은 에너지가 평균 <b>${x.drain}</b> 낮아.`);
      if (x.recover != null) lines.push(`스트레스가 높았던 날부터 다시 4 이하로 내려오기까지 평균 <b>${x.recover}일</b>.`);
      if (x.goodWords.length) lines.push(`에너지 높은 날 메모에 자주 나온 말: ${x.goodWords.map(w => `<b>${e(w)}</b>`).join(', ')}`);
      if (x.stressWords.length) lines.push(`스트레스 높은 날 메모에 자주 나온 말: ${x.stressWords.map(w => `<b>${e(w)}</b>`).join(', ')}`);
      if (x.spread < 1) lines.push('요일별 차이는 거의 없어.');
      energy = sec('energy', `
        <div class="mn-stats">
          <div><small>높은 요일</small><b>${x.high ? `${x.high.day}` : '—'}</b><em>${x.high ? `평균 ${x.high.avg}` : ''}</em></div>
          <div><small>낮은 요일</small><b>${x.low ? `${x.low.day}` : '—'}</b><em>${x.low ? `평균 ${x.low.avg}` : ''}</em></div>
        </div>
        ${lines.map(l => `<p class="mn-note">${l}</p>`).join('')}`);
    }

    // 일기에서 보이는 것
    const j = d.journal || { need: 3, n: 0 };
    const writeBtn = `<button class="btn btn-soft btn-sm mn-write" onclick="KyncJournal.open()">${ic('edit', 16)}일기 쓰기</button>`;
    const journal = j.need ? sec('journal', `<p class="mn-wait">일기가 ${j.need}개 더 있으면 보여. 지금 ${j.n}개.</p>${writeBtn}`, false)
      : sec('journal', `
        ${j.topThemes.length ? `<div class="mn-bars">${j.topThemes.map(t => `
          <div class="mn-bar"><span class="mn-bar-l">${e(t.theme)}</span><span class="mn-bar-t"><i style="width:${t.pct}%"></i></span><span class="mn-bar-v">${t.count}번</span></div>`).join('')}</div>
          ${j.topThemes.filter(t => t.stress != null).slice(0, 2).map(t => `<p class="mn-note">${e(t.theme)} 얘기를 쓴 날 평균 스트레스 <b>${t.stress}</b></p>`).join('')}`
          : `<p class="mn-note">아직 뚜렷한 주제는 없어.</p>`}
        <div class="mn-tone">
          <div class="mn-tone-bar"><i class="neg" style="width:${j.negPct}%"></i><i class="pos" style="width:${j.posPct}%"></i></div>
          <div class="mn-tone-legend"><span><i class="neg"></i>힘든 얘기 ${j.negPct}%</span><span><i class="pos"></i>괜찮은 얘기 ${j.posPct}%</span></div>
        </div>
        ${j.repeated.length ? `<p class="mn-note">여러 번 나온 말: ${j.repeated.map(r => `<b>${e(r.w)}</b>`).join(', ')}</p>` : ''}
        ${j.lift.length ? `<p class="mn-note">괜찮았던 날 글에 자주 나온 것: ${j.lift.map(w => `<b>${e(w)}</b>`).join(', ')}</p>` : ''}
        ${j.month.count ? `<p class="mn-note">이번 달 ${j.month.count}개${j.month.lastCount ? `, 지난달 ${j.month.lastCount}개` : ''}.${j.month.negRate != null && j.month.lastNegRate != null ? ` 힘든 얘기 비율 ${j.month.lastNegRate}% → ${j.month.negRate}%.` : ''}</p>` : ''}
        ${writeBtn}`, true, `일기 ${j.n}개 기준 · 공개하면 내용 말고 주제랑 비율만 보여`);

    // 성향
    const t = d.traits;
    const traits = t.dims.length ? sec('traits', `
      <div class="mn-dims">${t.dims.map(x => `
        <div class="mn-dim">
          <div class="mn-dim-top"><small>${e(x.title)}</small><b>${e(x.label)}</b></div>
          <div class="mn-dim-bar"><span>${e(x.short[0])}</span>
            <i><em style="width:${Math.round(x.left / x.total * 100)}%"></em></i>
            <span>${e(x.short[1])}</span></div>
        </div>`).join('')}</div>
      ${t.others.length ? `<div class="mn-list">${t.others.map(o => `<div><small>${e(o.q)}</small><b>${e(o.a)}</b></div>`).join('')}</div>` : ''}`,
      true, `취향 맞추기 답 ${t.count}개 기준`)
      : sec('traits', `<p class="mn-wait">활동 탭 취향 맞추기를 하면 쌓여. 축마다 답이 2개 이상 모이면 보여.</p>`, false);

    // 힘들 때 필요한 것
    const needs = sec('needs', `
      <div class="mn-chips">${this.NEEDS.map(n => {
        const on = this._mine.needs.includes(n.id);
        return `<button type="button" class="mn-chip ${on ? 'on' : ''}" aria-pressed="${on}" onclick="KyncManual.toggleList('needs', '${n.id}')">${n.label}</button>`;
      }).join('')}</div>
      <input class="input" maxlength="60" placeholder="덧붙일 말 (선택)" value="${e(this._mine.needsNote || '')}" onchange="KyncManual.saveText('needsNote', this.value)" aria-label="덧붙일 말">`,
      true, '3개까지');

    // 나랑 대화하는 법
    const talkhow = sec('talkhow', `
      <div class="label mn-label">말 걸기 편한 때</div>
      <div class="mn-chips">${this.TIMES.map(n => {
        const on = this._mine.times.includes(n.id);
        return `<button type="button" class="mn-chip ${on ? 'on' : ''}" aria-pressed="${on}" onclick="KyncManual.toggleList('times', '${n.id}')">${n.label}</button>`;
      }).join('')}</div>
      <div class="label mn-label">듣기 힘든 말</div>
      <input class="input" maxlength="60" placeholder="선택" value="${e(this._mine.avoid || '')}" onchange="KyncManual.saveText('avoid', this.value)" aria-label="듣기 힘든 말">`,
      true, '3개까지');

    // 알아줬으면 하는 것
    const wish = sec('wish', `
      <textarea id="mn-wish" class="textarea mn-wish" maxlength="120" placeholder="요즘 나에 대해" onchange="KyncManual.saveText('wish', this.value)" aria-label="알아줬으면 하는 것">${e(this._mine.wish || '')}</textarea>`);

    // 대화 유형
    const talk = d.talk ? sec('talk', `<p class="mn-lead"><b>${e(d.talk.type)}</b></p><p class="mn-note">${e(d.talk.sub)}</p>`)
      : sec('talk', `<p class="mn-wait">활동 탭 대화 유형 검사를 하면 들어가.</p>`, false);

    const sharedCount = Object.values(this._mine.share || {}).filter(Boolean).length;
    body.innerHTML = `
      <div class="mn-intro">
        ${KyncBrand.mascot('wow', 76, { role: 'child', cls: 'mn-char' })}
        <p class="mn-h">나 사용 설명서</p>
        <p>내 기록을 모아서 정리했어. 기본은 나만 보고, 공개를 켠 항목만 부모님 화면에 떠.</p>
        <div class="mn-count">${ic('lock', 14)}${sharedCount ? `${sharedCount}개 공개 중` : '전부 나만 보는 중'}</div>
        ${this._loadError ? `<p class="mn-err">일부 기록을 못 불러왔어 (${this._esc(this._loadError)})</p>` : ''}
      </div>
      ${mood}${energy}${journal}${traits}${needs}${talkhow}${wish}${talk}
      <p class="mn-foot">기록을 정리한 거라 진단은 아니야. 기록이 쌓일수록 정확해져.</p>`;
  },

  /* ── 자녀 입력 ── */
  async _saveMine(patch) {
    Object.assign(this._mine, patch);
    try { await KyncDB.setUser(this._uid(), { manual: { ...this._mine, updatedAt: firebase.firestore.FieldValue.serverTimestamp() } }); }
    catch (e) { toast('저장 못 했어. 인터넷 연결 확인해줘', 'error'); }
  },

  async toggleList(key, id) {
    const cur = this._mine[key] || [];
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
    if (next.length > 3) { toast('3개까지 고를 수 있어', 'error'); return; }
    await this._saveMine({ [key]: next });
    this.log('manual_pick', { key, count: next.length });
    this.render();
    const sec = key === 'needs' ? 'needs' : 'talkhow';
    if (this._mine.share?.[sec]) this._syncShared();
  },

  async saveText(key, value) {
    value = String(value || '').trim();
    if ((this._mine[key] || '') === value) return;
    await this._saveMine({ [key]: value });
    this.log('manual_text', { key, len: value.length });
    const sec = { wish: 'wish', needsNote: 'needs', avoid: 'talkhow' }[key];
    if (this._mine.share?.[sec]) this._syncShared();
    toast('저장했어', 'ok');
    this.render();
  },

  async toggleShare(id, on) {
    if (on && !this._sectionValue(id)) { toast('아직 공개할 내용이 없어', 'error'); this.render(); return; }
    const share = { ...(this._mine.share || {}), [id]: on };
    await this._saveMine({ share });
    this.log(on ? 'manual_share_on' : 'manual_share_off', { section: id });
    await this._syncShared();
    toast(on ? '공개했어' : '다시 나만 보기', 'ok');
    this.render();
  },

  // 부모에게 올라갈 요약본
  _sectionValue(id) {
    const d = this._data || {}, m = this._mine || {};
    const label = (list, ids) => (ids || []).map(x => list.find(n => n.id === x)?.label).filter(Boolean);
    if (id === 'mood')    return d.mood && !d.mood.need ? { n: d.mood.n, top: d.mood.top.map(({ id, label, count }) => ({ id, label, count })), stress: d.mood.stress, energy: d.mood.energy, trend: d.mood.trend } : null;
    if (id === 'energy')  return d.energy && !d.energy.need ? { high: d.energy.high || null, low: d.energy.low || null, drain: d.energy.drain, recover: d.energy.recover, stressWords: d.energy.stressWords, goodWords: d.energy.goodWords } : null;
    if (id === 'journal') return d.journal && !d.journal.need ? { n: d.journal.n, themes: d.journal.topThemes.map(({ theme, pct }) => ({ theme, pct })), negPct: d.journal.negPct, posPct: d.journal.posPct } : null;
    if (id === 'traits')  return d.traits?.dims?.length ? { dims: d.traits.dims.map(({ title, label }) => ({ title, label })) } : null;
    if (id === 'needs')   return m.needs?.length ? { items: label(this.NEEDS, m.needs), note: m.needsNote || '' } : null;
    if (id === 'talkhow') return (m.times?.length || m.avoid) ? { times: label(this.TIMES, m.times), avoid: m.avoid || '' } : null;
    if (id === 'wish')    return m.wish || null;
    if (id === 'talk')    return d.talk || null;
    return null;
  },

  async _syncShared() {
    const fc = this._fc(), uid = this._uid();
    if (!fc || !uid) return;
    const del = firebase.firestore.FieldValue.delete();
    const data = { updatedAt: firebase.firestore.FieldValue.serverTimestamp(), name: localStorage.getItem('kync_user_name') || '', taste: del };
    let any = false;
    this.SECTIONS.forEach(s => {
      const v = this._mine.share?.[s.id] ? this._sectionValue(s.id) : null;
      data[s.id] = v ?? del;
      if (v) any = true;
    });
    data.any = any;
    try { await this._sharedRef(uid).set(data, { merge: true }); } catch (e) { console.warn('manual share:', e); }
  },

  /* ════════ 부모 화면 ════════ */
  listenParent() {
    const fc = this._fc();
    if (!fc || typeof db === 'undefined' || !document.getElementById('p-manual-card')) return;
    if (this._unsub) { try { this._unsub(); } catch (e) {} }
    this._unsub = db.collection('families').doc(fc).collection('manual').onSnapshot(snap => {
      this._parentDocs = snap.docs.map(d => ({ uid: d.id, ...d.data() })).filter(x => x.any);
      this.renderParent();
      if (typeof KyncActivity !== 'undefined') KyncActivity.render();
      if (typeof KyncInbox !== 'undefined') KyncInbox.refresh();
    }, e => console.warn('manual listen:', e));
  },
  stop() { if (this._unsub) { try { this._unsub(); } catch (e) {} this._unsub = null; } this._parentDocs = []; },

  renderParent() {
    const el = document.getElementById('p-manual-card');
    if (!el) return;
    const docs = this._parentDocs || [];
    if (!docs.length) { el.classList.add('hidden'); el.innerHTML = ''; return; }
    el.classList.remove('hidden');
    this.logOnce('manual_parent_view', { sections: docs.reduce((n, x) => n + this.SECTIONS.filter(s => x[s.id]).length, 0) });
    const e = this._esc.bind(this);
    el.innerHTML = docs.map(x => {
      const parts = this.SECTIONS.filter(s => x[s.id]).map(s => {
        const v = x[s.id], thanked = !!x.thanks?.[s.id];
        let inner = '';
        if (s.id === 'mood') inner = `<p>최근 ${v.n}일 중 가장 많았던 기분은 <b>‘${e(v.top?.[0]?.label || '')}’</b>. 평균 스트레스 ${v.stress ?? '—'}, 에너지 ${v.energy ?? '—'}.</p>`;
        if (s.id === 'energy') inner = [
          v.high ? `<p>에너지가 높은 요일 <b>${v.high.day}</b>${v.low ? `, 낮은 요일 <b>${v.low.day}</b>` : ''}.</p>` : '',
          v.drain >= 1 ? `<p class="mn-note">스트레스가 높은 날은 에너지가 평균 ${v.drain} 낮아요.</p>` : '',
          v.recover != null ? `<p class="mn-note">스트레스가 높았다가 내려오기까지 평균 ${v.recover}일.</p>` : '',
          v.stressWords?.length ? `<p class="mn-note">스트레스 높은 날 자주 나온 말: ${v.stressWords.map(e).join(', ')}</p>` : '',
        ].join('');
        if (s.id === 'journal') inner = `<p>${v.themes?.length ? `자주 쓴 주제: <b>${v.themes.map(t => e(t.theme)).join(', ')}</b>` : '뚜렷한 주제 없음'}</p><p class="mn-note">일기 ${v.n}개 중 힘든 얘기 ${v.negPct}%, 괜찮은 얘기 ${v.posPct}%. 내용은 보이지 않아요.</p>`;
        if (s.id === 'traits') inner = `<div class="mn-list">${v.dims.map(t => `<div><small>${e(t.title)}</small><b>${e(t.label)}</b></div>`).join('')}</div>`;
        if (s.id === 'needs') inner = `<div class="mn-chips">${v.items.map(t => `<span class="mn-chip">${e(t)}</span>`).join('')}</div>${v.note ? `<p class="mn-note">“${e(v.note)}”</p>` : ''}`;
        if (s.id === 'talkhow') inner = `${v.times?.length ? `<p>말 걸기 편한 때: <b>${v.times.map(e).join(', ')}</b></p>` : ''}${v.avoid ? `<p class="mn-note">듣기 힘든 말: “${e(v.avoid)}”</p>` : ''}`;
        if (s.id === 'wish') inner = `<p class="mn-quote">“${e(v)}”</p>`;
        if (s.id === 'talk') inner = `<p><b>${e(v.type)}</b> <span class="mn-note">${e(v.sub)}</span></p>`;
        return `<div class="mn-p-sec">
          <div class="mn-p-head"><h4>${s.parent}</h4>
            <button class="mn-thx ${thanked ? 'on' : ''}" ${thanked ? 'disabled' : ''} onclick="KyncManual.thank('${x.uid}','${s.id}')">${ic('heart', 14)}${thanked ? '보냄' : '고마워'}</button></div>
          ${inner}</div>`;
      }).join('');
      return `<div class="card-head"><h2>${e(x.name || '아이')}의 사용 설명서</h2></div>
        <p class="mn-p-sub">아이가 공개한 항목만 보여요.</p>${parts}`;
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
