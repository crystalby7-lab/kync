/* ═══════════════════════════════════════════════════════════
   kync-quests2.js  —  퀘스트 두 가지 버전
   1) 직접 추가  2) Claude API 로 AI 생성
═══════════════════════════════════════════════════════════ */

const KyncQuests2 = {

  /* ── 직접 추가 가능한 퀘스트 탬플릿 ── */
  TEMPLATES: [
    { id:'t1', title:'하루 한 번 안부 묻기',     desc:'공부 얘기 없이 "오늘 어땠어?" 한 마디만. 3일.',   days:3  },
    { id:'t2', title:'밥 먹을 때 폰 내려놓기',   desc:'식사 중 둘 다 폰 없이. 7일.',                    days:7  },
    { id:'t3', title:'자기 전 잘 자 인사',        desc:'자기 전 짧은 인사 교환. 5일.',                    days:5  },
    { id:'t4', title:'칭찬 하나씩 매일',          desc:'오늘 상대에게서 좋았던 점 하나 말하기. 7일.',     days:7  },
    { id:'t5', title:'성적 얘기 없는 3일',        desc:'성적·공부량·학원 얘기 없이 대화. 3일.',          days:3  },
    { id:'t6', title:'10분 경청 타임',            desc:'일주일 2회, 10분 동안 끊지 않고 들어주기. 14일.',days:14 },
    { id:'t7', title:'좋았던 기억 하나씩',        desc:'함께했던 좋은 기억을 하나씩 꺼내기. 7일.',       days:7  },
    { id:'t8', title:'마음 편지 쓰기',            desc:'평소 못 했던 말을 짧은 편지로. 7일.',             days:7  },
  ],

  /* ── 열기 (탭 UI) ── */
  open(containerId, myRole) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const fc    = localStorage.getItem('kync_family_code') || 'local';
    const key   = `kync_quests2_${fc}`;
    const quests = JSON.parse(localStorage.getItem(key) || '[]');

    el.innerHTML = `
      <!-- 탭 헤더 -->
      <div style="display:flex;gap:8px;margin-bottom:16px;">
        <button onclick="KyncQuests2._tab('direct','${containerId}','${myRole}')" id="qt-direct"
          style="flex:1;padding:11px;border-radius:12px;border:none;
                 background:#3d3530;color:#fff;font-size:13px;font-weight:800;
                 cursor:pointer;font-family:Nunito,sans-serif;">직접 추가</button>
        <button onclick="KyncQuests2._tab('ai','${containerId}','${myRole}')" id="qt-ai"
          style="flex:1;padding:11px;border-radius:12px;border:1.5px solid #e8e3da;
                 background:#fff;color:#6b6560;font-size:13px;font-weight:800;
                 cursor:pointer;font-family:Nunito,sans-serif;">AI 생성</button>
      </div>

      <!-- 패널 -->
      <div id="qt-panel"></div>

      <!-- 진행 중인 퀘스트 -->
      <div id="qt-active" style="margin-top:20px;">
        ${this._renderActive(quests, myRole)}
      </div>`;

    this._tab('direct', containerId, myRole);
  },

  /* ── 탭 전환 ── */
  _tab(tab, containerId, myRole) {
    const dBtn = document.getElementById('qt-direct');
    const aBtn = document.getElementById('qt-ai');
    if (dBtn) { dBtn.style.background = tab==='direct'?'#3d3530':'#fff'; dBtn.style.color = tab==='direct'?'#fff':'#6b6560'; dBtn.style.border = tab==='direct'?'none':'1.5px solid #e8e3da'; }
    if (aBtn) { aBtn.style.background = tab==='ai'?'#3d3530':'#fff';     aBtn.style.color = tab==='ai'?'#fff':'#6b6560';     aBtn.style.border = tab==='ai'?'none':'1.5px solid #e8e3da'; }

    const panel = document.getElementById('qt-panel');
    if (!panel) return;

    if (tab === 'direct') {
      panel.innerHTML = `
        <div style="font-size:12px;color:#a09890;margin-bottom:10px;font-weight:600;">
          템플릿에서 고르거나 직접 입력해요
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">
          ${this.TEMPLATES.map(t=>`
            <button onclick="KyncQuests2.addFromTemplate('${t.id}','${myRole}')"
              style="padding:14px 16px;background:#fff;border:1.5px solid #e8e3da;
                     border-radius:14px;text-align:left;cursor:pointer;
                     font-family:Nunito,sans-serif;transition:all 0.15s;"
              onmouseover="this.style.borderColor='#3d3530'"
              onmouseout="this.style.borderColor='#e8e3da'">
              <div style="font-size:14px;font-weight:800;color:#3d3530;margin-bottom:3px;">${t.title}</div>
              <div style="font-size:12px;color:#a09890;">${t.desc}</div>
            </button>
          `).join('')}
        </div>
        <div style="font-size:12px;color:#a09890;margin-bottom:8px;font-weight:600;">직접 입력</div>
        <input id="qt-custom-title" placeholder="퀘스트 제목"
          style="width:100%;padding:13px 16px;border:1.5px solid #e8e3da;border-radius:12px;
                 font-size:14px;font-family:Nunito,sans-serif;outline:none;
                 margin-bottom:8px;color:#3d3530;box-sizing:border-box;">
        <textarea id="qt-custom-desc" placeholder="어떻게 할 건지 설명..."
          style="width:100%;padding:13px 16px;border:1.5px solid #e8e3da;border-radius:12px;
                 font-size:13px;font-family:Nunito,sans-serif;outline:none;resize:none;
                 height:70px;margin-bottom:8px;color:#3d3530;box-sizing:border-box;"></textarea>
        <div style="display:flex;gap:8px;margin-bottom:14px;">
          <input id="qt-custom-days" type="number" min="1" max="30" value="7" placeholder="기간(일)"
            style="width:90px;padding:13px;border:1.5px solid #e8e3da;border-radius:12px;
                   font-size:14px;font-family:Nunito,sans-serif;outline:none;text-align:center;">
          <button onclick="KyncQuests2.addCustom('${myRole}')"
            style="flex:1;padding:13px;background:#c17f4a;color:#fff;border:none;
                   border-radius:12px;font-size:14px;font-weight:800;cursor:pointer;
                   font-family:Nunito,sans-serif;">추가하기</button>
        </div>`;
    } else {
      panel.innerHTML = `
        <div style="background:#f5f2ed;border-radius:16px;padding:18px;text-align:center;margin-bottom:14px;">
          <div style="font-size:13px;color:#6b6560;line-height:1.75;margin-bottom:14px;">
            체크인 기록과 대화 유형 검사 결과를 바탕으로<br>AI가 우리 가족에게 맞는 퀘스트를 만들어줘요.
          </div>
          <button onclick="KyncQuests2.generateAI('${myRole}')" id="qt-ai-btn"
            style="padding:14px 28px;background:#3d3530;color:#fff;border:none;
                   border-radius:14px;font-size:14px;font-weight:800;cursor:pointer;
                   font-family:Nunito,sans-serif;">
            AI 퀘스트 만들기
          </button>
        </div>
        <div id="qt-ai-result"></div>`;
    }
  },

  /* ── 템플릿으로 추가 ── */
  addFromTemplate(templateId, myRole) {
    const t = this.TEMPLATES.find(t=>t.id===templateId);
    if (!t) return;
    this._addQuest({ title:t.title, desc:t.desc, days:t.days }, myRole);
  },

  /* ── 직접 입력 추가 ── */
  addCustom(myRole) {
    const title = document.getElementById('qt-custom-title')?.value?.trim();
    const desc  = document.getElementById('qt-custom-desc')?.value?.trim();
    const days  = parseInt(document.getElementById('qt-custom-days')?.value) || 7;
    if (!title) { alert('퀘스트 제목을 입력해주세요.'); return; }
    this._addQuest({ title, desc: desc||'', days }, myRole);
  },

  /* ── AI 생성 ── */
  async generateAI(myRole) {
    const btn = document.getElementById('qt-ai-btn');
    const result = document.getElementById('qt-ai-result');
    if (!btn || !result) return;

    btn.textContent = '생성 중...';
    btn.disabled = true;

    // 컨텍스트 수집
    const quizResult  = JSON.parse(localStorage.getItem('kync_quiz_result') || '{}');
    const streakKey   = `kync_streak_${KyncAuth?.current?.uid||''}`;
    const streakData  = JSON.parse(localStorage.getItem(streakKey) || '{"count":0}');
    const fc          = localStorage.getItem('kync_family_code') || 'local';
    const diaryArr    = JSON.parse(localStorage.getItem(`kync_diary_${fc}`) || '[]');
    const recentMoods = diaryArr.slice(0,5).map(d=>d.emotion).filter(Boolean).join(', ') || '없음';

    const prompt = `당신은 가족 소통 전문 코치입니다.
아래 정보를 바탕으로 이 가족에게 딱 맞는 소통 퀘스트 3개를 만들어주세요.

- 역할: ${myRole==='parent'?'부모':'자녀'}
- 대화 유형: ${quizResult.type || '미검사'}
- 연속 사용일: ${streakData.count||0}일
- 최근 감정: ${recentMoods}

조건:
1. 각 퀘스트는 title(15자 이내), desc(40자 이내), days(3~14) 포함
2. 부담 없이 실천 가능한 것으로
3. 반드시 JSON 배열만 반환 (다른 텍스트 없이)

예시 형식:
[{"title":"하루 한 번 칭찬","desc":"오늘 상대에게서 좋았던 점 하나 말하기","days":7}]`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || '[]';
      const clean = text.replace(/```json|```/g,'').trim();
      const quests = JSON.parse(clean);

      result.innerHTML = `
        <div style="font-size:12px;color:#a09890;margin-bottom:10px;font-weight:600;">
          AI가 추천하는 퀘스트
        </div>
        ${quests.map((q,i)=>`
          <div style="background:#fff;border:1.5px solid #e8e3da;border-radius:14px;
                      padding:14px 16px;margin-bottom:8px;">
            <div style="font-size:14px;font-weight:800;color:#3d3530;margin-bottom:4px;">${q.title}</div>
            <div style="font-size:12px;color:#a09890;margin-bottom:10px;">${q.desc} · ${q.days}일</div>
            <button onclick="KyncQuests2._addQuest({title:'${q.title.replace(/'/g,"\\'")}',desc:'${(q.desc||'').replace(/'/g,"\\'")}',days:${q.days}},'${myRole}')"
              style="padding:10px 18px;background:#3d3530;color:#fff;border:none;
                     border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;
                     font-family:Nunito,sans-serif;">추가하기</button>
          </div>
        `).join('')}`;
    } catch(e) {
      result.innerHTML = `<div style="background:#fdf2ec;border-radius:14px;padding:16px;
        font-size:13px;color:#e08060;font-weight:600;text-align:center;">
        AI 연결에 실패했어요.<br>직접 추가 탭을 이용해주세요.</div>`;
    }

    btn.textContent = 'AI 퀘스트 만들기';
    btn.disabled = false;
  },

  /* ── 퀘스트 저장 ── */
  async _addQuest(q, myRole) {
    const fc    = localStorage.getItem('kync_family_code') || 'local';
    const key   = `kync_quests2_${fc}`;
    const arr   = JSON.parse(localStorage.getItem(key) || '[]');

    const newQ = {
      id:      'q_' + Date.now(),
      title:   q.title,
      desc:    q.desc,
      days:    q.days,
      status:  'pending',
      agreed:  { parent: false, child: false },
      createdBy: myRole,
      createdAt: new Date().toLocaleDateString('ko-KR'),
    };
    arr.unshift(newQ);
    localStorage.setItem(key, JSON.stringify(arr));

    // Firestore
    if (fc !== 'local' && typeof db !== 'undefined') {
      try {
        await db.collection('families').doc(fc)
          .collection('quests2').doc(newQ.id).set(newQ);
      } catch(e) { console.warn(e); }
    }

    // 알림
    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed;bottom:110px;left:50%;transform:translateX(-50%);
      background:#3d3530;color:#fff;padding:13px 24px;border-radius:20px;
      font-size:14px;font-weight:700;z-index:9999;font-family:Nunito,sans-serif;
      white-space:nowrap;`;
    toast.textContent = `"${q.title}" 추가됐어요!`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2200);

    // 활동 섹션 새로고침
    const activeEl = document.getElementById('qt-active');
    if (activeEl) activeEl.innerHTML = this._renderActive(arr, myRole);
  },

  /* ── 동의 처리 ── */
  async agree(questId, myRole) {
    const fc  = localStorage.getItem('kync_family_code') || 'local';
    const key = `kync_quests2_${fc}`;
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    const q   = arr.find(x=>x.id===questId);
    if (!q) return;

    q.agreed[myRole] = true;
    if (q.agreed.parent && q.agreed.child) {
      q.status    = 'active';
      q.startDate = new Date().toLocaleDateString('ko-KR');
      this._popBothAgreed(q.title);
    }
    localStorage.setItem(key, JSON.stringify(arr));

    if (fc !== 'local' && typeof db !== 'undefined') {
      try {
        await db.collection('families').doc(fc)
          .collection('quests2').doc(questId)
          .set({ agreed: q.agreed, status: q.status }, { merge: true });
      } catch(e) {}
    }

    const activeEl = document.getElementById('qt-active');
    if (activeEl) activeEl.innerHTML = this._renderActive(arr, myRole);
  },

  _popBothAgreed(title) {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);
      z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;`;
    el.innerHTML = `
      <div style="background:#fff;border-radius:28px;padding:36px 28px;
                  text-align:center;max-width:320px;width:100%;">
        <div style="width:60px;height:60px;border-radius:50%;background:#3d3530;
                    display:flex;align-items:center;justify-content:center;
                    font-size:22px;font-weight:800;color:#c17f4a;margin:0 auto 16px;">✓</div>
        <div style="font-size:20px;font-weight:900;color:#3d3530;margin-bottom:8px;">퀘스트 시작!</div>
        <div style="font-size:14px;font-weight:700;color:#6b6560;margin-bottom:20px;">"${title}"</div>
        <button onclick="this.closest('[style*=fixed]').remove()"
          style="padding:14px 32px;background:#3d3530;color:#fff;border:none;
                 border-radius:14px;font-size:15px;font-weight:800;cursor:pointer;
                 font-family:Nunito,sans-serif;">시작하기</button>
      </div>`;
    el.onclick = e => { if(e.target===el) el.remove(); };
    document.body.appendChild(el);
  },

  /* ── 진행 중 퀘스트 렌더 ── */
  _renderActive(quests, myRole) {
    if (!quests.length) return `
      <div style="background:#f5f2ed;border-radius:16px;padding:20px;text-align:center;
                  font-size:13px;color:#a09890;">
        아직 퀘스트가 없어요.<br>위에서 추가해봐요!
      </div>`;

    return `
      <div style="font-size:12px;color:#a09890;margin-bottom:10px;font-weight:700;
                  letter-spacing:0.06em;">추가된 퀘스트</div>
      ${quests.slice(0,10).map(q => {
        const myAgreed    = q.agreed?.[myRole];
        const theirAgreed = q.agreed?.[myRole==='parent'?'child':'parent'];
        const isActive    = q.status === 'active';

        return `
          <div style="background:#fff;border:1.5px solid ${isActive?'#c17f4a':'#e8e3da'};
                      border-radius:16px;padding:16px;margin-bottom:10px;">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px;">
              <div style="font-size:15px;font-weight:800;color:#3d3530;flex:1;">${q.title}</div>
              ${isActive ? `<div style="background:#fdf1eb;color:#c17f4a;font-size:10px;
                font-weight:800;padding:4px 10px;border-radius:20px;flex-shrink:0;">진행 중</div>` : ''}
            </div>
            <div style="font-size:12px;color:#a09890;margin-bottom:10px;">${q.desc} · ${q.days}일</div>
            <div style="display:flex;gap:6px;margin-bottom:10px;">
              <div style="flex:1;padding:7px;background:${q.agreed?.parent?'#3d3530':'#f5f2ed'};
                          border-radius:8px;text-align:center;">
                <div style="font-size:9px;font-weight:700;color:${q.agreed?.parent?'rgba(255,255,255,0.5)':'#a09890'};">부모님</div>
                <div style="font-size:12px;font-weight:800;color:${q.agreed?.parent?'#c17f4a':'#d4cdc2'};">
                  ${q.agreed?.parent?'동의':'—'}
                </div>
              </div>
              <div style="flex:1;padding:7px;background:${q.agreed?.child?'#3d3530':'#f5f2ed'};
                          border-radius:8px;text-align:center;">
                <div style="font-size:9px;font-weight:700;color:${q.agreed?.child?'rgba(255,255,255,0.5)':'#a09890'};">자녀</div>
                <div style="font-size:12px;font-weight:800;color:${q.agreed?.child?'#c17f4a':'#d4cdc2'};">
                  ${q.agreed?.child?'동의':'—'}
                </div>
              </div>
            </div>
            ${myAgreed ? `
              <div style="text-align:center;font-size:12px;color:#c17f4a;font-weight:600;">
                ${isActive?'진행 중이에요!':'상대방이 동의하면 시작돼요'}
              </div>` : `
              <button onclick="KyncQuests2.agree('${q.id}','${myRole}')"
                style="width:100%;padding:12px;background:#3d3530;color:#fff;border:none;
                       border-radius:12px;font-size:13px;font-weight:800;cursor:pointer;
                       font-family:Nunito,sans-serif;">동의하고 시작하기</button>`}
          </div>`;
      }).join('')}`;
  },

  /* ── 초기화 ── */
  init(containerId, myRole) {
    this.open(containerId, myRole);
    // Firestore 실시간 동기화
    const fc = localStorage.getItem('kync_family_code');
    if (fc && typeof db !== 'undefined') {
      db.collection('families').doc(fc).collection('quests2')
        .onSnapshot(snap => {
          const key = `kync_quests2_${fc}`;
          const local = JSON.parse(localStorage.getItem(key) || '[]');
          let changed = false;
          snap.docChanges().forEach(ch => {
            const remote = ch.doc.data();
            const idx = local.findIndex(q=>q.id===remote.id);
            if (idx<0) { local.unshift(remote); changed=true; }
            else if (JSON.stringify(local[idx].agreed) !== JSON.stringify(remote.agreed)) {
              local[idx].agreed = remote.agreed;
              local[idx].status = remote.status || local[idx].status;
              changed = true;
            }
          });
          if (changed) {
            localStorage.setItem(key, JSON.stringify(local));
            const activeEl = document.getElementById('qt-active');
            if (activeEl) activeEl.innerHTML = this._renderActive(local, myRole);
          }
        });
    }
  },
};

window.KyncQuests2 = KyncQuests2; 