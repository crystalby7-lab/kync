/* ════════════════════════════════════════════════════════════════
   firebase-system.js — Kync Firebase 초기화, 로그인, 데이터 레이어
   로그인 뒤 어느 화면으로 갈지는 kync-account.js의 KyncAccount.route()가 정해요.
════════════════════════════════════════════════════════════════ */

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDZ4HFyDhUqCRnydxe6UTWqCpY7fTAgXj8",
  authDomain:        "kync-app-191a2.firebaseapp.com",
  projectId:         "kync-app-191a2",
  storageBucket:     "kync-app-191a2.firebasestorage.app",
  messagingSenderId: "84542581161",
  appId:             "1:84542581161:web:58a94a600d84901dd2bcb8"
};

firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db   = firebase.firestore();

// 첫 로그인 상태 확인이 끝났을 때 풀리는 약속 (로그인 전에 DB 읽다 실패하는 문제 방지)
const _authReady = new Promise(resolve => {
  const off = auth.onAuthStateChanged(u => { off(); resolve(u); });
});

// 계정별로 기기에 저장되는 값 — 계정이 바뀌거나 로그아웃하면 비움
const ACCOUNT_KEYS = [
  'kync_role', 'kync_family_code', 'kync_user_name', 'kync_user_uid',
  'kync_points', 'kync_quiz_result', 'kync_join_date', 'kync_diary_entries'
];
function clearAccountCache() {
  ACCOUNT_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch(e) {} });
}
// 탈퇴할 때: 이 기기에 남은 Kync 기록을 모두 지움 (처음 소개를 봤다는 표시만 남김)
function clearAllLocalData() {
  try {
    Object.keys(localStorage).filter(k => k.startsWith('kync_') && k !== 'kync_intro_seen')
      .forEach(k => localStorage.removeItem(k));
  } catch(e) {}
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// 한국 시간 기준 '오늘 몇 번째 날' (자정에 바뀜) — 오늘의 질문 등 날짜별 선택에 사용
function localDayNum(d = new Date()) {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

function generateFamilyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = 'KY';
  for (let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

function showLoader(on, text) {
  if (typeof KyncUI !== 'undefined') KyncUI.loader(on, text);
}
function toast(msg, type) {
  if (typeof KyncUI !== 'undefined') KyncUI.toast(msg, type);
}

function navigateTo(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === pageId));
  const el = document.getElementById(pageId);
  const scroller = el?.querySelector('.screen');
  if (scroller) scroller.scrollTop = 0;
}

/* ════════════════════════════════════════
   KyncAuth — 인증
════════════════════════════════════════ */
const KyncAuth = {
  async signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    // 홈 화면에 추가한 앱(특히 아이폰)은 팝업이 안 열려서 페이지 이동 방식으로 로그인
    if (typeof KyncInstall !== 'undefined' && KyncInstall.isStandalone()) {
      await auth.signInWithRedirect(provider);
      return null;
    }
    try {
      const { user } = await auth.signInWithPopup(provider);
      return user;
    } catch (e) {
      if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(e.code)) {
        await auth.signInWithRedirect(provider);
        return null;
      }
      throw e;
    }
  },
  async signInWithEmail(email, password) {
    const { user } = await auth.signInWithEmailAndPassword(email, password);
    return user;
  },
  async signUpWithEmail(email, password) {
    const { user } = await auth.createUserWithEmailAndPassword(email, password);
    return user;
  },
  async resetPassword(email) {
    await auth.sendPasswordResetEmail(email);
  },
  async signOut() {
    await auth.signOut();
    clearAccountCache(); // 다음 계정에 이전 계정 정보가 섞이지 않게
    navigateTo('page-login');
  },
  ready() { return _authReady; },
  onAuthChange(cb) { return auth.onAuthStateChanged(cb); },
  get current() { return auth.currentUser; }
};

/* ── 중복 처리 방지 ── */
let _authProcessing = false;
let _lastProcessedUid = null;

