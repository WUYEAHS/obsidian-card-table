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
3. **卡片的身分是它的第一行**(`k.基鍵`,拿掉日期、指派人、📌、時戳)。
   第一行一樣的卡片(1.4.6):畫面上 `k.鍵` = 基鍵 + `重鍵分隔` + 序號,狀態(編修、展開、閃光)
   才不會兩張一起動;寫檔時 `定位文()` 用基鍵找候選,再依序比 **內容指紋 → 整行原文 →
   到秒的 ✎ 時戳**。全部同分而且內容不一樣,才回報「含糊」、寧可不寫也不要猜。
   ⚠ 內容指紋一定排第一:第一行每寫一次就換時戳,把「整行原文」排第一,
   改完雙胞胎卡片的內容再改主題,主題會寫到另一張上(1.4.6 開發中實際發生過)。
   `寫手.改卡片` 寫成功後會用 `記新首()` 把新的第一行記回卡片物件,兩道防線都要留著。
   ✎ 時戳 1.4.6 起寫到秒(`現在戳()`),舊的只到分鐘照讀。
4. **一次只碰最少的行**。打勾就改那一行,不要整份重寫。

寫入是**排隊**的(`排隊做()`),不是忙就丟掉 —— 0.9.0 修過這個會無聲吃掉動作的 bug,
不要改回去。

## 版本號有兩套,改版時三個地方要一起動

| 位置 | 格式 | 例 |
| --- | --- | --- |
| `main.js` 的 `看板版本` | `YYMMDDvN`,畫面上看得到 | `260914v2` |
| `main.js` 的 `插件版本` | semver,要跟 manifest 一致 | `1.4.8` |
| `manifest.json` 的 `version` | semver | `1.4.8` |

作者名一律 `jiajiunwu`(manifest、LICENSE、SUBMITTING.md)。README 有中英兩份
(`README.md`、`README.zh-TW.md`),改一份就要改另一份。

semver 升版時,`versions.json` 也要加一筆 `"新版本": "最低 Obsidian 版本"`,
`CHANGELOG.md` 也要加一段 `## 新版本`(release 的說明是從那裡撈的)。
發版本身交給 `.github/workflows/release.yml`:推一個純版本號的 tag(`1.4.4`,**不加 v**)
就會自動建 release、附上三個檔案、產生 artifact attestation,
而且會把 release 上**其他多出來的附件刪掉**(1.4.3 在網頁上手動建 release 時多拖了
README.md、CHANGELOG.md,被審核列成建議事項)。

## 窄螢幕:由 JS 決定,不是 CSS 的 media query

1.4.4 起 `styles.css` 裡 **0 個 `!important`、0 個 `display:contents`、0 個 `@media (max-width)`**。
這是審核要求的,也是刻意的架構,不要加回去:

- **`看板視圖.定窄()` 在 `畫()` 開頭問一次 `該窄()`**,存成 `this.窄`,
  在看板上掛 `.tk-窄`。這一輪所有的畫法都看 `this.窄`,不要在各處自己再問 matchMedia。
  `該窄()` = 視窗 ≤ 700px **或** 看板分頁本身 < `窄分頁寬`(560px,1.4.7)——
  桌機開著側邊欄、分割畫面時分頁很窄,只看視窗會把桌機表格硬塞進去。
  視窗跨過 700px(matchMedia 監聽)或分頁跨過 560px(ResizeObserver)都會整份重畫。
- **窄螢幕的卡片是另一種 DOM**:`畫一列()` 在窄螢幕呼叫 `畫卡片()`,畫成 div
  (卡頭 `.tk-卡頭` + 內容格),不是 `<tr>`。所以:
  - 找列、找格一律用 **`.tk-列` / `.tk-格`**(桌機的 tr/td 也掛了這兩個 class),
    **不要再寫 `closest("tr")`、`closest("td")`、`tbody tr`**。
  - 位置由 **DOM 建立的順序**決定。不要用 CSS 的 `order` 排窄螢幕的東西。
  - 窄螢幕要不同的尺寸,就在 `st()` 那一行用 `this.窄 ? … : …` 寫進去,
    不要寫一條 CSS 去蓋桌機的 inline style —— 那就是 78 個 `!important` 的來源。
- 窄螢幕的 CSS 一律寫 `.tk-board.tk-窄 …`,而且只放「長相」(框、分隔線、底色、閃光)。
- 會被 hover 改變的屬性(顏色、透明度)**不要寫在 inline**,寫 class
  (`.tk-釘` / `.tk-已釘`、`.tk-改題`),hover 規則才能用正常權重蓋過去。

