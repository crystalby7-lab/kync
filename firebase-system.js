/* ════════════════════════════════════════════════════════════════
   firebase-system.js — Kync Firebase 초기화 및 데이터 레이어
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

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function generateFamilyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = 'KY';
  for (let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

function showLoader(on) {
  const el = document.getElementById('kync-global-loader');
  if (el) el.style.display = on ? 'flex' : 'none';
}

function navigateTo(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(pageId);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
}

/* ════════════════════════════════════════
   KyncAuth — 인증
════════════════════════════════════════ */
const KyncAuth = {
  async signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    const { user } = await auth.signInWithPopup(provider);
    return user;
  },
  async signInWithEmail(email, password) {
    const { user } = await auth.signInWithEmailAndPassword(email, password);
    return user;
  },
  async signUpWithEmail(name, email, password) {
    _pendingSignupName = name;
    const { user } = await auth.createUserWithEmailAndPassword(email, password);
    await user.updateProfile({ displayName: name });
    return user;
  },
  async resetPassword(email) {
    await auth.sendPasswordResetEmail(email);
  },
  async signOut() {
    await auth.signOut();
    localStorage.removeItem('kync_role');
    localStorage.removeItem('kync_family_code');
    navigateTo('page-login');
  },
  onAuthChange(cb) { return auth.onAuthStateChanged(cb); },
  get current() { return auth.currentUser; }
};

/* ── 중복 처리 방지 ── */
let _authProcessing = false;
let _lastProcessedUid = null;
let _pendingSignupName = null; // 회원가입 직후 displayName 반영 전 이름

/* ── Firebase 인증 에러 → 한국어 메시지 ── */
function authErrorMessage(e) {
  const map = {
    'auth/invalid-email':          '이메일 형식이 올바르지 않아요.',
    'auth/user-not-found':         '가입되지 않은 이메일이에요. 회원가입을 먼저 해주세요.',
    'auth/wrong-password':         '이메일 또는 비밀번호가 맞지 않아요.',
    'auth/invalid-credential':     '이메일 또는 비밀번호가 맞지 않아요.',
    'auth/email-already-in-use':   '이미 가입된 이메일이에요. 로그인해주세요.',
    'auth/weak-password':          '비밀번호는 6자 이상이어야 해요.',
    'auth/too-many-requests':      '시도가 너무 많아요. 잠시 후 다시 시도해주세요.',
    'auth/network-request-failed': '네트워크 연결을 확인해주세요.'
  };
  return map[e.code] || e.message;
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
        name:     _pendingSignupName || user.displayName || user.email.split('@')[0],
        email:    user.email,
        photoURL: user.photoURL || '',
        points:   0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await KyncDB.setUser(user.uid, profile);
    }
    _pendingSignupName = null;

    localStorage.setItem('kync_user_name', profile.name || user.displayName || '');
    localStorage.setItem('kync_user_uid',  user.uid);
    // 다른 계정에서 남은 가족 코드가 섞이지 않도록 DB 기준으로 맞춤
    if (profile.familyCode) localStorage.setItem('kync_family_code', profile.familyCode);
    else localStorage.removeItem('kync_family_code');
    _currentProfile = profile;

    if (typeof KyncState !== 'undefined') {
      KyncState.uid        = user.uid;
      KyncState.userName   = profile.name || user.displayName || '나';
      KyncState.familyCode = profile.familyCode || null;
      KyncState.points     = profile.points || 0;
      KyncState.role       = profile.role || null;
    }

    _lastProcessedUid = user.uid;
    showLoader(false);

    const role = profile.role;
    if (role === 'parent' || role === 'child') {
      localStorage.setItem('kync_role', role);
      if (profile.familyCode) enterApp(role);
      else showConnectPage(role);
    } else {
      navigateTo('page-onboard');
    }
  } catch(e) {
    console.error('handleAuthSuccess error:', e);
    showLoader(false);
    navigateTo('page-onboard');
  } finally {
    _authProcessing = false;
  }
}

