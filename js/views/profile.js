import { loadPair } from '../supa.js';
import { esc, $, $$, hydrate, imgTag, ink, openModal, radarChart } from '../ui.js';
import { tabs, pairName } from './shared.js';

export const PTABS = [['basic', '기본'], ['look', '외관 · 성격'], ['voice', '말투 · 습관'], ['taste', '취향'], ['past', '과거 · 관계'], ['outfit', '의상']];
export const LOOK = [['first', '첫인상'], ['hair', '머리카락'], ['eyes', '눈'], ['body', '체형'], ['wear', '복장 · 소지품']];
export const DEPTH = [['surface', '표면'], ['inner', '내면'], ['abyss', '심연']];
export const LINES = [['first', '첫만남'], ['daily', '평상시'], ['close', '친해졌을 때'], ['angry', '화났을 때'], ['bad', '사이 안 좋을 때']];
export const HABITS = [['speech', '말버릇'], ['unconscious', '무의식적인 행동'], ['routine', '생활 습관']];
export const QUIRK_PH = ['머리 만지는 버릇', '말끝에 ~거든', '웃을 때 눈 감기', '혼잣말', '손톱 물어뜯기', '코 찡긋', '한숨 쉬는 습관'];
export const WEAK = [['weak', '약점'], ['trigger', '트리거'], ['trauma', '트라우마']];
export const TASTE = [
  ['food', '음식'], ['drink', '음료'], ['scent', '향'], ['color', '색'], ['season', '계절 · 날씨'],
  ['place', '장소'], ['sound', '소리 · 음악'], ['hobby', '취미 · 놀이'], ['thing', '물건 · 선물'], ['person', '사람 유형'], ['etc', '그 외'],
];
export const DEFAULT_SLIDERS = [{ l: '내향', r: '외향', v: 50 }, { l: '이성', r: '감성', v: 50 }, { l: '신중', r: '충동', v: 50 }];
export const DEFAULT_STATS = [
  { name: 'CHR', label: '매력', value: 50 },
  { name: 'INT', label: '지능', value: 50 },
  { name: 'STR', label: '체력', value: 50 },
  { name: 'MEN', label: '정신력', value: 50 },
  { name: 'SOC', label: '사교성', value: 50 },
  { name: 'LCK', label: '운', value: 50 },
];

const tabState = {};
const dash = (v) => (v && String(v).trim() ? esc(v) : '<span class="muted">—</span>');
const kvList = (pairs, obj = {}, col = 'var(--wine)') =>
  pairs.map(([k, l]) => `<div class="kv pre"><b style="color:${col}">${l}</b> · ${dash(obj[k])}</div>`).join('');

const tasteList = (obj = {}) => {
  const rows = TASTE.filter(([k]) => obj[k] && String(obj[k]).trim());
  return rows.length ? `<div style="display:grid;grid-template-columns:96px minmax(0,1fr);gap:8px 12px;font-size:14px">${rows.map(([k, l]) => `<span class="muted" style="font-size:13px">${l}</span><span class="pre">${esc(obj[k])}</span>`).join('')}</div>` : '<div class="muted">프로필 수정 → 취향에서 채울 수 있어요</div>';
};

