/* ═══════════════════════════════════════════════════════════
   kync-features.js — 칭찬 카드, 연속 기록, 활동 질문 목록
═══════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════
   1. 칭찬 카드
════════════════════════════════════════ */
const KyncPraise = {

  // 부모 → 자녀
  TEMPLATES: [
    '오늘 고생 많았어',
    '아까 그거 진짜 멋있었다',
    '밥은 꼭 챙겨 먹어',
    '네 덕분에 오늘 웃었어',
    '무리하지 말고 쉬엄쉬엄 해',
    '무슨 일 있으면 언제든 말해',
    '믿고 있어',
    '그냥, 사랑한다고',
  ],

  // 자녀 → 부모님
  TEMPLATES_CHILD: [
    '오늘도 수고하셨어요',
    '밥 맛있었어요',
    '아까 고마웠어요',
    '너무 무리하지 마세요',
    '저 생각보다 잘 지내요',
    '요즘 많이 챙겨줘서 고마워요',
    '말은 잘 안 해도 사랑해요',
    '오늘 기분 좋아 보여서 좋았어요',
  ],

  _templates: null,
  _sheet: null,
  selectedText: null,

  openSendModal(fromRole) {
    this._templates = fromRole === 'child' ? this.TEMPLATES_CHILD : this.TEMPLATES;
    this.selectedText = null;
    const to = fromRole === 'parent' ? '자녀' : '부모님';
    this._sheet = KyncUI.sheet(`
      <h2>${to}에게 한마디</h2>
      <p class="sheet-sub">${fromRole === 'child' ? '골라도 되고 직접 써도 돼.' : '골라도 되고 직접 써도 돼요.'}</p>
      <div class="praise-grid">
        ${this._templates.map((t, i) => `<button class="praise-opt" data-i="${i}" onclick="KyncPraise.selectTemplate(${i})">${KyncUI.esc(t)}</button>`).join('')}
      </div>
      <div class="field" style="margin-top:16px">
        <label class="label" for="praise-custom-input">${fromRole === 'child' ? '직접 쓸래' : '직접 쓰기'}</label>
        <input id="praise-custom-input" class="input" maxlength="60" placeholder="60자까지" oninput="KyncPraise.onCustomInput(this)">
      </div>
      <button id="praise-send-btn" class="btn btn-primary btn-block" style="margin-top:16px" onclick="KyncPraise.sendCard('${fromRole}')" disabled>
        ${ic('send', 18)}보내기</button>`, { id: 'praise-sheet' });
  },

  selectTemplate(idx) {
    this.selectedText = this._templates[idx];
    const input = document.getElementById('praise-custom-input');
    if (input) input.value = '';
    document.querySelectorAll('#praise-sheet .praise-opt').forEach(el => el.classList.toggle('on', +el.dataset.i === idx));
    document.getElementById('praise-send-btn').disabled = false;
  },

  onCustomInput(el) {
    this.selectedText = el.value.trim() || null;
    document.querySelectorAll('#praise-sheet .praise-opt').forEach(e => e.classList.remove('on'));
    document.getElementById('praise-send-btn').disabled = !this.selectedText;
  },

  async sendCard(fromRole) {
    const text = this.selectedText;
    if (!text) return;
    const familyCode = localStorage.getItem('kync_family_code');
    if (!familyCode) { toast(tone('먼저 가족과 연결해주세요.', '먼저 가족이랑 연결해줘'), 'error'); return; }

    await KyncUI.busy(document.getElementById('praise-send-btn'), '보내는 중', async () => {
      try {
        await db.collection('families').doc(familyCode).collection('praise').add({
          from:   fromRole,
          to:     fromRole === 'parent' ? 'child' : 'parent',
          text,
          sentAt: firebase.firestore.FieldValue.serverTimestamp(),
          read:   false,
        });
        this._sheet?.close();
        toast(tone('보냈어요', '보냈어'), 'ok');
      } catch(e) {
        console.error(e);
        toast(tone('못 보냈어요. 인터넷 연결을 확인해주세요.', '못 보냈어. 인터넷 연결 확인해줘'), 'error');
      }
    });
  },

  // 받은 카드 알림 (위에서 내려옴)
  showReceivedCard(card) {
    document.getElementById('praise-received-popup')?.remove();
    const pop = document.createElement('div');
    pop.id = 'praise-received-popup';
    pop.className = 'praise-pop';
    pop.setAttribute('role', 'status');
    pop.innerHTML = `${KyncBrand.mascot('happy', 44, { shadow: false })}
      <div><small>${card.from === 'parent' ? '부모님한테서' : '자녀한테서'} 온 한마디</small><b>${KyncUI.esc(card.text)}</b></div>`;
    const close = () => { pop.classList.remove('show'); setTimeout(() => pop.remove(), 300); };
    pop.addEventListener('click', close);
    document.body.appendChild(pop);
    requestAnimationFrame(() => pop.classList.add('show'));
    setTimeout(close, 4500);
  },

  // 안 읽은 카드 실시간 감시
  listenForCards(familyCode, myRole) {
    if (!familyCode || typeof db === 'undefined') return;
    return db.collection('families').doc(familyCode).collection('praise')
      .where('to', '==', myRole)
      .where('read', '==', false)
      .onSnapshot(snap => {
        let got = false;
        snap.docChanges().forEach(change => {
          if (change.type === 'added') {
            this.showReceivedCard(change.doc.data());
            change.doc.ref.update({ read: true }).catch(() => {});
            got = true;
          }
        });
        if (got && typeof KyncInbox !== 'undefined') KyncInbox.refresh();
        if (got) this.renderReceivedCards(`${myRole === 'parent' ? 'p' : 'c'}-praise-list`, myRole).catch(() => {});
      }, err => console.warn('praise listen:', err));
  },

  async renderReceivedCards(containerId, myRole) {
    const familyCode = localStorage.getItem('kync_family_code');
    const container = document.getElementById(containerId);
    if (!familyCode || !container) return;

    const snap = await db.collection('families').doc(familyCode).collection('praise')
      .where('to', '==', myRole).orderBy('sentAt', 'desc').limit(5).get();

    if (snap.empty) {
      container.innerHTML = `<p class="small sub center" style="padding:10px 0">${tone('아직 받은 게 없어요.', '아직 받은 게 없어.')}</p>`;
      return;
    }
    container.innerHTML = snap.docs.map(doc => {
      const c = doc.data();
      const d = c.sentAt?.toDate?.();
      const time = d ? `${d.getMonth() + 1}월 ${d.getDate()}일` : '';
      return `
        <div class="praise-item">
          <div class="praise-ic">${ic('heart', 20)}</div>
          <div class="grow"><b>${KyncUI.esc(c.text)}</b><small>${c.from === 'parent' ? '부모님' : '자녀'} · ${time}</small></div>
        </div>`;
    }).join('');
  },
};

