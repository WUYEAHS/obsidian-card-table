/* 卡片看板:真的看板上的寫入測試(會建一份 ZZ-board-test.md,測完丟垃圾桶;設定不會被寫進 data.json)。
   用法(非同步,分兩次 eval):
     obsidian eval code="eval(require('fs').readFileSync('<repo>/tools/board-test.js','utf8'))"
     (等 30–40 秒)
     obsidian eval code="window.__ctBoardTest"
   每一行 ok / FAIL;最後一行是 DONE 才算跑完。 */
window.__ctBoardTest = 'running';
(async () => {
  const P = app.plugins.plugins['card-table'];
  const 原存 = P.存設定;
  const 原設 = JSON.parse(JSON.stringify(P.設定));
  P.存設定 = async () => {};
  const out = [];
  const ok = (名, 真, 附) => out.push((真 ? 'ok   ' : 'FAIL ') + 名 + (真 ? '' : '  ' + JSON.stringify(附)));
  const 等 = (ms) => new Promise(r => setTimeout(r, ms));
  const 人 = (P.設定.指派人 || [])[0] || '測試人';
  const path = 'ZZ-board-test.md';
  let f = app.vault.getAbstractFileByPath(path);
  if (f) await app.vault.delete(f);
  const 初 = [
    '## 1', '',
    '- [ ] [訂貨] ．每樣兩箱 ＠{2026-09-16 ~ 2026-09-18} #' + 人 + ' 📌 ✎{2026-09-10 09:12}',
    '\t．打給廠商了',
    '\t．💬{2026-09-11 14:20|' + 人 + '} 報價回來了',
    '',
    '- [ ] [巡田] 🔁 every week ．看那棵 ＠{2026-09-16}',
    '',
    '- [ ] 沒主題的舊卡 ＠{2026-09-16}',
    '',
    '## 2', ''
  ].join('\n');
  f = await app.vault.create(path, 初);
  const leaf = app.workspace.getLeaf(true);
  await leaf.setViewState({ type: 'card-table', state: { file: path } });
  await 等(800);
  const v = leaf.view;
  const 讀 = () => app.vault.read(f);
  const 卡段 = (文, 題) => {           // 某張卡片的所有行(到下一張卡片或標題為止)
    const 行 = 文.split('\n');
    const i = 行.findIndex(t => /^- \[[ xX]\]/.test(t) && t.includes(題));
    if (i < 0) return [];
    let j = i + 1;
    while (j < 行.length && (/^[ \t]/.test(行[j]) || !行[j].trim())) j++;
    return 行.slice(i, j).filter(t => t.trim());
  };
  const 尾是ed = (段) => /^\t\[ed:: \d{4}-\d{2}-\d{2} \d{2}:\d{2}\]$/.test(段[段.length - 1] || '');
  try {
    // 1. 打勾一張舊卡片 → 轉成新寫法,ed 在最後
    let k = v.卡片.find(x => x.主題 === '訂貨');
    await v.切完成(k); await 等(400);
    let 段 = 卡段(await 讀(), '[訂貨]');
    ok('done converts first line', /^- \[x\] (\[pin:: on\] )?\[訂貨\] \[start:: 2026-09-16\] \[due:: 2026-09-18\] #/.test(段[0]), 段[0]);
    ok('legacy content moved to line 2', 段[1] === '\t- 每樣兩箱', 段[1]);
    ok('untouched legacy lines kept', 段.includes('\t．打給廠商了'), 段);
    ok('ed is last line', 尾是ed(段), 段);
    // 2. 馬上反悔(同一個卡片物件)
    await v.切完成(k); await 等(400);
    段 = 卡段(await 讀(), '[訂貨]');
    ok('undo with same object', /^- \[ \]/.test(段[0]), 段[0]);
    ok('only one ed line', 段.filter(t => t.includes('[ed::')).length === 1, 段);
    // 3. 改日期(區間)
    k = v.卡片.find(x => x.主題 === '巡田');
    await v.設日期(k, '2026-09-20', '2026-09-22'); await 等(400);
    段 = 卡段(await 讀(), '[巡田]');
    ok('range written as start/due', 段[0].includes('[start:: 2026-09-20] [due:: 2026-09-22]') && 段[0].includes('[repeat:: every week]'), 段[0]);
    // 4. 改內容(含待辦、自己打的符號)
    k = v.卡片.find(x => x.主題 === '巡田');
    const r = await P.寫手.換內容(f, k, '看那棵\n-[ ] 帶藥\n* 自己的符號', v.名單);
    ok('換內容 returns new key', typeof r === 'string' && r.startsWith('[巡田]'), r);
    await 等(400);
    // 5. 勾內容裡的待辦
    k = v.卡片.find(x => x.主題 === '巡田');
    await v.切內勾(k, '[ ] 帶藥', true); await 等(400);
    // 6. 本次完成
    k = v.卡片.find(x => x.主題 === '巡田');
    await v.本次完成(k); await 等(400);
    // 7. 留言 + 改留言
    k = v.卡片.find(x => x.主題 === '巡田');
    await v.送留言(k, 'Tester', '第一則\n第二行'); await 等(400);
    k = v.卡片.find(x => x.主題 === '巡田');
    await v.存留言(k, k.留言[0], '改過的留言'); await 等(400);
    段 = 卡段(await 讀(), '[巡田]');
    ok('content as typed', 段[1] === '\t看那棵' && 段.includes('\t* 自己的符號'), 段);
    ok('todo ticked', 段.includes('\t- [x] 帶藥'), 段);
    ok('plugin lines have no bullet', 段.filter(t => /\[(done|cm|ed)::/.test(t)).every(t => /^\t\[/.test(t)), 段);
    const 記i = 段.findIndex(t => t.includes('[done:: 2026-09-20]'));
    const 留i = 段.findIndex(t => t.includes('[cm:: ') && t.endsWith('改過的留言'));
    ok('order: content → done → comment → ed', 記i > 0 && 留i > 記i && 尾是ed(段), 段);
    ok('repeat moved date forward', /\[due:: 2026-09-2[7-9]\]|\[due:: 2026-\d\d-\d\d\]/.test(段[0]) && !段[0].includes('[start:: 2026-09-20]'), 段[0]);
    // 8. 沒主題的舊卡:置頂
    k = v.卡片.find(x => !x.主題);
    await v.切置頂(k); await 等(400);
    段 = 卡段(await 讀(), '沒主題的舊卡');
    ok('titleless pinned', 段[0] === '- [ ] [pin:: on] 沒主題的舊卡 [due:: 2026-09-16]' && 尾是ed(段), 段);
    // 9. 新增:只有主題
    v.狀態.新主題 = '只有主題'; v.狀態.新內容 = '';
    if (v.內輸) v.內輸.value = '';
    await v.送出新增(); await 等(500);
    段 = 卡段(await 讀(), '[只有主題]');
    ok('title-only card has no content', 段.length === 2 && 尾是ed(段), 段);
    // 10. 融合兩張
    await v.做融合(v.卡片.filter(x => x.主題 === '只有主題' || x.主題 === '巡田')); await 等(500);
    // 11. 封存
    k = v.卡片.find(x => !x.主題);
    await v.切封存(k, false); await 等(500);
    const 文 = await 讀();
    ok('archive section', /## Archive[\s\S]*沒主題的舊卡/.test(文), '');
    // 每一張被寫過的卡片最後一行都是 ed
    const 寫過 = ['[巡田]', '[訂貨]', '沒主題的舊卡'].map(t => 卡段(文, t));
    ok('every touched card ends with ed', 寫過.every(尾是ed), 寫過);
    ok('cards parse', v.卡片.length >= 2 && v.卡片.every(x => x.編修戳), v.卡片.map(x => [x.主題, x.編修戳]));
    // 12. 全部轉換(同資料夾備份)
    const 前 = await 讀();
    const c = await P.寫手.轉新格式(f, v.名單);
    const 備 = c && c.備份 && app.vault.getAbstractFileByPath(c.備份);
    ok('convert backup next to note', !!備 && 備.parent.path === f.parent.path && (await app.vault.read(備)) === 前, c);
    const 後 = await 讀();
    ok('convert leaves no legacy markers', !/[＠✎📌🔁💬]|\bEd\{|\bPin\{|\bRe\{|\bCm\{|Done\{/.test(後), 後);
    const c2 = await P.寫手.轉新格式(f, v.名單);
    ok('convert twice = 0', c2 && c2.張 === 0, c2);
    if (備) await app.vault.trash(備, true);
    out.push('--- 最後的檔案 ---\n' + 後);
  } catch (e) {
    out.push('FAIL exception ' + e.stack);
  } finally {
    leaf.detach();
    await app.vault.trash(f, true);
    P.存設定 = 原存;
    Object.keys(P.設定).forEach(k => delete P.設定[k]);
    Object.assign(P.設定, 原設);
  }
  out.push('DONE');
  return out.join('\n');
})().then(r => window.__ctBoardTest = r, e => window.__ctBoardTest = 'FAIL ' + e.stack);
'started'
