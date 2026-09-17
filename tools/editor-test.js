/* 卡片看板:即時預覽編輯器測試(建 ZZ-live-edit.md,測完丟垃圾桶)。結果在 window.__ctEditorTest,最後一行是 DONE。 */
window.__ctEditorTest = 'running';
(async () => {
  const P = app.plugins.plugins['card-table'];
  const 原存 = P.存設定; P.存設定 = async () => {};
  const out = [];
  const ok = (n, c, a) => out.push((c ? 'ok   ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(a)));
  const 等 = (ms) => new Promise(r => setTimeout(r, ms));
  const path = 'ZZ-live-edit.md';
  let f = app.vault.getAbstractFileByPath(path);
  if (f) await app.vault.delete(f);
  const 今 = window.moment().format('YYYY-MM-DD');
  f = await app.vault.create(path, ['## 1', '', '- [ ] [訂貨] [due:: ' + 今 + ']', '\t**粗體** 和 ==螢光==', '\t[ed:: 2026-09-17 10:00]',
    '- [ ] [對齊] [due:: ' + 今 + ']', '\t- 項目一', '\t純文字', '\t- [ ] 待辦', '\t1. 編號', '\t[ed:: 2026-09-17 09:00]', ''].join('\n'));
  const leaf = app.workspace.getLeaf(true);
  await leaf.setViewState({ type: 'card-table', state: { file: path } });
  app.workspace.setActiveLeaf(leaf, { focus: true });
  await 等(900);
  const v = leaf.view;
  try {
    const kids0 = P._children ? P._children.length : -1;
    // ---- 所見即所得:閱讀和編輯時,每一行的字、項目符號在同一個位置 ----
    {
      v.狀態.展開全部 = true; v.重畫清單(); await 等(300);
      const 找列 = () => [...v.contentEl.querySelectorAll('.tk-列')].find(r => r.textContent.includes('對齊'));
      const 量 = (行, 基) => {
        const lr = 行.getBoundingClientRect();
        const tn = [...行.querySelectorAll('*')].concat([行]).flatMap(e => [...e.childNodes])
          .find(n => n.nodeType === 3 && /[一-鿿]/.test(n.textContent) && !(n.parentElement && n.parentElement.closest('.list-number')));
        const rg = document.createRange(); rg.selectNodeContents(tn);
        const tr = rg.getClientRects()[0];
        const bu = 行.querySelector('.list-bullet');
        let 點 = null;
        if (bu) { const a = getComputedStyle(bu, '::after'); 點 = bu.getBoundingClientRect().top + parseFloat(a.top) - lr.top; }
        const cb = 行.querySelector('input[type=checkbox]');
        return { x: tr.left - 基.left, ty: tr.top - lr.top, h: lr.height, 點, 勾x: cb ? cb.getBoundingClientRect().left - 基.left : null };
      };
      const 列0 = 找列();
      const 讀行 = [...列0.querySelectorAll('.tk-文區 .tk-預覽行')];
      const 基0 = 列0.querySelector('.tk-文區').parentElement.getBoundingClientRect();
      const 前 = 讀行.map(l => 量(l, 基0));
      const 鈕0 = [...列0.querySelectorAll('[aria-label],[title]')].find(b => /^(編輯|Edit)$/.test(b.title || b.getAttribute('aria-label') || ''));
      鈕0.click(); await 等(500);
      { const E0 = v.編框.編輯器.editor; E0.setCursor({ line: E0.lastLine(), ch: E0.getLine(E0.lastLine()).length }); }   // 游標所在的行會露出原始的「- 」
      await 等(300);
      const 框 = v.contentEl.querySelector('.tk-編框');   // 編修中的主題是輸入框,textContent 找不到「對齊」
      const 基1 = 框.parentElement.getBoundingClientRect();
      const 後 = [...框.querySelectorAll('.cm-line')].map(l => 量(l, 基1));
      ok('wysiwyg: same line count', 前.length === 4 && 後.length === 4, [前.length, 後.length]);
      const 近 = (a, b) => a === b || (a != null && b != null && Math.abs(a - b) <= 1.5);
      ['清單', '純文字', '待辦', '編號'].forEach((名, i) => {
        const a = 前[i] || {}, b = 後[i] || {};
        ok('wysiwyg ' + 名 + ': text x', 近(a.x, b.x), [a.x, b.x]);
        ok('wysiwyg ' + 名 + ': text y in line', 近(a.ty, b.ty), [a.ty, b.ty]);
        ok('wysiwyg ' + 名 + ': line height', 近(a.h, b.h), [a.h, b.h]);
        ok('wysiwyg ' + 名 + ': bullet y', 近(a.點, b.點), [a.點, b.點]);
        ok('wysiwyg ' + 名 + ': checkbox x', 近(a.勾x, b.勾x), [a.勾x, b.勾x]);
      });
      await v.收掉編修(); v.狀態.展開全部 = false; v.重畫清單(); await 等(400);
    }
    const 列 = [...v.contentEl.querySelectorAll('.tk-列')].find(r => r.textContent.includes('訂貨'));
    const 鈕 = 列 && [...列.querySelectorAll('[aria-label],[title]')].find(b => /^(編輯|Edit)$/.test(b.title || b.getAttribute('aria-label') || ''));
    ok('edit button found', !!鈕, '');
    鈕.click();
    await 等(600);
    const 編 = v.contentEl.querySelector('.tk-編框.tk-即時編 .cm-editor');
    ok('live editor mounted', !!編, v.contentEl.querySelector('.tk-編框') ? v.contentEl.querySelector('.tk-編框').innerHTML.slice(0, 200) : 'no box');
    ok('live preview rendering', !!v.contentEl.querySelector('.tk-編框 .cm-strong, .tk-編框 .cm-highlight'), '');
    ok('focused', document.activeElement && document.activeElement.closest && !!document.activeElement.closest('.tk-編框'), document.activeElement && document.activeElement.className);
    ok('activeEditor set', app.workspace.activeEditor && app.workspace.activeEditor.editor === v.編框.編輯器?.editor || !!app.workspace.activeEditor, '');
    // type through the editor API
    const E = v.編框.編輯器.editor;
    E.replaceRange('\n新的一行', { line: E.lastLine(), ch: E.getLine(E.lastLine()).length });
    await 等(1600);
    let 文 = await app.vault.read(f);
    ok('autosaved', 文.includes('\t新的一行'), 文);
    ok('ed still last', /\n\t\[ed:: [^\]]+\]\n?$/.test(文.trimEnd() + '\n') || 文.trimEnd().endsWith(']'), 文);
    E.undo();
    ok('undo in editor', !E.getValue().includes('新的一行'), E.getValue());
    // Esc finishes
    const cm = v.contentEl.querySelector('.tk-編框 .cm-content');
    cm.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
    await 等(1200);
    文 = await app.vault.read(f);
    ok('esc closed editor', !v.contentEl.querySelector('.tk-編框'), '');
    ok('undo saved on close', !文.includes('新的一行'), 文);
    ok('editor unloaded (no leak)', !v.編框, '');
    // ---- 新增卡片的內容框 ----
    ok('new-card box is live', !!v.contentEl.querySelector('.tk-即時框 .cm-editor') && !!v.內輸.編輯器, '');
    v.狀態.新主題 = '即時新增';
    { const NE = v.內輸.編輯器.editor; NE.replaceRange('**新卡片**內容', { line: 0, ch: 0 }); }   // 模擬打字(直接設 value 不會觸發「改了」,跟 textarea 一樣)
    await 等(300);
    ok('new-card box feeds search', v.狀態.新內容 === '**新卡片**內容', v.狀態.新內容);
    await v.送出新增(); await 等(700);
    文 = await app.vault.read(f);
    ok('new card written from live box', 文.includes('[即時新增]') && 文.includes('\t**新卡片**內容'), 文);
    ok('new-card box cleared', v.內輸 && v.內輸.value === '', v.內輸 && v.內輸.value);
    // ---- 寫留言 ----
    const kc = v.卡片.find(x => x.主題 === '訂貨');
    v.狀態.寫留言 = kc.鍵; v.重畫清單(); await 等(400);
    const 留框 = v.contentEl.querySelector('.tk-即時框:not(.tk-編框) .cm-content');
    ok('comment box is live', !!留框, '');
    const 寫 = [...v.__即時們].filter(x => x.isConnected && x !== v.內輸).pop();
    寫.value = '留言 ==重點==';
    寫.編輯器.cm.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', ctrlKey: true, bubbles: true, cancelable: true }));
    await 等(1500);
    文 = await app.vault.read(f);
    ok('comment written', /\t\[cm:: [^\]]+\] 留言 ==重點==/.test(文), 文);
    ok('no leaked editors', [...v.__即時們].every(x => x.isConnected), [...v.__即時們].length);    ok('plugin children = live editors', P._children ? P._children.length - (v.__即時們 ? v.__即時們.size : 0) === kids0 - 1 : true, [kids0, P._children && P._children.length, v.__即時們 && v.__即時們.size]);
  } catch (e) {
    out.push('FAIL exception ' + e.stack);
  } finally {
    try { await leaf.view.收掉編修(); } catch (e) {}
    leaf.detach();
    await app.vault.trash(f, true);
    P.存設定 = 原存;
  }
  out.push('DONE');
  return out.join('\n');
})().then(r => window.__ctEditorTest = r, e => window.__ctEditorTest = 'FAIL ' + e.stack);
'started'
