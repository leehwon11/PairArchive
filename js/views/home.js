import { sb, list, listIn, remove, removeFile } from '../supa.js';
import { esc, $, $$, iconBtn, hydrate, imgTag, confirmBox, guard, dday, themeBtn } from '../ui.js';
import { SITE_NAME } from '../config.js';

let filter = '전체';
let sort = localStorage.getItem('xd-sort') || 'new';
const SORTS = [['new', '최신순'], ['name', '가나다순'], ['dday', 'D-day순']];

export default async function home(el) {
  const pairs = await list('pairs');
  const ids = pairs.flatMap((p) => [p.char_a, p.char_b]).filter(Boolean);
  const chars = Object.fromEntries((await listIn('characters', 'id', ids)).map((c) => [c.id, c]));

  const draw = () => {
    const nameOf = (p) => p.detail?.name || `${chars[p.char_a]?.name || ''} × ${chars[p.char_b]?.name || ''}`;
    const shown = pairs.filter((p) => filter === '전체' || p.kind === filter);
    if (sort === 'name') shown.sort((x, y) => nameOf(x).localeCompare(nameOf(y), 'ko', { numeric: true }));
    else if (sort === 'dday') shown.sort((x, y) => (x.start_date ? 0 : 1) - (y.start_date ? 0 : 1) || String(x.start_date || '').localeCompare(String(y.start_date || '')));
    el.innerHTML = `
      <div class="topbar">
        <h1 class="logo">${esc(SITE_NAME)}</h1>
        <span class="game muted" style="font-size:15px">— SAVE SELECT</span>
        <div class="grow"></div>
        ${themeBtn()}
        <button class="btn" data-act="logout">로그아웃</button>
      </div>
      <div class="row">
        ${['전체', '드림', '자컾', '자관'].map((k) => `<button class="chip ${filter === k ? 'on' : ''}" data-filter="${k}" aria-pressed="${filter === k}">${k === '전체' ? 'ALL' : k}</button>`).join('')}
        <span class="grow"></span>
        <label for="srt" class="lab">SORT</label>
        <select id="srt" class="input" style="width:auto;min-height:40px;padding:6px 12px">${SORTS.map(([k, l]) => `<option value="${k}" ${sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      </div>
      <div class="slots">
        ${shown.map((p) => card(p, chars[p.char_a] || {}, chars[p.char_b] || {}, pairs.indexOf(p) + 1)).join('')}
        <a class="newgame" href="#/pair/new"><b>+</b><span>NEW GAME</span><small class="muted">새 페어 만들기</small></a>
      </div>`;
    hydrate(el);

    $$(el, '[data-filter]').forEach((b) => (b.onclick = () => { filter = b.dataset.filter; draw(); }));
    $(el, '#srt').onchange = (e) => { sort = e.target.value; localStorage.setItem('xd-sort', sort); draw(); };
    $(el, '[data-act=logout]').onclick = () => sb.auth.signOut();
    $$(el, '[data-act=edit]').forEach((b) => (b.onclick = () => (location.hash = `#/pair/${b.dataset.id}/edit`)));
    $$(el, '[data-act=del]').forEach((b) => (b.onclick = async () => {
      const p = pairs.find((x) => x.id === b.dataset.id);
      const a = chars[p.char_a] || {}, c = chars[p.char_b] || {};
      if (!(await confirmBox('페어 삭제', `${a.name || 'A'} × ${c.name || 'B'} 페어와 두 캐릭터 프로필, 문답·썰·커미션이 모두 지워져요.`))) return;
      await guard(async () => {
        await remove('pairs', p.id);
        for (const ch of [a, c]) if (ch.id) { await removeFile(ch.image_path); await remove('characters', ch.id); }
        pairs.splice(pairs.indexOf(p), 1);
        draw();
      }, '페어를 삭제했어요');
    }));
  };
  draw();
}

function card(p, a, b, n) {
  const days = dday(p.start_date);
  const ca = a.color || '#e0607e', cb = b.color || '#4f7fd6';
  const stand = (c, col) => `<span class="stand" style="background:${esc(col)}55">${imgTag(c.image_path, c.name)}</span>`;
  return `
    <article class="slot">
      <a href="#/pair/${p.id}" class="thumb" style="background:linear-gradient(90deg, ${esc(ca)}33 0 50%, ${esc(cb)}33 50% 100%)" aria-label="${esc(a.name)} × ${esc(b.name)} 열기">
        <span class="no">SAVE ${String(n).padStart(2, '0')}</span>${stand(a, ca)}${stand(b, cb)}
      </a>
      <a class="nm" href="#/pair/${p.id}">${esc(p.detail?.name || `${a.name || 'A'} × ${b.name || 'B'}`)}</a>${p.detail?.name ? `<span class="muted" style="margin-top:-8px">${esc(a.name)} × ${esc(b.name)}</span>` : ''}
      <div class="foot">
        <span class="badge">${esc(p.kind)}</span>
        ${p.kind === '드림' && p.genre ? `<span class="badge">${esc(p.genre)}</span>` : ''}
        ${days ? `<span class="badge">D+${days}</span>` : ''}
        <span class="grow"></span>
        ${iconBtn('edit', '페어 수정', 'edit', '', `data-id="${p.id}"`)}
        ${iconBtn('del', '페어 삭제', 'del', 'del', `data-id="${p.id}"`)}
      </div>
    </article>`;
}
