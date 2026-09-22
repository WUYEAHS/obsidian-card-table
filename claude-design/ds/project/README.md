# Card Table 設計系統

**Card Table - Dated Tasks(卡片看板 - 任務分類日誌)** 是一個 Obsidian 外掛:把一份 markdown 筆記讀成一張任務卡片表。
這份設計系統是從 repo `WUYEAHS/obsidian-card-table`(`main@2af08be`,2026-09-20)裡實際在跑的 `styles.css`、
`main.js` 和兩份規則技能(`card-table-ui-rules`、`card-table-principles`)抽出來的,不是重新設計的。

## 這套系統為什麼長這樣

外掛住在別人的軟體裡。使用者的筆記、佈景主題、字型、強調色都是他們自己的,外掛只是借地方站一會兒。
所以這裡的每一條規則都在回答同一個問題:**怎麼在不搶走 Obsidian 的臉的前提下,把「今天要做什麼」講清楚。**

1. **純文字優先。** 筆記是唯一的資料。日期、負責人、釘選、留言、循環全都是筆記裡的純文字,
   外掛關掉之後那份筆記仍然是一般人讀得懂的待辦清單。介面不能有任何隱藏索引撐著。
2. **時間是主軸。** 每個功能都要回答「今天 / 這週 / 這個月要做什麼」。
3. **跟著 Obsidian。** 顏色只用 Obsidian 的 CSS 變數、圖示只用 Lucide、快捷鍵用使用者自己的。
   只做預設佈景主題的深淺兩版 —— 深色是主要的那一版(mockup 都用深色畫)。
4. **少色。** 顏色只給四種意義:**分類、逾期、週期、今天**。其他一律灰階。
   能用圖示就不用字,字放在 `title` / `aria-label`。
5. **只有一種版面 —— 卡片。** 桌機和手機一樣,桌機只是比較寬。表格版面 1.6.3 拿掉了。
6. **所見即所得。** 編輯和閱讀長得一樣:同一行的字、項目符號、待辦方框在切換編輯時不跳動。
   有不一樣的地方(編修框的框線和內距)一定要寫出原因。
7. **點。** 雙關:常用動作的**位置固定**、步數少(像 POS 收銀機);卡片之間、卡片和外面的筆記**找得到連結**。

## 顏色

顏色分成三群,來源不同,不要混用:

| 群 | 來自 | 規則 |
| --- | --- | --- |
| `surface-*` `ink-*` `border*` `hover` `form-field` `accent*` | Obsidian 的佈景主題變數 | 程式裡**一律寫變數**(`var(--text-muted)`),不要寫死色碼、不要自己偵測深淺。這裡列出的數值只是預設主題在 2026-09-20 量到的值,方便畫 mockup。 |
| `signal-*` | Obsidian 的 `--color-*` | 四種意義專用:`signal-overdue` 逾期、`signal-repeat` 週期、`signal-today` 今日、`signal-done` 完成。`signal-week` / `signal-month` 只在時間篩選那一排當層級色。 |
| `category-*` | main.js 的 `標籤色`(真的寫死) | 使用者自己挑的分類顏色,深淺兩版一樣。自動配色只輪 紅 橘 黃 藍 紫 五色。 |

用色規則:

- **主要按鈕一律 `accent-interactive`**,不跟指派人或分類變色(送出鈕就是唯一的主要按鈕)。
- **底色只有兩層**:控制區整塊 `surface-secondary`、卡片 `surface-primary`。塊裡面的欄框一律透明,靠框線分隔。
  不要在塊裡再加第三層底色。
- **指派人頭像統一淡灰**(`border` 當底、`ink` 當字),使用者不能改 —— 顏色太混亂的話,四種意義就看不出來了。
- **淺色主題下彩色小字要有 3:1 對比**:主題膠囊的字在淺色下把分類色混黑到 58%(`color-mix`),深色不動。
- 選到的狀態用**底色 + 底線**就夠,不要再加一顆圖示。格子本身不上色。

## 字

字型不是我們的:`sans` 和 `mono` 就是 Obsidian 的 `--font-interface` / `--font-text` / `--font-monospace`,
使用者在設定裡換什麼就是什麼。**這套系統不附字型檔**,`type.families` 只記下預設的 stack
(完整的 Obsidian stack 還多了 `Google Sans Flex`、`Inter Variable` 和三支 emoji 字型)。

- 卡片內容(`card-body`)是 `0.94 × --font-text-size`,行高 `--line-height-normal` ——
  這組數字是在 Obsidian 自己的即時預覽編輯器裡量出來的。**改其中一邊,另一邊一起改。**
