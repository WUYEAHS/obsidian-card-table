/* 卡片看板:把 repo 的文件鏡像到 vault(唯讀),讓使用者在 Obsidian(和手機)裡看、用 tandem comments 留言。
   用法:.\tools\mirror-docs.ps1(它先設 window.__ctRepo,再 eval 這個檔)。
   ・目標資料夾:vault 裡「Main navigator.md」所在的資料夾 + /Repo mirror。
   ・每一份最上面加一行來源說明(有 frontmatter 的接在 frontmatter 後面),其他照 repo 原文。
   ・鏡像裡已經有的 ```tandem-comments 區塊(使用者留的言)原封不動接回最後面。
   ・內容沒變就不寫(不製造 Sync 流量);repo 裡已經沒有的來源只回報,不刪。
   結果寫在 window.__ctMirror:每一行 new / updated / same / FAIL,最後一行 DONE。 */
(() => {
  window.__ctMirror = 'running';
  const 跑 = async () => {
    const fs = require('fs'), path = require('path');
    const repo = window.__ctRepo;
    if (!repo || !fs.existsSync(path.join(repo, 'manifest.json'))) return 'FAIL window.__ctRepo is not the repo: ' + repo;
    const 索引 = app.vault.getMarkdownFiles().find(f => f.basename === 'Main navigator');
    if (!索引) return 'FAIL "Main navigator.md" not found in the vault';
    const 上層 = (索引.parent && 索引.parent.path && 索引.parent.path !== '/') ? 索引.parent.path + '/' : '';
    const 夾 = 上層 + 'Repo mirror';
    if (!app.vault.getAbstractFileByPath(夾)) await app.vault.createFolder(夾);

    const 清單 = [
      ['README.md', 'Card Table README (en)'],
      ['README.zh-TW.md', 'Card Table README (zh-TW)'],
      ['CHANGELOG.md', 'Card Table CHANGELOG'],
      ['CLAUDE.md', 'Card Table CLAUDE'],
      ['docs/roadmap.md', 'Card Table roadmap']
    ];
    const 加 = (子, 前綴, 挑) => {
      const d = path.join(repo, 子);
      if (!fs.existsSync(d)) return;
      fs.readdirSync(d).sort().forEach(n => { const r = 挑(n); if (r) 清單.push([子 + '/' + r[0], 前綴 + r[1]]); });
    };
    加('.claude/skills', 'Skill - ', n => fs.existsSync(path.join(repo, '.claude', 'skills', n, 'SKILL.md')) ? [n + '/SKILL.md', n] : null);
    加('.claude/agents', 'Agent - ', n => /\.md$/.test(n) ? [n, n.slice(0, -3)] : null);

    const t = new Date(), 二 = n => String(n).padStart(2, '0');
    const 時 = t.getFullYear() + '-' + 二(t.getMonth() + 1) + '-' + 二(t.getDate()) + ' ' + 二(t.getHours()) + ':' + 二(t.getMinutes());
    const 區塊Re = /\n```tandem-comments\n[\s\S]*$/;
    /* 比較時不看:說明那一行的時間、表格的對齊空白(使用者的 Obsidian 打開鏡像時會自動把表格排整齊,
       那不算內容變動,不要因此重寫一次、製造 Sync 流量) */
    const 去說明 = s => s.replace(/^> \[!info\] 唯讀鏡像:.*\n/m, '').split('\n')
      .map(l => /^\s*\|/.test(l) ? l.replace(/\s+/g, ' ').replace(/-{3,}/g, '---') : l).join('\n');
    const 結果 = [];
    for (const [來源, 名] of 清單) {
      try {
        let 文 = fs.readFileSync(path.join(repo, 來源), 'utf8').replace(/\r\n/g, '\n').replace(/\s+$/, '') + '\n';
        const 說明 = '> [!info] 唯讀鏡像:repo 的 `' + 來源 + '`,' + 時 + ' 更新。要改請改 repo,再跑 `tools/mirror-docs.ps1`;在這裡留的 tandem 留言會保留。\n\n';
        const fm = /^---\n[\s\S]*?\n---\n/.exec(文);
        文 = fm ? fm[0] + '\n' + 說明 + 文.slice(fm[0].length).replace(/^\n+/, '') : 說明 + 文;
        const 路 = 夾 + '/' + 名 + '.md';
        const f = app.vault.getAbstractFileByPath(路);
        if (!f) { await app.vault.create(路, 文); 結果.push('new     ' + 名); continue; }
        let 變 = false;
        await app.vault.process(f, (舊) => {
          const m = 區塊Re.exec(舊);
          const 新 = m ? 文.replace(/\n$/, '') + m[0] : 文;
          if (去說明(新) === 去說明(舊)) return 舊;       // 只有時間或表格對齊不一樣 = 沒變
          變 = true;
          return 新;
        });
        結果.push((變 ? 'updated ' : 'same    ') + 名);
      } catch (e) { 結果.push('FAIL    ' + 名 + ' ' + (e && e.message)); }
    }
    const 名們 = new Set(清單.map(x => x[1]));
    app.vault.getMarkdownFiles().filter(f => f.parent && f.parent.path === 夾 && !名們.has(f.basename))
      .forEach(f => 結果.push('orphan  ' + f.basename + '(repo 裡已經沒有這份,要刪請手動)'));
    結果.push('DONE ' + 夾);
    return 結果.join('\n');
  };
  跑().then(r => { window.__ctMirror = r; }, e => { window.__ctMirror = 'FAIL ' + (e && e.message); });
  return 'started';
})()
