---
name: ui-layout-guides
description: UI Layout Guides and Terminology standardizer。當使用者詢問、設計、審查或調整 UI mockup、UX critique 的版面結構、對齊方式或視覺流向時呼叫;也用在畫 mockup、寫版面程式、做 design review 之前,確保術語與設計規範精準無誤(Guides / Smart Guides / Layout Grids / Leading Lines / Pointer)。
---

# UI Layout Guides and Terminology standardizer

使用者 2026-09-20 指定安裝。畫 mockup、審版面、回留言時一律照這份用詞。

## Context & Alignment Standards

涉及 UI 介面中的線條、網格或提示元素時,**必須**使用下列標準英文術語,不得產生歧義:

- **Guides(輔助線 / 參考線)**
  - 定義:軟體中從尺規(Rulers)手動拉出來的線。
  - 情境:Figma、Photoshop 等軟體中,手動固定特定元件的對齊邊界。
  - 這個專案:卡片看板的三條線 **3 / 18 / 22**(編輯的字 3、其他的字 18、標題列第一個圖示 22)就是 Guides;mockup 上畫成虛線,可用 properties 的「輔助線」開關。

- **Smart Guides(智慧型輔助線)**
  - 定義:移動物件時,系統根據周圍元件自動出現的動態對齊提示線與距離數值。
  - 情境:檢查元件間距(Spacing)是否符合網格原則、確保物件彼此置中。
  - 這個專案:mockup 標間距時用 Smart Guides 的畫法(兩端箭頭 + 數值)。

- **Layout Grids(網格輔助線)**
  - 定義:全域的欄(Columns)與列(Rows)網格系統。
  - 情境:響應式網頁 12 欄、行動端 4 欄。
  - 這個專案:mockup 每一排的區塊位置固定,就是 Layout Grid;版面不可以每版亂動。

- **Leading Lines(視覺引導線)**
  - 定義:構圖或佈局上,吸引視覺焦點、引導閱讀順序與動線的隱形或顯性線條。
  - 情境:優化視覺流向(Visual Hierarchy)、提升 CTA 點擊率。

- **Pointer / Indicator(操作引線 / 提示引標)**
  - 定義:在導覽或教學中,實體指向特定按鈕或區塊的視覺提示引線。
  - 情境:引導使用者完成步驟,或指出隱藏功能的位置。
  - 這個專案:mockup 上「這一塊是從哪裡點出來的」一律用 Pointer 標示(箭頭 + 來源名稱),不可以只靠標題文字。

## Behavior Rules

1. **指令審查(Audit)**:使用者給了版面描述或程式碼,主動檢查他們是否正確配置 `Layout Grids`、是否用了正確的 `Guides`。
2. **溝通翻譯(Translate)**:使用者用中文提到相關概念時,輸出建議**必須加註對應英文術語**(例:建議在此處使用智慧型輔助線(Smart Guides)檢查……)。
3. **拒絕模糊**:不得使用 "help lines"、"alignment lines" 這類不精準的字,一律改用上述標準術語。

## 這個專案的附加規則(2026-09-20)

4. **對齊是硬規則**:不知道怎麼對齊就要提出來問,不可以忽略、不可以跳過。
5. **不自己描圖示**:Lucide 圖示一律用官方路徑(名字照外掛 `圖備()` 用的那一個),不可以憑印象自己畫。
6. **留言的元素路徑用 `tools/dcpath.ps1` 查**(`-File <x.dc.html> -Path 1/2/2/1/0/0`),不可以用猜的。
