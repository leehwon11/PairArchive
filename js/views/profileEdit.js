import { loadPair, update, upload, removeFile } from '../supa.js';
import { esc, $, $$, field, readForm, hydrate, imgTag, pickFiles, guard, validHex, ICON, cropImage, fileFromPath } from '../ui.js';
import { PTABS, LOOK, DEPTH, LINES, HABITS, WEAK, TASTE, DEFAULT_SLIDERS, DEFAULT_STATS, QUIRK_PH } from './profile.js';

export default async function profileEdit(el, pid, which) {
  const ctx = await loadPair(pid);
  if (!ctx) { location.hash = '#/'; return; }
  const c = ctx[which];
  const p = structuredClone(c.profile || {});
  let tab = 'basic';
  let sliders = p.sliders?.length ? p.sliders.map((x) => ({ ...x })) : DEFAULT_SLIDERS.map((x) => ({ ...x }));
  let stats = p.stats?.length ? p.stats.map((x) => ({ ...x })) : DEFAULT_STATS.map((x) => ({ ...x }));
  let history = (p.history || []).map((x) => ({ ...x }));
  let relations = (p.relations || []).map((x) => ({ ...x }));
  let outfits = (p.outfits || []).map((x) => ({ ...x }));
  let quirks = [...(p.quirks || [])];
  let avatar = { path: c.image_path || null, file: null };
  const toDelete = [];
  const back = `#/pair/${pid}/profile/${which}`;

  const grp = (title, inner, hint = '') => `<section style="display:flex;flex-direction:column;gap:14px"><h2 class="section-title">${title}</h2>${hint ? `<div class="muted">${hint}</div>` : ''}${inner}</section>`;
  const fields = (list, base, obj = {}, opt = {}) => list.map(([k, l]) => field(l, `p.${base}.${k}`, obj[k], opt)).join('');
  const preview = (x) => (x.file ? `<img src="${URL.createObjectURL(x.file)}" alt="">` : x.image_path ? imgTag(x.image_path) : '');

  const statRows = () => stats.map((s, i) => `
    <div style="display:grid;grid-template-columns:60px 90px minmax(0,1fr) 50px 36px;gap:8px;align-items:center">
      <input type="text" class="input" aria-label="코드" data-st="${i}" data-k="name" value="${esc(s.name)}" style="text-align:center;font-family:var(--game);font-size:12px">
      <input type="text" class="input" aria-label="이름" data-st="${i}" data-k="label" value="${esc(s.label)}">
      <input type="range" min="0" max="100" aria-label="수치" data-st="${i}" data-k="value" value="${s.value}" style="accent-color:${esc(c.color)}">
      <span class="game" style="text-align:center;font-size:14px" data-stv="${i}">${s.value}</span>
      <button type="button" class="icon-btn del" data-stx="${i}" aria-label="스탯 삭제">${ICON.x}</button>
    </div>`).join('');
  const sliderRows = () => sliders.map((s, i) => `
    <div style="display:grid;grid-template-columns:110px minmax(0,1fr) 110px 36px;gap:10px;align-items:center">
      <input type="text" class="input" aria-label="왼쪽 라벨" data-sl="${i}" data-k="l" value="${esc(s.l)}" style="text-align:right">
      <input type="range" min="0" max="100" aria-label="정도" data-sl="${i}" data-k="v" value="${s.v}" style="accent-color:${esc(c.color)}">
      <input type="text" class="input" aria-label="오른쪽 라벨" data-sl="${i}" data-k="r" value="${esc(s.r)}">
      <button type="button" class="icon-btn del" data-slx="${i}" aria-label="슬라이더 삭제">${ICON.x}</button>
    </div>`).join('');
  const histRows = () => history.map((h, i) => `
    <div class="row" style="align-items:flex-start;flex-wrap:nowrap">
      <div class="field" style="width:170px;flex-shrink:0"><label for="hw${i}">시기</label><input id="hw${i}" type="text" data-h="${i}" data-k="when" value="${esc(h.when)}"></div>
      <div class="field grow"><label for="hx${i}">일어난 일</label><textarea id="hx${i}" rows="2" data-h="${i}" data-k="what">${esc(h.what)}</textarea></div>
      <button type="button" class="icon-btn del" data-hx="${i}" aria-label="과거사 삭제" style="margin-top:26px">${ICON.x}</button>
    </div>`).join('');
  const relRows = () => relations.map((r, i) => `
    <div class="rel-card" style="flex-direction:row;gap:12px;align-items:flex-start">
      <button type="button" class="upload-box" data-rimg="${i}" aria-label="관계 캐릭터 사진" style="width:64px;height:64px;border-radius:32px;flex-shrink:0">${preview(r) || ICON.up}</button>
      <div class="grow" style="display:flex;flex-direction:column;gap:10px">
        <div class="grid2" style="gap:10px">
          <div class="field"><label for="rn${i}">캐릭터 이름</label><input id="rn${i}" type="text" data-r="${i}" data-k="name" value="${esc(r.name)}"></div>
          <div class="field"><label for="rl${i}">관계</label><input id="rl${i}" type="text" data-r="${i}" data-k="label" value="${esc(r.label)}" placeholder="소꿉친구, 라이벌…"></div>
        </div>
        <div class="field"><label for="rt${i}">어떻게 생각하는지 · 에피소드</label><textarea id="rt${i}" rows="2" data-r="${i}" data-k="note">${esc(r.note)}</textarea></div>
      </div>
      <button type="button" class="icon-btn del" data-rx="${i}" aria-label="관계 삭제">${ICON.x}</button>
    </div>`).join('');
  const outfitRows = () => outfits.map((o, i) => `
    <div style="display:flex;flex-direction:column;gap:8px">
      <div class="upload-box" style="aspect-ratio:3/4;border-style:solid">${preview(o)}</div>
      <div class="row" style="flex-wrap:nowrap;gap:6px"><input type="text" class="input" aria-label="의상 이름" data-o="${i}" value="${esc(o.name)}">
      <button type="button" class="icon-btn del" data-ox="${i}" aria-label="의상 삭제">${ICON.x}</button></div>
    </div>`).join('');

  const quirkTags = () => quirks.map((q, i) => `<span class="badge" style="background:${esc(c.color)};color:${ink(c.color)};font-size:14px;padding:6px 12px;gap:6px;display:inline-flex;align-items:center">${esc(q)}<button type="button" data-qx="${i}" aria-label="${esc(q)} 삭제" style="border:none;background:none;padding:0;cursor:pointer;font-size:16px;line-height:1;color:inherit;opacity:.7">×</button></span>`).join('');

  const panes = {
    basic: grp('기본 정보', `
      <div class="row" style="align-items:flex-start;gap:20px">
        <button type="button" class="upload-box" data-avatar style="width:170px;height:210px">${avatar.path ? imgTag(avatar.path) : ICON.up + '<span>프로필 사진</span>'}</button><div class="photo-tools" style="margin-top:6px"><button type="button" class="btn" onclick="this.parentNode.previousElementSibling.click()">사진 바꾸기</button><button type="button" class="btn" data-recrop-avatar>위치 조절</button></div>
        <div class="grow" style="display:flex;flex-direction:column;gap:14px;min-width:240px">
          <div class="grid2">${field('이름', 'name', c.name)}${field('이명', 'p.alias', p.alias)}</div>
          <div class="grid2">${field('구분', 'p.kind', p.kind, { ph: '드림주 / 원작캐 / 자캐' })}${field('대표 대사', 'p.line', p.line)}</div>
          ${field('짧은 설명', 'p.intro', p.intro, { area: true, rows: 2 })}
        </div>
      </div>
      <div class="grid4">${field('나이', 'p.age', p.age)}${field('생일', 'p.birthday', p.birthday)}${field('키', 'p.height', p.height)}${field('MBTI', 'p.mbti', p.mbti)}</div>
      <div class="grid2">${field('테마곡', 'p.song', p.song, { ph: '곡명 — 아티스트' })}${field('상징물', 'p.symbol', p.symbol)}</div>
      ${field('키워드 태그 (쉼표로 구분)', 'p.tags', p.tags, { ph: '무뚝뚝, 고양이상, 집착' })}
      ${field('TMI (한 줄에 하나씩)', 'p.tmi', p.tmi, { area: true, rows: 6, ph: '단 걸 못 먹는다\n잘 때 이불을 머리끝까지 덮는다' })}
      <div class="row" style="align-items:flex-end">
        <div class="field"><label for="hex">상징색 (hex)</label><input id="hex" type="text" name="color" value="${esc(c.color)}" style="width:140px"></div>
        <span class="dot" id="swatch" style="width:44px;height:44px;border-radius:22px;background:${esc(c.color)}"></span>
        <span class="muted">문답 말풍선 · 슬라이더 · 탭 색에 자동 적용돼요</span>
      </div>`),
    look: grp('외관', `<div class="grid2">${fields(LOOK, 'look', p.look, { area: true, rows: 2 })}</div>`)
      + grp('성격 — 깊이 순', `<div class="grid3">${fields(DEPTH, 'depth', p.depth, { area: true, rows: 4 })}</div>`)
      + grp('성격 슬라이더', `<div id="sl" style="display:flex;flex-direction:column;gap:10px">${sliderRows()}</div><button type="button" class="btn dashed" data-add="sl" style="align-self:flex-start">+ 슬라이더 추가</button>`, '막대를 끌어서 정도를 조절해요')
      + grp('카드 스탯', `<div id="st" style="display:flex;flex-direction:column;gap:8px">${statRows()}</div><button type="button" class="btn dashed" data-add="st" style="align-self:flex-start">+ 스탯 추가</button>`, '트레이딩 카드에 표시되는 능력치예요 (0~100)'),
    voice: grp('상황별 대사', fields(LINES, 'lines', p.lines))
      + grp('버릇 · 말투 태그', `<div id="quirks" class="row" style="gap:8px;flex-wrap:wrap">${quirkTags()}</div><div class="row" style="gap:8px;margin-top:8px"><input id="quirk-input" type="text" class="input" placeholder="${esc(QUIRK_PH[Math.floor(Math.random() * QUIRK_PH.length)])}" style="flex:1;max-width:280px"><button type="button" class="btn" data-add="quirk">+ 추가</button></div>`, '"머리 만지는 버릇", "말끝에 ~거든" 같은 디테일을 태그로 달아보세요. Enter로도 추가돼요.')
      + grp('버릇 · 습관 (상세)', `<div class="grid3">${fields(HABITS, 'habits', p.habits, { area: true, rows: 2 })}</div>`)
      + grp('약점 · 트라우마', `<div class="grid3">${fields(WEAK, 'weak', p.weak, { area: true, rows: 2 })}</div>`),
    taste: `<div class="grid2">${grp('좋아하는 것', fields(TASTE, 'like', p.like, { area: true, rows: 2 }))}${grp('싫어하는 것', fields(TASTE, 'dislike', p.dislike, { area: true, rows: 2 }))}</div>`,
    past: grp('과거사', `<div id="hist" style="display:flex;flex-direction:column;gap:12px">${histRows()}</div><button type="button" class="btn dashed" data-add="hist" style="align-self:flex-start">+ 과거사 추가</button>`, '위에서부터 시간 순서대로 보여요')
      + grp('관계', `<div id="rels" style="display:flex;flex-direction:column;gap:12px">${relRows()}</div><button type="button" class="btn dashed" data-add="rels" style="align-self:flex-start">+ 관계 추가</button>`),
    outfit: grp('의상 · 레퍼런스', `<div class="outfits" id="outs">${outfitRows()}</div><button type="button" class="dropzone" data-add="outs">${ICON.up}<span class="hand" style="font-size:20px">의상 이미지 올리기 (여러 장 가능)</span></button>`),
  };

  el.innerHTML = `
    <div class="topbar">
      <a class="back" href="${back}">← 프로필로</a>
      <h1 class="title center">${esc(c.name)} 프로필 수정</h1>
      <a class="btn" href="${back}">취소</a>
      <button class="btn primary" data-act="save">저장</button>
    </div>
    <p class="muted" style="margin:0;text-align:right">탭을 옮겨도 입력한 내용은 그대로 있어요. 마지막에 저장만 눌러주세요.</p>
    <div class="edit-layout">
      <div class="edit-tabs" role="tablist">${PTABS.map(([k, l], i) => `<button type="button" role="tab" data-t="${k}" class="${k === tab ? 'on' : ''}" aria-selected="${k === tab}"><span>${i + 1}</span>${l}</button>`).join('')}</div>
      <form class="card" id="pe" style="padding:26px 30px;gap:28px" onsubmit="return false">
        ${PTABS.map(([k]) => `<div data-pane="${k}" style="display:${k === tab ? 'flex' : 'none'};flex-direction:column;gap:28px">${panes[k]}</div>`).join('')}
      </form>
    </div>`;
  hydrate(el);
  const form = $(el, '#pe');

  $$(el, '[data-t]').forEach((b) => (b.onclick = () => {
    tab = b.dataset.t;
    $$(el, '[data-t]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
    $$(el, '[data-pane]').forEach((x) => (x.style.display = x.dataset.pane === tab ? 'flex' : 'none'));
  }));
  $(el, '#hex').addEventListener('input', (e) => { if (validHex(e.target.value)) $(el, '#swatch').style.background = e.target.value; });
  $(el, '[data-avatar]').onclick = async (e) => {
    const btn = e.currentTarget;
    const [f0] = await pickFiles(); if (!f0) return;
    const f = await cropImage(f0, { aspect: 3 / 4, title: '프로필 사진 자르기' }); if (!f) return;
    avatar.file = f; btn.innerHTML = `<img src="${URL.createObjectURL(f)}" alt="">`;
  };

  $(el, '[data-recrop-avatar]')?.addEventListener('click', async () => {
    const src = avatar.file || (avatar.path && await guard(() => fileFromPath(avatar.path)));
    if (!src || src === true) return;
    const f = await cropImage(src, { aspect: 3 / 4, title: '위치 다시 조절' }); if (!f) return;
    avatar.file = f; $(el, '[data-avatar]').innerHTML = `<img src="${URL.createObjectURL(f)}" alt="">`;
  });

  // 목록 동기화 (DOM → 상태)
  const sync = () => {
    $$(el, '[data-sl]').forEach((i) => (sliders[i.dataset.sl][i.dataset.k] = i.dataset.k === 'v' ? Number(i.value) : i.value));
    $$(el, '[data-st]').forEach((i) => {
      const s = stats[i.dataset.st];
      if (i.dataset.k === 'value') s.value = Math.min(100, Math.max(0, Number(i.value)));
      else s[i.dataset.k] = i.value;
    });
    $$(el, '[data-h]').forEach((i) => (history[i.dataset.h][i.dataset.k] = i.value));
    $$(el, '[data-r]').forEach((i) => (relations[i.dataset.r][i.dataset.k] = i.value));
    $$(el, '[data-o]').forEach((i) => (outfits[i.dataset.o].name = i.value));
  };
  const redraw = (id) => {
    const map = { sl: sliderRows, st: statRows, hist: histRows, rels: relRows, outs: outfitRows };
    $(el, '#' + id).innerHTML = map[id]();
    hydrate($(el, '#' + id));
    bindLists();
  };
  const redrawQuirks = () => {
    const qEl = $(el, '#quirks');
    if (qEl) { qEl.innerHTML = quirkTags(); bindQuirks(); }
  };
  const addQuirk = () => {
    const inp = $(el, '#quirk-input'); if (!inp) return;
    const v = inp.value.trim(); if (!v || quirks.includes(v)) { inp.value = ''; return; }
    quirks.push(v); inp.value = ''; redrawQuirks();
  };
  function bindQuirks() {
    $$(el, '[data-qx]').forEach((b) => (b.onclick = () => { quirks.splice(+b.dataset.qx, 1); redrawQuirks(); }));
  }
  function bindLists() {
    bindQuirks();
    $$(el, '[data-slx]').forEach((b) => (b.onclick = () => { sync(); sliders.splice(+b.dataset.slx, 1); redraw('sl'); }));
    $$(el, '[data-stx]').forEach((b) => (b.onclick = () => { sync(); stats.splice(+b.dataset.stx, 1); redraw('st'); }));
    $$(el, '[data-st][data-k=value]').forEach((inp) => (inp.oninput = () => {
      const lbl = $(el, `[data-stv="${inp.dataset.st}"]`);
      if (lbl) lbl.textContent = inp.value;
    }));
    $$(el, '[data-hx]').forEach((b) => (b.onclick = () => { sync(); history.splice(+b.dataset.hx, 1); redraw('hist'); }));
    $$(el, '[data-rx]').forEach((b) => (b.onclick = () => { sync(); const [r] = relations.splice(+b.dataset.rx, 1); if (r.image_path) toDelete.push(r.image_path); redraw('rels'); }));
    $$(el, '[data-ox]').forEach((b) => (b.onclick = () => { sync(); const [o] = outfits.splice(+b.dataset.ox, 1); if (o.image_path) toDelete.push(o.image_path); redraw('outs'); }));
    $$(el, '[data-rimg]').forEach((b) => (b.onclick = async () => {
      const [f0] = await pickFiles(); if (!f0) return;
      const f = await cropImage(f0, { aspect: 1, round: true, title: '관계 캐릭터 사진' }); if (!f) return;
      sync(); const r = relations[+b.dataset.rimg];
      if (r.image_path) toDelete.push(r.image_path);
      r.image_path = null; r.file = f; redraw('rels');
    }));
  }
  bindLists();
  $$(el, '[data-add]').forEach((b) => (b.onclick = async () => {
    sync();
    const k = b.dataset.add;
    if (k === 'quirk') { addQuirk(); return; }
    if (k === 'st') stats.push({ name: '', label: '', value: 50 });
    if (k === 'sl') sliders.push({ l: '', r: '', v: 50 });
    if (k === 'hist') history.push({ when: '', what: '' });
    if (k === 'rels') relations.push({ name: '', label: '', note: '', image_path: null });
    if (k === 'outs') { const files = await pickFiles({ multiple: true }); files.forEach((f) => outfits.push({ name: '', file: f })); }
    redraw(k);
  }));
  $(el, '#quirk-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addQuirk(); } });

  $(el, '[data-act=save]').onclick = async (e) => {
    sync();
    const btn = e.currentTarget; btn.disabled = true;
    const f = readForm(form);
    const ok = await guard(async () => {
      if (avatar.file) { if (avatar.path) toDelete.push(avatar.path); avatar.path = await upload(avatar.file); avatar.file = null; }
      for (const list of [relations, outfits]) for (const x of list) if (x.file) { x.image_path = await upload(x.file); delete x.file; }
      const profile = {
        ...p, ...f.p,
        stats: stats.filter((s) => s.label),
        sliders: sliders.filter((s) => s.l || s.r),
        quirks: quirks.filter(Boolean),
        history: history.filter((h) => h.when || h.what),
        relations: relations.filter((r) => r.name || r.note || r.image_path).map(({ file, ...r }) => r),
        outfits: outfits.filter((o) => o.image_path).map(({ file, ...o }) => o),
      };
      await update('characters', c.id, { name: f.name || c.name, color: validHex(f.color) ? f.color : c.color, image_path: avatar.path, profile });
      for (const path of toDelete) await removeFile(path);
      return true;
    }, '프로필을 저장했어요');
    btn.disabled = false;
    if (ok) location.hash = back;
  };
}