/* ── 역할 설정 ── */
window.setUserRole = async function(role) {
  const user = auth.currentUser;
  if (!user) { navigateTo('page-login'); return; }

  showLoader(true);
  try {
    await KyncDB.updateUser(user.uid, { role });
  } catch(e) {
    console.warn('역할 저장 실패:', e);
  }
  localStorage.setItem('kync_role', role);
  if (_currentProfile) _currentProfile.role = role;
  _lastProcessedUid = null; // 재처리 허용
  showLoader(false);
  if (_currentProfile?.familyCode) enterApp(role);
  else showConnectPage(role);
};

/* ════════════════════════════════════════
   가족 연결 (필수 단계)
   - 부모: 코드 자동 생성 → 자녀 합류를 실시간으로 기다림
   - 자녀: 부모에게 받은 코드를 입력해야 앱으로 들어갈 수 있음
════════════════════════════════════════ */
let _currentProfile = null;
let _connectUnsub   = null;

function enterApp(role) {
  if (_connectUnsub) { _connectUnsub(); _connectUnsub = null; }
  navigateTo('page-' + role);
  if (typeof App !== 'undefined' && typeof App.init === 'function') {
    Promise.resolve(App.init()).catch(e => console.error('App.init', e));
  }
}

async function showConnectPage(role) {
  navigateTo('page-connect');
  document.getElementById('connect-parent').style.display = role === 'parent' ? 'block' : 'none';
  document.getElementById('connect-child').style.display  = role === 'child'  ? 'block' : 'none';
  if (role === 'parent') await prepareParentCode();
}

async function prepareParentCode() {
  const user = auth.currentUser;
  const codeEl  = document.getElementById('connect-code');
  const statusEl = document.getElementById('connect-status');
  const retryBtn = document.getElementById('connect-retry');
  if (!user) { navigateTo('page-login'); return; }

  codeEl.textContent = '— — —';
  statusEl.textContent = '코드를 만드는 중이에요…';
  retryBtn.style.display = 'none';
  try {
    // 이미 만든 가족이 있으면 새로 만들지 않고 그대로 사용
    const fresh = await KyncDB.getUser(user.uid);
    let code = fresh?.familyCode;
    if (!code) {
      const name = fresh?.name || _currentProfile?.name || '부모';
      code = await KyncDB.createFamily(user.uid, name, 'parent');
    }
    if (_currentProfile) _currentProfile.familyCode = code;
    localStorage.setItem('kync_family_code', code);
    codeEl.textContent = code;
    watchChildJoin(code);
  } catch (e) {
    console.error('가족 코드 생성 실패:', e);
    codeEl.textContent = '—';
    statusEl.textContent = '코드를 만들지 못했어요. 네트워크를 확인하고 다시 시도해주세요.';
    retryBtn.style.display = 'block';
  }
}

function watchChildJoin(code) {
  if (_connectUnsub) _connectUnsub();
  const statusEl = document.getElementById('connect-status');
  const doneBtn  = document.getElementById('connect-parent-done');
  _connectUnsub = db.collection('families').doc(code).onSnapshot(snap => {
    const members = Object.values(snap.data()?.members || {});
    const child = members.find(m => m.role === 'child');
    if (child) {
      statusEl.textContent = `${child.name || '자녀'}와(과) 연결됐어요!`;
      doneBtn.textContent = '시작하기';
    } else {
      statusEl.textContent = '자녀가 코드를 입력하길 기다리는 중이에요…';
      doneBtn.textContent = '먼저 둘러보기';
    }
  }, e => console.warn('가족 연결 감지 실패:', e));
}

window.copyConnectCode = function(btn) {
  const code = document.getElementById('connect-code').textContent.trim();
  if (!/^KY[A-Z0-9]{4}$/.test(code)) return;
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = '복사됐어요!';
    setTimeout(() => btn.textContent = '코드 복사', 2000);
  }).catch(() => alert('코드: ' + code));
};

