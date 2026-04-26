/* ═══════════════════════════════════════════════════════════
   kync-features.js — 칭찬카드 + 스트릭 + 공동 기능 3종
═══════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════
   1. 칭찬 카드 시스템
════════════════════════════════════════ */
const KyncPraise = {

  TEMPLATES: [
    { emoji:'—', text:'오늘도 버텨줘서 고마워' },
    { emoji:'·', text:'네가 자랑스러워' },
    { emoji:'—', text:'힘들었을 텐데 잘 해냈어' },
    { emoji:'·', text:'오늘 하루도 수고했어' },
    { emoji:'—', text:'네 편이야, 언제나' },
    { emoji:'·', text:'사랑해' },
    { emoji:'—', text:'오늘 쉬어도 괜찮아' },
    { emoji:'·', text:'네가 있어서 행복해' },
  ],

  // 카드 보내기 모달 열기
  openSendModal(fromRole) {
    const existing = document.getElementById('praise-send-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'praise-send-modal';
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.45);
      z-index:9999;display:flex;align-items:flex-end;
      justify-content:center;animation:fadeIn 0.2s ease;
    `;

    const sheet = document.createElement('div');
    sheet.style.cssText = `
      background:#fff;border-radius:28px 28px 0 0;
      width:100%;max-width:430px;padding:28px 24px 48px;
      animation:slideUp 0.35s cubic-bezier(0.34,1.1,0.64,1);
    `;
    sheet.innerHTML = `
      <div style="width:40px;height:4px;background:#e8e3da;border-radius:2px;margin:0 auto 24px;"></div>
      <div style="font-size:18px;font-weight:800;color:#3d3530;margin-bottom:6px;">칭찬 카드 보내기</div>
      <div style="font-size:13px;color:#a09890;margin-bottom:20px;">
        ${fromRole==='parent'?'자녀에게 마음을 전해보세요':'부모님께 마음을 전해보세요'}
      </div>

      <!-- 템플릿 그리드 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;" id="praise-templates">
        ${this.TEMPLATES.map((t,i)=>`
          <button onclick="KyncPraise.selectTemplate(${i})" id="praise-t-${i}"
            style="padding:12px;background:#f5f2ed;border:2px solid transparent;
                   border-radius:14px;cursor:pointer;text-align:left;
                   font-family:Nunito,sans-serif;transition:all 0.15s;">
            <div style="width:28px;height:28px;border-radius:50%;background:#3d3530;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;margin-bottom:6px;">${t.emoji}</div>
            <div style="font-size:12px;font-weight:700;color:#3d3530;">${t.text}</div>
          </button>
        `).join('')}
      </div>

      <!-- 직접 입력 -->
      <div style="margin-bottom:16px;">
        <div style="font-size:12px;font-weight:700;color:#a09890;margin-bottom:8px;">직접 입력</div>
        <textarea id="praise-custom-input" maxlength="60" placeholder="직접 써도 돼요..."
          style="width:100%;padding:14px;border:1.5px solid #e8e3da;border-radius:14px;
                 font-size:14px;font-family:Nunito,sans-serif;resize:none;
                 height:70px;outline:none;color:#3d3530;background:#f5f2ed;"
          oninput="KyncPraise.onCustomInput(this)"></textarea>
      </div>

      <!-- 보내기 버튼 -->
      <button id="praise-send-btn" onclick="KyncPraise.sendCard('${fromRole}')"
        style="width:100%;padding:16px;background:#c17f4a;color:#fff;
               border:none;border-radius:14px;font-size:16px;font-weight:800;
               cursor:pointer;font-family:Nunito,sans-serif;transition:all 0.2s;">
        카드 보내기
      </button>
      <button onclick="document.getElementById('praise-send-modal').remove()"
        style="width:100%;padding:12px;background:transparent;border:none;
               font-size:13px;color:#a09890;cursor:pointer;font-family:Nunito,sans-serif;
               margin-top:8px;">취소</button>
    `;

    modal.appendChild(sheet);
    modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
    document.body.appendChild(modal);
    this.selectedIdx = null;
  },

  selectedIdx: null,
  selectedText: null,

  selectTemplate(idx) {
    this.selectedIdx = idx;
    this.selectedText = this.TEMPLATES[idx].text;
    document.getElementById('praise-custom-input').value = '';
    document.querySelectorAll('[id^="praise-t-"]').forEach((el,i) => {
      el.style.borderColor = i===idx ? '#c17f4a' : 'transparent';
      el.style.background  = i===idx ? '#fdf1eb' : '#f5f2ed';
    });
  },

  onCustomInput(el) {
    this.selectedText = el.value.trim();
    this.selectedIdx  = null;
    document.querySelectorAll('[id^="praise-t-"]').forEach(e => {
      e.style.borderColor = 'transparent';
      e.style.background  = '#f5f2ed';
    });
  },

  async sendCard(fromRole) {
    const text = this.selectedText ||
                 document.getElementById('praise-custom-input')?.value?.trim();
    if (!text) { this._shake(); return; }

    const emoji = this.selectedIdx !== null
                  ? this.TEMPLATES[this.selectedIdx].emoji
                  : '💌';

    const familyCode = localStorage.getItem('kync_family_code');
    if (!familyCode) {
      alert('먼저 가족과 연결해주세요.');
      return;
    }

    const btn = document.getElementById('praise-send-btn');
    btn.textContent = '전송 중...';
    btn.disabled = true;

    try {
      if (typeof db !== 'undefined') {
        await db.collection('families').doc(familyCode)
          .collection('praise').add({
            from:      fromRole,
            to:        fromRole==='parent' ? 'child' : 'parent',
            emoji,
            text,
            sentAt:    firebase.firestore.FieldValue.serverTimestamp(),
            read:      false,
          });
      }
      // 포인트 +30
      if (typeof KyncDB !== 'undefined' && KyncAuth?.current) {
        await KyncDB.addPoints(KyncAuth.current.uid, 30);
      }

      document.getElementById('praise-send-modal').remove();
      this._showSentToast(emoji, text);
    } catch(e) {
      console.error(e);
      btn.textContent = '카드 보내기';
      btn.disabled = false;
    }
  },

  _shake() {
    const btn = document.getElementById('praise-send-btn');
    btn.style.animation = 'shake 0.4s ease';
    setTimeout(() => btn.style.animation = '', 400);
  },

  _showSentToast(emoji, text) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed;bottom:110px;left:50%;transform:translateX(-50%);
      background:#3d3530;color:#fff;padding:14px 24px;border-radius:20px;
      font-size:14px;font-weight:700;z-index:9999;
      font-family:Nunito,sans-serif;text-align:center;
      animation:popUp 0.35s cubic-bezier(0.34,1.56,0.64,1);
      white-space:nowrap;
    `;
    el.innerHTML = `${emoji} "${text}" 전달됐어요!`;
    document.body.appendChild(el);
    setTimeout(() => el.style.opacity='0', 2400);
    setTimeout(() => el.remove(), 2800);
  },

  // 받은 카드 팝업
  showReceivedCard(card) {
    const existing = document.getElementById('praise-received-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.id = 'praise-received-popup';
    popup.style.cssText = `
      position:fixed;top:20px;left:50%;transform:translateX(-50%);
      z-index:9999;width:calc(100% - 48px);max-width:382px;
      background:#3d3530;border-radius:20px;padding:20px 22px;
      animation:slideDown 0.45s cubic-bezier(0.34,1.1,0.64,1);
      cursor:pointer;box-shadow:0 16px 40px rgba(0,0,0,0.25);
    `;
    popup.innerHTML = `
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff;flex-shrink:0;">${card.emoji}</div>
        <div>
          <div style="font-size:11px;color:rgba(255,255,255,0.5);
                      font-weight:700;letter-spacing:0.1em;margin-bottom:4px;">
            ${card.from==='parent'?'부모님':'자녀'}이 카드를 보냈어요
          </div>
          <div style="font-size:17px;font-weight:800;color:#fff;">${card.text}</div>
        </div>
      </div>
    `;
    popup.addEventListener('click', () => popup.remove());
    document.body.appendChild(popup);
    setTimeout(() => {
      popup.style.opacity = '0';
      popup.style.transform = 'translateX(-50%) translateY(-10px)';
      popup.style.transition = 'all 0.3s ease';
    }, 4000);
    setTimeout(() => popup.remove(), 4400);
  },

  // 실시간 카드 수신 감시
  listenForCards(familyCode, myRole) {
    if (!familyCode || typeof db === 'undefined') return;
    return db.collection('families').doc(familyCode)
      .collection('praise')
      .where('to', '==', myRole)
      .where('read', '==', false)
      .onSnapshot(snap => {
        snap.docChanges().forEach(change => {
          if (change.type === 'added') {
            const card = change.doc.data();
            if (card.sentAt) { // 방금 온 것만
              this.showReceivedCard(card);
              change.doc.ref.update({ read: true });
            }
          }
        });
      });
  },

  // 받은 카드 목록 렌더링
  async renderReceivedCards(containerId, myRole) {
    const familyCode = localStorage.getItem('kync_family_code');
    if (!familyCode || typeof db === 'undefined') return;

    const snap = await db.collection('families').doc(familyCode)
      .collection('praise')
      .where('to', '==', myRole)
      .orderBy('sentAt','desc')
      .limit(20)
      .get();

    const container = document.getElementById(containerId);
    if (!container) return;

    if (snap.empty) {
      container.innerHTML = `<div style="text-align:center;color:#a09890;
        font-size:13px;padding:24px;">아직 받은 카드가 없어요</div>`;
      return;
    }

    container.innerHTML = snap.docs.map(doc => {
      const c = doc.data();
      const time = c.sentAt?.toDate?.()?.toLocaleDateString('ko-KR') || '';
      return `
        <div style="display:flex;align-items:center;gap:14px;
                    padding:14px;background:#f5f2ed;border-radius:14px;margin-bottom:8px;">
          <div style="width:36px;height:36px;border-radius:50%;background:#3d3530;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0;">${c.emoji}</div>
          <div style="flex:1;">
            <div style="font-size:15px;font-weight:700;color:#3d3530;">${c.text}</div>
            <div style="font-size:11px;color:#a09890;margin-top:3px;">
              ${c.from==='parent'?'부모님':'자녀'} · ${time}
            </div>
          </div>
        </div>`;
    }).join('');
  },
};

/* ════════════════════════════════════════
   2. 스트릭 시스템
════════════════════════════════════════ */
const KyncStreak = {

  BADGES: [
    { days:3,  emoji:'✦', name:'첫 불꽃',    desc:'3일 연속 체크인!' },
    { days:7,  emoji:'◆', name:'일주일 챔피언', desc:'7일 연속! 대단해요' },
    { days:14, emoji:'◈', name:'다이아몬드', desc:'2주 연속! 진짜 대단해요' },
    { days:30, emoji:'○', name:'연결왕',    desc:'30일 연속! 전설이에요' },
  ],

  // 오늘 체크인 시 호출
  async onCheckin(uid) {
    const today = new Date().toLocaleDateString('ko-KR');
    const key   = `kync_streak_${uid}`;

    let streak = JSON.parse(localStorage.getItem(key) || '{"count":0,"lastDate":"","badges":[]}');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('ko-KR');

    if (streak.lastDate === today) return streak; // 이미 오늘 함

    if (streak.lastDate === yesterdayStr) {
      streak.count++; // 연속
    } else if (streak.lastDate !== today) {
      streak.count = 1; // 리셋
    }
    streak.lastDate = today;

    // Firebase에도 저장
    if (typeof KyncDB !== 'undefined') {
      try {
        await KyncDB.updateUser(uid, { streak: streak.count, streakLastDate: today });
      } catch(e) {}
    }

    localStorage.setItem(key, JSON.stringify(streak));

    // 배지 체크
    const newBadge = this.BADGES.find(
      b => b.days === streak.count && !streak.badges.includes(b.days)
    );
    if (newBadge) {
      streak.badges.push(newBadge.days);
      localStorage.setItem(key, JSON.stringify(streak));
      this.showBadgePopup(newBadge);
    }

    this.renderStreakUI(uid);
    return streak;
  },

  showBadgePopup(badge) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.5);
      z-index:9999;display:flex;align-items:center;justify-content:center;
      padding:24px;animation:fadeIn 0.2s ease;
    `;
    el.innerHTML = `
      <div style="background:#fff;border-radius:28px;padding:40px 32px;
                  text-align:center;max-width:320px;width:100%;
                  animation:popIn 0.5s cubic-bezier(0.34,1.56,0.64,1);">
        <div style="font-size:40px;margin-bottom:16px;
                    animation:bounce 0.6s 0.3s ease both;">${badge.emoji}</div>
        <div style="font-size:22px;font-weight:900;color:#3d3530;margin-bottom:8px;">
          ${badge.name}
        </div>
        <div style="font-size:14px;color:#6b6560;margin-bottom:24px;line-height:1.6;">
          ${badge.desc}<br>
          <strong style="color:#c17f4a;">${badge.days}일 연속 체크인</strong> 달성!
        </div>
        <button onclick="this.closest('[style*=fixed]').remove()"
          style="padding:14px 32px;background:#3d3530;color:#fff;
                 border:none;border-radius:14px;font-size:15px;font-weight:800;
                 cursor:pointer;font-family:Nunito,sans-serif;">
          계속하기
        </button>
      </div>
    `;
    el.addEventListener('click', e => { if(e.target===el) el.remove(); });
    document.body.appendChild(el);
  },

  renderStreakUI(uid) {
    const key    = `kync_streak_${uid}`;
    const streak = JSON.parse(localStorage.getItem(key) || '{"count":0,"lastDate":"","badges":[]}');
    const count  = streak.count || 0;

    // 스트릭 배지 (상단 바에 표시)
    const streakEls = document.querySelectorAll('.streak-badge');
    streakEls.forEach(el => {
      el.textContent = count > 0 ? `🔥 ${count}일` : '';
      el.style.display = count > 0 ? 'flex' : 'none';
    });

    // 프로필 탭 스트릭 카드
    const streakCards = document.querySelectorAll('.streak-card');
    streakCards.forEach(el => {
      const next = this.BADGES.find(b => b.days > count);
      el.innerHTML = `
        <div style="display:flex;align-items:center;gap:14px;padding:16px;
                    background:#f5f2ed;border-radius:16px;">
          <div style="font-size:32px;">${count>0?'✦':'—'}</div>
          <div style="flex:1;">
            <div style="font-size:16px;font-weight:800;color:#3d3530;">
              ${count}일 연속 체크인
            </div>
            <div style="font-size:12px;color:#a09890;margin-top:3px;">
              ${next ? `${next.emoji} ${next.name}까지 ${next.days-count}일 남았어요` : '👑 최고 기록 달성!'}
            </div>
          </div>
        </div>
        <div style="margin-top:10px;display:flex;gap:6px;">
          ${this.BADGES.map(b => `
            <div style="flex:1;text-align:center;padding:8px 4px;
                        background:${streak.badges?.includes(b.days)?'#3d3530':'#e8e3da'};
                        border-radius:10px;transition:all 0.2s;">
              <div style="font-size:16px;">${b.emoji}</div>
              <div style="font-size:9px;font-weight:700;
                          color:${streak.badges?.includes(b.days)?'#fff':'#a09890'};
                          margin-top:2px;">${b.days}일</div>
            </div>
          `).join('')}
        </div>
      `;
    });
  },

  // 초기화 시 렌더링
  init(uid) {
    if (!uid) return;
    this.renderStreakUI(uid);
  },
};

/* ════════════════════════════════════════
   3. 공동 기능 3종
   ① 가족 밸런스 게임
   ② 오늘의 한 장면 (사진/이모지)
   ③ 서로 맞히기 퀴즈
════════════════════════════════════════ */
const KyncTogether = {

  /* ─ ① 가족 밸런스 게임 ─ */
  BALANCE_Q: [
    { q:'오늘 하루 더 힘들었던 쪽은?',                    opts:['부모님','자녀'] },
    { q:'오늘 더 말하고 싶었던 쪽은?',                    opts:['부모님','자녀'] },
    { q:'지난주 더 많이 걱정했던 쪽은?',                  opts:['부모님','자녀'] },
    { q:'요즘 잠을 더 못 자는 쪽은?',                     opts:['부모님','자녀'] },
    { q:'먼저 "미안해"라고 말해야 하는 쪽은?',            opts:['부모님','자녀'] },
  ],

  openBalanceGame(myRole) {
    const q = this.BALANCE_Q[Math.floor(Date.now()/86400000) % this.BALANCE_Q.length];
    const familyCode = localStorage.getItem('kync_family_code');
    const todayKey   = new Date().toLocaleDateString('ko-KR');
    const storageKey = `kync_balance_${familyCode}_${todayKey}`;

    const modal = document.createElement('div');
    modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.45);
      z-index:9999;display:flex;align-items:flex-end;justify-content:center;`;

    const panel = document.createElement('div');
    panel.style.cssText = `background:#fff;border-radius:28px 28px 0 0;
      width:100%;max-width:430px;padding:32px 24px 48px;
      animation:slideUp 0.35s cubic-bezier(0.34,1.1,0.64,1);`;

    const saved = JSON.parse(localStorage.getItem(storageKey)||'{}');
    const myAnswer = saved[myRole];
    const theirAnswer = saved[myRole==='parent'?'child':'parent'];

    panel.innerHTML = `
      <div style="width:40px;height:4px;background:#e8e3da;border-radius:2px;margin:0 auto 24px;"></div>
      <div style="font-size:11px;font-weight:700;color:#c17f4a;letter-spacing:0.1em;margin-bottom:10px;">
        🎲 가족 밸런스 게임
      </div>
      <div style="font-size:20px;font-weight:800;color:#3d3530;margin-bottom:24px;line-height:1.4;">
        ${q.q}
      </div>
      ${myAnswer ? `
        <div style="background:#f5f2ed;border-radius:14px;padding:16px;margin-bottom:14px;">
          <div style="font-size:12px;color:#a09890;margin-bottom:6px;">내 답변</div>
          <div style="font-size:16px;font-weight:800;color:#3d3530;">${myAnswer}</div>
        </div>
        ${theirAnswer ? `
          <div style="background:#3d3530;border-radius:14px;padding:16px;margin-bottom:14px;">
            <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:6px;">
              ${myRole==='parent'?'자녀':'부모님'} 답변
            </div>
            <div style="font-size:16px;font-weight:800;color:#fff;">${theirAnswer}</div>
            <div style="font-size:13px;color:${myAnswer===theirAnswer?'#4a8c63':'#c17f4a'};margin-top:10px;font-weight:700;">
              ${myAnswer===theirAnswer?'😮 같은 생각이에요!':'🤔 서로 다르게 생각했네요'}
            </div>
          </div>
        ` : `
          <div style="background:#fdf1eb;border-radius:14px;padding:16px;text-align:center;
                      font-size:13px;color:#c17f4a;font-weight:700;margin-bottom:14px;">
            ${myRole==='parent'?'자녀':'부모님'}이 답하면 결과가 공개돼요
          </div>
        `}
      ` : `
        <div style="display:flex;gap:12px;margin-bottom:14px;">
          ${q.opts.map(opt => `
            <button onclick="KyncTogether.answerBalance('${opt}','${myRole}','${storageKey}')"
              style="flex:1;padding:18px;background:#f5f2ed;border:2px solid transparent;
                     border-radius:16px;font-size:15px;font-weight:800;color:#3d3530;
                     cursor:pointer;font-family:Nunito,sans-serif;transition:all 0.2s;"
              onmouseover="this.style.borderColor='#c17f4a'"
              onmouseout="this.style.borderColor='transparent'">
              ${opt==='부모님'?'👨‍👩‍👧':'🧑‍💻'} ${opt}
            </button>
          `).join('')}
        </div>
      `}
      <button onclick="this.closest('[style*=fixed]').remove()"
        style="width:100%;padding:12px;background:transparent;border:none;
               font-size:13px;color:#a09890;cursor:pointer;font-family:Nunito,sans-serif;">
        닫기
      </button>
    `;

    modal.appendChild(panel);
    modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
    modal.appendChild(panel);
    document.body.appendChild(modal);
  },

  async answerBalance(answer, myRole, storageKey) {
    const saved = JSON.parse(localStorage.getItem(storageKey)||'{}');
    saved[myRole] = answer;
    localStorage.setItem(storageKey, JSON.stringify(saved));

    // Firestore 저장
    const familyCode = localStorage.getItem('kync_family_code');
    if (familyCode && typeof db !== 'undefined') {
      try {
        await db.collection('families').doc(familyCode)
          .collection('balance')
          .doc(new Date().toLocaleDateString('ko-KR'))
          .set({ [myRole]: answer }, { merge: true });
      } catch(e) {}
    }

    if (typeof KyncDB !== 'undefined' && KyncAuth?.current) {
      await KyncDB.addPoints(KyncAuth.current.uid, 20);
    }

    document.querySelector('[style*="fixed"]')?.remove();
    this.openBalanceGame(myRole); // 리렌더
  },

  /* ─ ② 오늘의 한 장면 (이모지) ─ */
  SCENE_EMOJIS: [
    '😴','😤','😊','😢','🤔','😅','🥱','🎮',
    '📚','🍕','☕','🎵','🏃','💻','📱','🛋️',
    '😰','🌧️','☀️','🌙','🤗','😶','💪','🎯',
  ],

  openSceneModal(myRole) {
    const familyCode = localStorage.getItem('kync_family_code');
    const todayKey   = new Date().toLocaleDateString('ko-KR');
    const storageKey = `kync_scene_${familyCode}_${todayKey}`;
    const saved      = JSON.parse(localStorage.getItem(storageKey)||'{}');

    const modal = document.createElement('div');
    modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.45);
      z-index:9999;display:flex;align-items:flex-end;justify-content:center;`;

    const panel = document.createElement('div');
    panel.style.cssText = `background:#fff;border-radius:28px 28px 0 0;
      width:100%;max-width:430px;padding:28px 24px 48px;
      animation:slideUp 0.35s cubic-bezier(0.34,1.1,0.64,1);`;

    const myScene    = saved[myRole];
    const theirScene = saved[myRole==='parent'?'child':'parent'];

    panel.innerHTML = `
      <div style="width:40px;height:4px;background:#e8e3da;border-radius:2px;margin:0 auto 24px;"></div>
      <div style="font-size:11px;font-weight:700;color:#c17f4a;letter-spacing:0.1em;margin-bottom:8px;">
        📸 오늘의 한 장면
      </div>
      <div style="font-size:16px;font-weight:800;color:#3d3530;margin-bottom:20px;">
        오늘 하루를 이모지 하나로 표현해봐요
      </div>

      ${myScene ? `
        <div style="display:flex;gap:12px;margin-bottom:16px;">
          <div style="flex:1;background:#f5f2ed;border-radius:14px;padding:16px;text-align:center;">
            <div style="font-size:11px;color:#a09890;margin-bottom:8px;">나의 오늘</div>
            <div style="font-size:48px;">${myScene}</div>
          </div>
          <div style="flex:1;background:${theirScene?'#3d3530':'#f5f2ed'};border-radius:14px;padding:16px;text-align:center;">
            <div style="font-size:11px;color:${theirScene?'rgba(255,255,255,0.5)':'#a09890'};margin-bottom:8px;">
              ${myRole==='parent'?'자녀':'부모님'}의 오늘
            </div>
            <div style="font-size:${theirScene?'48':'22'}px;${theirScene?'':'opacity:0.3;'}">
              ${theirScene || '?'}
            </div>
          </div>
        </div>
        <div style="font-size:12px;color:#a09890;text-align:center;margin-bottom:16px;">
          ${theirScene ? '오늘 서로의 하루를 확인했어요 ✓' : '상대방이 선택하면 공개돼요'}
        </div>
      ` : `
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:16px;">
          ${this.SCENE_EMOJIS.map(em => `
            <button onclick="KyncTogether.selectScene('${em}','${myRole}','${storageKey}')"
              style="padding:10px;background:#f5f2ed;border:none;border-radius:10px;
                     font-size:22px;cursor:pointer;transition:transform 0.15s;"
              onmouseover="this.style.transform='scale(1.2)'"
              onmouseout="this.style.transform='scale(1)'">
              ${em}
            </button>
          `).join('')}
        </div>
      `}

      <button onclick="this.closest('[style*=fixed]').remove()"
        style="width:100%;padding:12px;background:transparent;border:none;
               font-size:13px;color:#a09890;cursor:pointer;font-family:Nunito,sans-serif;">
        닫기
      </button>
    `;

    modal.appendChild(panel);
    modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
    document.body.appendChild(modal);
  },

  async selectScene(emoji, myRole, storageKey) {
    const saved = JSON.parse(localStorage.getItem(storageKey)||'{}');
    saved[myRole] = emoji;
    localStorage.setItem(storageKey, JSON.stringify(saved));

    const familyCode = localStorage.getItem('kync_family_code');
    if (familyCode && typeof db !== 'undefined') {
      try {
        await db.collection('families').doc(familyCode)
          .collection('scenes')
          .doc(new Date().toLocaleDateString('ko-KR'))
          .set({ [myRole]: emoji }, { merge: true });
      } catch(e) {}
    }
    if (typeof KyncDB !== 'undefined' && KyncAuth?.current) {
      await KyncDB.addPoints(KyncAuth.current.uid, 15);
    }
    document.querySelector('[style*="fixed"]')?.remove();
    this.openSceneModal(myRole);
  },

  /* ─ ③ 서로 맞히기 퀴즈 ─ */
  QUIZ_Q: [
    { q:'요즘 내가 제일 좋아하는 음식은?',           type:'text' },
    { q:'요즘 내가 제일 힘든 시간대는?',              opts:['아침','낮','저녁','밤'] },
    { q:'지금 내 기분을 색으로 표현하면?',            opts:['빨강','파랑','노랑','초록','회색'] },
    { q:'요즘 내가 제일 하고 싶은 것은?',             type:'text' },
    { q:'요즘 내가 가장 듣고 싶은 말은?',             type:'text' },
    { q:'지금 나한테 필요한 것은?',                   opts:['혼자 있는 시간','누군가와 대화','맛있는 음식','충분한 잠'] },
  ],

  openQuizModal(myRole) {
    const familyCode = localStorage.getItem('kync_family_code');
    const weekKey    = `w${Math.floor(Date.now()/(86400000*7))}`;
    const qIdx       = Math.floor(Date.now()/(86400000*3)) % this.QUIZ_Q.length;
    const q          = this.QUIZ_Q[qIdx];
    const storageKey = `kync_quiz_${familyCode}_${weekKey}_${qIdx}`;
    const saved      = JSON.parse(localStorage.getItem(storageKey)||'{}');

    const modal = document.createElement('div');
    modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.45);
      z-index:9999;display:flex;align-items:flex-end;justify-content:center;`;

    const panel = document.createElement('div');
    panel.style.cssText = `background:#fff;border-radius:28px 28px 0 0;
      width:100%;max-width:430px;padding:32px 24px 48px;
      animation:slideUp 0.35s cubic-bezier(0.34,1.1,0.64,1);`;

    const myQ      = saved[`${myRole}_self`];   // 내 답변
    const theirQ   = saved[`${myRole}_guess`];  // 내가 상대방을 맞힌 답
    const theirSelf= saved[`${myRole==='parent'?'child':'parent'}_self`]; // 상대의 실제 답

    panel.innerHTML = `
      <div style="width:40px;height:4px;background:#e8e3da;border-radius:2px;margin:0 auto 24px;"></div>
      <div style="font-size:11px;font-weight:700;color:#c17f4a;letter-spacing:0.1em;margin-bottom:10px;">
        🤔 서로 맞히기 퀴즈
      </div>

      ${!myQ ? `
        <!-- STEP 1: 내 답변 먼저 -->
        <div style="font-size:18px;font-weight:800;color:#3d3530;margin-bottom:6px;line-height:1.4;">
          나에 대한 질문
        </div>
        <div style="font-size:16px;color:#6b6560;margin-bottom:20px;">${q.q}</div>
        ${q.opts ? `
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
            ${q.opts.map(opt => `
              <button onclick="KyncTogether.answerQuizSelf('${opt}','${myRole}','${storageKey}')"
                style="padding:14px;background:#f5f2ed;border:2px solid transparent;
                       border-radius:14px;font-size:14px;font-weight:700;color:#3d3530;
                       cursor:pointer;font-family:Nunito,sans-serif;text-align:left;
                       transition:all 0.15s;"
                onmouseover="this.style.borderColor='#c17f4a'"
                onmouseout="this.style.borderColor='transparent'">
                ${opt}
              </button>
            `).join('')}
          </div>
        ` : `
          <input id="quiz-self-input" type="text" maxlength="20" placeholder="답변을 입력해요..."
            style="width:100%;padding:16px;border:2px solid #e8e3da;border-radius:14px;
                   font-size:15px;font-family:Nunito,sans-serif;outline:none;
                   margin-bottom:14px;color:#3d3530;"
            onfocus="this.style.borderColor='#c17f4a'"
            onblur="this.style.borderColor='#e8e3da'">
          <button onclick="KyncTogether.answerQuizSelf(document.getElementById('quiz-self-input').value,'${myRole}','${storageKey}')"
            style="width:100%;padding:15px;background:#3d3530;color:#fff;border:none;
                   border-radius:14px;font-size:15px;font-weight:800;cursor:pointer;
                   font-family:Nunito,sans-serif;margin-bottom:14px;">
            내 답변 저장
          </button>
        `}
      ` : !theirQ ? `
        <!-- STEP 2: 상대방 맞히기 -->
        <div style="background:#f5f2ed;border-radius:14px;padding:14px;margin-bottom:18px;">
          <div style="font-size:11px;color:#a09890;margin-bottom:4px;">내 답변 (저장됨)</div>
          <div style="font-size:15px;font-weight:700;color:#3d3530;">${myQ}</div>
        </div>
        <div style="font-size:18px;font-weight:800;color:#3d3530;margin-bottom:6px;line-height:1.4;">
          이번엔 ${myRole==='parent'?'자녀':'부모님'}을 맞혀봐요
        </div>
        <div style="font-size:16px;color:#6b6560;margin-bottom:20px;">${q.q}</div>
        ${q.opts ? `
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
            ${q.opts.map(opt => `
              <button onclick="KyncTogether.answerQuizGuess('${opt}','${myRole}','${storageKey}')"
                style="padding:14px;background:#f5f2ed;border:2px solid transparent;
                       border-radius:14px;font-size:14px;font-weight:700;color:#3d3530;
                       cursor:pointer;font-family:Nunito,sans-serif;text-align:left;
                       transition:all 0.15s;"
                onmouseover="this.style.borderColor='#c17f4a'"
                onmouseout="this.style.borderColor='transparent'">
                ${opt}
              </button>
            `).join('')}
          </div>
        ` : `
          <input id="quiz-guess-input" type="text" maxlength="20"
            placeholder="${myRole==='parent'?'자녀':'부모님'}의 답을 예측해봐요..."
            style="width:100%;padding:16px;border:2px solid #e8e3da;border-radius:14px;
                   font-size:15px;font-family:Nunito,sans-serif;outline:none;
                   margin-bottom:14px;color:#3d3530;"
            onfocus="this.style.borderColor='#c17f4a'"
            onblur="this.style.borderColor='#e8e3da'">
          <button onclick="KyncTogether.answerQuizGuess(document.getElementById('quiz-guess-input').value,'${myRole}','${storageKey}')"
            style="width:100%;padding:15px;background:#3d3530;color:#fff;border:none;
                   border-radius:14px;font-size:15px;font-weight:800;cursor:pointer;
                   font-family:Nunito,sans-serif;margin-bottom:14px;">
            예측 저장
          </button>
        `}
      ` : `
        <!-- STEP 3: 결과 공개 -->
        <div style="font-size:16px;font-weight:800;color:#3d3530;margin-bottom:16px;">${q.q}</div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;">
          <div style="background:#f5f2ed;border-radius:14px;padding:14px;">
            <div style="font-size:11px;color:#a09890;margin-bottom:4px;">나의 답변</div>
            <div style="font-size:15px;font-weight:700;color:#3d3530;">${myQ}</div>
          </div>
          <div style="background:#f5f2ed;border-radius:14px;padding:14px;">
            <div style="font-size:11px;color:#a09890;margin-bottom:4px;">
              내가 예측한 ${myRole==='parent'?'자녀':'부모님'}의 답
            </div>
            <div style="font-size:15px;font-weight:700;color:#3d3530;">${theirQ}</div>
          </div>
          ${theirSelf ? `
            <div style="background:#3d3530;border-radius:14px;padding:14px;">
              <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:4px;">
                ${myRole==='parent'?'자녀':'부모님'}의 실제 답
              </div>
              <div style="font-size:15px;font-weight:700;color:#fff;">${theirSelf}</div>
            </div>
            <div style="text-align:center;padding:12px;border-radius:14px;
                        background:${theirQ===theirSelf?'#e2eed9':'#fdf1eb'};">
              <div style="font-size:22px;margin-bottom:4px;">
                ${theirQ===theirSelf?'🎯':'💭'}
              </div>
              <div style="font-size:14px;font-weight:800;
                          color:${theirQ===theirSelf?'#4a8c63':'#c17f4a'};">
                ${theirQ===theirSelf?'정답! 잘 알고 있었네요':'오답이지만, 서로를 더 알아가는 중'}
              </div>
            </div>
          ` : `
            <div style="background:#fdf1eb;border-radius:14px;padding:14px;text-align:center;
                        font-size:13px;color:#c17f4a;font-weight:700;">
              ${myRole==='parent'?'자녀':'부모님'}가 답하면 결과가 공개돼요
            </div>
          `}
        </div>
      `}

      <button onclick="this.closest('[style*=fixed]').remove()"
        style="width:100%;padding:12px;background:transparent;border:none;
               font-size:13px;color:#a09890;cursor:pointer;font-family:Nunito,sans-serif;">
        닫기
      </button>
    `;

    modal.appendChild(panel);
    modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
    document.body.appendChild(modal);
  },

  async answerQuizSelf(answer, myRole, storageKey) {
    if (!answer?.trim()) { alert('답변을 입력해주세요.'); return; }
    const saved = JSON.parse(localStorage.getItem(storageKey)||'{}');
    saved[`${myRole}_self`] = answer.trim();
    localStorage.setItem(storageKey, JSON.stringify(saved));
    await this._saveQuizToFirestore(storageKey, saved);
    document.querySelector('[style*="fixed"]')?.remove();
    this.openQuizModal(myRole);
  },

  async answerQuizGuess(answer, myRole, storageKey) {
    if (!answer?.trim()) { alert('예측을 입력해주세요.'); return; }
    const saved = JSON.parse(localStorage.getItem(storageKey)||'{}');
    saved[`${myRole}_guess`] = answer.trim();
    localStorage.setItem(storageKey, JSON.stringify(saved));
    await this._saveQuizToFirestore(storageKey, saved);
    if (typeof KyncDB !== 'undefined' && KyncAuth?.current) {
      await KyncDB.addPoints(KyncAuth.current.uid, 30);
    }
    document.querySelector('[style*="fixed"]')?.remove();
    this.openQuizModal(myRole);
  },

  async _saveQuizToFirestore(storageKey, data) {
    const familyCode = localStorage.getItem('kync_family_code');
    if (!familyCode || typeof db === 'undefined') return;
    try {
      await db.collection('families').doc(familyCode)
        .collection('together_quiz').doc(storageKey)
        .set(data, { merge: true });
    } catch(e) { console.warn(e); }
  },
};

