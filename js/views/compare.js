import { loadPair } from '../supa.js';
import { esc, hydrate, imgTag, ink } from '../ui.js';
import { tabs, subHeader } from './shared.js';
import { TASTE } from './profile.js';

const tokens = (s) => String(s || '').split(/[,，·/\n]+/).map((x) => x.trim()).filter(Boolean);
const dash = (v) => (v && String(v).trim() ? esc(v) : '<span class="muted">—</span>');

export default async function compare(el, pid) {
  const ctx = await loadPair(pid);
  if (!ctx) { location.hash = '#/'; return; }
  const { a, b } = ctx;
  const pa = a.profile || {}, pb = b.profile || {};

  const row = (label, va, vb, same = false) => `
    <div class="vs-row ${same ? 'same' : ''}">
      <div class="vs-k">${label}${same ? '<span class="vs-tag">같아요</span>' : ''}</div>
      <div class="vs-v">${va}</div><div class="vs-v">${vb}</div>
    </div>`;
  const eq = (x, y) => x && y && String(x).trim().toLowerCase() === String(y).trim().toLowerCase();

  const basics = [['alias', '이명'], ['kind', '구분'], ['age', '나이'], ['birthday', '생일'], ['height', '키'], ['mbti', 'MBTI'], ['song', '테마곡'], ['symbol', '상징물']]
    .map(([k, l]) => row(l, dash(pa[k]), dash(pb[k]), eq(pa[k], pb[k]))).join('');

  // 성격 슬라이더: 같은 양끝 이름끼리 묶기
  const key = (s) => `${s.l}|${s.r}`;
  const sl = new Map();
  (pa.sliders || []).forEach((s) => sl.set(key(s), { l: s.l, r: s.r, a: s.v }));
  (pb.sliders || []).forEach((s) => { const k = key(s); sl.set(k, { ...(sl.get(k) || { l: s.l, r: s.r }), b: s.v }); });
  const bar = (v, col) => (v == null ? '<span class="muted">—</span>' : `<span class="vs-bar"><span style="left:${v}%;background:${esc(col)}"></span></span>`);
  const sliders = [...sl.values()].map((s) => `
    <div class="vs-row">
      <div class="vs-k">${esc(s.l)} ↔ ${esc(s.r)}</div>
      <div class="vs-v">${bar(s.a, a.color)}</div><div class="vs-v">${bar(s.b, b.color)}</div>
    </div>`).join('');

  const tasteRows = (which, title) => {
    const A = pa[which] || {}, B = pb[which] || {};
    const rows = TASTE.filter(([k]) => (A[k] && String(A[k]).trim()) || (B[k] && String(B[k]).trim()));
    if (!rows.length) return '';
    return `<div class="vs-sec">${title}</div>` + rows.map(([k, l]) => {
      const ta = tokens(A[k]), tb = tokens(B[k]);
      const common = ta.filter((x) => tb.some((y) => y.toLowerCase() === x.toLowerCase()));
      const mark = (list) => (list.length ? list.map((x) => `<span class="${common.some((c) => c.toLowerCase() === x.toLowerCase()) ? 'vs-common' : ''}">${esc(x)}</span>`).join(', ') : '<span class="muted">—</span>');
      return row(l, mark(ta), mark(tb), common.length > 0);
    }).join('');
  };
  const likeRows = tasteRows('like', '좋아하는 것');
  const disRows = tasteRows('dislike', '싫어하는 것');
  // 서로 엇갈리는 취향: A가 좋아하는데 B가 싫어하는 것
  const clash = [];
  for (const [k, l] of TASTE) {
    for (const [p, q, n1, n2] of [[pa, pb, a.name, b.name], [pb, pa, b.name, a.name]]) {
      tokens(p.like?.[k]).forEach((x) => { if (tokens(q.dislike?.[k]).some((y) => y.toLowerCase() === x.toLowerCase())) clash.push(`${l} · <b>${esc(x)}</b> — ${esc(n1)}는 좋아하고 ${esc(n2)}는 싫어해요`); });
    }
  }


  el.innerHTML = `
    ${subHeader({ pid, a, b, title: 'VS — 비교' })}
    ${tabs(pid, 'compare')}
    <div class="card vs">
      <div class="vs-row vs-head">
        <div class="vs-k"></div>
        ${[a, b].map((c) => `<div class="vs-v"><span class="vs-av" style="background:${esc(c.color)}55">${imgTag(c.image_path, c.name)}</span><span class="badge" style="background:${esc(c.color)};color:${ink(c.color)}">${esc(c.name)}</span></div>`).join('')}
      </div>
      <div class="vs-sec">기본</div>
      ${basics}
      ${row('상징색', `<span class="dot" style="background:${esc(a.color)}"></span> ${esc(a.color)}`, `<span class="dot" style="background:${esc(b.color)}"></span> ${esc(b.color)}`)}
      ${sliders ? `<div class="vs-sec">성격 슬라이더</div>${sliders}` : ''}
      ${likeRows}${disRows}
      ${clash.length ? `<div class="vs-sec">엇갈리는 취향</div><div style="display:flex;flex-direction:column;gap:6px;font-size:14px;padding:4px 0">${clash.map((x) => `<div class="vs-clash">${x}</div>`).join('')}</div>` : ''}
    </div>
    <p class="muted" style="margin:0">취향은 쉼표(,)로 나눠 적으면 겹치는 단어를 찾아 표시해요. 내용은 각 캐릭터 프로필에서 고칠 수 있어요.</p>`;
  hydrate(el);
}
