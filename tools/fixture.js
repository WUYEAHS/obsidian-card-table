/* 1.6.3(B6)版面檢查用的 ZZ-css-fixture.md 每次從 repo 的範本重建(tools/fixture-css.md)。
   以前那份放在 vault 裡,被手動測試蓋掉之後只剩 2 張卡片,check4 還以為全部都量過了。
   {{今}} {{前N}} {{後N}} = 今天 / N 天前 / N 天後。用法:window.__fxSrc = 範本路徑; eval(這個檔案)。 */
window.__fx = 'run';
(async () => {
  const 範本 = require('fs').readFileSync(window.__fxSrc, 'utf8');
  const 日 = (n) => window.moment().add(n, 'days').format('YYYY-MM-DD');
  const 文 = 範本.replace(/\{\{今\}\}/g, 日(0)).replace(/\{\{前(\d+)\}\}/g, (a, n) => 日(-n)).replace(/\{\{後(\d+)\}\}/g, (a, n) => 日(+n));
  const path = 'ZZ-css-fixture.md';
  const f = app.vault.getAbstractFileByPath(path);
  if (f) await app.vault.modify(f, 文); else await app.vault.create(path, 文);
  window.__fx = 'ok ' + 文.split('\n').filter(x => /^- \[/.test(x)).length + ' cards';
})().catch(e => window.__fx = 'ERR ' + e.message);
