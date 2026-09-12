# Card Table — 給 Claude 的專案筆記

Obsidian 外掛,把一份 markdown 筆記讀成一張任務卡片表。
使用者說中文,回答和註解都用繁體中文。

## 這個專案沒有 build step

沒有 `package.json`、沒有 TypeScript、沒有 bundler。`main.js` 是**手寫的 CommonJS**,
Obsidian 直接載入。不要「幫忙」加上 TypeScript、esbuild 或 rollup,除非使用者明講要。

```
main.js         4700+ 行,整個外掛就這一份
styles.css      樣式
manifest.json   Obsidian 讀的外掛資訊
versions.json   外掛版本 → 需要的最低 Obsidian 版本
data.json       本機設定,已被 .gitignore 排除,不要 commit
```

`require("obsidian")` 拿 API,結尾 `module.exports = class 卡片日誌看板 extends Plugin`。

## 開發循環

vault 的外掛資料夾是**指向這個 repo 的 junction**:

```
C:\Users\新春\Documents\Cintrun3\.obsidian\plugins\card-table  →  這個 repo
```

所以改了 `main.js` 存檔,Obsidian 那邊就是新的,不用複製。改完要讓它生效:

- Obsidian 裡 `Ctrl+R` 重載,或設定 → 社群外掛把 Card Table 關掉再開
- 有裝 Obsidian CLI 的話:`obsidian plugin:reload id=card-table`,再 `obsidian dev:errors` 看有沒有噴錯

改壞了要回到乾淨版本:`card-table.bak-20260912` 還放在 vault 的 plugins 資料夾裡。

## 命名

程式裡的識別字**是中文的**(`寫手`、`看板視圖`、`安全改`、`解析卡片`)。這是刻意的,
新加的東西照這個走,不要混英文命名。

## 動到寫檔的地方要特別小心

`class 寫手`(main.js:563)是唯一的寫入者。四條規則,違反其中任何一條都會吃掉使用者的資料:

1. **每一次寫入都是一次原子的讀改寫**,走 `安全改()` → `vault.process()`。
   絕對不要在別的地方直接 `vault.modify()`:拿內容和寫回去之間,Obsidian Sync、
   別的分頁、自己的上一個動作都可能動過這個檔。
2. **view 不寫自己那份**。`看板視圖` 的 `save()` 被覆寫成什麼都不做,
   所有改動都經過 `寫手`,檔案永遠只有一個寫入者。
3. **卡片的身分是它的第一行**。兩張卡第一行一模一樣但內容不同時,
   `定位文()` 回報「含糊」,寧可不寫也不要猜。
4. **一次只碰最少的行**。打勾就改那一行,不要整份重寫。

寫入是**排隊**的(`排隊做()`),不是忙就丟掉 —— 0.9.0 修過這個會無聲吃掉動作的 bug,
不要改回去。

## 版本號有兩套,改版時三個地方要一起動

| 位置 | 格式 | 例 |
| --- | --- | --- |
| `main.js` 的 `看板版本` | `YYMMDDvN`,畫面上看得到 | `260913v1` |
| `main.js` 的 `插件版本` | semver,要跟 manifest 一致 | `1.4.3` |
| `manifest.json` 的 `version` | semver | `1.4.3` |

semver 升版時,`versions.json` 也要加一筆 `"新版本": "最低 Obsidian 版本"`,
`CHANGELOG.md` 也要加一段 `## 新版本`(release 的說明是從那裡撈的)。
發版本身交給 `.github/workflows/release.yml`:推一個純版本號的 tag(`1.4.3`,**不加 v**)
就會自動建 release、附上三個檔案、產生 artifact attestation。

## CSS:`!important` 不是隨便加的,不要順手清掉

`styles.css` 裡還有 78 個 `!important`,絕大多數在 `@media (max-width: 700px)` 區塊裡。
**不要整批清掉**。它們存在有兩個不同的原因,而且只有第一個能靠重構解決:

1. **對抗 `st()` 寫成 inline style 的排版。** inline 贏過任何選擇器權重,
   窄螢幕要改掉它們就只剩 `!important`。
   1.4.2 實測過:整份 CSS 的 `!important` 全部拿掉 → 桌機版 0 處差異,窄螢幕版 193 處跑掉。
   **這一類可以修**:把那個值從 `st()` 搬進 class,兩邊就能用正常權重分勝負。
   1.4.3 這樣處理掉 8 個(格子的 padding / 對齊、釘列的高度),做法看
   `styles.css` 的 `td[data-col]` 那幾條。搬的時候**權重要對齊**:
   桌機那條寫 `td[data-col='日期']`,窄螢幕那條就也要帶 `[data-col]`,
   不然 (0,2,1) 壓不過 (0,3,1)。

