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
    {id:'happy',  label:'좋음',   dot:'#F2B53B'},
    {id:'calm',   label:'평온',   dot:'#6DBB8F'},
    {id:'tired',  label:'피곤',   dot:'#A8B0BD'},
    {id:'anxious',label:'불안',   dot:'#EE8B5E'},
    {id:'sad',    label:'슬픔',   dot:'#7C93C9'},
    {id:'angry',  label:'화남',   dot:'#C9423A'},
    {id:'proud',  label:'뿌듯',   dot:'#B07A4F'},
    {id:'lonely', label:'외로움', dot:'#9B86B5'},
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
      likes:   x.likes || {},
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
        if (typeof KyncInbox !== 'undefined') KyncInbox.refresh();
      }, err => {
        console.warn('diary listen:', err);
      });
  },


  stop() {
    if (this._unsub) { try { this._unsub(); } catch(e) {} this._unsub = null; }
    this._listenFc = null;
    this._entries = null;
  },

  /* ── 메인 렌더 ── */
  async render(containerId, myRole) {
    this._containerId = containerId;
    this._myRole = myRole;
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = this._writeForm() + this._viewToggle() + '<div id="kd-view-area" class="stack"></div>';
    this._renderViewArea();
    this._migrateLocal().finally(() => this._startListening());
  },

  /* ── 작성 카드 ── */
  _writeForm() {
    return `
    <section class="card compose" id="kd-write">
      <div class="photo-pick" id="kd-photo-area" role="button" tabindex="0" aria-label="사진 추가"
        onclick="KyncDiary.pickPhoto()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();KyncDiary.pickPhoto()}">
        ${ic('camera', 30)}
        <span>사진</span>
        <small>${tone('찍거나 앨범에서', '찍거나 앨범에서')}</small>
      </div>
      <input type="file" id="kd-file-input" accept="image/*" class="hidden" onchange="KyncDiary.onPhotoSelected(this)">
      <div class="compose-body">
        <div class="chips" id="kd-emotion-row" role="group" aria-label="오늘의 감정">
          ${this.EMOTIONS.map(e => `<button type="button" class="chip" id="kd-emo-${e.id}" aria-pressed="false"
            onclick="KyncDiary.selectEmotion('${e.id}')"><i class="dot" style="background:${e.dot}"></i>${e.label}</button>`).join('')}
        </div>
        <input id="kd-memo" class="input" type="text" maxlength="60" placeholder="${tone('한 줄 남기기', '한 줄 남기기')}" aria-label="한 줄 메모">
        <button id="kd-save-btn" class="btn btn-primary btn-block" onclick="KyncDiary.save('${this._myRole}')">올리기</button>
      </div>
    </section>`;
  },

  _viewToggle() {
    return `
    <div class="seg" role="tablist" aria-label="보기 방식">
      <button class="${this._view === 'feed' ? 'on' : ''}" onclick="KyncDiary.switchView('feed')">${ic('feed', 17)}피드</button>
      <button class="${this._view === 'calendar' ? 'on' : ''}" onclick="KyncDiary.switchView('calendar')">${ic('calendar', 17)}캘린더</button>
    </div>`;
  },

  switchView(view) {
    this._view = view;
    this._selectedDate = null;
    const el = document.getElementById(this._containerId);
    if (!el) return;
    // 작성 중인 내용은 그대로 두고 아래만 바꿈
    const seg = el.querySelector('.seg');
    if (seg) seg.outerHTML = this._viewToggle();
    this._renderViewArea();
  },

  _renderViewArea() {
    if (!document.getElementById('kd-view-area')) return;
    if (this._view === 'calendar') this._renderCalendar();
    else this.renderFeed(this._myRole);
  },

  /* ── 사진 ── */
  pickPhoto() { document.getElementById('kd-file-input')?.click(); },

  onPhotoSelected(input) {
    const file = input.files[0];
    input.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => { this._img = e.target.result; this._paintPhoto(); };
    reader.readAsDataURL(file);
  },

  _paintPhoto() {
    const area = document.getElementById('kd-photo-area');
    if (!area) return;
    if (this._img) {
      area.innerHTML = `<img src="${this._img}" alt="고른 사진">`;
      {
        const rm = document.createElement('button');
        rm.type = 'button'; rm.id = 'kd-photo-remove'; rm.className = 'remove'; rm.setAttribute('aria-label', '사진 빼기');
        rm.innerHTML = ic('x', 18);
        rm.onclick = ev => { ev.stopPropagation(); this._img = null; this._paintPhoto(); };
        area.appendChild(rm);
      }
    } else {
      area.innerHTML = `${ic('camera', 30)}<span>사진</span><small>찍거나 앨범에서</small>`;
    }
  },

  selectEmotion(id) {
    this._sel = this._sel === id ? null : id;
    this.EMOTIONS.forEach(e => {
      const btn = document.getElementById(`kd-emo-${e.id}`);
      if (!btn) return;
      btn.classList.toggle('on', e.id === this._sel);
      btn.setAttribute('aria-pressed', e.id === this._sel);
    });
  },

  /* ── 저장 ── */
  async save(myRole) {
    if (this._saving) return;
    const memo = document.getElementById('kd-memo')?.value?.trim();
    if (!this._img && !memo) { toast(tone('사진이나 한 줄 중 하나는 있어야 해요', '사진이나 한 줄 중 하나는 있어야 해'), 'error'); return; }

    this._saving = true;
    const btn = document.getElementById('kd-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = '저장하는 중'; }

    try {
      let img = null;
      if (this._img) {
        img = await this._compressImage(this._img);
        if (!img) {
          if (!memo) { toast('사진을 불러오지 못했어요. 다른 사진을 골라주세요.', 'error'); return; }
          toast('사진이 너무 커서 메모만 저장해요.');
        }
      }

      const now = new Date();
      const entry = {
        id:      'd_' + Date.now(),
        role:    myRole,
        img,
        emotion: this._sel || null,
        memo:    memo || '',
        savedAt: now.toISOString(),
        dateKey: this._localDate(now),
        uid:     KyncAuth?.current?.uid || localStorage.getItem('kync_user_uid') || '',
        name:    localStorage.getItem('kync_user_name') || (myRole === 'parent' ? '부모님' : '자녀'),
      };

      const fc = this._fc();
      if (fc !== 'local' && this._hasDB()) {
        const data = {
          role: entry.role, emotion: entry.emotion, memo: entry.memo, uid: entry.uid, name: entry.name,
          clientSavedAt: entry.savedAt, dateKey: entry.dateKey,
          savedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };
        if (img) data.img = img;
        await db.collection('families').doc(fc).collection('diary').doc(entry.id).set(data);
      }

      const next = [entry, ...this._getEntries().filter(x => x.id !== entry.id)].slice(0, 100);
      this._entries = next;
      this._entriesFc = fc;
      this._writeCache(fc, next, fc === 'local');

      // 작성 칸 비우기
      this._img = null; this._paintPhoto();
      this._sel = null; this.selectEmotion(null);
      const memoInput = document.getElementById('kd-memo');
      if (memoInput) memoInput.value = '';
      toast(tone('올렸어요', '올렸어'), 'ok');
      window.KyncDaily?.refresh?.();
      this._renderViewArea();
    } catch(e) {
      console.warn('diary save:', e);
      toast(tone('못 올렸어요. 인터넷 연결을 확인해주세요.', '못 올렸어. 인터넷 연결 확인해줘'), 'error');
    } finally {
      this._saving = false;
      if (btn) { btn.disabled = false; btn.textContent = '올리기'; }
    }
  },

  /* ── 삭제 ── */
  async deleteEntry(entryId) {
    const ok = await KyncUI.confirm({ title: tone('이 기록을 지울까요?', '이거 지울까?'), message: tone('가족 화면에서도 사라져요.', '가족 화면에서도 없어져.'), ok: '지우기', danger: true });
    if (!ok) return;
    const fc = this._fc();
    if (fc !== 'local' && this._hasDB()) {
      try { await db.collection('families').doc(fc).collection('diary').doc(entryId).delete(); }
      catch(e) { console.warn('diary delete:', e); toast('지우지 못했어요. 다시 시도해주세요.', 'error'); return; }
    }
    const next = this._getEntries().filter(e => e.id !== entryId);
    this._entries = next;
    this._entriesFc = fc;
    this._writeCache(fc, next, fc === 'local');
    toast(tone('지웠어요', '지웠어'), 'ok');
    this._renderViewArea();
  },

  /* ── 피드 ── */
  async renderFeed(myRole, filterDate, targetId = 'kd-view-area') {
    const feed = document.getElementById(targetId);
    if (!feed) return;
    let arr = this._getEntries().slice();
    if (filterDate) arr = arr.filter(e => this._entryDate(e) === filterDate);

    if (arr.length === 0) {
      feed.innerHTML = `
        <div class="empty">
          ${KyncBrand.mascot(filterDate ? 'sleepy' : 'default', 84)}
          <b>${filterDate ? tone('이 날은 기록이 없어요', '이 날은 기록 없음') : tone('아직 기록이 없어요', '아직 기록 없음')}</b>
          ${filterDate ? '' : `<p>${tone('사진 한 장이나 한 줄이면 돼요.', '사진 한 장이나 한 줄이면 돼.')}</p>`}
        </div>`;
      return;
    }

    feed.innerHTML = arr.map(e => {
      const emo  = this.EMOTIONS.find(x => x.id === e.emotion);
      const d    = e.savedAt ? new Date(e.savedAt) : null;
      const time = d && !isNaN(d) ? `${d.getMonth() + 1}월 ${d.getDate()}일` : '';
      const isMe = e.role === myRole;
      const entryId = this._esc(e.id || '');
      return `
        <article class="card post">
          ${e.img ? `<img class="post-img" src="${e.img}" alt="${this._esc(e.name)}의 사진" loading="lazy" onclick="KyncDiary.openImgById('${entryId}')">` : ''}
          <div class="post-body">
            <div class="post-meta">
              ${KyncUI.avatar(e.uid, e.role, 'sm')}
              <span class="name">${this._esc(e.name || '')}</span>
              ${emo ? `<span class="pill"><i class="dot" style="width:7px;height:7px;border-radius:50%;background:${emo.dot}"></i>${emo.label}</span>` : ''}
              <span class="date">${time}</span>
              ${isMe ? `<button class="icon-btn sm" onclick="KyncDiary.deleteEntry('${entryId}')" aria-label="기록 지우기">${ic('trash', 18)}</button>` : ''}
            </div>
            ${e.memo ? `<p class="post-memo">${this._esc(e.memo)}</p>` : ''}
            ${this._likeRow(e, isMe)}
          </div>
        </article>`;
    }).join('');
  },

  /* ── 좋아요 (상대 글에만 누를 수 있음) ── */
  _likeRow(e, isMe) {
    const me = this._myRole, other = me === 'parent' ? 'child' : 'parent';
    const otherLabel = me === 'parent' ? '자녀' : '부모님';
    if (isMe) return e.likes?.[other] ? `<div class="post-liked">${ic('heart', 14)}${josa(otherLabel, '이/가')} 좋아해요</div>` : '';
    if (this._fc() === 'local') return '';
    const on = !!e.likes?.[me];
    return `<button class="like-btn ${on ? 'on' : ''}" aria-pressed="${on}" onclick="KyncDiary.toggleLike('${this._esc(e.id)}')">${ic('heart', 17)}${on ? '좋아함' : '좋아요'}</button>`;
  },

  async toggleLike(id) {
    const e = this._getEntries().find(x => x.id === id);
    if (!e || !this._hasDB()) return;
    const me = this._myRole, on = !!e.likes?.[me];
    e.likes = { ...(e.likes || {}), [me]: !on };
    this._renderViewArea();
    try {
      await db.collection('families').doc(this._fc()).collection('diary').doc(id)
        .update({ [`likes.${me}`]: on ? firebase.firestore.FieldValue.delete() : true });
    } catch (err) {
      e.likes[me] = on; this._renderViewArea();
      toast(tone('못 눌렀어요. 다시 해주세요.', '안 눌렸어. 다시 해줘'), 'error');
    }
  },

  /* ── 캘린더 ── */
  _renderCalendar() {
    const area = document.getElementById('kd-view-area');
    if (!area) return;
    const countMap = {};
    this._getEntries().forEach(e => { const d = this._entryDate(e); if (d) countMap[d] = (countMap[d] || 0) + 1; });

    const year = this._calMonth.getFullYear(), month = this._calMonth.getMonth();
    const startWeekday = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const todayStr = this._localDate(new Date());

    let cells = '';
    for (let i = 0; i < startWeekday; i++) cells += '<div></div>';
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${this._pad(month + 1)}-${this._pad(d)}`;
      const cls = [dateStr === todayStr ? 'today' : '', dateStr === this._selectedDate ? 'sel' : ''].join(' ');
      cells += `<button class="cal-day ${cls}" onclick="KyncDiary.selectDate('${dateStr}')" aria-label="${month + 1}월 ${d}일${countMap[dateStr] ? ', 기록 있음' : ''}">
        ${d}${countMap[dateStr] ? '<i></i>' : '<span style="height:5px"></span>'}</button>`;
    }

    area.innerHTML = `
      <section class="card">
        <div class="cal-head">
          <button class="icon-btn sm" onclick="KyncDiary.changeMonth(-1)" aria-label="이전 달">${ic('back', 18)}</button>
          <b>${year}년 ${month + 1}월</b>
          <button class="icon-btn sm" onclick="KyncDiary.changeMonth(1)" aria-label="다음 달">${ic('chev', 18)}</button>
        </div>
        <div class="cal-grid">
          ${['일','월','화','수','목','금','토'].map(d => `<div class="cal-dow">${d}</div>`).join('')}
          ${cells}
        </div>
      </section>
      <div id="kd-calendar-feed" class="stack"></div>`;

    if (this._selectedDate) this.renderFeed(this._myRole, this._selectedDate, 'kd-calendar-feed');
    else document.getElementById('kd-calendar-feed').innerHTML = `<p class="small sub center" style="padding:8px">${tone('날짜를 누르면 그날 기록이 보여요.', '날짜 누르면 그날 기록 보여.')}</p>`;
  },

  changeMonth(delta) {
    this._calMonth = new Date(this._calMonth.getFullYear(), this._calMonth.getMonth() + delta, 1);
    this._renderCalendar();
  },

  selectDate(dateStr) {
    this._selectedDate = this._selectedDate === dateStr ? null : dateStr;
    this._renderCalendar();
  },

  /* ── 사진 크게 보기 ── */
  openImgById(id) {
    const e = this._getEntries().find(x => x.id === id);
    if (!e?.img) return;
    const view = document.createElement('div');
    view.className = 'img-view';
    view.setAttribute('role', 'dialog');
    view.innerHTML = `<img src="${e.img}" alt="">`;
    view.onclick = () => view.remove();
    document.body.appendChild(view);
  },
};

window.KyncDiary = KyncDiary;