/* ── Firebase 인증 에러 → 한국어 메시지 ── */
function authErrorMessage(e) {
  const map = {
    'auth/invalid-email':          '이메일 형식이 올바르지 않아요.',
    'auth/user-not-found':         '가입되지 않은 이메일이에요. 회원가입을 먼저 해주세요.',
    'auth/wrong-password':         '이메일 또는 비밀번호가 맞지 않아요.',
    'auth/invalid-credential':     '이메일 또는 비밀번호가 맞지 않아요.',
    'auth/invalid-login-credentials': '이메일 또는 비밀번호가 맞지 않아요.',
    'auth/email-already-in-use':   '이미 가입된 이메일이에요. 로그인해주세요.',
    'auth/weak-password':          '비밀번호는 6자 이상이어야 해요.',
    'auth/too-many-requests':      '시도가 너무 많아요. 잠시 후 다시 시도해주세요.',
    'auth/network-request-failed': '인터넷 연결을 확인해주세요.',
    'auth/popup-blocked':          '팝업이 막혀 있어요. 브라우저에서 팝업을 허용해주세요.',
    'auth/requires-recent-login':  '보안을 위해 다시 로그인한 뒤 시도해주세요.',
    'auth/user-mismatch':          '지금 로그인한 계정으로 확인해주세요.',
    'auth/operation-not-supported-in-this-environment': '여기서는 Google 창을 열 수 없어요. 사파리나 크롬에서 열어 다시 시도해주세요.',
    'auth/unauthorized-domain':    '이 주소에서는 로그인할 수 없어요. 운영자에게 알려주세요.',
    'permission-denied':           '권한이 없어요 (Firebase 보안 규칙).',
  };
  return map[e?.code] || e?.message || '문제가 생겼어요. 다시 시도해주세요.';
}

