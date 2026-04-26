/* ═══════════════════════════════════════════════════════════
   kync-balance.js — 취향 맞추기 게임 (하루 최대 10문제)
═══════════════════════════════════════════════════════════ */

const KyncBalance = {

  MAX_PER_DAY: 10,

  // 100개 취향 질문 풀
  QUESTIONS: [
    // 음식/취향
    { id:1,  q:'치킨 vs 피자, 오늘 고른다면?',              opts:['치킨','피자'] },
    { id:2,  q:'단 거 vs 짠 거, 평소 더 당기는 건?',       opts:['단 거','짠 거'] },
    { id:3,  q:'아이스크림 vs 케이크, 하나만 고른다면?',    opts:['아이스크림','케이크'] },
    { id:4,  q:'라면 vs 파스타, 배고플 때 먼저 생각나는?', opts:['라면','파스타'] },
    { id:5,  q:'카페인 없이 살 수 있어? 없다면 커피 vs 차?',opts:['커피','차'] },
    { id:6,  q:'매운 거 잘 먹어? 아니면 순한 맛?',         opts:['매운 거','순한 맛'] },
    { id:7,  q:'초밥 vs 삼겹살, 특별한 날 고른다면?',      opts:['초밥','삼겹살'] },
    { id:8,  q:'국물 요리 vs 볶음 요리, 더 좋아하는 건?',  opts:['국물','볶음'] },
    // 생활 스타일
    { id:9,  q:'아침형 인간 vs 저녁형 인간, 나는?',        opts:['아침형','저녁형'] },
    { id:10, q:'집에 있는 게 좋아 vs 밖에 나가는 게 좋아?',opts:['집콕','외출'] },
    { id:11, q:'혼자 있는 시간 vs 사람들과 함께하는 시간?', opts:['혼자','함께'] },
    { id:12, q:'깔끔하게 정리 vs 어느 정도 어수선해도 OK?', opts:['정리파','자유파'] },
    { id:13, q:'계획 세우고 움직이기 vs 즉흥적으로 움직이기?',opts:['계획파','즉흥파'] },
    { id:14, q:'요즘 핸드폰 하루 몇 시간 쓰는 것 같아?',   opts:['3시간 미만','3시간 이상'] },
    { id:15, q:'음악 들으면서 뭔가 할 때 vs 조용하게 집중?',opts:['음악','조용히'] },
    // 엔터테인먼트
    { id:16, q:'영화관 vs OTT, 영화 볼 때 선호는?',        opts:['영화관','OTT'] },
    { id:17, q:'드라마 vs 예능, 편하게 볼 때?',            opts:['드라마','예능'] },
    { id:18, q:'독서 vs 유튜브, 쉬는 시간에 주로?',        opts:['독서','유튜브▶'] },
    { id:19, q:'게임 좋아해? 한다면 혼자 vs 같이?',        opts:['혼자게임','같이게임'] },
    { id:20, q:'산 vs 바다, 여행 간다면?',                  opts:['산','바다'] },
    // 성격/감정
    { id:21, q:'화나면 바로 말하는 편? 아니면 참는 편?',   opts:['바로 말해','참는 편'] },
    { id:22, q:'칭찬받을 때 기쁜 거 vs 쑥스러운 거?',      opts:['기쁨','쑥스러움'] },
    { id:23, q:'실수했을 때 금방 잊는 편? 오래 생각하는 편?',opts:['금방 잊어','오래 생각'] },
    { id:24, q:'처음 만난 사람과 대화 잘 되는 편?',        opts:['잘 됨','좀 어색'] },
    { id:25, q:'감정 표현을 잘 하는 편 vs 잘 못하는 편?',  opts:['표현 잘해','표현 못해'] },
    // 가족/관계
    { id:26, q:'가족이랑 여행 가고 싶어 vs 친구랑?',        opts:['가족여행‍‍','친구여행‍‍'] },
    { id:27, q:'같이 밥 먹을 때 대화 vs 각자 폰?',         opts:['대화','각자폰'] },
    { id:28, q:'가족한테 고민 말하는 편?',                  opts:['말해','잘 안 해'] },
    { id:29, q:'집에서 편하게 있을 때 뭐 입어?',           opts:['편한 잠옷','그냥 입던 거'] },
    { id:30, q:'생일에 서프라이즈 좋아해 vs 미리 알고 싶어?',opts:['서프라이즈','미리 알고싶어'] },
    // 공부/일
    { id:31, q:'집중할 때 카페 vs 도서관 vs 방?',           opts:['카페','조용한 곳'] },
    { id:32, q:'마감 직전에 몰아서 vs 미리미리?',           opts:['몰아서','미리미리'] },
    { id:33, q:'모르는 거 생기면 검색 vs 누군가에게 물어보기?',opts:['검색','물어봐'] },
    { id:34, q:'잘하는 거 더 파고들기 vs 못하는 거 보완하기?',opts:['강점 강화','약점 보완'] },
    { id:35, q:'지금 가장 하고 싶은 게 있어?',             opts:['있어!','딱히 없어'] },
    // 소소한 것들
    { id:36, q:'줄 서는 거 vs 기다리지 않는 곳?',           opts:['줄 서도 OK','기다리기 싫어'] },
    { id:37, q:'선물할 때 직접 고르기 vs 현금/상품권?',    opts:['직접 고르기','현금/카드'] },
    { id:38, q:'사진 많이 찍는 편?',                        opts:['엄청 찍어','거의 안 찍어'] },
    { id:39, q:'새 물건 사기 vs 있는 거 오래 쓰기?',       opts:['새 것','오래 쓰기'] },
    { id:40, q:'이어폰 vs 스피커, 음악 들을 때?',           opts:['이어폰','스피커'] },
    // 자연/환경
    { id:41, q:'비 오는 날 기분은?',                        opts:['좋아','싫어'] },
    { id:42, q:'여름 vs 겨울, 더 좋아하는 계절?',           opts:['여름','겨울'] },
    { id:43, q:'반려동물 키우고 싶어?',                     opts:['키우고 싶어','괜찮아'] },
    { id:44, q:'바다 수영 vs 수영장, 더 좋아하는 건?',      opts:['바다','수영장'] },
    { id:45, q:'식물 키우는 거 좋아해?',                    opts:['좋아','귀찮아'] },
    // 꿈/미래
    { id:46, q:'10년 후 어디서 살고 싶어?',                 opts:['도시','시골/전원'] },
    { id:47, q:'부자가 되는 게 꿈이야 vs 하고 싶은 거 하는 게 꿈?',opts:['부자','하고싶은거'] },
    { id:48, q:'해외에서 살아보고 싶어?',                   opts:['살아보고싶어','한국이 좋아'] },
    { id:49, q:'유명해지고 싶어?',                          opts:['그러고싶어⭐','별로'] },
    { id:50, q:'나중에 결혼하고 싶어?',                     opts:['하고 싶어','잘 모르겠어'] },
    // 추가 (51-60)
    { id:51, q:'노래 잘 하고 싶어 vs 춤 잘 추고 싶어?',    opts:['노래','춤'] },
    { id:52, q:'SNS 자주 올려 vs 거의 안 올려?',           opts:['자주','거의안해'] },
    { id:53, q:'쇼핑할 때 온라인 vs 직접 매장에서?',       opts:['온라인','매장'] },
    { id:54, q:'긴 글 vs 짧고 핵심만, 메시지 스타일은?',  opts:['길게','짧게'] },
    { id:55, q:'스트레스 받으면 어떻게 풀어?',             opts:['먹방','운동'] },
    { id:56, q:'혼밥 vs 같이 먹기, 어떤 게 더 편해?',      opts:['혼밥','같이먹기'] },
    { id:57, q:'이른 잠 vs 늦게까지 깨어있기?',            opts:['일찍자기','늦게까지⭐'] },
    { id:58, q:'걷는 거 vs 대중교통, 가까운 거리라면?',    opts:['걷기','버스/지하철'] },
    { id:59, q:'혼자서 다 해결하기 vs 도움 요청하기?',     opts:['혼자해결','도움요청'] },
    { id:60, q:'지금 이 순간 가장 갖고 싶은 초능력은?',    opts:['순간이동','시간정지⏸'] },
  ],

  // 오늘 사용한 질문 추적
  _getTodayState(familyCode) {
    const today = new Date().toLocaleDateString('ko-KR');
    const key   = `kync_balance_${familyCode}_${today}`;
    return { key, data: JSON.parse(localStorage.getItem(key) || '{"count":0,"answers":{},"guesses":{}}') };
  },

  _saveTodayState(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },

  // 오늘 쓸 질문 10개 선택 (날짜 기반 일관성)
  _getTodaysQuestions() {
    const dayNum = Math.floor(Date.now() / 86400000);
    const shuffled = [...this.QUESTIONS].sort((a,b) => {
      const ha = (a.id * 7 + dayNum * 13) % 100;
      const hb = (b.id * 7 + dayNum * 13) % 100;
      return ha - hb;
    });
    return shuffled.slice(0, this.MAX_PER_DAY);
  },

  openGame(myRole) {
    const familyCode = localStorage.getItem('kync_family_code');
    const { key, data } = this._getTodayState(familyCode || 'local');
    const todaysQs = this._getTodaysQuestions();
    const answered = Object.keys(data.answers).length;

    const modal = document.createElement('div');
    modal.id = 'balance-modal';
    modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);
      z-index:9999;display:flex;flex-direction:column;align-items:center;
      justify-content:flex-end;`;

    const sheet = document.createElement('div');
    sheet.style.cssText = `background:#fff;border-radius:28px 28px 0 0;
      width:100%;max-width:430px;max-height:85vh;overflow-y:auto;
      padding:28px 24px 48px;animation:slideUp 0.35s cubic-bezier(0.34,1.1,0.64,1);`;

    sheet.innerHTML = `
      <div style="width:40px;height:4px;background:#e8e3da;border-radius:2px;margin:0 auto 20px;"></div>

      <!-- 헤더 -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <div>
          <div style="font-size:18px;font-weight:900;color:#3d3530;"> 취향 맞추기</div>
          <div style="font-size:12px;color:#a09890;margin-top:2px;">
            오늘 ${answered}/${this.MAX_PER_DAY} 완료
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:22px;font-weight:900;color:#c17f4a;">${answered}</div>
          <div style="font-size:10px;color:#a09890;">/ ${this.MAX_PER_DAY}</div>
        </div>
      </div>

      <!-- 진행 바 -->
      <div style="height:6px;background:#f0eeeb;border-radius:3px;margin-bottom:20px;overflow:hidden;">
        <div style="height:100%;background:#c17f4a;border-radius:3px;
                    width:${(answered/this.MAX_PER_DAY)*100}%;transition:width 0.4s;"></div>
      </div>

      <!-- 질문 목록 -->
      <div id="balance-question-list">
        ${todaysQs.map((q, idx) => {
          const myAns    = data.answers[q.id];
          const theirAns = data.guesses[`${myRole}_${q.id}`];
          const isAnswered = !!myAns;

          return `
            <div style="border-radius:16px;border:1.5px solid ${isAnswered?'#3d3530':'#e8e3da'};
                        padding:16px;margin-bottom:10px;
                        background:${isAnswered?'#3d3530':'#fff'};
                        cursor:${isAnswered?'default':'pointer'};
                        transition:all 0.2s;"
              ${!isAnswered ? `onclick="KyncBalance.openQuestion(${q.id},'${myRole}')"` : ''}>
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:24px;height:24px;border-radius:50%;
                            background:${isAnswered?'#c17f4a':'#f0eeeb'};
                            display:flex;align-items:center;justify-content:center;
                            font-size:11px;font-weight:800;
                            color:${isAnswered?'#fff':'#a09890'};flex-shrink:0;">
                  ${isAnswered ? '' : idx+1}
                </div>
                <div style="flex:1;">
                  <div style="font-size:13px;font-weight:700;
                              color:${isAnswered?'#fff':'#3d3530'};margin-bottom:${isAnswered?'6px':'0'};">
                    ${q.q}
                  </div>
                  ${isAnswered ? `
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                      <div style="font-size:11px;background:rgba(255,255,255,0.15);
                                  color:#fff;padding:4px 10px;border-radius:20px;">
                        내 답: ${myAns}
                      </div>
                    </div>
                  ` : ''}
                </div>
                ${!isAnswered ? '<div style="font-size:18px;color:#e8e3da;">›</div>':''}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      ${answered >= this.MAX_PER_DAY ? `
        <div style="background:#f5f2ed;border-radius:16px;padding:20px;text-align:center;margin-top:8px;">
          <div style="font-size:24px;margin-bottom:8px;"></div>
          <div style="font-size:15px;font-weight:800;color:#3d3530;margin-bottom:4px;">오늘 모두 완료!</div>
          <div style="font-size:12px;color:#a09890;">내일 새로운 10문제가 기다려요</div>
        </div>
      ` : ''}

      <button onclick="document.getElementById('balance-modal').remove()"
        style="width:100%;padding:14px;background:transparent;border:none;
               font-size:13px;color:#a09890;cursor:pointer;font-family:Nunito,sans-serif;margin-top:8px;">
        닫기
      </button>
    `;

    modal.appendChild(sheet);
    modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
    document.body.appendChild(modal);
  },

  openQuestion(qId, myRole) {
    const q = this.QUESTIONS.find(q => q.id === qId);
    if (!q) return;

    const familyCode = localStorage.getItem('kync_family_code');
    const { key, data } = this._getTodayState(familyCode || 'local');

    // 기존 모달 닫기
    document.getElementById('balance-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'balance-q-modal';
    modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);
      z-index:9999;display:flex;align-items:flex-end;justify-content:center;`;

    const sheet = document.createElement('div');
    sheet.style.cssText = `background:#fff;border-radius:28px 28px 0 0;
      width:100%;max-width:430px;padding:32px 24px 48px;
      animation:slideUp 0.35s cubic-bezier(0.34,1.1,0.64,1);`;

    sheet.innerHTML = `
      <div style="width:40px;height:4px;background:#e8e3da;border-radius:2px;margin:0 auto 24px;"></div>
      <div style="font-size:11px;font-weight:700;color:#c17f4a;letter-spacing:0.1em;margin-bottom:12px;"> 취향 맞추기</div>
      <div style="font-size:20px;font-weight:800;color:#3d3530;line-height:1.4;margin-bottom:8px;">${q.q}</div>
      <div style="font-size:12px;color:#a09890;margin-bottom:24px;">나의 취향을 골라봐요</div>

      <div style="display:flex;gap:12px;margin-bottom:24px;">
        ${q.opts.map(opt => `
          <button onclick="KyncBalance.submitAnswer(${qId},'${opt}','${myRole}')"
            style="flex:1;padding:20px 12px;background:#f5f2ed;border:2px solid transparent;
                   border-radius:18px;cursor:pointer;font-family:Nunito,sans-serif;
                   transition:all 0.15s;text-align:center;"
            onmouseover="this.style.borderColor='#c17f4a';this.style.background='#fdf1eb';"
            onmouseout="this.style.borderColor='transparent';this.style.background='#f5f2ed';">
            <div style="font-size:28px;margin-bottom:8px;">${opt.match(/[\u{1F300}-\u{1FAFF}]/gu)?.[0] || ''}</div>
            <div style="font-size:13px;font-weight:800;color:#3d3530;">
              ${opt.replace(/[\u{1F300}-\u{1FAFF}]/gu, '').trim()}
            </div>
          </button>
        `).join('')}
      </div>

      <button onclick="document.getElementById('balance-q-modal').remove();KyncBalance.openGame('${myRole}')"
        style="width:100%;padding:12px;background:transparent;border:none;
               font-size:13px;color:#a09890;cursor:pointer;font-family:Nunito,sans-serif;">
        ← 목록으로
      </button>
    `;

    modal.appendChild(sheet);
    modal.addEventListener('click', e => { if(e.target===modal) { modal.remove(); this.openGame(myRole); } });
    document.body.appendChild(modal);
  },

  async submitAnswer(qId, answer, myRole) {
    const familyCode = localStorage.getItem('kync_family_code');
    const { key, data } = this._getTodayState(familyCode || 'local');

    // 이미 답했으면 무시
    if (data.answers[qId]) return;

    data.answers[qId] = answer;
    data.count = Object.keys(data.answers).length;
    this._saveTodayState(key, data);

    // Firestore 저장
    if (familyCode && typeof db !== 'undefined') {
      try {
        const today = new Date().toLocaleDateString('ko-KR');
        await db.collection('families').doc(familyCode)
          .collection('balance_answers')
          .doc(`${today}_${myRole}_${qId}`)
          .set({ role: myRole, qId, answer, answeredAt: firebase.firestore.FieldValue.serverTimestamp() });
      } catch(e) { console.warn(e); }
    }

    // 포인트
    if (typeof KyncDB !== 'undefined' && KyncAuth?.current) {
      await KyncDB.addPoints(KyncAuth.current.uid, 10);
    }

    // 결과 화면으로 전환
    document.getElementById('balance-q-modal')?.remove();
    this._showAnswerResult(qId, answer, myRole);
  },

  _showAnswerResult(qId, myAnswer, myRole) {
    const q = this.QUESTIONS.find(q => q.id === qId);
    const modal = document.createElement('div');
    modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);
      z-index:9999;display:flex;align-items:flex-end;justify-content:center;`;

    const sheet = document.createElement('div');
    sheet.style.cssText = `background:#fff;border-radius:28px 28px 0 0;
      width:100%;max-width:430px;padding:32px 24px 48px;
      animation:slideUp 0.35s cubic-bezier(0.34,1.1,0.64,1);`;

    sheet.innerHTML = `
      <div style="width:40px;height:4px;background:#e8e3da;border-radius:2px;margin:0 auto 24px;"></div>
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:48px;margin-bottom:12px;"></div>
        <div style="font-size:18px;font-weight:800;color:#3d3530;margin-bottom:6px;">답변 완료!</div>
        <div style="font-size:14px;color:#6b6560;">${q.q}</div>
      </div>
      <div style="background:#3d3530;border-radius:16px;padding:18px;text-align:center;margin-bottom:16px;">
        <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:6px;">내 선택</div>
        <div style="font-size:20px;font-weight:800;color:#fff;">${myAnswer}</div>
      </div>
      <div style="background:#fdf1eb;border-radius:16px;padding:14px;text-align:center;margin-bottom:20px;">
        <div style="font-size:12px;color:#c17f4a;font-weight:700;">
          ${myRole==='parent'?'자녀':'부모님'}이 같은 질문에 답하면 비교해서 보여줄게요!
        </div>
      </div>
      <div style="display:flex;gap:10px;">
        <button onclick="this.closest('[style*=fixed]').remove();KyncBalance.openGame('${myRole}')"
          style="flex:1;padding:14px;background:#f5f2ed;border:none;border-radius:14px;
                 font-size:14px;font-weight:800;color:#3d3530;cursor:pointer;
                 font-family:Nunito,sans-serif;">
          목록으로
        </button>
        <button onclick="this.closest('[style*=fixed]').remove();KyncBalance.openNextQuestion('${myRole}')"
          style="flex:2;padding:14px;background:#3d3530;border:none;border-radius:14px;
                 font-size:14px;font-weight:800;color:#fff;cursor:pointer;
                 font-family:Nunito,sans-serif;">
          다음 질문 →
        </button>
      </div>
    `;

    modal.appendChild(sheet);
    modal.addEventListener('click', e => { if(e.target===modal) { modal.remove(); this.openGame(myRole); } });
    document.body.appendChild(modal);
  },

  openNextQuestion(myRole) {
    const familyCode = localStorage.getItem('kync_family_code');
    const { data } = this._getTodayState(familyCode || 'local');
    const todaysQs  = this._getTodaysQuestions();
    const next = todaysQs.find(q => !data.answers[q.id]);
    if (next) {
      this.openQuestion(next.id, myRole);
    } else {
      this.openGame(myRole); // 다 했으면 목록
    }
  },
};

window.KyncBalance = KyncBalance;