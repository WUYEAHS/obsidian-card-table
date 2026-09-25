/* 卡片看板:格式純函式測試(不寫檔)。
   用法:obsidian eval code="eval(require('fs').readFileSync('<repo>/tools/format-test.js','utf8'))"
   每一行 ok / FAIL;全部 ok 才算過。 */
(() => {
  const fs = require('fs');
  // 測的是 vault 裡**已經部署**的 main.js(先複製、重載再跑,見技能 card-table-format-test)
  const path = require('path');
  const src = fs.readFileSync(path.join(app.vault.adapter.basePath, app.plugins.manifests['card-table'].dir, 'main.js'), 'utf8');
  const C = class {};
  const stub = { Plugin: C, TextFileView: C, PluginSettingTab: C, Setting: C, Notice: C, Menu: C, Modal: C, SuggestModal: C, MarkdownRenderChild: C,
    WorkspaceLeaf: C, debounce: f => f, setIcon: () => {}, addIcon: () => {} };
  const M = new Function('require', 'module', src +
    '\n;return {拆首行, 組首行, 蓋卡, 解析卡片, 定位文, 換日期, 改零件, 讀留言, 組留言行文, 顯示內文, 鍵由行們, 轉整份, 照打行, 讀編行, 擺ID, 照打段, 去卡縮排, 數舊寫法, 抓分區, 淨檔名, 截寬, 題限, 補ID, Canvas加節點, 成對方區, 接到尾, 月範圍字, 搬回尾Re, 換連結字, 連結尾, 嵌卡改連結, 顯示md};')(
    () => stub, { exports: {} });
  const out = [];
  const eq = (name, a, b) => out.push((a === b ? 'ok   ' : 'FAIL ') + name + (a === b ? '' : '\n   got: ' + JSON.stringify(a) + '\n  want: ' + JSON.stringify(b)));
  const 名單 = ['欣明', 'Alex'];
  M.解析卡片('', 名單);          // 跟外掛一樣:看板解析過一次,預設名單就有了(1.6.3)
  const 去戳 = (s) => s.replace(/\[ed:: \d{4}-\d{2}-\d{2} \d{2}:\d{2}\]/g, '[ed:: T]');
  // 蓋卡 on a lines array → joined text
  const 蓋 = (lines) => { const a = lines.slice(); M.蓋卡(a, 0, a.length - 1); return 去戳(a.join('\n')); };

  // ---- 新寫法 ----
  const N = '- [ ] [pin:: on] #訂貨 [start:: 2026-09-01] [due:: 2026-09-30] [repeat:: every 2 weeks] @欣明';
  const P = M.拆首行(N, 名單);
  eq('parse title', P.題, '訂貨');
  eq('parse range', P.起 + '|' + P.迄, '2026-09-01|2026-09-30');
  eq('parse pin/assignee/repeat', [P.頂, P.人, JSON.stringify(P.循)].join('|'), 'true|欣明|{"型":"週","隔":2}');
  eq('compose roundtrip', M.組首行(P), N);
  eq('single day -> due', M.組首行(M.拆首行('- [ ] [a] [due:: 2026-09-16]')), '- [ ] #a [due:: 2026-09-16]');
  eq('start only -> due', M.組首行(M.拆首行('- [ ] [a] [start:: 2026-09-16]')), '- [ ] #a [due:: 2026-09-16]');
  eq('paren fields + unknown kept', M.組首行(M.拆首行('- [x] [a] (due:: 2026-09-16) [completion:: 2026-09-17] [priority:: high]')),
    '- [x] #a [due:: 2026-09-16] [completion:: 2026-09-17] [priority:: high]');
  eq('pin off', M.拆首行('- [ ] [pin:: off] [a]').頂, false);
  eq('field is not title', M.拆首行('- [ ] [due:: 2026-09-16] 買牛奶').題, null);
  const L1 = M.拆首行('- [ ] [連結](https://x.com) [主題]');
  eq('1.6.6-B1 title after markdown link', [L1.題, L1.文].join('|'), '主題|[連結](https://x.com)');
  const L2 = M.拆首行('- [ ] [a](u1) [b](u2) [主題]');
  eq('1.6.6-B1 title after two markdown links', L2.題, '主題');

  // ---- 舊寫法轉換(蓋卡) ----
  eq('legacy 1.6.0 convert', 蓋(['- [ ] [訂貨] ．每樣兩箱 ＠{2026-09-11 ~ 2026-09-14} #欣明 📌 ✎{2026-09-10 09:12}', '\t．打給廠商了']),
    '- [ ] [pin:: on] #訂貨 [start:: 2026-09-11] [due:: 2026-09-14] @欣明\n\t- 每樣兩箱\n\t．打給廠商了\n\t[ed:: T]');
  eq('legacy repeat', 蓋(['- [x] [巡田] 🔁 every 2 weeks ．再看一次 #long-term ＠{2026-09-08}']),
    '- [x] #巡田 #long-term [due:: 2026-09-08] [repeat:: every 2 weeks]\n\t- 再看一次\n\t[ed:: T]');
  eq('1.6.1-dev convert', 蓋(['- [ ] [主題] Ed{26-09-16 01:31} @{2026-09-16} ~ @{2026-09-23} #欣明 Pin{} Re{every week}', '\t- 內容', '\t- Cm{26-09-16 09:00|欣明} 留']),
    '- [ ] [pin:: on] #主題 [start:: 2026-09-16] [due:: 2026-09-23] [repeat:: every week] @欣明\n\t- 內容\n\t- Cm{26-09-16 09:00|欣明} 留\n\t[ed:: T]');
  eq('titleless stays', 蓋(['- [ ] Buy milk @{2026-09-16}']), '- [ ] Buy milk [due:: 2026-09-16]\n\t[ed:: T]');
  eq('ed moves to end, trailing blank kept', 蓋(['- [ ] [a] [due:: 2026-09-16]', '\t- [ed:: 2026-01-01 00:00]', '\t- x', '']),
    '- [ ] #a [due:: 2026-09-16]\n\t- x\n\t[ed:: T]\n');
  eq('mid tag kept', 蓋(['- [ ] 打給 #bob 問報價 ＠{2026-09-16}']), '- [ ] 打給 #bob 問報價 [due:: 2026-09-16]\n\t[ed:: T]');
  eq('date change legacy keeps content', 蓋([M.換日期('- [ ] [訂貨] ．每樣兩箱 ＠{2026-09-11} #欣明', '2026-10-01', null)]),
    '- [ ] #訂貨 [due:: 2026-10-01] @欣明\n\t- 每樣兩箱\n\t[ed:: T]');
  eq('unpin', M.改零件(N, 名單, p => { p.頂 = false; }), N.replace('[pin:: on] ', ''));

  // ---- 解析:新舊一致 ----
  const legacyDoc = ['## 1', '', '- [ ] [訂貨] ．每樣兩箱,週五前要到 ＠{2026-09-11 ~ 2026-09-14} #欣明 📌 ✎{2026-09-10 09:12}',
    '\t．打給廠商了', '\t．💬{2026-09-11 14:20|欣明} 報價回來了'].join('\n');
  const conv = M.轉整份(legacyDoc, 名單);
  eq('convert text', conv.文, ['## 1', '', '- [ ] [pin:: on] #訂貨 [start:: 2026-09-11] [due:: 2026-09-14] @欣明',
    '\t- 每樣兩箱,週五前要到', '\t- 打給廠商了', '\t[cm:: 2026-09-11 14:20|欣明] 報價回來了', '\t[ed:: 2026-09-10 09:12]'].join('\n'));
  eq('convert idempotent', M.轉整份(conv.文, 名單).張, 0);
  // 1.7.6-D3:數舊寫法(確認框先列出來)
  eq('1.7.6-D3 count legacy', JSON.stringify(M.數舊寫法(legacyDoc, 名單)), '{"題括號":1,"井號人":1,"舊日期":1,"舊圖示":1,"其他":0}');
  eq('1.7.6-D3 count after convert = 0', JSON.stringify(M.數舊寫法(conv.文, 名單)), '{"題括號":0,"井號人":0,"舊日期":0,"舊圖示":0,"其他":0}');
  const 混 = ['- [ ] [[客戶A]] 回電 [due:: 2026-09-20]', '\t[ed:: 2026-09-20 10:00]',
    '- [ ] [訂貨 點貨] [due:: 2026-09-15] #欣明', '- [ ] [看](https://x.y) [報價] [due:: 2026-09-15]', '- [ ] #新 [due:: 2026-09-15] @欣明 #欣明'].join('\n');
  eq('1.7.6-D3 count mixed: [[link]] not a topic, link+[topic], @ wins',
    (({ 其他, ...前 }) => JSON.stringify(前))(M.數舊寫法(混, 名單)), '{"題括號":2,"井號人":1,"舊日期":0,"舊圖示":0}');
  const f = (k) => JSON.stringify([k.基鍵, k.主題, k.起日, k.迄日, k.置頂, k.指派, k.循環, k.內容行, k.留言, k.編修戳]);
  eq('parse same after convert', f(M.解析卡片(conv.文, 名單)[0]), f(M.解析卡片(legacyDoc, 名單)[0]));
  const kN = M.解析卡片(conv.文, 名單)[0];
  eq('edit stamp from last line', kN.編修時, '2026-09-10 09:12');
  eq('ed not content', kN.內容行.join('|'), '每樣兩箱,週五前要到|打給廠商了');

  // ---- 留言 / 記錄 ----
  eq('cm line', M.組留言行文('2026-09-17', '09:00', '欣明', '好'), '\t[cm:: 2026-09-17 09:00|欣明] 好');
  eq('cm parse', JSON.stringify(M.讀留言('[cm:: 2026-09-17 09:00|欣明] 好')), JSON.stringify({ 日: '2026-09-17', 分: '09:00', 人: '欣明', 文: '好', id: '2026-09-17 09:00|欣明' }));
  eq('done display', M.顯示內文('[done:: 2026-09-16]', { doneRec: '本次完成' }).indexOf('✔ 本次完成 26-09-16'), 0);
  eq('old dashed plugin lines still read', JSON.stringify(M.解析卡片(['- [ ] [a] [due:: 2026-09-16]', '\t- x', '\t- [cm:: 2026-09-17 09:00|欣明] 好', '\t- [ed:: 2026-09-17 10:00]'].join('\n'), 名單)[0].內容行) + M.解析卡片(['- [ ] [a]', '\t- [ed:: 2026-09-17 10:00]'].join('\n'), 名單)[0].編修時, '[\"x\"]2026-09-17 10:00');
  eq('done legacy display', M.顯示內文('Done{2026-09-16}', { doneRec: 'Done' }).indexOf('✔ Done 26-09-16'), 0);
  const rec = M.解析卡片(['- [ ] [施肥] [due:: 2026-09-16] [repeat:: every week]', '\t- 北區', '\t- [done:: 2026-09-09]', '\t- [ed:: 2026-09-16 10:00]'].join('\n'), 名單)[0];
  eq('record counted', rec.完成過, 1);
  eq('key skips record', rec.基鍵, '[施肥] 北區');

  // ---- 雙胞胎 / 待辦 ----
  const tw = ['## 1', '- [ ] [巡田] [due:: 2026-09-16]', '\t- A', '\t- [ed:: 2026-09-16 01:31]', '- [ ] [巡田] [due:: 2026-09-16]', '\t- B', '\t- [ed:: 2026-09-16 01:31]'].join('\n');
  const kt = M.解析卡片(tw, 名單);
  eq('twin keys differ', kt[0].鍵 !== kt[1].鍵, true);
  const 位 = M.定位文(tw, kt[1], 名單);
  eq('locate twin B', 位 && 位.卡.起, 4);
  eq('checkbox typed variants', ['-[ ]x', '[] y', '* - [x] z'].map(M.照打行).join('|'), '- [ ] x|- [ ] y|- [x] z');
  eq('pinned title-less key', M.解析卡片('- [ ] [pin:: on] [訂] [due:: 2026-09-16]\n\t- c', 名單)[0].基鍵, '[訂] c');

  // ---- 1.6.4 B3:^ct-… 接在 [ed::] 後面(Canvas 的卡片 ID,只讀不寫)----
  eq('ed with canvas id: timestamp + ID both parse',
    JSON.stringify(M.讀編行('\t[ed:: 2026-09-17 02:37] ^ct-abc123')),
    JSON.stringify({ 日: '2026-09-17', 分: '02:37', 秒: '00', ID: '^ct-abc123' }));
  eq('parsed card exposes k.ID',
    M.解析卡片(['- [ ] [a] [due:: 2026-09-16]', '\t[ed:: 2026-09-17 02:37] ^ct-abc123'].join('\n'), 名單)[0].ID,
    '^ct-abc123');
  // 1.6.8(刻意改的預期值):內容 `- x` 是子清單 → ID 照 ADR-001 D2 搬到它前面
  eq('1.6.8 rewrite keeps ID, placed before first sub-item',
    蓋(['- [ ] [a] [due:: 2026-09-16]', '\t- x', '\t[ed:: 2026-01-01 00:00] ^ct-abc123']),
    '- [ ] #a [due:: 2026-09-16]\n\t^ct-abc123\n\t- x\n\t[ed:: T]');
  eq('1.6.8 rewrite: bare ID line, no sub-list -> after [ed::]',
    蓋(['- [ ] #a', '\tfoo', '\t^ct-abc123']), '- [ ] #a\n\tfoo\n\t[ed:: T] ^ct-abc123');
  eq('card without ID unaffected by B3 (no trailing ID written)',
    蓋(['- [ ] [a] [due:: 2026-09-16]', '\t- x', '\t[ed:: 2026-01-01 00:00]']),
    '- [ ] #a [due:: 2026-09-16]\n\t- x\n\t[ed:: T]');
  eq('bare ^ct-… line with no [ed::] is not content',
    M.解析卡片(['- [ ] [a] [due:: 2026-09-16]', '\t- x', '\t^ct-abc123'].join('\n'), 名單)[0].內容行.join('|'),
    'x');

  // ---- 1.6.8 F2:擺ID(照卡片形狀擺,冪等)----
  const E = '\t[ed:: 2026-09-17 10:00]';
  const 擺 = (lines, id) => { const a = lines.slice(); const 迄 = M.擺ID(a, 0, a.length - 1, id); return a.join('\n') + '|' + 迄; };
  const 擺同 = (name, lines) => eq(name, 擺(lines, null), lines.join('\n') + '|' + (lines.length - 1));
  eq('擺ID no content -> ed tail', 擺(['- [ ] #a', E], '^ct-n'), '- [ ] #a\n' + E + ' ^ct-n|1');
  eq('擺ID plain content -> ed tail', 擺(['- [ ] #a', '\tfoo', E], '^ct-n'), '- [ ] #a\n\tfoo\n' + E + ' ^ct-n|2');
  eq('擺ID blank line inside', 擺(['- [ ] #a', '\tfoo', '', '\tbar', E], '^ct-n'), '- [ ] #a\n\tfoo\n\n\tbar\n' + E + ' ^ct-n|4');
  eq('擺ID with comment', 擺(['- [ ] #a', '\tfoo', '\t[cm:: 2026-09-17 09:00|欣明] 好', E], '^ct-n'),
    '- [ ] #a\n\tfoo\n\t[cm:: 2026-09-17 09:00|欣明] 好\n' + E + ' ^ct-n|3');
  eq('擺ID sub-list -> own line before it', 擺(['- [ ] #a', '\t- x', E], '^ct-n'), '- [ ] #a\n\t^ct-n\n\t- x\n' + E + '|3');
  eq('擺ID sub-list in the middle', 擺(['- [ ] #a', '\tfoo', '\t- [ ] sub', '\tbar', E], '^ct-n'),
    '- [ ] #a\n\tfoo\n\t^ct-n\n\t- [ ] sub\n\tbar\n' + E + '|5');
  eq('擺ID numbered sub-list', 擺(['- [ ] #a', '\t1. x', E], '^ct-n'), '- [ ] #a\n\t^ct-n\n\t1. x\n' + E + '|3');
  eq('擺ID only sub-list, no ed', 擺(['- [ ] #a', '\t- x'], '^ct-n'), '- [ ] #a\n\t^ct-n\n\t- x|2');
  eq('擺ID "- " inside code block is not a list', 擺(['- [ ] #a', '\t```', '\t- no', '\t```', E], '^ct-n'),
    '- [ ] #a\n\t```\n\t- no\n\t```\n' + E + ' ^ct-n|4');
  eq('擺ID old dashed comment is a list item', 擺(['- [ ] #a', '\tfoo', '\t- [cm:: 2026-09-17 09:00|欣明] 好', E], '^ct-n'),
    '- [ ] #a\n\tfoo\n\t^ct-n\n\t- [cm:: 2026-09-17 09:00|欣明] 好\n' + E + '|4');
  eq('擺ID no ed, no list -> own line after last content, trailing blank kept', 擺(['- [ ] #a', '\tfoo', ''], '^ct-n'),
    '- [ ] #a\n\tfoo\n\t^ct-n\n|3');
  擺同('擺ID idempotent: ed tail', ['- [ ] #a', '\tfoo', E + ' ^ct-abc123']);
  擺同('擺ID idempotent: before sub-list', ['- [ ] #a', '\t^ct-abc123', '\t- x', E]);
  擺同('擺ID no ID -> untouched', ['- [ ] #a', '\t- x', E]);
  eq('擺ID two IDs keep the top one', 擺(['- [ ] #a', '\t^ct-one', '\t- x', E + ' ^ct-two'], null), '- [ ] #a\n\t^ct-one\n\t- x\n' + E + '|3');
  eq('擺ID given id replaces the old', 擺(['- [ ] #a', '\tfoo', E + ' ^ct-old'], '^ct-new'), '- [ ] #a\n\tfoo\n' + E + ' ^ct-new|2');
  eq('擺ID moves misplaced ID (ed tail -> before list)', 擺(['- [ ] #a', '\t- x', E + ' ^ct-abc123'], null), '- [ ] #a\n\t^ct-abc123\n\t- x\n' + E + '|3');
  // 1.6.9-B1(ADR-001 D3):ID 被擠到子待辦 / 內容行尾巴 → 認得、寫的時候放回原位;code block 裡的不算
  eq('1.6.9-B1 ID on sub-todo tail is read', M.解析卡片(['- [ ] #a', '\t說明', '\t- [ ] 子 ^ct-sq0001', E].join('\n'), 名單)[0].ID, '^ct-sq0001');
  eq('1.6.9-B1 擺ID moves ID off the sub-todo tail', 擺(['- [ ] #a', '\t說明', '\t- [ ] 子 ^ct-sq0001', E], null),
    '- [ ] #a\n\t說明\n\t^ct-sq0001\n\t- [ ] 子\n' + E + '|4');
  eq('1.6.9-B1 擺ID moves ID off a plain content tail', 擺(['- [ ] #a', '\tfoo ^ct-sq0002', E], null), '- [ ] #a\n\tfoo\n' + E + ' ^ct-sq0002|2');
  擺同('1.6.9-B1 ^ct- inside a code block is left alone', ['- [ ] #a', '\t```', '\tx ^ct-incode', '\t```', E]);
  eq('1.6.9-B1 ^ct- inside a code block is not the card ID', M.解析卡片(['- [ ] #a', '\t```', '\tx ^ct-incode', '\t```', E].join('\n'), 名單)[0].ID, null);
  eq('收尾 bare ID line -> k.ID, not content, key unchanged',
    (k => [k.ID, k.內容行.join(','), k.基鍵].join('|'))(M.解析卡片(['- [ ] #a', '\t^ct-abc123', '\t- x', E].join('\n'), 名單)[0]),
    '^ct-abc123|x|[a] x');
  // ---- 1.6.9 F1:補ID(取多ID 由下往上)、Canvas加節點 ----
  {
    const 文 = ['## 1', '- [ ] #a', '\t- x', E, '- [ ] #b', '\tfoo', E + ' ^ct-bbb111', '- [ ] #c', E, '- [ ] #d', E + ' ^ct-bbb111', ''].join('\n');
    const 行 = 文.split('\n'), 有 = new Set(文.match(/\^ct-[A-Za-z0-9_-]+/g) || []);
    const 卡 = M.解析卡片(文, 名單);
    const 得 = {};
    卡.slice().sort((a, b) => b.起 - a.起).forEach(k => { 得[k.主題] = M.補ID(行, k, 有); });
    const 後 = M.解析卡片(行.join('\n'), 名單);
    eq('補ID many bottom-up: each card has its own ID', 後.map(k => k.ID === 得[k.主題]).join(','), 'true,true,true,true');
    eq('補ID many: all distinct', new Set(後.map(k => k.ID)).size, 4);
    eq('補ID duplicate ID sent together: one keeps it, the other gets a new one', [得.b, 得.d].filter(x => x === '^ct-bbb111').length, 1);
    const 單 = ['## 1', '- [ ] #b', '\tfoo', E + ' ^ct-bbb111'];
    eq('補ID unique existing ID -> unchanged', M.補ID(單.slice(), M.解析卡片(單.join('\n'), 名單)[0], new Set(['^ct-bbb111'])), '^ct-bbb111');
    eq('補ID sub-list card -> own line', 行.slice(1, 4).join('|').replace(/\^ct-\w+/, 'ID'), '- [ ] #a|\tID|\t- x');
  }
  {
    const 節 = [{ 路徑: 'a/b.md', id: '^ct-aaa111', 高: 120 }, { 路徑: 'a/b.md', id: '^ct-bbb222', 高: 200 }];
    const 空 = M.Canvas加節點('', 節);
    const d = JSON.parse(空.文);
    eq('Canvas加節點 empty file -> 2 file nodes', [空.加, 空.已有, d.nodes.length, d.edges.length].join(','), '2,0,2,0');
    eq('Canvas加節點 node shape', [d.nodes[0].type, d.nodes[0].file, d.nodes[0].subpath, d.nodes[0].x, d.nodes[0].y, d.nodes[0].width, d.nodes[0].height, /^[0-9a-f]{16}$/.test(d.nodes[0].id)].join(','),
      'file,a/b.md,#^ct-aaa111,0,0,400,120,true');
    eq('1.7.2-U1 Canvas加節點 two -> side by side', [d.nodes[1].x, d.nodes[1].y].join(), '420,0');
    const 九 = Array.from({ length: 9 }, (_, i) => ({ 路徑: 'a.md', id: '^ct-n' + i, 寬: i === 2 ? 500 : 400, 高: i === 5 ? 300 : 100 }));
    const g = M.Canvas加節點('', 九), dg = JSON.parse(g.文).nodes;
    eq('U1 grid: 4 per row, col = widest + 20, row = tallest + 20', [dg[3].x, dg[4].x, dg[4].y, dg[8].y, g.群].join(), '1560,0,120,440,false');
    const gg = M.Canvas加節點('', 九, '工作'), dgg = JSON.parse(gg.文).nodes;
    eq('U1 group first, wraps the cards (40 margin)', [gg.群, dgg.length, dgg[0].type, dgg[0].label, dgg[0].x, dgg[0].y, dgg[0].width, dgg[0].height, dgg[1].x, dgg[1].y].join(),
      'true,10,group,工作,0,0,2140,620,40,40');
    eq('U1 group: all already there -> no group', M.Canvas加節點(gg.文, 九, '工作').群, false);
    const 有 = JSON.stringify({ nodes: [{ id: 'x', type: 'text', text: 'hi', x: -100, y: 50, width: 300, height: 100 },
      { id: 'y', type: 'file', file: 'a/b.md', subpath: '#^ct-bbb222', x: 0, y: -30, width: 400, height: 100 }], edges: [{ id: 'e' }] }, null, '\t');
    const r = M.Canvas加節點(有, 節), d2 = JSON.parse(r.文);
    eq('Canvas加節點 existing -> right of everything, top-aligned, dup skipped', [r.加, r.已有, d2.nodes.length, d2.nodes[2].x, d2.nodes[2].y, d2.edges.length].join(','), '1,1,3,460,-30,1');
    eq('Canvas加節點 keeps other nodes untouched', JSON.stringify(d2.nodes.slice(0, 2)), JSON.stringify(JSON.parse(有).nodes));
    const 全有 = M.Canvas加節點(r.文, 節);
    eq('Canvas加節點 all already there -> text unchanged', [全有.加, 全有.已有, 全有.文 === r.文].join(','), '0,2,true');
    eq('CR-1.6.9-01 Canvas加節點 uses the given width', JSON.parse(M.Canvas加節點('', [{ 路徑: 'a.md', id: '^ct-w', 寬: 560, 高: 700 }]).文).nodes[0].width, 560);
    eq('Canvas加節點 broken JSON -> null', M.Canvas加節點('{"nodes": [', 節), null);
    eq('Canvas加節點 JSON array -> null', M.Canvas加節點('[]', 節), null);
  }
  const 有ID文 = ['## 1', '', '- [ ] #a [due:: 2026-09-16]', '\t- x', E + ' ^ct-abc123', '- [ ] #b', '\tfoo', E + ' ^ct-def456', ''].join('\n');
  const 轉ID = M.轉整份(有ID文, 名單);
  eq('1.6.8-B1 轉整份 keeps ID, places by shape',
    轉ID.文, ['## 1', '', '- [ ] #a [due:: 2026-09-16]', '\t^ct-abc123', '\t- x', E, '- [ ] #b', '\tfoo', E + ' ^ct-def456', ''].join('\n'));
  eq('1.6.8-B1 轉整份 with ID idempotent', M.轉整份(轉ID.文, 名單).張, 0);

  // ---- 1.6.2 B3:內容照你打的存(縮排、空行、行中的空白) ----
  const 原 = (s) => JSON.stringify(M.解析卡片(s, 名單)[0].內容原);
  eq('raw content keeps nesting, blank line, spaces',
    原(['- [ ] [a] [due:: 2026-09-16]', '\t- parent', '\t\t- child', '', '\t---', '\t| a   | b   |', '\t[cm:: 2026-09-17 09:00|欣明] 留', '\t[ed:: 2026-09-17 10:00]', ''].join('\n')),
    JSON.stringify(['- parent', '\t- child', '', '---', '| a   | b   |']));
  eq('照打段 keeps what was typed',
    JSON.stringify(M.照打段('\n- parent\n\t- child\n\n---\n| a   | b   |   \n[] todo\n．舊符號\n\n')),
    JSON.stringify(['- parent', '\t- child', '', '---', '| a   | b   |', '- [ ] todo', '- 舊符號']));
  eq('base indent made of spaces', JSON.stringify(M.去卡縮排(['    \t- a', '    \t\t- b', ''])), JSON.stringify(['- a', '\t- b', '']));
  eq('mixed indent: one level each', JSON.stringify(M.去卡縮排(['\tx', '    y'])), JSON.stringify(['x', 'y']));
  eq('trailing tag is a topic (1.6.3)', 原('- [ ] [a] [due:: 2026-09-16] #tag\n\t- x\n\t\t- y'), JSON.stringify(['- x', '\t- y']));
  eq('titleless first line leads raw', 原('- [ ] buy milk [due:: 2026-09-16]\n\t- a\n\t\t- b'), JSON.stringify(['buy milk', '- a', '\t- b']));
  eq('done record stays in raw', 原('- [ ] [施肥] [repeat:: every week]\n\t北區\n\t[done:: 2026-09-09]\n\t[ed:: 2026-09-16 10:00]'), JSON.stringify(['北區', '[done:: 2026-09-09]']));
  eq('key unchanged by nesting', M.解析卡片('- [ ] [a]\n\t- p\n\t\t- c', 名單)[0].基鍵, '[a] p');
  const 往返 = ['- [ ] [a] [due:: 2026-09-16]', '\t- p', '\t\t- c', '', '\t| x   | y |', '\t[ed:: 2026-09-17 10:00]'].join('\n');
  eq('raw -> 照打段 is a no-op', JSON.stringify(M.照打段(M.解析卡片(往返, 名單)[0].內容原.join('\n'))), 原(往返));

  // ---- 1.6.3(ADR 1.6.3-01)#主題(最多 3 個)、@指派人 ----
  const A = M.拆首行('- [ ] #UX-review #訂貨 [due:: 2026-09-16] @Alex', 名單);
  eq('adr parse topics', A.題 + '|' + A.題們.length + '|' + A.人, 'UX-review 訂貨|2|Alex');
  eq('adr roundtrip', M.組首行(A), '- [ ] #UX-review #訂貨 [due:: 2026-09-16] @Alex');
  eq('adr legacy spaced title', M.組首行(M.拆首行('- [ ] [UX review] [due:: 2026-09-16]')), '- [ ] #UX-review [due:: 2026-09-16]');
  eq('adr key same old/new', M.解析卡片('- [ ] [UX review]\n\t- c', 名單)[0].基鍵, M.解析卡片('- [ ] #UX-review\n\t- c', 名單)[0].基鍵);
  const 四 = M.拆首行('- [ ] #a #b #c #d', 名單);
  eq('adr max 3 topics', 四.題們.join(',') + '|' + 四.標籤.join(','), 'a,b,c|#d');
  eq('adr 4th tag kept', M.組首行(四), '- [ ] #a #b #c #d');
  eq('adr leading tag + content', 蓋(['- [ ] #訂貨 買牛奶']), '- [ ] #訂貨\n\t買牛奶\n\t[ed:: T]');
  eq('adr email is not assignee', M.拆首行('- [ ] 寄給 a@b.com', 名單).人, null);
  eq('adr email untouched', 蓋(['- [ ] 寄給 a@b.com']), '- [ ] 寄給 a@b.com\n\t[ed:: T]');
  eq('adr kanban time not assignee', M.拆首行('- [ ] x @@{10:00}', 名單).人, null);
  const K = M.拆首行('- [ ] #a @Kelly-Wu', ['Kelly Wu']);
  eq('adr name with space maps to list', K.人 + '|' + M.組首行(K), 'Kelly Wu|- [ ] #a @Kelly-Wu');
  eq('adr legacy #name is assignee', JSON.stringify([M.拆首行('- [ ] 買牛奶 #欣明', 名單).人, M.拆首行('- [ ] 買牛奶 #欣明', 名單).題]), '["欣明",null]');
  eq('adr number tag is not topic', M.拆首行('- [ ] 房號 #123', 名單).題, null);
  eq('adr mid tag not topic', M.拆首行('- [ ] 打給 #bob 問報價', 名單).題, null);
  const 新檔 = ['## 1', '- [ ] #a #b [due:: 2026-09-16] @欣明', '\t- x', '\t[ed:: 2026-09-17 10:00]'].join('\n');
  eq('adr convert new doc no-op', M.轉整份(新檔, 名單).張, 0);
  const kA = M.解析卡片(新檔, 名單)[0];
  eq('adr card fields', JSON.stringify([kA.主題, kA.主題們, kA.指派, kA.內容行]), JSON.stringify(['a b', ['a', 'b'], '欣明', ['x']]));

  // ---- 1.6.3(U43–U46)封存區的移出 / 整批刪除:抓分區 ----
  const 份 = ['# 標頭', '', '## 1', '- [ ] #a', '\t內容', '', '## Archive/2025 秋季', '- [ ] #b', '\t- x', '- [x] #c', '',
    '## 2', '- [ ] #d', ''].join('\n');
  const 切 = M.抓分區(份, 'Archive/2025 秋季');
  eq('cut section text', 切.段, '## Archive/2025 秋季\n- [ ] #b\n\t- x\n- [x] #c\n');
  eq('cut section count', 切.張, 2);
  eq('cut section rest', 切.剩, ['# 標頭', '', '## 1', '- [ ] #a', '\t內容', '', '## 2', '- [ ] #d', ''].join('\n'));
  eq('cut section missing', M.抓分區(份, 'Archive/沒有這一區'), null);
  eq('cut section empty name', M.抓分區(份, ''), null);
  // ---- 1.7.1(ADR-002 D4/D5/D9)成對方區、接到尾、月範圍字 ----
  eq('to archive: head + archived', M.成對方區(切.段, '2025 秋季', '2026-09-23', '', ''),
    '## 2025 秋季\n[archived:: 2026-09-23]\n- [ ] #b\n\t- x\n- [x] #c\n');
  eq('to archive: same name → (day), then (day 2)', M.成對方區('## x\n- [ ] #a', 'y', '2026-09-23', '## y\n## y (2026-09-23)', ' (2026-09-23)').split('\n')[0], '## y (2026-09-23 2)');
  eq('back: no archived line, (搬回 day)', M.成對方區('## y (2026-09-23)\n[archived:: 2026-09-23]\n- [ ] #a', 'y', null, '## y', ' (搬回 2026-09-24)'), '## y (搬回 2026-09-24)\n- [ ] #a\n');
  const 撞 = M.成對方區('## x\n- [ ] #a\n\t[ed:: 2026-09-10 09:00] ^ct-aaaaaa\n- [ ] #b\n\t[ed:: 2026-09-10 09:00] ^ct-bbbbbb', 'x', null, '- [ ] #z\n\t[ed:: 2026-09-10 09:00] ^ct-aaaaaa', '');
  eq('D9 clash renewed, other kept', [/\^ct-aaaaaa/.test(撞), /\^ct-bbbbbb/.test(撞), /\[ed:: 2026-09-10 09:00\] \^ct-[a-z0-9]{6}\n/.test(撞)].join(), 'false,true,true');
  // ---- 1.7.2 B1 / F1 ----
  const 記 = {}, 撞2 = M.成對方區('## x\n- [ ] #a\n\t^ct-aaaaaa\n- [ ] #b\n\t^ct-bbbbbb', 'Archive/x', null, '## Archive/x\n- [ ] #z\n\t^ct-aaaaaa', ' (搬回 2026-09-24)', 記);
  eq('F1 記: final name + renamed id only', [記.名, 記.換.size, 記.換.get('^ct-aaaaaa') === (撞2.match(/\^ct-\w+/) || [])[0], 記.換.has('^ct-bbbbbb')].join(), 'Archive/x (搬回 2026-09-24),1,true,false');
  eq('B1 back tail regex', ['x (搬回 2026-09-24)', 'x (moved back 2026-09-24 2)', 'x (2026-09-24)', 'x 搬回 2026-09-24'].map(s => s.replace(M.搬回尾Re, '')).join('|'), 'x|x|x (2026-09-24)|x 搬回 2026-09-24');
  eq('F1 link: embed + alias kept', M.換連結字('![[2026卡片日誌#^ct-abc|看這張]]', 'A/2026卡片日誌 Archive', '^ct-xyz'), '![[A/2026卡片日誌 Archive#^ct-xyz|看這張]]');
  eq('F1 link: heading', M.換連結字('[[板#Archive/工作]]', '板 Archive', '工作 (2026-09-23)'), '[[板 Archive#工作 (2026-09-23)]]');
  eq('F1 link: markdown style untouched', M.換連結字('[x](板.md#^ct-abc)', '板 Archive', '^ct-abc'), '[x](板.md#^ct-abc)');
  const 假mc = { getFirstLinkpathDest: (p) => p === '板' ? 'SRC' : null }, 中 = (t) => t === '^ct-abc' || t === 'Archive/工作';
  eq('F1 canvas text link match', ['![[板#^ct-abc]]', '[[板#Archive/工作|x]]', '[[別#^ct-abc]]', '[[板#^ct-zzz]]', '[[#^ct-abc]]'].map(s => M.連結尾(s, 'SRC', 'c.canvas', 中, 假mc)).join('|'), '^ct-abc|Archive/工作|||');
  // ---- CR-1.7.2-04:卡片裡的卡片只當連結 ----
  eq('CR-04 card embed → link, alias kept; image / note embed untouched', M.嵌卡改連結('看 ![[板#^ct-abc|這張]] ![[圖.png]] ![[筆記#段]] [[板#^ct-x]]'), '看 [[板#^ct-abc|這張]] ![[圖.png]] ![[筆記#段]] [[板#^ct-x]]');
  eq('CR-04 written content line', M.照打段('打給 ![[板#^ct-abc]]\n\t- ![[板#^ct-def]]').join('|'), '打給 [[板#^ct-abc]]|\t- [[板#^ct-def]]');
  eq('CR-04 written comment', M.組留言行文('2026-09-23', '09:00', 'A', '見 ![[板#^ct-abc]]'), '\t[cm:: 2026-09-23 09:00|A] 見 [[板#^ct-abc]]');
  eq('CR-04 shown as link (old notes untouched on disk)', M.顯示md(['\t![[板#^ct-abc]]', '\t![[圖.png]]'], { doneRec: 'x' }), '\t[[板#^ct-abc]]\n\t![[圖.png]]');
  eq('append to end', M.接到尾('---\na: 1\n---\n## 1\n\n\n', '## x\n'), '---\na: 1\n---\n## 1\n\n## x\n');
  eq('month range', [M.月範圍字([{ 起日: '2026-09-01', 迄日: '2026-09-30' }]), M.月範圍字([{ 起日: '2025-11-02', 迄日: '2025-11-02' }, { 起日: null }, { 起日: '2026-01-01', 迄日: '2026-09-03' }]), M.月範圍字([{}])].join('|'), '2026-09|2025-11 – 2026-09|');
  // 同名的標題出現兩次 → 兩段都算
  const 兩份 = ['## Archive/x', '- [ ] #a', '## 1', '- [ ] #b', '## Archive/x', '- [ ] #c'].join('\n');
  const 切2 = M.抓分區(兩份, 'Archive/x');
  eq('cut section twice', 切2.張 + '|' + 切2.剩, '2|## 1\n- [ ] #b');
  // 縮排的 - [ ] 不算一張卡片(跟 解析卡片 同一條規則)
  eq('cut section indented not a card', M.抓分區(['## Archive/y', '- [ ] #a', '\t- [ ] 子待辦'].join('\n'), 'Archive/y').張, 1);
  eq('safe filename', M.淨檔名('2025/秋季: <專案>?-card table-archive'), '2025-秋季- -專案-card table-archive');
  eq('safe filename fallback', M.淨檔名('///'), 'archive');
  // C22 / U16(使用者 09-20:「# 不超過 6 個中文字」):膠囊上最多 6 個中文字寬 = 12
  eq('topic width 6 zh', M.截寬('一二三四五六七八', 12), '一二三四五六…');
  eq('topic width keeps short', M.截寬('一二三四五六', 12), '一二三四五六');
  eq('topic width en', M.截寬('abcdefghijklmno', 12), 'abcdefghijkl…');
  // C22(使用者 09-20:「要限制使用者不能打超過六個字」)新打的主題:截掉、不補「…」
  eq('topic limit zh', M.題限('一二三四五六七八'), '一二三四五六');
  eq('topic limit en', M.題限('abcdefghijklmno'), 'abcdefghijkl');
  eq('topic limit short', M.題限('訂貨'), '訂貨');
  return out.join('\n');
})()