/* ════════════════════════════════════════
   공통 CSS 애니메이션 주입
════════════════════════════════════════ */
(function injectStyles() {
  if (document.getElementById('kync-feature-styles')) return;
  const style = document.createElement('style');
  style.id = 'kync-feature-styles';
  style.textContent = `
    @keyframes slideUp {
      from { transform: translateY(100%); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    @keyframes slideDown {
      from { transform: translateX(-50%) translateY(-30px); opacity: 0; }
      to   { transform: translateX(-50%) translateY(0);     opacity: 1; }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes popIn {
      from { opacity: 0; transform: scale(0.5); }
      to   { opacity: 1; transform: scale(1);   }
    }
    @keyframes popUp {
      from { opacity: 0; transform: translateX(-50%) translateY(10px) scale(0.9); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0)     scale(1);  }
    }
    @keyframes bounce {
      0%,100% { transform: translateY(0); }
      40%     { transform: translateY(-16px); }
      70%     { transform: translateY(-6px);  }
    }
    @keyframes shake {
      0%,100% { transform: translateX(0); }
      20%,60% { transform: translateX(-6px); }
      40%,80% { transform: translateX(6px);  }
    }
  `;
  document.head.appendChild(style);
})();

/* 전역 노출 */
window.KyncPraise   = KyncPraise;
window.KyncStreak   = KyncStreak;
window.KyncTogether = KyncTogether; 