async function handleAuthSuccess(user) {
  if (_authProcessing) return;
  if (_lastProcessedUid === user.uid) return;
  _authProcessing = true;

  showLoader(true);
  try {
    let profile = await KyncDB.getUser(user.uid);

    if (!profile) {
      profile = {
        uid:      user.uid,
        name:     user.displayName || '',
        email:    user.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await KyncDB.setUser(user.uid, profile);
    }

    // 같은 기기에서 다른 계정으로 로그인하면 이전 계정 값 비우기
    const prevUid = localStorage.getItem('kync_user_uid');
    if (prevUid && prevUid !== user.uid) clearAccountCache();

    // 대화유형 결과는 서버 값을 기준으로 맞춤
    if (profile.quizResult) localStorage.setItem('kync_quiz_result', JSON.stringify(profile.quizResult));
    else localStorage.removeItem('kync_quiz_result');

    localStorage.setItem('kync_user_name', profile.name || '');
    localStorage.setItem('kync_user_uid',  user.uid);
    // 다른 계정에서 남은 가족 코드가 섞이지 않도록 DB 기준으로 맞춤
    if (profile.familyCode) localStorage.setItem('kync_family_code', profile.familyCode);
    else localStorage.removeItem('kync_family_code');
    if (profile.role) localStorage.setItem('kync_role', profile.role);

    _lastProcessedUid = user.uid;
    await KyncAccount.route(user, profile);
  } catch(e) {
    console.error('handleAuthSuccess error:', e);
    _lastProcessedUid = null;
    showLoader(false);
    // 로그인은 됐는데 정보를 못 불러온 경우: 다시 시도 화면
    const off = !navigator.onLine;
    const denied = e?.code === 'permission-denied';
    document.getElementById('error-title').textContent = off ? '인터넷 연결이 끊겼어요' : '정보를 불러오지 못했어요';
    document.getElementById('error-sub').textContent = off ? '연결되면 다시 시도해주세요.'
      : denied ? `데이터를 읽을 권한이 없어요 (Firebase 보안 규칙). ${KYNC_CONFIG.contactEmail}로 알려주세요.`
      : `잠시 후 다시 시도해주세요. 계속 안 되면 ${KYNC_CONFIG.contactEmail}로 알려주세요. (${e?.code || e?.message || '알 수 없는 오류'})`;
    navigateTo('page-error');
  } finally {
    showLoader(false);
    _authProcessing = false;
  }
}

/* ── 역할 설정 ── */
window.setUserRole = async function(role) {
  const user = auth.currentUser;
  if (!user) { navigateTo('page-login'); return; }

  showLoader(true);
  try {
    // 역할이 바뀌면 자녀 출생 연월·부모 확인을 다시 받음
    const prev = KyncAccount.profile?.role;
    const data = { role };
    if (prev && prev !== role) { data.birth = firebase.firestore.FieldValue.delete(); data.adultConfirmed = false; }
    await KyncDB.updateUser(user.uid, data);
    localStorage.setItem('kync_role', role);
    const profile = await KyncDB.getUser(user.uid);
    await KyncAccount.route(user, profile);
  } catch(e) {
    toast('역할을 저장하지 못했어요. 다시 시도해주세요.', 'error');
  } finally {
    showLoader(false);
  }
};

/* ════════════════════════════════════════
   가족 연결 (필수 단계)
   - 부모: 코드 자동 생성 → 자녀 합류를 실시간으로 기다림
   - 자녀: 부모에게 받은 코드를 입력해야 앱으로 들어갈 수 있음
════════════════════════════════════════ */
let _connectUnsub = null;

function stopConnectWatch() {
  if (_connectUnsub) { _connectUnsub(); _connectUnsub = null; }
}

function enterApp(role) {
  stopConnectWatch();
  navigateTo('page-' + role);
  const tab = window._returnTab;
  window._returnTab = null;
  if (tab && typeof selectTab === 'function') selectTab(tab);
  if (typeof App !== 'undefined' && typeof App.init === 'function') {
    Promise.resolve(App.init()).catch(e => console.error('App.init', e));
  }
  KyncAccount.onEnterApp(role);
}

async function showConnectPage(role) {
  navigateTo('page-connect');
  document.getElementById('connect-parent').classList.toggle('hidden', role !== 'parent');
  document.getElementById('connect-child').classList.toggle('hidden', role !== 'child');
  if (role === 'parent') await prepareParentCode();
  else {
    const input = document.getElementById('connect-code-input');
    if (input) input.value = '';
  }
}

function setConnectStatus(text, ok) {
  const el = document.getElementById('connect-status');
  if (!el) return;
  el.classList.toggle('ok', !!ok);
  el.innerHTML = `${ok ? ic('checkCircle', 18) : '<span class="pulse"></span>'}<span>${KyncUI.esc(text)}</span>`;
}

async function prepareParentCode() {
  const user = auth.currentUser;
  const codeEl  = document.getElementById('connect-code');
  const retryBtn = document.getElementById('connect-retry');
  if (!user) { navigateTo('page-login'); return; }

  codeEl.textContent = '——————';
  setConnectStatus('코드를 만드는 중이에요');
  retryBtn.classList.add('hidden');
  try {
    // 이미 만든 가족이 있으면 새로 만들지 않고 그대로 사용
    const fresh = await KyncDB.getUser(user.uid);
    let code = fresh?.familyCode;
    if (!code) code = await KyncDB.createFamily(user.uid, fresh?.name || '부모', 'parent');
    if (KyncAccount.profile) KyncAccount.profile.familyCode = code;
    localStorage.setItem('kync_family_code', code);
    codeEl.textContent = code;
    watchChildJoin(code);
  } catch (e) {
    console.error('가족 코드 생성 실패:', e);
    codeEl.textContent = '——————';
    setConnectStatus('코드를 만들지 못했어요. 인터넷 연결을 확인해주세요.');
    retryBtn.classList.remove('hidden');
  }
}

function watchChildJoin(code) {
  stopConnectWatch();
  const doneBtn = document.getElementById('connect-parent-done');
  _connectUnsub = db.collection('families').doc(code).onSnapshot(snap => {
    const fam = snap.data() || {};
    const child = Object.entries(fam.members || {}).map(([uid, m]) => ({ uid, ...m })).find(m => m.role === 'child');
    if (child) {
      const needConsent = child.minor && !fam.guardianConsents?.[child.uid];
      setConnectStatus(needConsent ? `${josa(child.name || '자녀', '와/과')} 연결됐어요. 보호자 동의가 필요해요.` : `${josa(child.name || '자녀', '와/과')} 연결됐어요`, true);
      doneBtn.textContent = needConsent ? '보호자 동의하고 시작하기' : '시작하기';
      doneBtn.dataset.consentFor = needConsent ? child.uid : '';
    } else {
      setConnectStatus('자녀가 코드를 입력하길 기다리는 중이에요');
      doneBtn.textContent = '먼저 둘러보기';
      doneBtn.dataset.consentFor = '';
    }
  }, e => console.warn('가족 연결 감지 실패:', e));
}

window.copyConnectCode = function() {
  const code = document.getElementById('connect-code').textContent.trim();
  if (!/^KY[A-Z0-9]{4}$/.test(code)) return;
  navigator.clipboard.writeText(code)
    .then(() => toast('코드를 복사했어요', 'ok'))
    .catch(() => KyncUI.alert(code, '가족 연결 코드'));
};

window.shareConnectCode = async function() {
  const code = document.getElementById('connect-code').textContent.trim();
  if (!/^KY[A-Z0-9]{4}$/.test(code)) return;
  const text = `Kync 가족 연결 코드: ${code}\n${location.origin}${location.pathname}`;
  if (navigator.share) {
    try { await navigator.share({ title: 'Kync 가족 연결', text }); } catch(e) {}
  } else {
    copyConnectCode();
  }
};

window.retryParentCode = prepareParentCode;

window.finishParentConnect = function() {
  const childUid = document.getElementById('connect-parent-done').dataset.consentFor;
  enterApp('parent');
  if (childUid) setTimeout(() => KyncAccount.openGuardian(childUid), 300);
};

window.joinConnectCode = async function() {
  const input = document.getElementById('connect-code-input');
  const code  = input.value.trim().toUpperCase();
  if (!/^KY[A-Z0-9]{4}$/.test(code)) { toast('KY로 시작하는 6자리 코드를 입력해주세요.', 'error'); input.focus(); return; }
  const user = auth.currentUser;
  if (!user) { navigateTo('page-login'); return; }

  showLoader(true);
  try {
    const profile = KyncAccount.profile || {};
    await KyncDB.joinFamily(user.uid, code, profile.name || '자녀', 'child', KyncAccount.isMinor(profile));
    const fresh = await KyncDB.getUser(user.uid);
    await KyncAccount.route(user, fresh);
  } catch (e) {
    toast(e.message || '연결하지 못했어요. 코드를 확인해주세요.', 'error');
  } finally {
    showLoader(false);
  }
};

window.backToRoleSelect = function() {
  stopConnectWatch();
  navigateTo('page-role');
};

/* ── 구글 로그인 ── */
window.loginWithGoogle = async function() {
  try {
    showLoader(true);
    await KyncAuth.signInWithGoogle();
  } catch(e) {
    showLoader(false);
    if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
      toast(authErrorMessage(e), 'error');
    }
  }
};

