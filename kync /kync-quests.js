/* ═══════════════════════════════════════════════════════════
   kync-quests.js — 조건 기반 맞춤 퀘스트 시스템
   대화 유형 검사 결과 + 체크인 데이터로 퀘스트 자동 선택
═══════════════════════════════════════════════════════════ */

const KyncQuests = {

  // ── 퀘스트 풀 (난이도별 3단계) ──────────────────────────
  POOL: [

    /* ── 레벨 1: 쉬운 것부터 ── */
    {
      id: 'q_hello_1',
      level: 1,
      tag: ['소통부재','첫시작'],
      title: '하루 한 번, 안부만 묻기',
      desc: '공부 얘기 없이 "오늘 어땠어?" 한 마디만. 3일간.',
      days: 3,
      parentAction: '공부/성적 얘기 없이 안부 한 마디',
      childAction: '짧게라도 한 마디로 답하기',
      checkItems: ['공부 관련 질문 안 하기', '판단하는 말 안 하기'],
    },
    {
      id: 'q_meal_1',
      level: 1,
      tag: ['소통부재','일상'],
      title: '같이 밥 먹을 때 폰 내려놓기',
      desc: '밥 먹는 동안 각자 폰 없이. 7일간.',
      days: 7,
      parentAction: '식사 중 폰 사용 안 하기',
      childAction: '식사 중 폰 사용 안 하기',
      checkItems: ['밥상에서 폰 내려놓기', '짧은 대화라도 나누기'],
    },
    {
      id: 'q_goodnight_1',
      level: 1,
      tag: ['감정표현','첫시작'],
      title: '자기 전 한 마디',
      desc: '"잘 자" 혹은 "수고했어" — 자기 전 짧은 인사. 5일간.',
      days: 5,
      parentAction: '자기 전 잘 자 인사 전하기',
      childAction: '부모님 인사에 짧게라도 답하기',
      checkItems: ['매일 자기 전 인사', '억지로가 아닌 진심으로'],
    },

    /* ── 레벨 2: 조금 더 깊이 ── */
    {
      id: 'q_praise_2',
      level: 2,
      tag: ['감정표현','신뢰'],
      title: '하루 칭찬 하나씩',
      desc: '오늘 상대방에게서 좋았던 점 하나를 말로 전하기. 7일간.',
      days: 7,
      parentAction: '자녀의 노력한 점 하나 칭찬하기',
      childAction: '부모님께 감사한 점 하나 말하기',
      checkItems: ['구체적으로 칭찬하기 ("열심히 했네" 말고 "그 부분 잘했어")'],
    },
    {
      id: 'q_share_2',
      level: 2,
      tag: ['소통부재','이해'],
      title: '오늘 가장 힘들었던 순간 나누기',
      desc: '각자 오늘 하루에서 힘들었던 순간을 하나씩. 5일간.',
      days: 5,
      parentAction: '내 힘든 순간 솔직하게 나누기',
      childAction: '내 힘든 순간 솔직하게 나누기',
      checkItems: ['해결책 제시 말고 들어주기', '판단 없이 공감하기'],
    },
    {
      id: 'q_nokids_2',
      level: 2,
      tag: ['성적압박','신뢰'],
      title: '성적 얘기 없는 3일',
      desc: '3일 동안 성적·공부량·학원 얘기 없이 대화하기.',
      days: 3,
      parentAction: '성적/공부 관련 말 꺼내지 않기',
      childAction: '성적 빼고 나의 하루 이야기 나누기',
      checkItems: ['성적/학원/공부 언급 금지', '다른 주제로 대화 시도'],
    },
    {
      id: 'q_memory_2',
      level: 2,
      tag: ['이해','유대'],
      title: '좋았던 기억 하나씩',
      desc: '함께했던 좋은 기억을 하나씩 꺼내 이야기하기. 일주일.',
      days: 7,
      parentAction: '자녀와 함께한 좋은 기억 하나 꺼내기',
      childAction: '가족과 함께한 좋은 기억 하나 꺼내기',
      checkItems: ['과거 이야기 꺼내기', '그때 감정도 같이 나누기'],
    },

    /* ── 레벨 3: 깊은 연결 ── */
    {
      id: 'q_listen_3',
      level: 3,
      tag: ['이해','소통부재'],
      title: '10분 경청 타임',
      desc: '일주일에 2번, 10분 동안 상대 말만 듣기. 끼어들기 없이.',
      days: 14,
      parentAction: '10분 동안 끼어들지 않고 듣기만 하기',
      childAction: '10분 동안 솔직하게 이야기하기',
      checkItems: ['조언·해결책 없이 듣기', '들은 내용 한 마디로 되짚어주기'],
    },
    {
      id: 'q_letter_3',
      level: 3,
      tag: ['감정표현','유대'],
      title: '마음 편지 쓰기',
      desc: '서로에게 짧은 편지 한 통씩. 평소 못 했던 말을.',
      days: 7,
      parentAction: '자녀에게 편지 한 통 쓰기 (Kync 답변으로)',
      childAction: '부모님께 편지 한 통 쓰기 (Kync 답변으로)',
      checkItems: ['"요즘 어떤 것 때문에 힘들어하는지 알고 있어"', '구체적인 감사 표현'],
    },
    {
      id: 'q_future_3',
      level: 3,
      tag: ['이해','유대'],
      title: '서로의 꿈 들어주기',
      desc: '각자 5년 후 어떤 모습이고 싶은지 나누기. 판단 없이.',
      days: 7,
      parentAction: '자녀 꿈 들어주기 — "그럼 어떻게 해야 해?"는 금지',
      childAction: '내 진짜 꿈 솔직하게 말하기',
      checkItems: ['현실적인 조언 금지', '공감과 응원만'],
    },
  ],

  // ── 퀘스트 선택 로직 ─────────────────────────────────────
  selectQuests(profile) {
    /*
      profile = {
        role,               // 'parent' | 'child'
        quizType,           // 대화 유형 검사 결과 타입명
        quizScores,         // { directness, emotion, orientation, initiative }
        avgStress,          // 최근 7일 평균 스트레스 (1~10)
        streakDays,         // 연속 사용일
        completedIds,       // 완료한 퀘스트 id 배열
      }
    */
    const tags = this._inferTags(profile);
    const level = this._inferLevel(profile);

    // 태그 매칭 + 레벨 필터 + 완료 제외
    let candidates = this.POOL.filter(q =>
      q.level <= level + 1 &&                        // 현재 레벨 ± 1
      !profile.completedIds?.includes(q.id) &&       // 완료 제외
      q.tag.some(t => tags.includes(t))              // 태그 매칭
    );

    // 후보 없으면 전체에서
    if (candidates.length === 0) {
      candidates = this.POOL.filter(q =>
        !profile.completedIds?.includes(q.id)
      );
    }

    // 최대 3개 선택 (레벨 낮은 것 우선)
    return candidates
      .sort((a, b) => a.level - b.level)
      .slice(0, 3)
      .map(q => ({
        ...q,
        status: 'pending',
        agreed: { parent: false, child: false },
        createdAt: new Date().toLocaleDateString('ko-KR'),
      }));
  },

  _inferTags(profile) {
    const tags = [];
    const s = profile.quizScores || {};

    // 감정 표현 낮으면
    if ((s.emotion || 5) < 4) tags.push('감정표현');
    // 직접성 낮으면 소통 문제
    if ((s.directness || 5) < 4) tags.push('소통부재');
    // 스트레스 높으면
    if ((profile.avgStress || 5) >= 7) tags.push('성적압박');
    // 스트릭 낮으면 첫 시작
    if ((profile.streakDays || 0) < 3) tags.push('첫시작');
    // 기본 태그
    tags.push('이해', '유대', '신뢰');

    return [...new Set(tags)];
  },

  _inferLevel(profile) {
    const streak = profile.streakDays || 0;
    const completed = profile.completedIds?.length || 0;
    if (streak < 3 || completed === 0) return 1;
    if (streak < 14 || completed < 2) return 2;
    return 3;
  },

  // ── UI 렌더링 ─────────────────────────────────────────────
  async render(containerId, role) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div style="text-align:center;padding:24px;color:#a09890;font-size:13px;">
        퀘스트를 불러오는 중...
      </div>`;

    // 프로필 구성
    const uid         = KyncAuth?.current?.uid || localStorage.getItem('kync_user_uid');
    const familyCode  = localStorage.getItem('kync_family_code');
    const streakKey   = `kync_streak_${uid}`;
    const streakData  = JSON.parse(localStorage.getItem(streakKey) || '{"count":0}');
    const quizResult  = JSON.parse(localStorage.getItem('kync_quiz_result') || '{}');
    const completedKey = `kync_quests_done_${familyCode}`;
    const completedIds = JSON.parse(localStorage.getItem(completedKey) || '[]');

    // 저장된 퀘스트 있으면 불러오기
    const savedKey    = `kync_quests_${familyCode}`;
    let quests        = JSON.parse(localStorage.getItem(savedKey) || 'null');

    if (!quests || quests.length === 0) {
      // 새로 생성
      const profile = {
        role,
        quizType:     quizResult.type || '',
        quizScores:   quizResult.scores || {},
        avgStress:    5,
        streakDays:   streakData.count || 0,
        completedIds,
      };
      quests = this.selectQuests(profile);
      localStorage.setItem(savedKey, JSON.stringify(quests));

      // Firestore에도 저장
      if (familyCode && typeof db !== 'undefined') {
        try {
          const batch = db.batch();
          quests.forEach(q => {
            const ref = db.collection('families').doc(familyCode)
              .collection('quests').doc(q.id);
            batch.set(ref, q);
          });
          await batch.commit();
        } catch(e) { console.warn('Firestore 저장 실패:', e); }
      }
    }

    // 렌더
    container.innerHTML = '';

    // AI 분석 배지
    container.innerHTML += `
      <div style="background:#f5f2ed;border-radius:14px;padding:14px 16px;
                  display:flex;align-items:center;gap:12px;margin-bottom:14px;">
        <div style="width:36px;height:36px;border-radius:10px;background:#3d3530;
                    display:flex;align-items:center;justify-content:center;
                    font-size:14px;font-weight:800;color:#fff;flex-shrink:0;">◈</div>
        <div>
          <div style="font-size:13px;font-weight:800;color:#3d3530;">맞춤 퀘스트</div>
          <div style="font-size:11px;color:#a09890;margin-top:2px;">
            대화 유형 검사 + 체크인 기록을 바탕으로 선택했어요
          </div>
        </div>
      </div>`;

    quests.forEach(q => {
      const myAgreed    = q.agreed?.[role] || false;
      const theirAgreed = q.agreed?.[role==='parent'?'child':'parent'] || false;
      const isActive    = q.status === 'active';
      const isDone      = q.status === 'done';
      const bothAgreed  = q.agreed?.parent && q.agreed?.child;

      let statusBadge = '';
      if (isDone)        statusBadge = `<div style="background:#e2eed9;color:#4a8c63;font-size:10px;font-weight:800;padding:4px 10px;border-radius:20px;">완료</div>`;
      else if (isActive) statusBadge = `<div style="background:#fdf1eb;color:#c17f4a;font-size:10px;font-weight:800;padding:4px 10px;border-radius:20px;">진행 중</div>`;
      else if (bothAgreed) statusBadge = `<div style="background:#fdf1eb;color:#c17f4a;font-size:10px;font-weight:800;padding:4px 10px;border-radius:20px;">시작 대기</div>`;

      container.innerHTML += `
        <div style="background:#fff;border-radius:20px;padding:20px;
                    border:1.5px solid ${isActive?'#c17f4a':'#e8e3da'};
                    margin-bottom:12px;">

          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;">
            <div style="font-size:10px;font-weight:800;color:#a09890;
                        letter-spacing:0.08em;margin-top:2px;">
              LEVEL ${q.level} · ${q.days}일
            </div>
            ${statusBadge}
          </div>

          <div style="font-size:17px;font-weight:800;color:#3d3530;margin-bottom:6px;">
            ${q.title}
          </div>
          <div style="font-size:13px;color:#6b6560;line-height:1.65;margin-bottom:14px;">
            ${q.desc}
          </div>

          <!-- 내가 할 것 -->
          <div style="background:#f5f2ed;border-radius:12px;padding:12px 14px;margin-bottom:8px;">
            <div style="font-size:10px;font-weight:700;color:#a09890;margin-bottom:4px;">
              ${role==='parent'?'부모님':'자녀'}가 할 것
            </div>
            <div style="font-size:13px;color:#3d3530;font-weight:600;">
              ${role==='parent'?q.parentAction:q.childAction}
            </div>
          </div>

          <!-- 상대가 할 것 -->
          <div style="background:#f5f2ed;border-radius:12px;padding:12px 14px;margin-bottom:14px;">
            <div style="font-size:10px;font-weight:700;color:#a09890;margin-bottom:4px;">
              ${role==='parent'?'자녀':'부모님'}가 할 것
            </div>
            <div style="font-size:13px;color:#3d3530;font-weight:600;">
              ${role==='parent'?q.childAction:q.parentAction}
            </div>
          </div>

          <!-- 동의 현황 -->
          <div style="display:flex;gap:8px;margin-bottom:12px;">
            <div style="flex:1;padding:8px;background:${q.agreed?.parent?'#3d3530':'#f5f2ed'};
                        border-radius:10px;text-align:center;">
              <div style="font-size:10px;font-weight:700;color:${q.agreed?.parent?'rgba(255,255,255,0.5)':'#a09890'};">부모님</div>
              <div style="font-size:13px;font-weight:800;color:${q.agreed?.parent?'#c17f4a':'#d4cdc2'};">
                ${q.agreed?.parent?'동의 완료':'—'}
              </div>
            </div>
            <div style="flex:1;padding:8px;background:${q.agreed?.child?'#3d3530':'#f5f2ed'};
                        border-radius:10px;text-align:center;">
              <div style="font-size:10px;font-weight:700;color:${q.agreed?.child?'rgba(255,255,255,0.5)':'#a09890'};">자녀</div>
              <div style="font-size:13px;font-weight:800;color:${q.agreed?.child?'#c17f4a':'#d4cdc2'};">
                ${q.agreed?.child?'동의 완료':'—'}
              </div>
            </div>
          </div>

          <!-- 동의/완료 버튼 -->
          ${isDone ? `
            <div style="text-align:center;padding:12px;background:#e2eed9;border-radius:12px;
                        font-size:13px;font-weight:700;color:#4a8c63;">
              완료했어요! 다음 퀘스트로 넘어가요
            </div>
          ` : myAgreed ? `
            <div style="text-align:center;padding:12px;background:#fdf1eb;border-radius:12px;
                        font-size:13px;color:#c17f4a;font-weight:700;">
              ${bothAgreed ? '양쪽 모두 동의! 시작해봐요' : '상대방이 동의하면 시작돼요'}
            </div>
          ` : `
            <button onclick="KyncQuests.agree('${q.id}','${role}')"
              style="width:100%;padding:14px;background:#3d3530;color:#fff;border:none;
                     border-radius:14px;font-size:14px;font-weight:800;cursor:pointer;
                     font-family:Nunito,sans-serif;transition:all 0.2s;">
              동의하고 시작하기
            </button>
          `}
        </div>
      `;
    });

    // 퀘스트 새로고침 버튼
    container.innerHTML += `
      <button onclick="KyncQuests.refresh('${containerId}','${role}')"
        style="width:100%;padding:13px;background:transparent;border:1.5px solid #e8e3da;
               border-radius:14px;font-size:13px;font-weight:700;color:#a09890;
               cursor:pointer;font-family:Nunito,sans-serif;margin-top:4px;">
        다른 퀘스트 보기
      </button>`;
  },

  // ── 동의 처리 ──
  async agree(questId, role) {
    const familyCode = localStorage.getItem('kync_family_code');
    const savedKey   = `kync_quests_${familyCode}`;
    const quests     = JSON.parse(localStorage.getItem(savedKey) || '[]');

    const q = quests.find(q => q.id === questId);
    if (!q) return;

    q.agreed[role] = true;

    // 양쪽 동의 시 활성화
    if (q.agreed.parent && q.agreed.child) {
      q.status    = 'active';
      q.startDate = new Date().toLocaleDateString('ko-KR');
      this._showAgreementPopup(q);
    }

    localStorage.setItem(savedKey, JSON.stringify(quests));

    // Firestore
    if (familyCode && typeof db !== 'undefined') {
      try {
        await db.collection('families').doc(familyCode)
          .collection('quests').doc(questId)
          .set({ agreed: q.agreed, status: q.status, startDate: q.startDate || null }, { merge: true });
      } catch(e) { console.warn(e); }
    }

    // 포인트
    if (typeof KyncDB !== 'undefined' && KyncAuth?.current) {
      await KyncDB.addPoints(KyncAuth.current.uid, 30);
    }

    // 리렌더
    const containerId = role === 'parent' ? 'p-quest-list' : 'c-quest-list';
    this.render(containerId, role);
  },

  _showAgreementPopup(quest) {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);
      z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;`;
    el.innerHTML = `
      <div style="background:#fff;border-radius:28px;padding:36px 28px;
                  text-align:center;max-width:320px;width:100%;">
        <div style="width:60px;height:60px;border-radius:50%;background:#3d3530;
                    display:flex;align-items:center;justify-content:center;
                    font-size:24px;font-weight:800;color:#c17f4a;margin:0 auto 16px;">✓</div>
        <div style="font-size:20px;font-weight:900;color:#3d3530;margin-bottom:8px;">
          퀘스트 시작!
        </div>
        <div style="font-size:14px;color:#6b6560;margin-bottom:6px;font-weight:700;">
          ${quest.title}
        </div>
        <div style="font-size:13px;color:#a09890;margin-bottom:24px;line-height:1.65;">
          부모님과 자녀 모두 동의했어요.<br>${quest.days}일간 함께 해봐요.
        </div>
        <button onclick="this.closest('[style*=fixed]').remove()"
          style="padding:14px 32px;background:#3d3530;color:#fff;border:none;
                 border-radius:14px;font-size:15px;font-weight:800;cursor:pointer;
                 font-family:Nunito,sans-serif;">
          시작하기
        </button>
      </div>`;
    el.addEventListener('click', e => { if(e.target===el) el.remove(); });
    document.body.appendChild(el);
  },

  // ── 퀘스트 새로고침 ──
  refresh(containerId, role) {
    const familyCode = localStorage.getItem('kync_family_code');
    localStorage.removeItem(`kync_quests_${familyCode}`);
    this.render(containerId, role);
  },

  // ── 실시간 퀘스트 동기화 (상대방 동의 감지) ──
  listenQuests(familyCode, role) {
    if (!familyCode || typeof db === 'undefined') return;
    return db.collection('families').doc(familyCode)
      .collection('quests')
      .onSnapshot(snap => {
        const savedKey = `kync_quests_${familyCode}`;
        const local    = JSON.parse(localStorage.getItem(savedKey) || '[]');
        let changed    = false;

        snap.docChanges().forEach(change => {
          const remote = change.doc.data();
          const idx    = local.findIndex(q => q.id === remote.id);
          if (idx >= 0) {
            // 상대방 동의 반영
            if (JSON.stringify(local[idx].agreed) !== JSON.stringify(remote.agreed)) {
              local[idx].agreed = remote.agreed;
              local[idx].status = remote.status || local[idx].status;
              changed = true;
            }
          }
        });

        if (changed) {
          localStorage.setItem(savedKey, JSON.stringify(local));
          const containerId = role === 'parent' ? 'p-quest-list' : 'c-quest-list';
          this.render(containerId, role);
        }
      });
  },

  // ── 초기화: 앱 시작 시 호출 ──
  init(role) {
    const containerId = role === 'parent' ? 'p-quest-list' : 'c-quest-list';
    this.render(containerId, role);

    const familyCode = localStorage.getItem('kync_family_code');
    if (familyCode) this.listenQuests(familyCode, role);
  },
};

window.KyncQuests = KyncQuests;