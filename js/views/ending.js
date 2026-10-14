import { loadPair, update, upload, removeFile } from '../supa.js';
import { esc, $, $$, openModal, field, readForm, confirmBox, guard, hydrate, imgTag, pickFiles, toast, ink, cropImage, enableDragSort } from '../ui.js';
import { tabs, subHeader } from './shared.js';

const KINDS = ['HAPPY', 'TRUE', 'NORMAL', 'BAD', 'IF'];
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export default async function ending(el, pid) {
  const ctx = await loadPair(pid);
  if (!ctx) { location.hash = '#/'; return; }
  const { pair, a, b } = ctx;
  const d = pair.detail;
  d.endings ||= [];
  const save = () => guard(() => update('pairs', pid, { detail: d }));

  const draw = () => {
    const list = d.endings;
    const open = list.filter((e) => e.open).length;
    el.innerHTML = `
      ${subHeader({ pid, a, b, title: 'ENDING — 엔딩 도감', action: '<button class="btn primary" data-act="add">+ 엔딩</button>' })}
      ${tabs(pid, 'ending')}
      <div class="row"><span class="lab">COLLECTED</span><span class="game" style="font-size:20px">${open} / ${list.length}</span><span class="muted">미해금 엔딩은 잠긴 카드로 보여요</span></div>
      ${list.length ? `<div class="gallery" id="end-list" style="counter-reset:none">${list.map((e, i) => `
        <article class="frame ending drag-item ${e.open ? '' : 'locked'}" draggable="true" data-idx="${i}" style="counter-increment:none">
          <button type="button" class="shot" data-open="${i}" aria-label="${esc(e.title || '엔딩')} 보기" style="position:relative;aspect-ratio:4/3;background:linear-gradient(135deg, ${esc(a.color)}55, ${esc(b.color)}55)">
            ${e.image_path ? imgTag(e.image_path, e.title) : ''}
            ${e.open ? '' : '<span class="lockcover"><span class="game">LOCKED</span></span>'}
          </button>
          <div class="row" style="gap:6px">
            <span class="drag-handle" aria-label="드래그하여 순서 변경" title="끌어서 순서 변경">⠿</span>
            <span class="badge" style="background:${esc(kindColor(e.kind, a, b))};color:${ink(kindColor(e.kind, a, b))}">${esc(e.kind || 'ENDING')}</span>
            <span class="game" style="font-size:17px;flex:1;min-width:0">${esc(e.title || '제목 없음')}</span>
          </div>
          <div class="row" style="gap:4px;justify-content:flex-end">
            <button type="button" class="btn" data-edit="${i}" style="min-height:40px">수정</button>
          </div>
        </article>`).join('')}</div>`
        : `<div class="empty"><span class="hand">아직 엔딩이 없어요</span>해피·배드·IF… 이 페어가 맞이할 엔딩을 직접 적어보세요.</div>`}`;
    hydrate(el);
    $(el, '[data-act=add]').onclick = () => edit(null);
    $$(el, '[data-edit]').forEach((x) => (x.onclick = () => edit(+x.dataset.edit)));
    $$(el, '[data-open]').forEach((x) => (x.onclick = () => view(+x.dataset.open)));
    const endList = $(el, '#end-list');
    if (endList) enableDragSort(endList, '.drag-item', async (order) => {
      d.endings = order.map((i) => d.endings[i]);
      draw(); await save();
    });
  };

  function view(i) {
    const e = d.endings[i];
    const m = openModal(`
      <div class="row"><span class="badge">${esc(e.kind || 'ENDING')}</span><span class="muted">${e.open ? '해금' : '미해금'}</span></div>
      <h2>${esc(e.title || '제목 없음')}</h2>
      ${e.image_path ? `<div style="border-radius:16px;overflow:hidden">${imgTag(e.image_path, e.title)}</div>` : ''}
      <div class="pre" style="font-size:15px;line-height:1.9">${esc(e.text || (e.open ? '' : '아직 쓰지 않은 엔딩이에요.'))}</div>
      <div class="row" style="justify-content:flex-end"><button class="btn" data-e>수정</button><button class="btn primary" data-x>닫기</button></div>`, { wide: true });
    hydrate(m.el);
    m.el.querySelector('[data-x]').onclick = m.close;
    m.el.querySelector('[data-e]').onclick = () => { m.close(); edit(i); };
  }

  function edit(i) {
    const e = i === null ? { id: uid(), kind: '', title: '', text: '', open: true, image_path: null } : { ...d.endings[i] };
    let file = null;
    const m = openModal(`
      <h2>${i === null ? '새 엔딩' : '엔딩 수정'}</h2>
      <form style="display:flex;flex-direction:column;gap:12px">
        <div class="grid2">
          <div class="field"><label for="ek">종류</label><input id="ek" type="text" name="kind" value="${esc(e.kind)}" list="ekinds" placeholder="HAPPY, BAD, IF…"><datalist id="ekinds">${KINDS.map((k) => `<option value="${k}">`).join('')}</datalist></div>
          <div class="field"><label for="eo">상태</label><select id="eo" name="open"><option value="1" ${e.open ? 'selected' : ''}>해금 (다 쓴 엔딩)</option><option value="0" ${e.open ? '' : 'selected'}>미해금 (구상 중)</option></select></div>
        </div>
        ${field('엔딩 제목', 'title', e.title)}
        <div class="field"><span class="muted">대표 이미지 (선택)</span>
          <div class="row"><button type="button" class="upload-box" data-img style="width:180px;height:120px">${e.image_path ? imgTag(e.image_path) : '이미지 올리기'}</button>
          ${e.image_path ? '<button type="button" class="btn danger" data-noimg>이미지 빼기</button>' : ''}</div>
        </div>
        ${field('내용', 'text', e.text, { area: true, rows: 10, ph: '어떻게 끝나는지, 마지막 장면…' })}
        <div class="row" style="justify-content:space-between">
          ${i === null ? '<span></span>' : '<button type="button" class="btn danger" data-del>삭제</button>'}
          <span class="row"><button type="button" class="btn" data-x>취소</button><button class="btn primary">저장</button></span>
        </div>
      </form>`, { wide: true });
    hydrate(m.el);
    m.el.querySelector('[data-x]').onclick = m.close;
    m.el.querySelector('[data-img]').onclick = async (ev) => {
      const [f0] = await pickFiles(); if (!f0) return;
      const f = await cropImage(f0, { aspect: 4 / 3, title: '엔딩 이미지 자르기' }); if (!f) return;
      file = f; ev.currentTarget.innerHTML = `<img src="${URL.createObjectURL(f)}" alt="">`;
    };
    m.el.querySelector('[data-noimg]')?.addEventListener('click', () => { e._drop = true; m.el.querySelector('[data-img]').innerHTML = '이미지 올리기'; });
    m.el.querySelector('[data-del]')?.addEventListener('click', async () => {
      if (!(await confirmBox('엔딩 삭제', `“${e.title || '제목 없음'}” 엔딩을 지울까요?`))) return;
      d.endings.splice(i, 1); await save(); if (e.image_path) removeFile(e.image_path); m.close(); draw();
    });
    m.el.querySelector('form').onsubmit = async (ev) => {
      ev.preventDefault();
      const f = readForm(ev.target);
      const ok = await guard(async () => {
        const old = e.image_path;
        if (file) e.image_path = await upload(file);
        else if (e._drop) e.image_path = null;
        if (old && old !== e.image_path) removeFile(old);
        delete e._drop;
        Object.assign(e, { kind: f.kind.toUpperCase(), title: f.title, text: f.text, open: f.open === '1' });
        if (i === null) d.endings.push(e); else d.endings[i] = e;
        await update('pairs', pid, { detail: d });
        return true;
      }, '저장했어요');
      if (ok) { m.close(); draw(); }
    };
  }
  draw();
}

export function kindColor(kind, a, b) {
  const k = String(kind || '').toUpperCase();
  if (k.includes('BAD')) return '#4a4458';
  if (k.includes('TRUE')) return '#c79a2b';
  if (k.includes('HAPPY')) return a.color || '#e0607e';
  if (k.includes('IF')) return b.color || '#4f7fd6';
  return '#7a6f8c';
}