/* ── 이메일 로그인 / 회원가입 ── */
window.toggleEmailForm = function() {
  const f = document.getElementById('email-form');
  const open = !f.classList.contains('open');
  f.classList.toggle('open', open);
  document.getElementById('email-toggle').classList.toggle('hidden', open);
  if (open) setTimeout(() => document.getElementById('email-input').focus(), 50);
};

window.switchEmailMode = function(mode) {
  const isSignup = mode === 'signup';
  document.getElementById('tab-login').classList.toggle('on', !isSignup);
  document.getElementById('tab-signup').classList.toggle('on', isSignup);
  document.querySelectorAll('.signup-only').forEach(el => el.classList.toggle('hidden', !isSignup));
  document.getElementById('email-submit').textContent = isSignup ? '회원가입' : '로그인';
  document.getElementById('reset-link').classList.toggle('hidden', isSignup);
  document.getElementById('pw-input').autocomplete = isSignup ? 'new-password' : 'current-password';
  document.getElementById('email-form').dataset.mode = mode;
};

window.submitEmailForm = function() {
  const mode = document.getElementById('email-form').dataset.mode || 'login';
  return mode === 'signup' ? signupWithEmail() : loginWithEmail();
};

window.loginWithEmail = async function() {
  const email = document.getElementById('email-input')?.value?.trim();
  const pw    = document.getElementById('pw-input')?.value;
  if (!email || !pw) { toast('이메일과 비밀번호를 입력해주세요.', 'error'); return; }
  try {
    showLoader(true);
    await KyncAuth.signInWithEmail(email, pw);
  } catch(e) {
    showLoader(false);
    toast(authErrorMessage(e), 'error');
  }
};