window.retryParentCode = prepareParentCode;

window.finishParentConnect = function() { enterApp('parent'); };

window.joinConnectCode = async function() {
  const input = document.getElementById('connect-code-input');
  const code  = input.value.trim().toUpperCase();
  if (!/^KY[A-Z0-9]{4}$/.test(code)) { alert('KY로 시작하는 6자리 코드를 입력해주세요.'); return; }
  const user = auth.currentUser;
  if (!user) { alert('로그인 정보가 없어요. 다시 로그인해주세요.'); navigateTo('page-login'); return; }

  showLoader(true);
  try {
    const name = _currentProfile?.name || localStorage.getItem('kync_user_name') || '자녀';
    await KyncDB.joinFamily(user.uid, code, name, 'child');
    if (_currentProfile) _currentProfile.familyCode = code;
    showLoader(false);
    enterApp('child');
  } catch (e) {
    showLoader(false);
    alert(e.message || '연결에 실패했어요. 코드를 확인해주세요.');
  }
};

window.backToRoleSelect = function() {
  if (_connectUnsub) { _connectUnsub(); _connectUnsub = null; }
  navigateTo('page-onboard');
};

/* ── 구글 로그인 ── */
window.loginWithGoogle = async function() {
  try {
    showLoader(true);
    await KyncAuth.signInWithGoogle();
  } catch(e) {
    showLoader(false);
    if (e.code !== 'auth/popup-closed-by-user') alert('구글 로그인 실패: ' + e.message);
  }
};

/* ── 이메일 로그인 / 회원가입 ── */
window.switchEmailMode = function(mode) {
  const isSignup = mode === 'signup';
  document.getElementById('tab-login').classList.toggle('on', !isSignup);
  document.getElementById('tab-signup').classList.toggle('on', isSignup);
  document.querySelectorAll('.signup-only').forEach(el => el.style.display = isSignup ? 'block' : 'none');
  document.getElementById('email-submit').textContent = isSignup ? '회원가입' : '로그인';
  document.getElementById('reset-link').style.display = isSignup ? 'none' : 'block';
  document.getElementById('email-form').dataset.mode = mode;
};

window.submitEmailForm = function() {
  const mode = document.getElementById('email-form').dataset.mode || 'login';
  return mode === 'signup' ? signupWithEmail() : loginWithEmail();
};

window.loginWithEmail = async function() {
  const email = document.getElementById('email-input')?.value?.trim();
  const pw    = document.getElementById('pw-input')?.value;
  if (!email || !pw) { alert('이메일과 비밀번호를 입력해주세요.'); return; }
  try {
    showLoader(true);
    await KyncAuth.signInWithEmail(email, pw);
  } catch(e) {
    showLoader(false);
    alert('로그인 실패: ' + authErrorMessage(e));
  }
};

window.signupWithEmail = async function() {
  const name  = document.getElementById('signup-name-input')?.value?.trim();
  const email = document.getElementById('email-input')?.value?.trim();
  const pw    = document.getElementById('pw-input')?.value;
  const pw2   = document.getElementById('pw2-input')?.value;
  if (!name)           { alert('이름을 입력해주세요.'); return; }
  if (!email || !pw)   { alert('이메일과 비밀번호를 입력해주세요.'); return; }
  if (pw.length < 6)   { alert('비밀번호는 6자 이상이어야 해요.'); return; }
  if (pw !== pw2)      { alert('비밀번호가 서로 달라요.'); return; }
  try {
    showLoader(true);
    await KyncAuth.signUpWithEmail(name, email, pw);
  } catch(e) {
    _pendingSignupName = null;
    showLoader(false);
    alert('회원가입 실패: ' + authErrorMessage(e));
  }
};

window.resetPassword = async function() {
  const email = document.getElementById('email-input')?.value?.trim();
  if (!email) { alert('비밀번호를 찾을 이메일을 먼저 입력해주세요.'); return; }
  try {
    await KyncAuth.resetPassword(email);
    alert('비밀번호 재설정 메일을 보냈어요. 메일함을 확인해주세요.');
  } catch(e) {
    alert(authErrorMessage(e));
  }
};

