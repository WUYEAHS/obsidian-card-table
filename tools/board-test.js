/* 卡片看板:真的看板上的寫入測試(會建一份 ZZ-board-test.md,測完丟垃圾桶;設定不會被寫進 data.json)。
   用法(非同步,分兩次 eval):
     obsidian eval code="eval(require('fs').readFileSync('<repo>/tools/board-test.js','utf8'))"
     (等 30–40 秒)
     obsidian eval code="window.__ctBoardTest"
   每一行 ok / FAIL;最後一行是 DONE 才算跑完。 */
window.__ctBoardTest = 'running';
(async () => {
  const P = app.plugins.plugins['card-table'];
  // 1.6.3(ADR 1.6.3-01):寫過的卡片主題是 #訂貨,舊的是 [訂貨];找卡片兩種都認
  const 有題 = (t, 題) => t.includes(題) || (/^\[.*\]$/.test(題) && new RegExp('(^|\\s)#' + 題.slice(1, -1).replace(/\s+/g, '-') + '(\\s|$)').test(t));
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
  // 1.6.4 B1:8 張置頂卡片墊在最前面,新卡片才會被推得夠遠,量得出「捲到一半卡住」這個問題
  const 置頂墊 = Array.from({ length: 8 }, (_, i) =>
    '- [ ] [pin:: on] [置頂墊' + i + '] [due:: 2026-09-16]\n\t[ed:: 2026-09-10 09:00]');
  const 初 = [
    '## 1', '',
    ...置頂墊, '',
    '- [ ] [訂貨] ．每樣兩箱 ＠{2026-09-16 ~ 2026-09-18} #' + 人 + ' 📌 ✎{2026-09-10 09:12}',
    '\t．打給廠商了',
    '\t．💬{2026-09-11 14:20|' + 人 + '} 報價回來了',
    '',
    '- [ ] [巡田] 🔁 every week ．看那棵 ＠{2026-09-16}',
    '',
    '- [ ] 沒主題的舊卡 ＠{2026-09-16}',
    '',
    '## 2',
    '- [ ] [ID測試] [due:: 2026-09-16]',       // 1.6.4 B3:已經有 Canvas ID 的卡片(模擬 ^ct-… 接在 [ed::] 後面)
    '\t- 內容',
    '\t[ed:: 2026-09-10 09:00] ^ct-b3test',
    '',
    '## 3', '', '## 4', '', '## 5', '', '## 6', '', '## 7', ''     // 1.6.2 B1:超過 5 個分類
  ].join('\n');
  f = await app.vault.create(path, 初);
  const leaf = app.workspace.getLeaf(true);
  await leaf.setViewState({ type: 'card-table', state: { file: path } });
  await 等(800);
  const v = leaf.view;
  const 讀 = () => app.vault.read(f);
  const 卡段 = (文, 題) => {           // 某張卡片的所有行(到下一張卡片或標題為止)
    const 行 = 文.split('\n');
    const i = 行.findIndex(t => /^- \[[ xX]\]/.test(t) && 有題(t, 題));
    if (i < 0) return [];
    let j = i + 1;
    while (j < 行.length && (/^[ \t]/.test(行[j]) || !行[j].trim())) j++;
    return 行.slice(i, j).filter(t => t.trim());
  };
  const 尾是ed = (段) => /^\t\[ed:: \d{4}-\d{2}-\d{2} \d{2}:\d{2}\]$/.test(段[段.length - 1] || '');
  const 原段 = (文, 題) => {           // 同 卡段,但留著中間的空白行(1.6.2 B3 要看空行有沒有被吃掉)
    const 行 = 文.split('\n');
    const i = 行.findIndex(t => /^- \[[ xX]\]/.test(t) && 有題(t, 題));
    if (i < 0) return [];
    let j = i + 1;
    while (j < 行.length && (/^[ \t]/.test(行[j]) || !行[j].trim())) j++;
    while (j > i + 1 && !行[j - 1].trim()) j--;
    return 行.slice(i, j);
  };
  try {
    // 1. 打勾一張舊卡片 → 轉成新寫法,ed 在最後
    let k = v.卡片.find(x => x.主題 === '訂貨');
    await v.切完成(k); await 等(400);
    let 段 = 卡段(await 讀(), '[訂貨]');
    ok('done converts first line', /^- \[x\] (\[pin:: on\] )?#訂貨 \[start:: 2026-09-16\] \[due:: 2026-09-18\] @/.test(段[0]), 段[0]);
    ok('legacy content moved to line 2', 段[1] === '\t- 每樣兩箱', 段[1]);
    ok('untouched legacy lines kept', 段.includes('\t．打給廠商了'), 段);
    ok('ed is last line', 尾是ed(段), 段);
    // 2. 馬上反悔(同一個卡片物件)
    await v.切完成(k); await 等(400);
    段 = 卡段(await 讀(), '[訂貨]');
    ok('undo with same object', /^- \[ \]/.test(段[0]), 段[0]);
    ok('only one ed line', 段.filter(t => t.includes('[ed::')).length === 1, 段);
    // 1.7.5-U1:跳轉開著,只開「未完成」時打勾 → 未完成 + 已完成兩個都開;跳轉關著 → 開關不動
    {
      const 顯 = P.設定.排程顯示 = P.設定.排程顯示 || {};
      const 訂 = () => v.卡片.find(x => x.主題 === '訂貨');    // ⚠ 每次重新拿:舊物件的 k.完成 是過期的
      顯.未完成 = true; 顯.完成 = false; P.設定.跳轉_未完成到完成 = true;
      await v.切完成(訂()); await 等(400);
      ok('1.7.5-U1 tick → to-do + done both shown', 顯.未完成 === true && 顯.完成 === true, 顯);
      顯.完成 = false; P.設定.跳轉_完成到未完成 = false;
      await v.切完成(訂()); await 等(400);
      ok('1.7.5-U1 jump off → switches untouched', 顯.完成 === false && 顯.未完成 === true, 顯);
      顯.完成 = true; P.設定.跳轉_完成到未完成 = true;
    }
    // 3. 改日期(區間)
    k = v.卡片.find(x => x.主題 === '巡田');
    await v.設日期(k, '2026-09-20', '2026-09-22'); await 等(400);
    段 = 卡段(await 讀(), '[巡田]');
    ok('range written as start/due', 段[0].includes('[start:: 2026-09-20] [due:: 2026-09-22]') && 段[0].includes('[repeat:: every week]'), 段[0]);
    // 4. 改內容(含待辦、自己打的符號;1.6.2 B3:巢狀清單、空行、表格的空白照打的存)
    k = v.卡片.find(x => x.主題 === '巡田');
    const r = await P.寫手.換內容(f, k, '看那棵\n- parent\n\t- child\n\n| a   | b   |\n-[ ] 帶藥\n* 自己的符號', v.名單);
    ok('換內容 returns new key', typeof r === 'string' && r.startsWith('[巡田]'), r);
    await 等(400);
    {
      const 段4 = 原段(await 讀(), '[巡田]');
      const i = 段4.indexOf('\t\t- child');
      ok('B3 nested list kept', i > 0 && 段4[i - 1] === '\t- parent', 段4);
      ok('B3 blank line + table spacing kept', 段4[i + 1] === '' && 段4[i + 2] === '\t| a   | b   |', 段4);
      const k4 = v.卡片.find(x => x.主題 === '巡田');
      ok('B3 parsed raw content', JSON.stringify(k4.內容原) === JSON.stringify(['看那棵', '- parent', '\t- child', '', '| a   | b   |', '- [ ] 帶藥', '* 自己的符號']), k4.內容原);
    }
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
    // 8b. 1.6.4 B3:^ct-… 接在 [ed::] 後面,只讀不寫,改主題之後原樣留著
    {
      const kid = v.卡片.find(x => x.主題 === 'ID測試');
      ok('B3 parses ^ct-… id from note', kid && kid.ID === '^ct-b3test', kid && kid.ID);
      await P.寫手.改主題(f, kid, '改過的ID測試', v.名單); await 等(400);
      段 = 卡段(await 讀(), '[改過的ID測試]');
      // 1.6.8(ADR-001 D2):內容是子清單 → ID 搬到它前面、自己一行
      ok('B3 id survives topic change', 段[1] === '\t^ct-b3test' && 尾是ed(段), 段);
    }
    // 8c. 1.6.4 B1:置頂多(8 張墊底)的時候新增卡片,不會卡在捲到一半的地方
    {
      v.狀態.新主題 = 'B1測試'; v.狀態.新內容 = '';
      if (v.內輸) v.內輸.value = '';
      await v.送出新增();
      let kb1;                                      // 等到解析出來(固定 400ms 偶爾不夠,2026-09-24 跑到一次 undefined)
      for (let i = 0; i < 40 && !(kb1 = v.卡片.find(x => x.主題 === 'B1測試')); i++) await 等(50);
      const ce = v.contentEl;
      const 可見 = (列) => !!列 && 列.getBoundingClientRect().bottom > ce.getBoundingClientRect().top &&
        列.getBoundingClientRect().top < ce.getBoundingClientRect().bottom;
      // 等實際要的狀態(那一列捲進畫面),不要靠固定秒數
      for (let i = 0; i < 40 && !可見(v.找列(kb1.鍵)); i++) await 等(50);
      ok('B1 new card visible after normal add (8 pinned ahead of it)', 可見(v.找列(kb1.鍵)), v.找列(kb1.鍵) && v.找列(kb1.鍵).getBoundingClientRect());
      // 模擬「回音重畫」插進來:要看的卡 還沒被清掉(捲動還沒找到那一列)就先假造一個舊座標、叫一次 畫()
      ce.scrollTop = 0;
      v.要看的卡 = kb1.鍵;
      v.畫();
      for (let i = 0; i < 40 && !可見(v.找列(kb1.鍵)); i++) await 等(50);
      ok('B1 echo repaint re-scrolls instead of freezing at stale scrollTop', 可見(v.找列(kb1.鍵)), { scrollTop: ce.scrollTop });
    }
    // 9. 新增:只有主題
    v.狀態.新主題 = '只有主題'; v.狀態.新內容 = '';
    if (v.內輸) v.內輸.value = '';
    await v.送出新增(); await 等(500);
    段 = 卡段(await 讀(), '[只有主題]');
    ok('title-only card has no content', 段.length === 2 && 尾是ed(段), 段);
    // 9b. 1.6.2 B3:新增卡片的巢狀內容照打的存
    v.狀態.新主題 = '巢狀新增'; v.狀態.新內容 = '- 一\n\t- 二';
    if (v.內輸) v.內輸.value = '- 一\n\t- 二';
    await v.送出新增(); await 等(500);
    段 = 原段(await 讀(), '[巢狀新增]');
    ok('B3 new card keeps nesting', 段[1] === '\t- 一' && 段[2] === '\t\t- 二' && 尾是ed(段), 段);
    // 10. 融合兩張(1.6.2 B3:縮排跟著搬過去)
    await v.做融合(v.卡片.filter(x => x.主題 === '只有主題' || x.主題 === '巡田')); await 等(500);
    ok('B3 merge keeps nesting', (await 讀()).includes('\n\t\t- child\n'), '');
    // 11. 封存
    k = v.卡片.find(x => !x.主題);
    await v.切封存(k, false); await 等(500);
    const 文 = await 讀();
    ok('archive section', /## Archive[\s\S]*沒主題的舊卡/.test(文), '');
    // 每一張被寫過的卡片最後一行都是 ed
    const 寫過 = ['[巡田]', '[訂貨]', '沒主題的舊卡'].map(t => 卡段(文, t));
    ok('every touched card ends with ed', 寫過.every(尾是ed), 寫過);
    ok('cards parse', v.卡片.length >= 2 && v.卡片.every(x => x.編修戳), v.卡片.map(x => [x.主題, x.編修戳]));
    // 11b. 1.6.2 B1 / U2:選分類的清單 = 色點 + 名稱,每一區都選得到(封存區不列);搬卡片只動這一張,設定的分類顏色不動
    {
      const 色前 = JSON.stringify(P.設定.分類顏色 || {});
      const 觸 = v.contentEl.querySelector('.tk-列') || v.contentEl;
      const 盤 = v.開分類清單(觸, '1', () => {});
      const 名們 = 盤 ? [...盤.querySelectorAll('[role=option]')].map(x => x.textContent) : [];
      ok('B1 list shows every section by name', JSON.stringify(名們) === JSON.stringify(['1', '2', '3', '4', '5', '6', '7']), 名們);
      if (盤 && 盤.__關) 盤.__關();
      const kk = v.卡片.find(x => x.主題 === '巢狀新增');
      await v.搬去分類(kk, '6'); await 等(400);
      ok('B1 move only this card', /## 6\n+- \[ \] #巢狀新增/.test(await 讀()), '');
      ok('B1 section colours untouched', JSON.stringify(P.設定.分類顏色 || {}) === 色前, [色前, P.設定.分類顏色]);
    }
    // 11c. 1.6.2 B6:取消封存會問回哪一區(清單列出每一區),挑哪一區就回哪一區
    {
      const ka = v.卡片.find(x => !x.主題 && v.是封存(x));
      const 觸 = v.contentEl.querySelector('.tk-列') || v.contentEl;
      v.選區取消封存(觸, ka);
      const 盤 = document.body.querySelector('.tk-分類挑');
      const 選項 = 盤 ? [...盤.querySelectorAll('[role=option]')] : [];
      ok('B6 unarchive asks for a section', 選項.length === 7, 選項.map(x => x.textContent));
      const 三 = 選項.find(x => x.textContent === '3');
      if (三) 三.click(); else if (盤 && 盤.__關) 盤.__關();
      await 等(700);
      ok('B6 unarchive goes where you picked', /## 3\n+- \[ \] (\[pin:: on\] )?沒主題的舊卡/.test(await 讀()), '');
    }
    // 11c2. 1.6.3(ADR 1.6.3-01)搜尋打 #主題 只剩有那個主題的卡片(打一半也算)、@名字 只剩指派給他的
    {
      v.狀態.新主題 = ''; v.狀態.新內容 = '#巢狀'; v.狀態.搜尋 = true; v.__搜拆 = null;
      let 剩 = v.基底(v.卡片);
      ok('ADR #topic search', 剩.length > 0 && 剩.every(x => (x.主題們 || []).some(t => t.indexOf('巢狀') === 0)), 剩.map(x => x.主題));
      v.狀態.新內容 = '@' + 人; v.__搜拆 = null;
      剩 = v.基底(v.卡片);
      ok('ADR @name search', 剩.length > 0 && 剩.every(x => x.指派 === 人), 剩.map(x => x.指派));
      v.狀態.新內容 = ''; v.狀態.搜尋 = false; v.__搜拆 = null;
    }
    // 11d. 1.6.2 B7:匯出只有長圖,720px × 2 = 1440px 寬的 PNG(測完丟垃圾桶)
    {
      const 圖路 = await v.輸出();
      const 圖檔 = 圖路 && app.vault.getAbstractFileByPath(圖路);
      let 寬 = 0;
      if (圖檔) { const b = new Uint8Array(await app.vault.readBinary(圖檔)); 寬 = (b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19]; }
      ok('B7 export = 1440px-wide PNG, in the plugin folder (CR-03)', 寬 === 1440 && 圖檔.parent.path === P.衍生夾(f), [圖路, 寬]);
      if (圖檔) await app.vault.trash(圖檔, true);
    }
    // 12. 全部轉換(CR-1.7.2-03:備份放外掛的資料夾)
    const 前 = await 讀();
    const c = await P.寫手.轉新格式(f, v.名單);
    const 備 = c && c.備份 && app.vault.getAbstractFileByPath(c.備份);
    ok('CR-03 convert backup in the plugin folder', !!備 && 備.parent.path === P.衍生夾(f) && (await app.vault.read(備)) === 前, c);
    const 原設夾 = P.設定.移出資料夾; P.設定.移出資料夾 = '';
    ok('CR-03 empty setting → Card Table attachments', P.衍生夾() === 'Card Table attachments', P.衍生夾());
    P.設定.移出資料夾 = 原設夾;
    const 後 = await 讀();
    ok('convert leaves no legacy markers', !/[＠✎📌🔁💬]|\bEd\{|\bPin\{|\bRe\{|\bCm\{|Done\{/.test(後), 後);
    const c2 = await P.寫手.轉新格式(f, v.名單);
    ok('convert twice = 0', c2 && c2.張 === 0, c2);
    if (備) await app.vault.trash(備, true);

    /* 13. 1.6.3(U43–U46)封存區的移出 / 整批刪除;1.7.1(ADR-002)移出接到 `<看板名> Archive.md`、可以搬回。
       ⚠ 移出是「先寫 Archive → yaml → 最後才刪原文」:中間斷掉最壞兩邊都有。行為數字:兩份的區名和張數。 */
    {
      const 日 = new Date().toLocaleDateString('sv');            // YYYY-MM-DD(本地時間)
      const 區們 = (t) => t.split('\n').filter(x => /^## /.test(x)).map(x => x.slice(3));
      const 張 = (t) => (t.match(/^- \[[ xX]\] /gm) || []).length;
      const 放 = async (名, 題們) => {
        await P.寫手.改分類們(f, { 新增: ['Archive/' + 名], 刪: [], 改名: [] });
        for (const 題 of 題們) await P.寫手.新增卡片(f, 'Archive/' + 名, '- [ ] #' + 題 + ' [due:: 2026-09-16]', ['\t內容' + 題]);
      };
      await 放('移出測試', ['移出甲', '移出乙']);
      let 文 = await 讀();
      ok('U43 archive section written', /## Archive\/移出測試/.test(文) && /#移出甲/.test(文) && /#移出乙/.test(文), 文);
      // 連結數(PRD 5.3):別的筆記指到這一區的卡片 ID
      await app.vault.process(f, t => t.replace(/(#移出甲[^\n]*\n\t內容移出甲)/, '$1 ^ct-lnk001'));
      const 連檔 = await app.vault.create('ZZ-board-test-links.md', '[[ZZ-board-test#^ct-lnk001]] [[ZZ-board-test#Archive/移出測試]]');
      await 等(1200);
      const 單0 = await P.找連結(f, null, new Set(['^ct-lnk001']), 'Archive/移出測試');
      ok('F1 link count before move-out = 2', 單0.數 === 2 && 單0.筆 === 1 && 單0.畫 === 0, [單0.數, 單0.筆, 單0.畫]);
      await app.vault.trash(連檔, true);
      // ① 第一次:沒有 Archive → 建一份,兩邊 yaml 互連
      ok('F1 no archive yet', P.找Archive(f) === null, P.找Archive(f) && P.找Archive(f).path);
      const r = await P.寫手.移出分區(f, 'Archive/移出測試', null, '');
      const A = r && r.檔 && app.vault.getAbstractFileByPath(r.檔);
      let A文 = A ? await app.vault.read(A) : '';
      ok('F1 archive file = <board> Archive.md next to board', !!A && A.basename === 'ZZ-board-test Archive' && A.parent.path === f.parent.path, r);
      ok('F1 section → ## name + [archived:: today], 2 cards', r.張 === 2 && 區們(A文).join('|') === '移出測試' && A文.includes('## 移出測試\n[archived:: ' + 日 + ']') && 張(A文) === 2, A文);
      ok('F1 archive yaml', /card-table: archive/.test(A文) && /card-table-source: "\[\[ZZ-board-test\]\]"/.test(A文) && A文.includes('card-table-archived: ' + 日), A文);
      文 = await 讀();
      ok('F1 board yaml links archive', /card-table-archive: "\[\[ZZ-board-test Archive\]\]"/.test(文), 文.slice(0, 200));
      ok('U45 section gone from the note', !/移出測試/.test(文) && !/#移出甲/.test(文), 文);
      await 等(800);
      ok('F1 find archive both ways', P.找Archive(f) === A && P.找看板(A) === f, [P.找Archive(f) && P.找Archive(f).path, P.找看板(A) && P.找看板(A).path]);
      // ② 第二次、同名 + ID 撞號:接在後面,`## 名 (今天)`,撞號的 ^ct- 換新
      await 放('移出測試', ['移出丙']);
      await app.vault.process(f, t => t.replace(/(#移出丙[^\n]*\n\t內容移出丙)/, '$1 ^ct-lnk001'));
      const r2 = await P.寫手.移出分區(f, 'Archive/移出測試', P.找Archive(f), '');
      A文 = await app.vault.read(A);
      ok('F1 same name → (today), appended', r2 && r2.檔 === A.path && 區們(A文).join('|') === '移出測試|移出測試 (' + 日 + ')' && 張(A文) === 3, 區們(A文));
      ok('D9 clashing ^ct- renewed', (A文.match(/\^ct-lnk001/g) || []).length === 1 && (A文.match(/\^ct-[a-z0-9]{6}/g) || []).length === 2, A文);
      // ③ 看板改名之後照 yaml 找得到
      await app.fileManager.renameFile(f, 'ZZ-board-test-renamed.md');
      await 等(1200);
      ok('F1 archive found after board rename', P.找Archive(f) === A, P.找Archive(f) && P.找Archive(f).path);
      await app.fileManager.renameFile(f, path);
      await 等(1200);
      // ④ 中間斷掉:yaml 寫不進去 → 回 false,看板一個字都沒動(Archive 那邊已經有 = 兩邊都有,救得回)
      await 放('斷掉測試', ['斷甲']);
      const 斷前 = await 讀(), 原fm = app.fileManager.processFrontMatter;
      app.fileManager.processFrontMatter = async () => { throw new Error('test'); };
      const r3 = await P.寫手.移出分區(f, 'Archive/斷掉測試', A, '');
      app.fileManager.processFrontMatter = 原fm;
      ok('F1 interrupted: false, board untouched, archive has it', r3 === false && (await 讀()) === 斷前 && /## 斷掉測試/.test(await app.vault.read(A)), r3);
      await P.寫手.刪分區(f, 'Archive/斷掉測試');
      await P.寫手.刪分區(A, '斷掉測試');
      // ⑤ 搬回:先寫看板再從 Archive 拿掉;1.7.2-B1 進看板的封存區 `Archive/名`,已經有 → `(搬回 日)`;[archived::] 拿掉
      const 搬前張 = 張(await 讀()) + 張(await app.vault.read(A));
      const n1 = await P.寫手.搬回分區(A, '移出測試', f);
      const n2 = await P.寫手.搬回分區(A, '移出測試 (' + 日 + ')', f);
      文 = await 讀(); A文 = await app.vault.read(A);
      const 尾名 = 'Archive/移出測試 (' + P.寫手.T.movedBackTail + ' ' + 日 + ')';
      ok('F2 moved back, none lost', n1.張 === 2 && n2.張 === 1 && 張(文) + 張(A文) === 搬前張 && 張(A文) === 0, [n1, n2, 張(文), 張(A文)]);
      ok('1.7.2-B1 back into the archive zone: Archive/名 + (搬回 today), no [archived::]', 區們(文).includes('Archive/移出測試') && 區們(文).includes(尾名)
        && !區們(文).includes('移出測試') && n2.名 === 尾名 && !/archived::/.test(文), 區們(文));
      ok('1.7.2-B2 heading has no notice text', !/↩|已搬回|Moved back to/.test(文), 區們(文));
      // B1 ③ + CR-1.7.2-02:還原先進草稿(不寫檔、清單切到那一區),✓ 才寫;`Archive/名` → `名`,帶尾巴的併進 `名`
      await 等(800);
      v.狀態.設定模式 = true; v.設草 = v.建設草();
      const 還前 = await 讀();
      v.還原封存區('Archive/移出測試', '移出測試');
      v.還原封存區(尾名, 尾名.slice(8));
      v.還原封存區(尾名, 尾名.slice(8));                  // 按兩次不會多一項
      const 還項 = v.設草.分類.filter(x => x.還原);
      ok('CR-02 restore is a draft: file untouched, 2 preview rows, list shows that section', (await 讀()) === 還前 && 還項.length === 2
        && 還項.every(x => x.名 === '移出測試') && v.狀態.封存看 === 尾名 && v.卡片.filter(k => v.合顯示(k)).every(k => k.分類 === 尾名), 還項.map(x => [x.原, x.名]));
      await 等(300);
      const 左虛 = [...v.containerEl.querySelectorAll('input')].filter(i => i.value === '移出測試' && /dashed/.test(i.parentElement.style.outline)).length;   // 簡寫裡有 var() → outlineStyle 是空的
      const 右虛 = v.containerEl.querySelectorAll('.tk-封列.tk-封預').length;
      ok('CR-02 preview rows drawn (left dashed row, right dashed archive row)', 左虛 === 2 && 右虛 === 2,
        [左虛, 右虛, v.containerEl.querySelectorAll('input').length, [...v.containerEl.querySelectorAll('input')].map(i => i.value).slice(0, 12)]);
      await v.存設草();
      文 = await 讀();
      ok('1.7.2-B1 restore merges the tailed section into 名 (one write)', 區們(文).filter(x => /移出測試/.test(x)).join('|') === '移出測試' && 張(文) === 搬前張 && !v.設草, 區們(文));
      v.狀態.設定模式 = false; v.設草 = null;
      // ⑥ 搬回再搬出:card-table-archived 照樣是最後那一天
      await P.寫手.改分類們(f, { 新增: [], 刪: [], 改名: [['移出測試', 'Archive/移出測試']] });
      const r4 = await P.寫手.移出分區(f, 'Archive/移出測試', P.找Archive(f), '');
      A文 = await app.vault.read(A);
      ok('F2 move out again after move back', r4 && 區們(A文).join('|') === '移出測試' && 張(A文) === 3 && A文.includes('card-table-archived: ' + 日), 區們(A文));
      await app.fileManager.processFrontMatter(f, y => { delete y['card-table-archive']; });
      delete P.設定.看板檔案[A.path];
      await app.vault.trash(A, true);

      // ---- 1.7.2-F1 EU(PRD §8):搬出 / 搬回時,別的筆記和 Canvas 的連結一起改 ----
      {
        const 源 = f.basename, 丟 = [];
        await 放('連結測試', ['連甲', '連乙']);
        await app.vault.process(f, t => t.replace(/(#連甲[^\n]*\n\t內容連甲)/, '$1 ^ct-eu0001')
          .replace(/(#連乙[^\n]*\n)(\t內容連乙)/, '$1\t看 ![[' + 源 + '#^ct-eu0001]]\n$2 ^ct-eu0002'));   // CR-1.7.2-01:看板裡的卡片貼了另一張
        // Archive 已經有同名區(→ 名字 (日))和 ^ct-eu0002(D9 → 換號)
        const A2 = await app.vault.create(源 + ' Archive.md', '## 連結測試\n- [ ] #舊 [due:: 2026-09-01]\n\t舊內容 ^ct-eu0002\n');
        await app.fileManager.processFrontMatter(A2, y => { y['card-table-source'] = '[[' + 源 + ']]'; y['card-table'] = 'archive'; });
        await app.fileManager.processFrontMatter(f, y => { y['card-table-archive'] = '[[' + 源 + ' Archive]]'; });
        const n1 = await app.vault.create('ZZ-eu-n1.md', ['別名 [[' + 源 + '#^ct-eu0001|看這張]]', '嵌入 ![[' + 源 + '#^ct-eu0002]]', '標題 [[' + 源 + '#Archive/連結測試]]',
          'md [x](' + 源 + '.md#^ct-eu0001)', '不相干 [[' + 源 + '#^ct-b3test]]'].join('\n'));
        const n2 = await app.vault.create('ZZ-eu-n2.md', 'line1\n[[' + 源 + '#^ct-eu0001]]');
        const c1 = await app.vault.create('ZZ-eu-c1.canvas', JSON.stringify({ nodes: [
          { id: 'a', type: 'file', file: f.path, subpath: '#^ct-eu0001', x: 0, y: 0, width: 400, height: 100 },
          { id: 'b', type: 'text', text: '看 ![[' + 源 + '#^ct-eu0002]]', x: 500, y: 0, width: 300, height: 100 }], edges: [] }, null, '\t'));
        const c2 = await app.vault.create('ZZ-eu-c2.canvas', '{"nodes": [ "' + 源);     // JSON 壞掉
        丟.push(A2, n1, n2, c1, c2);
        await 等(1500);                                                                  // metadataCache
        const ids = new Set(['^ct-eu0001', '^ct-eu0002']);
        let t0 = performance.now();
        const 單 = await P.找連結(f, A2, ids, 'Archive/連結測試');
        const 找時 = performance.now() - t0;
        ok('EU find: 4 in notes + 2 in canvas; markdown link, the board itself and broken canvas listed', 單.數 === 6 && 單.筆 === 2 && 單.畫 === 1
          && ['ZZ-eu-n1', 源, 'ZZ-eu-c2.canvas'].every(x => 單.沒.includes(x)), [單.數, 單.筆, 單.畫, 單.沒]);
        ok('EU 0 links → no sentence in the confirm box', v.連結句({ 數: 0 }) === '' && v.連結句(單).includes('6'), v.連結句(單));
        await app.vault.process(n2, t => 'inserted\n' + t);                             // 確認框開著時改了 n2
        const r = await P.寫手.移出分區(f, 'Archive/連結測試', A2, '');
        t0 = performance.now();
        const ru = await P.搬後改連結(單, A2, r.換, r.名);
        const 改時 = performance.now() - t0;
        const N1 = await app.vault.read(n1), C1 = JSON.parse(await app.vault.read(c1)), 新2 = r.換.get('^ct-eu0002'), 新路 = 源 + ' Archive';
        ok('EU D9 new id + (day) name reported', !!新2 && 新2 !== '^ct-eu0002' && !r.換.has('^ct-eu0001') && r.名 === '連結測試 (' + 日 + ')', [r.名, 新2]);
        ok('EU alias kept', N1.includes('[[' + 新路 + '#^ct-eu0001|看這張]]'), N1);
        ok('EU embed follows the new id', N1.includes('![[' + 新路 + '#' + 新2 + ']]'), N1);
        ok('EU heading → new name', N1.includes('[[' + 新路 + '#連結測試 (' + 日 + ')]]'), N1);
        ok('EU markdown link + unrelated link untouched', N1.includes('[x](' + 源 + '.md#^ct-eu0001)') && N1.includes('[[' + 源 + '#^ct-b3test]]'), N1);
        ok('EU note changed meanwhile → skipped + listed, others done', (await app.vault.read(n2)).includes('[[' + 源 + '#^ct-eu0001]]') && ru.失敗.includes('ZZ-eu-n2') && ru.改 === 5, ru);
        ok('EU canvas file node + text node', C1.nodes[0].file === A2.path && C1.nodes[0].subpath === '#^ct-eu0001' && C1.nodes[1].text === '看 ![[' + 新路 + '#' + 新2 + ']]', C1.nodes);
        ok('EU broken canvas untouched', (await app.vault.read(c2)) === '{"nodes": [ "' + 源, '');
        // 搬回(反方向):連結指回看板、`#Archive/連結測試`
        await 等(1500);
        const 單b = await P.找連結(A2, f, new Set(['^ct-eu0001', 新2]), r.名);
        const rb = await P.寫手.搬回分區(A2, r.名, f);
        await P.搬後改連結(單b, f, rb.換, rb.名);
        const N1b = await app.vault.read(n1), C1b = JSON.parse(await app.vault.read(c1));
        ok('EU move back: links point to the board again', 單b.數 === 5 && rb.名 === 'Archive/連結測試' && N1b.includes('[[' + 源 + '#^ct-eu0001|看這張]]')
          && N1b.includes('![[' + 源 + '#' + 新2 + ']]') && N1b.includes('[[' + 源 + '#Archive/連結測試]]') && C1b.nodes[0].file === f.path, [單b.數, rb.名, N1b]);
        await P.寫手.刪分區(f, 'Archive/連結測試');
        // 行為數字:一區 100 張 × 20 份筆記(每份 5 個連結)+ 2 個 Canvas(各 100 個節點)
        const 百 = Array.from({ length: 100 }, (_, i) => '- [ ] #量' + i + ' [due:: 2026-09-16]\n\t內容 ^ct-pf' + String(i).padStart(4, '0'));
        await app.vault.process(f, t => t.replace(/\s*$/, '\n\n## Archive/量測\n' + 百.join('\n') + '\n'));
        for (let j = 0; j < 20; j++) 丟.push(await app.vault.create('ZZ-eu-p' + j + '.md', Array.from({ length: 5 }, (_, i) => '![[' + 源 + '#^ct-pf' + String(j * 5 + i).padStart(4, '0') + ']]').join('\n')));
        for (let j = 0; j < 2; j++) 丟.push(await app.vault.create('ZZ-eu-pc' + j + '.canvas', JSON.stringify({ nodes: Array.from({ length: 100 }, (_, i) =>
          ({ id: 'n' + i, type: 'file', file: f.path, subpath: '#^ct-pf' + String(i).padStart(4, '0'), x: i * 10, y: 0, width: 400, height: 100 })), edges: [] })));
        await 等(2500);
        const pids = new Set(Array.from({ length: 100 }, (_, i) => '^ct-pf' + String(i).padStart(4, '0')));
        t0 = performance.now();
        const 單p = await P.找連結(f, A2, pids, 'Archive/量測');
        const 找p = performance.now() - t0;
        const rp = await P.寫手.移出分區(f, 'Archive/量測', A2, '');
        t0 = performance.now();
        const rup = await P.搬後改連結(單p, A2, rp.換, rp.名);
        const 改p = performance.now() - t0;
        ok('EU perf 100 cards × 20 notes + 2 canvas: all ' + 單p.數 + ' updated · find ' + Math.round(找p) + 'ms · update ' + Math.round(改p) + 'ms (small: find ' + Math.round(找時) + ' / update ' + Math.round(改時) + 'ms)',
          單p.數 === 300 && rup.改 === 300 && !rup.失敗.length, [單p.數, rup]);
        await app.fileManager.processFrontMatter(f, y => { delete y['card-table-archive']; });
        for (const x of 丟) await app.vault.trash(x, true);
      }

      // 整批刪除:不留檔
      await P.寫手.改分類們(f, { 新增: ['Archive/刪除測試'], 刪: [], 改名: [] });
      await P.寫手.新增卡片(f, 'Archive/刪除測試', '- [ ] #刪除甲 [due:: 2026-09-16]', ['\t內容甲']);
      const n = await P.寫手.刪分區(f, 'Archive/刪除測試');
      文 = await 讀();
      ok('U46 delete-all removes section, keeps no file', n === 1 && !/刪除測試/.test(文) && !/#刪除甲/.test(文), [n, 文]);
      // 不存在的區:什麼都不寫
      const 前文 = await 讀();
      const 無 = await P.寫手.刪分區(f, 'Archive/根本沒有');
      ok('U46 missing section writes nothing', 無 === false && (await 讀()) === 前文, 無);
      const 無2 = await P.寫手.移出分區(f, 'Archive/根本沒有', null, '');
      ok('U43 missing section: no file, no write', 無2 === false && (await 讀()) === 前文 &&
        !app.vault.getAbstractFileByPath((f.parent.path === '/' ? '' : f.parent.path + '/') + 'ZZ-board-test Archive.md'), 無2);
    }
    /* 14. 1.6.7(U6b)分類拖曳排序寫檔:改分類們() 加的排序步驟只搬整段,不碰卡片一個字。
       直接叫寫手,不透過 DOM(拖放事件用程式模擬又慢又假)。 */
    {
      const 區段 = (文, 名) => {   // 從 ## 名 開始到下一個 ## 為止(或檔尾),只看非空白行
        const 行 = 文.split('\n');
        const i = 行.findIndex(t => t.trim() === '## ' + 名);
        if (i < 0) return null;
        let j = i + 1;
        while (j < 行.length && !/^##\s/.test(行[j])) j++;
        return 行.slice(i, j).filter(t => t.trim());
      };
      await P.寫手.改分類們(f, { 新增: ['甲', '乙'], 刪: [], 改名: [] });
      await P.寫手.新增卡片(f, '甲', '- [ ] #甲卡 [due:: 2026-09-16]', ['\t內容甲']);
      await P.寫手.新增卡片(f, '乙', '- [ ] #乙卡 [due:: 2026-09-16]', ['\t內容乙']);
      let 文 = await 讀();
      const 甲前 = 區段(文, '甲'), 乙前 = 區段(文, '乙');

      // U6b-1 純排序:乙 排到 甲 前面,兩區內容逐行(非空白)完全一樣,別的分類位置不動
      await P.寫手.改分類們(f, { 新增: [], 刪: [], 改名: [], 順序: ['乙', '甲'] });
      文 = await 讀();
      ok('U6b-1 乙 moved before 甲', 文.indexOf('## 乙') >= 0 && 文.indexOf('## 甲') > 文.indexOf('## 乙'), 文);
      ok('U6b-1 甲 content untouched', JSON.stringify(區段(文, '甲')) === JSON.stringify(甲前), [區段(文, '甲'), 甲前]);
      ok('U6b-1 乙 content untouched', JSON.stringify(區段(文, '乙')) === JSON.stringify(乙前), [區段(文, '乙'), 乙前]);
      ok('U6b-1 sections not in 順序 stay put', /## 1[\s\S]*## 2[\s\S]*## 3/.test(文), 文);

      // U6b-2 順序裡有不存在的名字(模擬別台裝置刪掉了那個分類):不報錯,甲 乙 照排
      const r2 = await P.寫手.改分類們(f, { 新增: [], 刪: [], 改名: [], 順序: ['不存在', '甲', '乙'] });
      ok('U6b-2 unknown name in 順序 does not fail the write', !!r2, r2);
      文 = await 讀();
      ok('U6b-2 甲 moved before 乙', 文.indexOf('## 甲') >= 0 && 文.indexOf('## 乙') > 文.indexOf('## 甲'), 文);

      // U6b-3 同一次改名 + 排序:比對用新名字,不會排錯
      await P.寫手.改分類們(f, { 新增: [], 刪: [], 改名: [['甲', '甲甲']], 順序: ['乙', '甲甲'] });
      文 = await 讀();
      ok('U6b-3 rename+sort: 乙 before 甲甲', 文.indexOf('## 乙') >= 0 && 文.indexOf('## 甲甲') > 文.indexOf('## 乙'), 文);
      ok('U6b-3 card content kept', /#甲卡/.test(文) && /#乙卡/.test(文) && /內容甲/.test(文) && /內容乙/.test(文), 文);

      // U6c:自動色不要跟著跳 —— 位置變了(存設草 那條既有的釘住路徑)顏色要維持原樣
      v.設草 = v.建設草();
      let 草 = v.設草;
      const A = 草.分類.find(x => x.原 === '3'), B = 草.分類.find(x => x.原 === '4');
      ok('U6c setup: 3/4 exist with no custom color', !!A && !!B && !A.色 && !B.色, 草.分類.map(x => [x.原, x.色]));
      const 舊色A = P.分類色('3');
      草.分類.splice(草.分類.indexOf(A), 1);
      草.分類.splice(草.分類.indexOf(B) + 1, 0, A);   // 模擬把「3」拖到「4」後面
      await v.存設草();
      ok('U6c auto color pinned after position change', P.分類色('3') === 舊色A, [舊色A, P.分類色('3')]);
      v.狀態.設定模式 = false; v.設草 = null;

      // 1.7.5-U5 只搬不刪:寫手直接叫一次、舊名不在就不寫、再走一次草稿(⋯ 搬移卡片 → ✓)
      await P.寫手.改分類們(f, { 新增: [], 刪: [], 搬: [['乙', { 名: '甲甲', 新: false }]], 改名: [] });
      文 = await 讀();
      ok('1.7.5-U5 move only: 乙 heading kept, empty', JSON.stringify(區段(文, '乙')) === JSON.stringify(['## 乙']), 區段(文, '乙'));
      ok('1.7.5-U5 move only: 乙 cards now under 甲甲', /#乙卡[\s\S]*內容乙/.test((區段(文, '甲甲') || []).join('\n')), 區段(文, '甲甲'));
      const 前5 = 文;
      const r5 = await P.寫手.改分類們(f, { 新增: [], 刪: [], 搬: [['不存在', { 名: '甲甲', 新: false }]], 改名: [] });
      ok('1.7.5-U5 missing section writes nothing', !r5 && (await 讀()) === 前5, r5);
      v.設草 = v.建設草(); 草 = v.設草;
      草.分類.find(x => x.原 === '甲甲').搬走 = 草.分類.find(x => x.原 === '乙').id;
      await v.存設草();
      文 = await 讀();
      ok('1.7.5-U5 draft move: 甲甲 empty, both cards under 乙',
        JSON.stringify(區段(文, '甲甲')) === JSON.stringify(['## 甲甲']) && /#甲卡/.test((區段(文, '乙') || []).join('\n')) && /#乙卡/.test((區段(文, '乙') || []).join('\n')),
        [區段(文, '甲甲'), 區段(文, '乙')]);

      // 1.7.5-B1:分類清單(9 區 > 5 列會捲)重畫之後捲動位置不變;按 + 新增 → 捲到底
      v.狀態.設定模式 = true; v.設草 = v.建設草(); v.畫(); await 等(300);
      const 捲框 = () => v.區.新增.querySelector('.tk-設定面板 .tk-細捲');
      let 框 = 捲框();
      框.scrollTop = 30; 框.dispatchEvent(new Event('scroll')); await 等(50);
      v.畫新增區(v.區.新增, v.卡片); await 等(300);            // 改顏色走的就是這個重畫
      ok('1.7.5-B1 redraw keeps the section list scroll', Math.abs(捲框().scrollTop - 30) <= 1, 捲框().scrollTop);
      const 加 = [...v.區.新增.querySelectorAll('.tk-設定面板 [role=button]')].find(b => /新增分類|Add section/.test(b.getAttribute('aria-label') || ''));
      if (加) 加.click(); await 等(400);
      框 = 捲框();
      ok('1.7.5-B1 add section scrolls to the bottom', !!加 && 框.scrollTop >= 框.scrollHeight - 框.clientHeight - 1, [!!加, 框.scrollTop, 框.scrollHeight, 框.clientHeight]);
      v.狀態.設定模式 = false; v.設草 = null; v.__捲位 = null; v.畫();

      // 清掉這一段自己加的分類,不留在檔案裡影響後面的檢查
      await P.寫手.改分類們(f, { 新增: [], 刪: [['乙', { 名: '1', 新: false }], ['甲甲', { 名: '1', 新: false }]], 改名: [] });
    }
    /* 15. 1.6.8(ADR-001、PRD §8):卡片 ID。每一個寫入動作之後問 **Obsidian 自己**:
       metadataCache 裡那個 ID 的範圍 = 整張卡片(第一行到最後一個非空白行)。
       等 metadataCache 的 changed 事件,不等固定毫秒(1.6.7-R1)。卡片物件每次從檔案重新解析(跟 format-test 同一招)。 */
    {
      const fs = require('fs'), 路 = require('path');
      const src = fs.readFileSync(路.join(app.vault.adapter.basePath, app.plugins.manifests['card-table'].dir, 'main.js'), 'utf8');
      const C = class {};
      const stub = { Plugin: C, TextFileView: C, PluginSettingTab: C, Setting: C, Notice: C, Menu: C, Modal: C, SuggestModal: C, MarkdownRenderChild: C,
        WorkspaceLeaf: C, debounce: g => g, setIcon: () => {}, addIcon: () => {} };
      const M = new Function('require', 'module', src + '\n;return {解析卡片};')(() => stub, { exports: {} });
      const 名 = v.名單;
      M.解析卡片('', 名);
      const 卡 = async (題) => M.解析卡片(await 讀(), 名).find(x => x.主題 === 題);
      // 快取是最新的 = Obsidian 記的 mtime 跟檔案一樣、而且算好了(等實際狀態,不等固定毫秒)
      const 等新 = async () => {
        for (let n = 0; n < 60; n++) {
          const e = (app.metadataCache.fileCache || {})[f.path];
          if (e && e.mtime === f.stat.mtime && app.metadataCache.getFileCache(f)) return true;
          await 等(50);
        }
        return false;
      };
      const 寫後 = async (做) => { const r = await 做(); await 等新(); return r; };
      /* ⚠ 驗法(CR-1.6.8-01):Obsidian 的 block position 只到清單項目**自己的段落**,不含子項目(children);
         嵌入 / Canvas 顯示時子項目會跟著出來。所以「ID 指到整張卡片」= 卡片第一行那個清單項目的 id 就是它,
         而且 block 從卡片第一行開始(ID 跑到子待辦上的話,起點會是子待辦那一行)。 */
      const 範圍對 = async (題, id) => {
        const 新 = await 等新();
        const 行 = (await 讀()).split('\n');
        const i = 行.findIndex(t => /^- \[[ xX]\]/.test(t) && 有題(t, '[' + 題 + ']'));
        const c = app.metadataCache.getFileCache(f) || {};
        const 名id = String(id).slice(1);
        const b = (c.blocks || {})[名id];
        const li = (c.listItems || []).find(x => x.position.start.line === i);
        return { 對: 新 && i >= 0 && !!b && b.position.start.line === i && !!li && li.id === 名id,
          首: i, 得: b && [b.position.start.line, b.position.end.line], 項: li && li.id, 段: 行.slice(i, i + 8) };
      };
      await 寫後(() => P.寫手.改分類們(f, { 新增: ['ID區', 'ID區2'], 刪: [], 改名: [] }));
      const 夾 = [
        ['- [ ] #ID空 [due:: 2026-09-16]', ['\t[ed:: 2026-09-10 09:00]']],
        ['- [ ] #ID文 [due:: 2026-09-16]', ['\t一般內容', '\t連回去:[[ZZ-board-test#^ct-have01]]', '\t[ed:: 2026-09-10 09:00]']],
        ['- [ ] #ID子 [due:: 2026-09-16]', ['\t說明', '\t- [ ] 子待辦', '\t[ed:: 2026-09-10 09:00]']],
        ['- [ ] #ID碼 [due:: 2026-09-16]', ['\t```', '\t- 不是清單', '\t```', '\t[ed:: 2026-09-10 09:00]']],
        ['- [ ] #ID有 [due:: 2026-09-20]', ['\t內容', '\t[ed:: 2026-09-10 09:00] ^ct-have01']],
        ['- [ ] #ID複甲 [due:: 2026-09-16]', ['\t甲', '\t[ed:: 2026-09-10 09:00] ^ct-dup001']],
        ['- [ ] #ID複乙 [due:: 2026-09-16]', ['\t乙', '\t[ed:: 2026-09-10 09:00] ^ct-dup001']],
      ];
      for (const [首, 尾] of 夾) await 寫後(() => P.寫手.新增卡片(f, 'ID區', 首, 尾));
      const ids = {};
      for (const 題 of ['ID空', 'ID文', 'ID子', 'ID碼', 'ID有']) {
        const 前 = await 讀();
        const id = await 寫後(async () => P.寫手.取ID(f, await 卡(題), 名));
        ids[題] = id;
        const 後文 = await 讀();
        const 去ID = (s) => s.split('\n').filter(t => t.trim() !== id).map(t => t.replace(' ' + id, '')).join('\n');
        ok('1.6.8-F1 ' + 題 + ': id format', /^\^ct-[a-z0-9]{6,}$/.test(String(id)), id);
        ok('1.6.8-F1 ' + 題 + ': nothing but the ID changed (ed stamp kept)', 去ID(後文) === 去ID(前), [前, 後文]);
        const r = await 範圍對(題, id);
        ok('1.6.8-F1 ' + 題 + ': Obsidian block = whole card', r.對, r);
      }
      ok('1.6.8-F1 existing ID kept (link to it elsewhere is not a duplicate)', ids['ID有'] === '^ct-have01', ids['ID有']);
      {
        const 前 = await 讀();
        const id2 = await P.寫手.取ID(f, await 卡('ID子'), 名);
        ok('1.6.8-F1 second copy: same ID, file untouched', id2 === ids['ID子'] && (await 讀()) === 前, id2);
      }
      // F2:有子待辦那張,每個寫入動作之後重跑同一個檢查
      const 子 = ids['ID子'];
      const 步 = [
        ['check', async () => P.寫手.改首行(f, await 卡('ID子'), (s) => s.replace('- [ ]', '- [x]'), 名)],
        ['date', async () => P.寫手.改首行(f, await 卡('ID子'), (s) => s.replace('[due:: 2026-09-16]', '[due:: 2026-09-21]'), 名)],
        ['content (B1)', async () => P.寫手.換內容(f, await 卡('ID子'), '說明改了\n- [ ] 子待辦\n\t- [ ] 孫', 名)],
        ['comment', async () => P.寫手.插一行(f, await 卡('ID子'), '\t[cm:: 2026-09-23 10:00|' + 人 + '] 留', 名)],
        ['sub-todo', async () => P.寫手.改一行(f, await 卡('ID子'), (t) => /- \[ \] 子待辦/.test(t), (t) => t.replace('- [ ]', '- [x]'), 名)],
        ['move section', async () => P.寫手.搬分類(f, await 卡('ID子'), 'ID區2', 名)],
        ['archive', async () => P.寫手.搬分類(f, await 卡('ID子'), 'Archive', 名)],
        ['restore', async () => P.寫手.搬分類(f, await 卡('ID子'), 'ID區', 名)],
      ];
      for (const [名稱, 做] of 步) {
        const w = await 寫後(做);
        const r = await 範圍對('ID子', 子);
        ok('1.6.8-F2 after ' + 名稱 + ': Obsidian block = whole card', w && r.對 && (await 讀()).split(子).length === 2, [w, r]);
      }
      // D6:同 ID 兩張 → 按的那張換新的,另一張不動
      {
        const id = await 寫後(async () => P.寫手.取ID(f, await 卡('ID複甲'), 名));
        const 文 = await 讀();
        ok('1.6.8-F1 duplicate: pressed card gets a new ID, the other keeps it',
          id && id !== '^ct-dup001' && 文.split('^ct-dup001').length === 2 && 文.split(id).length === 2 &&
          (await 卡('ID複乙')).ID === '^ct-dup001' && (await 卡('ID複甲')).ID === id, [id, 文]);
      }
      // F3:融合 → 留主卡(日期最新的 ID有)的 ID,其他張的拿掉
      {
        await 寫後(async () => v.做融合([await 卡('ID有'), await 卡('ID文')]));
        const 文 = await 讀();
        const r = await 範圍對('ID有', '^ct-have01');
        ok('1.6.8-F3 merge keeps main card ID', 文.split('^ct-have01').length === 3 && !文.includes(ids['ID文']) && r.對, [r, 文]);   // 3 = 定義 + ID文 內容裡的連結
      }
      // B1:全部轉成新格式,ID 還在、Obsidian 照樣認得
      {
        const c3 = await 寫後(() => P.寫手.轉新格式(f, 名));
        if (c3 && c3.備份) { const 備3 = app.vault.getAbstractFileByPath(c3.備份); if (備3) await app.vault.trash(備3, true); }
        const r = await 範圍對('ID子', 子);
        ok('1.6.8-B1 convert keeps ID, block = whole card', r.對, [c3, r]);
      }
      // 1.6.9-F1:送 3 張(1 張沒 ID、1 張已經在 Canvas)→ 一次寫入、加 2、已有 1;每張的 ID Obsidian 認得到
      const 等到 = async (fn, ms) => { for (let t = 0; t < (ms || 6000); t += 100) { const x = fn(); if (x) return x; await 等(100); } return fn(); };
      const cvPath = 'ZZ-board-test.canvas', emPath = 'ZZ-board-test-embed.md';
      const 舊cv = app.vault.getAbstractFileByPath(cvPath); if (舊cv) await app.vault.trash(舊cv, true);
      const 碼 = (await 卡('ID碼')).ID;
      const cv = await app.vault.create(cvPath, JSON.stringify({ nodes: [{ id: 'aaaaaaaaaaaaaaaa', type: 'file', file: f.path, subpath: '#' + 碼, x: 0, y: 0, width: 400, height: 120 }], edges: [] }, null, '\t'));
      const 開們 = [];
      try {
        await 寫後(() => P.寫手.新增卡片(f, 'ID區', '- [ ] #IDC新 [due:: 2026-09-16]', ['\t沒有 ID 的卡片', '\t- [ ] 子一', '\t- [x] 子二', '\t[ed:: 2026-09-10 09:00]']));
        const 長行 = Array.from({ length: 30 }, (_, i) => '\t第 ' + (i + 1) + ' 行:這是一張很長的卡片,每一行都有一些字,看框夠不夠高');
        await 寫後(() => P.寫手.新增卡片(f, 'ID區', '- [ ] #IDC長 [due:: 2026-09-16]', 長行.concat(['\t[ed:: 2026-09-10 09:00]'])));
        const 送 = [await 卡('IDC新'), await 卡('ID子'), await 卡('ID碼'), await 卡('IDC長')];
        const 前mtime = f.stat.mtime;
        let 寫幾次 = 0; const 聽 = app.vault.on('modify', (x) => { if (x === f) 寫幾次++; });
        const r = await 寫後(() => P.寫手.取多ID(f, 送, 名));
        app.vault.offref(聽);
        const 新id = r && r.得[送[0].鍵];
        ok('1.6.9-F1 取多ID: one write, new ID only for the card without one',
          r && 寫幾次 === 1 && r.丟.length === 0 && /^\^ct-[a-z0-9]{6,}$/.test(String(新id)) && r.得[送[1].鍵] === 子 && r.得[送[2].鍵] === 碼, [r, 寫幾次, 前mtime]);
        const 範 = await 範圍對('IDC新', 新id);
        ok('1.6.9-F1 new ID: Obsidian block = whole card', 範.對, 範);
        // CR-1.6.9-01:框照內容量(短的 400 寬、30 行的 560 寬)
        const 節們 = [];
        for (const k of 送) { const 框 = await P.量框(k, f.path); 節們.push({ 路徑: f.path, id: r.得[k.鍵], 寬: 框.寬, 高: 框.高 }); }
        ok('CR-1.6.9-01 short card 400 wide, long card 560 wide and taller than 640', 節們[0].寬 === 400 && 節們[0].高 >= 120 && 節們[3].寬 === 560 && 節們[3].高 > 640,
          節們.map(n => n.寬 + 'x' + n.高));
        const 果 = await P.寫手.加Canvas節點(cv, 節們);
        const d = JSON.parse(await app.vault.read(cv));
        ok('1.6.9-F1 canvas: added 3, 1 already there, 4 file nodes', 果 && 果.加 === 3 && 果.已有 === 1 && d.nodes.length === 4 &&
          d.nodes.every(n => n.type === 'file' && n.file === f.path) && new Set(d.nodes.map(n => n.subpath)).size === 4, [果, d]);
        ok('CR-1.6.9-01 node already there keeps its size', d.nodes[0].width === 400 && d.nodes[0].height === 120, d.nodes[0]);
        const 再 = await P.寫手.加Canvas節點(cv, 節們);
        ok('1.6.9-F1 canvas: sending again adds nothing', 再 && 再.加 === 0 && 再.已有 === 4, 再);
        // 1.6.9-F2:Canvas 裡 4 張畫成卡片;嵌入的筆記 1 張;看板筆記自己的閱讀模式 0 張
        const cl = app.workspace.getLeaf('tab'); 開們.push(cl);
        await cl.openFile(cv);
        app.workspace.setActiveLeaf(cl, { focus: true });   // 1.7.5:Canvas 只畫看得到的分頁;沒切過去時偶爾 0 張(兩次跑一次)
        const 嵌數 = await 等到(() => { const n = cl.view.containerEl.querySelectorAll('.canvas-node .tk-嵌卡').length; return n >= 4 ? n : 0; });
        ok('1.6.9-F2 canvas: 4 embedded cards drawn as cards', 嵌數 === 4, 嵌數);
        ok('CR-04 canvas cards have no 320px cap', cl.view.containerEl.querySelectorAll('.tk-嵌筆').length === 0, '');
        await 等(500);
        // 原本就在的 ID碼 那個節點是測試自己寫的 120 高,不算
        const 捲 = [...cl.view.containerEl.querySelectorAll('.canvas-node')].filter(n => n.querySelector('.tk-嵌卡') && !n.textContent.includes('ID碼')).map(n => {
          const pv = n.querySelector('.markdown-preview-view'); return pv.scrollHeight - pv.clientHeight; });
        ok('CR-1.6.9-01 measured nodes show the whole card (no scrolling)', 捲.length === 3 && 捲.every(x => x <= 1), 捲);
        const 新卡el = [...cl.view.containerEl.querySelectorAll('.tk-嵌卡')].find(x => x.textContent.includes('IDC新'));
        ok('1.6.9-F2 canvas: sub-todos visible and disabled', !!新卡el && 新卡el.querySelectorAll('input[type=checkbox]').length === 2 &&
          [...新卡el.querySelectorAll('input[type=checkbox]')].every(b => b.disabled) && 新卡el.querySelectorAll('input:checked').length === 1,
          新卡el && 新卡el.innerHTML.slice(0, 400));
        ok('1.6.9-F2 canvas: colour bar uses the section colour', !!新卡el && 新卡el.querySelector('.tk-列').style.getPropertyValue('--tk-sec') === P.分類色('ID區', (app.metadataCache.getFileCache(f).headings || []).map(h => h.heading).filter(n => !/archive|封存/i.test(n))),
          新卡el && 新卡el.querySelector('.tk-列').style.getPropertyValue('--tk-sec'));
        const em = await app.vault.create(emPath, '# 嵌入\n\n![[' + f.basename + '#' + 新id + ']]\n\n- [ ] 一般待辦 ^ct-notacard\n');
        const el2 = app.workspace.getLeaf('tab'); 開們.push(el2);
        await el2.setViewState({ type: 'markdown', state: { file: emPath, mode: 'preview' } });
        const 嵌2 = await 等到(() => el2.view.containerEl.querySelectorAll('.markdown-embed .tk-嵌卡').length);
        ok('1.6.9-F2 ![[…#^ct-…]] in a note: drawn as a card, plain task untouched', 嵌2 === 1 && el2.view.containerEl.querySelectorAll('.tk-嵌卡').length === 1, 嵌2);
        const 筆卡 = el2.view.containerEl.querySelector('.tk-嵌卡');
        ok('CR-04 card embedded in a note: capped at 320px', 筆卡 && 筆卡.classList.contains('tk-嵌筆') && getComputedStyle(筆卡).maxHeight === '320px', 筆卡 && getComputedStyle(筆卡).maxHeight);
        P.設定.看板檔案 = Object.assign({}, P.設定.看板檔案, { [f.path]: false });
        const rl = app.workspace.getLeaf('tab'); 開們.push(rl);
        await rl.setViewState({ type: 'markdown', state: { file: f.path, mode: 'preview' } });
        await 等到(() => rl.view.containerEl.querySelectorAll('.task-list-item').length, 3000);
        await 等(500);
        ok('1.6.9-F2 board note reading mode: 0 embedded cards', rl.view.getViewType() === 'markdown' && rl.view.containerEl.querySelectorAll('.tk-嵌卡').length === 0,
          [rl.view.getViewType(), rl.view.containerEl.querySelectorAll('.tk-嵌卡').length]);
        const emf = app.vault.getAbstractFileByPath(emPath); if (emf) await app.vault.trash(emf, true);
      } finally {
        開們.forEach(l => l.detach());
        // Canvas 關分頁時會再存一次,太早丟垃圾桶會被它重新建出來 —— 丟完等一下再看一次
        for (let 次 = 0; 次 < 4; 次++) {
          await 等(800);
          const 剩 = [cvPath, emPath].map(p => app.vault.getAbstractFileByPath(p)).filter(Boolean);
          if (!剩.length) break;
          for (const x of 剩) await app.vault.trash(x, true);
        }
      }
    }
    /* 1.7.3:B1 附件夾在看板的資料夾裡、B2 空的 Archive 不補 1–5、B3 卡片裡的 ID 連結、B4 跳轉一定找得到 */
    {
      P.設定.看板檔案 = Object.assign({}, P.設定.看板檔案, { [f.path]: true });   // 上面 1.6.9-F2 關掉了
      const 原填 = P.設定.移出資料夾; P.設定.移出資料夾 = '';
      ok('1.7.3-B1 board in a/b → a/b/Card Table attachments', P.衍生夾({ parent: { path: 'a/b' } }) === 'a/b/Card Table attachments', P.衍生夾({ parent: { path: 'a/b' } }));
      ok('1.7.3-B1 board at root → Card Table attachments', P.衍生夾(f) === 'Card Table attachments' && P.衍生夾() === 'Card Table attachments', P.衍生夾(f));
      P.設定.移出資料夾 = 'X/夾';
      ok('1.7.3-B1 filled setting wins', P.衍生夾({ parent: { path: 'a/b' } }) === 'X/夾', P.衍生夾({ parent: { path: 'a/b' } }));
      P.設定.移出資料夾 = '';
      // ④ 1.7.2 放在最上層的 Archive 照樣找得到
      const 有根夾 = !!app.vault.getAbstractFileByPath('Card Table attachments');
      if (!app.vault.getAbstractFileByPath('ZZ-ct-sub')) await app.vault.createFolder('ZZ-ct-sub');
      if (!有根夾) await app.vault.createFolder('Card Table attachments');
      const 子看 = await app.vault.create('ZZ-ct-sub/ZZ-sub.md', '## 1\n');
      const 舊A = await app.vault.create('Card Table attachments/ZZ-sub Archive.md', '---\ncard-table: archive\n---\n');
      await 等(600);
      ok('1.7.3-B1 1.7.2 archive at root still found', P.找Archive(子看) === 舊A, P.找Archive(子看) && P.找Archive(子看).path);
      // B2:空的 Archive 打開不寫檔
      const 空A = await app.vault.create('ZZ-ct-sub/ZZ-empty Archive.md', '---\ncard-table: archive\n---\n');
      const al = app.workspace.getLeaf('tab');
      await al.setViewState({ type: v.getViewType(), state: { file: 空A.path } });
      await 等(1500);
      ok('1.7.3-B2 empty Archive: no 1–5 written', (await app.vault.read(空A)) === '---\ncard-table: archive\n---\n', await app.vault.read(空A));
      al.detach();
      for (const x of [子看, 舊A, 空A]) await app.vault.trash(x, true);
      const 子夾 = app.vault.getAbstractFileByPath('ZZ-ct-sub'); if (子夾) await app.vault.trash(子夾, true);
      const 根夾 = app.vault.getAbstractFileByPath('Card Table attachments');
      if (!有根夾 && 根夾 && !根夾.children.length) await app.vault.trash(根夾, true);
      P.設定.移出資料夾 = 原填;
      // B4:五種擋住的情況
      const 今 = v.今;
      await app.vault.process(f, t => t.replace(/\s*$/, '\n\n## 露出\n' +
        '- [ ] #露出別月 [due:: 2025-03-10]\n\t[ed:: 2026-09-10 09:00] ^ct-lc0001\n\n' +
        '- [x] #露出完成 [due:: ' + 今 + ']\n\t[ed:: 2026-09-10 09:00] ^ct-lc0002\n\n' +
        '- [ ] #露出無日\n\t[ed:: 2026-09-10 09:00] ^ct-lc0003\n\n' +
        '- [ ] #露出搜尋 [due:: ' + 今 + ']\n\t[ed:: 2026-09-10 09:00] ^ct-lc0004\n\n' +
        '## Archive/露出封\n- [ ] #露出封存 [due:: ' + 今 + ']\n\t[ed:: 2026-09-10 09:00] ^ct-lc0005\n'));
      for (let t = 0; t < 4000 && !v.卡片.some(x => x.ID === '^ct-lc0005'); t += 100) await 等(100);
      const 顯 = P.設定.排程顯示 = P.設定.排程顯示 || {};
      const 緊 = () => { v.設游標(今); v.狀態.篩 = { 型: '今日' }; 顯.未完成 = true; 顯.完成 = false; v.狀態.區篩 = null; v.狀態.搜尋 = ''; v.狀態.新主題 = ''; v.狀態.新內容 = ''; v.狀態.設定模式 = false; v.狀態.封存看 = null; };
      緊(); let k = v.露出卡('^ct-lc0001');
      ok('1.7.3-B4 other month → that month', k && v.狀態.篩.型 === '本月' && v.狀態.游標 === '2025-03-10', [k && k.主題, v.狀態.篩, v.狀態.游標]);
      緊(); k = v.露出卡('^ct-lc0002');
      ok('1.7.3-B4 done card → show done', k && 顯.完成 === true && v.狀態.篩.型 === '今日', [k && k.主題, 顯]);
      緊(); k = v.露出卡('^ct-lc0003');
      ok('1.7.3-B4 undated card → found in the undated table, filter kept', k && v.狀態.篩.型 === '今日', [k && k.主題, v.狀態.篩]);
      緊(); v.狀態.區篩 = '1'; v.狀態.新內容 = '沒有這個字xyz'; v.搜尋變動(); k = v.露出卡('^ct-lc0004');
      ok('1.7.3-B4 section filter + search cleared', k && !v.狀態.區篩 && !v.狀態.搜尋 && !v.狀態.新內容, [k && k.主題, v.狀態.區篩, v.狀態.搜尋]);
      緊(); k = v.露出卡('^ct-lc0005');
      ok('1.7.3-B4 archived card → archive zone opens', k && v.看封存區 && v.狀態.封存看 === 'Archive/露出封', [k && k.主題, v.狀態.封存看]);
      緊(); v.設草 = null; v.畫();
      ok('1.7.3-B4 missing ID → null', v.露出卡('^ct-nope00') === null, '');
      // B3:卡片裡點 [[看板#^ct-…]] 走 開到卡;一般連結照舊
      const 叫 = []; const 原開 = P.開到卡, 原ol = app.workspace.openLinkText;
      P.開到卡 = (p, id) => 叫.push(['卡', p, id]);
      app.workspace.openLinkText = (t) => 叫.push(['ol', t]);
      try {
        P.開連結(f.basename + '#^ct-lc0001', 'x.md', false);
        P.開連結('#^ct-lc0001', f.path, false);
        P.開連結(f.basename + '#^ct-lc0001', 'x.md', true);
        P.開連結(f.basename + '#露出', 'x.md', false);
      } finally { P.開到卡 = 原開; app.workspace.openLinkText = 原ol; }
      ok('1.7.3-B3 card-ID link → 開到卡; ctrl / heading → Obsidian', JSON.stringify(叫) === JSON.stringify([['卡', f.path, '^ct-lc0001'], ['卡', f.path, '^ct-lc0001'], ['ol', f.basename + '#^ct-lc0001'], ['ol', f.basename + '#露出']]), 叫);
    }
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
