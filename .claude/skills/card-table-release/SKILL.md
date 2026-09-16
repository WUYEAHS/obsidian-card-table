---
name: card-table-release
description: 卡片看板(obsidian-card-table)的升版與發版流程。使用者說「升版」「發版」「出 1.x.y」「準備 release」時使用:一次改好版本號三處、versions.json、CHANGELOG、更新介紹彈窗、版本摘要,跑語法檢查、部署、測試、版面檢查,最後在使用者同意後 commit 並交給他推 tag。
---

# 卡片看板:升版與發版

⚠ 推 tag 就會自動建 GitHub release、發給所有使用者 —— **推之前一定要使用者明確同意**。
命令列沒有 credential helper,**push 由使用者用 GitHub Desktop 做**。

## 0. 先確認

- 新版本號(semver)和這一版的**主題**(一版一個主題,見技能 `card-table-principles`)。
- 工作區乾淨或只有這一版的改動(`git status`)。
- 不變的東西:`manifest.json` 的 `id` 永遠是 `card-table`;英文名稱 `Card Table - Dated Tasks` **不能有冒號**;作者 `jiajiunwu`。

## 1. 改版本號(三處 + versions.json)

| 位置 | 格式 |
| --- | --- |
| `main.js` 的 `看板版本` | `YYMMDDvN`(今天日期,同一天第幾次) |
| `main.js` 的 `插件版本` | semver,跟 manifest 一樣 |
| `manifest.json` 的 `version` | semver |
| `versions.json` | 加一筆 `"新版本": "<manifest 的 minAppVersion>"` |

寫檔用 UTF-8(無 BOM)、LF;PowerShell 5.1 不要用 `Set-Content` 寫這些檔。

## 2. 寫三處更新說明(中英兩份)

1. **`CHANGELOG.md`** 最上面加 `## 新版本`:細節都寫在這裡(release 的說明從這裡撈)。
2. **`更新介紹["新版本"]`**(main.js,彈窗):`"zh-TW"` 和 `"en"` 各一組 `[Lucide 圖示名, 標題, 說明]`,3–6 項,講使用者看得到的改變。
3. **`版本摘要`**(main.js,設定最上面「看所有版本」):**最前面**加一筆 `[版本, [中文句…], [英文句…]]`,一版兩三句、合併著寫。

README 只在使用者看得到的功能變了才改,而且要精簡(每個大項 2–3 句);中英兩份一起改。
使用者明講的新規則寫進 `CLAUDE.md` 對應的段落。

## 3. 檢查

```powershell
.\tools\run-tests.ps1      # 部署 → 語法 → 重載 → 版本 → 格式測試 → 看板測試,要 ALL TESTS PASSED
.\tools\check4.ps1         # 動過版面才需要;六組都要是空的
```

Mac 的跑法見技能 `card-table-format-test`。有 UI 改動的版本,發版前用 `better-interface` 整體看一次。
另外手動確認:
- `obsidian dev:errors` 沒有卡片看板的錯誤(別的外掛的錯誤不算)。
- 更新介紹彈窗打得開:`obsidian eval code="app.plugins.plugins['card-table'].秀更新介紹(true)"`,中英文各看一次。
- 設定頁「看所有版本」最上面是新版本。

## 4. Commit 與 tag(使用者同意後)

1. 把這一版的改動整理成一個 commit(訊息格式照 git log:`1.6.1: <一句英文摘要>`),**不要 commit `data.json`**。
2. 告訴使用者:在 GitHub Desktop push,然後建一個**純版本號、不加 v** 的 tag(例如 `1.6.1`)並 push。
   `.github/workflows/release.yml` 會自動建 release、附上 `main.js` / `manifest.json` / `styles.css`、產生 attestation,並刪掉其他附件。
3. 發版後提醒:vault 的外掛資料夾若被 release 下載蓋成實體資料夾,之後測試前要重新複製(CLAUDE.md「開發循環」)。

## 5. 改名或改描述時

名稱和描述在 `obsidianmd/obsidian-releases` 的 `community-plugins.json` 另有一份,改了要另外發 PR(提醒使用者,不要自己發)。