window.signupWithEmail = async function() {
  const email = document.getElementById('email-input')?.value?.trim();
  const pw    = document.getElementById('pw-input')?.value;
  const pw2   = document.getElementById('pw2-input')?.value;
  if (!email || !pw)   { toast('이메일과 비밀번호를 입력해주세요.', 'error'); return; }
  if (pw.length < 6)   { toast('비밀번호는 6자 이상이어야 해요.', 'error'); return; }
  if (pw !== pw2)      { toast('비밀번호가 서로 달라요.', 'error'); return; }
  try {
    showLoader(true);
    await KyncAuth.signUpWithEmail(email, pw);
  } catch(e) {
    showLoader(false);
    toast(authErrorMessage(e), 'error');
  }
};

window.resetPassword = async function() {
  const email = document.getElementById('email-input')?.value?.trim();
  if (!email) { toast('비밀번호를 찾을 이메일을 먼저 입력해주세요.', 'error'); return; }
  try {
    await KyncAuth.resetPassword(email);
    KyncUI.alert('비밀번호를 다시 정하는 메일을 보냈어요. 메일함을 확인해주세요.', '메일을 보냈어요');
  } catch(e) {
    toast(authErrorMessage(e), 'error');
  }
};

/* ── 로그아웃 ── */
window.logout = async function(skipConfirm) {
  if (!skipConfirm) {
    const ok = await KyncUI.confirm({ title: '로그아웃할까요?', ok: '로그아웃' });
    if (!ok) return;
  }
  stopConnectWatch();
  KyncAccount.reset();
  _lastProcessedUid = null;
  _authProcessing = false;
  if (typeof App !== 'undefined') App.reset?.();
  await KyncAuth.signOut();
};

// 페이지 이동 방식으로 로그인하고 돌아왔을 때 실패 이유 보여주기
if (typeof auth.getRedirectResult === 'function') {
  auth.getRedirectResult().catch(e => {
    if (e?.code && e.code !== 'auth/no-auth-event') setTimeout(() => toast(authErrorMessage(e), 'error'), 500);
  });
}