以前那 78 個 `!important` 有兩種:蓋 `st()` 的 inline style,以及蓋佈景主題的表格格線
(例如 `.col-lines table:not(.calendar) tbody > tr > td:not(:last-child)`,權重 0,3,4)。
第二種在「窄螢幕不是 table」之後自然消失。桌機仍然是 table,
如果哪天又被某個主題的規則打到,用這段列出所有命中某元素又設了該屬性的規則:

```js
[...document.styleSheets].forEach(sh => { try { [...sh.cssRules].forEach(r => {
  if (r.cssRules) [...r.cssRules].forEach(x => { if (x.selectorText && el.matches(x.selectorText)) console.log(x.selectorText, x.style.cssText); });
  else if (r.selectorText && el.matches(r.selectorText)) console.log(r.selectorText, r.style.cssText);
}); } catch (e) {} });
```

## 改版面之前先知道這幾個坑

1. **CSS 寫了規則,但 class 根本沒掛上去。** `tk-釘列`、`tk-循排`、`tk-補排` 都發生過:
   styles.css 有整段規則,main.js 卻沒 `addClass`,於是那段是死的,而且**沒有人會發現** ——
   直到某天補上 class,版面突然變了。加新的版位規則時,順手確認元素真的有那個 class。
2. **flex 是「先斷行、後壓縮」。** 一行差 2px 就會整塊掉到下一行,
   而不是把可壓縮的那塊擠小。窄螢幕的卡頭(📌 ◯ 日期 ··· 指派人 ⋯)因此是 `nowrap`,
   而且**只讓日期縮**(它有省略號);指派人設 `flex-shrink:0` + max-width ——
   兩個一起縮的話,按比例縮的結果是名字先被壓成 0。
3. **中英文的字寬差很多。** 欄寬不要寫死,放進字典讓它跟著語言走
   (`T.日期欄寬`、`T.補日期欄寬`、`T.分類欄寬` 就是這樣來的)。
4. **手機版 Obsidian 會改掉原生控制項的長相。** `<button>` 預設 44px 高、
   輸入框和 textarea 是整顆藥丸形的圓角。卡片裡的鈕要自己寫 `height` + `min-height:0`
   (`小鈕樣()`),輸入框要寫 `border-radius`;小圖示鈕乾脆用 `膠囊()`(div + role=button)。
5. **不要用「先 height:auto 再量」撐高 textarea。** iOS 的捲動是非同步的,
   塌下去那一瞬間捲動位置被夾住,使用者看到畫面往下跳一下又被拉回來。
   `撐高()` 用看不見的鏡子 div 量高度,textarea 本身完全不塌。

## 版面改完一定要跑這個

```powershell
.\tools\check4.ps1
```

它會把 **中文/英文 × 桌機 1280 / 手機看板 390 / 手機看板 360** 六種組合各掃一遍,報告三件事:
元素裝不下自己的內容、文字被切掉、跑出板子的左右邊界。**六份都要是空的**才算過。
改任何寬度、字級、flex 之後都跑一次 —— 這是唯一抓得到「英文被切掉」「手機溢出」
的方法,靠眼睛看一定會漏(1.4.3 就是這樣抓到三個自己改出來的回歸)。

⚠ 手機那兩組量的是**看板寬**,不是視窗寬。桌機 Obsidian 視窗再窄都還留著左側 ribbon
和分頁的邊框,420px 的視窗只剩 306px 給看板 —— 比任何一支真的手機都窄,
會報出一堆手機上根本不存在的切字。所以腳本先量這段額外寬度(check.js 回報的 `ovh`),
再把視窗設成「目標看板寬 + ovh」。

需要 Obsidian 開著、CLI 裝好,而且 vault 裡有一份 `ZZ-css-fixture.md`
(涵蓋置頂/逾期/完成/區間/循環/無日期/長期/無指派人/封存各一張;內容看 tools/check.js)。
⚠ `check4.ps1` **只能用 ASCII**:PowerShell 5.1 會用 ANSI 讀 .ps1,裡面有中文就整個壞掉。

另外一個坑:**選擇器權重一樣時,後面的贏。** `.tk-期間格` 被後面的 `.tk-統計格` 整條吃掉過
(期間格同時有這兩個 class)。要壓過同權重的規則就用複合選擇器,不要靠排序。

## 筆記裡的文字格式就是儲存格式

