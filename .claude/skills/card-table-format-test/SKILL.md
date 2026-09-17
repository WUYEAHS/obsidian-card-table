---
name: card-table-format-test
description: 卡片看板(obsidian-card-table)的格式與寫入測試流程。只要改到筆記格式的讀寫 —— 拆首行、組首行、蓋卡、解析卡片、收尾、定位文、寫手的任何方法、轉整份、照打行、留言 / 循環 / 日期的正規表示式 —— 就在改完之後使用;新增格式行為時也用它補測試案例。
---

# 卡片看板:格式與寫入測試

兩支測試都在 repo 的 `tools/`:

| 檔案 | 測什麼 | 會不會寫檔 |
| --- | --- | --- |
| `tools/format-test.js` | 純函式:新舊寫法解析、`組首行` 往返、`蓋卡` 轉換、`轉整份`、留言 / 記錄 / 待辦、雙胞胎定位 | 不寫 |
| `tools/editor-test.js` | 所見即所得(閱讀和編輯時每一行的字、項目符號、待辦方框位置差 1.5px 以內)、即時預覽編輯器:卡片編修(掛上、即時呈現、聚焦、自動存、`[ed::]` 還在最後、復原、Esc 收起並存檔、卸乾淨)、新增框(搜尋、送出、清空)、寫留言(Ctrl+Enter 送出)、沒有殘留的編輯器 | 建 `ZZ-live-edit.md`,測完丟垃圾桶 |
| `tools/board-test.js` | 真的看板:打勾 → 反悔、改日期、改內容、勾待辦、本次完成、留言、置頂、新增、融合、封存、全部轉換(含同資料夾備份) | 建 `ZZ-board-test.md`,測完丟垃圾桶;`存設定` 換成空函式,設定物件最後還原 |

`format-test.js` 讀的是 **vault 裡已部署的** `main.js`(`app.plugins.manifests['card-table'].dir`),所以一定要先部署、重載再跑。

## 跑法

### Windows(一鍵)

```powershell
.\tools\run-tests.ps1            # vault 那份複製回 repo → 語法檢查 → 重載 → 確認版本 → 三支測試
.\tools\run-tests.ps1 -SkipBoard # 只跑純函式
.\tools\run-tests.ps1 -FromRepo  # 反方向:repo → vault(git checkout 之後)
```

⚠ 2026-09-17 起程式先改在 vault 的 `.obsidian/plugins/obsidian-card-table/`(使用者要同步到手機),
所以預設是 vault → repo。只改了 repo 的 main.js 就跑預設,會被 vault 的舊版蓋掉。

最後一行要是 `ALL TESTS PASSED`。失敗會印出整份結果。

### Mac(沒有 PowerShell、沒有 node)

1. 把 `main.js`、`manifest.json`、`styles.css` 複製進 `/Users/wujiajun/Documents/Cintrun3/.obsidian/plugins/card-table/`(**不要動 `data.json`**)。
2. CLI 是 `/Applications/Obsidian.app/Contents/MacOS/obsidian`:
   ```
   obsidian plugin:reload id=card-table
   obsidian eval code="app.plugins.plugins['card-table'].manifest.version"
   obsidian eval code="eval(require('fs').readFileSync('<repo>/tools/format-test.js','utf8'))"
   obsidian eval code="eval(require('fs').readFileSync('<repo>/tools/board-test.js','utf8'))"
   ```
3. 等 30–40 秒後 `obsidian eval code="window.__ctBoardTest"`;最後一行要是 `DONE`,而且沒有 `FAIL`。

## 看結果

- 每一行 `ok` / `FAIL 名稱 實際值`。**任何 FAIL 都不算過**,先修再往下做。
- 版本對不上(`loaded x, repo y`):vault 的外掛資料夾不是 junction,又沒複製成功 —— 測的是舊版,結果不能信。
- `board-test` 卡在 `running`:Obsidian 沒回應或看板沒開起來,重跑一次;還是不行就看 `obsidian dev:errors`。

## 改了格式時要補的測試

新行為要**先**加案例再改程式:

- 讀寫都有的新欄位 / 新寫法 → `format-test.js` 加「解析」「組回去一字不差」「舊寫法轉換」三種。
- 動到寫手的新動作 → `board-test.js` 加一段:做動作 → `卡段()` 讀回那張卡片 → 檢查第一行、內容順序、`尾是ed()`。
- 案例一律用**假資料**(`ZZ-` 筆記);不要拿使用者真正的筆記測試。
- 1.6.1 格式的不變條件(每次都要成立):
  - 被寫過的卡片最後一行是 `[ed:: YYYY-MM-DD HH:MM]`,而且只有一行。
  - 第一行順序:`[pin:: on]` → `[主題]` → 日期 → `[repeat::]` → `#指派人` → 其他標籤 → 不認得的欄位。
  - 卡片底下:內容 → `[done::]`(只有循環卡片)→ `[cm::]` → `[ed::]`;這三種外掛寫的行**不帶 `- `**。
  - 沒被寫到的舊內容行一個字都不動;`轉整份` 跑第二次改到 0 張。
  - 解析結果(日期、置頂、指派人、循環、內容、留言、編輯時間)在轉換前後一樣。

## 版面相關

改到寬度、字級、flex 時,另外跑 `.\tools\check4.ps1`(六組都要是空的;需要 vault 裡的 `ZZ-css-fixture.md`)。
