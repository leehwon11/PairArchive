import { loadPair, list, insert, update, remove } from '../supa.js';
import { esc, $, $$, iconBtn, openModal, field, readForm, confirmBox, guard, md } from '../ui.js';
import { tabs, subHeader } from './shared.js';

export default async function story(el, pid) {
  const ctx = await loadPair(pid);
  if (!ctx) { location.hash = '#/'; return; }
  let rows = await list('chapters', { pair_id: pid }, 'sort', true);

  const draw = () => {
    el.innerHTML = `
      ${subHeader({ pid, a: ctx.a, b: ctx.b, title: 'STORY — 챕터', action: '<button class="btn primary" data-act="add">+ 챕터 추가</button>' })}
      ${tabs(pid, 'story')}
      ${rows.length ? `<div class="chapter-line">${rows.map((r, i) => `
        <article class="card">
          <span class="pin" style="background:${i === rows.length - 1 ? 'var(--wine)' : i % 2 ? ctx.b.color : ctx.a.color}"></span>
          <div class="row" style="gap:8px">
            <span class="badge">${i + 1}장</span>
            <h3 class="grow">${esc(r.title || '제목 없음')}</h3>
            <span class="muted">${esc(r.period)}</span>
            ${iconBtn('up', '위로', 'upArrow', '', `data-i="${i}"`)}
            ${iconBtn('down', '아래로', 'downArrow', '', `data-i="${i}"`)}
            ${iconBtn('edit', '챕터 수정', 'edit', '', `data-i="${i}"`)}
            ${iconBtn('del', '챕터 삭제', 'del', 'del', `data-i="${i}"`)}
          </div>
          <div style="font-size:15px;line-height:1.9">${md(r.body)}</div>
        </article>`).join('')}</div>`
        : `<div class="empty"><span class="hand">아직 서사가 없어요</span>첫만남부터 챕터로 하나씩 쌓아보세요.</div>`}`;

    $(el, '[data-act=add]').onclick = () => edit();
    $$(el, '[data-act=edit]').forEach((b) => (b.onclick = () => edit(rows[+b.dataset.i])));
    $$(el, '[data-act=del]').forEach((b) => (b.onclick = async () => {
      const r = rows[+b.dataset.i];
      if (!(await confirmBox('챕터 삭제', `“${r.title || '제목 없음'}” 챕터를 지울까요?`))) return;
      await guard(async () => { await remove('chapters', r.id); rows = rows.filter((x) => x !== r); draw(); }, '삭제했어요');
    }));
    $$(el, '[data-act=up],[data-act=down]').forEach((b) => (b.onclick = () => move(+b.dataset.i, b.dataset.act === 'up' ? -1 : 1)));
  };

  async function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    [rows[i], rows[j]] = [rows[j], rows[i]];
    draw();
    await guard(() => Promise.all(rows.map((r, k) => (r.sort !== k ? update('chapters', r.id, { sort: (r.sort = k) }) : null))));
  }

  function edit(r) {
    const m = openModal(`
      <h2>${r ? '챕터 수정' : '새 챕터'}</h2>
      <form style="display:flex;flex-direction:column;gap:12px">
        <div class="grid2">${field('제목', 'title', r?.title)}${field('시기', 'period', r?.period, { ph: '예: 17살 봄' })}</div>
        ${field('내용', 'body', r?.body, { area: true, rows: 12, ph: '**굵게** *기울임* > 인용 --- 구분선' })}
        <div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-x>취소</button><button class="btn primary">저장</button></div>
      </form>`, { wide: true });
    m.el.querySelector('[data-x]').onclick = m.close;
    m.el.querySelector('form').onsubmit = async (e) => {
      e.preventDefault();
      const f = readForm(e.target);
      const saved = await guard(() => (r ? update('chapters', r.id, f) : insert('chapters', { ...f, pair_id: pid, sort: rows.length })), '저장했어요');
      if (!saved) return;
      if (r) Object.assign(r, saved); else rows.push(saved);
      m.close(); draw();
    };
  }
  draw();
}
