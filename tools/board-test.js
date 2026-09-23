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
      ok('B3 id survives topic change', 段.length > 0 && 段[段.length - 1].endsWith('^ct-b3test'), 段);
    }
    // 8c. 1.6.4 B1:置頂多(8 張墊底)的時候新增卡片,不會卡在捲到一半的地方
    {
      v.狀態.新主題 = 'B1測試'; v.狀態.新內容 = '';
      if (v.內輸) v.內輸.value = '';
      await v.送出新增(); await 等(400);
      const kb1 = v.卡片.find(x => x.主題 === 'B1測試');
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
      ok('B7 export = 1440px-wide PNG', 寬 === 1440, [圖路, 寬]);
      if (圖檔) await app.vault.trash(圖檔, true);
    }
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

    /* 13. 1.6.3(U43–U46)封存區的移出 / 整批刪除 —— 兩個都會寫檔,所以在這裡真的跑一遍。
       ⚠ 移出是「先建新檔 → 再刪原文」,所以要檢查三件事:新檔有那些卡片、原文那一段不見了、看板上那一區消失。 */
    {
      await P.寫手.改分類們(f, { 新增: ['Archive/移出測試'], 刪: [], 改名: [] });
      await P.寫手.新增卡片(f, 'Archive/移出測試', '- [ ] #移出甲 [due:: 2026-09-16]', ['\t內容甲']);
      await P.寫手.新增卡片(f, 'Archive/移出測試', '- [ ] #移出乙 [due:: 2026-09-16]', ['\t內容乙']);
      let 文 = await 讀();
      ok('U43 archive section written', /## Archive\/移出測試/.test(文) && /#移出甲/.test(文) && /#移出乙/.test(文), 文);
      const r = await P.寫手.移出分區(f, 'Archive/移出測試', '移出測試-card table-archive', '');
      const 新檔 = r && r.檔 && app.vault.getAbstractFileByPath(r.檔);
      const 新文 = 新檔 ? await app.vault.read(新檔) : '';
      ok('U43 moved-out file has the cards', !!新檔 && /#移出甲/.test(新文) && /#移出乙/.test(新文) && r.張 === 2, [r, 新文]);
      ok('U43 moved-out file next to note', !!新檔 && 新檔.parent.path === f.parent.path, 新檔 && 新檔.path);
      文 = await 讀();
      ok('U45 section gone from the note', !/移出測試/.test(文) && !/#移出甲/.test(文), 文);
      if (新檔) await app.vault.trash(新檔, true);

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
      const 無2 = await P.寫手.移出分區(f, 'Archive/根本沒有', 'x-card table-archive', '');
      ok('U43 missing section: no file, no write', 無2 === false && (await 讀()) === 前文 &&
        !app.vault.getAbstractFileByPath((f.parent.path === '/' ? '' : f.parent.path + '/') + 'x-card table-archive.md'), 無2);
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
