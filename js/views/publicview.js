// 공유 링크 열람 화면 (로그인 없이 읽기 전용)
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';
import { esc, md, dday, ink, HEART, fmtDate } from '../ui.js';
import { LOOK, DEPTH, LINES, HABITS, WEAK, TASTE } from './profile.js';

export default async function publicview(el, token) {
  el.innerHTML = '<div class="empty"><span class="spin">✿</span></div>';
  let data;
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/share?t=${encodeURIComponent(token)}`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
    data = await r.json();
    if (!r.ok) throw new Error(data.error || '불러오지 못했어요');
  } catch (e) {
    el.innerHTML = `<div class="empty"><span class="hand">열 수 없는 링크예요</span>${esc(e.message)}</div>`;
    return;
  }
  const { pair, a, b, urls = {} } = data;
  const d = pair.detail || {};
  const S = new Set(data.sections || []);
  const img = (p, alt = '') => (p && urls[p] ? `<img src="${esc(urls[p])}" alt="${esc(alt)}" loading="lazy">` : '');
  const title = d.name || `${a.name} × ${b.name}`;
  document.title = title;
  const days = dday(pair.start_date);
  const aff = d.affection || {};
  const hearts = (n = 0, col) => `<span class="hearts" role="img" aria-label="${n}/10">${Array.from({ length: 10 }, (_, i) => `<span style="width:22px;height:22px;display:inline-flex">${HEART(i < n ? col : 'var(--sh)')}</span>`).join('')}</span>`;
  const kw = (d.keywords || '').split(',').map((x) => x.trim()).filter(Boolean);
  let script = (d.script || []).filter((x) => x.text);
  if (!script.length) script = [{ who: 'n', text: pair.summary }, { who: 'a', text: a.profile?.line }, { who: 'b', text: b.profile?.line }].filter((x) => x.text);

  const navs = [['sec-status', 'STATUS']];
  const secs = [];
  const add = (id, label, html) => { navs.push([id, label]); secs.push(`<section id="${id}" style="display:flex;flex-direction:column;gap:16px;scroll-margin-top:16px"><h2 class="title">${label}</h2>${html}</section>`); };

  const kv = (pairs, obj = {}) => pairs.filter(([k]) => obj[k]).map(([k, l]) => `<div class="kv pre"><b>${l}</b> · ${esc(obj[k])}</div>`).join('') || '<div class="muted">—</div>';
  const prof = (c) => {
    const p = c.profile || {};
    if (!S.has('profile')) return '';
    const col = c.color;
    return `<div class="card" style="gap:14px">
      <div class="row" style="align-items:flex-end;gap:16px">
        <div class="vs-av" style="width:84px;height:84px;border-radius:42px;background:${esc(col)}55">${img(c.image_path, c.name)}</div>
        <div><div class="game" style="font-size:28px">${esc(c.name)}</div>${p.alias ? `<div class="muted">「${esc(p.alias)}」</div>` : ''}</div>
      </div>
      ${p.intro ? `<div class="pre">${esc(p.intro)}</div>` : ''}
      <div class="info-chips">${[['나이', p.age], ['생일', p.birthday], ['키', p.height], ['MBTI', p.mbti], ['테마곡', p.song], ['상징물', p.symbol]].filter(([, v]) => v).map(([l, v]) => `<span>${l} · ${esc(v)}</span>`).join('')}<span><i class="dot" style="background:${esc(col)}"></i>${esc(col)}</span></div>
      <div class="grid2"><div><div class="lab">외관</div>${kv(LOOK, p.look)}</div>
        <div class="depth" style="display:flex;flex-direction:column;gap:6px"><div class="lab">성격 — 깊이 순</div>${DEPTH.map(([k, l], i) => {
          const pct = [18, 50, 100][i]; const bg = pct === 100 ? col : `color-mix(in srgb, ${col} ${pct}%, #ffffff)`;
          return `<div style="background:${bg};color:${pct === 100 ? ink(col) : 'var(--ink)'}"><span class="game">${l}</span> · ${esc(p.depth?.[k] || '—')}</div>`; }).join('')}</div></div>
      ${(p.sliders || []).length ? `<div><div class="lab">성격 슬라이더</div>${p.sliders.map((s) => `<div class="slider-row"><div class="l">${esc(s.l)}</div><div class="track"><div class="knob" style="left:${s.v}%;background:${esc(col)}"></div></div><div>${esc(s.r)}</div></div>`).join('')}</div>` : ''}
      ${LINES.some(([k]) => p.lines?.[k]) ? `<div><div class="lab">상황별 대사</div>${LINES.filter(([k]) => p.lines?.[k]).map(([k, l]) => `<div class="line-row"><div class="muted">${l}</div><div class="say pre">“${esc(p.lines[k])}”</div></div>`).join('')}</div>` : ''}
      <div class="grid2"><div><div class="lab">좋아하는 것</div>${kv(TASTE, p.like)}</div><div><div class="lab">싫어하는 것</div>${kv(TASTE, p.dislike)}</div></div>
      <div class="grid2"><div><div class="lab">버릇 · 습관</div>${kv(HABITS, p.habits)}</div><div><div class="lab">약점 · 트라우마</div>${kv(WEAK, p.weak)}</div></div>
      ${(p.history || []).length ? `<div><div class="lab">과거사</div><div class="timeline">${p.history.map((h) => `<div><b>${esc(h.when)}</b><div class="pre">${esc(h.what)}</div></div>`).join('')}</div></div>` : ''}
    </div>`;
  };
  if (S.has('profile')) add('sec-profile', 'PROFILE', `<div class="grid2">${prof(a)}${prof(b)}</div>`);
  if (S.has('story') && data.chapters?.length) add('sec-story', 'STORY', data.chapters.map((c, i) => `<article class="card"><div class="lab">CHAPTER ${i + 1}${c.period ? ' · ' + esc(c.period) : ''}</div><h3>${esc(c.title || '')}</h3><div style="line-height:1.9">${md(c.body)}</div></article>`).join(''));
  if (S.has('ending') && d.endings?.length) add('sec-ending', 'ENDING', `<div class="gallery" style="counter-reset:none">${d.endings.map((e) => `<article class="frame ending ${e.open ? '' : 'locked'}" style="counter-increment:none"><div class="shot" style="position:relative;cursor:default;background:linear-gradient(135deg, ${esc(a.color)}55, ${esc(b.color)}55)">${img(e.image_path, e.title)}${e.open ? '' : '<span class="lockcover"><span class="game">LOCKED</span></span>'}</div><div class="row" style="gap:6px"><span class="badge">${esc(e.kind || 'ENDING')}</span><span class="game" style="font-size:17px">${esc(e.title)}</span></div>${e.open && e.text ? `<details><summary class="muted" style="cursor:pointer">읽기</summary><div class="pre" style="padding-top:6px">${esc(e.text)}</div></details>` : ''}</article>`).join('')}</div>`);
  if (S.has('au') && data.aus?.length) add('sec-au', 'ROUTE', `<div class="grid2">${data.aus.map((r) => `<article class="card"><h3>${esc(r.name)}</h3>${r.world ? `<div class="pre muted" style="font-size:14px">${esc(r.world)}</div>` : ''}<div class="kv pre"><b>${esc(a.name)}</b> · ${esc(r.a_job || '')} ${esc(r.a_note || '')}</div><div class="kv pre"><b>${esc(b.name)}</b> · ${esc(r.b_job || '')} ${esc(r.b_note || '')}</div>${r.relation ? `<div class="kv pre"><b>관계</b> · ${esc(r.relation)}</div>` : ''}</article>`).join('')}</div>`);
  if (S.has('qna') && data.qnas?.length) add('sec-qna', 'TALK', data.qnas.map((q) => `<article class="card"><h3>Q. ${esc(q.question)}</h3><div style="display:flex;flex-direction:column;gap:10px">${(q.turns || []).map((t) => { const c = t.who === 'b' ? b : a; return `<div class="bubble ${t.who === 'b' ? 'b' : 'a'}" style="background:${esc(c.color)};color:${ink(c.color)}"><b>${esc(c.name)}</b> · ${esc(t.text)}</div>`; }).join('')}</div></article>`).join(''));
  if (S.has('ssul') && data.ssuls?.length) add('sec-ssul', 'LOG', data.ssuls.map((s) => `<details class="card"><summary style="cursor:pointer"><span class="badge">${esc(s.kind)}</span> <span class="game" style="font-size:18px">${esc(s.title || '제목 없음')}</span> <span class="muted">${fmtDate(s.created_at)}</span></summary><div class="reader" style="padding:14px 0 0"><div class="body">${md(s.body)}</div></div></details>`).join(''));
  if (S.has('cg') && data.commissions?.length) add('sec-cg', 'CG', `<div class="gallery">${data.commissions.map((c) => `<figure class="frame" style="margin:0"><a class="shot" href="${esc(urls[c.image_path] || '#')}" target="_blank" rel="noopener" aria-label="${esc(c.artist || '커미션')} 원본 보기">${img(c.image_path, c.artist)}</a><figcaption class="row" style="gap:6px"><span class="game">${esc(c.artist || '작가 미상')}</span><span class="muted">${esc(c.made_on || '')}</span></figcaption></figure>`).join('')}</div>`);

  el.innerHTML = `
    <div class="topbar">
      <h1 class="logo">${esc(title)}</h1>
      ${d.name ? `<span class="muted">${esc(a.name)} × ${esc(b.name)}</span>` : ''}
      <div class="grow"></div>
      ${days ? `<span class="pill">D+${days}</span>` : ''}
      <span class="pill">${esc(pair.kind)}${pair.genre ? ' / ' + esc(pair.genre) : ''}</span>
      <span class="pill" style="background:var(--accent);color:#fff">열람 전용</span>
    </div>
    <nav class="row" aria-label="목차">${navs.map(([id, l]) => `<button type="button" class="chip" data-go="${id}">${l}</button>`).join('')}</nav>
    <section id="sec-status" class="stage" aria-label="개요">
      <div class="stage-top"><div class="hud"><div class="lab">♥ AFFECTION</div>
        <div class="r"><span>${esc(a.name)} → ${esc(b.name)}</span>${hearts(aff.ab ?? 5, a.color)}</div>
        <div class="r"><span>${esc(b.name)} → ${esc(a.name)}</span>${hearts(aff.ba ?? 5, b.color)}</div></div></div>
      <div class="stage-chars">
        <div class="st" style="background:${esc(a.color)}33">${img(a.image_path, a.name) || esc(a.name)}</div>
        <div class="st" style="background:${esc(b.color)}33">${img(b.image_path, b.name) || esc(b.name)}</div>
      </div>
      <div class="dialog" aria-live="polite"><span class="tag"></span><button type="button" class="line-btn" data-next aria-label="다음 대사"><span class="line"></span></button><div class="ctrl"><span class="arrow" aria-hidden="true">▼</span></div></div>
    </section>
    ${kw.length || d.anniversaries?.length ? `<div class="grid2">
      ${kw.length ? `<div class="card"><h3>관계 키워드</h3><div class="row" style="gap:6px">${kw.map((k) => `<span class="badge">#${esc(k)}</span>`).join('')}</div>${d.song ? `<div class="muted">테마곡 · ${esc(d.song)}</div>` : ''}</div>` : ''}
      ${d.anniversaries?.length ? `<div class="card"><h3>기념일</h3>${d.anniversaries.map((x) => `<div class="kv"><b>${esc(x.date)}</b> · ${esc(x.label)}</div>`).join('')}</div>` : ''}
    </div>` : ''}
    ${secs.join('')}
    <p class="muted" style="text-align:center">읽기 전용으로 공유된 페이지예요</p>`;

  let i = 0;
  const dlg = el.querySelector('.dialog');
  const show = () => {
    const l = script[i % script.length] || { who: 'n', text: '' };
    const c = l.who === 'a' ? a : l.who === 'b' ? b : null;
    dlg.classList.toggle('narr', !c);
    dlg.querySelector('.tag').textContent = c ? c.name : '';
    if (c) { dlg.style.setProperty('--who', c.color); dlg.style.setProperty('--who-ink', ink(c.color)); } else dlg.style.removeProperty('--who');
    dlg.querySelector('.line').textContent = c ? `“${l.text}”` : l.text;
  };
  show();
  el.querySelector('[data-next]').onclick = () => { i++; show(); };
  el.querySelectorAll('[data-go]').forEach((bt) => (bt.onclick = () => document.getElementById(bt.dataset.go)?.scrollIntoView({ behavior: 'smooth' })));
}
