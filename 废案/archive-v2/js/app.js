/**
 * VidaOS — 应用主逻辑
 * 纯前端 SPA：路由 / 首页 / 日历 / 音乐 / 便签 / 空间 / 动态 / 信箱 / 收藏夹 /
 * 编辑器 / 导入导出 / PWA。数据经 VidaStore 持久化到本地。
 */
(function () {
  'use strict';

  /* ========================================================================
     1. 基础工具
     ===================================================================== */
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }
  function icon(name, cls) { return Icons.svg(name, cls || ''); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function nowISO() { return new Date().toISOString(); }
  function todayStr() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function dateOf(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

  function fmtDateTime(iso) {
    const d = new Date(iso);
    const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const now = new Date();
    const sameYear = d.getFullYear() === now.getFullYear();
    return `${sameYear ? '' : d.getFullYear() + '年'}${d.getMonth() + 1}月${d.getDate()}日 ${hm}`;
  }
  function fmtDate(iso) {
    const d = new Date(iso);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  }
  function fmtRelative(iso) {
    const d = new Date(iso); const diff = Date.now() - d.getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return '刚刚';
    if (m < 60) return m + ' 分钟前';
    const h = Math.floor(m / 60);
    if (h < 24) return h + ' 小时前';
    const day = Math.floor(h / 24);
    if (day === 1) return '昨天';
    if (day < 7) return day + ' 天前';
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }
  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return '夜深了';
    if (h < 9) return '早上好';
    if (h < 12) return '上午好';
    if (h < 14) return '中午好';
    if (h < 18) return '下午好';
    return '晚上好';
  }
  function stripMd(md) {
    return String(md || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[#>*_~`\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* ========================================================================
     2. 状态与持久化
     ===================================================================== */
  let state = null;
  const urlCache = {};

  async function persist() {
    try { await VidaStore.saveState(state); }
    catch (e) { toast('保存失败：存储空间可能已满'); console.error(e); }
  }
  function mutate(fn) { fn(); persist(); }

  async function fileURL(id) {
    if (!id) return null;
    if (urlCache[id]) return urlCache[id];
    const blob = await VidaStore.getFile(id);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    urlCache[id] = url;
    return url;
  }

  async function hydrateImages(root) {
    const imgs = root ? Array.from(root.querySelectorAll('img[data-fid]')) : [];
    for (const img of imgs) {
      const url = await fileURL(img.getAttribute('data-fid'));
      if (url) img.src = url; else img.remove();
    }
  }

  function imgTag(fid, cls) {
    return `<img data-fid="${esc(fid)}" class="${cls || ''}" alt="">`;
  }

  /* ========================================================================
     3. Markdown 渲染
     ===================================================================== */
  function mdToHtml(text) {
    try {
      return DOMPurify.sanitize(marked.parse(text || ''), { USE_PROFILES: { html: true } });
    } catch (e) { return esc(text || ''); }
  }

  /* ========================================================================
     4. 路由
     ===================================================================== */
  const TABS = [
    { id: 'desk', label: '桌面', en: 'Desk', icon: 'grid' },
    { id: 'notes', label: '便签', en: 'Notes', icon: 'note' },
    { id: 'data', label: '数据', en: 'Data', icon: 'database' },
    { id: 'settings', label: '设置', en: 'Settings', icon: 'settings' },
  ];
  const FUNCS = [
    { id: 'space', label: '空间', en: 'Space', icon: 'layers' },
    { id: 'moments', label: '动态', en: 'Moments', icon: 'message' },
    { id: 'mailbox', label: '信箱', en: 'Mailbox', icon: 'mail' },
    { id: 'favorites', label: '收藏夹', en: 'Fav', icon: 'bookmark' },
  ];
  const VIEW_META = {
    desk: { title: 'VidaOS', sub: '桌面 · Desk' },
    notes: { title: '便签', sub: 'Notes' },
    data: { title: '数据', sub: 'Data' },
    settings: { title: '设置', sub: 'Settings' },
    space: { title: '空间', sub: 'Space' },
    collection: { title: '合集', sub: 'Collection' },
    article: { title: '阅读', sub: 'Article' },
    moments: { title: '动态', sub: 'Moments' },
    mailbox: { title: '信箱', sub: 'Mailbox' },
    favorites: { title: '收藏夹', sub: 'Favorites' },
  };

  let currentTab = 'desk';
  let currentView = 'desk';
  let viewParams = {};
  let stack = [];

  function switchTab(tab) {
    currentTab = tab;
    currentView = tab;
    viewParams = {};
    stack = [];
    state.settings.lastTab = tab;
    persist();
    render();
    $('#content').scrollTop = 0;
  }

  function push(view, params) {
    stack.push({ view: currentView, params: viewParams });
    currentView = view;
    viewParams = params || {};
    render();
    $('#content').scrollTop = 0;
  }

  function goBack() {
    if (stack.length) {
      const prev = stack.pop();
      currentView = prev.view;
      viewParams = prev.params;
      render();
    }
  }

  function renderTabbar() {
    $('#tabbarInner').innerHTML = TABS.map((t) => `
      <button class="tab-item ${currentTab === t.id ? 'active' : ''}" data-action="tab" data-tab="${t.id}">
        ${icon(t.icon)}
        <span>${t.label}</span>
      </button>`).join('');
  }

  function updateTopbar() {
    const meta = VIEW_META[currentView] || { title: currentView, sub: '' };
    let sub = meta.sub;
    if (currentView === 'collection') {
      const c = state.collections.find((x) => x.id === viewParams.collectionId);
      sub = c ? c.name : '合集';
    } else if (currentView === 'article') {
      const a = state.articles.find((x) => x.id === viewParams.articleId);
      sub = a && a.title ? a.title : '文章';
    }
    $('#topTitle').textContent = meta.title;
    $('#topSub').textContent = sub;
    $('#topBack').classList.toggle('visible', stack.length > 0);
  }

  function render() {
    updateTopbar();
    renderTabbar();
    const views = ['desk', 'notes', 'data', 'settings', 'space', 'collection', 'article', 'moments', 'mailbox', 'favorites'];
    views.forEach((v) => { const el = $('#view-' + v); if (el) el.classList.toggle('active', v === currentView); });
    const fn = RENDERERS[currentView];
    if (fn) fn();
  }

  /* ========================================================================
     5. 首页（桌面 · 12 列挂件网格，参照 InternalBeyond Desk 体系）
     ===================================================================== */
  function renderDesk() {
    const p = state.profile;
    $('#view-desk').innerHTML = `
      <div class="content-inner" style="max-width:var(--home-w)">
        <div class="dgrid">
          <div class="hero dk-full">
            <div class="hero-row1">
              <div class="hero-avatar" id="heroAvatar">${icon('user')}</div>
              <div class="hero-greet">
                <span class="hi" id="heroGreet">${greeting()}</span>
                <span class="name" id="heroName">${esc(p.name || 'VidaOS')}</span>
              </div>
            </div>
            <div class="hero-day" id="heroDate">—</div>
            <div class="hero-time" id="heroTime">--:--</div>
            <div class="hero-sig" id="heroSignature">${esc(p.signature || '')}</div>
          </div>

          ${FUNCS.map((f) => `
            <button class="app-tile dk-3" data-action="func" data-func="${f.id}">
              <span class="at-ic">${icon(f.icon)}</span>
              <span class="at-name">${f.label}</span>
              <span class="at-en">${f.en}</span>
            </button>`).join('')}

          ${renderCalendarCard()}
          ${renderAgendaCard()}
          ${renderPlayerCard()}
        </div>
      </div>`;
    hydrateAvatar();
    tick();
  }

  function funcCount(id) {
    if (id === 'space') return state.articles.length;
    if (id === 'moments') return state.moments.length;
    if (id === 'mailbox') return state.letters.length;
    if (id === 'favorites') return state.favorites.length;
    return 0;
  }

  function hydrateAvatar() {
    const el = $('#heroAvatar');
    if (!el || !state.profile.avatar) return;
    fileURL(state.profile.avatar).then((url) => { if (url) el.innerHTML = `<img src="${url}" alt="">`; });
  }

  function tick() {
    const d = new Date();
    const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const topClock = $('#topClock'); if (topClock) topClock.textContent = hm;
    const heroTime = $('#heroTime');
    if (heroTime && currentView === 'desk') heroTime.textContent = hm;
    const heroDate = $('#heroDate');
    if (heroDate && currentView === 'desk') {
      const wd = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
      heroDate.textContent = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 · 星期${wd}`;
    }
    const heroGreet = $('#heroGreet');
    if (heroGreet && currentView === 'desk') heroGreet.textContent = greeting();
  }

  /* ------------------------------------------------------------------------
     5.1 日历月历挂件（事项日打点）
     --------------------------------------------------------------------- */
  const calState = { y: new Date().getFullYear(), m: new Date().getMonth(), sel: todayStr() };

  function scheduleEventsFor(dateStr) {
    return state.notes.schedule
      .filter((s) => s.date === dateStr)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }

  function renderCalendarCard() {
    const { y, m, sel } = calState;
    const days = new Date(y, m + 1, 0).getDate();
    const lead = new Date(y, m, 1).getDay(); // 0=周日
    let cells = '';
    for (let i = 0; i < lead + days; i++) {
      const dayNum = i - lead + 1;
      if (dayNum < 1) { cells += `<div class="cal-day dim"></div>`; continue; }
      const dateStr = `${y}-${pad(m + 1)}-${pad(dayNum)}`;
      const hasEvent = scheduleEventsFor(dateStr).length > 0;
      const cls = ['cal-day'];
      if (dateStr === todayStr()) cls.push('today');
      if (dateStr === sel) cls.push('selected');
      cells += `<button class="${cls.join(' ')}" data-action="cal-day" data-date="${dateStr}">
        <span class="dn">${dayNum}</span>
        ${hasEvent ? `<span class="dots"><span class="dot"></span></span>` : ''}
      </button>`;
    }
    // 补足到 6 行（42 格），保持网格整齐
    for (let i = 0; i < Math.max(0, 42 - (lead + days)); i++) cells += `<div class="cal-day dim"></div>`;

    return `
      <div class="wgt glass dk-6">
        <div class="wgt-top">
          <span class="wgt-title">日历</span>
          <span class="wgt-lab" style="margin-left:8px">Calendar</span>
          <div class="wgt-sp"></div>
          <button class="icon-glass" data-action="cal-today" title="回到今天" style="width:30px;height:30px">${icon('refresh')}</button>
        </div>
        <div class="cal-head">
          <button class="cal-nav" data-action="cal-prev">${icon('chevronLeft')}</button>
          <div class="cal-month">${y} 年 ${m + 1} 月</div>
          <button class="cal-nav" data-action="cal-next">${icon('chevronRight')}</button>
        </div>
        <div class="cal-weekdays">${['日', '一', '二', '三', '四', '五', '六'].map((w) => `<span>${w}</span>`).join('')}</div>
        <div class="cal-grid">${cells}</div>
      </div>`;
  }

  /* ------------------------------------------------------------------------
     5.2 当日日程挂件（与月历双卡并列）
     --------------------------------------------------------------------- */
  function renderAgendaCard() {
    const evs = scheduleEventsFor(calState.sel);
    const selD = new Date(calState.sel + 'T00:00:00');
    const selLabel = `${selD.getMonth() + 1}月${selD.getDate()}日`;

    return `
      <div class="wgt glass dk-6">
        <div class="wgt-top">
          <span class="wgt-title">日程</span>
          <span class="wgt-lab" style="margin-left:8px">Agenda</span>
          <div class="wgt-sp"></div>
          <span class="ag-date-line">${selLabel}</span>
          <button class="icon-glass" data-action="cal-add" title="添加当日日程" style="width:30px;height:30px">${icon('plus')}</button>
        </div>
        <div class="agenda-list">
          ${evs.length ? evs.map((e) => `
            <div class="ag-event ${e.done ? 'done' : ''}">
              <span class="bar"></span>
              <button class="ev-body" data-action="cal-event" data-id="${e.id}">
                <div class="ev-title">${esc(e.title || e.note || '未命名日程')}</div>
                <div class="ev-time">${esc(e.time || '')}${e.category ? ' · ' + esc(e.category) : ''}</div>
              </button>
              <button class="check ${e.done ? 'on' : ''}" data-action="cal-toggle" data-id="${e.id}">${icon('check')}</button>
            </div>`).join('')
            : `<div class="agenda-empty">${icon('calendar')}<span>这一天还没有安排</span></div>`}
        </div>
      </div>`;
  }

  /* ------------------------------------------------------------------------
     5.2 音乐播放器
     --------------------------------------------------------------------- */
  const player = { currentId: null, playing: false, time: 0, dur: 0, vol: 0.7 };
  let audioEl = null;
  let audioCtx = null, noiseSrc = null, noiseGain = null;
  let tickTimer = null;

  function ensureBuiltinTrack() {
    if (!state.tracks.some((t) => t.builtin)) {
      state.tracks.unshift({ id: 'builtin-rain', title: '雨声 · 白噪音', artist: 'VidaOS 内置音景', builtin: true, createdAt: nowISO() });
      persist();
    }
  }

  function currentTrack() { return state.tracks.find((t) => t.id === player.currentId) || state.tracks[0] || null; }

  function renderPlayerCard() {
    const t = currentTrack();
    const hasTrack = !!t;
    return `
      <div class="wgt glass dk-full player-card">
        <div class="wgt-top">
          <span class="wgt-title">音乐</span>
          <span class="wgt-lab" style="margin-left:8px">Music</span>
          <div class="wgt-sp"></div>
          <span class="ag-date-line">${state.tracks.length} 首</span>
        </div>
        ${hasTrack ? `
        <div class="player-inner">
          <div class="player-cover ${player.playing ? 'playing' : ''}">${icon(t.builtin ? 'droplet' : 'music')}</div>
          <div class="player-main">
            <div class="player-line">
              <div class="player-title">${esc(t.title || '未命名')}</div>
              <div class="player-artist">${esc(t.artist || '未知')}</div>
            </div>
            <div class="slider-track" data-action="seek">
              <div class="rail"><div class="fill" id="seekFill" style="width:${seekPct()}%"></div></div>
              <div class="thumb" id="seekThumb" style="left:${seekPct()}%"></div>
            </div>
            <div class="player-time">
              <span id="curTime">${fmtSec(player.time)}</span>
              <span id="durTime">${t.builtin ? '∞' : fmtSec(player.dur)}</span>
            </div>
            <div class="player-ctl">
              <button class="player-btn" data-action="player-prev" title="上一首">${icon('prev')}</button>
              <button class="player-btn play" data-action="player-play" title="${player.playing ? '暂停' : '播放'}">${icon(player.playing ? 'pause' : 'play')}</button>
              <button class="player-btn" data-action="player-next" title="下一首">${icon('next')}</button>
            </div>
          </div>
          <div class="player-side">
            <div class="slider-track vol" data-action="vol"><div class="rail"><div class="fill" style="width:${player.vol * 100}%"></div></div></div>
            <button class="icon-glass" data-action="player-add" title="添加本地音乐">${icon('plus')}</button>
            <button class="icon-glass" data-action="player-edit" title="编辑曲目信息">${icon('pen')}</button>
            <button class="icon-glass" data-action="player-del" title="删除当前音乐">${icon('trash')}</button>
          </div>
        </div>`
          : `
        <div class="agenda-empty" style="padding:14px 8px 8px">
          <span class="ag-date-line">还没有音乐，点下方「＋」导入本地音频，或试试内置「雨声 · 白噪音」音景</span>
        </div>
        <div class="player-ctl" style="justify-content:flex-end;margin-top:2px">
          <button class="glass-btn" data-action="player-add">${icon('plus')} 添加本地音乐</button>
          <button class="glass-btn" data-action="player-boot">${icon('play')} 播放内置雨声</button>
        </div>`}
      </div>`;
  }

  function seekPct() {
    const t = currentTrack();
    if (!t) return 0;
    if (t.builtin) return 100;
    if (!player.dur) return 0;
    return Math.min(100, (player.time / player.dur) * 100);
  }
  function fmtSec(s) {
    s = Math.max(0, Math.floor(s || 0));
    return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
  }

  function startRain() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (!noiseSrc) {
        const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        noiseSrc = audioCtx.createBufferSource();
        noiseSrc.buffer = buf; noiseSrc.loop = true;
        const lp = audioCtx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200;
        noiseGain = audioCtx.createGain(); noiseGain.gain.value = player.vol * 0.4;
        noiseSrc.connect(lp); lp.connect(noiseGain); noiseGain.connect(audioCtx.destination);
        noiseSrc.start();
      }
      if (noiseGain) noiseGain.gain.value = player.vol * 0.4;
    } catch (e) { console.error(e); }
  }
  function stopRain() {
    if (noiseSrc) { try { noiseSrc.stop(); } catch (e) {} noiseSrc.disconnect(); noiseSrc = null; noiseGain = null; }
  }

  async function playTrack(t, autoplay) {
    player.currentId = t.id;
    stopCurrent();
    if (t.builtin) {
      startRain();
      player.playing = true; player.time = 0; player.dur = 0;
      startTick();
    } else {
      const url = await fileURL(t.fileId);
      if (!url) { toast('音频文件不存在'); return; }
      if (!audioEl) {
        audioEl = new Audio();
        audioEl.addEventListener('timeupdate', () => { player.time = audioEl.currentTime; player.dur = audioEl.duration || 0; updatePlayerProgress(); });
        audioEl.addEventListener('ended', () => { playNext(); });
        audioEl.addEventListener('loadedmetadata', () => { player.dur = audioEl.duration || 0; });
      }
      audioEl.src = url; audioEl.volume = player.vol;
      try { await audioEl.play(); player.playing = true; player.time = audioEl.currentTime; startTick(); }
      catch (e) { toast('无法播放（浏览器限制自动播放）'); player.playing = false; }
    }
    render();
  }

  function stopCurrent() {
    if (audioEl) { audioEl.pause(); audioEl.src = ''; }
    stopRain();
    player.playing = false;
  }

  function togglePlay() {
    const t = currentTrack();
    if (!t) return;
    if (player.playing) {
      if (t.builtin) stopRain(); else audioEl && audioEl.pause();
      player.playing = false; stopTick();
    } else {
      playTrack(t, true);
      return;
    }
    render();
  }

  function playNext() { const list = state.tracks; if (!list.length) return; const i = list.findIndex((t) => t.id === player.currentId); const next = list[(i + 1) % list.length]; playTrack(next); }
  function playPrev() { const list = state.tracks; if (!list.length) return; const i = list.findIndex((t) => t.id === player.currentId); const prev = list[(i - 1 + list.length) % list.length]; playTrack(prev); }

  function startTick() {
    stopTick();
    if (player.playing) {
      tickTimer = setInterval(() => {
        const t = currentTrack();
        if (t && t.builtin) { player.time += 0.5; }
        updatePlayerProgress();
      }, 500);
    }
  }
  function stopTick() { if (tickTimer) { clearInterval(tickTimer); tickTimer = null; } }

  function updatePlayerProgress() {
    const fill = $('#seekFill'), thumb = $('#seekThumb'), cur = $('#curTime');
    if (!fill) return;
    const pct = seekPct();
    fill.style.width = pct + '%';
    if (thumb) thumb.style.left = pct + '%';
    if (cur) cur.textContent = fmtSec(player.time);
  }

  function seekTo(clientX) {
    const t = currentTrack();
    if (!t || t.builtin) return;
    const track = document.querySelector('.player-card .slider-track[data-action="seek"]');
    if (!track) return;
    const r = track.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    if (audioEl && player.dur) { audioEl.currentTime = pct * player.dur; player.time = audioEl.currentTime; }
    updatePlayerProgress();
  }
  function setVolume(clientX) {
    const track = document.querySelector('.player-card .slider-track[data-action="vol"]');
    if (!track) return;
    const r = track.getBoundingClientRect();
    player.vol = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    if (audioEl) audioEl.volume = player.vol;
    if (noiseGain) noiseGain.gain.value = player.vol * 0.4;
    renderPlayerInlineVol();
  }
  function renderPlayerInlineVol() {
    const card = document.querySelector('.player-card');
    if (!card) return;
    const fill = card.querySelector('.slider-track[data-action="vol"] .fill');
    if (fill) fill.style.width = (player.vol * 100) + '%';
  }

  /* ========================================================================
     6. 便签
     ===================================================================== */
  let noteSection = 'inspiration';
  let noteFilter = ''; // category filter ('' = 全部)

  const NOTE_SECS = [
    { id: 'inspiration', label: '灵感', icon: 'sparkle', ph: '记下一个灵感…' },
    { id: 'schedule', label: '日程', icon: 'calendar', ph: '' },
    { id: 'todo', label: '待办', icon: 'check', ph: '添加一件待办…' },
  ];

  function renderNotes() {
    const cats = state.categories[noteSection] || [];
    const chips = [`<button class="chip ${noteFilter === '' ? 'active' : ''}" data-action="chip" data-sec="${noteSection}" data-cat="">全部</button>`]
      .concat(cats.map((c) => `<button class="chip ${noteFilter === c ? 'active' : ''}" data-action="chip" data-sec="${noteSection}" data-cat="${esc(c)}">${esc(c)}</button>`))
      .concat([`<button class="chip" data-action="chip-add" data-sec="${noteSection}">＋</button>`,
        `<button class="chip" data-action="cats-manage" data-sec="${noteSection}" style="color:var(--text-3)">${icon('settings')}</button>`])
      .join('');

    let compose = '';
    if (noteSection === 'inspiration') {
      compose = `<div class="note-compose"><input id="noteCompose" placeholder="${NOTE_SECS[0].ph}"><button class="glass-btn btn-primary" data-action="note-add" data-sec="inspiration">${icon('plus')}</button></div>`;
    } else if (noteSection === 'todo') {
      compose = `<div class="note-compose"><input id="noteCompose" placeholder="${NOTE_SECS[2].ph}"><button class="glass-btn btn-primary" data-action="note-add" data-sec="todo">${icon('plus')}</button></div>`;
    } else {
      compose = `<div class="page-toolbar"><div class="grow"></div><button class="glass-btn btn-primary" data-action="sched-new">${icon('plus')} 新建日程</button></div>`;
    }

    const list = renderNoteList();

    $('#view-notes').innerHTML = `
      <div class="content-inner">
        <div class="segment">
          ${NOTE_SECS.map((s) => `<button class="segment-item ${noteSection === s.id ? 'active' : ''}" data-action="segment" data-sec="${s.id}">${s.label}</button>`).join('')}
        </div>
        <div class="chip-row">${chips}</div>
        ${compose}
        ${list}
      </div>`;
  }

  function renderNoteList() {
    const items = state.notes[noteSection].filter((n) => noteFilter === '' || n.category === noteFilter);
    // 排序：日程按时间，其余按创建倒序
    if (noteSection === 'schedule') items.sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || ''));
    else items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    if (!items.length) {
      return `<div class="empty">
        <span style="display:block">${icon(NOTE_SECS.find((s) => s.id === noteSection).icon)}</span>
        <span class="et">这里空空的</span>
        <span class="ed">${noteSection === 'schedule' ? '点击上方「新建日程」安排你的日子' : '在上方输入框写下第一条吧'}</span>
      </div>`;
    }

    return `<div class="note-list">${items.map((n) => noteCardHTML(n)).join('')}</div>`;
  }

  function noteCardHTML(n) {
    if (noteSection === 'todo') {
      return `<div class="note-card ${n.done ? 'done' : ''}">
        <button class="check ${n.done ? 'on' : ''}" data-action="note-toggle" data-sec="todo" data-id="${n.id}">${icon('check')}</button>
        <div class="note-body">
          <div class="note-text">${esc(n.content)}</div>
          <div class="note-meta">
            ${n.category ? `<span class="chip small">${esc(n.category)}</span>` : ''}
            <span class="note-date">${fmtRelative(n.createdAt)}</span>
          </div>
        </div>
        <div class="note-actions">
          <button class="icon-glass mini" data-action="note-edit" data-sec="todo" data-id="${n.id}">${icon('pen')}</button>
          <button class="icon-glass mini" data-action="note-del" data-sec="todo" data-id="${n.id}">${icon('trash')}</button>
        </div>
      </div>`;
    }
    if (noteSection === 'schedule') {
      return `<div class="note-card ${n.done ? 'done' : ''}">
        <button class="check ${n.done ? 'on' : ''}" data-action="note-toggle" data-sec="schedule" data-id="${n.id}">${icon('check')}</button>
        <div class="note-body">
          <div class="note-text">${esc(n.title || n.note || '未命名日程')}</div>
          <div class="note-meta">
            <span class="chip small">${esc(n.date || '')}${n.time ? ' ' + esc(n.time) : ''}</span>
            ${n.category ? `<span class="chip small">${esc(n.category)}</span>` : ''}
          </div>
        </div>
        <div class="note-actions">
          <button class="icon-glass mini" data-action="note-edit" data-sec="schedule" data-id="${n.id}">${icon('pen')}</button>
          <button class="icon-glass mini" data-action="note-del" data-sec="schedule" data-id="${n.id}">${icon('trash')}</button>
        </div>
      </div>`;
    }
    // inspiration
    return `<div class="note-card">
      <div class="note-body">
        <div class="note-text">${esc(n.content)}</div>
        <div class="note-meta">
          ${n.category ? `<span class="chip small">${esc(n.category)}</span>` : ''}
          <span class="note-date">${fmtRelative(n.createdAt)}</span>
        </div>
      </div>
      <div class="note-actions">
        <button class="icon-glass mini" data-action="note-edit" data-sec="inspiration" data-id="${n.id}">${icon('pen')}</button>
        <button class="icon-glass mini" data-action="note-del" data-sec="inspiration" data-id="${n.id}">${icon('trash')}</button>
      </div>
    </div>`;
  }

  function addNote(content) {
    if (!content.trim()) return;
    const item = { id: VidaStore.uid('n'), content: content.trim(), category: noteFilter || '', createdAt: nowISO() };
    mutate(() => state.notes[noteSection].unshift(item));
    renderNotes();
  }
  function addTodo(content) {
    if (!content.trim()) return;
    const item = { id: VidaStore.uid('t'), content: content.trim(), category: noteFilter || '', done: false, createdAt: nowISO(), completedAt: null };
    mutate(() => state.notes.todo.unshift(item));
    renderNotes();
  }

  /* ========================================================================
     7. 空间 / 合集 / 文章
     ===================================================================== */
  function renderSpace() {
    const cols = state.collections;
    const arts = state.articles.slice().sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));
    $('#view-space').innerHTML = `
      <div class="content-inner">
        <div class="page-toolbar">
          <span class="section-label">合集 · ${cols.length}</span>
          <div class="grow"></div>
          <button class="glass-btn" data-action="new-collection">${icon('folder')} 新建合集</button>
          <button class="glass-btn btn-primary" data-action="new-article">${icon('pen')} 写文章</button>
        </div>
        ${cols.length ? `<div class="card-grid">${cols.map(colCard).join('')}</div>` : ''}
        <div class="section-label" style="margin-top:6px">文章 · ${arts.length}</div>
        <div class="card-grid">
          ${arts.length ? arts.map((a) => postCardHTML(a)).join('') : emptyHTML('file', '还没有文章', '点击「写文章」开始你的长文空间')}
        </div>
      </div>`;
    hydrateImages($('#view-space'));
  }

  function colCard(c) {
    const count = state.articles.filter((a) => a.collectionId === c.id).length;
    return `<div class="collection-card" data-action="open-collection" data-id="${c.id}">
      <div class="collection-cover">${c.cover ? imgTag(c.cover, '') : icon('folder')}</div>
      <div class="collection-info">
        <div class="collection-name">${esc(c.name)}</div>
        <div class="collection-desc">${esc(c.desc || '')} · ${count} 篇</div>
      </div>
      <button class="icon-glass mini" data-action="col-edit" data-id="${c.id}" style="width:32px;height:32px">${icon('pen')}</button>
      <button class="icon-glass mini" data-action="col-del" data-id="${c.id}" style="width:32px;height:32px">${icon('trash')}</button>
    </div>`;
  }

  function postCardHTML(a) {
    const c = state.collections.find((x) => x.id === a.collectionId);
    return `<div class="post-card" data-action="open-article" data-id="${a.id}">
      <div class="post-title">${esc(a.title)}</div>
      ${a.content ? `<div class="post-excerpt">${esc(stripMd(a.content))}</div>` : ''}
      ${a.images && a.images.length ? `<div class="thumb-strip">${a.images.slice(0, 4).map((f) => imgTag(f)).join('')}</div>` : ''}
      <div class="post-meta">
        <span class="date">${fmtDateTime(a.updatedAt || a.createdAt)}</span>
        ${c ? `<span class="tag">${esc(c.name)}</span>` : ''}
        ${(a.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}
        <span class="grow"></span>
        ${isFav('article', a.id) ? `<span style="color:var(--accent-deep)">${icon('heartFilled')}</span>` : ''}
      </div>
    </div>`;
  }

  function renderCollection() {
    const c = state.collections.find((x) => x.id === viewParams.collectionId);
    if (!c) { goBack(); return; }
    const arts = state.articles.filter((a) => a.collectionId === c.id).sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));
    $('#view-collection').innerHTML = `
      <div class="content-inner">
        <div class="hero" style="padding:24px">
          <div class="hero-row1">
            <div class="collection-cover" style="width:56px;height:56px">${c.cover ? imgTag(c.cover, '') : icon('folder')}</div>
            <div class="hero-greet">
              <span class="name">${esc(c.name)}</span>
              <span class="hi">${esc(c.desc || '')}</span>
            </div>
          </div>
        </div>
        <div class="page-toolbar">
          <span class="section-label">${arts.length} 篇文章</span>
          <div class="grow"></div>
          <button class="glass-btn btn-primary" data-action="col-new-article">${icon('pen')} 写文章</button>
        </div>
        <div class="card-grid">${arts.length ? arts.map((a) => postCardHTML(a)).join('') : emptyHTML('file', '合集还是空的', '为这个合集写下第一篇文章')}</div>
      </div>`;
    hydrateImages($('#view-collection'));
  }

  function renderArticle() {
    const a = state.articles.find((x) => x.id === viewParams.articleId);
    if (!a) { goBack(); return; }
    $('#view-article').innerHTML = `
      <div class="content-inner">
        <article class="post-card glass-strong" style="padding:26px 24px;border-radius:var(--r-xl)">
          <h1 class="post-title" style="font-size:24px">${esc(a.title)}</h1>
          <div class="post-meta">
            <span class="date">${fmtDateTime(a.updatedAt || a.createdAt)}</span>
            ${(a.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}
            <span class="grow"></span>
            <button class="icon-glass" data-action="art-fav" data-id="${a.id}" style="width:36px;height:36px">${icon(isFav('article', a.id) ? 'heartFilled' : 'heart')}</button>
            <button class="icon-glass" data-action="art-edit" data-id="${a.id}" style="width:36px;height:36px">${icon('pen')}</button>
            <button class="icon-glass" data-action="art-del" data-id="${a.id}" style="width:36px;height:36px">${icon('trash')}</button>
          </div>
          <div class="md-preview active" style="display:block;max-width:none;padding:6px 0 0">${mdToHtml(a.content)}</div>
          ${a.images && a.images.length ? `<div class="thumb-strip">${a.images.map((f) => imgTag(f)).join('')}</div>` : ''}
        </article>
      </div>`;
    hydrateImages($('#view-article'));
  }

  /* ========================================================================
     8. 动态 / 信箱 / 收藏夹
     ===================================================================== */
  function renderMoments() {
    const list = state.moments.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    $('#view-moments').innerHTML = `
      <div class="content-inner">
        <div class="page-toolbar">
          <span class="section-label">动态 · ${list.length}</span>
          <div class="grow"></div>
          <button class="glass-btn btn-primary" data-action="new-moment">${icon('plus')} 发布动态</button>
        </div>
        <div class="card-grid">
          ${list.length ? list.map(momentHTML).join('') : emptyHTML('message', '还没有动态', '记录此刻的心情或一件小事')}
        </div>
      </div>`;
    hydrateImages($('#view-moments'));
  }

  function momentHTML(m) {
    const imgs = m.images || [];
    return `<div class="moment-card">
      <div class="moment-head">
        <div class="moment-avatar">${state.profile.avatar ? imgTag(state.profile.avatar) : icon('user')}</div>
        <div>
          <div class="moment-author">${esc(state.profile.name || 'VidaOS')}</div>
          <div class="moment-time">${fmtRelative(m.createdAt)}</div>
        </div>
        <div class="grow"></div>
        <button class="icon-glass mini" data-action="moment-fav" data-id="${m.id}" style="width:32px;height:32px">${icon(isFav('moment', m.id) ? 'heartFilled' : 'heart')}</button>
        <button class="icon-glass mini" data-action="moment-del" data-id="${m.id}" style="width:32px;height:32px">${icon('trash')}</button>
      </div>
      <div class="moment-text">${esc(m.content)}</div>
      ${imgs.length ? `<div class="moment-images count-${Math.min(imgs.length, 4)}">${imgs.map((f) => imgTag(f)).join('')}</div>` : ''}
    </div>`;
  }

  function renderMailbox() {
    const list = state.letters.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    $('#view-mailbox').innerHTML = `
      <div class="content-inner">
        <div class="page-toolbar">
          <span class="section-label">信箱 · ${list.length}</span>
          <div class="grow"></div>
          <button class="glass-btn btn-primary" data-action="new-letter">${icon('pen')} 写信</button>
        </div>
        <div class="card-grid">
          ${list.length ? list.map(letterHTML).join('') : emptyHTML('mail', '信箱空空', '把重要的信件与照片存进来')}
        </div>
      </div>`;
    hydrateImages($('#view-mailbox'));
  }

  function letterHTML(l) {
    const imgs = l.images || [];
    return `<div class="letter-card ${l.unread ? 'unread' : ''}" data-action="letter-open" data-id="${l.id}">
      <div class="seal">${icon('mail')}</div>
      <div class="letter-title">${esc(l.title || '（无标题）')}</div>
      <div class="letter-body">${esc(l.content || '')}</div>
      <div class="post-meta">
        <span class="date">${fmtDateTime(l.createdAt)}</span>
        ${imgs.length ? `<span class="date">${imgs.length} 张照片</span>` : ''}
        <span class="grow"></span>
        <button class="icon-glass mini" data-action="letter-fav" data-id="${l.id}" style="width:30px;height:30px">${icon(isFav('letter', l.id) ? 'heartFilled' : 'heart')}</button>
        <button class="icon-glass mini" data-action="letter-del" data-id="${l.id}" style="width:30px;height:30px">${icon('trash')}</button>
      </div>
    </div>`;
  }

  function renderFavorites() {
    const items = state.favorites.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    $('#view-favorites').innerHTML = `
      <div class="content-inner">
        <div class="page-toolbar"><span class="section-label">收藏夹 · ${items.length}</span><div class="grow"></div></div>
        <div class="card-grid">
          ${items.length ? items.map(favHTML).join('') : emptyHTML('bookmark', '还没有收藏', '在空间 / 动态 / 信箱里点亮心形')}
        </div>
      </div>`;
    hydrateImages($('#view-favorites'));
  }

  function favHTML(f) {
    const wrap = (inner) => `<div class="post-card">${inner}</div>`;
    if (f.refType === 'article') {
      const a = state.articles.find((x) => x.id === f.refId);
      if (!a) return '';
      return wrap(`<div class="post-title">${icon('file')} ${esc(a.title)}</div>
        ${a.content ? `<div class="post-excerpt">${esc(stripMd(a.content))}</div>` : ''}
        <div class="post-meta"><span class="date">文章 · ${fmtRelative(a.createdAt)}</span><span class="grow"></span>
        <button class="glass-btn" data-action="fav-open" data-type="article" data-id="${a.id}">打开</button>
        <button class="icon-glass mini" data-action="fav-remove" data-id="${f.id}" style="width:32px;height:32px">${icon('trash')}</button></div>`);
    }
    if (f.refType === 'moment') {
      const m = state.moments.find((x) => x.id === f.refId);
      if (!m) return '';
      return wrap(`<div class="moment-text">${esc(m.content)}</div>
        <div class="post-meta"><span class="date">动态 · ${fmtRelative(m.createdAt)}</span><span class="grow"></span>
        <button class="icon-glass mini" data-action="fav-remove" data-id="${f.id}" style="width:32px;height:32px">${icon('trash')}</button></div>`);
    }
    if (f.refType === 'letter') {
      const l = state.letters.find((x) => x.id === f.refId);
      if (!l) return '';
      return wrap(`<div class="post-title">${icon('mail')} ${esc(l.title || '（无标题）')}</div>
        <div class="post-excerpt">${esc(l.content || '')}</div>
        <div class="post-meta"><span class="date">信箱 · ${fmtRelative(l.createdAt)}</span><span class="grow"></span>
        <button class="glass-btn" data-action="fav-open" data-type="letter" data-id="${l.id}">打开</button>
        <button class="icon-glass mini" data-action="fav-remove" data-id="${f.id}" style="width:32px;height:32px">${icon('trash')}</button></div>`);
    }
    return '';
  }

  function isFav(type, id) { return state.favorites.some((f) => f.refType === type && f.refId === id); }
  function toggleFav(type, id) {
    mutate(() => {
      const i = state.favorites.findIndex((f) => f.refType === type && f.refId === id);
      if (i >= 0) state.favorites.splice(i, 1);
      else state.favorites.unshift({ id: VidaStore.uid('f'), refType: type, refId: id, createdAt: nowISO() });
    });
    render();
    toast(isFav(type, id) ? '已收藏' : '已取消收藏');
  }

  /* ========================================================================
     9. 数据页（导入导出）
     ===================================================================== */
  function renderData() {
    const counts = {
      articles: state.articles.length, moments: state.moments.length,
      letters: state.letters.length, notes: state.notes.inspiration.length + state.notes.schedule.length + state.notes.todo.length,
    };
    $('#view-data').innerHTML = `
      <div class="content-inner">
        <div class="data-hero">
          <div class="data-stat glass"><div class="num">${counts.articles}</div><div class="lbl">文章</div></div>
          <div class="data-stat glass"><div class="num">${counts.moments}</div><div class="lbl">动态</div></div>
          <div class="data-stat glass"><div class="num">${counts.letters}</div><div class="lbl">信件</div></div>
          <div class="data-stat glass"><div class="num">${counts.notes}</div><div class="lbl">便签</div></div>
        </div>

        <div class="data-group">
          <div class="data-group-title">备份与导出</div>
          <div class="settings-list">
            <button class="settings-item" data-action="export-open">
              <span class="si-icon">${icon('download')}</span>
              <span class="si-body"><span class="si-title">导出备份</span><span class="si-desc">JSON / TXT / Markdown / PDF，可选范围</span></span>
              <span class="si-chev">${icon('chevronRight')}</span>
            </button>
            <button class="settings-item" data-action="import-open">
              <span class="si-icon">${icon('upload')}</span>
              <span class="si-body"><span class="si-title">导入备份</span><span class="si-desc">从 JSON / Markdown / TXT 恢复</span></span>
              <span class="si-chev">${icon('chevronRight')}</span>
            </button>
          </div>
        </div>

        <div class="data-group">
          <div class="data-group-title">危险操作</div>
          <div class="settings-list">
            <button class="settings-item danger" data-action="clear">
              <span class="si-icon">${icon('trash')}</span>
              <span class="si-body"><span class="si-title">清空所有数据</span><span class="si-desc">不可恢复，建议先导出备份</span></span>
              <span class="si-chev">${icon('chevronRight')}</span>
            </button>
          </div>
        </div>
      </div>`;
  }

  /* ========================================================================
     10. 设置页
     ===================================================================== */
  function renderSettings() {
    const p = state.profile;
    $('#view-settings').innerHTML = `
      <div class="content-inner">
        <div class="settings-item glass-strong">
          <div class="avatar-preview">${p.avatar ? imgTag(p.avatar) : icon('user')}</div>
          <div class="si-body">
            <div class="si-title" style="font-size:17px">${esc(p.name || 'VidaOS')}</div>
            <div class="si-desc" style="white-space:normal">${esc(p.signature || '还没有个性签名')}</div>
          </div>
          <button class="glass-btn btn-primary" data-action="profile-edit">${icon('pen')} 编辑</button>
        </div>

        <div class="data-group" style="margin-top:16px">
          <div class="data-group-title">关于</div>
          <div class="settings-list">
            <button class="settings-item" id="pwaInstallBtn" data-action="pwa-install" style="display:none">
              <span class="si-icon">${icon('download')}</span>
              <span class="si-body"><span class="si-title">安装为应用（PWA）</span><span class="si-desc">添加到主屏幕，离线可用</span></span>
              <span class="si-chev">${icon('chevronRight')}</span>
            </button>
            <div class="settings-item">
              <span class="si-icon">${icon('info')}</span>
              <span class="si-body"><span class="si-title">VidaOS</span><span class="si-desc">v2.0 · 纯本地离线运行</span></span>
            </div>
            <div class="settings-item">
              <span class="si-icon">${icon('droplet')}</span>
              <span class="si-body"><span class="si-title">设计致谢</span><span class="si-desc">参考 Sui-IB / InternalBeyond-Mobile 的布局概念</span></span>
            </div>
          </div>
        </div>
      </div>`;
    hydrateImages($('#view-settings'));
    if (deferredInstall && $('#pwaInstallBtn')) $('#pwaInstallBtn').style.display = 'flex';
  }

  /* ========================================================================
     11. 编辑器
     ===================================================================== */
  const ed = { mode: 'article', id: null, images: [], collectionId: null, tags: [], cover: null, meta: {} };
  const MD_TOOLS = [
    { act: 'bold', icon: 'bold', label: '加粗' },
    { act: 'italic', icon: 'italic', label: '斜体' },
    { sep: true },
    { act: 'h1', icon: null, text: 'H1', label: '一级标题' },
    { act: 'h2', icon: null, text: 'H2', label: '二级标题' },
    { act: 'h3', icon: null, text: 'H3', label: '三级标题' },
    { sep: true },
    { act: 'list', icon: 'list', label: '无序列表' },
    { act: 'ol', icon: 'listOrdered', label: '有序列表' },
    { act: 'quote', icon: 'quote', label: '引用' },
    { act: 'code', icon: 'code', label: '代码' },
    { sep: true },
    { act: 'link', icon: 'link', label: '链接' },
    { act: 'image', icon: 'image', label: '图片' },
    { act: 'hr', icon: null, text: '—', label: '分割线' },
  ];

  function buildMdToolbar() {
    $('#mdToolbar').innerHTML = MD_TOOLS.map((t) => {
      if (t.sep) return `<span class="md-tool sep"></span>`;
      return `<button class="md-tool" data-md="${t.act}" title="${t.label}">${t.icon ? icon(t.icon) : esc(t.text)}</button>`;
    }).join('');
  }

  function openEditor(mode, data) {
    ed.mode = mode;
    ed.id = data ? data.id : null;
    ed.images = (data && data.images) ? data.images.slice() : [];
    ed.collectionId = (data && data.collectionId) || null;
    ed.tags = (data && data.tags) ? data.tags.slice() : [];
    ed.cover = (data && data.cover) || null;

    $('#edTitle').value = (data && data.title) ? data.title : '';
    $('#edText').value = (data && data.content) ? data.content : '';
    $('#edTitle').style.display = (mode === 'article' || mode === 'letter') ? '' : 'none';
    $('#edTitle').placeholder = mode === 'letter' ? '信的主题…' : '标题…';
    $('#edText').placeholder = mode === 'moment' ? '此刻想说点什么…' : mode === 'letter' ? '写下这封信…' : '开始书写…';
    $('#edText').rows = 1;

    // markdown 工具栏仅文章模式显示
    $('#mdToolbar').style.display = mode === 'article' ? 'flex' : 'none';
    // 元数据条（合集/标签）仅文章模式
    const metaEl = $('#edMeta');
    if (mode === 'article') {
      const cols = state.collections;
      metaEl.classList.add('show');
      metaEl.innerHTML = `
        <select id="edCollection">
          <option value="">无合集</option>
          ${cols.map((c) => `<option value="${c.id}" ${ed.collectionId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
        </select>
        <input id="edTags" placeholder="标签，空格分隔" value="${esc(ed.tags.join(' '))}">`;
    } else {
      metaEl.classList.remove('show');
      metaEl.innerHTML = '';
    }

    // 图片按钮文案
    $('#edImageBtn').innerHTML = `${icon('image')} 图片`;
    // 预览按钮仅文章
    $('#edModeBtn').style.display = mode === 'article' ? '' : 'none';

    renderEditorImages();
    updateEdWc();
    setPreviewMode(false);
    $('#edPreview').classList.remove('active');
    $('#edText').style.display = '';

    $('#editor').classList.add('open');
    setTimeout(() => { if (mode === 'article' || mode === 'letter') $('#edTitle').focus(); else $('#edText').focus(); }, 340);
  }

  function closeEditor() {
    $('#editor').classList.remove('open');
    ed.id = null; ed.images = [];
  }

  function renderEditorImages() {
    $('#edImages').innerHTML = ed.images.map((f, i) => `
      <span class="ei">${imgTag(f)}<button class="rm" data-action="ed-img-rm" data-i="${i}">${icon('x')}</button></span>`).join('');
    hydrateImages($('#edImages'));
  }

  function updateEdWc() {
    const len = $('#edText').value.length;
    $('#edWc').textContent = len + ' 字';
  }

  function setPreviewMode(on) {
    const ta = $('#edText'), pv = $('#edPreview');
    if (on) { pv.innerHTML = mdToHtml(ta.value); ta.style.display = 'none'; pv.classList.add('active'); $('#edModeBtn').textContent = '编辑'; }
    else { ta.style.display = ''; pv.classList.remove('active'); $('#edModeBtn').textContent = '预览'; }
  }

  async function saveEditor() {
    const title = $('#edTitle').value.trim();
    const content = $('#edText').value;

    if (ed.mode === 'article') {
      const collectionId = $('#edCollection') ? $('#edCollection').value : null;
      const tags = $('#edTags') ? $('#edTags').value.trim().split(/\s+/).filter(Boolean) : [];
      if (!title && !content.trim() && !ed.images.length) { toast('写点什么再保存吧'); return; }
      const now = nowISO();
      if (ed.id) {
        mutate(() => {
          const a = state.articles.find((x) => x.id === ed.id);
          if (a) { a.title = title; a.content = content; a.images = ed.images.slice(); a.collectionId = collectionId; a.tags = tags; a.cover = a.cover || (ed.images[0] || null); a.updatedAt = now; }
        });
      } else {
        const a = { id: VidaStore.uid('a'), title, content, images: ed.images.slice(), collectionId, tags, cover: ed.images[0] || null, createdAt: now, updatedAt: now };
        mutate(() => state.articles.unshift(a));
      }
      toast('已保存');
      closeEditor();
      if (currentView === 'space' || currentView === 'collection' || currentView === 'article') render();
      else push('space');
      return;
    }

    if (ed.mode === 'moment') {
      if (!content.trim() && !ed.images.length) { toast('写点什么吧'); return; }
      if (ed.id) {
        mutate(() => { const m = state.moments.find((x) => x.id === ed.id); if (m) { m.content = content; m.images = ed.images.slice(); } });
      } else {
        mutate(() => state.moments.unshift({ id: VidaStore.uid('m'), content, images: ed.images.slice(), createdAt: nowISO() }));
      }
      toast('已发布');
      closeEditor();
      push('moments');
      return;
    }

    if (ed.mode === 'letter') {
      if (!title && !content.trim() && !ed.images.length) { toast('写点什么吧'); return; }
      if (ed.id) {
        mutate(() => { const l = state.letters.find((x) => x.id === ed.id); if (l) { l.title = title; l.content = content; l.images = ed.images.slice(); } });
      } else {
        mutate(() => state.letters.unshift({ id: VidaStore.uid('l'), title, content, images: ed.images.slice(), createdAt: nowISO(), unread: true }));
      }
      toast('信件已存好');
      closeEditor();
      push('mailbox');
      return;
    }
  }

  /* Markdown 插入辅助 */
  function ta() { return $('#edText'); }
  function wrapSel(before, after, placeholder) {
    const t = ta(), s = t.selectionStart, e = t.selectionEnd;
    const sel = t.value.slice(s, e) || placeholder;
    t.setRangeText(before + sel + after, s, e, 'end');
    const ns = s + before.length;
    t.focus(); t.setSelectionRange(ns, ns + sel.length);
    updateEdWc();
  }
  function linePrefix(prefix) {
    const t = ta(), s = t.selectionStart;
    const lineStart = t.value.lastIndexOf('\n', s - 1) + 1;
    t.setRangeText(prefix, lineStart, lineStart, 'end');
    t.focus(); updateEdWc();
  }

  function applyMdTool(act) {
    switch (act) {
      case 'bold': wrapSel('**', '**', '加粗文字'); break;
      case 'italic': wrapSel('*', '*', '斜体文字'); break;
      case 'h1': linePrefix('# '); break;
      case 'h2': linePrefix('## '); break;
      case 'h3': linePrefix('### '); break;
      case 'list': linePrefix('- '); break;
      case 'ol': linePrefix('1. '); break;
      case 'quote': linePrefix('> '); break;
      case 'code': wrapSel('`', '`', '代码'); break;
      case 'link': wrapSel('[', '](https://)', '链接文字'); break;
      case 'image': wrapSel('![', '](https://)', '图片描述'); break;
      case 'hr': linePrefix('---\n'); break;
    }
  }

  /* ========================================================================
     12. 模态弹窗 / Toast
     ===================================================================== */
  let pendingConfirm = null;

  function openModal(html) {
    $('#modalLayer').innerHTML = `<div class="modal">${html}</div>`;
    $('#modalLayer').classList.add('open');
  }
  function closeModal() { $('#modalLayer').classList.remove('open'); $('#modalLayer').innerHTML = ''; pendingConfirm = null; }

  function confirmDialog(title, message, onOk, danger) {
    openModal(`
      <div class="modal-head"><div class="modal-title">${esc(title)}</div>
        <button class="modal-close" data-action="modal-close">${icon('x')}</button></div>
      <div class="field" style="color:var(--text-2);line-height:1.6;font-size:14px;margin:0">${esc(message)}</div>
      <div class="modal-foot">
        <button class="glass-btn" data-action="modal-close">取消</button>
        <button class="glass-btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="modal-ok">确定</button>
      </div>`);
    pendingConfirm = onOk;
  }

  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
  }

  /* ========================================================================
     13. 弹窗构建器
     ===================================================================== */
  function collectionDialog(existing) {
    openModal(`
      <div class="modal-head"><div class="modal-title">${existing ? '编辑合集' : '新建合集'}</div>
        <button class="modal-close" data-action="modal-close">${icon('x')}</button></div>
      <div class="field"><label>合集名称</label><input id="colName" value="${esc(existing ? existing.name : '')}" placeholder="例如：旅行日记"></div>
      <div class="field"><label>简介（可选）</label><input id="colDesc" value="${esc(existing ? existing.desc : '')}" placeholder="一句话描述这个合集"></div>
      <div class="modal-foot">
        <button class="glass-btn" data-action="modal-close">取消</button>
        <button class="glass-btn btn-primary" data-action="col-save">保存</button>
      </div>`);
    pendingConfirm = () => {
      const name = $('#colName').value.trim();
      if (!name) { toast('请输入合集名称'); return false; }
      if (existing) {
        mutate(() => { const c = state.collections.find((x) => x.id === existing.id); if (c) { c.name = name; c.desc = $('#colDesc').value.trim(); } });
      } else {
        mutate(() => state.collections.push({ id: VidaStore.uid('c'), name, desc: $('#colDesc').value.trim(), cover: null, createdAt: nowISO() }));
      }
      toast('已保存');
      render();
      return true;
    };
  }

  function scheduleDialog(existing, presetDate) {
    openModal(`
      <div class="modal-head"><div class="modal-title">${existing ? '编辑日程' : '新建日程'}</div>
        <button class="modal-close" data-action="modal-close">${icon('x')}</button></div>
      <div class="field"><label>事项</label><input id="scTitle" value="${esc(existing ? (existing.title || '') : '')}" placeholder="要做什么？"></div>
      <div class="field"><label>备注（可选）</label><input id="scNote" value="${esc(existing ? (existing.note || '') : '')}" placeholder="补充说明"></div>
      <div class="field"><label>日期</label><input id="scDate" type="date" value="${existing ? existing.date : (presetDate || todayStr())}"></div>
      <div class="field"><label>时间（可选）</label><input id="scTime" type="time" value="${esc(existing ? (existing.time || '') : '')}"></div>
      <div class="field"><label>分类（可选）</label><input id="scCat" list="scCats" value="${esc(existing ? (existing.category || '') : '')}" placeholder="输入或选择">
        <datalist id="scCats">${(state.categories.schedule || []).map((c) => `<option value="${esc(c)}">`).join('')}</datalist></div>
      <div class="modal-foot">
        <button class="glass-btn" data-action="modal-close">取消</button>
        <button class="glass-btn btn-primary" data-action="sc-save">保存</button>
      </div>`);
    pendingConfirm = () => {
      const title = $('#scTitle').value.trim();
      const date = $('#scDate').value;
      if (!title && !$('#scNote').value.trim()) { toast('请输入事项'); return false; }
      if (!date) { toast('请选择日期'); return false; }
      const cat = $('#scCat').value.trim();
      if (cat && !(state.categories.schedule || []).includes(cat)) {
        mutate(() => state.categories.schedule.push(cat));
      }
      const data = { title, note: $('#scNote').value.trim(), date, time: $('#scTime').value, category: cat };
      if (existing) {
        mutate(() => { const s = state.notes.schedule.find((x) => x.id === existing.id); if (s) Object.assign(s, data); });
      } else {
        mutate(() => state.notes.schedule.push(Object.assign({ id: VidaStore.uid('s'), done: false, createdAt: nowISO() }, data)));
      }
      calState.sel = date;
      toast('已保存');
      render();
      return true;
    };
  }

  function noteEditDialog(n) {
    openModal(`
      <div class="modal-head"><div class="modal-title">编辑</div>
        <button class="modal-close" data-action="modal-close">${icon('x')}</button></div>
      <div class="field"><label>内容</label><textarea id="neText" style="min-height:110px">${esc(n.content)}</textarea></div>
      <div class="field"><label>分类（可选）</label><input id="neCat" value="${esc(n.category || '')}" placeholder="输入或选择"></div>
      <div class="modal-foot">
        <button class="glass-btn" data-action="modal-close">取消</button>
        <button class="glass-btn btn-primary" data-action="ne-save">保存</button>
      </div>`);
    pendingConfirm = () => {
      const cat = $('#neCat').value.trim();
      mutate(() => {
        const it = state.notes[noteSection].find((x) => x.id === n.id);
        if (it) { it.content = $('#neText').value; it.category = cat; }
        if (cat && !(state.categories[noteSection] || []).includes(cat)) state.categories[noteSection].push(cat);
      });
      toast('已保存');
      renderNotes();
      return true;
    };
  }

  function catsManageDialog() {
    const cats = state.categories[noteSection] || [];
    openModal(`
      <div class="modal-head"><div class="modal-title">管理分类</div>
        <button class="modal-close" data-action="modal-close">${icon('x')}</button></div>
      <div class="note-compose"><input id="newCat" placeholder="新分类名称"><button class="glass-btn btn-primary" data-action="cat-add">${icon('plus')}</button></div>
      <div class="chip-row" style="margin-top:10px">
        ${cats.length ? cats.map((c) => `<span class="chip">${esc(c)} <button style="margin-left:6px" data-action="cat-del" data-cat="${esc(c)}">${icon('x')}</button></span>`).join('') : '<span class="ed" style="color:var(--text-3)">还没有分类</span>'}
      </div>
      <div class="modal-foot"><button class="glass-btn" data-action="modal-close">完成</button></div>`);
  }

  function profileDialog() {
    const p = state.profile;
    openModal(`
      <div class="modal-head"><div class="modal-title">个人主页</div>
        <button class="modal-close" data-action="modal-close">${icon('x')}</button></div>
      <div class="field">
        <label>头像</label>
        <div class="avatar-editor">
          <div class="avatar-preview" id="avPreview">${p.avatar ? imgTag(p.avatar) : icon('user')}</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="glass-btn" data-action="avatar-upload">${icon('image')} 更换头像</button>
            ${p.avatar ? `<button class="glass-btn" data-action="avatar-remove">移除</button>` : ''}
          </div>
        </div>
      </div>
      <div class="field"><label>昵称</label><input id="pfName" value="${esc(p.name)}" placeholder="你的名字"></div>
      <div class="field"><label>个性签名</label><textarea id="pfSig" placeholder="一句话介绍自己">${esc(p.signature)}</textarea></div>
      <div class="field"><label>背景</label>
        <div class="bg-thumbs" id="bgThumbs"></div>
      </div>
      <div class="modal-foot">
        <button class="glass-btn" data-action="modal-close">取消</button>
        <button class="glass-btn btn-primary" data-action="pf-save">保存</button>
      </div>`);
    renderBgThumbs();
    hydrateImages($('#modalLayer'));
  }

  const BG_PRESETS = {
    aurora: { name: '晨曦', css: 'linear-gradient(165deg, #f5f9fd 0%, #eaf0f7 40%, #dce7f3 78%, #cdddee 100%)' },
    mist: { name: '雾蓝', css: 'linear-gradient(160deg, #eef4fa 0%, #dde8f3 55%, #c4d5e8 100%)' },
    glacier: { name: '冰川', css: 'linear-gradient(155deg, #eaf3fa 0%, #d5e5f2 50%, #b7cfe6 100%)' },
    moon: { name: '月白', css: 'linear-gradient(160deg, #f0f4f9 0%, #dfe8f1 55%, #cbd8e6 100%)' },
  };

  function renderBgThumbs() {
    const cur = state.profile.background;
    $('#bgThumbs').innerHTML = Object.keys(BG_PRESETS).map((k) => `
      <div class="bg-thumb ${cur === k ? 'active' : ''}" data-action="bg-preset" data-key="${k}" style="background:${BG_PRESETS[k].css}" title="${BG_PRESETS[k].name}"></div>`).join('')
      + `<div class="bg-thumb upload" data-action="bg-upload">${icon('image')}</div>`;
  }

  function applyBackground() {
    const bg = state.profile.background;
    const el = $('.bg');
    if (!el) return;
    if (bg && BG_PRESETS[bg]) {
      el.style.background = BG_PRESETS[bg].css;
      el.style.backgroundImage = 'none';
    } else if (bg) {
      fileURL(bg).then((url) => { el.style.backgroundImage = `url(${url})`; el.style.backgroundSize = 'cover'; el.style.backgroundPosition = 'center'; });
    }
  }

  /* ========================================================================
     14. 导出 / 导入
     ===================================================================== */
  const SCOPES = [
    { id: 'profile', label: '个人主页', count: () => 1 },
    { id: 'space', label: '空间（合集 + 文章）', count: () => state.collections.length + state.articles.length },
    { id: 'moments', label: '动态', count: () => state.moments.length },
    { id: 'letters', label: '信箱', count: () => state.letters.length },
    { id: 'favorites', label: '收藏夹', count: () => state.favorites.length },
    { id: 'notes', label: '便签（灵感/日程/待办）', count: () => state.notes.inspiration.length + state.notes.schedule.length + state.notes.todo.length },
  ];

  function exportDialog() {
    const sel = { set: new Set(['profile', 'space', 'moments', 'letters', 'favorites', 'notes']) };
    const fmt = { value: 'json' };
    const body = `
      <div class="modal-head"><div class="modal-title">导出备份</div>
        <button class="modal-close" data-action="modal-close">${icon('x')}</button></div>
      <div class="data-group-title">选择要备份的内容</div>
      <div class="scope-list" id="scopeList">
        ${SCOPES.map((s) => `
          <label class="scope-item">
            <span class="check on" data-action="scope" data-id="${s.id}">${icon('check')}</span>
            <span class="sc-name">${s.label}</span>
            <span class="sc-count">${s.count()}</span>
          </label>`).join('')}
      </div>
      <div class="data-group-title" style="margin-top:16px">导出格式</div>
      <div class="chip-row" style="margin-bottom:0">
        ${['json', 'txt', 'md', 'pdf'].map((f) => `<button class="chip ${fmt.value === f ? 'active' : ''}" data-action="fmt" data-fmt="${f}">${f.toUpperCase()}</button>`).join('')}
      </div>
      <div class="modal-foot">
        <button class="glass-btn" data-action="modal-close">取消</button>
        <button class="glass-btn btn-primary" data-action="export-do">导出</button>
      </div>`;
    openModal(body);
    // 通过闭包维护状态
    window.__exportSel = sel; window.__exportFmt = fmt;
    // 重新标注选中状态
    refreshScopeUI();
  }
  function refreshScopeUI() {
    const sel = window.__exportSel; if (!sel) return;
    $$('#scopeList .check').forEach((el) => {
      const id = el.getAttribute('data-id');
      el.classList.toggle('on', sel.set.has(id));
      el.innerHTML = icon('check');
    });
  }

  function scopedState(selSet) {
    const out = { version: state.version, exportedAt: nowISO(), scopes: Array.from(selSet) };
    if (selSet.has('profile')) out.profile = state.profile;
    if (selSet.has('space')) { out.collections = state.collections; out.articles = state.articles; }
    if (selSet.has('moments')) out.moments = state.moments;
    if (selSet.has('letters')) out.letters = state.letters;
    if (selSet.has('favorites')) out.favorites = state.favorites;
    if (selSet.has('notes')) { out.notes = state.notes; out.categories = state.categories; }
    return out;
  }

  function collectFileIds(data) {
    const ids = new Set();
    const scan = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) { obj.forEach(scan); return; }
      for (const k in obj) {
        const v = obj[k];
        if (k === 'avatar' || k === 'background' || k === 'cover' || k === 'fileId' || k === 'images' || k === 'imageIds') {
          if (typeof v === 'string' && v.length > 8 && !v.startsWith('http')) ids.add(v);
          if (Array.isArray(v)) v.forEach((x) => { if (typeof x === 'string') ids.add(x); });
        }
        if (k === 'images' && Array.isArray(v)) { v.forEach((x) => ids.add(x)); }
        scan(v);
      }
    };
    scan(data);
    return Array.from(ids);
  }

  async function exportJSON(selSet) {
    const data = scopedState(selSet);
    const fileIds = collectFileIds(data);
    const files = {};
    for (const id of fileIds) {
      const blob = await VidaStore.getFile(id);
      if (blob) files[id] = await VidaStore.blobToDataURL(blob);
    }
    data.files = files;
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'vidaos-backup.json');
  }

  async function exportTXT(selSet) {
    const d = scopedState(selSet);
    let out = `VidaOS 备份 · ${nowISO()}\n${'='.repeat(40)}\n\n`;
    if (d.profile) out += `【个人主页】\n${d.profile.name || ''}\n${d.profile.signature || ''}\n\n`;
    if (d.articles) d.articles.forEach((a) => { out += `《${a.title || '无标题'}》\n${a.content || ''}\n\n${'-'.repeat(20)}\n\n`; });
    if (d.moments) d.moments.forEach((m) => { out += `【动态】${fmtDateTime(m.createdAt)}\n${m.content}\n\n${'-'.repeat(20)}\n\n`; });
    if (d.letters) d.letters.forEach((l) => { out += `【信件】${l.title || '无标题'}\n${l.content || ''}\n\n${'-'.repeat(20)}\n\n`; });
    if (d.notes) {
      out += `【灵感】\n`; d.notes.inspiration.forEach((n) => { out += `· ${n.content}\n`; });
      out += `\n【日程】\n`; d.notes.schedule.forEach((n) => { out += `· ${n.date} ${n.time || ''} ${n.title || n.note || ''}\n`; });
      out += `\n【待办】\n`; d.notes.todo.forEach((n) => { out += `${n.done ? '[x]' : '[ ]'} ${n.content}\n`; });
    }
    downloadBlob(new Blob([out], { type: 'text/plain;charset=utf-8' }), 'vidaos-export.txt');
  }

  async function exportMD(selSet) {
    const d = scopedState(selSet);
    let out = `# VidaOS 备份\n\n> 导出于 ${fmtDateTime(nowISO())}\n\n`;
    if (d.articles) d.articles.forEach((a) => {
      out += `---\n\n## ${a.title || '无标题'}\n\n`;
      if ((a.tags || []).length) out += `标签：${a.tags.join('、')}\n\n`;
      out += `${a.content || ''}\n\n`;
      if (a.images && a.images.length) out += a.images.map((f) => `![图片](${f})`).join('\n') + '\n\n';
    });
    if (d.letters) d.letters.forEach((l) => { out += `---\n\n## 信 · ${l.title || '无标题'}\n\n${l.content || ''}\n\n`; });
    if (d.moments) d.moments.forEach((m) => { out += `---\n\n### 动态 · ${fmtDateTime(m.createdAt)}\n\n${m.content}\n\n`; });
    downloadBlob(new Blob([out], { type: 'text/markdown;charset=utf-8' }), 'vidaos-export.md');
  }

  async function exportPDF(selSet) {
    const d = scopedState(selSet);
    const secs = [];
    if (d.profile) secs.push(`<section class="cover"><h1>${esc(d.profile.name || 'VidaOS')}</h1><p class="sig">${esc(d.profile.signature || '')}</p><p class="meta">导出于 ${esc(fmtDateTime(nowISO()))}</p></section>`);
    if (d.articles) d.articles.forEach((a) => {
      secs.push(`<section><h2>${esc(a.title || '无标题')}</h2><div class="body">${mdToHtml(a.content)}</div>
        ${(a.images || []).map((f) => `<img class="pic" data-fid="${esc(f)}">`).join('')}</section>`);
    });
    if (d.moments) d.moments.forEach((m) => secs.push(`<section><h3>动态 · ${esc(fmtDateTime(m.createdAt))}</h3><div class="body">${esc(m.content)}</div></section>`));
    if (d.letters) d.letters.forEach((l) => secs.push(`<section><h2>信 · ${esc(l.title || '无标题')}</h2><div class="body">${esc(l.content || '')}</div></section>`));
    if (d.notes) {
      let n = `<section><h2>便签</h2>`;
      n += `<h3>灵感</h3>` + d.notes.inspiration.map((x) => `<p class="body">· ${esc(x.content)}</p>`).join('');
      n += `<h3>待办</h3>` + d.notes.todo.map((x) => `<p class="body">${x.done ? '☑' : '☐'} ${esc(x.content)}</p>`).join('');
      n += `</section>`;
      secs.push(n);
    }

    const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>VidaOS</title>
      <style>
        *{box-sizing:border-box} body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#33455f;line-height:1.8;margin:0;padding:0;font-size:14px}
        section{page-break-after:always;padding:40px 48px}
        section:last-child{page-break-after:auto}
        .cover{height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
        h1{font-size:42px;font-weight:200;letter-spacing:2px;margin:0 0 12px}
        h2{font-size:22px;margin:0 0 16px;padding-bottom:10px;border-bottom:1px solid #dbe4ef}
        h3{font-size:16px;margin:18px 0 8px;color:#577ca8}
        .sig{color:#6b80a0;font-size:15px}.meta{color:#97a8bf;font-size:12px;margin-top:30px}
        .body{white-space:pre-wrap;word-break:break-word}
        img.pic{max-width:100%;border-radius:12px;margin:10px 0}
        blockquote{margin:10px 0;padding:8px 16px;background:#f0f4f9;border-left:3px solid #6e93b8}
        code{font-family:monospace;background:#f0f4f9;padding:2px 6px;border-radius:5px}
        pre{background:#f0f4f9;padding:14px;border-radius:10px;overflow:hidden}
      </style></head><body>${secs.join('')}</body></html>`;

    const frame = $('#printFrame');
    frame.srcdoc = html;
    frame.onload = async () => {
      // 填充图片
      const doc = frame.contentDocument;
      const imgs = doc.querySelectorAll('img[data-fid]');
      for (const img of imgs) {
        const url = await fileURL(img.getAttribute('data-fid'));
        img.src = url || '';
      }
      try { frame.contentWindow.focus(); frame.contentWindow.print(); }
      catch (e) { toast('打印失败'); }
    };
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast('已导出：' + filename);
  }

  async function importOpen() {
    const mode = { value: 'merge' };
    openModal(`
      <div class="modal-head"><div class="modal-title">导入备份</div>
        <button class="modal-close" data-action="modal-close">${icon('x')}</button></div>
      <div class="field" style="color:var(--text-2);line-height:1.7;font-size:14px;margin:0">选择导入方式：</div>
      <div class="scope-list" style="margin-top:12px">
        <label class="scope-item"><span class="check on" data-action="imode" data-m="merge">${icon('check')}</span><span class="sc-name">合并导入（追加到现有数据）</span></label>
        <label class="scope-item"><span class="check" data-action="imode" data-m="replace">${icon('check')}</span><span class="sc-name">覆盖导入（清空后恢复）</span></label>
      </div>
      <div class="modal-foot">
        <button class="glass-btn" data-action="modal-close">取消</button>
        <button class="glass-btn btn-primary" data-action="import-pick">选择文件</button>
      </div>`);
    window.__importMode = mode;
    $$('.scope-item .check').forEach((el) => el.classList.remove('on'));
    $$('.scope-item .check').forEach((el) => { if (el.getAttribute('data-m') === 'merge') el.classList.add('on'); });
  }

  function doImport(file) {
    const mode = (window.__importMode && window.__importMode.value) || 'merge';
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = reader.result;
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        if (ext === 'json') {
          await importJSON(text, mode);
        } else if (ext === 'md' || ext === 'markdown') {
          importMarkdown(text);
        } else {
          importTXT(text);
        }
      } catch (e) { toast('导入失败：文件格式无法识别'); console.error(e); }
    };
    reader.readAsText(file);
  }

  async function importJSON(text, mode) {
    const data = JSON.parse(text);
    if (mode === 'replace') {
      await VidaStore.clearAll();
      // 重建状态
      state = VidaStore.defaultState();
    }
    // 合并
    if (data.profile) state.profile = Object.assign(state.profile, data.profile);
    if (data.collections) state.collections = state.collections.concat(data.collections);
    if (data.articles) state.articles = state.articles.concat(data.articles);
    if (data.moments) state.moments = state.moments.concat(data.moments);
    if (data.letters) state.letters = state.letters.concat(data.letters);
    if (data.favorites) state.favorites = state.favorites.concat(data.favorites);
    if (data.notes) state.notes = Object.assign({ inspiration: [], schedule: [], todo: [] }, state.notes, data.notes);
    if (data.categories) state.categories = Object.assign({ inspiration: [], schedule: [], todo: [] }, state.categories, data.categories);
    if (data.tracks) state.tracks = state.tracks.concat(data.tracks);
    // 文件
    if (data.files) {
      for (const id in data.files) {
        const blob = VidaStore.dataURLToBlob(data.files[id]);
        await VidaStore.putFile(id, blob);
      }
    }
    ensureBuiltinTrack();
    await persist();
    applyBackground();
    toast('导入成功');
    render();
  }

  function importMarkdown(text) {
    const titleMatch = text.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : '';
    const content = text.replace(/^#\s+.+$/m, '').trim();
    if (!content) { toast('没有可导入的内容'); return; }
    mutate(() => state.articles.unshift({ id: VidaStore.uid('a'), title, content, images: [], collectionId: null, tags: [], cover: null, createdAt: nowISO(), updatedAt: nowISO() }));
    toast('已导入为 1 篇文章');
    render();
  }

  function importTXT(text) {
    if (!text.trim()) { toast('没有可导入的内容'); return; }
    mutate(() => state.articles.unshift({ id: VidaStore.uid('a'), title: '', content: text.trim(), images: [], collectionId: null, tags: [], cover: null, createdAt: nowISO(), updatedAt: nowISO() }));
    toast('已导入为 1 篇文章');
    render();
  }

  /* ========================================================================
     15. 图片 / 音频文件处理
     ===================================================================== */
  async function storeImageFiles(fileList) {
    const ids = [];
    for (const f of fileList) {
      // 压缩过大图片（>2MB 缩到最长边 1600）
      let blob = f;
      if (f.size > 2 * 1024 * 1024) {
        try { blob = await compressImage(f, 1600, 0.82); } catch (e) { blob = f; }
      }
      const id = VidaStore.uid('img');
      await VidaStore.putFile(id, blob);
      ids.push(id);
    }
    return ids;
  }

  function compressImage(file, maxSide, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob((b) => { URL.revokeObjectURL(url); b ? resolve(b) : reject(new Error('compress fail')); }, file.type || 'image/jpeg', quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load fail')); };
      img.src = url;
    });
  }

  /* ========================================================================
     16. 全局点击委托
     ===================================================================== */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const act = el.getAttribute('data-action');

    switch (act) {
      // 导航
      case 'tab': switchTab(el.getAttribute('data-tab')); break;
      case 'back': goBack(); break;
      case 'func': push(el.getAttribute('data-func')); break;

      // 日历
      case 'cal-prev': { calState.m--; if (calState.m < 0) { calState.m = 11; calState.y--; } renderDesk(); break; }
      case 'cal-next': { calState.m++; if (calState.m > 11) { calState.m = 0; calState.y++; } renderDesk(); break; }
      case 'cal-today': { const d = new Date(); calState.y = d.getFullYear(); calState.m = d.getMonth(); calState.sel = todayStr(); renderDesk(); break; }
      case 'cal-day': { calState.sel = el.getAttribute('data-date'); renderDesk(); break; }
      case 'cal-add': scheduleDialog(null, calState.sel); break;
      case 'cal-event': scheduleDialog(state.notes.schedule.find((x) => x.id === el.getAttribute('data-id'))); break;
      case 'cal-toggle': {
        mutate(() => { const s = state.notes.schedule.find((x) => x.id === el.getAttribute('data-id')); if (s) s.done = !s.done; });
        renderDesk(); break;
      }

      // 播放器
      case 'player-play': togglePlay(); break;
      case 'player-next': playNext(); break;
      case 'player-prev': playPrev(); break;
      case 'player-boot': { ensureBuiltinTrack(); const b = state.tracks.find((t) => t.builtin); if (b) playTrack(b); break; }
      case 'player-add': $('#audioInput').click(); break;
      case 'player-edit': editTrackDialog(currentTrack()); break;
      case 'player-del': confirmDialog('删除音乐', '确定删除这首音乐吗？', () => { mutate(() => { state.tracks = state.tracks.filter((t) => t.id !== player.currentId); }); if (player.playing) stopCurrent(); renderDesk(); return true; }); break;

      // 便签
      case 'segment': { noteSection = el.getAttribute('data-sec'); noteFilter = ''; renderNotes(); break; }
      case 'chip': { noteFilter = el.getAttribute('data-cat'); renderNotes(); break; }
      case 'chip-add': promptCat(); break;
      case 'cats-manage': catsManageDialog(); break;
      case 'note-add': {
        const sec = el.getAttribute('data-sec');
        const input = $('#noteCompose'); if (!input) break;
        const v = input.value; input.value = '';
        if (sec === 'todo') addTodo(v); else addNote(v);
        break;
      }
      case 'sched-new': scheduleDialog(null); break;
      case 'note-toggle': {
        const sec = el.getAttribute('data-sec');
        mutate(() => { const n = state.notes[sec].find((x) => x.id === el.getAttribute('data-id')); if (n) { n.done = !n.done; n.completedAt = n.done ? nowISO() : null; } });
        if (sec === 'schedule' && currentView === 'desk') renderDesk(); else renderNotes();
        break;
      }
      case 'note-edit': noteEditDialog(state.notes[el.getAttribute('data-sec')].find((x) => x.id === el.getAttribute('data-id'))); break;
      case 'note-del': {
        const sec = el.getAttribute('data-sec'), id = el.getAttribute('data-id');
        confirmDialog('删除便签', '确定删除这条便签吗？', () => { mutate(() => { state.notes[sec] = state.notes[sec].filter((x) => x.id !== id); }); renderNotes(); return true; });
        break;
      }

      // 空间 / 合集 / 文章
      case 'new-article': openEditor('article'); break;
      case 'new-collection': collectionDialog(null); break;
      case 'open-collection': push('collection', { collectionId: el.getAttribute('data-id') }); break;
      case 'open-article': push('article', { articleId: el.getAttribute('data-id') }); break;
      case 'col-edit': { e.stopPropagation(); collectionDialog(state.collections.find((x) => x.id === el.getAttribute('data-id'))); break; }
      case 'col-del': {
        e.stopPropagation();
        const id = el.getAttribute('data-id');
        confirmDialog('删除合集', '合集删除后其中的文章不会被删除，仅解除归属。', () => { mutate(() => { state.collections = state.collections.filter((x) => x.id !== id); state.articles.forEach((a) => { if (a.collectionId === id) a.collectionId = null; }); }); renderSpace(); return true; });
        break;
      }
      case 'col-new-article': { openEditor('article'); break; }
      case 'art-edit': openEditor('article', state.articles.find((x) => x.id === el.getAttribute('data-id'))); break;
      case 'art-del': {
        const id = el.getAttribute('data-id');
        confirmDialog('删除文章', '确定删除这篇文章吗？', () => { deleteArticle(id); return true; });
        break;
      }
      case 'art-fav': toggleFav('article', el.getAttribute('data-id')); break;

      // 动态
      case 'new-moment': openEditor('moment'); break;
      case 'moment-fav': toggleFav('moment', el.getAttribute('data-id')); break;
      case 'moment-del': {
        const id = el.getAttribute('data-id');
        confirmDialog('删除动态', '确定删除这条动态吗？', () => { const m = state.moments.find((x) => x.id === id); mutate(() => { state.moments = state.moments.filter((x) => x.id !== id); state.favorites = state.favorites.filter((f) => !(f.refType === 'moment' && f.refId === id)); }); if (m) VidaStore.delFiles(m.images || []); renderMoments(); return true; });
        break;
      }

      // 信箱
      case 'new-letter': openEditor('letter'); break;
      case 'letter-open': {
        const l = state.letters.find((x) => x.id === el.getAttribute('data-id'));
        if (l) { openLetterDialog(l); }
        break;
      }
      case 'letter-fav': toggleFav('letter', el.getAttribute('data-id')); break;
      case 'letter-del': {
        const id = el.getAttribute('data-id');
        confirmDialog('删除信件', '确定删除这封信吗？', () => { const l = state.letters.find((x) => x.id === id); mutate(() => { state.letters = state.letters.filter((x) => x.id !== id); state.favorites = state.favorites.filter((f) => !(f.refType === 'letter' && f.refId === id)); }); if (l) VidaStore.delFiles(l.images || []); renderMailbox(); return true; });
        break;
      }

      // 收藏夹
      case 'fav-open': {
        const type = el.getAttribute('data-type'), id = el.getAttribute('data-id');
        if (type === 'article') push('article', { articleId: id });
        else if (type === 'letter') { const l = state.letters.find((x) => x.id === id); if (l) openLetterDialog(l); }
        break;
      }
      case 'fav-remove': {
        const id = el.getAttribute('data-id');
        mutate(() => { state.favorites = state.favorites.filter((f) => f.id !== id); });
        renderFavorites(); break;
      }

      // 数据
      case 'export-open': exportDialog(); break;
      case 'import-open': importOpen(); break;
      case 'clear': confirmDialog('清空所有数据', '此操作不可恢复，确定清空全部内容吗？', async () => { await VidaStore.clearAll(); state = VidaStore.defaultState(); ensureBuiltinTrack(); await persist(); render(); toast('已清空'); return true; }); break;
      case 'scope': {
        e.preventDefault();
        const id = el.getAttribute('data-id');
        const sel = window.__exportSel; if (!sel) break;
        if (sel.set.has(id)) sel.set.delete(id); else sel.set.add(id);
        refreshScopeUI(); break;
      }
      case 'fmt': {
        window.__exportFmt.value = el.getAttribute('data-fmt');
        $$('#modalLayer .chip').forEach((c) => c.classList.remove('active'));
        el.classList.add('active');
        break;
      }
      case 'export-do': {
        const sel = window.__exportSel; const fmt = window.__exportFmt;
        const set = sel ? sel.set : new Set();
        if (!set.size) { toast('请至少选择一项'); break; }
        closeModal();
        if (fmt.value === 'json') exportJSON(set);
        else if (fmt.value === 'txt') exportTXT(set);
        else if (fmt.value === 'md') exportMD(set);
        else if (fmt.value === 'pdf') exportPDF(set);
        break;
      }
      case 'imode': {
        const m = el.getAttribute('data-m');
        if (window.__importMode) window.__importMode.value = m;
        $$('#modalLayer .scope-item .check').forEach((c) => c.classList.remove('on'));
        el.classList.add('on');
        break;
      }
      case 'import-pick': closeModal(); $('#importInput').click(); break;

      // 设置
      case 'profile-edit': profileDialog(); break;
      case 'avatar-upload': pendingImage = 'avatar'; $('#singleImageInput').click(); break;
      case 'avatar-remove': { mutate(() => { state.profile.avatar = null; }); profileDialog(); break; }
      case 'bg-upload': pendingImage = 'background'; $('#singleImageInput').click(); break;
      case 'bg-preset': { mutate(() => { state.profile.background = el.getAttribute('data-key'); }); renderBgThumbs(); applyBackground(); break; }
      case 'pf-save': {
        const name = $('#pfName').value.trim();
        mutate(() => { state.profile.name = name || 'VidaOS'; state.profile.signature = $('#pfSig').value.trim(); });
        closeModal(); applyBackground(); render(); toast('已保存'); break;
      }
      case 'pwa-install': { if (deferredInstall) deferredInstall.prompt(); break; }

      // 分类管理
      case 'cat-add': {
        const v = $('#newCat').value.trim();
        if (!v) break;
        if (!state.categories[noteSection]) state.categories[noteSection] = [];
        mutate(() => { if (!state.categories[noteSection].includes(v)) state.categories[noteSection].push(v); });
        catsManageDialog(); break;
      }
      case 'cat-del': {
        const c = el.getAttribute('data-cat');
        mutate(() => { state.categories[noteSection] = state.categories[noteSection].filter((x) => x !== c); state.notes[noteSection].forEach((n) => { if (n.category === c) n.category = ''; }); });
        catsManageDialog(); break;
      }

      // 收藏/删除合集
      case 'col-save': { if (pendingConfirm && pendingConfirm()) closeModal(); break; }
      case 'sc-save': { if (pendingConfirm && pendingConfirm()) closeModal(); break; }
      case 'ne-save': { if (pendingConfirm && pendingConfirm()) closeModal(); break; }

      // 编辑器图片移除
      case 'ed-img-rm': {
        const i = parseInt(el.getAttribute('data-i'), 10);
        ed.images.splice(i, 1);
        renderEditorImages(); break;
      }

      // 通用
      case 'modal-close': closeModal(); break;
      case 'modal-ok': { const cb = pendingConfirm; if (cb) { const r = cb(); if (r !== false) closeModal(); } break; }
      default: break;
    }
  });

  /* 拖拽 seek/volume 支持（pointer 事件）*/
  document.addEventListener('pointerdown', (e) => {
    const seekEl = e.target.closest('.slider-track[data-action="seek"]');
    const volEl = e.target.closest('.slider-track[data-action="vol"]');
    if (!seekEl && !volEl) return;
    const isSeek = !!seekEl;
    const move = (ev) => { if (isSeek) seekTo(ev.clientX); else setVolume(ev.clientX); };
    const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    move(e);
  });

  /* ========================================================================
     17. 对话框补充
     ===================================================================== */
  function promptCat() {
    openModal(`
      <div class="modal-head"><div class="modal-title">新建分类</div>
        <button class="modal-close" data-action="modal-close">${icon('x')}</button></div>
      <div class="note-compose"><input id="newCat" placeholder="分类名称"></div>
      <div class="modal-foot"><button class="glass-btn" data-action="modal-close">取消</button>
        <button class="glass-btn btn-primary" data-action="cat-add">添加</button></div>`);
  }

  function editTrackDialog(t) {
    if (!t || t.builtin) { toast('内置音景不可编辑'); return; }
    openModal(`
      <div class="modal-head"><div class="modal-title">编辑音乐信息</div>
        <button class="modal-close" data-action="modal-close">${icon('x')}</button></div>
      <div class="field"><label>标题</label><input id="tkTitle" value="${esc(t.title || '')}" placeholder="歌名"></div>
      <div class="field"><label>艺术家</label><input id="tkArtist" value="${esc(t.artist || '')}" placeholder="艺术家"></div>
      <div class="modal-foot"><button class="glass-btn" data-action="modal-close">取消</button>
        <button class="glass-btn btn-primary" data-action="tk-save">保存</button></div>`);
    pendingConfirm = () => {
      mutate(() => { t.title = $('#tkTitle').value.trim(); t.artist = $('#tkArtist').value.trim(); });
      renderDesk(); return true;
    };
  }

  function openLetterDialog(l) {
    if (l.unread) { mutate(() => { l.unread = false; }); }
    openModal(`
      <div class="modal-head"><div class="modal-title">${esc(l.title || '（无标题）')}</div>
        <button class="modal-close" data-action="modal-close">${icon('x')}</button></div>
      <div class="field" style="color:var(--text-2);line-height:1.8;font-size:14.5px;white-space:pre-wrap;word-break:break-word">${esc(l.content || '')}</div>
      <div class="thumb-strip">${(l.images || []).map((f) => imgTag(f)).join('')}</div>
      <div class="post-meta" style="margin-top:14px"><span class="date">${fmtDateTime(l.createdAt)}</span></div>
      <div class="modal-foot">
        <button class="glass-btn" data-action="letter-fav-inline" data-id="${l.id}">${icon(isFav('letter', l.id) ? 'heartFilled' : 'heart')} 收藏</button>
        <button class="glass-btn btn-primary" data-action="modal-close">关闭</button>
      </div>`);
    hydrateImages($('#modalLayer'));
    // 收藏按钮
    $$('#modalLayer [data-action="letter-fav-inline"]').forEach((b) => b.addEventListener('click', () => { toggleFav('letter', l.id); closeModal(); renderMailbox(); }));
  }

  function deleteArticle(id) {
    const a = state.articles.find((x) => x.id === id);
    mutate(() => {
      state.articles = state.articles.filter((x) => x.id !== id);
      state.favorites = state.favorites.filter((f) => !(f.refType === 'article' && f.refId === id));
    });
    if (a) {
      const ids = [a.cover, ...(a.images || [])].filter(Boolean);
      VidaStore.delFiles(ids);
    }
    goBack(); toast('已删除');
  }

  /* ========================================================================
     18. 静态元素事件绑定
     ===================================================================== */
  let pendingImage = null; // 'avatar' | 'background'
  let deferredInstall = null;

  function bindStatic() {
    $('#topBack').addEventListener('click', goBack);

    // 编辑器
    $('#edClose').addEventListener('click', () => {
      const dirty = $('#edText').value.trim() || ed.images.length || $('#edTitle').value.trim();
      if (dirty) confirmDialog('放弃编辑', '有未保存的内容，确定放弃吗？', () => { closeEditor(); return true; });
      else closeEditor();
    });
    $('#edSave').addEventListener('click', saveEditor);
    $('#edFavorite').addEventListener('click', () => {
      if (ed.id) {
        const type = ed.mode === 'article' ? 'article' : ed.mode === 'moment' ? 'moment' : 'letter';
        toggleFav(type, ed.id);
      } else { toast('保存后才能收藏'); }
    });
    $('#edModeBtn').addEventListener('click', () => {
      const on = $('#edPreview').classList.contains('active');
      setPreviewMode(!on);
    });
    $('#edImageBtn').addEventListener('click', () => $('#imageInput').click());
    $('#edText').addEventListener('input', () => { updateEdWc(); if (ed.mode === 'article' && $('#edPreview').classList.contains('active')) setPreviewMode(true); });

    // 便签输入框回车
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target && e.target.id === 'noteCompose') {
        e.preventDefault();
        const sec = noteSection;
        const v = e.target.value; e.target.value = '';
        if (sec === 'todo') addTodo(v); else addNote(v);
      }
    });

    // 文件输入
    $('#imageInput').addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length) {
        const ids = await storeImageFiles(files);
        ed.images = ed.images.concat(ids);
        renderEditorImages();
      }
      e.target.value = '';
    });
    $('#singleImageInput').addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) {
        const ids = await storeImageFiles([f]);
        if (pendingImage === 'avatar') { mutate(() => { state.profile.avatar = ids[0]; }); profileDialog(); }
        else if (pendingImage === 'background') { mutate(() => { state.profile.background = ids[0]; }); profileDialog(); applyBackground(); }
        pendingImage = null;
      }
      e.target.value = '';
    });
    $('#audioInput').addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) {
        const id = VidaStore.uid('aud');
        await VidaStore.putFile(id, f);
        const title = f.name.replace(/\.[^.]+$/, '');
        mutate(() => state.tracks.push({ id: VidaStore.uid('t'), title, artist: '未知艺术家', fileId: id, createdAt: nowISO() }));
        toast('已添加音乐');
        renderDesk();
      }
      e.target.value = '';
    });
    $('#importInput').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) doImport(f);
      e.target.value = '';
    });

    // PWA 安装
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstall = e;
      if ($('#pwaInstallBtn')) $('#pwaInstallBtn').style.display = 'flex';
    });

    buildMdToolbar();
    // markdown 工具栏点击（委托）
    $('#mdToolbar').addEventListener('click', (e) => {
      const b = e.target.closest('[data-md]');
      if (b) applyMdTool(b.getAttribute('data-md'));
    });
  }

  /* ========================================================================
     19. 初始化
     ===================================================================== */
  const RENDERERS = {
    desk: renderDesk, notes: renderNotes, data: renderData, settings: renderSettings,
    space: renderSpace, collection: renderCollection, article: renderArticle,
    moments: renderMoments, mailbox: renderMailbox, favorites: renderFavorites,
  };

  function emptyHTML(ic, title, desc) {
    return `<div class="empty"><span style="display:block">${icon(ic)}</span><span class="et">${esc(title)}</span><span class="ed">${esc(desc)}</span></div>`;
  }

  async function boot() {
    try {
      if (typeof DOMPurify !== 'undefined' && DOMPurify.addHook) {
        DOMPurify.addHook('afterSanitizeAttributes', (node) => {
          if (node.tagName === 'A') { node.setAttribute('target', '_blank'); node.setAttribute('rel', 'noopener noreferrer'); }
        });
      }
      if (typeof marked !== 'undefined') {
        marked.setOptions({ gfm: true, breaks: true });
      }
    } catch (e) { console.warn(e); }

    const saved = await VidaStore.getState();
    state = saved || VidaStore.defaultState();
    if (!state.categories) state.categories = { inspiration: [], schedule: [], todo: [] };
    if (!state.notes) state.notes = { inspiration: [], schedule: [], todo: [] };
    if (!state.settings) state.settings = { lastTab: 'desk' };
    if (!state.profile) state.profile = VidaStore.defaultState().profile;
    if (!state.tracks) state.tracks = [];
    if (!state.collections) state.collections = [];
    if (!state.articles) state.articles = [];
    if (!state.moments) state.moments = [];
    if (!state.letters) state.letters = [];
    if (!state.favorites) state.favorites = [];

    ensureBuiltinTrack();
    applyBackground();
    bindStatic();
    currentTab = state.settings.lastTab && TABS.some((t) => t.id === state.settings.lastTab) ? state.settings.lastTab : 'desk';
    currentView = currentTab;
    render();

    // 时钟
    setInterval(tick, 1000);

    // 注册 Service Worker
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.protocol === 'http:')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
