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

/* ── 로더 표시/숨기기 ── */
function showLoader(on) {
  const el = document.getElementById('kync-global-loader');
  if (el) el.style.display = on ? 'flex' : 'none';
}

/* ── 페이지 이동 ── */
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
    try {
      const { user } = await auth.signInWithEmailAndPassword(email, password);
      return user;
    } catch (e) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
        const { user } = await auth.createUserWithEmailAndPassword(email, password);
        return user;
      }
      throw e;
    }
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

/* ── 로그인 후 공통 처리 ── */
async function handleAuthSuccess(user) {
  showLoader(true);
  try {
    let profile = await KyncDB.getUser(user.uid);

    if (!profile) {
      // 신규 사용자 — 프로필 생성
      profile = {
        uid:      user.uid,
        name:     user.displayName || user.email.split('@')[0],
        email:    user.email,
        photoURL: user.photoURL || '',
        points:   0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await KyncDB.setUser(user.uid, profile);
    }

    // localStorage 동기화
    localStorage.setItem('kync_user_name', profile.name || user.displayName || '');
    localStorage.setItem('kync_user_uid',  user.uid);
    if (profile.familyCode) localStorage.setItem('kync_family_code', profile.familyCode);

    const role = profile.role;
    if (role === 'parent' || role === 'child') {
      localStorage.setItem('kync_role', role);
      showLoader(false);
      navigateTo('page-' + role);
      if (typeof App !== 'undefined') App.init();
    } else {
      showLoader(false);
      // 역할 없으면 온보딩으로
      if (!window.location.pathname.includes('onboarding')) {
        window.location.href = 'onboarding.html';
      } else {
        navigateTo('page-onboard');
      }
    }
  } catch(e) {
    console.error('handleAuthSuccess error:', e);
    showLoader(false);
    navigateTo('page-onboard');
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
    console.warn('역할 저장 실패(계속 진행):', e);
  }
  localStorage.setItem('kync_role', role);
  showLoader(false);
  // onboarding.html에서 호출된 경우 index.html로 이동
  if (window.location.pathname.includes('onboarding')) {
    window.location.href = 'index.html';
    return;
  }
  navigateTo('page-' + role);
  if (typeof App !== 'undefined') App.init();
};

/* ── 구글 로그인 버튼 ── */
window.loginWithGoogle = async function() {
  try {
    const user = await KyncAuth.signInWithGoogle();
    await handleAuthSuccess(user);
  } catch(e) {
    if (e.code !== 'auth/popup-closed-by-user') alert('구글 로그인 실패: ' + e.message);
  }
};

/* ── 이메일 로그인 버튼 ── */
window.loginWithEmail = async function() {
  const email = document.getElementById('email-input')?.value?.trim();
  const pw    = document.getElementById('pw-input')?.value;
  if (!email || !pw) { alert('이메일과 비밀번호를 입력해주세요.'); return; }
  try {
    const user = await KyncAuth.signInWithEmail(email, pw);
    await handleAuthSuccess(user);
  } catch(e) {
    alert('로그인 실패: ' + e.message);
  }
};

/* ── 로그아웃 ── */
window.logout = async function() {
  await KyncAuth.signOut();
};

/* ── 새로고침 세션 유지 ── */
auth.onAuthStateChanged(async (user) => {
  if (!user) return; // 로그인 안 됨 → 로그인 페이지 유지

  // 이미 올바른 페이지에 있으면 중복 처리 방지
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
      // 문서 없으면 set으로 대체
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

  // 실시간 오늘 기록 감시 → 잠금 해제 처리
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