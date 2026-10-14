import { loadPair, list, insert, update, remove, ai } from '../supa.js';
import { esc, $, $$, iconBtn, openModal, field, readForm, confirmBox, guard, md, fmtDate } from '../ui.js';
import { tabs, subHeader, aiContext } from './shared.js';

const KINDS = ['본편', 'AU', 'IF'];

export default async function ssul(el, pid) {
  const ctx = await loadPair(pid);
  if (!ctx) { location.hash = '#/'; return; }
  let rows = await list('ssuls', { pair_id: pid });
  let kind = '전체', q = '', open = rows[0]?.id || null;

  const shown = () => rows.filter((r) => (kind === '전체' || r.kind === kind)
    && (!q || (r.title + ' ' + r.tags + ' ' + r.body).toLowerCase().includes(q.toLowerCase())));

  const draw = (keepFocus) => {
    const list_ = shown();
    const cur = rows.find((r) => r.id === open) || list_[0];
    el.innerHTML = `
      ${subHeader({ pid, a: ctx.a, b: ctx.b, title: 'LOG — 썰', action: '<button class="btn" data-act="event">EVENT 뽑기</button><button class="btn primary" data-act="add">+ 썰 쓰기</button>' })}
      ${tabs(pid, 'ssul')}
      <div class="row">
        <label for="sq" class="muted">검색</label>
        <input id="sq" class="input" type="search" value="${esc(q)}" placeholder="제목 · 태그 · 본문" style="width:260px;max-width:100%;border-radius:20px">
        ${['전체', ...KINDS].map((k) => `<button class="chip ${kind === k ? 'on' : ''}" data-k="${k}" aria-pressed="${kind === k}">${k}</button>`).join('')}
      </div>
      ${rows.length ? `<div class="ssul-layout">
        <div style="display:flex;flex-direction:column;gap:12px">
          ${list_.length ? list_.map((r) => `
            <article class="card" style="gap:6px;${cur?.id === r.id ? 'outline:2px solid var(--pink)' : ''}">
              <div class="row" style="flex-wrap:nowrap"><span class="badge">${esc(r.kind)}</span>
                <button class="hand grow" data-open="${r.id}" style="border:none;background:none;text-align:left;font-size:22px;padding:0;color:var(--ink)">${esc(r.title || '제목 없음')}</button>
                ${iconBtn('edit', '썰 수정', 'edit', '', `data-id="${r.id}"`)}${iconBtn('del', '썰 삭제', 'del', 'del', `data-id="${r.id}"`)}</div>
              <div style="font-size:14px;color:var(--ink2);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(r.body)}</div>
              <div class="muted">${fmtDate(r.created_at)}${r.tags ? ' · ' + r.tags.split(',').map((t) => '#' + esc(t.trim())).join(' ') : ''}</div>
            </article>`).join('') : '<div class="empty">검색 결과가 없어요</div>'}
        </div>
        ${cur ? `<article class="card reader">
          <div class="muted">${fmtDate(cur.created_at)} · ${esc(cur.kind)}</div>
          <h2 class="hand" style="font-size:32px;margin:0">${esc(cur.title || '제목 없음')}</h2>
          <div class="dashline"></div>
          <div class="body">${md(cur.body)}</div>
        </article>` : ''}
      </div>` : `<div class="empty"><span class="hand">아직 썰이 없어요</span>“썰 쓰기”로 첫 썰을 풀어보세요.</div>`}`;

    const sq = $(el, '#sq');
    sq.oninput = () => { q = sq.value; draw(true); };
    if (keepFocus) { sq.focus(); sq.setSelectionRange(q.length, q.length); }
    $$(el, '[data-k]').forEach((b) => (b.onclick = () => { kind = b.dataset.k; draw(); }));
    $$(el, '[data-open]').forEach((b) => (b.onclick = () => { open = b.dataset.open; draw(); if (innerWidth < 820) $(el, '.reader')?.scrollIntoView({ behavior: 'smooth' }); }));
    $(el, '[data-act=add]').onclick = () => edit();
    $(el, '[data-act=event]').onclick = () => drawEvent();
    $$(el, '[data-act=edit]').forEach((b) => (b.onclick = () => edit(rows.find((r) => r.id === b.dataset.id))));
    $$(el, '[data-act=del]').forEach((b) => (b.onclick = async () => {
      const r = rows.find((x) => x.id === b.dataset.id);
      if (!(await confirmBox('썰 삭제', `“${r.title || '제목 없음'}” 썰을 지울까요?`))) return;
      await guard(async () => { await remove('ssuls', r.id); rows = rows.filter((x) => x !== r); draw(); }, '삭제했어요');
    }));
  };

  async function drawEvent() {
    const m = openModal('<h2>EVENT 뽑기</h2><div class="empty"><span class="spin">✿</span> 이 페어에 일어날 일을 고르는 중…</div>');
    let items = [];
    try { items = (await ai('event', aiContext(ctx, { existingTitles: rows.slice(0, 30).map((r) => r.title) }))).filter((x) => x && x.title); }
    catch (e) { m.el.innerHTML = `<h2>EVENT 뽑기</h2><p>뽑지 못했어요: ${esc(e.message)}</p><div class="row" style="justify-content:flex-end"><button class="btn" data-x>닫기</button></div>`; m.el.querySelector('[data-x]').onclick = m.close; return; }
    m.el.innerHTML = `<h2>EVENT 뽑기</h2><p class="muted" style="margin:0">마음에 드는 이벤트를 고르면 그 상황으로 새 썰이 시작돼요.</p>
      <div style="display:flex;flex-direction:column;gap:10px">${items.map((x, i) => `<button type="button" class="card" data-pick="${i}" style="text-align:left;border:2px solid var(--sh);cursor:pointer"><span class="lab">EVENT ${i + 1}</span><span class="game" style="font-size:19px">${esc(x.title)}</span><span class="pre" style="font-size:14px;color:var(--ink2)">${esc(x.setup || '')}</span></button>`).join('')}</div>
      <div class="row" style="justify-content:flex-end"><button class="btn" data-again>다시 뽑기</button><button class="btn" data-x>닫기</button></div>`;
    m.el.querySelector('[data-x]').onclick = m.close;
    m.el.querySelector('[data-again]').onclick = () => { m.close(); drawEvent(); };
    m.el.querySelectorAll('[data-pick]').forEach((b) => (b.onclick = () => {
      const x = items[+b.dataset.pick]; m.close();
      edit(null, { title: x.title, kind: 'IF', tags: '이벤트', body: `> ${x.setup || x.title}\n\n` });
    }));
  }

  function edit(r, preset = {}) {
    const v = r || preset;
    const m = openModal(`
      <h2>${r ? '썰 수정' : '새 썰'}</h2>
      <form style="display:flex;flex-direction:column;gap:12px">
        ${field('제목', 'title', v.title)}
        <div class="grid2">
          <div class="field"><label for="sk">분류</label><select id="sk" name="kind">${KINDS.map((k) => `<option ${v.kind === k ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
          ${field('태그 (쉼표로 구분)', 'tags', v.tags)}
        </div>
        ${field('본문', 'body', v.body, { area: true, rows: 16, ph: '**굵게** *기울임* ~~취소선~~ > 인용 --- 구분선' })}
        <div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-x>취소</button><button class="btn primary">저장</button></div>
      </form>`, { wide: true });
    m.el.querySelector('[data-x]').onclick = m.close;
    m.el.querySelector('form').onsubmit = async (e) => {
      e.preventDefault();
      const f = readForm(e.target);
      const saved = await guard(() => (r ? update('ssuls', r.id, f) : insert('ssuls', { ...f, pair_id: pid })), '저장했어요');
      if (!saved) return;
      if (r) Object.assign(r, saved); else rows.unshift(saved);
      open = saved.id; m.close(); draw();
    };
  }
  draw();
}