2. **對抗使用者的佈景主題。** 這一類**拿不掉,也不該拿掉**。
   1.4.3 踩到的實例:主題用
   `.col-lines table:not(.calendar) tbody > tr > td:not(:last-child)`(權重 0,3,4)
   畫表格欄位分隔線,窄螢幕把表格攤平成卡片之後,那幾條線變成卡片裡莫名的細線。
   審核建議的「用提高權重取代 `!important`」在這裡行不通 ——
   使用者裝什麼主題事先不知道,沒有一個權重是保證夠高的。
   要判斷是哪一種,用這段列出所有命中某元素又設了該屬性的規則:

```js
[...document.styleSheets].forEach(sh => { try { [...sh.cssRules].forEach(r => {
  if (r.cssRules) [...r.cssRules].forEach(x => { if (x.selectorText && el.matches(x.selectorText)) console.log(x.selectorText, x.style.cssText); });
  else if (r.selectorText && el.matches(r.selectorText)) console.log(r.selectorText, r.style.cssText);
}); } catch (e) {} });
```

## 改版面之前先知道這三個坑

1. **CSS 寫了規則,但 class 根本沒掛上去。** `tk-釘列`、`tk-循排`、`tk-補排` 都發生過:
   styles.css 有整段規則,main.js 卻沒 `addClass`,於是那段是死的,而且**沒有人會發現** ——
   直到某天補上 class,版面突然變了。加新的版位規則時,順手確認元素真的有那個 class。
2. **窄螢幕靠 `order` 排版,而 flex 是「先斷行、後壓縮」。** 一行差 2px 就會整塊掉到下一行,
   而不是把可壓縮的那塊擠小。所以「某些卡片的按鈕在右上角、某些在左下角」這種
   不一致,幾乎都是某一行剛好差幾 px —— 去找那一行最不重要的東西把它藏掉或縮掉,
   不要只調某一格的寬度。
3. **中英文的字寬差很多。** 欄寬不要寫死,放進字典讓它跟著語言走
   (`T.日期欄寬`、`T.補日期欄寬`、`T.分類欄寬` 就是這樣來的)。

## 版面改完一定要跑這個

```powershell
.\tools\check4.ps1
```

它會把 **中文/英文 × 桌機 1280 / 手機 420** 四種組合各掃一遍,報告三件事:
元素裝不下自己的內容、文字被切掉、跑出板子的左右邊界。**四份都要是空的**才算過。
改任何寬度、字級、flex 之後都跑一次 —— 這是唯一抓得到「英文被切掉」「手機溢出」
的方法,靠眼睛看一定會漏(1.4.3 就是這樣抓到三個自己改出來的回歸)。

需要 Obsidian 開著、CLI 裝好,而且 vault 裡有一份 `ZZ-css-fixture.md`
(涵蓋置頂/逾期/完成/區間/循環/無日期/長期/無指派人/封存各一張;內容看 tools/check.js)。
⚠ `check4.ps1` **只能用 ASCII**:PowerShell 5.1 會用 ANSI 讀 .ps1,裡面有中文就整個壞掉。

同一個坑還有兩個變形,改窄螢幕版面的時候要記得:

- **選擇器權重一樣時,後面的贏。** `.tk-期間格` 被後面的 `.tk-統計格` 整條吃掉過
  (期間格同時有這兩個 class),日/週/月切換器因此被壓成 136px 又被 `overflow:hidden` 裁掉。
  要壓過同權重的規則就用複合選擇器(`.tk-統計格.tk-期間格`),不要靠排序。
- **窄螢幕靠 `order` 排卡片,但被排序的是「攤平後真正的 flex item」。**
  內容在 `.tk-內盒` 裡面又包一層,所以 `.tk-文區 { order:5 }` 寫了沒用 ——
  要排的是 `.tk-內盒`。同理 `.tk-題行` 的 `display:contents` 一定要帶 `!important`,
  不然它身上的 inline `display:flex` 會贏,整個題行不會被攤平。

## 筆記裡的文字格式就是儲存格式

沒有資料庫、沒有隱藏索引。日期、負責人、釘選、留言、循環全都是筆記裡的純文字,
外掛關掉之後那份筆記仍然是一般人讀得懂的待辦清單。格式對照表在 README.md。
**改格式等於改使用者已經存在的筆記**,要往回相容。

## Git

- remote:`https://github.com/WUYEAHS/obsidian-card-table.git`,branch `main`
- 命令列沒設 credential helper,**push 用 GitHub Desktop**
- `git` 在 `%LOCALAPPDATA%\GitHubDesktop\...\git\cmd`,已加進使用者 PATH
