/* ═══════════════════════════════════════════════════════════
   kync-diary.js  —  Kelog 스타일 공유 기록 피드
   부모 + 자녀가 함께 쌓아가는 일상 기록
   ★ 업데이트: 캘린더 뷰 토글 + 기록 삭제 기능 추가
   ★ 버그 수정:
     - Firebase를 기준으로 저장·불러오기 (상대 기록도 보임, 새로고침해도 유지)
     - 사진 압축 후 Firestore에 저장 (localStorage 용량 초과 해결)
     - 기존 브라우저에 쌓인 기록 → Firebase로 1회 자동 이전
     - 저장/삭제 에러 처리, 중복 저장 방지
     - 날짜를 한국(기기) 시간 기준으로 통일
     - 캘린더 날짜 선택 시 피드 렌더링 안정화
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

  // [수정] Firebase에서 불러온 기록 보관
  _entries: null,
  _entriesFc: null,
  _unsub: null,
  _listenFc: null,
  _saving: false,

  /* ════════════════════════════════════════
     [추가] 공통 헬퍼
  ════════════════════════════════════════ */
  _fc() {
    return localStorage.getItem('kync_family_code') || 'local';
  },

  _hasDB() {
    return typeof db !== 'undefined' && typeof firebase !== 'undefined';
  },

  _cacheKey(fc) {
    return `kync_diary_${fc}`;
  },

  _pad(n) {
    return String(n).padStart(2, '0');
  },

  // 기기(한국) 시간 기준 YYYY-MM-DD
  _localDate(d) {
    return `${d.getFullYear()}-${this._pad(d.getMonth()+1)}-${this._pad(d.getDate())}`;
  },

  _entryDate(e) {
    if (!e) return '';
    if (e.dateKey) return e.dateKey;
    if (!e.savedAt) return '';
    const d = new Date(e.savedAt);
    return isNaN(d) ? '' : this._localDate(d);
  },

  _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[c]));
  },

  _readCache(fc) {
    try { return JSON.parse(localStorage.getItem(this._cacheKey(fc)) || '[]'); }
    catch(e) { return []; }
  },

  // 가족 연결 상태면 사진은 캐시에 안 넣음 (localStorage 용량 보호)
  _writeCache(fc, arr, keepImg) {
    const key  = this._cacheKey(fc);
    const list = (arr || []).slice(0, 100);
    const lite = list.map(x => ({ ...x, img: null }));
    if (keepImg) {
      try { localStorage.setItem(key, JSON.stringify(list)); return; } catch(e) {}
    }
    try { localStorage.setItem(key, JSON.stringify(lite)); return; } catch(e) {}
    try { localStorage.removeItem(key); } catch(e) {}
  },

  _getEntries() {
    const fc = this._fc();
    if (Array.isArray(this._entries) && this._entriesFc === fc) return this._entries;
    return this._readCache(fc);
  },

  // 사진 압축 (Firestore 문서 1MB 제한 대비 700KB 이하)
  _compressImage(dataUrl, maxSize = 800, maxBytes = 700000) {
    return new Promise(resolve => {
      if (!dataUrl) return resolve(null);
      const img = new Image();
      img.onload = () => {
        let size = maxSize, quality = 0.75, out = '';
        for (let i = 0; i < 8; i++) {
          const scale = Math.min(1, size / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          out = canvas.toDataURL('image/jpeg', quality);
          if (out.length <= maxBytes) break;
          if (quality > 0.45) quality -= 0.1;
          else size = Math.round(size * 0.8);
        }
        resolve(out && out.length <= maxBytes ? out : null);
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  },

  // Firestore 문서 → 화면용 기록
  _fromDoc(doc) {
    const x = doc.data({ serverTimestamps: 'estimate' }) || {};
    let iso = x.clientSavedAt || '';
    if (x.savedAt && typeof x.savedAt.toDate === 'function') {
      iso = x.savedAt.toDate().toISOString();
    }
    const entry = {
      id:      doc.id,
      role:    x.role || '',
      img:     x.img || null,
      emotion: x.emotion || null,
      memo:    x.memo || '',
      savedAt: iso,
      uid:     x.uid || '',
      name:    x.name || '',
    };
    entry.dateKey = x.dateKey || this._entryDate(entry);
    return entry;
  },

  // 기존에 브라우저에만 있던 기록 → Firebase로 1회 이전
  async _migrateLocal() {
    const fc = this._fc();
    if (fc === 'local' || !this._hasDB()) return;
    const flag = `kync_diary_migrated_${fc}`;
    try { if (localStorage.getItem(flag)) return; } catch(e) {}

    const old  = [...this._readCache('local'), ...this._readCache(fc)];
    const seen = new Set();

    try {
      for (const e of old) {
        if (!e || !e.id || seen.has(e.id)) continue;
        seen.add(e.id);
        const d = e.savedAt && !isNaN(new Date(e.savedAt)) ? new Date(e.savedAt) : new Date();
        const data = {
          role:          e.role || '',
          emotion:       e.emotion || null,
          memo:          e.memo || '',
          uid:           e.uid || '',
          name:          e.name || '',
          savedAt:       firebase.firestore.Timestamp.fromDate(d),
          clientSavedAt: d.toISOString(),
          dateKey:       this._localDate(d),
        };
        if (e.img) {
          const small = await this._compressImage(e.img);
          if (small) data.img = small;
        }
        await db.collection('families').doc(fc)
          .collection('diary').doc(e.id).set(data, { merge: true });
      }
      try { localStorage.removeItem(this._cacheKey('local')); } catch(e) {}
      this._writeCache(fc, old, false); // 사진 빼고 캐시 → 용량 확보
      try { localStorage.setItem(flag, '1'); } catch(e) {}
    } catch(e) {
      console.warn('diary migrate:', e);
    }
  },

  // Firebase 실시간 불러오기 (상대 기록 포함)
  _startListening() {
    const fc = this._fc();
    if (fc === 'local' || !this._hasDB()) return;
    if (this._unsub && this._listenFc === fc) return;
    if (this._unsub) { try { this._unsub(); } catch(e) {} this._unsub = null; }

    this._listenFc = fc;
    this._unsub = db.collection('families').doc(fc).collection('diary')
      .orderBy('savedAt', 'desc')
      .limit(100)
      .onSnapshot(snap => {
        this._entries   = snap.docs.map(d => this._fromDoc(d));
        this._entriesFc = fc;
        this._writeCache(fc, this._entries, false);
        this._renderViewArea();
      }, err => {
        console.warn('diary listen:', err);
      });
  },

  /* ── 메인 렌더 ── */
  async render(containerId, myRole) {
    this._containerId = containerId;
    this._myRole = myRole;
    const el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = this._writeForm(myRole) + this._viewToggle() +
      '<div id="kd-view-area"></div>';

    this._renderViewArea();

    // [수정] 기존 기록 이전 → Firebase 실시간 불러오기
    this._migrateLocal().finally(() => this._startListening());
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
                     cursor:pointer;font-family:SUIT,sans-serif;transition:all 0.15s;
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
                 font-family:SUIT,sans-serif;color:#3d3530;outline:none;">
        <button id="kd-save-btn" onclick="KyncDiary.save('${this._myRole}')"
          style="width:100%;padding:14px;background:#3d3530;color:#fff;border:none;
                 border-radius:14px;font-size:14px;font-weight:800;cursor:pointer;
                 font-family:SUIT,sans-serif;margin-top:10px;transition:all 0.2s;">
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
               font-size:13px;font-weight:800;cursor:pointer;font-family:SUIT,sans-serif;">
        피드
      </button>
      <button id="kd-tab-calendar" onclick="KyncDiary.switchView('calendar')"
        style="flex:1;padding:11px;border-radius:12px;border:none;
               background:${this._view==='calendar'?'#3d3530':'#fff'};
               color:${this._view==='calendar'?'#fff':'#6b6560'};
               border:${this._view==='calendar'?'none':'1.5px solid #e8e3da'};
               font-size:13px;font-weight:800;cursor:pointer;font-family:SUIT,sans-serif;">
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
    if (!document.getElementById('kd-view-area')) return;
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
    input.value = ''; // [수정] 같은 사진 다시 선택 가능
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
    if (this._saving) return; // [수정] 중복 저장 방지
    const memo = document.getElementById('kd-memo')?.value?.trim();
    if (!this._img && !memo) {
      alert('사진이나 메모를 추가해주세요.'); return;
    }

    this._saving = true;
    const btn = document.getElementById('kd-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = '저장 중...'; }

    try {
      // [수정] 사진 압축
      let img = null;
      if (this._img) {
        img = await this._compressImage(this._img);
        if (!img) {
          if (!memo) { alert('사진을 불러오지 못했어요. 다른 사진을 골라주세요.'); return; }
          alert('사진 용량이 커서 메모만 저장돼요.');
        }
      }

      const now = new Date();
      const entry = {
        id:        'd_' + Date.now(),
        role:      myRole,
        img:       img,
        emotion:   this._sel || null,
        memo:      memo || '',
        savedAt:   now.toISOString(),
        dateKey:   this._localDate(now),
        uid:       KyncAuth?.current?.uid || localStorage.getItem('kync_user_uid') || '',
        name:      localStorage.getItem('kync_user_name') || (myRole==='parent'?'부모님':'자녀'),
      };

      const fc = this._fc();

      // [수정] Firebase에 먼저 저장 (사진 포함)
      if (fc !== 'local' && this._hasDB()) {
        const data = {
          role:          entry.role,
          emotion:       entry.emotion,
          memo:          entry.memo,
          uid:           entry.uid,
          name:          entry.name,
          clientSavedAt: entry.savedAt,
          dateKey:       entry.dateKey,
          savedAt:       firebase.firestore.FieldValue.serverTimestamp(),
        };
        if (img) data.img = img;
        await db.collection('families').doc(fc).collection('diary').doc(entry.id).set(data);
      }

      // 화면·캐시 반영
      const next = [entry, ...this._getEntries().filter(x => x.id !== entry.id)].slice(0, 100);
      this._entries = next;
      this._entriesFc = fc;
      this._writeCache(fc, next, fc === 'local');

      if (typeof KyncDB !== 'undefined' && KyncAuth?.current) {
        await KyncDB.addPoints(KyncAuth.current.uid, 15).catch(()=>{});
      }

      // 리셋
      this._img = null; this._sel = null;
      const preview = document.getElementById('kd-preview');
      const ph = document.getElementById('kd-photo-placeholder');
      if (preview) { preview.style.display='none'; preview.src=''; }
      if (ph) ph.style.display = ''; // [수정] 원래 배치 유지
      const memoInput = document.getElementById('kd-memo');
      if (memoInput) memoInput.value = '';
      this.EMOTIONS.forEach(e => {
        const b = document.getElementById(`kd-emo-${e.id}`);
        if (b) { b.style.background='#fff'; b.style.borderColor='#e8e3da'; b.style.color='#6b6560'; }
      });

      this._renderViewArea();
    } catch(e) {
      console.warn('diary save:', e);
      alert('저장에 실패했어요. 인터넷 연결을 확인하고 다시 시도해주세요.');
    } finally {
      this._saving = false;
      if (btn) { btn.disabled = false; btn.textContent = '기록하기'; }
    }
  },

  /* ── 삭제 ── */
  async deleteEntry(entryId, myRole) {
    if (!confirm('이 기록을 삭제할까요?')) return;

    const fc = this._fc();

    if (fc !== 'local' && this._hasDB()) {
      try {
        await db.collection('families').doc(fc).collection('diary').doc(entryId).delete();
      } catch(e) {
        console.warn('diary delete:', e);
        alert('삭제에 실패했어요. 다시 시도해주세요.');
        return;
      }
    }

    const next = this._getEntries().filter(e => e.id !== entryId);
    this._entries = next;
    this._entriesFc = fc;
    this._writeCache(fc, next, fc === 'local');

    this._renderViewArea();
  },

  /* ── 피드 렌더 ── */
  async renderFeed(myRole, filterDate, targetId = 'kd-view-area') {
    const feed = document.getElementById(targetId);
    if (!feed) return;

    let arr = this._getEntries().slice();

    if (filterDate) {
      arr = arr.filter(e => this._entryDate(e) === filterDate);
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
      const entryId = this._esc(e.id || '');
      const name = this._esc(e.name || '');
      const memo = this._esc(e.memo || '');

      return `
        <div style="background:#fff;border-radius:20px;overflow:hidden;
                    border:1.5px solid #e8e3da;margin-bottom:12px;position:relative;">

          ${isMe ? `
            <button onclick="KyncDiary.deleteEntry('${entryId}','${myRole}')"
              style="position:absolute;top:10px;right:10px;z-index:2;
                     width:28px;height:28px;border-radius:50%;
                     background:rgba(0,0,0,0.4);border:none;cursor:pointer;
                     color:#fff;font-size:14px;display:flex;align-items:center;
                     justify-content:center;font-family:SUIT,sans-serif;">×</button>
          ` : ''}

          ${e.img ? `
            <div style="width:100%;aspect-ratio:4/3;overflow:hidden;">
              <img src="${e.img}" style="width:100%;height:100%;object-fit:cover;"
                   onclick="KyncDiary.openImgById('${entryId}')">
            </div>
          ` : ''}

          <div style="padding:14px 16px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:${e.memo?'8px':'0'};">
              <div style="width:28px;height:28px;border-radius:50%;
                          background:${isMe?'#3d3530':'#e8e3da'};
                          display:flex;align-items:center;justify-content:center;
                          font-size:11px;font-weight:800;
                          color:${isMe?'#fff':'#6b6560'};flex-shrink:0;">
                ${this._esc((e.name||'?')[0])}
              </div>
              <div style="flex:1;">
                <span style="font-size:13px;font-weight:700;color:#3d3530;">${name}</span>
                ${emo ? `<span style="margin-left:7px;padding:3px 9px;border-radius:20px;
                   background:${emo.bg};font-size:11px;font-weight:700;color:#6b6560;">
                   <span style="display:inline-block;width:5px;height:5px;border-radius:50%;
                          background:${emo.dot};margin-right:3px;vertical-align:middle;"></span>${emo.label}
                   </span>` : ''}
              </div>
              <div style="font-size:11px;color:#d4cdc2;flex-shrink:0;">${time}</div>
            </div>
            ${e.memo ? `<div style="font-size:14px;color:#3d3530;line-height:1.65;font-weight:500;">${memo}</div>` : ''}
          </div>
        </div>`;
    }).join('');
  },

  /* ── 캘린더 렌더 ── */
  _renderCalendar() {
    const area = document.getElementById('kd-view-area');
    if (!area) return;

    const arr = this._getEntries();

    // 날짜별 기록 개수 맵 (기기 시간 기준)
    const countMap = {};
    arr.forEach(e => {
      const d = this._entryDate(e);
      if (!d) return;
      countMap[d] = (countMap[d] || 0) + 1;
    });

    const year  = this._calMonth.getFullYear();
    const month = this._calMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const todayStr = this._localDate(new Date()); // [수정] UTC → 기기 시간

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

  // [수정] 요소 바꿔치기 없이 캘린더 아래 영역에 바로 렌더
  _renderCalendarFeed() {
    this.renderFeed(this._myRole, this._selectedDate, 'kd-calendar-feed');
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

  // [추가] 긴 사진 데이터를 onclick에 넣지 않도록 id로 열기
  openImgById(id) {
    const e = this._getEntries().find(x => x.id === id);
    if (e && e.img) this.openImg(e.img);
  },
};

window.KyncDiary = KyncDiary; 