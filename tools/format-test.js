/* 卡片看板:格式純函式測試(不寫檔)。
   用法:obsidian eval code="eval(require('fs').readFileSync('<repo>/tools/format-test.js','utf8'))"
   每一行 ok / FAIL;全部 ok 才算過。 */
(() => {
  const fs = require('fs');
  // 測的是 vault 裡**已經部署**的 main.js(先複製、重載再跑,見技能 card-table-format-test)
  const path = require('path');
  const src = fs.readFileSync(path.join(app.vault.adapter.basePath, app.plugins.manifests['card-table'].dir, 'main.js'), 'utf8');
  const C = class {};
  const stub = { Plugin: C, TextFileView: C, PluginSettingTab: C, Setting: C, Notice: C, Menu: C, Modal: C,
    WorkspaceLeaf: C, debounce: f => f, setIcon: () => {}, addIcon: () => {} };
  const M = new Function('require', 'module', src +
    '\n;return {拆首行, 組首行, 蓋卡, 解析卡片, 定位文, 換日期, 改零件, 讀留言, 組留言行文, 顯示內文, 鍵由行們, 轉整份, 照打行, 讀編行, 照打段, 去卡縮排};')(
    () => stub, { exports: {} });
  const out = [];
  const eq = (name, a, b) => out.push((a === b ? 'ok   ' : 'FAIL ') + name + (a === b ? '' : '\n   got: ' + JSON.stringify(a) + '\n  want: ' + JSON.stringify(b)));
  const 名單 = ['欣明', 'Alex'];
  const 去戳 = (s) => s.replace(/\[ed:: \d{4}-\d{2}-\d{2} \d{2}:\d{2}\]/g, '[ed:: T]');
  // 蓋卡 on a lines array → joined text
  const 蓋 = (lines) => { const a = lines.slice(); M.蓋卡(a, 0, a.length - 1); return 去戳(a.join('\n')); };

  // ---- 新寫法 ----
  const N = '- [ ] [pin:: on] [訂貨] [start:: 2026-09-01] [due:: 2026-09-30] [repeat:: every 2 weeks] #欣明';
  const P = M.拆首行(N, 名單);
  eq('parse title', P.題, '訂貨');
  eq('parse range', P.起 + '|' + P.迄, '2026-09-01|2026-09-30');
  eq('parse pin/assignee/repeat', [P.頂, P.人, JSON.stringify(P.循)].join('|'), 'true|欣明|{"型":"週","隔":2}');
  eq('compose roundtrip', M.組首行(P), N);
  eq('single day -> due', M.組首行(M.拆首行('- [ ] [a] [due:: 2026-09-16]')), '- [ ] [a] [due:: 2026-09-16]');
  eq('start only -> due', M.組首行(M.拆首行('- [ ] [a] [start:: 2026-09-16]')), '- [ ] [a] [due:: 2026-09-16]');
  eq('paren fields + unknown kept', M.組首行(M.拆首行('- [x] [a] (due:: 2026-09-16) [completion:: 2026-09-17] [priority:: high]')),
    '- [x] [a] [due:: 2026-09-16] [completion:: 2026-09-17] [priority:: high]');
  eq('pin off', M.拆首行('- [ ] [pin:: off] [a]').頂, false);
  eq('field is not title', M.拆首行('- [ ] [due:: 2026-09-16] 買牛奶').題, null);

  // ---- 舊寫法轉換(蓋卡) ----
  eq('legacy 1.6.0 convert', 蓋(['- [ ] [訂貨] ．每樣兩箱 ＠{2026-09-11 ~ 2026-09-14} #欣明 📌 ✎{2026-09-10 09:12}', '\t．打給廠商了']),
    '- [ ] [pin:: on] [訂貨] [start:: 2026-09-11] [due:: 2026-09-14] #欣明\n\t- 每樣兩箱\n\t．打給廠商了\n\t[ed:: T]');
  eq('legacy repeat', 蓋(['- [x] [巡田] 🔁 every 2 weeks ．再看一次 #long-term ＠{2026-09-08}']),
    '- [x] [巡田] [due:: 2026-09-08] [repeat:: every 2 weeks] #long-term\n\t- 再看一次\n\t[ed:: T]');
  eq('1.6.1-dev convert', 蓋(['- [ ] [主題] Ed{26-09-16 01:31} @{2026-09-16} ~ @{2026-09-23} #欣明 Pin{} Re{every week}', '\t- 內容', '\t- Cm{26-09-16 09:00|欣明} 留']),
    '- [ ] [pin:: on] [主題] [start:: 2026-09-16] [due:: 2026-09-23] [repeat:: every week] #欣明\n\t- 內容\n\t- Cm{26-09-16 09:00|欣明} 留\n\t[ed:: T]');
  eq('titleless stays', 蓋(['- [ ] Buy milk @{2026-09-16}']), '- [ ] Buy milk [due:: 2026-09-16]\n\t[ed:: T]');
  eq('ed moves to end, trailing blank kept', 蓋(['- [ ] [a] [due:: 2026-09-16]', '\t- [ed:: 2026-01-01 00:00]', '\t- x', '']),
    '- [ ] [a] [due:: 2026-09-16]\n\t- x\n\t[ed:: T]\n');
  eq('mid tag kept', 蓋(['- [ ] 打給 #bob 問報價 ＠{2026-09-16}']), '- [ ] 打給 #bob 問報價 [due:: 2026-09-16]\n\t[ed:: T]');
  eq('date change legacy keeps content', 蓋([M.換日期('- [ ] [訂貨] ．每樣兩箱 ＠{2026-09-11} #欣明', '2026-10-01', null)]),
    '- [ ] [訂貨] [due:: 2026-10-01] #欣明\n\t- 每樣兩箱\n\t[ed:: T]');
  eq('unpin', M.改零件(N, 名單, p => { p.頂 = false; }), N.replace('[pin:: on] ', ''));

  // ---- 解析:新舊一致 ----
  const legacyDoc = ['## 1', '', '- [ ] [訂貨] ．每樣兩箱,週五前要到 ＠{2026-09-11 ~ 2026-09-14} #欣明 📌 ✎{2026-09-10 09:12}',
    '\t．打給廠商了', '\t．💬{2026-09-11 14:20|欣明} 報價回來了'].join('\n');
  const conv = M.轉整份(legacyDoc, 名單);
  eq('convert text', conv.文, ['## 1', '', '- [ ] [pin:: on] [訂貨] [start:: 2026-09-11] [due:: 2026-09-14] #欣明',
    '\t- 每樣兩箱,週五前要到', '\t- 打給廠商了', '\t[cm:: 2026-09-11 14:20|欣明] 報價回來了', '\t[ed:: 2026-09-10 09:12]'].join('\n'));
  eq('convert idempotent', M.轉整份(conv.文, 名單).張, 0);
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
  eq('title tags join first raw line', 原('- [ ] [a] [due:: 2026-09-16] #tag\n\t- x\n\t\t- y'), JSON.stringify(['- x #tag', '\t- y']));
  eq('titleless first line leads raw', 原('- [ ] buy milk [due:: 2026-09-16]\n\t- a\n\t\t- b'), JSON.stringify(['buy milk', '- a', '\t- b']));
  eq('done record stays in raw', 原('- [ ] [施肥] [repeat:: every week]\n\t北區\n\t[done:: 2026-09-09]\n\t[ed:: 2026-09-16 10:00]'), JSON.stringify(['北區', '[done:: 2026-09-09]']));
  eq('key unchanged by nesting', M.解析卡片('- [ ] [a]\n\t- p\n\t\t- c', 名單)[0].基鍵, '[a] p');
  const 往返 = ['- [ ] [a] [due:: 2026-09-16]', '\t- p', '\t\t- c', '', '\t| x   | y |', '\t[ed:: 2026-09-17 10:00]'].join('\n');
  eq('raw -> 照打段 is a no-op', JSON.stringify(M.照打段(M.解析卡片(往返, 名單)[0].內容原.join('\n'))), 原(往返));
  return out.join('\n');
})()
