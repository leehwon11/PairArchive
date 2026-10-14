import { list, insert, remove } from '../supa.js';
import { esc, openModal, guard, toast, fmtDate } from '../ui.js';

export const SECTIONS = [['profile', '프로필 전체'], ['story', '서사'], ['ending', '엔딩'], ['au', 'AU'], ['qna', '문답'], ['ssul', '썰'], ['cg', '커미션']];
const token = () => { const b = crypto.getRandomValues(new Uint8Array(18)); return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
export const shareUrl = (t) => `${location.origin}${location.pathname}#/share/${t}`;

export async function openShare(pid) {
  let rows = (await guard(() => list('shares', { pair_id: pid }))) || [];
  const m = openModal('<div></div>', { wide: true });
  const draw = () => {
    m.el.innerHTML = `
      <h2>공유 링크</h2>
      <p class="muted" style="margin:0">링크를 아는 사람은 로그인 없이 <b>읽기만</b> 할 수 있어요. 고르지 않은 항목은 안 보여요. 링크를 지우면 바로 막혀요.</p>
      <fieldset style="border:2px dashed var(--sh);border-radius:14px;padding:12px 14px;margin:0">
        <legend class="lab">보여줄 항목</legend>
        <div class="row">${SECTIONS.map(([k, l]) => `<label class="chip" style="display:inline-flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" value="${k}" checked> ${l}</label>`).join('')}</div>
        <p class="muted" style="margin:6px 0 0">개요(STATUS · 대표 대사 · 키워드 · 기념일)는 항상 보여요.</p>
      </fieldset>
      <div class="row" style="justify-content:flex-end"><button class="btn primary" data-new>링크 만들기</button></div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${rows.length ? rows.map((r) => `
          <div class="card" style="padding:12px 14px;box-shadow:none;border:2px solid var(--soft)">
            <div class="row" style="flex-wrap:nowrap">
              <input class="input" readonly value="${esc(shareUrl(r.token))}" aria-label="공유 링크" style="flex:1;min-width:0">
              <button class="btn" data-copy="${esc(r.token)}">복사</button>
              <button class="btn danger" data-del="${esc(r.token)}">지우기</button>
            </div>
            <div class="muted">${fmtDate(r.created_at)} · ${(r.sections || []).map((k) => (SECTIONS.find(([x]) => x === k) || [k, k])[1]).join(', ') || '개요만'}</div>
          </div>`).join('') : '<div class="muted">아직 만든 링크가 없어요</div>'}
      </div>
      <div class="row" style="justify-content:flex-end"><button class="btn" data-x>닫기</button></div>`;
    m.el.querySelector('[data-x]').onclick = m.close;
    m.el.querySelector('[data-new]').onclick = async () => {
      const sections = [...m.el.querySelectorAll('fieldset input:checked')].map((i) => i.value);
      const row = await guard(() => insert('shares', { token: token(), pair_id: pid, sections }), '링크를 만들었어요');
      if (row) { rows.unshift(row); draw(); copy(row.token); }
    };
    m.el.querySelectorAll('[data-copy]').forEach((b) => (b.onclick = () => copy(b.dataset.copy)));
    m.el.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
      const t = b.dataset.del;
      const ok = await guard(async () => { const { sb } = await import('../supa.js'); const { error } = await sb.from('shares').delete().eq('token', t); if (error) throw error; return true; }, '링크를 지웠어요');
      if (ok) { rows = rows.filter((r) => r.token !== t); draw(); }
    }));
  };
  draw();
}
async function copy(t) {
  try { await navigator.clipboard.writeText(shareUrl(t)); toast('링크를 복사했어요'); }
  catch { toast('복사하지 못했어요. 칸을 길게 눌러 복사해주세요'); }
}
