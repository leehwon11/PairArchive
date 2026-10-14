import { imgUrl, upload } from './supa.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (root, sel) => root.querySelector(sel);
export const $$ = (root, sel) => [...root.querySelectorAll(sel)];

export const ICON = {
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  del: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>',
  up: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 20h16"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>',
  upArrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 19V5"/><path d="M6 11l6-6 6 6"/></svg>',
  downArrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14"/><path d="M6 13l6 6 6-6"/></svg>',
};
export const iconBtn = (act, label, icon, extra = '', data = '') =>
  `<button type="button" class="icon-btn ${extra}" data-act="${act}" ${data} aria-label="${esc(label)}">${ICON[icon]}</button>`;

// ── 토스트 ──
let tt;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(tt);
  tt = setTimeout(() => el.classList.remove('show'), 2600);
}
export async function guard(fn, okMsg) {
  try { const r = await fn(); if (okMsg) toast(okMsg); return r; }
  catch (e) { console.error(e); toast('오류: ' + e.message); return undefined; }
}

// ── 모달 ──
export function openModal(html, { wide = false } = {}) {
  const root = document.getElementById('modal-root');
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true" style="${wide ? 'width:min(860px,100%)' : ''}">${html}</div>`;
  root.appendChild(bg);
  const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(); });
  const first = bg.querySelector('input,textarea,select,button');
  if (first) setTimeout(() => first.focus(), 30);
  return { el: bg.querySelector('.modal'), close };
}
export function confirmBox(title, msg, okLabel = '삭제') {
  return new Promise((resolve) => {
    const m = openModal(`<h2>${esc(title)}</h2><p style="margin:0">${esc(msg)}</p>
      <div class="row" style="justify-content:flex-end"><button class="btn" data-x>취소</button><button class="btn primary" data-ok>${esc(okLabel)}</button></div>`);
    m.el.querySelector('[data-x]').onclick = () => { m.close(); resolve(false); };
    m.el.querySelector('[data-ok]').onclick = () => { m.close(); resolve(true); };
  });
}

// ── 폼 필드 ──
let fid = 0;
export function field(label, name, value = '', { area = false, ph = '', type = 'text', rows = 3 } = {}) {
  const id = 'f' + ++fid;
  const ctl = area
    ? `<textarea id="${id}" name="${name}" rows="${rows}" placeholder="${esc(ph)}">${esc(value)}</textarea>`
    : `<input id="${id}" type="${type}" name="${name}" value="${esc(value)}" placeholder="${esc(ph)}">`;
  return `<div class="field"><label for="${id}">${esc(label)}</label>${ctl}</div>`;
}
// name="a.b.c" 형태를 중첩 객체로
export function readForm(root) {
  const out = {};
  root.querySelectorAll('[name]').forEach((el) => {
    const keys = el.name.split('.');
    let o = out;
    keys.slice(0, -1).forEach((k) => { o = o[k] ??= {}; });
    o[keys.at(-1)] = el.type === 'range' ? Number(el.value) : el.value.trim();
  });
  return out;
}

// ── 이미지 ──
export async function hydrate(root) {
  await Promise.all($$(root, 'img[data-img]').map(async (img) => {
    try { img.src = await imgUrl(img.dataset.img); } catch { img.alt = '이미지를 불러오지 못했어요'; }
  }));
}
export const imgTag = (path, alt = '') => (path ? `<img data-img="${esc(path)}" alt="${esc(alt)}">` : '');

export function pickFiles({ multiple = false } = {}) {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = multiple;
    inp.onchange = () => resolve([...inp.files]);
    inp.click();
  });
}
export async function uploadMany(files) {
  const paths = [];
  for (const f of files) paths.push(await upload(f));
  return paths;
}
export function makeDropzone(el, onFiles) {
  el.addEventListener('click', async () => { const f = await pickFiles({ multiple: true }); if (f.length) onFiles(f); });
  el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('over'); });
  el.addEventListener('dragleave', () => el.classList.remove('over'));
  el.addEventListener('drop', (e) => {
    e.preventDefault(); el.classList.remove('over');
    const f = [...e.dataTransfer.files].filter((x) => x.type.startsWith('image/'));
    if (f.length) onFiles(f);
  });
}

// ── 색 / 날짜 / 마크다운 ──
export function ink(hex) {
  const h = String(hex || '#ffffff').replace('#', '').padEnd(6, 'f');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#2a211d' : '#ffffff';
}
export const validHex = (h) => /^#[0-9a-fA-F]{6}$/.test(h || '');
export function dday(date) {
  if (!date) return null;
  const start = new Date(date + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.floor((today - start) / 86400000) + 1;
}
export const today = () => new Date().toISOString().slice(0, 10);
export const fmtDate = (d) => (d ? String(d).slice(0, 10) : '');

export function md(text) {
  const lines = esc(text).split('\n');
  const inline = (s) => s
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.+?)\*/g, '<i>$1</i>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>');
  let html = '', quote = [];
  const flush = () => { if (quote.length) { html += `<blockquote>${quote.join('<br>')}</blockquote>`; quote = []; } };
  for (const l of lines) {
    if (l.startsWith('&gt; ') || l === '&gt;') { quote.push(inline(l.replace(/^&gt; ?/, ''))); continue; }
    flush();
    if (/^-{3,}$/.test(l.trim())) html += '<hr>';
    else html += inline(l) + '<br>';
  }
  flush();
  return html;
}
export const has = (...v) => v.some((x) => x && String(x).trim());