沒有資料庫、沒有隱藏索引。日期、負責人、釘選、留言、循環全都是筆記裡的純文字,
外掛關掉之後那份筆記仍然是一般人讀得懂的待辦清單。格式對照表在 README.md。
**改格式等於改使用者已經存在的筆記**,要往回相容。

- 1.4.5 起**寫出去**的是英文寫法:`🔁 every 2 weeks`(`循環字()`)、`#long-term`(`送出新增`)。
  中文寫法 `🔁 每2週`、`#長期` **永遠照讀**(`讀循環()`、`長期Re`),不要拿掉。
- 內容行前面的「．」是可選的(設定 → 項目符號)。**所有寫入的地方一律用 `符()`**,
  不要直接寫 `項目符`;讀的時候 `去符()` 有沒有符號都吃得下。

## 1.4.5 的版面規則

- 置頂的卡片是**獨立一張表**(`畫清單` → `畫卡片塊`),工具「⋯」、搜尋膠囊、融合列
  只放在最上面那張表。桌機和手機的清單工具都是「⋯」選單。
- 卡片按鈕的位置:桌機主題那一行最右邊是 🗄 封存 · 💬 留言 · ✎ 編輯(固定三顆寬,時間才對得齊),
  📌 單獨固定在日期格左上角(封存試過放 📌 旁邊,太擠);
  手機卡頭的「⋯」裝封存 / 留言 / 刪除 / 最後編輯時間,主題那一行只有 ✎。
  主題沒有自己的編輯鈕 —— ✎ 同時改主題和內容。
- 會讓某一格高度改變的重畫(`就地重畫`、`切內容`、`切留言`、`完成編輯`)**一定要**
  在重畫之前記 `scrollTop`、所有高度都撐好(包括 `滑開()` 的起點)之後才放回去。
  最後一張卡片是這類 bug 唯一會露餡的地方:看板一變矮,瀏覽器就把捲動位置夾到底。
- 手機按編輯**不自動聚焦**(聚焦 = 跳鍵盤 = iOS 自己捲畫面)。

## 1.4.7 的規則

- **送出鍵只有一個判斷:`是送出(e)`**。新增卡片、編輯內容、寫留言、改留言全部走它,
  不要再各自寫 `e.shiftKey` / `!e.shiftKey`(1.4.6 以前留言跟其他地方是反的)。
  設定 `送出鍵` 存在模組變數 `送出用Enter`。
- **一週的第一天看 `週起日`**(模組變數,0 = 週日、1 = 週一)。算本周用 `週首的()`,
  不要再用寫死週一的 `週一的()`;行事曆的第一欄和空格也要照它轉。
- **攔截 `WorkspaceLeaf.prototype.setViewState` 要能跟別的外掛共存**:
  攔截函式帶 `啟用` 開關,卸載時先關掉,**只有原型上掛的還是我們那一個**才換回去。
  直接把原型設回載入時的版本,會連 Kanban 這類後載入的外掛的攔截一起拆掉。

## 1.4.8 的規則

- **底色只有兩層**:上面的控制區(篩選列、新增卡片)**整塊**是 `background-secondary`;
  卡片表是標題列 secondary、本體 `background-primary`。塊裡面的欄框一律透明,靠框線分隔。
  不要再在塊裡加一層別的底色 —— 1.4.7 以前「本體淺 → 欄框深 → 輸入框淺」三層交錯;
  1.4.8 開發中試過新增卡片整塊淺色,跟卡片表糊在一起,沒有重心。
- **新增區沒有內距、沒有自己的外框**:兩列直接貼在標題列底下,欄框之間用 `接起來()` 補的直線、
  兩列之間一條橫線。`建框()` 的樣式是 inline,要改只能在 `接起來()` 裡改 inline,不能寫 CSS 蓋。
- **送出鈕固定高度**(`送高`,桌機 38 / 窄 40),上緣對齊 textarea,不跟著內容框長高;
  textarea 的 min-height 也是 `送高`,空的時候上下都對齊。
- **`.tk-塊` 是 `overflow:clip`(兩個方向)**,圓角才裁得到標題列和表格最後一列。
  能這樣做是因為所有浮出來的東西都掛在 `document.body`;新加的浮動面板也要掛那裡,不要掛在塊裡面。
- 設定 `顯示編輯時間`(`看板視圖.顯示編時`)只管畫面,✎ 時戳照寫。

## Git

- remote:`https://github.com/WUYEAHS/obsidian-card-table.git`,branch `main`
- 命令列沒設 credential helper,**push 用 GitHub Desktop**
- `git` 在 `%LOCALAPPDATA%\GitHubDesktop\...\git\cmd`,已加進使用者 PATH
