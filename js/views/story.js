import { loadPair, list, insert, update, remove } from '../supa.js';
import { esc, $, iconBtn, openModal, field, readForm, confirmBox, guard, md, enableDragSort, moodChart } from '../ui.js';
import { tabs, subHeader } from './shared.js';

export default async function story(el, pid) {
  const ctx = await loadPair(pid);
  if (!ctx) { location.hash = '#/'; return; }
  const { pair, a, b } = ctx;
  const d = pair.detail || (pair.detail = {});
  d.chapterMoods ||= {};
  let rows = await list('chapters', { pair_id: pid }, 'sort', true);
  const savePair = () => update('pairs', pid, { detail: d });

  const moodData = () => rows.map((r) => ({ mood: d.chapterMoods[r.id] || 0 })).filter((m) => m.mood > 0);
  const moodLabels = () => rows.map((r, i) => `${i + 1}장`).filter((_, i) => (d.chapterMoods[rows[i]?.id] || 0) > 0);

  const draw = () => {
    const moods = moodData();
    el.innerHTML = `
      ${subHeader({ pid, a, b, title: 'STORY — 챕터', action: '<button class=”btn primary” data-act=”add”>+ 챕터 추가</button>' })}
      ${tabs(pid, 'story')}
      ${moods.length >= 2 ? `<div class=”card”><div class=”row”><h3 class=”grow”>관계 온도 흐름</h3><span class=”muted”>챕터별 관계 온도를 한눈에</span></div><div class=”mood-chart” style=”overflow-x:auto”>${moodChart(moods, a.color, b.color, 600, 140, moodLabels())}</div></div>` : ''}
      ${rows.length ? `<div class=”chapter-line” id=”ch-list”>${rows.map((r, i) => {
        const mv = d.chapterMoods[r.id];
        return `
        <article class=”card drag-item” draggable=”true” data-idx=”${i}”>
          <span class=”pin” style=”background:${i === rows.length - 1 ? 'var(--wine)' : i % 2 ? b.color : a.color}”></span>
          <div class=”row” style=”gap:8px”>
            <span class=”drag-handle” aria-label=”드래그하여 순서 변경” title=”끌어서 순서 변경”>⠿</span>
            <span class=”badge”>${i + 1}장</span>
            <h3 class=”grow”>${esc(r.title || '제목 없음')}</h3>
            ${mv ? `<span class=”badge” style=”background:${moodColor(mv)};color:#fff” title=”관계 온도 ${mv}/10”>♥ ${mv}</span>` : ''}
            <span class=”muted”>${esc(r.period)}</span>
            ${iconBtn('edit', '챕터 수정', 'edit', '', `data-i=”${i}”`)}
            ${iconBtn('del', '챕터 삭제', 'del', 'del', `data-i=”${i}”`)}
          </div>
          <div style=”font-size:15px;line-height:1.9”>${md(r.body)}</div>
        </article>`;
      }).join('')}</div>`
        : `<div class=”empty”><span class=”hand”>아직 서사가 없어요</span>첫만남부터 챕터로 하나씩 쌓아보세요.</div>`}`;

    const chList = $(el, '#ch-list');
    if (chList) enableDragSort(chList, '.drag-item', async (order) => {
      rows = order.map((i) => rows[i]);
      draw();
      await guard(() => Promise.all(rows.map((r, k) => (r.sort !== k ? update('chapters', r.id, { sort: (r.sort = k) }) : null))));
    });
  };

  el.addEventListener('click', (e) => {
    const add = e.target.closest('[data-act=add]');
    if (add) { edit(); return; }
    const ed = e.target.closest('[data-act=edit]');
    if (ed) { edit(rows[+ed.dataset.i]); return; }
    const del = e.target.closest('[data-act=del]');
    if (del) {
      const r = rows[+del.dataset.i];
      confirmBox('챕터 삭제', `”${r.title || '제목 없음'}” 챕터를 지울까요?`).then(async (ok) => {
        if (!ok) return;
        await guard(async () => {
          await remove('chapters', r.id);
          delete d.chapterMoods[r.id];
          await savePair();
          rows = rows.filter((x) => x !== r);
          draw();
        }, '삭제했어요');
      });
    }
  });

  function edit(r) {
    const curMood = r ? (d.chapterMoods[r.id] || 5) : 5;
    const m = openModal(`
      <h2>${r ? '챕터 수정' : '새 챕터'}</h2>
      <form style=”display:flex;flex-direction:column;gap:12px”>
        <div class=”grid2”>${field('제목', 'title', r?.title)}${field('시기', 'period', r?.period, { ph: '예: 17살 봄' })}</div>
        ${field('내용', 'body', r?.body, { area: true, rows: 12, ph: '**굵게** *기울임* > 인용 --- 구분선' })}
        <div class=”field”><label for=”ch-mood”>관계 온도 (1~10)</label>
          <div class=”muted” style=”margin-bottom:4px”>이 챕터 시점의 두 사람 관계 온도</div>
          <div class=”row” style=”flex-wrap:nowrap;gap:12px”>
            <input id=”ch-mood” type=”range” name=”mood” min=”1” max=”10” value=”${curMood}” style=”flex:1;accent-color:var(--accent)”>
            <span class=”game” id=”ch-mood-num” style=”font-size:24px;width:36px;text-align:center”>${curMood}</span>
          </div>
        </div>
        <div class=”row” style=”justify-content:flex-end”><button type=”button” class=”btn” data-x>취소</button><button class=”btn primary”>저장</button></div>
      </form>`, { wide: true });
    const numEl = m.el.querySelector('#ch-mood-num');
    m.el.querySelector('#ch-mood').oninput = (e) => { numEl.textContent = e.target.value; };
    m.el.querySelector('[data-x]').onclick = m.close;
    m.el.querySelector('form').onsubmit = async (e) => {
      e.preventDefault();
      const f = readForm(e.target);
      const mood = +f.mood;
      delete f.mood;
      const saved = await guard(async () => {
        const ch = r ? await update('chapters', r.id, f) : await insert('chapters', { ...f, pair_id: pid, sort: rows.length });
        d.chapterMoods[ch.id] = mood;
        await savePair();
        return ch;
      }, '저장했어요');
      if (!saved) return;
      if (r) Object.assign(r, saved); else rows.push(saved);
      m.close(); draw();
    };
  }
  draw();
}

function moodColor(v) {
  if (v <= 3) return '#6b7280';
  if (v <= 5) return '#d97706';
  if (v <= 7) return '#059669';
  return '#e0607e';
}
