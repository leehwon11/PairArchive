import { loadPair, latest, remove, removeFile, update } from '../supa.js';
import { esc, $, $$, hydrate, imgTag, dday, confirmBox, guard, ink, themeBtn, HEART, toast, openModal } from '../ui.js';
import { tabs } from './shared.js';

export default async function pairView(el, pid) {
  const ctx = await loadPair(pid);
  if (!ctx) { location.hash = '#/'; return; }
  const { pair, a, b } = ctx;
  const d = pair.detail || {};
  const [q, s, c] = await Promise.all([latest('qnas', pid), latest('ssuls', pid), latest('commissions', pid)]);
  const days = dday(pair.start_date);
  const kw = (d.keywords || '').split(',').map((x) => x.trim()).filter(Boolean);

  const polaroid = (ch, bg, tilt) => `
    <div class="who ${tilt}"><div class="polaroid"><div class="ph" style="background:${bg}">${imgTag(ch.image_path, ch.name) || '사진 없음'}</div></div>
    <div class="name">${esc(ch.name)}</div></div>`;

  const seen = (title, v = {}, col, tint) => `
    <div class="card">
      <h3>${title}</h3>
      <div class="row" style="align-items:stretch;flex-wrap:nowrap">
        <div class="grow" style="background:var(--soft);border-radius:6px;padding:10px 12px;font-size:14px"><b>첫인상</b><br><span class="pre">${esc(v.first || '—')}</span></div>
        <div style="align-self:center;color:${col};font-size:20px" aria-hidden="true">→</div>
        <div class="grow" style="background:${tint};border-radius:6px;padding:10px 12px;font-size:14px"><b>현인상</b><br><span class="pre">${esc(v.now || '—')}</span></div>
      </div>
      <div class="muted">속마음</div>
      <div class="pre" style="font-size:15px;line-height:1.8">${v.thought ? '“' + esc(v.thought) + '”' : '—'}</div>
    </div>`;

  const aff = d.affection || (d.affection = { ab: 5, ba: 5 });
  const hearts = (key, col) => `<span class="hearts" role="group" aria-label="${key === 'ab' ? esc(a.name) + '→' + esc(b.name) : esc(b.name) + '→' + esc(a.name)} 호감도 ${aff[key]}/10">${Array.from({ length: 10 }, (_, i) => `<button type="button" data-heart="${key}" data-v="${i + 1}" aria-label="${i + 1}">${HEART(i < aff[key] ? col : 'var(--sh)')}</button>`).join('')}</span>`;
  const who = { a, b };
  let script = (d.script || []).filter((x) => x.text && x.text.trim());
  if (!script.length) script = [
    { who: 'n', text: pair.summary },
    { who: 'a', text: a.profile?.line },
    { who: 'b', text: b.profile?.line },
  ].filter((x) => x.text);
  if (!script.length) script = [{ who: 'n', text: '페어 수정 → STATUS 대사 스크립트에서 나레이션과 대사를 적어보세요.' }];
  const choices = [
    q && [`#/pair/${pid}/qna`, `▸ TALK · ${q.question}`],
    s && [`#/pair/${pid}/ssul`, `▸ LOG · ${s.title || '제목 없음'}`],
    c && [`#/pair/${pid}/commission`, `▸ CG · ${c.artist || '새 커미션'}`],
  ].filter(Boolean);

  el.innerHTML = `
    <div class="topbar">
      <a class="back" href="#/">← SAVE SELECT</a>
      <h1 class="title">${esc(d.name || `${a.name} × ${b.name}`)}</h1>${d.name ? `<span class="muted">${esc(a.name)} × ${esc(b.name)}</span>` : ''}
      <div class="grow"></div>
      ${days ? `<span class="pill">PLAY TIME · D+${days}</span>` : ''}
      <span class="pill">ROUTE · ${esc(pair.kind)}${pair.genre ? ' / ' + esc(pair.genre) : ''}</span>
      ${themeBtn()}
      <button class="btn" data-act="share">공유</button>
      <a class="btn" href="#/pair/${pid}/edit">수정</a>
      <button class="btn danger" data-act="del">삭제</button>
    </div>
    ${tabs(pid, '')}
    <section class="stage" aria-label="개요">
      <div class="stage-top">
        <div class="hud">
          <div class="lab">♥ AFFECTION</div>
          <div class="r"><span>${esc(a.name)} → ${esc(b.name)}</span>${hearts('ab', a.color)}</div>
          <div class="r"><span>${esc(b.name)} → ${esc(a.name)}</span>${hearts('ba', b.color)}</div>
        </div>
        ${choices.length ? `<div class="choices">${choices.map(([h, t]) => `<a href="${h}">${esc(t)}</a>`).join('')}</div>` : ''}
      </div>
      <div class="stage-chars">
        <div class="st a" style="background:${esc(a.color)}33">${imgTag(a.image_path, a.name) || esc(a.name)}</div>
        <div class="st b" style="background:${esc(b.color)}33">${imgTag(b.image_path, b.name) || esc(b.name)}</div>
      </div>
      <div class="dialog" aria-live="polite">
        <span class="tag"></span>
        <button type="button" class="line-btn" data-act="next" aria-label="다음 대사"><span class="line"></span></button>
        <div class="ctrl">
          <button type="button" data-ctl="auto" aria-pressed="false">AUTO</button>
          <button type="button" data-ctl="skip" aria-pressed="false">SKIP</button>
          <button type="button" data-ctl="log">LOG</button>
          <span class="arrow" aria-hidden="true">▼</span>
        </div>
      </div>
    </section>
    <div class="grid2">
      ${seen(`${esc(a.name)}가 본 ${esc(b.name)}`, d.a, '#8a2f42', a.color + '55')}
      ${seen(`${esc(b.name)}가 본 ${esc(a.name)}`, d.b, '#3f6283', b.color + '55')}
    </div>
    <div class="grid2">
      <div class="card">
        <h3>관계 키워드</h3>
        <div class="row" style="gap:6px">${kw.length ? kw.map((k) => `<span class="badge" style="background:var(--pink);color:#4a2330">#${esc(k)}</span>`).join('') : '<span class="muted">페어 수정에서 추가할 수 있어요</span>'}</div>
        <div class="muted" style="padding-top:6px">페어 테마곡</div>
        <div>${esc(d.song || '—')}</div>
      </div>
      <div class="card">
        <h3>기념일</h3>
        ${days ? `<div class="row" style="align-items:baseline;gap:8px"><div class="hand" style="font-size:42px;color:var(--wine)">D+${days}</div><div class="muted">${esc(pair.start_date)}부터</div></div>` : '<div class="muted">페어 시작일을 넣으면 D+가 자동으로 세어져요</div>'}
        ${(d.anniversaries || []).map((x) => `<div class="kv"><b>${esc(x.date)}</b> · ${esc(x.label)}</div>`).join('')}
      </div>
    </div>
    <div class="card" style="flex-direction:row;align-items:center;gap:20px;flex-wrap:wrap">
      <div><h3>최근 기록</h3><div class="muted">자동으로 모아져요</div></div>
      <div style="display:flex;flex-direction:column;gap:6px;font-size:14px" class="grow">
        <a href="#/pair/${pid}/qna"><span style="color:var(--wine)">문답</span> · <span style="color:var(--ink)">${esc(q?.question || '아직 없음')}</span></a>
        <a href="#/pair/${pid}/ssul"><span style="color:#3f6283">썰</span> · <span style="color:var(--ink)">${esc(s?.title || '아직 없음')}</span></a>
        <a href="#/pair/${pid}/commission"><span style="color:#5a4a42">커미션</span> · <span style="color:var(--ink)">${esc(c ? (c.artist || '작가 미상') + ' · ' + (c.made_on || '') : '아직 없음')}</span></a>
      </div>
    </div>
    `;

  hydrate(el);
  $(el, '[data-act=share]').onclick = async () => (await import('./sharelinks.js')).openShare(pid);
  // ── 대화창: 나레이션 → A → B … 게임처럼 ──
  const dlg = $(el, '.dialog'), lineEl = $(dlg, '.line'), tagEl = $(dlg, '.tag');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let idx = 0, typing = null, timer = null, auto = false, skip = false, full = '';
  const alive = () => dlg.isConnected;
  const stopAll = () => { clearInterval(typing); clearTimeout(timer); typing = null; };
  function finish() {
    clearInterval(typing); typing = null; lineEl.textContent = full;
    if (!alive()) return;
    if (skip) timer = setTimeout(next, 450);
    else if (auto) timer = setTimeout(next, 1600 + full.length * 35);
  }
  function show() {
    stopAll();
    const l = script[idx % script.length];
    const narr = l.who === 'n' || !who[l.who];
    dlg.classList.toggle('narr', narr);
    if (narr) { dlg.style.removeProperty('--who'); tagEl.textContent = ''; full = l.text; }
    else { const c = who[l.who]; dlg.style.setProperty('--who', c.color); dlg.style.setProperty('--who-ink', ink(c.color)); tagEl.textContent = c.name; full = '“' + l.text + '”'; }
    if (still || skip) { finish(); return; }
    let n = 0; lineEl.textContent = '';
    typing = setInterval(() => { if (!alive()) return stopAll(); n++; lineEl.textContent = full.slice(0, n); if (n >= full.length) finish(); }, 32);
  }
  function next() { if (!alive()) return stopAll(); idx++; show(); }
  show();
  $(el, '[data-act=next]').onclick = () => (typing ? finish() : next());
  const setBtn = (k, on) => $(dlg, `[data-ctl=${k}]`).setAttribute('aria-pressed', String(on));
  $(dlg, '[data-ctl=auto]').onclick = () => { auto = !auto; skip = false; setBtn('auto', auto); setBtn('skip', false); if (auto && !typing) { clearTimeout(timer); timer = setTimeout(next, 900); } };
  $(dlg, '[data-ctl=skip]').onclick = () => { skip = !skip; auto = false; setBtn('skip', skip); setBtn('auto', false); if (skip) { if (typing) finish(); else { clearTimeout(timer); timer = setTimeout(next, 300); } } };
  $(dlg, '[data-ctl=log]').onclick = () => {
    const m = openModal(`<h2>LOG</h2><div style="display:flex;flex-direction:column;gap:10px">${script.map((l) => {
      const c = who[l.who];
      return c ? `<div><span class="badge" style="background:${esc(c.color)};color:${ink(c.color)}">${esc(c.name)}</span><div style="padding:4px 2px">“${esc(l.text)}”</div></div>`
               : `<div class="muted" style="font-size:15px;padding:2px">${esc(l.text)}</div>`;
    }).join('')}</div><div class="row" style="justify-content:flex-end"><button class="btn primary" data-x>닫기</button></div>`);
    m.el.querySelector('[data-x]').onclick = m.close;
  };
  $$(el, '[data-heart]').forEach((btn) => (btn.onclick = async () => {
    const k = btn.dataset.heart, v = +btn.dataset.v;
    aff[k] = aff[k] === v ? v - 1 : v;
    pair.detail = d;
    await guard(() => update('pairs', pid, { detail: d }));
    const col = k === 'ab' ? a.color : b.color;
    $$(el, `[data-heart="${k}"]`).forEach((x) => (x.innerHTML = HEART(+x.dataset.v <= aff[k] ? col : 'var(--sh)')));
    { const g = btn.closest('.hearts'); g.setAttribute('aria-label', g.getAttribute('aria-label').replace(/\d+\/10$/, aff[k] + '/10')); }
  }));

  $(el, '[data-act=del]').onclick = async () => {
    if (!(await confirmBox('페어 삭제', `${a.name} × ${b.name} 페어와 두 캐릭터 프로필, 문답·썰·커미션이 모두 지워져요.`))) return;
    const ok = await guard(async () => {
      await remove('pairs', pid);
      for (const ch of [a, b]) if (ch.id) { await removeFile(ch.image_path); await remove('characters', ch.id); }
      return true;
    }, '페어를 삭제했어요');
    if (ok) location.hash = '#/';
  };
}
