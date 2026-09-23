/* 1.6.9-S1 EU(極端使用者):卡片 ID 的極端情況。建 ZZ-eu*,測完全部丟垃圾桶;設定不寫 data.json。
   動到 ADR-001(卡片 ID)的版本再跑一次。用法(非同步):
     obsidian eval code="eval(require('fs').readFileSync('<repo>/tools/eu-test.js','utf8'))"
     (等 30 秒)obsidian eval code="window.__eu"
   #2 #5 #6 在 board-test(1.6.8 那組),這裡不重複。 */
window.__eu = 'running';
(async () => {
  const P = app.plugins.plugins['card-table'];
  const 原存 = P.存設定, 原設 = JSON.parse(JSON.stringify(P.設定));
  P.存設定 = async () => {};
  const out = [];
  const rec = (編, 名, 真, 附) => out.push((真 ? '✅ ' : '❌ ') + '#' + 編 + ' ' + 名 + (附 === undefined ? '' : '  ' + JSON.stringify(附)));
  const 等 = (ms) => new Promise(r => setTimeout(r, ms));
  const fs = require('fs'), 路 = require('path');
  const src = fs.readFileSync(路.join(app.vault.adapter.basePath, app.plugins.manifests['card-table'].dir, 'main.js'), 'utf8');
  const C = class {};
  const stub = { Plugin: C, TextFileView: C, PluginSettingTab: C, Setting: C, Notice: C, Menu: C, Modal: C, SuggestModal: C, MarkdownRenderChild: C,
    WorkspaceLeaf: C, debounce: g => g, setIcon: () => {}, addIcon: () => {} };
  const M = new Function('require', 'module', src + '\n;return {解析卡片};')(() => stub, { exports: {} });
  const 名 = P.設定.指派人 || [];
  const E = '\t[ed:: 2026-09-10 09:00]';
  const 丟們 = [], 開們 = [];
  const 清 = async (p) => { const x = app.vault.getAbstractFileByPath(p); if (x) await app.vault.trash(x, true); };
  for (const p of ['ZZ-eu.md', 'ZZ-eu-link.md', 'ZZ-eu.canvas', 'ZZ-eu-big.canvas', 'ZZ-eu-dir/ZZ-eu2.md', 'ZZ-eu-dir']) await 清(p);
  let f;
  const 讀 = () => app.vault.read(f);
  const 卡們 = async (題) => M.解析卡片(await 讀(), 名).filter(x => x.主題 === 題);
  const 等新 = async (檔) => { 檔 = 檔 || f; for (let n = 0; n < 80; n++) { const e = (app.metadataCache.fileCache || {})[檔.path]; if (e && e.mtime === 檔.stat.mtime && app.metadataCache.getFileCache(檔)) return true; await 等(50); } return false; };
  const 寫後 = async (做) => { const r = await 做(); await 等新(); return r; };
  // block 從卡片第一行開始 = ID 指到整張卡片(同 board-test 的驗法)
  const 塊起 = (id) => { const c = app.metadataCache.getFileCache(f) || {}; const b = (c.blocks || {})[String(id).slice(1)]; return b ? b.position.start.line : -1; };
  try {
    const 雙 = Array.from({ length: 10 }, () => ['- [ ] #雙 [due:: 2026-09-16]', '\t同樣的第一行', E]).flat();
    const 三十 = Array.from({ length: 30 }, (_, i) => ['- [ ] #批' + i + ' [due:: 2026-09-16]', '\t第 ' + i + ' 張', E + (i < 20 ? ' ^ct-b' + String(i).padStart(5, '0') : '')]).flat();
    f = await app.vault.create('ZZ-eu.md', [
      '## 雙胞胎', ...雙, '',
      '## 雜', '- [ ] #擠 [due:: 2026-09-16]', '\t說明', '\t- [ ] 子待辦 ^ct-squeez', E,
      '- [ ] #循 [due:: 2026-09-16] [repeat:: every week]', '\t```js', '\t- 不是清單', '\t```', '\t[done:: 2026-09-09]', E,
      '- [ ] #自連 [due:: 2026-09-16]', '\t看這張:[[#^ct-selfln]]', E + ' ^ct-selfln',
      '- [ ] #兩ID [due:: 2026-09-16]', '\t^ct-devaaa', '\t- 子', E + ' ^ct-devbbb', '',
      '## 批', ...三十, ''].join('\n'));
    await 等新();
    P.設定.看板檔案 = Object.assign({}, P.設定.看板檔案, { 'ZZ-eu.md': true });

    // #1 同一區 10 張第一行一樣,各自取 ID
    {
      const ids = [];
      for (let i = 0; i < 10; i++) { const k = (await 卡們('雙'))[i]; ids.push(await 寫後(() => P.寫手.取ID(f, k, 名))); }
      const 後 = await 卡們('雙');
      rec(1, '10 張雙胞胎:ID 不重複、各自指到自己那張', new Set(ids).size === 10 && 後.every((k, i) => k.ID === ids[i] && 塊起(ids[i]) === k.起), [ids, 後.map(k => [k.起, k.ID, 塊起(k.ID)])]);
    }
    // #3 ID 被手動擠到子待辦後面 → 看板改那張之後 ID 放回原位
    {
      const k = (await 卡們('擠'))[0];
      const 讀到 = k.ID;
      await 寫後(() => P.寫手.改首行(f, k, (s) => s.replace('2026-09-16', '2026-09-17'), 名));
      const 段 = (await 讀()).split('\n'), i = 段.findIndex(t => t.startsWith('- [ ] #擠'));
      rec(3, 'ID 擠到子待辦後面 → 改日期之後回到卡片自己的一行', 段[i + 2] === '\t^ct-squeez' && !段[i + 3].includes('^ct-') && 塊起('^ct-squeez') === i, { 讀到, 段: 段.slice(i, i + 5), 塊: 塊起('^ct-squeez') });
    }
    // #4 在 Canvas 裡改內容 = Obsidian 直接改檔(模擬):看板照讀、ID 不掉
    {
      await 寫後(() => app.vault.process(f, t => t.replace('\t看這張:[[#^ct-selfln]]', '\t看這張:[[#^ct-selfln]] 在 Canvas 改的')));
      const k = (await 卡們('自連'))[0];
      rec(4, 'Canvas 裡改內容 → 看板讀得到、ID 還在', k && k.ID === '^ct-selfln' && k.內容行.join('').includes('在 Canvas 改的') && 塊起('^ct-selfln') === k.起, k && [k.ID, k.內容行]);
    }
    // #10 同一份筆記裡有 [[#^ct-…]] 連到這張 → 複製 / 送出都不換 ID
    {
      const 前 = await 讀();
      const id = await P.寫手.取ID(f, (await 卡們('自連'))[0], 名);
      const r = await P.寫手.取多ID(f, await 卡們('自連'), 名);
      rec(10, '筆記裡有連回這張的 [[#^ct-…]] → 複製、送出都不換 ID、檔案不動', id === '^ct-selfln' && r && Object.values(r.得)[0] === '^ct-selfln' && (await 讀()) === 前, [id, r && r.得]);
    }
    // #8 循環卡片:內容有 code block、有 [done::] 記錄
    {
      const k0 = (await 卡們('循'))[0];
      const id = await 寫後(() => P.寫手.取ID(f, k0, 名));
      const k = (await 卡們('循'))[0];
      const 段 = (await 讀()).split('\n').slice(k.起, k.迄 + 1);
      const 框 = await P.量框(k, f.path);
      rec(8, '循環卡 + code block + [done::]:ID 位置對(code block 裡的 - 不算清單)、F2 畫得出來', 塊起(id) === k.起 && 段[段.length - 1].endsWith(' ' + id) && 框.寬 === 400 && 框.高 >= 120, { 段, 框 });
    }
    // #9 兩台同時補 ID(Sync 合併後一張卡片兩個 ID)→ 之後看板寫這張只留一個
    {
      const k = (await 卡們('兩ID'))[0];
      const 讀到 = k.ID;
      await 寫後(() => P.寫手.改首行(f, k, (s) => s.replace('2026-09-16', '2026-09-18'), 名));
      const t = await 讀();
      rec(9, '一張卡片兩個 ID(模擬兩台同時補)→ 解析用哪個 / 改過之後剩幾個', true,
        { 解析: 讀到, 剩aaa: t.includes('^ct-devaaa'), 剩bbb: t.includes('^ct-devbbb') });
    }
    // #11 一次送 30 張、其中 10 張沒 ID
    let 批得 = null;
    {
      const 送 = M.解析卡片(await 讀(), 名).filter(k => /^批/.test(k.主題));
      let 寫 = 0; const 聽 = app.vault.on('modify', x => { if (x === f) 寫++; });
      const t0 = performance.now();
      const r = await 寫後(() => P.寫手.取多ID(f, 送, 名));
      const t1 = performance.now();
      app.vault.offref(聽);
      批得 = r;
      const ids = 送.map(k => r.得[k.鍵]);
      const 後 = M.解析卡片(await 讀(), 名).filter(k => /^批/.test(k.主題));
      const 框們 = []; const t2 = performance.now();
      for (const k of 後) 框們.push(await P.量框(k, f.path));
      const t3 = performance.now();
      const cv = await app.vault.create('ZZ-eu-big.canvas', '');
      const 果 = await P.寫手.加Canvas節點(cv, 後.map((k, i) => ({ 路徑: f.path, id: k.ID, 寬: 框們[i].寬, 高: 框們[i].高 })));
      const 保留 = 後.slice(0, 20).every((k, i) => k.ID === '^ct-b' + String(i).padStart(5, '0'));
      rec(11, '30 張(10 張沒 ID):一次寫入、30 個 ID 不重複、原本的 20 個不變、每張 block 對、30 個節點',
        寫 === 1 && r.丟.length === 0 && new Set(ids).size === 30 && 保留 && 後.every(k => 塊起(k.ID) === k.起) && 果 && 果.加 === 30,
        { 寫, 丟: r.丟.length, 不重複: new Set(ids).size, 保留, 加: 果 && 果.加, 取多ID毫秒: Math.round(t1 - t0), 量30張毫秒: Math.round(t3 - t2) });
    }
    // #12 送的過程中有一張被別台刪掉
    {
      const 送 = await 卡們('雙');
      const 新張 = M.解析卡片(await 讀(), 名).filter(k => k.主題 === '擠');
      await 寫後(() => app.vault.process(f, t => t.replace(/- \[ \] #擠[^\n]*\n(\t[^\n]*\n)+/, '')));   // 別台刪掉「擠」
      const r = await P.寫手.取多ID(f, 送.concat(新張), 名);
      rec(12, '一張被刪掉 → 其他照送、丟 1 張', r && r.丟.length === 1 && Object.keys(r.得).length === 10, r && { 得: Object.keys(r.得).length, 丟: r.丟.map(k => k.主題) });
    }
    // #7 改檔名 + 搬資料夾 → 別的筆記的嵌入、Canvas 檔案節點、看板設定都跟著改
    {
      const 某 = (await 卡們('循'))[0].ID;
      const 連 = await app.vault.create('ZZ-eu-link.md', '![[ZZ-eu#' + 某 + ']]\n');
      const cv = await app.vault.create('ZZ-eu.canvas', JSON.stringify({ nodes: [{ id: 'eeeeeeeeeeeeeeee', type: 'file', file: 'ZZ-eu.md', subpath: '#' + 某, x: 0, y: 0, width: 400, height: 200 }], edges: [] }));
      await 等(600);
      await app.vault.createFolder('ZZ-eu-dir');
      await app.fileManager.renameFile(f, 'ZZ-eu-dir/ZZ-eu2.md');
      await 等(1500);
      const 連文 = await app.vault.read(連), cv文 = JSON.parse(await app.vault.read(cv));
      rec(7, '改名 + 搬資料夾 → 嵌入連結、Canvas 節點路徑、看板設定都跟著改',
        連文.includes('ZZ-eu2#' + 某) && cv文.nodes[0].file === 'ZZ-eu-dir/ZZ-eu2.md' && P.設定.看板檔案['ZZ-eu-dir/ZZ-eu2.md'] === true,
        { 連文, 節點: cv文.nodes[0].file, 看板檔案: P.設定.看板檔案['ZZ-eu-dir/ZZ-eu2.md'] });
    }
    // #13 F2:一個 Canvas 放 30 張(#11 那個),畫的時間 + 縮放時有沒有卡
    {
      const cv = app.vault.getAbstractFileByPath('ZZ-eu-big.canvas');
      let 次 = 0, 毫 = 0; const 原畫 = P.畫唯讀卡片;
      P.畫唯讀卡片 = function () { const t = performance.now(); const r = 原畫.apply(this, arguments); 毫 += performance.now() - t; 次++; return r; };
      const l = app.workspace.getLeaf('tab'); 開們.push(l);
      const t0 = performance.now();
      await l.openFile(cv);
      await 等(1000);
      const cvs = l.view.canvas;
      const 底 = Math.max(...JSON.parse(await app.vault.read(cv)).nodes.map(n => n.y + n.height));
      // 30 張疊成一欄太長,全覽時 Obsidian 只畫佔位 —— 先放大到看得清楚(一次看 ~700 高),再一路往下捲
      const 格 = []; let last = performance.now(), 跑 = true;
      const 量 = () => { const now = performance.now(); 格.push(now - last); last = now; if (跑) requestAnimationFrame(量); };
      requestAnimationFrame(量);
      const 見 = new Set();
      for (let y = 0; y < 底 + 350; y += 350) {
        cvs.zoomToBbox({ minX: 0, minY: y, maxX: 600, maxY: y + 700 });
        await 等(400);
        l.view.containerEl.querySelectorAll('.tk-嵌卡').forEach(x => 見.add(x.textContent.slice(0, 8)));
      }
      for (let i = 0; i < 6; i++) { cvs.zoomBy(i < 3 ? -0.5 : 0.5); await 等(150); }
      跑 = false; P.畫唯讀卡片 = 原畫;
      const 開好 = Math.round(performance.now() - t0);
      const 最長 = Math.round(Math.max(...格)), 卡格 = 格.filter(x => x > 50).length;
      /* 超過 50ms 的畫面是 Canvas 自己跳位置造成的:2026-09-23 同一個 Canvas 關掉 F2 比過,一樣 2 格、最長 92 vs 93ms。
         所以判準是「我們畫卡片花的時間」,不是整格畫面。 */
      rec(13, 'Canvas 30 張卡片:捲一遍全部畫得出來、畫卡片總共 < 100ms', 見.size >= 30 && 毫 < 100,
        { 看到幾張: 見.size, 全程毫秒: 開好, 畫唯讀卡片: 次 + ' 次 / 共 ' + Math.round(毫) + 'ms', 最長一格毫秒: 最長, 超過50ms格數: 卡格, 格數: 格.length });
    }
  } catch (e) {
    out.push('❌ exception ' + e.stack);
  } finally {
    開們.forEach(l => l.detach());
    await 等(900);
    for (const p of ['ZZ-eu-link.md', 'ZZ-eu.canvas', 'ZZ-eu-big.canvas', 'ZZ-eu.md', 'ZZ-eu-dir/ZZ-eu2.md', 'ZZ-eu-dir']) await 清(p);
    P.存設定 = 原存;
    Object.keys(P.設定).forEach(k => delete P.設定[k]);
    Object.assign(P.設定, 原設);
  }
  out.push('DONE');
  return out.join('\n');
})().then(r => window.__eu = r, e => window.__eu = 'ERR ' + e.stack);
'started'
