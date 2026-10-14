import { sb } from './supa.js';
import { esc, toast, $, applyTheme, openTheme } from './ui.js';

applyTheme();
document.addEventListener('click', (e) => { if (e.target.closest('[data-theme-open]')) openTheme(); });
import { SUPABASE_URL, SITE_NAME } from './config.js';

document.title = SITE_NAME;
import home from './views/home.js';
import pairForm from './views/pairform.js';
import pairView from './views/pair.js';
import profile from './views/profile.js';
import profileEdit from './views/profileEdit.js';
import story from './views/story.js';
import au from './views/au.js';
import qna from './views/qna.js';
import ssul from './views/ssul.js';
import commission from './views/commission.js';
import ending from './views/ending.js';
import compare from './views/compare.js';

const app = document.getElementById('app');

const routes = [
  [/^\/$/, home],
  [/^\/pair\/new$/, pairForm],
  [/^\/pair\/([\w-]+)\/edit$/, pairForm],
  [/^\/pair\/([\w-]+)$/, pairView],
  [/^\/pair\/([\w-]+)\/profile\/(a|b)$/, profile],
  [/^\/pair\/([\w-]+)\/profile\/(a|b)\/edit$/, profileEdit],
  [/^\/pair\/([\w-]+)\/story$/, story],
  [/^\/pair\/([\w-]+)\/au$/, au],
  [/^\/pair\/([\w-]+)\/qna$/, qna],
  [/^\/pair\/([\w-]+)\/ssul$/, ssul],
  [/^\/pair\/([\w-]+)\/commission$/, commission],
  [/^\/pair\/([\w-]+)\/ending$/, ending],
  [/^\/pair\/([\w-]+)\/compare$/, compare],
];

let session = null;

async function route() {
  if (SUPABASE_URL.includes('YOUR-PROJECT')) {
    app.innerHTML = `<div class="empty"><span class="hand">설정이 필요해요</span>js/config.js 에 Supabase URL과 키를 넣어주세요.</div>`;
    return;
  }
  const path = location.hash.replace(/^#/, '') || '/';
  const sm = path.match(/^\/share\/([A-Za-z0-9_-]{16,64})$/);
  if (sm) { const m = await import('./views/publicview.js'); return m.default(app, sm[1]); }
  if (!session) return renderLogin();
  for (const [re, view] of routes) {
    const m = path.match(re);
    if (m) {
      app.innerHTML = '<div class="empty"><span class="spin">✿</span></div>';
      window.scrollTo(0, 0);
      try { await view(app, ...m.slice(1)); app.querySelector('.menu a.on')?.scrollIntoView({ inline: 'center', block: 'nearest' }); }
      catch (e) { console.error(e); app.innerHTML = `<div class="empty"><span class="hand">불러오지 못했어요</span>${esc(e.message)}<br><br><a href="#/">홈으로</a></div>`; }
      return;
    }
  }
  location.hash = '#/';
}

function renderLogin() {
  app.innerHTML = `
    <form class="card login" id="login">
      <h1 class="title" style="text-align:center">${esc(SITE_NAME)}</h1>
      <p class="muted" style="text-align:center;margin:0">나만 보는 공간이에요. 로그인해주세요.</p>
      <div class="field"><label for="em">이메일</label><input id="em" type="email" name="email" autocomplete="email" required></div>
      <div class="field"><label for="pw">비밀번호</label><input id="pw" type="password" name="pw" autocomplete="current-password" required></div>
      <button class="btn primary" type="submit">로그인</button>
    </form>`;
  $(app, '#login').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const { error } = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.pw.value });
    if (error) toast('로그인 실패: 이메일이나 비밀번호를 확인해주세요');
  };
}

sb.auth.onAuthStateChange((_e, s) => {
  const changed = !!s !== !!session;
  session = s;
  if (changed) route();
});
window.addEventListener('hashchange', route);
try {
  const { data, error } = await sb.auth.getSession();
  if (error) throw error;
  session = data.session;
} catch (e) {
  console.error(e);
  session = null;
}
route();
