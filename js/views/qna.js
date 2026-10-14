import { loadPair, list, insert, update, remove, ai } from '../supa.js';
import { esc, $, $$, iconBtn, confirmBox, guard, toast, ink, fmtDate, ICON } from '../ui.js';
import { tabs, subHeader, aiContext } from './shared.js';

export default async function qna(el, pid) {
  const ctx = await loadPair(pid);
  if (!ctx) { location.hash = '#/'; return; }
  const { a, b } = ctx;
  const C = { a: { bg: a.color, fg: ink(a.color), name: a.name }, b: { bg: b.color, fg: ink(b.color), name: b.name } };
  let rows = await list('qnas', { pair_id: pid });
  let editing = null; // null = 새 문답
  let draft = { question: '', turns: [{ who: 'a', text: '' }, { who: 'b', text: '' }] };
  let sugg = [], loading = false;

  const bubble = (t) => `<div class="bubble ${t.who}" style="background:${C[t.who].bg};color:${C[t.who].fg}"><b>${esc(C[t.who].name)}</b> · ${esc(t.text)}</div>`;

  const turnRows = () => draft.turns.map((t, i) => `
    <div class="row" style="align-items:flex-start;flex-wrap:nowrap;gap:8px">
      <button type="button" class="btn" data-who="${i}" aria-label="말하는 캐릭터 바꾸기" style="background:${C[t.who].bg};color:${C[t.who].fg};border-color:${C[t.who].bg};flex-shrink:0;min-width:64px">${esc(C[t.who].name)}</button>
      <textarea class="input" rows="2" data-turn="${i}" aria-label="${i + 1}번째 대사" style="flex:1;resize:vertical">${esc(t.text)}</textarea>
      <button type="button" class="icon-btn del" data-tx="${i}" aria-label="대사 삭제">${ICON.x}</button>
    </div>`).join('');

  const draw = () => {
    el.innerHTML = `
      ${subHeader({ pid, a, b, title: 'TALK — 문답', action: '<button class="btn primary" data-act="new">+ 문답 추가</button>' })}
      ${tabs(pid, 'qna')}
      <div class="qna-layout">
        <div style="display:flex;flex-direction:column;gap:20px">
          ${rows.length ? rows.map((r, i) => `
            <article class="card" style="gap:14px">
              <div class="row"><h3 class="grow">Q. ${esc(r.question)}</h3>${iconBtn('edit', '문답 수정', 'edit', '', `data-i="${i}"`)}${iconBtn('del', '문답 삭제', 'del', 'del', `data-i="${i}"`)}</div>
              <div style="display:flex;flex-direction:column;gap:10px">${(r.turns || []).map(bubble).join('')}</div>
              <div class="muted" style="text-align:right">${fmtDate(r.created_at)}</div>
            </article>`).join('') : `<div class="empty"><span class="hand">아직 문답이 없어요</span>오른쪽에서 첫 질문을 던져보세요.</div>`}
        </div>
        <form class="card editor-panel" id="ed" style="gap:14px">
          <h3>${editing ? '문답 수정' : '새 문답 쓰기'}</h3>
          <div class="field"><label for="qq">질문</label><input id="qq" type="text" value="${esc(draft.question)}" placeholder="질문을 입력하세요"></div>
          <div class="suggest">
            <div class="row"><div class="grow muted">질문이 안 떠오를 때</div>
              <button type="button" class="btn dark" data-act="ai" ${loading ? 'disabled' : ''}>${loading ? '<span class="spin">✿</span>' : 'AI 질문 뽑기'}</button></div>
            ${sugg.map((q, i) => `<button type="button" class="pick" data-pick="${i}">${esc(q)}</button>`).join('')}
          </div>
          <div class="muted">핑퐁 — 이름 버튼을 누르면 말하는 사람이 바뀌어요</div>
          <div id="turns" style="display:flex;flex-direction:column;gap:10px">${turnRows()}</div>
          <div class="row" style="flex-wrap:nowrap">
            <button type="button" class="btn grow" data-add="a" style="border-style:dashed;border-color:${a.color}">+ ${esc(a.name)} 대사</button>
            <button type="button" class="btn grow" data-add="b" style="border-style:dashed;border-color:${b.color}">+ ${esc(b.name)} 대사</button>
          </div>
          <div class="row" style="justify-content:flex-end">
            ${editing ? '<button type="button" class="btn" data-act="cancel">취소</button>' : ''}
            <button class="btn primary">저장</button>
          </div>
        </form>
      </div>`;
    bind();
  };

  const sync = () => {
    draft.question = $(el, '#qq').value;
    $$(el, '[data-turn]').forEach((t) => (draft.turns[+t.dataset.turn].text = t.value));
  };

  function bind() {
    $(el, '[data-act=new]').onclick = () => { editing = null; draft = { question: '', turns: [{ who: 'a', text: '' }, { who: 'b', text: '' }] }; draw(); $(el, '#qq').focus(); };
    $(el, '[data-act=cancel]')?.addEventListener('click', () => $(el, '[data-act=new]').click());
    $$(el, '[data-add]').forEach((btn) => (btn.onclick = () => { sync(); draft.turns.push({ who: btn.dataset.add, text: '' }); draw(); $$(el, '[data-turn]').at(-1).focus(); }));
    $$(el, '[data-who]').forEach((btn) => (btn.onclick = () => { sync(); const t = draft.turns[+btn.dataset.who]; t.who = t.who === 'a' ? 'b' : 'a'; draw(); }));
    $$(el, '[data-tx]').forEach((btn) => (btn.onclick = () => { sync(); draft.turns.splice(+btn.dataset.tx, 1); draw(); }));
    $$(el, '[data-pick]').forEach((btn) => (btn.onclick = () => { sync(); draft.question = sugg[+btn.dataset.pick]; draw(); }));
    $(el, '[data-act=ai]').onclick = async () => {
      sync(); loading = true; draw();
      try {
        sugg = (await ai('question', aiContext(ctx, { askedQuestions: rows.slice(0, 30).map((r) => r.question) }))).filter((x) => typeof x === 'string');
        if (!sugg.length) toast('질문이 비어 있어요. 다시 눌러보세요');
      } catch (e) { toast('AI 질문 실패: ' + e.message); }
      loading = false; draw();
    };
    $$(el, '[data-act=edit]').forEach((btn) => (btn.onclick = () => {
      editing = rows[+btn.dataset.i];
      draft = { question: editing.question, turns: (editing.turns || []).map((t) => ({ ...t })) };
      draw(); $(el, '#ed').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
    $$(el, '[data-act=del]').forEach((btn) => (btn.onclick = async () => {
      const r = rows[+btn.dataset.i];
      if (!(await confirmBox('문답 삭제', `“${r.question}” 문답을 지울까요?`))) return;
      await guard(async () => { await remove('qnas', r.id); rows = rows.filter((x) => x !== r); if (editing === r) editing = null; draw(); }, '삭제했어요');
    }));
    $(el, '#ed').onsubmit = async (e) => {
      e.preventDefault(); sync();
      const turns = draft.turns.filter((t) => t.text.trim());
      if (!draft.question.trim()) return toast('질문을 입력해주세요');
      if (!turns.length) return toast('대사를 하나 이상 입력해주세요');
      const row = { question: draft.question.trim(), turns };
      const saved = await guard(() => (editing ? update('qnas', editing.id, row) : insert('qnas', { ...row, pair_id: pid })), '문답을 저장했어요');
      if (!saved) return;
      if (editing) Object.assign(editing, saved); else rows.unshift(saved);
      editing = null; sugg = [];
      draft = { question: '', turns: [{ who: 'a', text: '' }, { who: 'b', text: '' }] };
      draw();
    };
  }
  draw();
}
