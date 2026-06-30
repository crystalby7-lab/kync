/* ═══════════════════════════════════════════════════════════
   kync-diary.js  —  Kelog 스타일 공유 기록 피드
   부모 + 자녀가 함께 쌓아가는 일상 기록
   ★ 업데이트: 캘린더 뷰 토글 + 기록 삭제 기능 추가
═══════════════════════════════════════════════════════════ */

const KyncDiary = {

  EMOTIONS: [
    {id:'happy',  label:'좋음',   bg:'#fef9e7', dot:'#f0c040'},
    {id:'calm',   label:'평온',   bg:'#eafaf1', dot:'#7ec8a0'},
    {id:'tired',  label:'피곤',   bg:'#f4f6f7', dot:'#b0b8c8'},
    {id:'anxious',label:'불안',   bg:'#fdf2ec', dot:'#e08060'},
    {id:'sad',    label:'슬픔',   bg:'#eaf0fb', dot:'#8090c0'},
    {id:'angry',  label:'화남',   bg:'#fdedec', dot:'#e06060'},
    {id:'proud',  label:'뿌듯',   bg:'#fdf1eb', dot:'#c17f4a'},
    {id:'lonely', label:'외로움', bg:'#f5f0fa', dot:'#9080a0'},
  ],

  _sel: null,   // 선택된 감정
  _img: null,   // base64 이미지
  _view: 'feed', // 'feed' | 'calendar'
  _calMonth: new Date(),       // 캘린더에 표시 중인 달
  _selectedDate: null,         // 캘린더에서 선택한 날짜 (YYYY-MM-DD)

  /* ── 메인 렌더 ── */
  async render(containerId, myRole) {
    this._containerId = containerId;
    this._myRole = myRole;
    const el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = this._writeForm(myRole) + this._viewToggle() +
      '<div id="kd-view-area"></div>';

    this._renderViewArea();
  },

  /* ── 작성 폼 ── */
  _writeForm(myRole) {
    return `
    <div id="kd-write" style="background:#fff;border-radius:24px;
         border:1.5px solid #e8e3da;overflow:hidden;margin-bottom:16px;">

      <!-- 사진 영역 -->
      <div id="kd-photo-area" onclick="KyncDiary.pickPhoto()"
        style="width:100%;aspect-ratio:4/3;background:#f5f2ed;
               display:flex;flex-direction:column;align-items:center;
               justify-content:center;cursor:pointer;position:relative;overflow:hidden;">
        <div id="kd-photo-placeholder">
          <div style="width:52px;height:52px;border-radius:16px;background:#e8e3da;
                      display:flex;align-items:center;justify-content:center;
                      margin:0 auto 10px;font-size:20px;font-weight:800;color:#a09890;">+</div>
          <div style="font-size:13px;color:#a09890;font-weight:600;">사진 추가</div>
          <div style="font-size:11px;color:#d4cdc2;margin-top:4px;">촬영 또는 갤러리</div>
        </div>
        <img id="kd-preview" style="display:none;width:100%;height:100%;object-fit:cover;position:absolute;inset:0;">
        <input type="file" id="kd-file-input" accept="image/*" capture="environment"
          style="display:none;" onchange="KyncDiary.onPhotoSelected(this)">
      </div>

      <!-- 감정 태그 -->
      <div style="padding:14px 16px 0;">
        <div style="font-size:11px;font-weight:700;color:#a09890;letter-spacing:0.08em;margin-bottom:10px;">
          오늘의 감정
        </div>
        <div style="display:flex;gap:7px;flex-wrap:wrap;" id="kd-emotion-row">
          ${this.EMOTIONS.map(e=>`
            <button onclick="KyncDiary.selectEmotion('${e.id}')" id="kd-emo-${e.id}"
              style="padding:6px 13px;border-radius:20px;border:1.5px solid #e8e3da;
                     background:#fff;font-size:12px;font-weight:700;color:#6b6560;
                     cursor:pointer;font-family:Nunito,sans-serif;transition:all 0.15s;
                     display:flex;align-items:center;gap:5px;">
              <div style="width:7px;height:7px;border-radius:50%;background:${e.dot};flex-shrink:0;"></div>
              ${e.label}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- 메모 -->
      <div style="padding:12px 16px 16px;">
        <input id="kd-memo" type="text" maxlength="60"
          placeholder="오늘 하루 한 줄로..."
          style="width:100%;padding:13px 16px;background:#f5f2ed;
                 border:none;border-radius:14px;font-size:14px;
                 font-family:Nunito,sans-serif;color:#3d3530;outline:none;">
        <button onclick="KyncDiary.save('${this._myRole}')"
          style="width:100%;padding:14px;background:#3d3530;color:#fff;border:none;
                 border-radius:14px;font-size:14px;font-weight:800;cursor:pointer;
                 font-family:Nunito,sans-serif;margin-top:10px;transition:all 0.2s;">
          기록하기
        </button>
      </div>
    </div>`;
  },

  /* ── 피드/캘린더 전환 토글 ── */
  _viewToggle() {
    return `
    <div style="display:flex;gap:8px;margin-bottom:14px;">
      <button id="kd-tab-feed" onclick="KyncDiary.switchView('feed')"
        style="flex:1;padding:11px;border-radius:12px;border:none;
               background:${this._view==='feed'?'#3d3530':'#fff'};
               color:${this._view==='feed'?'#fff':'#6b6560'};
               border:${this._view==='feed'?'none':'1.5px solid #e8e3da'};
               font-size:13px;font-weight:800;cursor:pointer;font-family:Nunito,sans-serif;">
        피드
      </button>
      <button id="kd-tab-calendar" onclick="KyncDiary.switchView('calendar')"
        style="flex:1;padding:11px;border-radius:12px;border:none;
               background:${this._view==='calendar'?'#3d3530':'#fff'};
               color:${this._view==='calendar'?'#fff':'#6b6560'};
               border:${this._view==='calendar'?'none':'1.5px solid #e8e3da'};
               font-size:13px;font-weight:800;cursor:pointer;font-family:Nunito,sans-serif;">
        캘린더
      </button>
    </div>`;
  },

  switchView(view) {
    this._view = view;
    this._selectedDate = null;
    const el = document.getElementById(this._containerId);
    if (!el) return;
    el.innerHTML = this._writeForm(this._myRole) + this._viewToggle() +
      '<div id="kd-view-area"></div>';
    this._renderViewArea();
  },

  _renderViewArea() {
    if (this._view === 'calendar') this._renderCalendar();
    else this.renderFeed(this._myRole);
  },

  /* ── 사진 선택 ── */
  pickPhoto() {
    document.getElementById('kd-file-input')?.click();
  },

  onPhotoSelected(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      this._img = e.target.result;
      const preview = document.getElementById('kd-preview');
      const placeholder = document.getElementById('kd-photo-placeholder');
      if (preview) { preview.src = e.target.result; preview.style.display = 'block'; }
      if (placeholder) placeholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
  },

  /* ── 감정 선택 ── */
  selectEmotion(id) {
    this._sel = id;
    this.EMOTIONS.forEach(e => {
      const btn = document.getElementById(`kd-emo-${e.id}`);
      if (!btn) return;
      if (e.id === id) {
        btn.style.background = e.bg;
        btn.style.borderColor = e.dot;
        btn.style.color = '#3d3530';
      } else {
        btn.style.background = '#fff';
        btn.style.borderColor = '#e8e3da';
        btn.style.color = '#6b6560';
      }
    });
  },

  /* ── 저장 ── */
  async save(myRole) {
    const memo = document.getElementById('kd-memo')?.value?.trim();
    if (!this._img && !memo) {
      alert('사진이나 메모를 추가해주세요.'); return;
    }

    const entry = {
      id:        'd_' + Date.now(),
      role:      myRole,
      img:       this._img || null,
      emotion:   this._sel || null,
      memo:      memo || '',
      savedAt:   new Date().toISOString(),
      uid:       KyncAuth?.current?.uid || localStorage.getItem('kync_user_uid') || '',
      name:      localStorage.getItem('kync_user_name') || (myRole==='parent'?'부모님':'자녀'),
    };

    const fc  = localStorage.getItem('kync_family_code') || 'local';
    const key = `kync_diary_${fc}`;
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    arr.unshift(entry);
    if (arr.length > 100) arr.length = 100;
    localStorage.setItem(key, JSON.stringify(arr));

    if (fc !== 'local' && typeof db !== 'undefined') {
      try {
        await db.collection('families').doc(fc).collection('diary').doc(entry.id).set({
          role: entry.role, emotion: entry.emotion,
          memo: entry.memo, savedAt: firebase.firestore.FieldValue.serverTimestamp(),
          uid: entry.uid, name: entry.name,
        });
      } catch(e) { console.warn('Firestore diary:', e); }
    }

    if (typeof KyncDB !== 'undefined' && KyncAuth?.current) {
      await KyncDB.addPoints(KyncAuth.current.uid, 15).catch(()=>{});
    }

    // 리셋
    this._img = null; this._sel = null;
    const preview = document.getElementById('kd-preview');
    const ph = document.getElementById('kd-photo-placeholder');
    if (preview) { preview.style.display='none'; preview.src=''; }
    if (ph) ph.style.display = 'flex';
    const memoInput = document.getElementById('kd-memo');
    if (memoInput) memoInput.value = '';
    this.EMOTIONS.forEach(e => {
      const btn = document.getElementById(`kd-emo-${e.id}`);
      if (btn) { btn.style.background='#fff'; btn.style.borderColor='#e8e3da'; btn.style.color='#6b6560'; }
    });

    this._renderViewArea();
  },

  /* ── 삭제 ── */
  async deleteEntry(entryId, myRole) {
    if (!confirm('이 기록을 삭제할까요?')) return;

    const fc  = localStorage.getItem('kync_family_code') || 'local';
    const key = `kync_diary_${fc}`;
    let arr   = JSON.parse(localStorage.getItem(key) || '[]');
    arr = arr.filter(e => e.id !== entryId);
    localStorage.setItem(key, JSON.stringify(arr));

    if (fc !== 'local' && typeof db !== 'undefined') {
      try {
        await db.collection('families').doc(fc).collection('diary').doc(entryId).delete();
      } catch(e) { console.warn(e); }
    }

    this._renderViewArea();
  },

  /* ── 피드 렌더 ── */
  async renderFeed(myRole, filterDate) {
    const feed = document.getElementById('kd-view-area');
    if (!feed) return;

    const fc  = localStorage.getItem('kync_family_code') || 'local';
    const key = `kync_diary_${fc}`;
    let arr   = JSON.parse(localStorage.getItem(key) || '[]');

    if (filterDate) {
      arr = arr.filter(e => e.savedAt && e.savedAt.slice(0, 10) === filterDate);
    }

    if (arr.length === 0) {
      feed.innerHTML = `
        <div style="text-align:center;padding:40px 24px;color:#a09890;">
          <div style="width:56px;height:56px;border-radius:18px;background:#f5f2ed;
                      display:flex;align-items:center;justify-content:center;
                      margin:0 auto 14px;font-size:22px;font-weight:800;color:#d4cdc2;">◌</div>
          <div style="font-size:14px;font-weight:700;margin-bottom:4px;">
            ${filterDate ? '이 날은 기록이 없어요' : '아직 기록이 없어요'}
          </div>
          <div style="font-size:12px;">${filterDate ? '' : '오늘 첫 번째 장면을 남겨봐요'}</div>
        </div>`;
      return;
    }

    feed.innerHTML = arr.map(e => {
      const emo  = this.EMOTIONS.find(x=>x.id===e.emotion);
      const time = e.savedAt ? new Date(e.savedAt).toLocaleDateString('ko-KR',{month:'long',day:'numeric'}) : '';
      const isMe = e.role === myRole;
      const entryId = e.id || '';

      return `
        <div style="background:#fff;border-radius:20px;overflow:hidden;
                    border:1.5px solid #e8e3da;margin-bottom:12px;position:relative;">

          ${isMe ? `
            <button onclick="KyncDiary.deleteEntry('${entryId}','${myRole}')"
              style="position:absolute;top:10px;right:10px;z-index:2;
                     width:28px;height:28px;border-radius:50%;
                     background:rgba(0,0,0,0.4);border:none;cursor:pointer;
                     color:#fff;font-size:14px;display:flex;align-items:center;
                     justify-content:center;font-family:Nunito,sans-serif;">×</button>
          ` : ''}

          ${e.img ? `
            <div style="width:100%;aspect-ratio:4/3;overflow:hidden;">
              <img src="${e.img}" style="width:100%;height:100%;object-fit:cover;"
                   onclick="KyncDiary.openImg('${e.img}')">
            </div>
          ` : ''}

          <div style="padding:14px 16px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:${e.memo?'8px':'0'};">
              <div style="width:28px;height:28px;border-radius:50%;
                          background:${isMe?'#3d3530':'#e8e3da'};
                          display:flex;align-items:center;justify-content:center;
                          font-size:11px;font-weight:800;
                          color:${isMe?'#fff':'#6b6560'};flex-shrink:0;">
                ${(e.name||'?')[0]}
              </div>
              <div style="flex:1;">
                <span style="font-size:13px;font-weight:700;color:#3d3530;">${e.name||''}</span>
                ${emo ? `<span style="margin-left:7px;padding:3px 9px;border-radius:20px;
                   background:${emo.bg};font-size:11px;font-weight:700;color:#6b6560;">
                   <span style="display:inline-block;width:5px;height:5px;border-radius:50%;
                          background:${emo.dot};margin-right:3px;vertical-align:middle;"></span>${emo.label}
                   </span>` : ''}
              </div>
              <div style="font-size:11px;color:#d4cdc2;flex-shrink:0;">${time}</div>
            </div>
            ${e.memo ? `<div style="font-size:14px;color:#3d3530;line-height:1.65;font-weight:500;">${e.memo}</div>` : ''}
          </div>
        </div>`;
    }).join('');
  },

  /* ── 캘린더 렌더 ── */
  _renderCalendar() {
    const area = document.getElementById('kd-view-area');
    if (!area) return;

    const fc  = localStorage.getItem('kync_family_code') || 'local';
    const key = `kync_diary_${fc}`;
    const arr = JSON.parse(localStorage.getItem(key) || '[]');

    // 날짜별 기록 개수 맵
    const countMap = {};
    arr.forEach(e => {
      if (!e.savedAt) return;
      const d = e.savedAt.slice(0, 10);
      countMap[d] = (countMap[d] || 0) + 1;
    });

    const year  = this._calMonth.getFullYear();
    const month = this._calMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const todayStr = new Date().toISOString().slice(0, 10);

    let cells = '';
    for (let i = 0; i < startWeekday; i++) {
      cells += `<div></div>`;
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const hasEntry = !!countMap[dateStr];
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === this._selectedDate;
      cells += `
        <div onclick="KyncDiary.selectDate('${dateStr}')"
          style="aspect-ratio:1;display:flex;flex-direction:column;align-items:center;
                 justify-content:center;border-radius:12px;cursor:pointer;
                 background:${isSelected ? '#3d3530' : 'transparent'};
                 border:${isToday && !isSelected ? '1.5px solid #c17f4a' : 'none'};">
          <div style="font-size:13px;font-weight:700;
                      color:${isSelected ? '#fff' : '#3d3530'};">${d}</div>
          ${hasEntry ? `<div style="width:5px;height:5px;border-radius:50%;
                        background:${isSelected ? '#fff' : '#c17f4a'};margin-top:2px;"></div>` : ''}
        </div>`;
    }

    area.innerHTML = `
      <div style="background:#fff;border-radius:20px;padding:18px;border:1.5px solid #e8e3da;margin-bottom:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <button onclick="KyncDiary.changeMonth(-1)"
            style="width:32px;height:32px;border-radius:50%;border:none;background:#f5f2ed;
                   cursor:pointer;font-size:14px;color:#3d3530;">‹</button>
          <div style="font-size:15px;font-weight:800;color:#3d3530;">${year}년 ${month + 1}월</div>
          <button onclick="KyncDiary.changeMonth(1)"
            style="width:32px;height:32px;border-radius:50%;border:none;background:#f5f2ed;
                   cursor:pointer;font-size:14px;color:#3d3530;">›</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:8px;">
          ${['일','월','화','수','목','금','토'].map(d => `
            <div style="text-align:center;font-size:11px;font-weight:700;color:#a09890;">${d}</div>
          `).join('')}
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">
          ${cells}
        </div>
      </div>
      <div id="kd-calendar-feed"></div>`;

    if (this._selectedDate) {
      this._renderCalendarFeed();
    } else {
      document.getElementById('kd-calendar-feed').innerHTML = `
        <div style="text-align:center;padding:24px;color:#a09890;font-size:13px;">
          날짜를 선택하면 그 날의 기록을 볼 수 있어요
        </div>`;
    }
  },

  changeMonth(delta) {
    this._calMonth = new Date(this._calMonth.getFullYear(), this._calMonth.getMonth() + delta, 1);
    this._renderCalendar();
  },

  selectDate(dateStr) {
    this._selectedDate = this._selectedDate === dateStr ? null : dateStr;
    this._renderCalendar();
  },

  _renderCalendarFeed() {
    const feedArea = document.getElementById('kd-calendar-feed');
    if (!feedArea) return;
    feedArea.id = 'kd-view-area-temp';
    // renderFeed가 kd-view-area를 타겟하므로 임시로 전환
    const original = document.getElementById('kd-view-area');
    const temp = document.createElement('div');
    temp.id = 'kd-view-area';
    feedArea.replaceWith(temp);
    this.renderFeed(this._myRole, this._selectedDate).then(() => {
      temp.id = 'kd-calendar-feed';
    });
  },

  /* ── 이미지 전체화면 ── */
  openImg(src) {
    const modal = document.createElement('div');
    modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.9);
      z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer;`;
    modal.innerHTML = `<img src="${src}" style="max-width:100%;max-height:100%;object-fit:contain;">`;
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
  },
};

window.KyncDiary = KyncDiary;