// 1.6.3 UI 量測(使用者 09-20:照 UI/UX critic 那一輪手量的項目做成腳本)。
// 量 card-table-ui-rules 裡有數字的規則,容許誤差 1px(使用者同意的預設)。
// 由 tools/measure.ps1 呼叫:它先重建 ZZ-css-fixture.md,再用 eval 跑這份;結果放在 window.__m。
// 只讀畫面,不寫檔、不存設定;改過的狀態(篩選、行事曆、設定模式、深淺色)結尾全部還原。
// ⚠ 滑鼠停在卡片的色條上時 M5 會量到 hover 的樣子(4–12.9 而不是 5–9)—— 那不是回歸,
//    把滑鼠移開看板再跑一次就好。
window.__m = 'running';
(async () => {
const 容 = 1;
const path = 'ZZ-css-fixture.md';
const 睡 = (ms) => new Promise(r => setTimeout(r, ms));
const f = app.vault.getAbstractFileByPath(path);
let leaf = app.workspace.getLeavesOfType('card-table').find(l => l.view && l.view.file && l.view.file.path === path);
if (!leaf) { leaf = app.workspace.getLeaf(true); await leaf.openFile(f); await leaf.setViewState({ type: 'card-table', state: { file: path } }); }
app.workspace.setActiveLeaf(leaf, { focus: true });
await 睡(500);
const v = leaf.view, S = app.plugins.plugins['card-table']['設定'], b = v.contentEl;
const 收鍵 = ['card-table-filter-folded', 'card-table-add-folded', 'card-table-list-folded'];
const 原收 = 收鍵.map(k => app.loadLocalStorage(k));
收鍵.forEach(k => app.saveLocalStorage(k, null));
const 原篩 = v.狀態.篩, 原顯示 = S['排程顯示'];
/* ⚠ 看板可能停在設定模式 / 行事曆 / 詳細編輯(上一次手動測試或使用者自己點的)——
   那時候「新增卡片」那一塊畫的是別的東西,M3 之類的量到的就不是要量的東西(2026-09-20 踩過)。
   量之前一律先回到平常的樣子,結尾還原。 */
const 原模 = { 設: v.狀態['設定模式'], 草: v['設草'], 詳: v.狀態['詳細'], 曆: v.狀態['開行事曆'], 封: v.狀態['封存看'] };
v.狀態['設定模式'] = false; v['設草'] = null; v.狀態['詳細'] = false; v.狀態['開行事曆'] = false; v.狀態['封存看'] = null;
v.狀態.篩 = { '型': '全部' };
S['排程顯示'] = { '未完成': true, '完成': false, '封存': false };
v.畫(); await 睡(500);

const 結果 = [];
const 記 = (id, 規則, 過, 值) => 結果.push((過 === null ? 'ℹ️' : 過 ? '✅' : '❌') + ' ' + id + ' ' + 規則 + ' —— ' + 值);
// 比較前先四捨五入到 0.1px(子像素的 1.02 不算超過 1)
const 近 = (a, 目標) => a != null && Math.round(Math.abs(a - 目標) * 10) / 10 <= 容;
const 圓 = (x) => x == null ? 'null' : Math.round(x * 10) / 10;
const 看得見 = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
const 塊們 = () => [...b.querySelectorAll('.tk-塊')].filter(看得見);
// 每一塊的基準線 = 塊的左邊框內側(三條線 5 / 9 / 18 都從這裡算)
const 基 = (塊) => 塊.getBoundingClientRect().left + parseFloat(getComputedStyle(塊).borderLeftWidth || 0);
const 塊名 = (塊) => 塊.classList.contains('tk-新塊') ? '新增' : 塊.classList.contains('tk-篩塊') ? '篩選' :
  (塊.querySelector('.tk-頂列') ? '置頂' : '清單') + (塊.querySelector('.tk-列') ? '' : '(空)');
// 文字節點第一個字的位置
const 字位 = (root, re) => {
  const tn = [root, ...root.querySelectorAll('*')].flatMap(e => [...e.childNodes])
    .find(n => n.nodeType === 3 && (re ? re.test(n.textContent) : n.textContent.trim()));
  if (!tn) return null;
  const i = re ? tn.textContent.search(re) : tn.textContent.search(/\S/);
  const rg = document.createRange(); rg.setStart(tn, i); rg.setEnd(tn, i + 1);
  const r = rg.getClientRects()[0]; return r ? { x: r.left, y: r.top, h: r.height } : null;
};

// ---------- M1–M4 塊的標題列 ----------
const 右緣們 = [];
塊們().forEach((塊, i) => {
  const 頭 = 塊.children[0]; if (!頭) return;
  const 名 = 'M·' + 塊名(塊) + i, x0 = 基(塊);
  const hr = 頭.getBoundingClientRect();
  記(名 + ' M1', '標題列高 26', 近(hr.height, 26), 圓(hr.height));
  const 子 = [...頭.children].filter(看得見);
  // 1.6.3(mockup v9 Q19 / v16):溝 = 3–18,圖示填滿整條溝 → 置中在 10.5
  const 圖 = 子[0] && (子[0].querySelector('svg') || (子[0].tagName === 'svg' ? 子[0] : null));
  if (圖) { const r = 圖.getBoundingClientRect(); 記(名 + ' M2', '收合箭頭 / 溝圖示置中在 10.5(溝 3–18)', 近(r.left + r.width / 2 - x0, 10.5), 圓(r.left + r.width / 2 - x0)); }
  // 1.6.3(mockup v15 Q31 / v16 Guide 22):標題列上溝後面的第一個東西從 22 開始(18 + 4 的間距)
  if (子[1]) 記(名 + ' M3', '溝後面第一個東西從 22 開始', 近(子[1].getBoundingClientRect().left - x0, 22), 圓(子[1].getBoundingClientRect().left - x0));
  const 點點 = [...頭.querySelectorAll('svg.lucide-ellipsis')].filter(看得見).pop();
  if (點點) 右緣們.push([塊名(塊) + i, 點點.getBoundingClientRect().right - x0]);
});

// ---------- M5–M9 卡片 ----------
const 列 = [...b.querySelectorAll('.tk-列')].find(r => 看得見(r) && r.querySelector('.tk-主題'));
if (列) {
  const 塊 = 列.closest('.tk-塊'), x0 = 基(塊);
  const 條 = 列.querySelector('.tk-色條');
  /* 使用者 09-20:「色線跟 pin 有沒有對齊?回去看 mockup 的輔助線」——
     兩個都對齊到**溝的左邊 3**(v16 的紅線;mockup 自己畫成 4 / 5 是 v7「溝 5–13」時代留下來的)。 */
  /* 1.6.6:使用者「色線貼齊左邊 table 直線」—— 從 0 開始、寬度加大到 7(右緣維持在 7,跟 📌 對齊不變)。 */
  if (條) { const r = 條.getBoundingClientRect(); 記('M5', '色條從 0 開始、7 寬(貼齊左邊、跟 📌 同一右緣)', 近(r.left - x0, 0) && 近(r.right - x0, 7), 圓(r.left - x0) + '–' + 圓(r.right - x0)); }
  /* CR-1.6.6-03(使用者:「pin 改成在色線上面,色線收短留空間給 pin,不要放在上面」):
     推翻 1.6.6 的「色條高度固定、📌 直接疊上去」—— 疊在一起時 📌 的背景是分類色,
     每張卡片都不一樣,對比失控(dark 幾乎看不到)。現在上下排開:📌 8–20、色條從 24 開始,中間 4。 */
  const 頂 = [...b.querySelectorAll('.tk-列.tk-頂列')].find(看得見);
  if (頂) {
    const r0 = 頂.getBoundingClientRect(), 頂條 = 頂.querySelector('.tk-色條'), 釘 = 頂.querySelector('.tk-溝釘');
    if (頂條) 記('M5b', '有 📌 的列:色條讓到 top 24(不跟 📌 重疊)', 近(頂條.getBoundingClientRect().top - r0.top, 24), 圓(頂條.getBoundingClientRect().top - r0.top));
    if (釘) { const rp = 釘.getBoundingClientRect();
      記('M5c', '📌 在 left 0 / top 8(底 20,色條接在 24)',
        近(rp.left - r0.left, 0) && 近(rp.top - r0.top, 8),
        圓(rp.left - r0.left) + ' / ' + 圓(rp.top - r0.top)); }
    /* CR-1.6.6-03 新增:兩個**不能重疊** —— 📌 的底 ≤ 色條的頂。這是這條規則的本體,
       上面兩項只是位置;哪天有人把數字調回去,這一項會直接抓到。 */
    if (頂條 && 釘) { const rp = 釘.getBoundingClientRect(), rb = 頂條.getBoundingClientRect();
      記('M5d', '📌 和色條不重疊(📌 底 ≤ 色條頂)', rp.bottom <= rb.top + 1,
        圓(rp.bottom - r0.top) + ' → ' + 圓(rb.top - r0.top)); }
    /* CR-1.6.6-07(使用者:「主題要跟 pin 高度齊平」→ 追加訂正:「**底部**高度齊平,不是中線齊平」):
       卡片第一行(主題)的**底** = 📌 的**底** + 3。
       ⚠ 不是比中心:主題 17 高、📌 12 高,中心對齊的話底部會差 2.5px,看起來就是沒對到。
       ⚠ 那個 +3 是使用者的視覺微調(「主題往下 1pt」講了三次,一次一格收斂出來的)——
         數學上齊平看起來偏高,因為 pin 的圖形在自己的盒子裡上緣還留了空白。**不要「修正」成 0。**
       ⚠ 主題、日期、✎、⋯ 在**同一個 flex 行**,共用同一條中線(M8 在守)——
         所以只要對齊主題,整行就一起對齊了,不會有「只有主題動」的情況。 */
    if (釘) { const 題 = 頂.querySelector('.tk-主題') || 頂.querySelector('.tk-題左');
      if (題) { const rp = 釘.getBoundingClientRect(), rt = 題.getBoundingClientRect();
        const b釘 = rp.bottom - r0.top, b題 = rt.bottom - r0.top;
        記('M5e', '卡片第一行(主題)底部 = 📌 底部 + 3(視覺微調)', 近(b題, b釘 + 3),
          '📌 底 ' + 圓(b釘) + ' / 主題 底 ' + 圓(b題)); } }
  }
  /* 1.6.3(mockup v9 #10):題行**第一個東西**在 18 —— 有指派人是頭像、沒有是空位、
     個人模式才是主題膠囊。以前量的是主題,頭像搬到前面之後那個數字本來就會變。
     ⚠ 1.6.4(S1):量的是**字的位置**,不是盒子的左緣 —— 主題膠囊(和頭像的那個字)
     左邊都墊了內距,是第一個的時候盒子刻意往左 2px 讓字落在 18(見 styles.css .tk-主題 那段註解);
     量盒子左緣會少算那 2px 內距。頭像空是純圖示、沒有文字節點,退回量盒子左緣。 */
  const 首件 = [...(列.querySelector('.tk-題左') || 列).children].find(看得見);
  if (首件) {
    const 首位 = 字位(首件) || { x: 首件.getBoundingClientRect().left };
    記('M6', '題行第一個東西(頭像 / 空位 / 主題)在 18', 近(首位.x - x0, 18), 圓(首位.x - x0));
  }
  const 頭 = 列.querySelector('.tk-頭像, .tk-頭像空');
  if (頭) { const r = 頭.getBoundingClientRect(); 記('M6c', '頭像 17 × 17(跟主題膠囊等高)', 近(r.width, 17) && 近(r.height, 17), 圓(r.width) + ' × ' + 圓(r.height)); }
  const 題 = 列.querySelector('.tk-主題'), 題字 = 題 && 字位(題);
  if (題) { const cs = getComputedStyle(題), r = 題.getBoundingClientRect();
    記('M6b', '膠囊 高 17 · 圓角 8 · 左右內距 2', 近(r.height, 17) && cs.borderTopLeftRadius === '8px' && cs.paddingLeft === '2px', 圓(r.height) + ' · ' + cs.borderTopLeftRadius + ' · ' + cs.paddingLeft); }
  const md = 列.querySelector('.tk-文區 .tk-md'), 內字 = md && 字位(md);
  if (內字) 記('M7', '卡片內容的字在 18(R1)', 近(內字.x - x0, 18), 圓(內字.x - x0));
  // 題行上每一個東西的垂直中線
  const 行 = 列.querySelector('.tk-題行');
  if (行) {
    const 件 = [...行.querySelectorAll('.tk-主題, .tk-頭像, .tk-頭像空, .tk-date, svg')].filter(看得見);
    const 中 = 件.map(e => { const r = e.getBoundingClientRect(); return r.top + r.height / 2; });
    const 差 = Math.max(...中) - Math.min(...中);
    記('M8', '題行上下置中(主題、頭像、日期、✎、⋯)', 近(差, 0), '最大差 ' + 圓(差) + 'px,' + 件.length + ' 件');
    /* ✎ 和 ⋯ **中間沒有空隙**(mockup v16 的 .acts gap:0;使用者 09-20:「太遠很怪」)。
       量的是兩顆鈕的邊,不是圖示 —— 圖示本來就各自置中在 20 / 26 的鈕裡(相距 9.5)。 */
    const 具 = [...行.querySelectorAll('.tk-題具 > *')].filter(看得見);
    if (具.length >= 2) {
      const 隙 = 具[1].getBoundingClientRect().left - 具[0].getBoundingClientRect().right;
      記('M9', '✎ 和 ⋯ 之間沒有空隙', 近(隙, 0), 圓(隙) + 'px');
      const w = 具.map(e => 圓(e.getBoundingClientRect().width));
      記('M9b', '✎ 20 寬 · ⋯ 26 寬', 近(w[0], 20) && 近(w[1], 26), w.join(' / '));
    }
    const 圖們 = [...行.querySelectorAll('svg')].filter(看得見);
    const 點 = 圖們.find(s => /ellipsis/.test(s.getAttribute('class') || ''));
    if (點) 右緣們.push(['卡片', 點.getBoundingClientRect().right - x0]);
  }
}
if (右緣們.length > 1) {
  const xs = 右緣們.map(x => x[1]), 差 = Math.max(...xs) - Math.min(...xs);
  記('M4', '所有 ⋯ 的右緣同一條線', 近(差, 0), 右緣們.map(x => x[0] + ' ' + 圓(x[1])).join(' / '));
}

// ---------- M10 ⋯ 彈出那一排的切換鈕 26 高 ----------
{
  // ⚠ 標題列上現在有兩顆 .tk-頭鈕(行事曆在前、⋯ 在最後),要點的是最後那一顆
  const 篩塊 = b.querySelector('.tk-篩塊'), 頭鈕們 = 篩塊 ? [...篩塊.children[0].querySelectorAll('.tk-頭鈕')] : [];
  const 鈕 = 頭鈕們[頭鈕們.length - 1];
  if (鈕) { 鈕.click();
    // 等彈出真的畫好(固定 350ms 偶爾還沒到)
    for (let i = 0; i < 20 && ![...document.querySelectorAll('.tk-段')].some(看得見); i++) await 睡(50);
    // mockup v16:整顆切換(.tk-段)26 高、跟標題列一樣;裡面的鈕(.tk-段鈕)22
    const 段殼 = [...document.querySelectorAll('.tk-段')].filter(看得見).map(e => 圓(e.getBoundingClientRect().height));
    const 段 = [...document.querySelectorAll('.tk-段鈕')].filter(看得見).map(e => 圓(e.getBoundingClientRect().height));
    記('M10', '⋯ 彈出的切換 26 高、裡面的鈕 22',
      段殼.length > 0 && 段殼.every(h => 近(h, 26)) && 段.length > 0 && 段.every(h => 近(h, 22)),
      (段殼.join(' / ') || '沒找到 .tk-段') + ' · 鈕 ' + (段.join(' / ') || '沒找到 .tk-段鈕'));
    鈕.click(); await 睡(250); }
}

// ---------- M11 送出鈕 = --interactive-accent(R4) ----------
{
  const 送 = b.querySelector('.tk-送小');
  const 參 = document.body.createDiv(); 參.style.background = 'var(--interactive-accent)';
  const 要 = getComputedStyle(參).backgroundColor; 參.remove();
  if (送) { const 是 = getComputedStyle(送).backgroundColor; 記('M11', '送出鈕底色 = --interactive-accent(R4)', 是 === 要, 是 + ' vs ' + 要); }
}

// ---------- M12 膠囊對比 ≥ 3:1,深淺都量(R5) ----------
/* 1.6.6-U7:.tk-主題 直接讀 Obsidian 的 --background-modifier-hover,
   Chromium 把它的 color-mix() 解成 oklch(...) 字串,而且 canvas fillStyle 原樣吐回來、不會正規化 ——
   正規表達式硬抓數字會把 alpha 當成 b、alpha 缺席時又預設不透明,整個算錯。
   自己按公式把 oklch 轉回 sRGB(OKLab → linear sRGB → gamma),再抓數字。 */
const oklch轉rgb = (s) => {
  const m = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+(none|[\d.]+)\s*(?:\/\s*([\d.]+))?\s*\)/i.exec(s);
  if (!m) return null;
  const L = +m[1], C = +m[2], H = m[3] === 'none' ? 0 : +m[3], A = m[4] == null ? 1 : +m[4];
  const hr = H * Math.PI / 180, a = C * Math.cos(hr), b = C * Math.sin(hr);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b, m_ = L - 0.1055613458 * a - 0.0638541728 * b,
    s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, mm = m_ ** 3, ss = s_ ** 3;
  const lr = 4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * ss;
  const lg = -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * ss;
  const lb = -0.0041960863 * l - 0.7034186147 * mm + 1.7076147010 * ss;
  const gam = (x) => { x = Math.max(0, Math.min(1, x)); return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055; };
  return { r: gam(lr) * 255, g: gam(lg) * 255, b: gam(lb) * 255, a: A };
};
const 色 = (s) => {
  if (/^oklch\(/i.test(s)) { const c = oklch轉rgb(s); if (c) return c; }
  const m = s.match(/[\d.]+/g) || [0, 0, 0, 0]; return { r: +m[0], g: +m[1], b: +m[2], a: m[3] == null ? 1 : +m[3] };
};
const 疊 = (上, 下) => ({ r: 上.r * 上.a + 下.r * (1 - 上.a), g: 上.g * 上.a + 下.g * (1 - 上.a), b: 上.b * 上.a + 下.b * (1 - 上.a), a: 1 });
const 底色 = (el) => { const 層 = []; for (let e = el; e; e = e.parentElement) { const c = 色(getComputedStyle(e).backgroundColor); if (c.a > 0) { 層.push(c); if (c.a >= 1) break; } }
  return 層.reverse().reduce((下, 上) => 疊(上, 下), { r: 255, g: 255, b: 255, a: 1 }); };
const 亮 = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
const 對比 = (a, c) => { const x = 亮(a), y = 亮(c); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const 原深 = document.body.classList.contains('theme-dark');
for (const 主題 of ['theme-dark', 'theme-light']) {
  document.body.classList.remove('theme-dark', 'theme-light'); document.body.classList.add(主題); await 睡(200);
  const 膠 = [...b.querySelectorAll('.tk-列 .tk-主題')].filter(看得見);
  const 低 = [];
  膠.forEach(e => { const 字 = e.querySelector('span') || e; const 比 = 對比(疊(色(getComputedStyle(字).color), 底色(e)), 底色(e));
    if (比 < 3) 低.push((e.getAttribute('aria-label') || e.textContent).split('\n')[0].slice(0, 12) + ' ' + 圓(比)); });
  記('M12 ' + (主題 === 'theme-dark' ? '深' : '淺'), '卡片膠囊字對比 ≥ 3:1(R5)', 低.length === 0, 低.length ? 低.join(' / ') : 膠.length + ' 個都過');
}
document.body.classList.remove('theme-dark', 'theme-light'); document.body.classList.add(原深 ? 'theme-dark' : 'theme-light'); await 睡(200);

// ---------- M13 所見即所得:閱讀 ↔ 編輯,每一種行的 x / y(R2) ----------
{
  const 找 = () => [...b.querySelectorAll('.tk-列')].find(r => /逾期十天/.test(r.textContent));
  const 列w = 找();
  if (列w) {
    const 字們 = [['段落', /逾期十天/], ['待辦', /內容裡的待辦/], ['待辦(勾了)', /做完的待辦/]];
    const 量 = (root) => 字們.map(([, re]) => { const p = 字位(root, re); const r0 = 找().getBoundingClientRect(); return p ? { x: p.x - r0.left, y: p.y - r0.top } : null; });
    const 讀 = 量(列w.querySelector('.tk-文區 .tk-md'));
    const 題讀 = 列w.querySelector('.tk-主題'), 題字讀 = 題讀 && 字位(題讀);
    const 題讀x = 題字讀 && 題字讀.x - 列w.getBoundingClientRect().left;
    const 題讀樣 = 題讀 && (({ fontWeight, color }) => ({ fontWeight, color }))(getComputedStyle(題讀));   // 按編輯之後這個元素就不在了,先記下來
    const 鈕 = [...列w.querySelectorAll('[aria-label],[title]')].find(e => /^(編輯|Edit)$/.test(e.title || e.getAttribute('aria-label') || ''));
    if (鈕) {
      鈕.click(); await 睡(600);
      // 游標那一行會露出原始符號(- [x]),放在第一行(一般段落,露不露都一樣)
      try { const E = v.編框.編輯器.editor; E.setCursor({ line: 0, ch: 0 }); } catch (e) {}
      await 睡(300);
      const 框 = 找() && 找().querySelector('.tk-編框 .cm-content');
      const 編 = 框 ? 量(框) : 字們.map(() => null);
      字們.forEach(([名], i) => {
        const a = 讀[i], c = 編[i];
        const ok = a && c && 近(a.x, c.x) && 近(a.y, c.y);
        記('M13 ' + 名, '閱讀 ↔ 編輯 x、y 差 ≤ 1(R2)', !!ok, a && c ? 'x ' + 圓(a.x) + '→' + 圓(c.x) + ' · y ' + 圓(a.y) + '→' + 圓(c.y) : '量不到 ' + JSON.stringify([a, c]));
      });
      const 題框 = 找() && 找().querySelector('input.tk-題編');
      if (題框 && 題讀x != null) {
        const pl = parseFloat(getComputedStyle(題框).paddingLeft) + parseFloat(getComputedStyle(題框).borderLeftWidth);
        const 編x = 題框.getBoundingClientRect().left + pl - 找().getBoundingClientRect().left;
        const cs讀 = 題讀樣, cs編 = getComputedStyle(題框);
        記('M13 主題', '主題 閱讀 ↔ 編輯:字的 x、粗細、顏色一樣(原則 10)',
          近(編x, 題讀x) && cs讀.fontWeight === cs編.fontWeight && cs讀.color === cs編.color,
          'x ' + 圓(題讀x) + '→' + 圓(編x) + ' · 粗 ' + cs讀.fontWeight + '→' + cs編.fontWeight + ' · 色 ' + cs讀.color + '→' + cs編.color);
      }
      try { await v.收掉編修(); } catch (e) {}
      v.狀態.編修 = null; v.重畫清單(); await 睡(300);
    }
  } else 記('M13', '所見即所得', false, 'fixture 裡找不到「逾期十天」那張卡片');
}

// ---------- M14 行事曆、分類設定的內容從 18 開始 ----------
for (const [名, 開, 關] of [
  ['行事曆', () => { v.狀態.開行事曆 = true; }, () => { v.狀態.開行事曆 = false; }],
  // ⚠ 設定模式要連 設草 一起建,不然 畫新增區內 會當成沒開、畫回平常的新增卡片(量到的是別的東西)
  ['分類設定', () => { v.狀態.設定模式 = true; v.設草 = v.建設草(); }, () => { v.狀態.設定模式 = false; v.設草 = null; }]]) {
  開(); v.畫(); await 睡(500);
  const 塊 = b.querySelector('.tk-新塊');
  const 身 = 塊 && 塊.children[1];
  if (身) {
    const x0 = 基(塊);
    const 左 = Math.min(...[...身.querySelectorAll('*')].filter(e => 看得見(e) && e.children.length === 0).map(e => e.getBoundingClientRect().left - x0));
    記('M14 ' + 名, '內容最左邊在 18', 近(左, 18), 圓(左));
  } else 記('M14 ' + 名, '內容最左邊在 18', false, '沒找到內容');
  關(); v.畫(); await 睡(300);
}

// ---------- M23 封存區那一列的 → 和 ⋯(U40:同一組 → 4px) ----------
{
  v.狀態.設定模式 = true; v.設草 = v.建設草(); v.畫(); await 睡(500);
  const 具 = b.querySelector('.tk-新塊 .tk-封列 .tk-封具:not(.tk-空位)');
  const 鈕 = 具 ? [...具.children].filter(看得見) : [];
  if (鈕.length >= 2) {
    const 隙 = 鈕[1].getBoundingClientRect().left - 鈕[0].getBoundingClientRect().right;
    記('M23', '封存區那一列的 → 和 ⋯ 相距 4(U40:群組內 4px)', 近(隙, 4), 圓(隙) + 'px');
  } else 記('M23', '封存區那一列的 → 和 ⋯(U40)', false, '找不到 → / ⋯(fixture 要有一個有名字的封存區)');
  v.狀態.設定模式 = false; v.設草 = null; v.畫(); await 睡(300);
}

// ---------- M20–M22 時間篩選那一排(U20 / U21) ----------
{
  const 塊 = b.querySelector('.tk-篩塊'), 條 = 塊 && 塊.querySelector('.tk-篩條');
  if (條) {
    const x0 = 基(塊);
    const 格們 = [...條.querySelectorAll('.tk-篩格')].filter(看得見);
    const 首 = 格們[0];
    if (首) 記('M20', '時間篩選那一排從 3 開始(U20)', 近(首.getBoundingClientRect().left - x0, 3), 圓(首.getBoundingClientRect().left - x0));
    const 寬 = (sel) => 格們.filter(sel).map(e => 圓(e.getBoundingClientRect().width));
    const 大 = 寬(e => e.classList.contains('tk-大') && !e.classList.contains('tk-小'));
    const 半 = 寬(e => e.classList.contains('tk-半'));
    const 小 = 寬(e => e.classList.contains('tk-小'));
    記('M21', '年 / 月 / 週 / 日 四格 116 寬 · 已逾期 / 週期 52(U20)',
      大.length && 大.every(w => 近(w, 116)) && 半.every(w => 近(w, 116)) && 小.every(w => 近(w, 52)),
      '大 ' + 大.join('/') + ' · 半 ' + 半.join('/') + ' · 小 ' + 小.join('/'));
    const 有數 = 格們.find(e => e.classList.contains('tk-大') && e.querySelector('.tk-篩數') && e.querySelector('.tk-篩中'));
    if (有數) {
      const r0 = 有數.getBoundingClientRect();
      const rn = 有數.querySelector('.tk-篩數').getBoundingClientRect();
      const rc = 有數.querySelector('.tk-篩中').getBoundingClientRect();
      記('M22', '格子上排張數(頂端 25 高)、下排字(貼著底、25 高)(U21)',
        近(rn.top - r0.top, 0) && 近(rn.height, 25) && 近(rc.bottom - r0.bottom, 0) && 近(rc.height, 25),
        '張數 top ' + 圓(rn.top - r0.top) + ' 高 ' + 圓(rn.height) + ' · 字 top ' + 圓(rc.top - r0.top) + ' 高 ' + 圓(rc.height));
    } else 記('M22', '格子上排張數、下排字(U21)', false, '找不到有張數的大格');
  } else 記('M20', '時間篩選那一排(U20)', false, '找不到 .tk-篩條');
}

// ---------- M16–M19 新增卡片那一排(U25 / U26 / U27 / U29 / U32) ----------
{
  const 塊 = b.querySelector('.tk-新塊');
  const x0 = 塊 ? 基(塊) : 0;
  // U32:內容的字從 3(三條線的第一條 = 編輯的字)
  const 入 = 塊 && 塊.querySelector('.tk-新入');
  const 行 = 入 && (入.querySelector('.cm-line') || 入.querySelector('textarea'));
  if (行) {
    const cs = getComputedStyle(行);
    const 左 = 行.getBoundingClientRect().left + parseFloat(cs.paddingLeft || 0) - x0;
    記('M16', '新增卡片的內容字從 3(U32)', 近(左, 3), 圓(左));
  } else 記('M16', '新增卡片的內容字從 3(U32)', false, '找不到輸入框');
  // U25:分類圓點 16,點擊範圍 26;圓點自己落在 22(跟標題列第一個圖示同一條線)
  const 座 = 塊 && 塊.querySelector('.tk-點座'), 點圓 = 座 && 座.querySelector('.tk-點');
  if (點圓) {
    const r = 點圓.getBoundingClientRect(), rs = 座.getBoundingClientRect();
    記('M17', '分類圓點 16 × 16 · 點擊範圍 26 · 圓點在 22(U25)',
      近(r.width, 16) && 近(r.height, 16) && 近(rs.width, 26) && 近(r.left - x0, 22),
      圓(r.width) + ' × ' + 圓(r.height) + ' · 盒 ' + 圓(rs.width) + ' · 左 ' + 圓(r.left - x0));
  } else 記('M17', '分類圓點 16(U25)', false, '找不到 .tk-點');
  // U29:送出鈕 56 寬,右緣跟標題列的 ⋯ 同一條線
  const 送 = 塊 && 塊.querySelector('.tk-送小');
  const 點點 = 塊 && [...塊.children[0].querySelectorAll('.tk-頭鈕')].filter(看得見).pop();
  if (送 && 點點) {
    const rs = 送.getBoundingClientRect(), 差 = rs.right - 點點.getBoundingClientRect().right;
    記('M18', '送出鈕 56 寬 · 右緣跟 ⋯ 同一條線(U29)', 近(rs.width, 56) && 近(差, 0),
      圓(rs.width) + ' 寬 · 右緣差 ' + 圓(差));
  } else 記('M18', '送出鈕 56 寬(U29)', false, '找不到送出鈕或 ⋯');
  // U26:常用主題的收合箭頭在「☰ 57」右邊,沒有底色也沒有框
  const 箭 = 塊 && 塊.querySelector('.tk-題箭');
  if (箭) {
    const cs = getComputedStyle(箭), 前 = 箭.previousElementSibling;
    const 空底 = cs.backgroundColor === 'rgba(0, 0, 0, 0)' || cs.backgroundColor === 'transparent';
    記('M19', '常用主題收合箭頭:在 ☰ 右邊、沒有底色也沒有框(U26)',
      空底 && cs.borderTopWidth === '0px' && !!前 && 前.classList.contains('tk-更多'),
      '底 ' + cs.backgroundColor + ' · 框 ' + cs.borderTopWidth + ' · 前一個 ' + (前 ? 前.className : '沒有'));
  } else 記('M19', '常用主題收合箭頭(U26)', false, '沒找到 .tk-題箭');
}

// ---------- M15 中英字典的鍵一樣,而且沒有空的(R6) ----------
try {
  const dir = app.vault.adapter.basePath + '/' + app.plugins.manifests['card-table'].dir + '/main.js';
  const 原 = require('fs').readFileSync(dir, 'utf8');
  const 起 = 原.indexOf('const 字典 = {'), 迄 = 原.indexOf('\nconst ', 起 + 10);
  const 字典 = new Function(原.slice(起, 迄) + '; return 字典;')();
  const 中 = Object.keys(字典['zh-TW']), 英 = Object.keys(字典['en']);
  const 少中 = 英.filter(k => !(k in 字典['zh-TW'])), 少英 = 中.filter(k => !(k in 字典['en']));
  記('M15', '中英字典的鍵一樣(R6)', 少中.length === 0 && 少英.length === 0,
    (少中.length ? '中文少了 ' + 少中.join(', ') : '') + (少英.length ? ' 英文少了 ' + 少英.join(', ') : '') || (中.length + ' 個鍵'));
} catch (e) { 記('M15', '中英字典的鍵一樣(R6)', false, '讀不到字典:' + e.message); }

// ---------- M24 群組內 4 / 群組間 ≥ 8,沒有 5/6/7(U05) ----------
{
  const 合格 = (g) => g != null && (近(g, 4) || g >= 8 - 容);
  const 掃 = (容器, 名, 壞) => {
    if (!容器) return;
    const 子 = [...容器.children].filter(看得見);
    const 組 = [];   // 依 top 分同一橫排(誤差 3px 內算同一排)
    子.forEach(e => {
      const r = e.getBoundingClientRect();
      let g = 組.find(g => Math.abs(g.top - r.top) <= 3);
      if (!g) { g = { top: r.top, 件: [] }; 組.push(g); }
      g.件.push(r);
    });
    組.forEach(g => {
      g.件.sort((a, b) => a.left - b.left);
      for (let i = 1; i < g.件.length; i++) {
        const 隙 = 圓(g.件[i].left - g.件[i - 1].right);
        if (!合格(隙)) 壞.push(名 + ' ' + 圓(g.件[i - 1].right) + '→' + 圓(g.件[i].left) + '(' + 隙 + 'px)');
      }
    });
  };
  const 壞 = [];
  // ① 卡片工具 ✎/⋯ 所在那一整排(.tk-題行)
  if (列) 掃(列.querySelector('.tk-題行'), '①卡片題行', 壞);
  // ③ 四種標題列
  塊們().forEach((塊, i) => { const 頭 = 塊.children[0]; if (頭) 掃(頭, '③' + 塊名(塊) + i + '標題列', 壞); });
  // ④ 時間篩選四格之間
  { const 篩塊 = b.querySelector('.tk-篩塊'), 條 = 篩塊 && 篩塊.querySelector('.tk-篩條'); 掃(條, '④時間篩選', 壞); }
  // ② 封存列 →/⋯ · ⑥ 設定面板左右兩欄(都要在設定模式打開才畫得出來)
  {
    v.狀態.設定模式 = true; v.設草 = v.建設草(); v.畫(); await 睡(400);
    掃(b.querySelector('.tk-新塊 .tk-封列 .tk-封具:not(.tk-空位)'), '②封存列', 壞);
    const 面板 = b.querySelector('.tk-設定面板');
    if (面板) { 掃(面板.children[0], '⑥設定左欄', 壞); 掃(面板.children[1], '⑥設定右欄', 壞); }
    v.狀態.設定模式 = false; v.設草 = null; v.畫(); await 睡(300);
  }
  記('M24', '群組內 4 / 群組間 ≥ 8,沒有 5/6/7(U05)', 壞.length === 0, 壞.length ? 壞.join(' / ') : '掃過的都合格');
}

// ---------- 還原 ----------
v.狀態.篩 = 原篩; S['排程顯示'] = 原顯示;
v.狀態['設定模式'] = 原模.設; v['設草'] = 原模.草; v.狀態['詳細'] = 原模.詳;
v.狀態['開行事曆'] = 原模.曆; v.狀態['封存看'] = 原模.封;
收鍵.forEach((k, i) => app.saveLocalStorage(k, 原收[i]));
v.畫();
const 錯 = 結果.filter(x => x.startsWith('❌')).length;
return 結果.join('\n') + '\n' + (錯 ? '==> ' + 錯 + ' 項沒過' : '==> 全部過');
})().then(r => window.__m = r, e => window.__m = 'ERROR ' + (e && e.stack || e));
