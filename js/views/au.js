import { loadPair, list, insert, update, remove, ai } from '../supa.js';
import { esc, $, $$, iconBtn, openModal, field, readForm, confirmBox, guard, toast } from '../ui.js';
import { tabs, subHeader, aiContext } from './shared.js';

export default async function au(el, pid) {
  const ctx = await loadPair(pid);
  if (!ctx) { location.hash = '#/'; return; }
  const { a, b } = ctx;
  let rows = await list('aus', { pair_id: pid }, 'created_at', true);
  let recs = [];
  let loading = false;

  const draw = () => {
    el.innerHTML = `
      ${subHeader({ pid, a, b, title: 'ROUTE — 다른 세계선', action: '<button class="btn primary" data-act="add">+ AU 추가</button>' })}
      ${tabs(pid, 'au')}
      <section class="card" style="border:2px dashed #e2a9b4">
        <div class="row">
          <div class="grow"><h3>AI AU 추천</h3><div class="muted">두 캐릭터 성격 · 관계를 보고 어울리는 AU를 골라줘요</div></div>
          <button class="btn dark" data-act="ai" ${loading ? 'disabled' : ''}>${loading ? '<span class="spin">✿</span> 생각 중' : '추천받기'}</button>
        </div>
        ${recs.length ? `<div class="grid3">${recs.map((r, i) => `
          <div style="background:var(--paper);border-radius:8px;padding:12px 14px;display:flex;flex-direction:column;gap:6px">
            <div class="hand" style="font-size:21px">${esc(r.name)}</div>
            <div style="font-size:13px;line-height:1.6">${esc(r.reason)}</div>
            <button class="btn" data-save="${i}" style="align-self:flex-start;min-height:34px;padding:4px 12px">+ AU로 저장</button>
          </div>`).join('')}</div>` : ''}
      </section>
      ${rows.length ? `<div class="grid2">${rows.map((r, i) => `
        <article class="card">
          <div class="row"><h3 class="grow">${esc(r.name)}</h3>${iconBtn('edit', 'AU 수정', 'edit', '', `data-i="${i}"`)}${iconBtn('del', 'AU 삭제', 'del', 'del', `data-i="${i}"`)}</div>
          ${r.world ? `<div class="pre" style="color:var(--ink2)">${esc(r.world)}</div>` : ''}
          <div class="grid2" style="gap:12px">
            <div style="background:#fdf6f5;border-radius:8px;padding:12px 14px;font-size:14px;line-height:1.8"><b style="color:var(--wine)">${esc(a.name)}</b><br>직업 · ${esc(r.a_job || '—')}<br><span class="pre">${esc(r.a_note)}</span></div>
            <div style="background:#f3f8fb;border-radius:8px;padding:12px 14px;font-size:14px;line-height:1.8"><b style="color:#2f4a63">${esc(b.name)}</b><br>직업 · ${esc(r.b_job || '—')}<br><span class="pre">${esc(r.b_note)}</span></div>
          </div>
          ${r.relation ? `<div class="kv pre"><b style="color:var(--mute)">둘의 관계</b> · ${esc(r.relation)}</div>` : ''}
          <a href="#/pair/${pid}/ssul" class="muted" style="border-top:1.5px dashed var(--line);padding-top:8px">이 AU 썰 보러 가기</a>
        </article>`).join('')}</div>`
        : `<div class="empty"><span class="hand">아직 AU가 없어요</span>직접 추가하거나 AI 추천을 받아보세요.</div>`}`;

    $(el, '[data-act=add]').onclick = () => edit();
    $(el, '[data-act=ai]').onclick = recommend;
    $$(el, '[data-save]').forEach((btn) => (btn.onclick = async () => {
      const r = recs[+btn.dataset.save];
      const saved = await guard(() => insert('aus', { pair_id: pid, name: r.name, world: r.world || r.reason }), 'AU로 저장했어요');
      if (saved) { rows.push(saved); recs.splice(+btn.dataset.save, 1); draw(); }
    }));
    $$(el, '[data-act=edit]').forEach((btn) => (btn.onclick = () => edit(rows[+btn.dataset.i])));
    $$(el, '[data-act=del]').forEach((btn) => (btn.onclick = async () => {
      const r = rows[+btn.dataset.i];
      if (!(await confirmBox('AU 삭제', `“${r.name}” AU를 지울까요?`))) return;
      await guard(async () => { await remove('aus', r.id); rows = rows.filter((x) => x !== r); draw(); }, '삭제했어요');
    }));
  };

  async function recommend() {
    loading = true; draw();
    try {
      recs = (await ai('au', aiContext(ctx, { existingAUs: rows.map((r) => r.name) }))).filter((x) => x && x.name);
      if (!recs.length) toast('추천이 비어 있어요. 다시 눌러보세요');
    } catch (e) { toast('AI 추천 실패: ' + e.message); }
    loading = false; draw();
  }

  function edit(r) {
    const m = openModal(`
      <h2>${r ? 'AU 수정' : '새 AU'}</h2>
      <form style="display:flex;flex-direction:column;gap:12px">
        ${field('AU 이름', 'name', r?.name, { ph: '현대 AU, 학원 AU…' })}
        ${field('세계관 한 줄', 'world', r?.world, { area: true, rows: 2 })}
        <div class="grid2">${field(`${a.name} 직업`, 'a_job', r?.a_job)}${field(`${b.name} 직업`, 'b_job', r?.b_job)}</div>
        <div class="grid2">${field(`${a.name} 설정`, 'a_note', r?.a_note, { area: true })}${field(`${b.name} 설정`, 'b_note', r?.b_note, { area: true })}</div>
        ${field('둘의 관계', 'relation', r?.relation, { area: true, rows: 2 })}
        <div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-x>취소</button><button class="btn primary">저장</button></div>
      </form>`, { wide: true });
    m.el.querySelector('[data-x]').onclick = m.close;
    m.el.querySelector('form').onsubmit = async (e) => {
      e.preventDefault();
      const f = readForm(e.target);
      const saved = await guard(() => (r ? update('aus', r.id, f) : insert('aus', { ...f, pair_id: pid })), '저장했어요');
      if (!saved) return;
      if (r) Object.assign(r, saved); else rows.push(saved);
      m.close(); draw();
    };
  }
  draw();
}