export default async function profile(el, pid, which, cached) {
  const ctx = cached || await loadPair(pid);
  if (!ctx) { location.hash = '#/'; return; }
  const c = ctx[which];
  const p = c.profile || {};
  const col = c.color || '#f2c6c2';
  const key = c.id || which;
  const tab = tabState[key] || 'basic';
  const other = which === 'a' ? 'b' : 'a';

  const body = {
    basic: `
      <div class="grid2">
        <div class="card"><h3>프로필</h3>
          <div style="display:grid;grid-template-columns:90px minmax(0,1fr);font-size:14px">
            ${[['이름', c.name], ['이명', p.alias], ['구분', p.kind], ['나이', p.age], ['생일', p.birthday], ['키', p.height], ['MBTI', p.mbti], ['테마곡', p.song], ['상징물', p.symbol]]
              .map(([l, v]) => `<div class="muted" style="padding:8px 0;border-top:1.5px dashed var(--line)">${l}</div><div style="padding:8px 0;border-top:1.5px dashed var(--line)">${dash(v)}</div>`).join('')}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:22px">
          <div class="card" style="flex-direction:row;align-items:center;gap:18px">
            <div style="width:84px;height:84px;border-radius:14px;background:${col};border:1px solid #c9b3a3;flex-shrink:0"></div>
            <div><h3>상징색</h3><div style="font-size:18px;letter-spacing:1px">${esc(col)}</div></div>
          </div>
          <div class="card"><h3>키워드</h3>
            <div class="row" style="gap:6px">${(p.tags || '').split(',').map((t) => t.trim()).filter(Boolean).map((t) => `<span class="badge" style="background:${col};color:${ink(col)}">#${esc(t)}</span>`).join('') || '<span class="muted">프로필 수정 → 기본에서 추가할 수 있어요</span>'}</div>
          </div>
        </div>
      </div>
      <div class="card"><h3>TMI</h3>
        ${(p.tmi || '').split('\n').map((t) => t.trim()).filter(Boolean).length
          ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px">${(p.tmi || '').split('\n').map((t) => t.trim()).filter(Boolean).map((t, i) => `<div class="note ${i % 2 ? 'blue' : 'yellow'}" style="padding:14px 16px;font-size:14px;line-height:1.7;box-shadow:var(--shadow)">${esc(t)}</div>`).join('')}</div>`
          : '<div class="muted">한 줄에 하나씩 적으면 포스트잇처럼 모여요</div>'}
      </div>`,
    look: `
      <div class="grid2">
        <div class="card"><h3>외관</h3>${kvList(LOOK, p.look)}</div>
        <div class="card depth"><h3>성격 — 깊이 순</h3>
          ${[['surface', '표면', 18], ['inner', '내면', 50], ['abyss', '심연', 100]].map(([k, l, pct]) => {
            const bg = pct === 100 ? col : `color-mix(in srgb, ${col} ${pct}%, #ffffff)`;
            const fg = pct === 100 ? ink(col) : 'var(--ink)';
            return `<div style="background:${bg};color:${fg};display:grid;grid-template-columns:52px minmax(0,1fr);gap:10px;align-items:baseline"><span class="game" style="font-size:14px;opacity:.8">${l}</span><span class="pre">${p.depth?.[k] ? esc(p.depth[k]) : '—'}</span></div>`;
          }).join('')}
        </div>
      </div>
      <div class="card"><h3>성격 슬라이더</h3>
        ${(p.sliders?.length ? p.sliders : DEFAULT_SLIDERS).map((s) => `
          <div class="slider-row"><div class="l">${esc(s.l)}</div>
            <div class="track" role="img" aria-label="${esc(s.l)} ${100 - s.v} : ${esc(s.r)} ${s.v}"><div class="knob" style="left:${s.v}%;background:${col}"></div></div>
            <div>${esc(s.r)}</div></div>`).join('')}
      </div>`,
    voice: `
      <div class=”card”><h3>상황별 대사</h3>
        ${LINES.map(([k, l]) => `<div class=”line-row”><div class=”muted”>${l}</div><div class=”say pre”>${p.lines?.[k] ? '”' + esc(p.lines[k]) + '”' : '<span class=”muted” style=”font-family:var(--body)”>—</span>'}</div></div>`).join('')}
      </div>
      <div class=”card”><h3>버릇 · 말투 · 특이사항</h3>
        ${(p.quirks?.length) ? `<div class=”row” style=”gap:8px;flex-wrap:wrap”>${p.quirks.map((q) => `<span class=”badge quirk-tag” style=”background:${col};color:${ink(col)};font-size:14px;padding:6px 14px”>${esc(q)}</span>`).join('')}</div>` : '<div class=”muted”>프로필 수정 → 말투·습관에서 태그를 추가해보세요</div>'}
      </div>
      <div class=”grid2”>
        <div class=”card”><h3>버릇 · 습관 (상세)</h3>${kvList(HABITS, p.habits, 'var(--mute)')}</div>
        <div class=”card”><h3>약점 · 트라우마</h3>${kvList(WEAK, p.weak, 'var(--mute)')}</div>
      </div>`,
    taste: `
      <div class="grid2">
        <div class="card note yellow"><h3>좋아하는 것</h3>${tasteList(p.like)}</div>
        <div class="card note blue"><h3>싫어하는 것</h3>${tasteList(p.dislike)}</div>
      </div>`,
    past: `
      <div class="card"><h3>과거사</h3>
        ${p.history?.length ? `<div class="timeline">${p.history.map((h) => `<div><b style="color:var(--wine)">${esc(h.when)}</b><div class="pre">${esc(h.what)}</div></div>`).join('')}</div>` : '<div class="muted">아직 비어 있어요</div>'}
      </div>
      <div class="card"><h3>관계</h3>
        ${p.relations?.length ? `<div class="grid3">${p.relations.map((r) => `
          <div class="rel-card">
            <div class="row" style="flex-wrap:nowrap"><div class="avatar">${imgTag(r.image_path, r.name)}</div>
              <div><div class="hand" style="font-size:20px">${esc(r.name)}</div><div class="muted">${esc(r.label)}</div></div></div>
            <div class="pre" style="font-size:13px;line-height:1.7">${esc(r.note)}</div>
          </div>`).join('')}</div>` : '<div class="muted">아직 비어 있어요</div>'}
      </div>`,
    outfit: `
      <div class="card"><h3>의상 · 레퍼런스</h3>
        ${p.outfits?.length ? `<div class="outfits">${p.outfits.map((o, i) => `
          <figure style="margin:0;display:flex;flex-direction:column;gap:6px"><div class="ph"><button type="button" data-zoom="${i}" style="border:none;padding:0;width:100%;height:100%;background:none" aria-label="${esc(o.name)} 크게 보기">${imgTag(o.image_path, o.name)}</button></div>
          <figcaption style="font-size:14px">${esc(o.name)}</figcaption></figure>`).join('')}</div>` : '<div class="muted">프로필 수정 → 의상에서 올릴 수 있어요</div>'}
      </div>`,
  };

  el.innerHTML = `
    <div class="topbar">
      <a class="back" href="#/pair/${pid}">← ${pairName(ctx.a, ctx.b)}</a>
      <div class="grow"></div>
      <a class="btn" href="#/pair/${pid}/profile/${which}" style="background:${col};color:${ink(col)};border-color:${col};font-family:var(--hand);font-size:19px;font-weight:700" aria-current="page">${esc(c.name)}</a>
      <a class="btn" href="#/pair/${pid}/profile/${other}" style="font-family:var(--hand);font-size:19px">${esc(ctx[other].name)}</a>
      <a class="btn" href="#/pair/${pid}/profile/${which}/edit">프로필 수정</a>
      <button class="btn" data-act="card" style="font-family:var(--game)">CARD</button>
    </div>
    ${tabs(pid, 'profile')}
    <div class="profile-head">
      <div class="standing" style="background:linear-gradient(180deg, ${esc(c.color)}33, #fff)">${imgTag(c.image_path, c.name) || '사진 없음'}</div>
      <div style="display:flex;flex-direction:column;gap:12px;flex:1;min-width:260px">
        <div class="row" style="gap:10px">${p.kind ? `<span class="badge">${esc(p.kind)}</span>` : ''}${p.alias ? `<span style="color:var(--wine)">「${esc(p.alias)}」</span>` : ''}</div>
        <h1>${esc(c.name)}</h1>
        ${p.intro ? `<div style="max-width:640px;color:var(--ink2)" class="pre">${esc(p.intro)}</div>` : ''}
        ${p.line ? `<div class="hand" style="font-size:22px;color:#6b3a45">“${esc(p.line)}”</div>` : ''}
        <div class="info-chips">
          ${[['나이', p.age], ['생일', p.birthday], ['키', p.height], ['MBTI', p.mbti], ['테마곡', p.song], ['상징물', p.symbol]].filter(([, v]) => v).map(([l, v]) => `<span>${l} · ${esc(v)}</span>`).join('')}
          <span><i class="dot" style="background:${col}"></i>${esc(col)}</span>
        </div>
      </div>
    </div>
    <div class="row" role="tablist" aria-label="프로필 항목" style="gap:8px">
      ${PTABS.map(([k, l]) => `<button class="chip ${tab === k ? 'on' : ''}" role="tab" aria-selected="${tab === k}" data-ptab="${k}">${l}</button>`).join('')}
    </div>
    <div style="display:flex;flex-direction:column;gap:22px">${body[tab]}</div>`;
  hydrate(el);

  $$(el, '[data-ptab]').forEach((b) => (b.onclick = () => { tabState[key] = b.dataset.ptab; profile(el, pid, which, ctx); }));
  $$(el, '[data-zoom]').forEach((b) => (b.onclick = () => {
    const src = b.querySelector('img')?.src; if (!src) return;
    const box = document.createElement('div');
    box.className = 'lightbox';
    box.innerHTML = `<img src="${src}" alt=""><div class="bar"><button class="btn">닫기</button></div>`;
    box.onclick = () => box.remove();
    document.body.appendChild(box);
  }));

  $(el, '[data-act=card]')?.addEventListener('click', () => {
    const stats = p.stats?.length ? p.stats : DEFAULT_STATS;
    const total = stats.reduce((s, x) => s + x.value, 0);
    const tags = (p.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
    const m = openModal(`
      <div class="tcard" style="--card-color:${col}">
        <div class="tcard-inner">
          <div class="tcard-header">
            <span class="tcard-rank game">${p.kind || 'OC'}</span>
            <span class="tcard-total game">${total}<small>/${stats.length * 100}</small></span>
          </div>
          <div class="tcard-portrait">${imgTag(c.image_path, c.name) || `<span style="font-size:48px;opacity:.3">${esc(c.name[0] || '?')}</span>`}</div>
          <div class="tcard-name">
            <h2 class="game">${esc(c.name)}</h2>
            ${p.alias ? `<div class="tcard-alias">「${esc(p.alias)}」</div>` : ''}
          </div>
          <div class="tcard-chart">${radarChart(stats, col, 220)}</div>
          <div class="tcard-stats">${stats.map((s) => `<div class="tcard-stat"><span class="game">${esc(s.name)}</span><div class="tcard-bar"><div style="width:${s.value}%;background:${col}"></div></div><span class="game">${s.value}</span></div>`).join('')}</div>
          ${tags.length ? `<div class="tcard-tags">${tags.slice(0, 5).map((t) => `<span class="badge" style="background:${col};color:${ink(col)}">#${esc(t)}</span>`).join('')}</div>` : ''}
          ${p.line ? `<div class="tcard-quote">"${esc(p.line)}"</div>` : ''}
        </div>
      </div>
      <div class="row" style="justify-content:center;gap:10px"><button class="btn primary" data-x>닫기</button></div>`, { wide: true });
    hydrate(m.el);
    m.el.querySelector('[data-x]').onclick = m.close;
  });
}