- 標題列的字(`block-title`)要加「標頭補正」:行高 1.4 + 上面補 2px。中文字在行框裡偏上,
  用 `line-height:1` 壓、再配 `overflow:hidden`,會把字的上緣裁掉。
- 張數一律 `tabular-nums`,只寫數字不寫「張」。
- **不寫灰色說明字**:placeholder、「點一天當開始」這類都不要。空的輸入框用淡圖示
  (主題用 `house`、內容用 `pen-line`),後面可以跟一個淡的「…」讓人知道這裡能打字。

## 圖示

只用 **Lucide**(Obsidian 內建的那一套,`setIcon`),線寬統一 **1.75**,不要讓佈景主題決定粗細。
不用 emoji:Windows 上 emoji 是彩色點陣字、比周圍的字大一圈,而且沒辦法跟著文字顏色走。

程式裡有固定的對照表 —— 畫 mockup 也用同一顆,不要自己換新的、不要用 `✎ ✓ ☰` 這類字元充數:

| 意思 | Lucide |
| --- | --- |
| 逾期 | `clock-alert` |
| 週期 | `refresh-ccw-dot` |
| 未完成 / 已完成 | `circle` / `circle-check` |
| 封存 / 還原 | `archive` / `archive-restore` |
| 新增卡片 | `square-pen` |
| 內容空白 / 主題空白 | `pen-line` / `house` |
| 送出 | `send-horizontal` |
| 詳細編輯 / 返回 | `maximize-2` / `chevron-left` |

Lucide 改過很多名字(`send-horizonal` → `send-horizontal`、`check-circle` → `circle-check`),
而 Obsidian 內建的版本新舊不一 —— 所以一律走 `圖備(容器, [新名, 舊名…], 大小)` 依序試,只給一個名字可能畫出空格。

**不能按的東西不畫圖示**(使用者會以為可以按)。

## 排版的骨架

三條線 **3 / 18 / 22**,和一套只有兩層的底色。細節在 `guidelines/10-alignment.md`。

- **3px** = 編輯的字。編輯欄位**透明、沒有框**,看起來直接打在塊上。
- **3–18px** = 溝:收合箭頭、分類色條、📌、塊的圖示。溝裡的圖示放大到 14 填滿,置中在 10.5。
- **18px** = 其他所有的字。
- **22px** = 標題列上溝後面的第一個圖示(18 + 標題列的 gap 4)。

間距分組:群組內 `gap-tight` 4、一排之間 `gap-row` 6、群組之間 `gap-group` 8 起跳。
**不加沒有實質意義的裝飾線** —— 分組和防誤觸靠間距,不要畫分隔線。

## 動

只有三種動,全部要吃 `prefers-reduced-motion: reduce`:

- **`.12s ease`** —— 狀態切換(膠囊底色、色條長出 ✓、動作鈕淡入)。
- **`.16s ease-out`** —— ⋯ 往左彈出那一排。
- **`1.4s ease-in-out`** —— 動作之後卡片「閃一下」:慢慢亮到 18% 再慢慢退掉。
  用 `background-image` 疊一層,不要用 `background-color`(會被 hover 的規則蓋掉)。

**換內容、變大變小一律有動畫**(收合、展開、進出詳細編輯用同一種高度滑動),
但**只在真的換了狀態時播一次** —— 同一個狀態再點一次不重播,連按也不疊。

## 這套系統裡沒有的東西

寫下來是因為都有人試過:

- **沒有 `!important`、沒有 `display:contents`、沒有 `@media (max-width)`。**
  窄不窄由 JS 判斷一次(`定窄()`),在看板上掛 class,那一輪所有的畫法都看它。
  CSS 和 JS 各自判斷寬度 = 半套版面,1.4.3 以前為此付出 78 個 `!important`。
- **沒有第二套版面。** 桌機和手機同一種卡片版面。
- **沒有陰影堆疊、沒有漸層、沒有自訂捲軸以外的裝飾。**
- **沒有沉浸模式。** 看板專注在任務,長內容用連結放到外面的筆記。

## 量

「先畫、再做、再量」:版面先在 mockup 上定案,實作完**自己量**,量不到的不要說「對齊了」。
repo 裡三支工具:`tools/check4.ps1`(切字和溢出)、`tools/measure.ps1`(對齊,容許 1px)、
`tools/probe.ps1`(畫面上發生什麼事)。有數字的新規則就往 `tools/measure.js` 加一項。
細節在 `guidelines/40-measure.md`。
