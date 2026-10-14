import { esc, themeBtn } from '../ui.js';

export const TABS = [
  ['', 'STATUS', '개요'], ['profile/a', 'PROFILE', '프로필'], ['compare', 'VS', '비교'], ['story', 'STORY', '서사'], ['ending', 'ENDING', '엔딩'],
  ['au', 'ROUTE', 'AU'], ['qna', 'TALK', '문답'], ['ssul', 'LOG', '썰'], ['commission', 'CG', '커미션'],
];

export function tabs(pid, active) {
  return `<nav class="menu" aria-label="페어 메뉴"><div class="menu-in">${TABS.map(([k, label, ko]) => {
    const on = active === k || (k.startsWith('profile') && active.startsWith('profile'));
    return `<a href="#/pair/${pid}${k ? '/' + k : ''}" class="${on ? 'on' : ''}" ${on ? 'aria-current="page"' : ''}>${label}<span>${ko}</span></a>`;
  }).join('')}</div></nav>`;
}

export const pairName = (a, b) => (a.pairTitle ? esc(a.pairTitle) : `${esc(a.name || 'A')} × ${esc(b.name || 'B')}`);

export function subHeader({ pid, a, b, title, action = '' }) {
  return `
    <div class="topbar">
      <a class="back" href="#/pair/${pid}">← ${pairName(a, b)}</a>
      <h1 class="title center">${esc(title)}</h1>
      <div class="row">${action}${themeBtn()}</div>
    </div>`;
}

// AI 에 넘길 페어 요약
export function aiContext({ pair, a, b }, extra = {}) {
  const pick = (c) => ({
    name: c.name, intro: c.profile?.intro, alias: c.profile?.alias,
    personality: c.profile?.depth, sliders: c.profile?.sliders, likes: c.profile?.like,
  });
  return { kind: pair.kind, genre: pair.genre, summary: pair.summary, keywords: pair.detail?.keywords, a: pick(a), b: pick(b), ...extra };
}
