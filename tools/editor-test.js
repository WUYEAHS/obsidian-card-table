/* 卡片看板:即時預覽編輯器測試(建 ZZ-live-edit.md,測完丟垃圾桶)。結果在 window.__ctEditorTest,最後一行是 DONE。 */
window.__ctEditorTest = 'running';
(async () => {
  const P = app.plugins.plugins['card-table'];
  const 原存 = P.存設定; P.存設定 = async () => {};
  const out = [];
  window.__ctEditorOut = out;                                   // 卡住時可以讀到跑到哪裡
  const 步 = (名) => { window.__ctEditorStep = 名; };
  const ok = (n, c, a) => out.push((c ? 'ok   ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(a)));
  const 等 = (ms) => new Promise(r => setTimeout(r, ms));
  const 限時 = (p, ms, 名) => Promise.race([p, 等(ms).then(() => { throw new Error('timeout ' + ms + 'ms: ' + 名); })]);
  /* 視窗在背景時(使用者在用別的程式),瀏覽器不給焦點、計時器也會被放慢:
     跟焦點有關的檢查記成 skip,不算 FAIL;等存檔一律「等到檔案變了」,不要只睡固定的時間。 */
  const 有焦點 = document.hasFocus();
  const 焦點ok = (n, c, a) => 有焦點 ? ok(n, c, a) : out.push('skip ' + n + '  (Obsidian 視窗在背景,測不到焦點)');
  const 等到 = async (條件, 最多 = 5000) => { const t = Date.now(); while (Date.now() - t < 最多) { if (await 條件()) return true; await 等(200); } return !!(await 條件()); };
  // 1.6.3:這台裝置記著的收合先打開(清單收著就找不到卡片),結束還原
  const 收鍵 = ['card-table-filter-folded', 'card-table-add-folded', 'card-table-list-folded'];
  const 原收 = 收鍵.map(k => app.loadLocalStorage(k));
  // 未完成 / 已完成是所有看板共用的設定:使用者停在「已完成」時,測試卡片全都看不到。測試期間換成未完成,結束還原
  const 原顯 = P.設定.排程顯示;
  P.設定.排程顯示 = Object.assign({}, 原顯 || {}, { 未完成: true, 完成: false, 封存: false });
  收鍵.forEach(k => app.saveLocalStorage(k, null));
  const path = 'ZZ-live-edit.md';
  let f = app.vault.getAbstractFileByPath(path);
  if (f) await app.vault.delete(f);
  const 今 = window.moment().format('YYYY-MM-DD');
  f = await app.vault.create(path, ['## 1', '', '- [ ] [訂貨] [due:: ' + 今 + ']', '\t**粗體** 和 ==螢光==', '\t[ed:: 2026-09-17 10:00]',
    '- [ ] [對齊] [due:: ' + 今 + ']', '\t- 項目一', '\t純文字', '\t- [ ] 待辦', '\t1. 編號', '\t\t- 子項', '\t[ed:: 2026-09-17 09:00]',
    '- [ ] [段落] [due:: ' + 今 + ']', '\t第一段文字', '\t第二行', '\t[ed:: 2026-09-17 08:30]',
    '- [ ] [雜燴] [due:: ' + 今 + ']', '\t- parent', '\t\t- child', '', '\t---', '\t| a | b |', '\t| --- | --- |', '\t| 1 | 2 |',
    '\t[文字](https://example.com) 和 [[ZZ-live-edit]]', '\t- [ ] 勾我', '\t[ed:: 2026-09-17 08:00]',
    '- [ ] [方框] [due:: ' + 今 + ']', '\t> [!note]', '\t> - [ ] 框內', '\t- [ ] 中間', '\t```', '\t- [ ] 程式', '\t```', '\t- [ ] 最後', '\t[ed:: 2026-09-17 07:00]', ''].join('\n'));
  const leaf = app.workspace.getLeaf(true);
  await leaf.setViewState({ type: 'card-table', state: { file: path } });
  app.workspace.setActiveLeaf(leaf, { focus: true });
  await 等(900);
  const v = leaf.view;
  try {
    const kids0 = P._children ? P._children.length : -1;
    步('wysiwyg');
    // ---- 1.6.2(B4)閱讀用 Obsidian 自己的 Markdown 渲染;段落文字在閱讀和編輯時的水平位置差 ≤ 4px ----
    {
      v.狀態.展開全部 = true; v.重畫清單(); await 等(300);
      const 找列 = (字) => [...v.contentEl.querySelectorAll('.tk-列')].find(r => r.textContent.includes(字));
      const 首字x = (root) => {
        const tn = [...root.querySelectorAll('*')].concat([root]).flatMap(e => [...e.childNodes])
          .find(n => n.nodeType === 3 && /[一-鿿]/.test(n.textContent));
        if (!tn) return null;
        const rg = document.createRange(); rg.selectNodeContents(tn);
        return rg.getClientRects()[0].left;
      };
      const 格左 = (el) => el.closest('.tk-格').getBoundingClientRect().left;
      { const m = 找列('訂貨') && 找列('訂貨').querySelector('.tk-文區 .tk-md');
        ok('B4 content rendered by Obsidian', !!m && m.classList.contains('markdown-rendered') && !!m.querySelector('strong') && !!m.querySelector('mark'), m ? m.innerHTML.slice(0, 160) : 'none'); }
      const 列0 = 找列('段落');
      const md = 列0 && 列0.querySelector('.tk-文區 .tk-md');
      const x讀 = md ? 首字x(md) - 格左(md) : null;
      // 1.6.2(CR-02):垂直也不能跳 —— 以前編修框的上內距 + 框線讓字往下掉 6.5px
      const 首字y = (root) => {
        const tn = [...root.querySelectorAll('*')].concat([root]).flatMap(e => [...e.childNodes])
          .find(n => n.nodeType === 3 && /第一段/.test(n.textContent));
        if (!tn) return null;
        const rg = document.createRange(); rg.selectNodeContents(tn);
        return rg.getClientRects()[0].top - 列0.getBoundingClientRect().top;
      };
      const y讀 = md ? 首字y(md) : null;
      const 題字讀 = 列0.querySelector('.tk-主題') ? getComputedStyle(列0.querySelector('.tk-主題')).fontSize : null;
      const 鈕0 = [...列0.querySelectorAll('[aria-label],[title]')].find(b => /^(編輯|Edit)$/.test(b.title || b.getAttribute('aria-label') || ''));
      鈕0.click(); await 等(500);
      { const E0 = v.編框.編輯器.editor; E0.setCursor({ line: E0.lastLine(), ch: E0.getLine(E0.lastLine()).length }); }   // 游標那一行會露出原始符號,放到最後一行
      await 等(300);
      const 框 = v.contentEl.querySelector('.tk-編框 .cm-content');
      const x編 = 框 ? 首字x(框) - 格左(框) : null;
      ok('B4 paragraph text x: read vs edit within 4px', x讀 != null && x編 != null && Math.abs(x讀 - x編) <= 4, [x讀, x編]);
      { const y編 = 框 ? 首字y(框) : null;
        ok('CR-02 paragraph text y: read vs edit within 2px', y讀 != null && y編 != null && Math.abs(y讀 - y編) <= 2, [y讀, y編]);
        const 題框 = 列0.querySelector('input.tk-題編');
        ok('CR-02 title font size: read vs edit', !!題框 && getComputedStyle(題框).fontSize === 題字讀, [題字讀, 題框 && getComputedStyle(題框).fontSize]); }
      await 限時(v.收掉編修(), 8000, 'wysiwyg 收掉編修');
      v.狀態.編修 = null; v.重畫清單(); await 等(300);
      // 1.6.3(A2):清單(bullet、待辦、編號、巢狀)的字,閱讀和編輯左右差 ≤ 2px
      {
        const 列a = () => 找列('對齊') || [...v.contentEl.querySelectorAll('.tk-列')].find(r => r.querySelector('input.tk-題編'));
        const 字左 = (root, re) => {
          const tn = [...root.querySelectorAll('*')].flatMap(e => [...e.childNodes]).find(n => n.nodeType === 3 && re.test(n.textContent));
          if (!tn) return null;
          const i = tn.textContent.search(re); const rg = document.createRange(); rg.setStart(tn, i); rg.setEnd(tn, i + 1);
          return rg.getClientRects()[0].left - 列a().getBoundingClientRect().left;
        };
        const 字們 = [/項目一/, /待辦/, /編號/, /子項/];
        const 讀 = 字們.map(re => 字左(列a().querySelector('.tk-文區 .tk-md'), re));
        const 鈕a = [...列a().querySelectorAll('[aria-label],[title]')].find(b => /^(編輯|Edit)$/.test(b.title || b.getAttribute('aria-label') || ''));
        鈕a.click(); await 等(500);
        { const Ea = v.編框.編輯器.editor; Ea.setCursor({ line: Ea.lastLine(), ch: 0 }); }   // 游標那一行會露出原始符號
        await 等(300);
        const 編 = 字們.map(re => 字左(列a().querySelector('.tk-編框 .cm-content'), re));
        ok('A2 list text x: read vs edit within 2px', 讀.every((x, i) => x != null && 編[i] != null && Math.abs(x - 編[i]) <= 2),
          讀.map((x, i) => [Math.round(x), Math.round(編[i])]));
        await 限時(v.收掉編修(), 8000, 'A2 收掉編修');
        v.狀態.編修 = null; v.重畫清單(); await 等(300);
      }
      // 大雜燴:分隔線、表格、巢狀清單、[文字](網址)、[[連結]]、待辦
      const 列1 = 找列('雜燴');
      const md1 = 列1 && 列1.querySelector('.tk-文區 .tk-md');
      ok('B4 divider', !!md1 && md1.querySelectorAll('hr').length === 1, md1 ? md1.innerHTML.slice(0, 300) : 'none');
      ok('B4 table', !!md1 && !!md1.querySelector('table td'), '');
      ok('B4 nested list', !!md1 && !!md1.querySelector('li ul li'), '');
      ok('B4 markdown link', !!md1 && !!md1.querySelector('a.external-link[href="https://example.com"]'), '');
      ok('B4 internal link', !!md1 && !!md1.querySelector('a.internal-link'), '');
      const 盒 = md1 && md1.querySelector('input.task-list-item-checkbox');
      if (盒) 盒.click();
      await 等到(async () => (await app.vault.read(f)).includes('\t- [x] 勾我'));
      ok('B4 rendered checkbox ticks its own line', (await app.vault.read(f)).includes('\t- [x] 勾我'), await app.vault.read(f));
      // 1.6.3(A4):callout 裡的待辦、程式碼區塊裡的 `- [ ]` 都在時,每個方框只勾到它自己那一行
      {
        const 方框們 = () => [...(找列('方框').querySelector('.tk-文區 .tk-md') || document.createElement('div')).querySelectorAll('input.task-list-item-checkbox')];
        const 盒字 = (b) => (b.closest('li') || b.parentElement).textContent.split('\n')[0].trim();
        const 按 = async (字, 期望) => {
          const b = 方框們().find(x => 盒字(x) === 字);
          if (b) b.click();
          await 等到(async () => (await app.vault.read(f)).includes(期望));
          return !!b;
        };
        const 有最後 = await 按('最後', '\t- [x] 最後');
        let t = await app.vault.read(f);
        ok('A4 last box ticks its own line (after callout + code block)', 有最後 && t.includes('\t- [x] 最後') && t.includes('\t- [ ] 中間') && t.includes('\t> - [ ] 框內'), t.slice(t.indexOf('[方框]')));
        const 有框內 = await 按('框內', '\t> - [x] 框內');
        t = await app.vault.read(f);
        ok('A4 box inside a callout ticks its own line', 有框內 && t.includes('\t> - [x] 框內') && t.includes('\t- [ ] 中間'), t.slice(t.indexOf('[方框]')));
      }
      v.狀態.展開全部 = false; v.重畫清單(); await 等(300);
      const 列2 = 找列('雜燴');
      ok('B4 long content collapses', !!列2 && !!列2.querySelector('.tk-md.tk-md-收') && !!列2.querySelector('.tk-更多.tk-更多-收'), '');
    }    步('open 訂貨');
    const 列 = [...v.contentEl.querySelectorAll('.tk-列')].find(r => r.textContent.includes('訂貨'));
    const 鈕 = 列 && [...列.querySelectorAll('[aria-label],[title]')].find(b => /^(編輯|Edit)$/.test(b.title || b.getAttribute('aria-label') || ''));
    ok('edit button found', !!鈕, '');
    鈕.click();
    {   // 焦點的時間軸(診斷用):按編輯之後焦點在哪裡、有沒有被搶走
      const 記 = [];
      const 誰 = () => { const a = document.activeElement; return a ? a.tagName + (a.closest && a.closest('.tk-編框') ? '(編框)' : '') + '.' + String(a.className || '').slice(0, 24) : 'none'; };
      for (const ms of [30, 120, 300, 600]) { await 等(ms - (記.length ? [30, 120, 300, 600][記.length - 1] : 0)); 記.push(ms + 'ms ' + 誰()); }
      out.push('info focus timeline: ' + 記.join(' | '));
    }
    const 編 = v.contentEl.querySelector('.tk-編框.tk-即時編 .cm-editor');
    ok('live editor mounted', !!編, v.contentEl.querySelector('.tk-編框') ? v.contentEl.querySelector('.tk-編框').innerHTML.slice(0, 200) : 'no box');
    ok('live preview rendering', !!v.contentEl.querySelector('.tk-編框 .cm-strong, .tk-編框 .cm-highlight'), '');
    out.push('info board ' + v.contentEl.clientWidth + 'px, 窄=' + v.窄 + ', 觸=' + v.觸 + ', window focused=' + 有焦點);
    // 1.6.3(B4):只有手機按編輯不自動聚焦(看 觸,不看 窄 —— 窄 現在永遠是 true)
    if (v.觸) out.push('skip focused / activeEditor  (手機按編輯不自動聚焦,設計如此)');
    else {
      焦點ok('focused', document.activeElement && document.activeElement.closest && !!document.activeElement.closest('.tk-編框'), document.activeElement && document.activeElement.tagName);
      焦點ok('activeEditor set', app.workspace.activeEditor && app.workspace.activeEditor.editor === v.編框.編輯器?.editor || !!app.workspace.activeEditor, '');
    }
    步('type + autosave');
    // 1.6.3:記下編修中每一次整份重畫是誰叫的(編修框被重建 = Ctrl+Z 紀錄消失),失敗時一起印出來
    const 重畫紀錄 = [];
    const 原畫 = v.畫, 原清單 = v.重畫清單, 原設 = v.setViewData;
    const t0 = Date.now();
    v.畫 = function (...a) { 重畫紀錄.push('畫@' + (Date.now() - t0) + ' ' + String(new Error().stack).split('\n').slice(2, 4).map(x => x.trim().replace(/\(.*\)/, '')).join(' < ')); return 原畫.apply(this, a); };
    v.重畫清單 = function (...a) { 重畫紀錄.push('清單@' + (Date.now() - t0)); return 原清單.apply(this, a); };
    v.setViewData = function (d, c) { 重畫紀錄.push('setViewData@' + (Date.now() - t0) + ' 同回音=' + (v.插件.寫手.最後寫出 && v.插件.寫手.最後寫出[v.file.path] === d) + ' 略過到剩=' + ((v.略過到 || 0) - Date.now())); return 原設.call(this, d, c); };
    // type through the editor API
    const E = v.編框.編輯器.editor;
    E.replaceRange('\n新的一行', { line: E.lastLine(), ch: E.getLine(E.lastLine()).length });
    await 等到(async () => (await app.vault.read(f)).includes('\t新的一行'));
    let 文 = await app.vault.read(f);
    ok('autosaved', 文.includes('\t新的一行'), 文);
    ok('ed still last', /\n\t\[ed:: [^\]]+\]\n?$/.test(文.trimEnd() + '\n') || 文.trimEnd().endsWith(']'), 文);
    步('undo');
    E.undo();
    ok('undo in editor', !E.getValue().includes('新的一行'), E.getValue());
    步('esc');
    // Esc finishes
    // 自動存的回音重畫會把編修框重建一次:等它真的在畫面上再按 Esc(以前這裡偶爾抓到 null)
    await 等到(() => !!v.contentEl.querySelector('.tk-編框 .cm-content'), 3000);
    const cm = v.contentEl.querySelector('.tk-編框 .cm-content');
    ok('edit box alive before esc', !!cm, 重畫紀錄);
    if (cm) cm.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
    // 等到「存進去了」而且「完成編輯走完了」(檔案先變,編修框晚一點才關)
    // 1.6.3:12 秒(以前 5 秒,視窗有焦點時失敗過一次);失敗時記下寫手當時忙不忙,分得出是等太短還是真的存檔競爭
    const esc時 = Date.now();
    await 等到(async () => !(await app.vault.read(f)).includes('新的一行') && !v.contentEl.querySelector('.tk-編框') && !v.編框, 12000);
    文 = await app.vault.read(f);
    ok('esc closed editor', !v.contentEl.querySelector('.tk-編框'), '');
    ok('undo saved on close', !文.includes('新的一行'),
      { 等了: Date.now() - esc時, 存中: !!v.存中, 上次存的有新行: String(v.上次存的 || '').includes('新的一行'), 框還在: !!v.編框, 重畫: 重畫紀錄, 文: 文.slice(0, 120) });
    v.畫 = 原畫; v.重畫清單 = 原清單; v.setViewData = 原設;
    { const k訂 = v.卡片.find(x => x.主題 === '訂貨');
      ok('B5 stays expanded after save', !!(k訂 && v.狀態.展開[k訂.鍵]), Object.keys(v.狀態.展開 || {})); }
    ok('editor unloaded (no leak)', !v.編框, '');
    步('new card');
    // ---- 新增卡片的內容框 ----
    ok('new-card box is live', !!v.contentEl.querySelector('.tk-新入 .cm-editor') && !!v.內輸.編輯器, '');   // 1.6.3 mockup v7:新增輸入框是 .tk-新入
    v.狀態.新主題 = '即時新增';
    { const NE = v.內輸.編輯器.editor; NE.replaceRange('**新卡片**內容', { line: 0, ch: 0 }); }   // 模擬打字(直接設 value 不會觸發「改了」,跟 textarea 一樣)
    await 等(300);
    ok('new-card box feeds search', v.狀態.新內容 === '**新卡片**內容', v.狀態.新內容);
    await 限時(v.送出新增(), 8000, '送出新增'); await 等到(async () => (await app.vault.read(f)).includes('#即時新增'));
    文 = await app.vault.read(f);
    ok('new card written from live box', 文.includes('#即時新增') && 文.includes('\t**新卡片**內容'), 文);
    ok('new-card box cleared', v.內輸 && v.內輸.value === '', v.內輸 && v.內輸.value);
    步('comment');
    // ---- 寫留言 ----
    const kc = v.卡片.find(x => x.主題 === '訂貨');
    v.狀態.寫留言 = kc.鍵; v.重畫清單(); await 等(400);
    const 留框 = v.contentEl.querySelector('.tk-即時框:not(.tk-編框) .cm-content');
    ok('comment box is live', !!留框, '');
    const 寫 = [...v.__即時們].filter(x => x.isConnected && x !== v.內輸).pop();
    寫.value = '留言 ==重點==';
    寫.編輯器.cm.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', ctrlKey: true, bubbles: true, cancelable: true }));
    await 等到(async () => /\t\[cm:: [^\]]+\] 留言 ==重點==/.test(await app.vault.read(f)));
    文 = await app.vault.read(f);
    ok('comment written', /\t\[cm:: [^\]]+\] 留言 ==重點==/.test(文), 文);
    ok('no leaked editors', [...v.__即時們].every(x => x.isConnected), [...v.__即時們].length);    ok('plugin children = live editors', P._children ? P._children.length - (v.__即時們 ? v.__即時們.size : 0) === kids0 - 1 : true, [kids0, P._children && P._children.length, v.__即時們 && v.__即時們.size]);
  } catch (e) {
    out.push('FAIL exception ' + e.stack);
  } finally {
    步('cleanup');
    try { await 限時(leaf.view.收掉編修(), 5000, 'cleanup 收掉編修'); } catch (e) { out.push('FAIL ' + e.message); }
    leaf.detach();
    await app.vault.trash(f, true);
    P.存設定 = 原存;
    P.設定.排程顯示 = 原顯;
    收鍵.forEach((k, i) => app.saveLocalStorage(k, 原收[i] || null));
  }
  out.push('DONE');
  return out.join('\n');
})().then(r => window.__ctEditorTest = r, e => window.__ctEditorTest = 'FAIL ' + e.stack);
'started'