// ── 배경 테마 (파스텔) ──
export const THEMES = [
  ['lavender', '라벤더', { bg: '#f4eefb', dot: '#e6dcf5', soft: '#ece3f8', sh: '#d9cfee', accent: '#7a5cc7', 'accent-dk': '#5d42a8', field: '#fbf9ff' }],
  ['peach', '피치', { bg: '#fdf1ea', dot: '#f6dfd2', soft: '#fbe6db', sh: '#f0d2c2', accent: '#d0694a', 'accent-dk': '#a84b30', field: '#fffaf7' }],
  ['mint', '민트', { bg: '#ecf7f2', dot: '#d4ece1', soft: '#dff2e9', sh: '#c6e3d6', accent: '#2f8f6b', 'accent-dk': '#1f6b4f', field: '#f8fdfb' }],
  ['sky', '스카이', { bg: '#ecf4fc', dot: '#d6e6f6', soft: '#e0edfa', sh: '#c9ddf1', accent: '#3b78c4', 'accent-dk': '#285a99', field: '#f8fbff' }],
  ['lemon', '레몬', { bg: '#fbf8e6', dot: '#efe9c4', soft: '#f6f0cf', sh: '#e8dfb0', accent: '#a07a12', 'accent-dk': '#7a5c08', field: '#fffdf3' }],
  ['rose', '로즈', { bg: '#fcf0f4', dot: '#f3dbe4', soft: '#f8e4ec', sh: '#eccdd9', accent: '#c24a78', 'accent-dk': '#9a3159', field: '#fffafc' }],
];
export function applyTheme(id = localStorage.getItem('xd-theme') || 'lavender') {
  const t = (THEMES.find(([k]) => k === id) || THEMES[0])[2];
  for (const [k, v] of Object.entries(t)) document.documentElement.style.setProperty('--' + k, v);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t.bg);
}
export function openTheme() {
  const cur = localStorage.getItem('xd-theme') || 'lavender';
  const m = openModal(`<h2>배경 테마</h2>
    <div class="themes">${THEMES.map(([k, l, t]) => `<button type="button" data-th="${k}" class="${k === cur ? 'on' : ''}" aria-pressed="${k === cur}"><i style="background:${t.bg};background-image:radial-gradient(${t.sh} 2px, transparent 2px);background-size:10px 10px;border:3px solid ${t.accent}"></i>${l}</button>`).join('')}</div>
    <div class="row" style="justify-content:flex-end"><button class="btn primary" data-x>닫기</button></div>`);
  m.el.querySelectorAll('[data-th]').forEach((b) => (b.onclick = () => {
    localStorage.setItem('xd-theme', b.dataset.th); applyTheme(b.dataset.th);
    m.el.querySelectorAll('[data-th]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
  }));
  m.el.querySelector('[data-x]').onclick = m.close;
}
export const themeBtn = () => `<button type="button" class="btn" data-theme-open aria-label="배경 테마 바꾸기">THEME</button>`;
export const HEART = (fill) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.6.8-1.4 2.3-2.6 4.4-2.6 3.6 0 5.7 3.7 4.2 7.2C19.5 16.4 12 21 12 21z" fill="${fill}"/></svg>`;

// ── 사진 자르기 · 위치 조절 ──
// cropImage(file, { aspect: 3/4, round: false, title }) → 잘린 File (취소하면 null)
export function cropImage(file, { aspect = 3 / 4, round = false, title = '사진 자르기' } = {}) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onerror = () => { URL.revokeObjectURL(url); toast('이미지를 열 수 없어요'); resolve(null); };
    im.onload = () => {
      const m = openModal(`
        <h2>${esc(title)}</h2>
        <p class="muted" style="margin:0">끌어서 위치를 옮기고, 아래 막대나 두 손가락(휠)로 확대해요. 테두리 안쪽만 저장돼요.</p>
        <div class="crop-wrap"><div class="crop-box ${round ? 'round' : ''}" tabindex="0" role="application" aria-label="사진 위치. 화살표로 옮기고 +, - 로 확대"><img alt="" draggable="false"></div></div>
        <div class="row" style="flex-wrap:nowrap"><span class="muted">작게</span><input type="range" class="crop-zoom" min="1" max="4" step="0.01" value="1" aria-label="확대" style="flex:1;accent-color:var(--accent)"><span class="muted">크게</span></div>
        <div class="row" style="justify-content:space-between">
          <button type="button" class="btn" data-reset>처음대로</button>
          <span class="row"><button type="button" class="btn" data-x>취소</button><button type="button" class="btn primary" data-ok>이대로 쓰기</button></span>
        </div>`);
      const box = m.el.querySelector('.crop-box'), img = box.querySelector('img'), zoomEl = m.el.querySelector('.crop-zoom');
      img.src = url;
      const W = Math.min(320, (m.el.clientWidth || 360) - 60);
      const H = Math.round(W / aspect);
      box.style.width = W + 'px'; box.style.height = H + 'px';
      const nw = im.naturalWidth, nh = im.naturalHeight;
      const base = Math.max(W / nw, H / nh); // 꽉 차는 최소 배율
      let z = 1, x = 0, y = 0;
      const clamp = () => {
        const s = base * z, iw = nw * s, ih = nh * s;
        x = Math.min(0, Math.max(W - iw, x)); y = Math.min(0, Math.max(H - ih, y));
      };
      const paint = () => { clamp(); const s = base * z; img.style.width = nw * s + 'px'; img.style.height = nh * s + 'px'; img.style.transform = `translate(${x}px, ${y}px)`; zoomEl.value = z; };
      const center = () => { z = 1; x = (W - nw * base) / 2; y = (H - nh * base) / 2; paint(); };
      const zoomAt = (nz, cx = W / 2, cy = H / 2) => {
        nz = Math.min(4, Math.max(1, nz));
        const s0 = base * z, s1 = base * nz;
        x = cx - ((cx - x) / s0) * s1; y = cy - ((cy - y) / s0) * s1; z = nz; paint();
      };
      center();
      // 끌기 · 두 손가락 확대
      const pts = new Map(); let last = null, pinch = null;
      box.addEventListener('pointerdown', (e) => { box.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); last = [e.clientX, e.clientY];
        if (pts.size === 2) { const [p, q] = [...pts.values()]; pinch = { d: Math.hypot(p[0] - q[0], p[1] - q[1]), z }; } });
      box.addEventListener('pointermove', (e) => {
        if (!pts.has(e.pointerId)) return;
        pts.set(e.pointerId, [e.clientX, e.clientY]);
        if (pinch && pts.size === 2) { const [p, q] = [...pts.values()]; const r = box.getBoundingClientRect(); zoomAt(pinch.z * Math.hypot(p[0] - q[0], p[1] - q[1]) / pinch.d, (p[0] + q[0]) / 2 - r.left, (p[1] + q[1]) / 2 - r.top); return; }
        x += e.clientX - last[0]; y += e.clientY - last[1]; last = [e.clientX, e.clientY]; paint();
      });
      const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; const rest = [...pts.values()][0]; last = rest || null; };
      box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
      box.addEventListener('wheel', (e) => { e.preventDefault(); const r = box.getBoundingClientRect(); zoomAt(z * (e.deltaY < 0 ? 1.08 : 0.93), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
      box.addEventListener('keydown', (e) => {
        const k = { ArrowLeft: [10, 0], ArrowRight: [-10, 0], ArrowUp: [0, 10], ArrowDown: [0, -10] }[e.key];
        if (k) { e.preventDefault(); x += k[0]; y += k[1]; paint(); }
        if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomAt(z * 1.1); }
        if (e.key === '-') { e.preventDefault(); zoomAt(z / 1.1); }
      });
      zoomEl.oninput = () => zoomAt(+zoomEl.value);
      const done = (v) => { URL.revokeObjectURL(url); m.close(); resolve(v); };
      m.el.querySelector('[data-reset]').onclick = center;
      m.el.querySelector('[data-x]').onclick = () => done(null);
      m.el.querySelector('[data-ok]').onclick = () => {
        const s = base * z, sx = -x / s, sy = -y / s, sw = W / s, sh = H / s;
        const ow = Math.round(Math.min(1400, sw)), oh = Math.round(ow / aspect);
        const cv = document.createElement('canvas'); cv.width = ow; cv.height = oh;
        cv.getContext('2d').drawImage(im, sx, sy, sw, sh, 0, 0, ow, oh);
        const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        cv.toBlob((b) => done(b ? new File([b], (file.name || 'photo').replace(/\.\w+$/, '') + (type === 'image/png' ? '.png' : '.jpg'), { type }) : null), type, 0.92);
      };
      setTimeout(() => box.focus(), 50);
    };
    im.src = url;
  });
}
// 이미 올린 사진을 다시 자르기용 File 로 가져오기
export async function fileFromPath(path) {
  const { imgUrl } = await import('./supa.js');
  const blob = await (await fetch(await imgUrl(path))).blob();
  return new File([blob], path.split('/').pop(), { type: blob.type || 'image/jpeg' });
}