/* ════════════════════════════════════════
   2. 연속 기록 (답변이나 체크인을 한 날)
════════════════════════════════════════ */
const KyncStreak = {

  BADGES: [
    { days: 3,  name: '사흘 연속' },
    { days: 7,  name: '일주일 연속' },
    { days: 14, name: '2주 연속' },
    { days: 30, name: '한 달 연속' },
  ],

  _read(uid) {
    try { return JSON.parse(localStorage.getItem(`kync_streak_${uid}`) || '{"count":0,"lastDate":"","badges":[]}'); }
    catch(e) { return { count: 0, lastDate: '', badges: [] }; }
  },

  async onCheckin(uid) {
    const today = new Date().toLocaleDateString('ko-KR');
    const streak = this._read(uid);
    const y = new Date(); y.setDate(y.getDate() - 1);
    if (streak.lastDate === today) return streak;
    streak.count = streak.lastDate === y.toLocaleDateString('ko-KR') ? streak.count + 1 : 1;
    streak.lastDate = today;
    try { await KyncDB.updateUser(uid, { streak: streak.count, streakLastDate: today }); } catch(e) {}

    const newBadge = this.BADGES.find(b => b.days === streak.count && !streak.badges.includes(b.days));
    if (newBadge) {
      streak.badges.push(newBadge.days);
      KyncUI.confirm({ title: `${newBadge.days}일 연속`, message: tone(`${newBadge.days}일 동안 하루도 안 빠졌어요.`, `${newBadge.days}일 동안 하루도 안 빠졌어.`), ok: tone('확인', '오케이'), cancel: null, mascot: 'happy' });
    }
    localStorage.setItem(`kync_streak_${uid}`, JSON.stringify(streak));
    this.renderStreakUI(uid);
    return streak;
  },

  renderStreakUI(uid) {
    const streak = this._read(uid);
    const count = streak.count || 0;
    const next = this.BADGES.find(b => b.days > count);
    document.querySelectorAll('.streak-card').forEach(el => {
      el.innerHTML = `
        <div class="streak-top">
          <b>${count ? `${count}일째 연속` : tone('아직 연속 기록 없음', '아직 연속 기록 없음')}</b>
          <small>${next ? `${next.days}일까지 ${next.days - count}일 남음` : '30일 넘김'}</small>
        </div>
        <div class="streak-marks">
          ${this.BADGES.map(b => `<div class="${streak.badges?.includes(b.days) || count >= b.days ? 'on' : ''}">${b.days}일</div>`).join('')}
        </div>`;
    });
  },

  init(uid) { if (uid) this.renderStreakUI(uid); },
};

