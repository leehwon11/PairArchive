import { loadPair, list, insert, update, remove, removeFile, imgUrl } from '../supa.js';
import { esc, $, $$, iconBtn, openModal, field, readForm, confirmBox, guard, hydrate, imgTag, makeDropzone, uploadMany, today, toast, ICON } from '../ui.js';
import { tabs, subHeader } from './shared.js';

const TILTS = ['-1.5deg', '1deg', '-.5deg', '1.5deg', '.8deg', '-1.2deg', '1.3deg', '-.7deg'];

export default async function commission(el, pid) {
  const ctx = await loadPair(pid);
  if (!ctx) { location.hash = '#/'; return; }
  let rows = await list('commissions', { pair_id: pid });

  const draw = () => {
    el.innerHTML = `
      ${subHeader({ pid, a: ctx.a, b: ctx.b, title: 'CG GALLERY' })}
      ${tabs(pid, 'commission')}
      <button type="button" class="dropzone" id="drop">${ICON.up}
        <span style="display:flex;flex-direction:column;align-items:flex-start"><span class="hand" style="font-size:22px">커미션 이미지 올리기</span><span class="muted">클릭하거나 파일을 끌어다 놓기 · 여러 장 가능</span></span>
      </button>
      ${rows.length ? `<div class="gallery">${rows.map((r, i) => `
        <div class="frame" style="transform:rotate(${TILTS[i % TILTS.length]})">
          <button type="button" class="shot" data-zoom="${i}" aria-label="${esc(r.artist || '커미션')} 크게 보기">${imgTag(r.image_path, r.artist)}</button>
          <div class="row" style="flex-wrap:nowrap;gap:6px">
            <div class="grow"><div class="hand" style="font-size:20px">${esc(r.artist || '작가 미상')}</div><div class="muted">${esc(r.made_on || '')}</div></div>
            ${iconBtn('edit', '커미션 정보 수정', 'edit', '', `data-i="${i}"`)}
            ${iconBtn('del', '커미션 삭제', 'del', 'del', `data-i="${i}"`)}
          </div>
        </div>`).join('')}</div>`
        : `<div class="empty"><span class="hand">아직 커미션이 없어요</span>위 칸에 이미지를 올려보세요.</div>`}`;
    hydrate(el);

    makeDropzone($(el, '#drop'), async (files) => {
      toast(`${files.length}장 올리는 중…`);
      await guard(async () => {
        const paths = await uploadMany(files);
        for (const path of paths) rows.unshift(await insert('commissions', { pair_id: pid, image_path: path, made_on: today() }));
        draw();
      }, `${files.length}장 올렸어요. 연필 버튼으로 작가명을 적어주세요`);
    });
    $$(el, '[data-zoom]').forEach((b) => (b.onclick = () => lightbox(+b.dataset.zoom)));
    $$(el, '[data-act=edit]').forEach((b) => (b.onclick = () => edit(rows[+b.dataset.i])));
    $$(el, '[data-act=del]').forEach((b) => (b.onclick = async () => {
      const r = rows[+b.dataset.i];
      if (!(await confirmBox('커미션 삭제', '이 커미션 이미지를 지울까요? 원본 파일도 함께 지워져요.'))) return;
      await guard(async () => { await remove('commissions', r.id); await removeFile(r.image_path); rows = rows.filter((x) => x !== r); draw(); }, '삭제했어요');
    }));
  };

  function edit(r) {
    const m = openModal(`
      <h2>커미션 정보</h2>
      <form style="display:flex;flex-direction:column;gap:12px">
        <div class="grid2">${field('작가명', 'artist', r.artist)}${field('날짜', 'made_on', r.made_on || '', { type: 'date' })}</div>
        <div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-x>취소</button><button class="btn primary">저장</button></div>
      </form>`);
    m.el.querySelector('[data-x]').onclick = m.close;
    m.el.querySelector('form').onsubmit = async (e) => {
      e.preventDefault();
      const f = readForm(e.target);
      const saved = await guard(() => update('commissions', r.id, { artist: f.artist, made_on: f.made_on || null }), '저장했어요');
      if (saved) { Object.assign(r, saved); m.close(); draw(); }
    };
  }

  function lightbox(start) {
    let i = start;
    const box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    const show = async () => {
      const r = rows[i];
      box.innerHTML = `
        <img src="" alt="${esc(r.artist || '커미션')}">
        <div class="bar">
          <button class="round" data-p aria-label="이전">‹</button>
          <span>${esc(r.artist || '작가 미상')}${r.made_on ? ' · ' + esc(r.made_on) : ''} · ${i + 1} / ${rows.length}</span>
          <button class="round" data-n aria-label="다음">›</button>
          <button class="btn" data-c>닫기</button>
        </div>`;
      box.querySelector('img').src = await imgUrl(r.image_path);
      box.querySelector('[data-p]').onclick = (e) => { e.stopPropagation(); i = (i - 1 + rows.length) % rows.length; show(); };
      box.querySelector('[data-n]').onclick = (e) => { e.stopPropagation(); i = (i + 1) % rows.length; show(); };
      box.querySelector('[data-c]').onclick = close;
      box.querySelector('[data-c]').focus();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') box.querySelector('[data-p]')?.click();
      if (e.key === 'ArrowRight') box.querySelector('[data-n]')?.click();
    };
    function close() { box.remove(); document.removeEventListener('keydown', onKey); }
    box.addEventListener('click', (e) => { if (e.target === box) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(box);
    show();
  }
  draw();
}
