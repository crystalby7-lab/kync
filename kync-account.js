/* ═══════════════════════════════════════════════════════════
   kync-account.js — 가입 단계, 동의, 설정, 탈퇴
   로그인 뒤 화면 순서 (route):
     역할 선택 → 기본 정보 → 약관 동의 → 가족 연결 → (만 14세 미만 자녀) 보호자 동의 → 앱
═══════════════════════════════════════════════════════════ */

const KyncAccount = {
  profile: null,
  family: null,
  _famUnsub: null,
  _waitUnsub: null,
  _consentPrompted: {},
  _introIdx: 0,

  AGREE_ITEMS: [
    { key: 'terms',     label: '서비스 이용약관',          req: true },
    { key: 'privacy',   label: '개인정보 수집·이용',        req: true },
    { key: 'transfer',  label: '개인정보 국외 이전',        req: true },
    { key: 'ai',        label: 'AI 상담 이용',             req: false },
    { key: 'marketing', label: '이벤트·소식 알림 수신',     req: false },
  ],

  INTRO: [
    { art: 'question', title: '답해야 열리는\n오늘의 질문', sub: '같은 질문에 둘 다 답하면 서로의 답이 열려요. 먼저 말하기 어려운 이야기도 조금 편해져요.' },
    { art: 'feeling',  title: '말로 하기 어려운 마음은\n기록과 카드로',  sub: '오늘 기분을 남기고, 고마운 마음은 칭찬 카드로 보내요.' },
    { art: 'together', title: '같이 하는\n작은 약속',            sub: '밸런스 게임, 취향 맞추기, 퀘스트로 서로를 조금씩 더 알아가요.' },
  ],

  esc(s) { return KyncUI.esc(s); },
  uid() { return KyncAuth.current?.uid || localStorage.getItem('kync_user_uid'); },

  /* ════════ 나이 ════════ */
  // 'YYYY-MM' → 만 나이. 생일 달에는 아직 생일이 안 지났다고 보고 계산 (보수적으로)
  ageFromBirth(birth) {
    const m = /^(\d{4})-(\d{2})$/.exec(birth || '');
    if (!m) return null;
    const by = +m[1], bm = +m[2], now = new Date();
    const cy = now.getFullYear(), cm = now.getMonth() + 1;
    return cy - by - (cm <= bm ? 1 : 0);
  },
  isMinor(profile) {
    if (!profile || profile.role !== 'child') return false;
    const age = this.ageFromBirth(profile.birth);
    return age !== null && age < 14;
  },

  /* ════════ 처음 소개 ════════ */
  maybeShowIntro() {
    let seen = false;
    try { seen = !!localStorage.getItem('kync_intro_seen'); } catch (e) {}
    const active = document.querySelector('.page.active')?.id;
    if (!seen && active === 'page-login') {
      this._introIdx = 0;
      this.renderIntro();
      navigateTo('page-intro');
    }
  },

  _introArt(kind) {
    if (kind === 'question') {
      return `<div class="stage">${KyncBrand.curled(170)}
        <div class="bubble" style="top:0;left:8px">${ic('lock', 16)}서로 답하면 열려요</div></div>`;
    }
    if (kind === 'feeling') {
      return `<div class="stage">${KyncBrand.mascot('default', 200)}
        <div class="bubble" style="top:0;right:0">${ic('heart', 16)}오늘도 고마워</div></div>`;
    }
    return `<div class="stage">${KyncBrand.mascot('happy', 200)}
      <div class="bubble" style="top:0;left:-8px">${ic('flag', 16)}밥 먹을 때 폰 내려놓기</div></div>`;
  },

  renderIntro() {
    const s = this.INTRO[this._introIdx], last = this._introIdx === this.INTRO.length - 1;
    document.getElementById('intro-art').innerHTML = this._introArt(s.art);
    document.getElementById('intro-title').innerHTML = this.esc(s.title).replace(/\n/g, '<br>');
    document.getElementById('intro-sub').textContent = s.sub;
    document.getElementById('intro-dots').innerHTML = this.INTRO.map((_, i) => `<span class="${i === this._introIdx ? 'on' : ''}"></span>`).join('');
    const btn = document.getElementById('intro-next');
    btn.textContent = last ? '시작하기' : '다음';
    btn.onclick = () => { if (last) this.finishIntro(); else { this._introIdx++; this.renderIntro(); } };
  },

  finishIntro() {
    try { localStorage.setItem('kync_intro_seen', '1'); } catch (e) {}
    if (typeof KyncInstall !== 'undefined' && KyncInstall.shouldShow()) KyncInstall.show();
    else navigateTo('page-login');
  },

  /* ════════ 로그인 뒤 화면 정하기 ════════ */
  _basicDone(p) {
    if (!p.name) return false;
    return p.role === 'parent' ? !!p.adultConfirmed : !!p.birth;
  },
  _termsDone(p) {
    const a = p.agreements;
    return !!(a && a.version === KYNC_CONFIG.termsVersion && a.terms && a.privacy && a.transfer);
  },

  async route(user, profile) {
    this.profile = profile = profile || {};
    const role = profile.role;
    if (role !== 'parent' && role !== 'child') return navigateTo('page-role');
    localStorage.setItem('kync_role', role);
    if (!this._basicDone(profile)) return this.showProfile();
    if (!this._termsDone(profile)) return this.showTerms();
    if (!profile.familyCode) return showConnectPage(role);

    let fam;
    try { fam = await KyncDB.getFamily(profile.familyCode); }
    catch (e) { fam = undefined; console.warn('family load:', e); }

    // 가족 공간이 사라졌거나 내가 빠졌으면 연결 단계로
    if (fam === null || (fam && !fam.members?.[user.uid])) {
      await this._familyGone(true);
      return;
    }
    this.family = fam || null;
    if (role === 'child' && this.isMinor(profile) && fam && !fam.guardianConsents?.[user.uid]) {
      return this.showGuardianWait();
    }
    enterApp(role);
  },

  back(pageId) { navigateTo(pageId); },

  /* ════════ 기본 정보 ════════ */
  showProfile() {
    const p = this.profile, isChild = p.role === 'child';
    navigateTo('page-profile');
    const name = document.getElementById('pf-name');
    name.value = p.name || '';
    document.getElementById('pf-sub').textContent = isChild
      ? '부모님 화면에 보일 이름이에요.'
      : '자녀 화면에 보일 이름이에요.';
    document.getElementById('pf-birth-field').classList.toggle('hidden', !isChild);
    document.getElementById('pf-adult-field').classList.toggle('hidden', isChild);

    const yearSel = document.getElementById('pf-year'), monSel = document.getElementById('pf-month');
    if (!yearSel.options.length) {
      const cy = new Date().getFullYear();
      yearSel.innerHTML = '<option value="">연도</option>' +
        Array.from({ length: 36 }, (_, i) => cy - 5 - i).map(y => `<option value="${y}">${y}년</option>`).join('');
      monSel.innerHTML = '<option value="">월</option>' +
        Array.from({ length: 12 }, (_, i) => i + 1).map(m => `<option value="${String(m).padStart(2, '0')}">${m}월</option>`).join('');
    }
    const [by, bm] = (p.birth || '').split('-');
    yearSel.value = by || '';
    monSel.value = bm || '';
    document.getElementById('pf-adult').checked = !!p.adultConfirmed;

    const sync = () => {
      const birth = yearSel.value && monSel.value ? `${yearSel.value}-${monSel.value}` : '';
      const hint = document.getElementById('pf-birth-hint');
      const age = this.ageFromBirth(birth);
      if (age !== null && age < 14) {
        hint.textContent = '만 14세 미만이라 가족과 연결한 뒤 부모님 동의가 필요해요.';
        hint.classList.add('warn');
      } else {
        hint.textContent = '만 14세 미만인지 확인하는 데만 써요.';
        hint.classList.remove('warn');
      }
      const ok = name.value.trim().length > 0 && (isChild ? !!birth : document.getElementById('pf-adult').checked);
      document.getElementById('pf-next').disabled = !ok;
    };
    [name, yearSel, monSel, document.getElementById('pf-adult')].forEach(el => { el.oninput = sync; el.onchange = sync; });
    sync();
  },

  async saveProfile() {
    const user = KyncAuth.current;
    if (!user) return navigateTo('page-login');
    const p = this.profile, isChild = p.role === 'child';
    const name = document.getElementById('pf-name').value.trim().slice(0, 12);
    const data = { name };
    if (isChild) data.birth = `${document.getElementById('pf-year').value}-${document.getElementById('pf-month').value}`;
    else data.adultConfirmed = document.getElementById('pf-adult').checked;

    await KyncUI.busy(document.getElementById('pf-next'), '저장하는 중', async () => {
      try {
        await KyncDB.updateUser(user.uid, data);
        Object.assign(p, data);
        localStorage.setItem('kync_user_name', name);
        // 이미 가족과 연결돼 있으면 가족에게 보이는 이름·나이 표시도 맞춤
        if (p.familyCode) {
          const upd = { [`members.${user.uid}.name`]: name };
          if (isChild) upd[`members.${user.uid}.minor`] = this.isMinor(p);
          await KyncDB.updateFamily(p.familyCode, upd).catch(() => {});
        }
        await this.route(user, p);
      } catch (e) {
        toast('저장하지 못했어요. 다시 시도해주세요.', 'error');
      }
    });
  },

  /* ════════ 약관 동의 ════════ */
  showTerms() {
    navigateTo('page-terms');
    const prev = this.profile.agreements || {};
    const list = document.getElementById('agree-list');
    list.innerHTML = this.AGREE_ITEMS.map(it => `
      <div class="agree-row">
        <label class="check">
          <input type="checkbox" data-k="${it.key}" ${prev[it.key] ? 'checked' : ''}><span class="box">${ic('check', 16)}</span>
          <span class="txt"><span class="tag ${it.req ? 'req' : 'opt'}">${it.req ? '필수' : '선택'}</span>${it.label}</span>
        </label>
        <button type="button" class="view" onclick="KyncAccount.openLegal('${it.key}')">보기</button>
      </div>`).join('');
    document.getElementById('terms-minor-note').classList.toggle('hidden', !this.isMinor(this.profile));

    const all = document.getElementById('ag-all');
    const boxes = [...list.querySelectorAll('input[data-k]')];
    const sync = () => {
      all.checked = boxes.every(b => b.checked);
      const reqOk = this.AGREE_ITEMS.filter(i => i.req).every(i => list.querySelector(`[data-k="${i.key}"]`).checked);
      document.getElementById('terms-next').disabled = !reqOk;
    };
    all.onchange = () => { boxes.forEach(b => (b.checked = all.checked)); sync(); };
    boxes.forEach(b => (b.onchange = sync));
    sync();
  },

  async saveTerms() {
    const user = KyncAuth.current;
    if (!user) return navigateTo('page-login');
    const pick = k => !!document.querySelector(`#agree-list [data-k="${k}"]`)?.checked;
    const agreements = {
      version: KYNC_CONFIG.termsVersion,
      terms: true, privacy: true, transfer: true,
      ai: pick('ai'), marketing: pick('marketing'),
      at: firebase.firestore.FieldValue.serverTimestamp(),
      atClient: new Date().toISOString(),
    };
    await KyncUI.busy(document.getElementById('terms-next'), '저장하는 중', async () => {
      try {
        await KyncDB.updateUser(user.uid, { agreements });
        this.profile.agreements = { ...agreements, at: null };
        await this.route(user, this.profile);
      } catch (e) {
        toast('저장하지 못했어요. 다시 시도해주세요.', 'error');
      }
    });
  },

  openLegal(key) {
    const doc = KYNC_LEGAL[key];
    if (!doc) return;
    document.getElementById('legal-title').textContent = doc.title;
    document.getElementById('legal-body').innerHTML = doc.body;
    document.getElementById('legal-meta').textContent = `시행일 ${KYNC_CONFIG.termsVersion.replace(/-/g, '. ')}. · 정식 출시 전 검토 중인 초안이에요.`;
    KyncUI.openLayer('layer-legal');
  },

  /* ════════ 보호자 동의 (자녀 쪽: 기다리기) ════════ */
  showGuardianWait() {
    navigateTo('page-guardian-wait');
    this._stopWait();
    const fc = this.profile.familyCode, uid = this.uid();
    if (!fc) return;
    this._waitUnsub = db.collection('families').doc(fc).onSnapshot(snap => {
      if (!snap.exists) { this._stopWait(); this._familyGone(); return; }
      const fam = snap.data();
      if (fam.guardianConsents?.[uid]) {
        this._stopWait();
        this.family = fam;
        toast('부모님이 동의했어요. 이제 시작해요!', 'ok');
        enterApp('child');
      }
    }, e => console.warn('guardian wait:', e));
  },
  _stopWait() { if (this._waitUnsub) { this._waitUnsub(); this._waitUnsub = null; } },

  async recheck() {
    const user = KyncAuth.current;
    if (!user) return;
    showLoader(true);
    try { await this.route(user, await KyncDB.getUser(user.uid)); }
    finally { showLoader(false); }
  },

  /* ════════ 앱에 들어간 뒤: 가족 상태 지켜보기 ════════ */
  onEnterApp(role) {
    this._stopWait();
    if (this._famUnsub) { this._famUnsub(); this._famUnsub = null; }
    const fc = localStorage.getItem('kync_family_code');
    const uid = this.uid();
    if (!fc || !uid) return;
    this._famUnsub = db.collection('families').doc(fc).onSnapshot(snap => {
      if (!snap.exists || !snap.data().members?.[uid]) { this._familyGone(); return; }
      this.family = snap.data();
      if (role === 'parent') this.renderConsentBanner();
      if (typeof KyncInbox !== 'undefined') KyncInbox.refresh();
      if (role === 'child' && this.isMinor(this.profile) && !this.family.guardianConsents?.[uid]) {
        if (this._famUnsub) { this._famUnsub(); this._famUnsub = null; }
        this.showGuardianWait();
        return;
      }
      if (typeof KyncCounsel !== 'undefined') KyncCounsel.render();
    }, e => console.warn('family watch:', e));
  },

  // 가족 공간이 사라졌을 때 (상대가 탈퇴했거나 연결을 끊음)
  async _familyGone(silent) {
    if (this._famUnsub) { this._famUnsub(); this._famUnsub = null; }
    const uid = this.uid();
    try { if (uid) await KyncDB.updateUser(uid, { familyCode: firebase.firestore.FieldValue.delete() }); } catch (e) {}
    localStorage.removeItem('kync_family_code');
    if (this.profile) this.profile.familyCode = null;
    this.family = null;
    KyncUI.closeLayer('layer-settings');
    if (typeof App !== 'undefined') App.reset?.();
    await showConnectPage(this.profile?.role || localStorage.getItem('kync_role'));
    KyncUI.alert('가족 연결이 끊겨서 함께 쓴 기록이 정리됐어요. 다시 연결하면 새로 시작할 수 있어요.', '가족 연결이 끊겼어요');
  },

  pendingMinors() {
    const fam = this.family;
    if (!fam) return [];
    return Object.entries(fam.members || {})
      .map(([uid, m]) => ({ uid, ...m }))
      .filter(m => m.role === 'child' && m.minor && !fam.guardianConsents?.[m.uid]);
  },
  minorChildren() {
    const fam = this.family;
    if (!fam) return [];
    return Object.entries(fam.members || {}).map(([uid, m]) => ({ uid, ...m })).filter(m => m.role === 'child' && m.minor);
  },

  renderConsentBanner() {
    const el = document.getElementById('p-consent-banner');
    if (!el) return;
    const pending = this.pendingMinors();
    el.innerHTML = pending.map(c => `
      <button class="consent-banner" onclick="KyncAccount.openGuardian('${c.uid}')">
        ${ic('shield', 24)}
        <span><b>${this.esc(c.name || '자녀')}의 보호자 동의가 필요해요</b><small>동의해야 자녀가 앱을 쓸 수 있어요</small></span>
        <span class="chev">${ic('chev', 18)}</span>
      </button>`).join('');
    // 처음 발견했을 때 한 번은 바로 열어줌
    const first = pending.find(c => !this._consentPrompted[c.uid]);
    if (first) { this._consentPrompted[first.uid] = true; setTimeout(() => this.openGuardian(first.uid), 400); }
  },

  /* ════════ 보호자 동의 (부모 쪽: 동의하기) ════════ */
  openGuardian(childUid) {
    const child = this.family?.members?.[childUid];
    if (!child) return;
    const name = this.esc(child.name || '자녀');
    const body = document.getElementById('guardian-body');
    body.innerHTML = `
      <div class="center" style="margin:8px 0 6px">${KyncBrand.mascot('default', 96)}</div>
      <h2 class="center">${name}의 보호자 동의</h2>
      <p class="screen-sub center" style="margin:6px 0 20px">${name}은(는) 만 14세 미만이라<br>보호자(법정대리인)가 동의해야 Kync를 쓸 수 있어요.</p>
      <div class="card tight">
        <div class="agree-row">
          <label class="check"><input type="checkbox" data-g="consent"><span class="box">${ic('check', 16)}</span>
            <span class="txt"><span class="tag req">필수</span>${name}의 법정대리인으로서 자녀의 개인정보 수집·이용에 동의해요</span></label>
          <button type="button" class="view" onclick="KyncAccount.openLegal('guardian')">보기</button>
        </div>
        <div class="agree-row">
          <label class="check"><input type="checkbox" data-g="transfer"><span class="box">${ic('check', 16)}</span>
            <span class="txt"><span class="tag req">필수</span>자녀 개인정보의 국외 이전에 동의해요</span></label>
          <button type="button" class="view" onclick="KyncAccount.openLegal('transfer')">보기</button>
        </div>
        <div class="agree-row">
          <label class="check"><input type="checkbox" data-g="ai"><span class="box">${ic('check', 16)}</span>
            <span class="txt"><span class="tag opt">선택</span>자녀가 AI 상담을 쓰는 것을 허용해요</span></label>
          <button type="button" class="view" onclick="KyncAccount.openLegal('ai')">보기</button>
        </div>
      </div>
      <p class="hint" style="margin-top:14px">동의하지 않으면 ${name}은(는) 앱을 쓸 수 없어요. 설정에서 가족 연결을 끊을 수 있어요.</p>`;
    const submit = document.getElementById('guardian-submit');
    const boxes = [...body.querySelectorAll('[data-g]')];
    const sync = () => { submit.disabled = !(body.querySelector('[data-g="consent"]').checked && body.querySelector('[data-g="transfer"]').checked); };
    boxes.forEach(b => (b.onchange = sync));
    sync();
    submit.onclick = () => KyncUI.busy(submit, '저장하는 중', async () => {
      try {
        await KyncDB.updateFamily(this.profile.familyCode, {
          [`guardianConsents.${childUid}`]: {
            by: this.uid(), byName: this.profile.name || '',
            ai: body.querySelector('[data-g="ai"]').checked,
            at: firebase.firestore.FieldValue.serverTimestamp(),
            version: KYNC_CONFIG.termsVersion,
          }
        });
        KyncUI.closeLayer('layer-guardian');
        toast(`동의했어요. 이제 ${child.name || '자녀'}도 시작할 수 있어요`, 'ok');
      } catch (e) {
        toast('저장하지 못했어요. 다시 시도해주세요.', 'error');
      }
    });
    KyncUI.openLayer('layer-guardian');
  },

  /* ════════ AI 상담을 쓸 수 있는지 ════════ */
  aiStatus() {
    const p = this.profile || {};
    if (!p.agreements?.ai) return 'consent';
    if (this.isMinor(p) && !this.family?.guardianConsents?.[this.uid()]?.ai) return 'guardian';
    return 'ok';
  },

  async setAgreement(key, on) {
    const user = KyncAuth.current;
    if (!user) return false;
    if (key === 'ai' && on) {
      const ok = await KyncUI.confirm({
        title: 'AI 상담에 동의할까요?',
        message: '상담 메시지와 대화 유형 결과, 최근 7일 감정 기록이 답변을 만들기 위해 미국의 Anthropic으로 전송돼요.',
        ok: '동의하기',
      });
      if (!ok) return false;
    }
    try {
      await KyncDB.updateUser(user.uid, { [`agreements.${key}`]: on, [`agreements.${key}At`]: new Date().toISOString() });
      this.profile.agreements = { ...(this.profile.agreements || {}), [key]: on };
      toast(on ? '동의했어요' : '동의를 껐어요', 'ok');
      if (key === 'ai' && typeof KyncCounsel !== 'undefined') KyncCounsel.render();
      return true;
    } catch (e) {
      toast('바꾸지 못했어요. 다시 시도해주세요.', 'error');
      return false;
    }
  },

  async setChildAi(childUid, on) {
    try {
      await KyncDB.updateFamily(this.profile.familyCode, { [`guardianConsents.${childUid}.ai`]: on });
      toast(on ? 'AI 상담을 허용했어요' : 'AI 상담 허용을 껐어요', 'ok');
      return true;
    } catch (e) {
      toast('바꾸지 못했어요. 다시 시도해주세요.', 'error');
      return false;
    }
  },

  /* ════════ 설정 ════════ */
  openSettings() {
    this.renderSettings();
    KyncUI.openLayer('layer-settings');
  },

  _row({ icon, label, val, sub, onclick, href, danger, chev = true, right }) {
    const inner = `${icon ? ic(icon, 22) : ''}<span class="row-text">${label}${sub ? `<small>${sub}</small>` : ''}</span>` +
      (val ? `<span class="val">${val}</span>` : '') + (right || '') + (chev && !right ? `<span class="chev">${ic('chev', 18)}</span>` : '');
    if (href) return `<a class="list-row ${danger ? 'danger' : ''}" href="${href}">${inner}</a>`;
    if (onclick) return `<button class="list-row ${danger ? 'danger' : ''}" onclick="${onclick}">${inner}</button>`;
    return `<div class="list-row">${inner}</div>`;
  },
  _switch(id, on, handler) {
    return `<label class="switch"><input type="checkbox" id="${id}" ${on ? 'checked' : ''} onchange="${handler}" aria-label="켜기"><span class="track"></span></label>`;
  },

  renderSettings() {
    const p = this.profile || {}, user = KyncAuth.current;
    const role = p.role, a = p.agreements || {};
    const fc = p.familyCode || localStorage.getItem('kync_family_code');
    const members = Object.entries(this.family?.members || {}).map(([uid, m]) => ({ uid, ...m })).filter(m => m.uid !== this.uid());
    const minors = role === 'parent' ? this.minorChildren() : [];
    const roleLabel = role === 'parent' ? '부모' : '자녀';
    const age = role === 'child' ? this.ageFromBirth(p.birth) : null;

    const childAiRows = minors.map(c => {
      const consent = this.family?.guardianConsents?.[c.uid];
      if (!consent) return this._row({ icon: 'shield', label: `${this.esc(c.name || '자녀')} 보호자 동의`, sub: '아직 동의하지 않았어요', onclick: `KyncAccount.openGuardian('${c.uid}')` });
      return this._row({ icon: 'chat', label: `${this.esc(c.name || '자녀')} AI 상담 허용`, sub: '만 14세 미만 자녀는 보호자 허용이 필요해요', chev: false,
        right: this._switch(`sw-child-ai-${c.uid}`, !!consent.ai, `KyncAccount.setChildAi('${c.uid}', this.checked).then(ok=>{ if(!ok) this.checked=!this.checked })`) });
    }).join('');

    document.getElementById('settings-body').innerHTML = `
      <button class="me-head" onclick="KyncAccount.editName()">
        ${KyncUI.avatar(this.uid(), role, 'lg')}
        <span><b>${this.esc(p.name || '이름 없음')}</b><small>${roleLabel}${age !== null ? ` · 만 ${age}세` : ''} · ${this.esc(user?.email || '')}</small></span>
        <span class="chev">${ic('edit', 20)}</span>
      </button>

      <div class="list-title">가족</div>
      <div class="list">
        ${this._row({ icon: 'users', label: '연결된 가족', val: members.length ? members.map(m => this.esc(m.name || '이름 없음')).join(', ') : '아직 없어요', chev: false })}
        ${fc ? this._row({ icon: 'copy', label: '가족 연결 코드', val: this.esc(fc), onclick: 'App.copyCode()', chev: false }) : ''}
        ${fc ? this._row({ icon: 'link', label: '가족 연결 끊기', onclick: 'KyncAccount.disconnectFamily()', danger: true }) : ''}
      </div>

      <div class="list-title">동의 관리</div>
      <div class="list">
        ${this._row({ icon: 'chat', label: 'AI 상담 이용', sub: '상담 메시지가 미국 Anthropic으로 전송돼요', chev: false,
          right: this._switch('sw-ai', !!a.ai, `KyncAccount.setAgreement('ai', this.checked).then(ok=>{ if(!ok) this.checked=!this.checked })`) })}
        ${this._row({ icon: 'bell', label: '이벤트·소식 알림', chev: false,
          right: this._switch('sw-mkt', !!a.marketing, `KyncAccount.setAgreement('marketing', this.checked).then(ok=>{ if(!ok) this.checked=!this.checked })`) })}
        ${childAiRows}
        ${this._row({ icon: 'trash', label: 'AI 상담 기록 지우기', onclick: 'KyncAccount.clearCounsel()' })}
      </div>

      <div class="list-title">약관 및 정책</div>
      <div class="list">
        ${this._row({ icon: 'doc', label: '서비스 이용약관', onclick: "KyncAccount.openLegal('terms')" })}
        ${this._row({ icon: 'shield', label: '개인정보 수집·이용', onclick: "KyncAccount.openLegal('privacy')" })}
        ${this._row({ icon: 'doc', label: '개인정보 국외 이전', onclick: "KyncAccount.openLegal('transfer')" })}
        ${this._row({ icon: 'chat', label: 'AI 상담 이용 안내', onclick: "KyncAccount.openLegal('ai')" })}
        ${minors.length || this.isMinor(p) ? this._row({ icon: 'shield', label: '법정대리인 동의 안내', onclick: "KyncAccount.openLegal('guardian')" }) : ''}
      </div>

      <div class="list-title">도움</div>
      <div class="list">
        ${this._row({ icon: 'mail', label: '문의하기', val: KYNC_CONFIG.contactEmail, href: `mailto:${KYNC_CONFIG.contactEmail}?subject=${encodeURIComponent('[Kync 문의]')}`, chev: false })}
        ${KyncInstall.isStandalone() ? '' : this._row({ icon: 'phone', label: '홈 화면에 추가하기', onclick: 'KyncInstall.openSheet()' })}
        ${this._row({ icon: 'download', label: '내 정보 내려받기', sub: '내 계정과 가족 기록을 파일로 저장해요', onclick: 'KyncAccount.exportData()' })}
        ${this._row({ icon: 'doc', label: '오픈소스 라이선스', onclick: "KyncAccount.openLegal('oss')" })}
        ${this._row({ icon: 'info', label: '앱 버전', val: KYNC_CONFIG.version, chev: false })}
      </div>

      <div class="list" style="margin-top:22px">
        ${this._row({ icon: 'logout', label: '로그아웃', onclick: 'logout()', chev: false })}
      </div>

      <div class="settings-foot"><button class="link-btn" onclick="KyncAccount.openDelete()">탈퇴하기</button></div>`;
  },

  editName() {
    const p = this.profile || {};
    let color = KyncUI.avatarColor(this.uid(), p.role);
    const { el, close } = KyncUI.sheet(`
      <h2>프로필 바꾸기</h2>
      <p class="sheet-sub">가족 화면에 보이는 이름과 색이에요.</p>
      <div class="field"><label class="label" for="edit-name">이름</label>
        <input class="input" id="edit-name" maxlength="12" value="${this.esc(p.name || '')}"></div>
      <div class="field" style="margin-top:16px"><span class="label">프로필 색</span>
        <div class="color-row" role="radiogroup" aria-label="프로필 색">
          ${KyncUI.COLORS.map(c => `<button class="color-opt ${c === color ? 'on' : ''}" data-c="${c}" style="background:${c}" role="radio" aria-checked="${c === color}" aria-label="색 ${c}">${c === color ? ic('check', 20) : ''}</button>`).join('')}
        </div></div>
      <button class="btn btn-primary btn-block" id="edit-name-save" style="margin-top:20px">저장</button>`);
    el.querySelectorAll('.color-opt').forEach(b => b.onclick = () => {
      color = b.dataset.c;
      el.querySelectorAll('.color-opt').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); x.innerHTML = on ? ic('check', 20) : ''; });
    });
    el.querySelector('#edit-name-save').onclick = e => KyncUI.busy(e.currentTarget, '저장하는 중', async () => {
      const name = el.querySelector('#edit-name').value.trim().slice(0, 12);
      if (!name) { toast('이름을 입력해주세요.', 'error'); return; }
      try {
        await KyncDB.updateUser(this.uid(), { name, color });
        if (p.familyCode) await KyncDB.updateFamily(p.familyCode, { [`members.${this.uid()}.name`]: name, [`members.${this.uid()}.color`]: color }).catch(() => {});
        Object.assign(p, { name, color });
        localStorage.setItem('kync_user_name', name);
        close();
        this.renderSettings();
        App._setDates?.();
        App.renderFamilyInfo?.();
        toast('프로필을 바꿨어요', 'ok');
      } catch (err) { toast('저장하지 못했어요. 다시 시도해주세요.', 'error'); }
    });
  },

  // 내 정보 내려받기 (개인정보 열람권)
  async exportData() {
    const uid = this.uid(), fc = this.profile?.familyCode || localStorage.getItem('kync_family_code');
    if (!uid) return;
    showLoader(true, '파일을 만드는 중이에요');
    try {
      const plain = v => JSON.parse(JSON.stringify(v, (k, x) => (x && typeof x.toDate === 'function') ? x.toDate().toISOString() : x));
      const out = { exportedAt: new Date().toISOString(), app: 'Kync ' + KYNC_CONFIG.version };
      out.account = plain((await db.collection('users').doc(uid).get()).data() || {});
      out.account.email = KyncAuth.current?.email || out.account.email;
      const counsel = await db.collection('users').doc(uid).collection('counsel').get();
      out.aiCounsel = counsel.docs.map(d => plain({ day: d.id, ...d.data() }));
      if (fc) {
        const famRef = db.collection('families').doc(fc);
        out.family = { code: fc, ...plain((await famRef.get()).data() || {}) };
        for (const sub of FAMILY_SUBCOLLECTIONS) {
          const snap = await famRef.collection(sub).get();
          if (!snap.empty) out.family[sub] = snap.docs.map(d => plain({ id: d.id, ...d.data() }));
        }
      }
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `kync-내정보-${todayKey()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast('내 정보를 파일로 저장했어요', 'ok');
    } catch (e) {
      console.warn('export:', e);
      toast('파일을 만들지 못했어요. 다시 시도해주세요.', 'error');
    } finally { showLoader(false); }
  },

  async clearCounsel() {
    const ok = await KyncUI.confirm({ title: 'AI 상담 기록을 지울까요?', message: '지금까지의 상담 내용이 모두 삭제돼요. 되돌릴 수 없어요.', ok: '지우기', danger: true });
    if (!ok) return;
    showLoader(true);
    try {
      await KyncDB.deleteCounsel(this.uid());
      if (typeof KyncCounsel !== 'undefined') { KyncCounsel._items = []; KyncCounsel.render(); }
      toast('AI 상담 기록을 지웠어요', 'ok');
    } catch (e) { toast('지우지 못했어요. 다시 시도해주세요.', 'error'); }
    finally { showLoader(false); }
  },

  async disconnectFamily() {
    const other = this.profile?.role === 'parent' ? '자녀' : '부모님';
    const ok = await KyncUI.confirm({
      title: '가족 연결을 끊을까요?',
      message: `함께 쓴 답변, 감정 기록, 사진, 칭찬 카드, 활동·퀘스트 기록이 모두 삭제돼요. ${other}도 더 이상 볼 수 없고, 되돌릴 수 없어요.`,
      ok: '연결 끊기', danger: true,
    });
    if (!ok) return;
    const fc = this.profile?.familyCode || localStorage.getItem('kync_family_code');
    showLoader(true, '기록을 정리하는 중이에요');
    try {
      if (this._famUnsub) { this._famUnsub(); this._famUnsub = null; }
      await KyncDB.deleteFamilySpace(fc);
      await KyncDB.updateUser(this.uid(), { familyCode: firebase.firestore.FieldValue.delete() });
      localStorage.removeItem('kync_family_code');
      this.profile.familyCode = null;
      this.family = null;
      KyncUI.closeLayer('layer-settings');
      App.reset?.();
      await showConnectPage(this.profile.role);
      toast('가족 연결을 끊었어요', 'ok');
    } catch (e) {
      console.warn('disconnect:', e);
      toast('연결을 끊지 못했어요. 다시 시도해주세요.', 'error');
    } finally { showLoader(false); }
  },

  /* ════════ 탈퇴 ════════ */
  openDelete() {
    const user = KyncAuth.current;
    const isPassword = user?.providerData?.some(p => p.providerId === 'password') && !user?.providerData?.some(p => p.providerId === 'google.com');
    const other = this.profile?.role === 'parent' ? '자녀' : '부모님';
    document.getElementById('delete-body').innerHTML = `
      <div class="center" style="margin:8px 0 4px">${KyncBrand.mascot('sleepy', 96)}</div>
      <h2 class="center">탈퇴하기 전에 확인해주세요</h2>
      <ul class="del-list">
        <li>${ic('x', 18)}<span>계정 정보, 대화 유형 검사 결과, AI 상담 기록이 모두 삭제돼요.</span></li>
        <li>${ic('x', 18)}<span>가족 공간이 사라지고, 함께 쓴 답변·감정 기록·사진·칭찬 카드·퀘스트도 모두 삭제돼요. ${other}도 더 이상 볼 수 없어요.</span></li>
        <li>${ic('x', 18)}<span>삭제한 정보는 되돌릴 수 없어요.</span></li>
      </ul>
      ${isPassword ? `<div class="field" style="margin-bottom:8px"><label class="label" for="del-pw">본인 확인을 위해 비밀번호를 입력해주세요</label>
        <input class="input" id="del-pw" type="password" autocomplete="current-password"></div>` :
        `<p class="hint" style="margin-bottom:8px">본인 확인을 위해 Google 로그인 창이 한 번 더 열려요.</p>`}
      <label class="check"><input type="checkbox" id="del-ok"><span class="box">${ic('check', 16)}</span><span class="txt">위 내용을 모두 확인했어요</span></label>`;
    const submit = document.getElementById('delete-submit');
    const okBox = document.getElementById('del-ok');
    const pw = document.getElementById('del-pw');
    const sync = () => { submit.disabled = !okBox.checked || (pw && !pw.value); };
    okBox.onchange = sync;
    if (pw) pw.oninput = sync;
    sync();
    submit.onclick = () => this.deleteAccount(isPassword ? () => pw.value : null);
    KyncUI.openLayer('layer-delete');
  },

  async deleteAccount(getPassword) {
    const user = KyncAuth.current;
    if (!user) return;
    const submit = document.getElementById('delete-submit');
    submit.disabled = true;

    // 1. 본인 확인 (계정 삭제는 최근 로그인이 필요해요)
    try {
      if (getPassword) {
        const cred = firebase.auth.EmailAuthProvider.credential(user.email, getPassword());
        await user.reauthenticateWithCredential(cred);
      } else {
        await user.reauthenticateWithPopup(new firebase.auth.GoogleAuthProvider());
      }
    } catch (e) {
      submit.disabled = false;
      if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
      toast(authErrorMessage(e), 'error');
      return;
    }

    // 2. 기록 삭제 → 3. 계정 삭제
    showLoader(true, '기록을 지우는 중이에요');
    try {
      if (this._famUnsub) { this._famUnsub(); this._famUnsub = null; }
      const fc = this.profile?.familyCode || localStorage.getItem('kync_family_code');
      if (fc) await KyncDB.deleteFamilySpace(fc).catch(e => { if (e?.code !== 'not-found') throw e; });
      await KyncDB.deleteUserData(user.uid);
      await user.delete();
      clearAllLocalData();
      this.reset();
      App.reset?.();
      ['layer-delete', 'layer-settings'].forEach(id => KyncUI.closeLayer(id));
      navigateTo('page-login');
      KyncUI.confirm({ title: '탈퇴했어요', message: '그동안 Kync를 써줘서 고마워요.', cancel: null, mascot: 'sleepy' });
    } catch (e) {
      console.warn('delete account:', e);
      toast('탈퇴하지 못했어요. 인터넷 연결을 확인하고 다시 시도해주세요.', 'error');
      submit.disabled = false;
    } finally {
      showLoader(false);
    }
  },

  reset() {
    this._stopWait();
    if (this._famUnsub) { this._famUnsub(); this._famUnsub = null; }
    this.profile = null;
    this.family = null;
    this._consentPrompted = {};
    ['layer-settings', 'layer-guardian', 'layer-delete', 'layer-legal', 'layer-inbox'].forEach(id => KyncUI.closeLayer(id));
  },
};

window.KyncAccount = KyncAccount;