/* ── 로그아웃 ── */
window.logout = async function() {
  if (_connectUnsub) { _connectUnsub(); _connectUnsub = null; }
  _currentProfile = null;
  _lastProcessedUid = null;
  _authProcessing = false;
  await KyncAuth.signOut();
};

/* ── 인증 상태 핸들러 ── */
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    _lastProcessedUid = null;
    _authProcessing = false;
    showLoader(false);
    return;
  }

  const activePage = document.querySelector('.page.active');
  if (activePage && (activePage.id === 'page-parent' || activePage.id === 'page-child')) return;

  await handleAuthSuccess(user);
});

/* ════════════════════════════════════════
   KyncDB — Firestore 데이터
════════════════════════════════════════ */
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

  async joinFamily(uid, code, userName, role) {
    code = code.trim().toUpperCase();
    const ref  = db.collection('families').doc(code);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('존재하지 않는 코드예요.');
    await ref.update({ [`members.${uid}`]: { name: userName, role } });
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

  async getHistory(familyCode) {
    if (!familyCode) return [];
    const snap = await db.collection('families').doc(familyCode)
      .collection('records')
      .orderBy(firebase.firestore.FieldPath.documentId(), 'desc')
      .limit(30).get();
    const out = [];
    snap.forEach(doc => {
      const d = doc.data();
      const dateStr = doc.id.replace(/-/g, '.');
      if (d.parent)  out.push({ date: dateStr, role: 'parent', type: 'answer',  content: d.parent.content,  question: d.parent.question });
      if (d.child)   out.push({ date: dateStr, role: 'child',  type: 'answer',  content: d.child.content,   question: d.child.question });
      if (d.checkin) out.push({ date: dateStr, role: 'child',  type: 'checkin',
        emotion: d.checkin.emotion, stress: d.checkin.stress,
        energy: d.checkin.energy,   memo: d.checkin.memo });
    });
    return out;
  },

  async getDiaryEntries(uid) {
    const snap = await db.collection('diary').doc(uid)
      .collection('entries').orderBy('createdAt', 'desc').limit(50).get();
    const out = [];
    snap.forEach(doc => out.push({ id: doc.id, ...doc.data() }));
    return out;
  },

  async saveDiaryEntry(uid, entry) {
    await db.collection('diary').doc(uid).collection('entries').add({
      ...entry,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async getQuests(familyCode) {
    if (!familyCode) return [];
    const snap = await db.collection('families').doc(familyCode)
      .collection('quests').orderBy('id').get();
    const out = [];
    snap.forEach(doc => out.push({ docId: doc.id, ...doc.data() }));
    return out;
  },

  async seedDefaultQuests(familyCode, templates) {
    const batch = db.batch();
    templates.forEach(q => {
      const ref = db.collection('families').doc(familyCode)
        .collection('quests').doc(String(q.id));
      batch.set(ref, q);
    });
    await batch.commit();
  },

  async updateQuestConsent(familyCode, questId, role) {
    const ref  = db.collection('families').doc(familyCode)
      .collection('quests').doc(String(questId));
    await ref.update({ [`agreed.${role}`]: true });
    const snap = await ref.get();
    const q    = snap.data();
    if (q.agreed.parent && q.agreed.child) {
      await ref.update({ status: 'active', startDate: todayKey(), progress: 0 });
      return true;
    }
    return false;
  },

  async addPoints(uid, amount) {
    if (!uid) return;
    await db.collection('users').doc(uid).update({
      points: firebase.firestore.FieldValue.increment(amount)
    });
  },

  async saveQuizResult(uid, result) {
    if (!uid) return;
    await db.collection('users').doc(uid).set({
      quizResult: { ...result, savedAt: firebase.firestore.FieldValue.serverTimestamp() }
    }, { merge: true });
  }
}; 