/* ── 인증 상태 핸들러 ── */
// 스크립트를 다 불러온 뒤에 화면을 정해요 (로그인 확인이 먼저 끝나 App 등이 아직 없을 때 대비)
const _domReady = new Promise(r => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', r) : r());
auth.onAuthStateChanged(async (user) => {
  await _domReady;
  // 로그인 화면이 있는 index.html에서만 화면 이동 처리 (활동 페이지에서 오류 방지)
  if (!document.getElementById('page-login')) return;
  if (!user) {
    _lastProcessedUid = null;
    _authProcessing = false;
    showLoader(false);
    if (window._returnTab) { window._returnTab = null; navigateTo('page-login'); }
    KyncAccount.maybeShowIntro();
    return;
  }
  await handleAuthSuccess(user);
});

/* ════════════════════════════════════════
   KyncDB — Firestore 데이터
════════════════════════════════════════ */
const FAMILY_SUBCOLLECTIONS = ['records', 'diary', 'praise', 'balance', 'balance_answers', 'scenes', 'together_quiz', 'quests', 'quests2', 'manual', 'events', 'journal_shared'];

const KyncDB = {

  async getUser(uid) {
    const snap = await db.collection('users').doc(uid).get();
    return snap.exists ? snap.data() : null;
  },
  async setUser(uid, data) {
    await db.collection('users').doc(uid).set(data, { merge: true });
  },
  async updateUser(uid, data) {
    try {
      await db.collection('users').doc(uid).update(data);
    } catch(e) {
      await db.collection('users').doc(uid).set(data, { merge: true });
    }
  },

  async createFamily(uid, userName, role) {
    const code = generateFamilyCode();
    await db.collection('families').doc(code).set({
      members: { [uid]: { name: userName, role } },
      created: firebase.firestore.FieldValue.serverTimestamp()
    });
    await KyncDB.updateUser(uid, { familyCode: code });
    localStorage.setItem('kync_family_code', code);
    return code;
  },

  async joinFamily(uid, code, userName, role, minor) {
    code = code.trim().toUpperCase();
    const ref  = db.collection('families').doc(code);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('없는 코드예요. 부모님 화면의 코드를 다시 확인해주세요.');
    // 이미 다른 가족과 연결돼 있으면 막기
    const me = await KyncDB.getUser(uid);
    if (me?.familyCode && me.familyCode !== code) throw new Error('이미 다른 가족과 연결돼 있어요.');
    await ref.update({ [`members.${uid}`]: { name: userName, role, minor: !!minor } });
    await KyncDB.updateUser(uid, { familyCode: code });
    localStorage.setItem('kync_family_code', code);
    return code;
  },

  async getFamilyMembers(code) {
    if (!code) return [];
    const snap = await db.collection('families').doc(code).get();
    if (!snap.exists) return [];
    const m = snap.data().members || {};
    return Object.entries(m).map(([uid, d]) => ({ uid, ...d }));
  },

  // 가족 정보 (멤버 + 연결 시작일 + 보호자 동의). 없으면 null
  async getFamily(code) {
    if (!code) return null;
    const snap = await db.collection('families').doc(code).get();
    return snap.exists ? snap.data() : null;
  },

  async updateFamily(code, data) {
    await db.collection('families').doc(code).update(data);
  },

  async getTodayRecord(familyCode) {
    if (!familyCode) return {};
    const snap = await db.collection('families').doc(familyCode)
      .collection('records').doc(todayKey()).get();
    return snap.exists ? snap.data() : {};
  },

  async submitAnswer(familyCode, role, content, question) {
    if (!familyCode) return;
    await db.collection('families').doc(familyCode)
      .collection('records').doc(todayKey()).set(
        { [role]: { content, question, at: firebase.firestore.FieldValue.serverTimestamp() } },
        { merge: true }
      );
  },

  async submitCheckin(familyCode, checkin) {
    if (!familyCode) return;
    await db.collection('families').doc(familyCode)
      .collection('records').doc(todayKey()).set(
        { checkin: { ...checkin, at: firebase.firestore.FieldValue.serverTimestamp() } },
        { merge: true }
      );
  },

  listenTodayRecord(familyCode, callback) {
    if (!familyCode) return () => {};
    return db.collection('families').doc(familyCode)
      .collection('records').doc(todayKey())
      .onSnapshot(snap => callback(snap.exists ? snap.data() : {}));
  },

  async saveQuizResult(uid, result) {
    if (!uid) return;
    await db.collection('users').doc(uid).set({
      quizResult: { ...result, savedAt: firebase.firestore.FieldValue.serverTimestamp() }
    }, { merge: true });
  },

  /* ── 삭제 ── */
  async _deleteCollection(ref) {
    for (;;) {
      const snap = await ref.limit(300).get();
      if (snap.empty) return;
      const batch = db.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      if (snap.size < 300) return;
    }
  },

  // 가족 공간과 그 안의 모든 기록 삭제 (탈퇴, 가족 연결 끊기)
  async deleteFamilySpace(code) {
    if (!code) return;
    const ref = db.collection('families').doc(code);
    for (const sub of FAMILY_SUBCOLLECTIONS) await this._deleteCollection(ref.collection(sub));
    await ref.delete();
  },

  // 내 계정의 개인 기록 삭제 (탈퇴)
  async deleteUserData(uid) {
    const userRef = db.collection('users').doc(uid);
    await this._deleteCollection(userRef.collection('counsel'));
    await this._deleteCollection(userRef.collection('journal'));
    await this._deleteCollection(db.collection('diary').doc(uid).collection('entries'));
    await userRef.delete();
  },

  async deleteCounsel(uid) {
    await this._deleteCollection(db.collection('users').doc(uid).collection('counsel'));
  },
};