/* ════════════════════════════════════════
   3. 활동 질문 목록 (화면은 activity-*.html)
════════════════════════════════════════ */
const KyncTogether = {
  // 밸런스 게임 (매일 바뀜). 둘 다 고르면 공개
  BALANCE_Q: [
    { q:'평생 하나만 먹어야 한다면',      opts:['떡볶이','치킨'] },
    { q:'여행 가면',                       opts:['계획 꽉 채우기','발길 닿는 대로'] },
    { q:'초능력 하나만 고르면',            opts:['순간이동','투명인간'] },
    { q:'주말 아침엔',                     opts:['늦잠','일찍 일어나서 놀기'] },
    { q:'평생 한 계절만 산다면',           opts:['여름','겨울'] },
    { q:'싸우고 나면',                     opts:['바로 푼다','하루 자고 푼다'] },
    { q:'선물로 받는다면',                 opts:['갖고 싶던 물건','같이 가는 여행'] },
    { q:'같이 영화 본다면',                opts:['무서운 영화','슬픈 영화'] },
    { q:'탕수육은',                        opts:['부먹','찍먹'] },
    { q:'민트초코',                        opts:['맛있다','치약 맛'] },
    { q:'하루 동안 참아야 한다면',         opts:['말 안 하기','폰 안 보기'] },
    { q:'카톡 답장은',                     opts:['보자마자','몰아서 한 번에'] },
    { q:'놀이공원 가면 먼저',              opts:['롤러코스터','회전목마'] },
    { q:'더 무서운 건',                    opts:['벌레','귀신'] },
    { q:'중요한 일 전날 밤',               opts:['밤새서 준비','그냥 자기'] },
    { q:'생일엔',                          opts:['깜짝 파티','원하는 거 미리 말하기'] },
    { q:'눈 떠보니',                       opts:['무인도','아무도 없는 도시'] },
    { q:'우산 없는데 비 오면',             opts:['뛰어간다','그칠 때까지 기다린다'] },
    { q:'좋아하는 반찬은',                 opts:['처음에 먹기','마지막까지 아껴두기'] },
    { q:'같이 산다면',                     opts:['강아지','고양이'] },
    { q:'평생 하나만',                     opts:['아이스크림','과자'] },
    { q:'더 참기 힘든 건',                 opts:['배고픔','졸림'] },
    { q:'쉬는 날 하루',                    opts:['집에서 뒹굴기','밖에서 하루 종일'] },
    { q:'택배 오면',                       opts:['바로 뜯기','나중에 천천히'] },
    { q:'노래방 첫 곡',                    opts:['신나는 노래','발라드'] },
    { q:'아침밥',                          opts:['꼭 먹는다','안 먹는다'] },
    { q:'더 듣기 싫은 말',                 opts:['방 좀 치워','빨리 자'] },
    { q:'타임머신 타면',                   opts:['과거로','미래로'] },
    { q:'사진 찍을 때',                    opts:['찍어주는 쪽','찍히는 쪽'] },
    { q:'외식 메뉴',                       opts:['내가 고른다','남이 골라주면 따라간다'] },
    { q:'평생 한 가지 색 옷만',            opts:['검정','흰색'] },
    { q:'더 아까운 돈',                    opts:['배달비','택시비'] },
    { q:'급할 때 연락은',                  opts:['전화','문자'] },
    { q:'능력 하나 얻는다면',              opts:['동물이랑 대화','모든 외국어'] },
    { q:'좋아하는 가수 공연',              opts:['혼자 맨 앞자리','친구랑 맨 뒷자리'] },
    { q:'자기 전에',                       opts:['폰 좀 보다 자기','눕자마자 자기'] },
    { q:'청소는',                          opts:['한 번에 몰아서','조금씩 매일'] },
    { q:'배고프면',                        opts:['예민해진다','별 차이 없다'] },
    { q:'라면에',                          opts:['계란 넣기','아무것도 안 넣기'] },
    { q:'시끄러운 데서 공부·일',           opts:['오히려 잘 된다','절대 못 한다'] },
    { q:'고백·사과는',                     opts:['직접 말로','글로 써서'] },
    { q:'놀러 갈 때',                      opts:['바다','산'] },
    { q:'하루 더 생긴다면',                opts:['잠','놀기'] },
    { q:'다시 태어나면',                   opts:['지금 나로','완전 다른 사람으로'] },
    { q:'싫은 거 하나 없애기',             opts:['월요일','모기'] },
  ],

  // 서로 맞히기 (3일마다 바뀜). '나'는 답하는 사람 자신
  QUIZ_Q: [
    { q:'내가 요즘 제일 자주 먹는 음식은?',          type:'text' },
    { q:'내 휴대폰 배경화면은?',                      opts:['사람 사진','풍경이나 동물','캐릭터나 그림','기본 화면'] },
    { q:'내가 제일 싫어하는 음식은?',                 type:'text' },
    { q:'나는 스트레스 받으면 주로?',                 opts:['먹는다','잔다','폰 본다','누구한테 말한다'] },
    { q:'내가 제일 좋아하는 계절은?',                 opts:['봄','여름','가을','겨울'] },
    { q:'나는 하루 중 언제 제일 기운이 없을까?',      opts:['아침','점심 먹고','저녁','밤'] },
    { q:'내가 요즘 갖고 싶은 건?',                    type:'text' },
    { q:'나는 쉬는 날 주로 어디 있을까?',             opts:['내 방','거실','밖','카페'] },
    { q:'내가 라면 끓일 때 꼭 넣는 건?',              opts:['계란','파','치즈','아무것도 안 넣음'] },
    { q:'내가 요즘 자주 보는 영상이나 프로그램은?',   type:'text' },
    { q:'내가 고르는 치킨은?',                        opts:['후라이드','양념','간장','치킨 별로'] },
    { q:'나는 화나면?',                               opts:['말을 안 한다','바로 말한다','방에 들어간다','티를 안 낸다'] },
    { q:'내가 제일 좋아하는 과일은?',                 type:'text' },
    { q:'내가 무인도에 하나만 가져간다면?',           type:'text' },
    { q:'나는 잘 때 어떤 자세일까?',                  opts:['똑바로','옆으로','엎드려서','매번 다름'] },
    { q:'내 어릴 때 꿈은?',                           type:'text' },
    { q:'내가 아이스크림 고르면?',                    opts:['초코','바닐라','딸기','민트초코'] },
    { q:'우리 가족 외식 메뉴 중 내 최애는?',          type:'text' },
    { q:'나는 아침 알람을 몇 번 끌까?',               opts:['한 번에 일어남','2~3번','4번 이상','알람 안 씀'] },
    { q:'내 최애 간식은?',                            type:'text' },
    { q:'나는 어떤 날씨를 더 좋아할까?',              opts:['비 오는 날','맑은 날','눈 오는 날','흐린 날'] },
    { q:'내가 제일 자신 있는 건?',                    type:'text' },
    { q:'내가 지금 제일 가고 싶은 곳은?',             type:'text' },
    { q:'내가 노래방에서 부를 노래는?',               type:'text' },
    { q:'나는 돈이 생기면?',                          opts:['바로 쓴다','모은다','반반','누구 선물 산다'] },
    { q:'내가 제일 무서워하는 건?',                   type:'text' },
    { q:'나는 영화 볼 때?',                           opts:['액션','코미디','로맨스','공포'] },
    { q:'내가 요즘 제일 자주 연락하는 사람은?',       type:'text' },
    { q:'내 방에서 제일 아끼는 물건은?',              type:'text' },
    { q:'나는 배달 시키면 주로?',                     opts:['한식','중식','치킨·피자','분식'] },
  ],
};

window.KyncPraise   = KyncPraise;
window.KyncStreak   = KyncStreak;
window.KyncTogether = KyncTogether;
