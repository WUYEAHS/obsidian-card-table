"use strict";
/* ============================================================
   Card Journal Board / 卡片日誌看板   v0.1.0
   ------------------------------------------------------------
   這是 `日誌看板.md` 那一大塊 dataviewjs 的 plugin 版骨架。

   第一版的原則(講在最前面,以後改東西都照這個走):

   1. 資料格式「一個字都不改」。卡片還是寫在 md 裡,還是
      `- [ ] [主題] ．內容 ＠{2026-09-09} #嘉峻 📌 ✎{...}`,
      留言還是 `．💬{2026-09-09 18:30|嘉峻} 內容`。
      所以 plugin 沒裝、或哪天不用了,筆記照樣看得懂 —— 這是最高原則。
   2. 不依賴 Dataview。檔案自己讀、自己解析(下面「格式」那一段)。
   3. 設定走 saveData() → 存在 .obsidian/plugins/card-table/data.json,
      會跟著 Obsidian Sync 一起同步。localStorage 只留「這台電腦是誰在用」。
   4. 手機可以用(manifest 的 isDesktopOnly = false)。
   5. 中英文雙語,照 Obsidian 自己的語言自動切。

   還沒搬進來的(照著 `搬遷清單.md` 一項一項搬):
   行事曆、匯出圖片／PDF、循環卡片、封存、拖曳排序、統計列。
   ============================================================ */

const { Plugin, TextFileView, PluginSettingTab, Setting, Notice, Menu, WorkspaceLeaf, debounce, setIcon } = require("obsidian");

const 視圖種類 = "card-table";
/* 準則第九章:版本號格式 YYMMDDvN,程式和說明文件同一組,畫面上看得到。
   manifest.json 另外用 semver —— 那是 Obsidian 自己要認的,兩者並存。 */
const 看板版本 = "260912v2";
const 插件版本 = "1.4.0";

/* ============================================================
   語言 —— 只有兩份對照表,要加語言就再加一份
   ============================================================ */
const 字典 = {
  "zh-TW": {
    board: "卡片日誌看板", today: "今日", week: "本週", month: "本月",
    all: "全部", overdue: "已逾期", search: "搜尋主題或內容…",
    assignee: "指派人", none: "不指派", noCards: "這個範圍裡沒有卡片",
    edit: "編輯", save: "儲存", cancel: "取消", comment: "留言", pin: "置頂",
    done: "完成", placeholder: "留一則給大家看的…", cards: "張",
    justNow: "剛剛", minsAgo: "分鐘前", hoursAgo: "小時前",
    yesterday: "昨天", daysAgo: "天前",
    openBoard: "用卡片日誌看板開啟", openMd: "回到原始 Markdown",
    whoAmI: "這台電腦是誰在用", whoAmIDesc: "留言要靠它認出「哪幾則是我留的」。只存在這台電腦上,不會同步。",
    people: "指派人名單", peopleDesc: "用逗號隔開,例如:嘉峻, 欣明, 月柑",
    autoSwitch: "沒開過的筆記看 frontmatter", autoSwitchDesc: "每個檔案上次用看板還是 Markdown 都會自動記住,下次照舊開。這個開關只管「還沒開過」的筆記:有 `看板:` 這行就直接用看板開。",
    forgetFiles: "清掉記住的模式", forgetFilesDesc: "全部忘掉,每個檔案回到第一次開的狀態", forgetDone: "✓ 已清掉 N 筆",
    busy: "剛剛那個動作還在存,等一下再按",
    lost: "找不到這張卡片的位置,檔案可能剛被別台電腦改過,請重新整理再試一次",
    conflict: "偵測到同步衝突檔",
    saved: "已存檔",
    add: "新增", added: "✓ 已新增", submit: "送出", submitHint: "⌘/Ctrl + Enter 也可以送出",
    newTitle: "主題（可留空）", newBody: "內容…第一行就是卡片上那一行", newPerson: "新的名字",
    needSomething: "主題和內容至少要有一個",
    dToday: "今天", dTomorrow: "明天", dNextWeek: "下週", rangeHint: "要做一段區間才填第二個日期",
    noDate: "未定", undated: "未排期", archived: "封存", archive: "封存", unarchive: "取消封存",
    undone: "取消完成", unpin: "取消置頂", moveTo: "移到", openInMd: "回到原始 Markdown",
    changeDate: "點一下改日期", changeAssignee: "點一下改指派給誰", pickColor: "點一下換顏色",
    monthUnit: " 月", expandYear: "展開整年", collapseYear: "收合",
    managePeople: "管理指派人", removePerson: "從名單移除（卡片裡的名字不會動）",
    dupName: "這個名字已經在名單裡了", renamed: "✓ 指派人已更新",
    whoAmIShort: "留言的「編輯」認的是這個人",
    clearToDelete: "清空再存 = 刪掉這一則",
    defaultRange: "打開看板時先看哪一段", defaultRangeDesc: "每次開看板的預設篩選範圍",
    colors: "顏色",
    calendar: "行事曆", pickStart: "點一天當開始", pickEnd: "再點一天當結束", close: "收起",
    topic: "主題", hotTopics: "常用主題", section: "分類",
    colDate: "日期", colSection: "分類", colBody: "內容",
    dayLayer: "本日", weekLayer: "本周", monthLayer: "本月",
    setToday: "設為今日", doneTag: "已完成", archivedTag: "已封存", colorWord: "改成",
    longTerm: "長期・週期", showTodo: "未完成", showDone: "已完成", showArchived: "含封存",
    undatedBlock: "未寫日期", fillDate: "補日期",
    clearSearch: "清空主題和內容,回到平常的看板（Esc）",
    expandAll: "全部展開", collapseAll: "收回",
    sortEdited: "新增/編輯順序", sortColor: "分類顏色順序",
    merge: "融合", mergeCol: "融合", mergeDo: "融合成一張",
    mergeHint: "勾好要合併的卡片（已選 N 張）", merged: "✓ N 張已合併成一張",
    exportWord: "輸出", exportPng: "長圖 PNG（白底）", exportPdf: "列印 / 存成 PDF（白底）",
    exporting: "輸出中…", exported: "✓ 已輸出", exportFail: "輸出失敗,改用「列印 / 存成 PDF」試試",
    exportBlocked: "瀏覽器擋掉了新視窗,請允許彈出視窗再試一次",
    moreComments: "還有 N 則", send: "送出",
    sure: "確定?",
    tooFast: "剛剛才留過言,N 秒後再留一則（讓檔案先寫穩）",
    writeFail: "沒有寫進檔案（可能同步正在忙）。字還在框裡,按「送出」再試一次",
    movedDone: "✓ 已搬到「已完成」", movedTodo: "↩ 已搬回「未完成」",
    movedArchive: "🗄 已搬到「封存」", movedBack: "↩ 已搬回「N」",
    findTopic: "查主題…", noTopics: "沒有主題",
    lang: "語言", langDesc: "看板上的文字要用哪一種語言", langAuto: "跟著 Obsidian",
    langZh: "繁體中文", langEn: "English",
    scanNow: "重新檢查,該用看板開的就換過去", scanned: "✓ 已重新檢查",
    postpone: "延", doneOnce: "✔ 本次完成,下一次 N", sortFile: "檔案順序（可拖曳）",
    alreadyDone: "N 這一次已經記過了", movedToday: "✓ 已設為今日",
    editTopic: "改主題", addTopic: "加一個主題",
    deleteCard: "刪掉這張卡片", deleteAsk: "真的要刪掉這張卡片?刪了就沒有了",
    deleteYes: "刪掉", deleted: "已刪掉",
    sections: "分類", sectionDesc: "",
    sectionsHint: "先打開一個看板,這裡才會列出你的分類。", autoColor: "自動",
    jumps: "動作完成後要不要跳轉", jumpDesc: "把篩選調到看得到那張卡片的地方,並捲過去",
    jumpDone: "未完成 → 已完成", jumpTodo: "已完成 → 未完成", jumpToday: "設為今日",
    calMonthTotal: "這個月 D 張 ‧ N 天有卡片", thisMonth: "回到本月",
    changing: "更改中…", cancelWord: "取消", more: "查看更多", less: "收合",
    editSections: "分類名稱與顏色", finish: "完成", undoEdit: "復原這一次編輯(全部刪掉了也退得回來)",
    sectionsAndPeople: "分類與指派人", editHere: "在這裡改",
    ambiguous: "有兩張卡片的第一行一模一樣,分不出要改哪一張。先把其中一張的第一行改掉一點,再試一次",
    dupWarn: "這一行跟另一張卡片一模一樣,之後會分不出誰是誰",
    boardReady: "✓ 已建立 1 2 3 4 5 五個分區",
    jumpAdd: "新增卡片", jumpAddDesc: "新增完把畫面帶到那張卡片並閃一下",
    doneLook: "已完成的卡片長相", doneLookDesc: "做完的跟還沒做的要一眼分得出來",
    doneBoth: "淡化 + 劃掉", doneFade: "只淡化", doneStrike: "只劃掉", doneNone: "不變",
    saving: "儲存中…", saveFailed: "沒存進去,字還在框裡,再按一次儲存",
    backToMd: "回到 Markdown 閱讀模式", openWithBoard: "用卡片日誌看板開啟",
    needArchiveFirst: "要先封存才能刪除",
    cycleEdit: "改循環", cycleEvery: "每", cycleDay: "天", cycleWeek: "週", cycleMonth: "個月",
    cycleOff: "取消循環", cycleNone: "不循環", cycleSaved: "✓ 循環已改成 N",
    sectionColorHint: "點一下圓點換顏色",
    customColor: "自訂顏色", resetColor: "重設為自動",
    onlyFive: "只列前五個分類"
  },
  "en": {
    board: "Card Journal Board", today: "Today", week: "This week", month: "This month",
    all: "All", overdue: "Overdue", search: "Search title or content…",
    assignee: "Assignee", none: "Unassigned", noCards: "No cards in this range",
    edit: "Edit", save: "Save", cancel: "Cancel", comment: "Comment", pin: "Pin",
    done: "Done", placeholder: "Leave a note for everyone…", cards: "",
    justNow: "just now", minsAgo: "m ago", hoursAgo: "h ago",
    yesterday: "yesterday", daysAgo: "d ago",
    openBoard: "Open as Card Journal Board", openMd: "Back to raw Markdown",
    whoAmI: "Who is using this computer", whoAmIDesc: "Used to tell which comments are yours. Stored on this computer only; never synced.",
    people: "Assignees", peopleDesc: "Comma separated, e.g. Alice, Bob, Carol",
    autoSwitch: "Use frontmatter for notes never opened", autoSwitchDesc: "Each file remembers whether you last used the board or Markdown and opens that way. This switch only covers files with no memory yet: `看板:` in the frontmatter opens them as a board.",
    forgetFiles: "Clear remembered modes", forgetFilesDesc: "Forget them all; every file goes back to its first-open behaviour", forgetDone: "✓ Cleared N",
    busy: "The previous action is still saving — try again in a moment",
    lost: "Could not find this card any more; the file may have just changed on another device. Reload and try again.",
    conflict: "Sync conflict file detected",
    saved: "Saved",
    add: "New", added: "✓ Added", submit: "Add", submitHint: "⌘/Ctrl + Enter also submits",
    newTitle: "Title (optional)", newBody: "Body — the first line shows on the card", newPerson: "New name",
    needSomething: "Give it a title or some content",
    dToday: "Today", dTomorrow: "Tomorrow", dNextWeek: "Next week", rangeHint: "Second date only for a range",
    noDate: "—", undated: "Undated", archived: "Archived", archive: "Archive", unarchive: "Unarchive",
    undone: "Mark not done", unpin: "Unpin", moveTo: "Move to", openInMd: "Back to raw Markdown",
    changeDate: "Click to change the date", changeAssignee: "Click to reassign", pickColor: "Click to recolour",
    monthUnit: "", expandYear: "Whole year", collapseYear: "Collapse",
    managePeople: "Manage assignees", removePerson: "Remove from the list (names in cards are left alone)",
    dupName: "That name is already on the list", renamed: "✓ Assignee updated",
    whoAmIShort: "comments recognise you as this person",
    clearToDelete: "clear the text and save to delete it",
    defaultRange: "Range on open", defaultRangeDesc: "Which filter the board starts on",
    colors: "Colours",
    calendar: "Calendar", pickStart: "Click a day to start", pickEnd: "Click another day to end", close: "Close",
    topic: "Title", hotTopics: "Frequent titles", section: "Section",
    colDate: "Date", colSection: "Section", colBody: "Content",
    dayLayer: "Day", weekLayer: "Week", monthLayer: "Month",
    setToday: "Move to today", doneTag: "Done", archivedTag: "Archived", colorWord: "Recolour to",
    longTerm: "Long-term", showTodo: "To do", showDone: "Done", showArchived: "Archived",
    undatedBlock: "No date yet", fillDate: "Set date",
    clearSearch: "Clear title and body, back to the plain board (Esc)",
    expandAll: "Expand all", collapseAll: "Collapse",
    sortEdited: "Recently edited", sortColor: "Date then section",
    merge: "Merge", mergeCol: "Merge", mergeDo: "Merge into one",
    mergeHint: "Tick the cards to merge (N selected)", merged: "✓ Merged N cards into one",
    exportWord: "Export", exportPng: "Long image PNG (white)", exportPdf: "Print / save as PDF (white)",
    exporting: "Exporting…", exported: "✓ Exported", exportFail: "Export failed — try Print / save as PDF",
    exportBlocked: "The browser blocked the new window; allow pop-ups and try again",
    moreComments: "N more", send: "Send",
    sure: "Sure?",
    tooFast: "You just commented — wait N seconds so the file settles",
    writeFail: "Not written to the file (sync may be busy). Your text is still here — press Send again",
    movedDone: "✓ Moved to Done", movedTodo: "↩ Moved back to To do",
    movedArchive: "🗄 Moved to Archive", movedBack: "↩ Moved back to N",
    findTopic: "Find a title…", noTopics: "No titles",
    lang: "Language", langDesc: "Which language the board uses", langAuto: "Follow Obsidian",
    langZh: "繁體中文", langEn: "English",
    scanNow: "Re-check frontmatter and switch matching notes", scanned: "✓ Re-checked",
    postpone: "Later", doneOnce: "✔ Done for now — next on N", sortFile: "File order (drag to reorder)",
    alreadyDone: "N is already recorded", movedToday: "✓ Moved to today",
    editTopic: "Edit title", addTopic: "Add a title",
    deleteCard: "Delete this card", deleteAsk: "Delete this card for good?",
    deleteYes: "Delete", deleted: "Deleted",
    sections: "Sections", sectionDesc: "",
    sectionsHint: "Open a board first and your sections will be listed here.", autoColor: "Automatic",
    jumps: "Jump after an action", jumpDesc: "Move the filter to where the card is visible, and scroll to it",
    jumpDone: "To do → Done", jumpTodo: "Done → To do", jumpToday: "Move to today",
    calMonthTotal: "D cards this month across N days", thisMonth: "This month",
    changing: "Changing…", cancelWord: "Cancel", more: "more", less: "less",
    editSections: "Section names and colours", finish: "Done", undoEdit: "Undo this edit (works even if you deleted everything)",
    sectionsAndPeople: "Sections and people", editHere: "Edit here",
    ambiguous: "Two cards have the same first line, so I cannot tell which one to change. Edit one of them a little and try again",
    dupWarn: "This line is identical to another card, they will be hard to tell apart later",
    boardReady: "✓ Created sections 1 2 3 4 5",
    jumpAdd: "Adding a card", jumpAddDesc: "After adding, scroll to the new card and flash it",
    doneLook: "How done cards look", doneLookDesc: "Done and not-done should read apart at a glance",
    doneBoth: "Fade + strike through", doneFade: "Fade only", doneStrike: "Strike through only", doneNone: "No change",
    saving: "Saving…", saveFailed: "Not saved. Your text is still here, press save again",
    backToMd: "Back to Markdown", openWithBoard: "Open with Card Journal Board",
    needArchiveFirst: "Archive it first, then you can delete it",
    cycleEdit: "Repeat", cycleEvery: "every", cycleDay: "day(s)", cycleWeek: "week(s)", cycleMonth: "month(s)",
    cycleOff: "Stop repeating", cycleNone: "No repeat", cycleSaved: "✓ Repeat set to N",
    sectionColorHint: "Click a dot to change its colour",
    customColor: "Custom colour", resetColor: "Back to automatic",
    onlyFive: "Showing the first five sections"
  }
};
let 語言設定 = "auto";      // auto = 跟著 Obsidian;也可以強制 zh-TW / en
function 語() {
  if (語言設定 === "zh-TW" || 語言設定 === "en") return 字典[語言設定];
  try {
    const l = String(window.localStorage.getItem("language") || "").toLowerCase();
    if (l && !l.startsWith("zh")) return 字典["en"];
  } catch (e) {}
  return 字典["zh-TW"];    // 預設繁體中文
}

/* ============================================================
   設定
   ============================================================ */
const 預設設定 = {
  指派人: ["嘉峻", "欣明", "月柑"],
  指派人顏色: {},                 // { 嘉峻: "#ff9f0a" }
  /* 分類設定。檔案裡的 `## 標題` 是身分(不會被改動),
     這裡只決定它在畫面上**長什麼樣**:用哪個顏色、顯示成什麼名字。
       分類顏色   { "紅色": "紅" }      —— 用哪一個標籤色
       分類名稱   { "紅色": "1" }       —— 畫面上顯示的名字,預設就是阿拉伯數字 1 2 3 4 5 6
     「分類顏色順序」排序時,照的就是顏色在 自動色名 裡的先後。 */
  分類顏色: {},
  分類名稱: {},
  自動切換: true,      // 還沒記過的檔案,frontmatter 有 `看板:` 就用看板開(記過之後以記憶為準)
  看板檔案: {},        // { "路徑.md": true=看板 / false=Markdown } —— 每個檔案上次用哪一種
  預設範圍: "今日",
  // 「顯示」三開關:決定清單、統計數字、行事曆的點要不要把這幾類算進來
  排程顯示: { 未完成: true, 完成: true, 封存: false },
  /* 已完成的卡片長什麼樣。以前只有圓點變綠、色條淡一點 ——
     掃一整頁的時候跟未完成的太像,要停下來一張一張看圓點。
     淡化 = 整列退到背景;劃掉 = 內容打一條線。預設兩個都開。 */
  完成樣式: "淡化劃掉",        // 淡化劃掉 / 淡化 / 劃掉 / 無
  語言: "auto",          // auto = 跟著 Obsidian;zh-TW / en 可以強制
  /* 做完一個動作之後,要不要自動把篩選調到「看得到那張卡片」的地方。
     有人喜歡留在原地慢慢清單子,所以三個各自可以關。 */
  跳轉_未完成到完成: true,
  跳轉_完成到未完成: true,
  跳轉_設回今日: true,
  跳轉_新增: true,
  排序: "編修",          // 編修 = 最近新增/編修的排最上面(預設);顏色 = 日期 → 分類順序
  版本: 插件版本
};
const 我是誰鍵 = "card-table-who";   // 只放這台電腦的身分,故意不同步
function 讀我是誰() {
  try { return String(window.localStorage.getItem(我是誰鍵) || "").trim() || null; }
  catch (e) { return null; }
}
function 存我是誰(名) {
  try {
    if (名) window.localStorage.setItem(我是誰鍵, String(名));
    else window.localStorage.removeItem(我是誰鍵);
  } catch (e) {}
}

/* ============================================================
   格式 —— 跟現在的卡片日誌一模一樣,一個字都沒改
   ------------------------------------------------------------
   ⚠ 這一整段是「合約」。要動格式,先看 `搬遷清單.md` 裡的規則:
     舊格式永遠讀得懂,新格式才是寫出去的樣子。
   ============================================================ */
const 項目符 = "．";
const 符號Re = /^(?:[-*+]\s+|\d+[.)]\s+|[．·・•]\s*)+/;
const 卡首Re = /^(\s*)-\s+\[( |x|X)\]\s*(.*)$/;      // - [ ] 或 - [x]
const 主題Re = /^\[([^\]\n]{1,40})\]\s*/;            // [主題]
const 日期Re = /[＠@]\{(\d{4}-\d{2}-\d{2})(?:[^}]*)\}/;
const 區間Re = /[＠@]\{(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})\}/;
const 標記Re = /[＠@]\{[^}]*\}/g;
const 置頂Re = /\s*📌/;
const 置頂清除Re = /\s*📌/g;
const 編時Re = /✎\{(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})\}/;
const 時戳清除Re = /\s*✎\{[^}]*\}/g;
const 留言Re = /^💬[\t ]*\{(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})\|([^}|\n]{1,16})\}[\t ]*([\s\S]*)$/;
const 標題Re = /^#{1,6}\s+(.+?)\s*$/;
// 長期・週期:卡片標了 #長期 或 🔁 就算,不管有沒有寫日期(跟原版同一個判斷)
const 長期Re = /#長期|🔁/;
/* ---- 🔁 循環卡片 ----
   第一行寫 `🔁 每2週` 就是每兩週一次。只寫 🔁 當成每週。
   完成欄不是勾選框,而是「本次完成」——按下去:
     ① 日期推到下一次
     ② 在卡片裡插一條 `．✔ 本次完成 2026-09-10(四)` 的記錄(新的排最上面)
   那條記錄是內容的一部分(有縮排),不會被當成另一張卡片。 */
const 週期Re = /🔁/;
/* 整個 🔁 標記(含後面的「每N單位」)。改循環就是把這一整段換掉。
   ⚠ 中文和英文兩種寫法都要吃得下,不然使用者原本寫 `🔁 every 2 weeks`
     改一次就會變成兩個標記並排。 */
const 循環標記Re = /🔁[ \t]*(?:每[ \t]*\d*[ \t]*(?:天|日|週|周|星期|月)|every[ \t]*\d*[ \t]*(?:day|week|month)s?)?/i;
function 循環字(循) {
  if (!循) return "";
  return "🔁 每" + 循.隔 + (循.型 === "月" ? "月" : (循.型 === "日" ? "天" : "週"));
}
const 本次完成Re = /^(?:✅|✔|☑)\s*本次完成/;
const 週期單位 = { 月: "月", 日: "天", 週: "週" };
function 讀循環(首行) {
  const 首 = String(首行 || "").split("\n")[0];
  if (!週期Re.test(首)) return null;
  let m = /🔁\s*每\s*(\d*)\s*(天|日|週|周|星期|月)/.exec(首);
  if (m) {
    const n = parseInt(m[1] || "1", 10) || 1;
    const u = m[2];
    return { 型: (u === "月") ? "月" : ((u === "天" || u === "日") ? "日" : "週"), 隔: n };
  }
  m = /🔁\s*every\s*(\d*)\s*(day|week|month)/i.exec(首);
  if (m) {
    const n = parseInt(m[1] || "1", 10) || 1;
    const u = m[2].toLowerCase();
    return { 型: (u === "month") ? "月" : ((u === "day") ? "日" : "週"), 隔: n };
  }
  return { 型: "週", 隔: 1 };            // 只寫了 🔁,當成每週
}
function 循環說明短(循) {
  if (!循) return "";
  return "每" + 循.隔 + (循.型 === "月" ? "月" : (循.型 === "日" ? "天" : "週"));
}
function 循環說明(循) {
  if (!循) return "";
  return "每 " + 循.隔 + " " + (循.型 === "月" ? "個月" : (循.型 === "日" ? "天" : "週")) + "循環";
}
function 下一次(日, 循) {
  const d = new Date(日 + "T00:00:00");
  if (循.型 === "月") {
    /* ⚠ 月要小心:1/31 加一個月,JS 會自己溢位變成 3/3(因為二月沒有 31 號)。
       正確答案是「那個月的最後一天」= 2/28。所以先算目標月的天數再夾住。 */
    const 日數 = d.getDate();
    const 目標 = new Date(d.getFullYear(), d.getMonth() + 循.隔, 1);
    const 該月天數 = new Date(目標.getFullYear(), 目標.getMonth() + 1, 0).getDate();
    目標.setDate(Math.min(日數, 該月天數));
    return 日字(目標);
  }
  if (循.型 === "週") d.setDate(d.getDate() + 循.隔 * 7);
  else d.setDate(d.getDate() + 循.隔);
  return 日字(d);
}

function 前空白(行) { const m = /^([ \t]*)/.exec(String(行 || "")); return m ? m[1] : ""; }
function 去符(行) {
  return String(行 || "").replace(/^[ \t]+/, "").replace(符號Re, "").trim();
}
function 上符(文) {
  return String(文 || "").replace(/\r/g, "").split("\n").map(t => {
    const 空 = 前空白(t), x = 去符(t);
    return x ? (空 + 項目符 + x) : "";
  }).join("\n");
}
function 去符多行(文) {
  return String(文 || "").replace(/\r/g, "").split("\n").map(t => {
    const 空 = 前空白(t), x = 去符(t);
    return x ? (空 + x) : "";
  }).join("\n");
}
function 兩位(n) { return (n < 10 ? "0" : "") + n; }
function 日字(d) {
  return d.getFullYear() + "-" + 兩位(d.getMonth() + 1) + "-" + 兩位(d.getDate());
}
function 時字(d) { return 兩位(d.getHours()) + ":" + 兩位(d.getMinutes()); }
// 表格上顯示用:年份只留兩碼,後面帶星期,省下的寬度給內容欄
function 日期短(d) {
  if (!d) return "";
  const w = new Date(d + "T00:00:00");
  const 週 = ["日", "一", "二", "三", "四", "五", "六"][w.getDay()];
  return String(d).slice(2) + "(" + 週 + ")";
}
function 現在戳() { const d = new Date(); return 日字(d) + " " + 時字(d); }
function 蓋時戳(行) {
  return String(行 || "").replace(時戳清除Re, "").replace(/\s+$/, "") + " ✎{" + 現在戳() + "}";
}

/* 卡片的身分:檔案 + 第一行內文(拿掉日期／指派人／置頂／編修時間)。
   行號會變,內文比較穩 —— 換一台電腦、被別人插入一張卡都還認得出來。 */
function 淨首行(文, 人Re) {
  let s = String(文 || "").split("\n")[0]
    .replace(卡首Re, "$3")          // ⚠ `- [ ]` / `- [x]` 一定要拿掉:
                                    //    不然打勾一次,卡片的身分就變了,下一個動作就找不到它
    .replace(標記Re, "").replace(置頂清除Re, "").replace(時戳清除Re, "");
  if (人Re) s = s.replace(人Re, "");
  return s.replace(/[\t ]{2,}/g, " ").trim();
}
function 人規則(名單) {
  const 名 = (名單 || []).map(n => String(n).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).filter(Boolean);
  if (!名.length) return { 找: /#(?!)/, 清: /#(?!)/g };
  return {
    找: new RegExp("#(" + 名.join("|") + ")(?![\\w\\u4e00-\\u9fff])"),
    清: new RegExp("\\s*#(?:" + 名.join("|") + ")(?![\\w\\u4e00-\\u9fff])", "g")
  };
}

/* ------------------------------------------------------------
   讀卡:把一整份 md 解析成卡片陣列
   一張卡 = 一個頂層 `- [ ]` / `- [x]`,加上它底下所有縮排的行。
   分類 = 它上面最近的那個 `## 標題`(現在的資料就是 Kanban 的欄位)。
   ------------------------------------------------------------ */
function 解析卡片(內文, 名單) {
  const 人Re = 人規則(名單);
  const 行 = String(內文 || "").replace(/\r/g, "").split("\n");
  const 卡 = [];
  let 分類 = "—", 目前 = null, 前置 = true;

  for (let i = 0; i < 行.length; i++) {
    const t = 行[i];

    // frontmatter 直接跳過
    if (前置 && i === 0 && t.trim() === "---") {
      let j = i + 1;
      while (j < 行.length && 行[j].trim() !== "---") j++;
      i = j; 前置 = false; continue;
    }
    前置 = false;

    const h = 標題Re.exec(t);
    if (h) { 目前 = null; 分類 = h[1].trim() || "—"; continue; }

    const c = 卡首Re.exec(t);
    if (c && !c[1]) {                       // 沒有縮排 = 一張新的卡片
      目前 = 新卡(t, c, 分類, i, 人Re);
      卡.push(目前);
      continue;
    }
    if (目前 && (t.trim() === "" || /^[ \t]/.test(t))) {
      目前.行.push(t); 目前.迄 = i;         // 縮排的行都算這張卡的內容
      continue;
    }
    目前 = null;
  }
  卡.forEach(k => 收尾(k, 人Re));
  return 卡;
}
function 新卡(原行, m, 分類, 行號, 人Re) {
  const 本體 = m[3];
  const 主 = 主題Re.exec(本體);
  return {
    分類: 分類, 起: 行號, 迄: 行號,
    完成: m[2].toLowerCase() === "x",
    主題: 主 ? 主[1] : "",
    首行原文: 原行,
    行: [],
    留言: [], 內容行: []
  };
}
function 收尾(k, 人Re) {
  const 首 = k.首行原文;
  const 區 = 區間Re.exec(首), 日 = 日期Re.exec(首);
  k.起日 = 區 ? 區[1] : (日 ? 日[1] : null);
  k.迄日 = 區 ? 區[2] : k.起日;
  k.置頂 = 置頂Re.test(首);
  const e = 編時Re.exec(首);
  k.編修時 = e ? (e[1] + " " + e[2]) : null;
  const p = 人Re.找.exec(首);
  k.指派 = p ? p[1] : null;
  k.鍵 = 淨首行(首, 人Re.清);
  k.長期 = 長期Re.test(首);
  k.循環 = 讀循環(首);

  // 首行本身的內容(去掉 `- [ ] [主題]` 和所有標記)
  const 純 = String(首).replace(卡首Re, "$3").replace(主題Re, "")
    .replace(標記Re, "").replace(置頂清除Re, "").replace(時戳清除Re, "")
    .replace(人Re.清, "").trim();
  k.內容行 = [去符(純)].filter(Boolean);

  k.行.forEach(t => {
    const x = 去符(t);
    if (!x) return;
    const c = 留言Re.exec(x);
    if (c) {
      const 人 = c[3].trim();
      k.留言.push({ 日: c[1], 分: c[2], 人: 人, 文: (c[4] || "").trim(), id: c[1] + " " + c[2] + "|" + 人 });
    } else if (本次完成Re.test(x)) {
      k.內容行.push(x);          // 記錄行原封不動顯示,日期就是重點
      k.完成過 = (k.完成過 || 0) + 1;
    } else {
      k.內容行.push(x);
    }
  });
  k.留言.sort((a, b) => (b.日 + b.分).localeCompare(a.日 + a.分));   // 新的在上面
  return k;
}
/* 卡片的指紋:內容每一行 + 每一則留言的 id。
   兩張首行一樣的卡,靠這個幾乎一定分得出來。 */
function 指紋(k) {
  return (k.內容行 || []).map(x => "C" + x)
    .concat((k.留言 || []).map(c => "M" + c.id));
}
function 相似(a, b) {
  if (!a.length && !b.length) return 1;
  const 集 = {}; b.forEach(x => { 集[x] = 1; });
  let 中 = 0; a.forEach(x => { if (集[x]) 中++; });
  return 中 / Math.max(1, Math.max(a.length, b.length));
}
// 從剛寫出去的那一行算出它的「卡片鍵」,新增完才找得到它在哪一列
function 鍵由首行(首行, 名單) {
  return 淨首行(首行, 人規則(名單 || []).清);
}
function 組留言行(人, 文, 毫秒) {
  const d = new Date(毫秒 || Date.now());
  return "\t" + 項目符 + "💬{" + 日字(d) + " " + 時字(d) + "|" + 人 + "} " +
    String(文 || "").replace(/\s*\n\s*/g, " ").trim();
}
function 留言時值(c) { return new Date(c.日 + "T" + c.分 + ":00").getTime(); }
function 多久前(毫秒, T) {
  const 一分 = 60000, 一時 = 3600000, 一日 = 86400000;
  const d = Date.now() - (毫秒 || 0);
  if (!(毫秒 > 0)) return "";
  if (d < 2 * 一分) return T.justNow;
  if (d < 一時) return Math.floor(d / 一分) + " " + T.minsAgo;
  if (d < 一日) return Math.floor(d / 一時) + " " + T.hoursAgo;
  if (d < 2 * 一日) return T.yesterday;
  if (d < 7 * 一日) return Math.floor(d / 一日) + " " + T.daysAgo;
  const x = new Date(毫秒);
  return 兩位(x.getMonth() + 1) + "-" + 兩位(x.getDate());
}

/* ============================================================
   寫檔 —— 五道防線
   ------------------------------------------------------------
   多台電腦同時開著同一個 vault,Obsidian Sync 幾秒才推一次。
   所以每一次寫檔都要當作「檔案剛剛被別人改過」來寫:

   ① 一次只寫一行。不整段覆蓋,不重排,不順手美化別人的字。
   ② 寫之前重讀、重新定位。行號一律當作過期的,拿卡片的「鍵」
      (檔案 + 淨首行)重新找到它現在在第幾行。
   ③ 每一則留言有自己的 id(時間|誰)。寫進去以前先確認同一個 id
      還沒在檔案裡,才不會按兩下變兩則。
   ④ 寫完再讀一次,真的看到那一行才算成功;沒看到就自動再送一次。
   ⑤ 看到 `… (conflicted copy).md` 就在畫面上掛提示,不要默默蓋掉。

   同一時間只跑一個寫檔動作(動作鎖),寫完再留一段緩衝,
   免得手快按兩下時第二次抓到舊行號。
   ============================================================ */
/* 純函式:在「這一份文字」裡找出這張卡片現在在第幾行。
   ⚠ 不做 I/O —— 因為它必須在**原子讀改寫**的那一瞬間、對著當下真正的檔案內容跑。
     舊版是「先 await read 一次、算完再 modify」,中間那段空窗只要檔案被動過
     (自己的上一個動作、Obsidian Sync、另一個分頁),算出來的整份新文字就是
     以舊內容為底的 —— 寫回去等於把別人的改動蓋掉,或把已經搬走的卡片復活。 */
function 定位文(文, 卡, 名單) {
  const 全 = 解析卡片(文, 名單);
  const 中 = 全.filter(k => k.鍵 === 卡.鍵);
  if (!中.length) return null;
  let 選 = 中[0], 含糊 = false;
  if (中.length > 1) {
    /* ⚠ 同一份檔案裡真的會有兩張首行一模一樣的卡。靠「內容 + 留言 id」的指紋分辨,
       因為別人改的是別張卡,我手上這張的內容不會憑空變樣。 */
    const 我指紋 = 指紋(卡);
    const 分 = 中.map(k => ({ k: k, 像: 相似(指紋(k), 我指紋) }));
    const 最像 = Math.max.apply(null, 分.map(x => x.像));
    const 並列 = 分.filter(x => x.像 === 最像).map(x => x.k);
    if (並列.length === 1) 選 = 並列[0];
    else {
      /* 還是同分。只有在「這幾張連內容都一模一樣」時,挑哪一張都無所謂;
         內容不一樣卻同分 = 真的不知道是哪一張 —— 那就**什麼都不要寫**。
         ⚠⚠ 舊版在這裡用「行號比較近的那張」硬挑一張。行號是上一次畫面渲染時記下來的,
           只要檔案被動過就整個位移,挑到隔壁那張 = 把使用者的內容蓋掉。
           2026-09-11 那次「一篇被吃掉、變成兩張一樣的卡片」就是這樣來的。 */
      const 一樣 = 並列.every(k => 指紋(k).join("") === 指紋(並列[0]).join(""));
      if (!一樣) 含糊 = true;
      const 原 = Number(卡.起) || 0;
      選 = 並列.reduce((a, b) => (Math.abs(b.起 - 原) < Math.abs(a.起 - 原) ? b : a));
    }
  }
  return { 卡: 選, 幾張: 中.length, 含糊: 含糊 };
}

class 寫手 {
  constructor(app, T) {
    this.app = app; this.T = T;
    this.忙 = false;
    this.緩衝 = 120;              // 兩次寫檔之間的喘息
    this.隊 = Promise.resolve();  // 佇列尾巴
    this.排隊數 = 0;
    this.上限 = 30;
  }
  /* ⚠⚠ 0.9.0 修掉一個會「無聲吃掉使用者動作」的設計:
     舊版正在寫檔的時候再來一個動作 → 直接丟掉 + 跳一個「忙碌中」。
     連按兩下、或內容打完馬上按儲存,那一次就永遠不會被寫進去。
     現在是**真的排隊**:後面的動作接在前一棒後面跑,一個都不會掉,
     而且某一棒炸掉也不會把整條佇列弄斷。 */
  async 排隊做(工作) {
    if (this.排隊數 >= this.上限) { new Notice(this.T.busy); return null; }
    this.排隊數++;
    const 這一棒 = this.隊.then(async () => {
      this.忙 = true;
      try { return await 工作(); }
      catch (e) { console.error("[card-table] 寫入失敗", e); return false; }
      finally {
        await new Promise(r => setTimeout(r, this.緩衝));
        this.忙 = false;
      }
    });
    this.隊 = 這一棒.then(() => {}, () => {});
    try { return await 這一棒; }
    finally { this.排隊數--; }
  }

  /* ⚠⚠⚠ 1.1 的核心:所有寫檔都走這裡,而且是**原子的讀改寫**。
     換(文) 拿到當下真正的檔案內容,回傳 { 文: 新的整份文字, 值: 要回報什麼 };
     不該寫就回傳 { 誤: "要說的話" },或 { 文: 文 } 表示原樣不動。

     為什麼非這樣不可:這個外掛每一次寫入都是「拿整份文字 → 算出新的整份文字 → 寫回去」。
     只要「拿」跟「寫回去」中間檔案被動過,寫回去就是拿舊的蓋掉新的。會在中間動它的有三個:
       ① 自己的上一個動作(排隊只保證順序,不保證 vault.read 立刻讀得到剛寫進去的內容)
       ② Obsidian Sync / 另一台電腦
       ③ 同一個檔案開著的別的分頁
     vault.process() 就是 Obsidian 給的原子版本,回呼裡拿到的一定是當下的內容。
     沒有 process 的舊版 Obsidian 就退回「讀 → 算 → 再讀一次確認沒變 → 才寫」,變了就重算。 */
  async 安全改(檔, 換) {
    const v = this.app.vault;
    let 值 = false, 誤 = null;
    const 跑 = (文) => {
      誤 = null;
      const r = 換(文);
      if (!r) { 誤 = this.T.lost; return null; }
      if (r.誤) { 誤 = r.誤; return null; }
      值 = (r.值 === undefined) ? true : r.值;
      return (typeof r.文 === "string") ? r.文 : null;
    };
    if (typeof v.process === "function") {
      await v.process(檔, (文) => { const n = 跑(文); return (n === null) ? 文 : n; });
      if (誤) { new Notice(誤); return false; }
      return 值;
    }
    for (let 次 = 0; 次 < 4; 次++) {
      const 文 = await v.read(檔);
      const 新 = 跑(文);
      if (新 === null) { if (誤) new Notice(誤); return false; }
      const 再 = await v.read(檔);
      if (再 !== 文) { await new Promise(r => setTimeout(r, 90)); continue; }   // 有人動過,重算
      if (新 !== 文) await v.modify(檔, 新);
      return 值;
    }
    new Notice(this.T.busy);
    return false;
  }

  /* 找卡片 + 算出新文字的共用外殼。做(行, 卡) 動 行 這個陣列;
     回傳 false = 找不到該動的地方,回傳 null = 不必改。 */
  改卡片(檔, 卡, 名單, 做) {
    return this.安全改(檔, (文) => {
      const 位 = 定位文(文, 卡, 名單);
      if (!位) return { 誤: this.T.lost };
      if (位.含糊) return { 誤: this.T.ambiguous };
      const 行 = 文.split("\n");
      const r = 做(行, 位.卡);
      if (r === false) return { 誤: this.T.lost };
      if (r === null) return { 文: 文 };
      return { 文: 行.join("\n") };
    });
  }

  /* ⚠⚠ 一行就是一行 —— 寫進去的字裡面**絕對不可以有換行**。
     踩過的坑:使用者留了一則多行的留言,那一整串被當成「一行」splice 進陣列,
     join 之後就變成好幾個實體行 —— 第一行還帶著 `．💬{...}` 前綴,
     第二行以後是**沒有前綴的裸文字**,卡片上看起來就像多了兩行莫名其妙的內容,
     而且解析時也不會被當成留言。所以所有寫入都先過這一關。 */
  一行(文) {
    return String(文 || "").replace(/[\r\n]+/g, " ").replace(/[\t ]{2,}/g, " ");
  }

  /* 只插一行:把一行加在卡片首行的正後面(留言就是這樣進去的)。
     ⚠ 舊版寫完會重讀三次確認、沒看到就「補送一次」—— 那個補送本身就是重複留言的來源。
       現在是原子寫入,重複檢查跟寫入在同一個交易裡,不需要補送也不會重複。 */
  async 插一行(檔, 卡, 行文, 名單, 檢查重複) {
    行文 = this.一行(行文);
    return await this.排隊做(() => this.改卡片(檔, 卡, 名單, (行, 卡x) => {
      if (檢查重複 && 檢查重複(卡x)) return null;      // 已經在裡面了
      行[卡x.起] = 蓋時戳(行[卡x.起]);
      行.splice(卡x.起 + 1, 0, 行文);
    }));
  }

  /* 只改／刪一行:找到那一行(用留言 id 或整行比對)換掉它 */
  async 改一行(檔, 卡, 認行, 新文, 名單) {
    if (新文 !== null) 新文 = this.一行(新文);
    return await this.排隊做(() => this.改卡片(檔, 卡, 名單, (行, 卡x) => {
      let 目標 = -1;
      for (let i = 卡x.起; i <= 卡x.迄; i++) { if (認行(行[i])) { 目標 = i; break; } }
      if (目標 < 0) return false;
      行[卡x.起] = 蓋時戳(行[卡x.起]);
      if (新文 === null) 行.splice(目標, 1); else 行[目標] = 新文;
    }));
  }

  /* 整段內容改寫(編修框按儲存)。留言不動,原樣留著。 */
  async 換內容(檔, 卡, 新內容, 名單, 新主題) {
    this.__新鍵 = null;          // ⚠ 上一次留下來的值不可以外漏到這一次
    return await this.排隊做(() => this.改卡片(檔, 卡, 名單, (行, 卡x) => {
      const 留 = [];
      for (let i = 卡x.起 + 1; i <= 卡x.迄; i++) {
        if (留言Re.test(去符(行[i]))) 留.push(行[i]);
      }
      const 段 = String(新內容 || "").replace(/\r/g, "").split("\n");
      const 首 = this.一行(段.shift() || "");
      const 尾 = 段.map(t => t.trim() ? ("\t" + 項目符 + this.一行(去符(t))) : "").filter(x => x !== "");
      let 新首 = 行[卡x.起];
      const m = 卡首Re.exec(新首);
      if (m) {
        const 舊本體 = m[3];
        const 主 = 主題Re.exec(舊本體);
        const 題 = (新主題 === undefined || 新主題 === null) ? (主 ? 主[1] : "") : String(新主題).trim();
        const 尾標 = (舊本體.match(標記Re) || []).join(" ");
        const 人 = (舊本體.match(/#\S+/g) || []).join(" ");
        const 頂 = 置頂Re.test(舊本體) ? " 📌" : "";
        新首 = "- [" + (卡x.完成 ? "x" : " ") + "] " +
          (題 ? "[" + 題 + "] " : "") + 項目符 + 去符(首) +
          (尾標 ? " " + 尾標 : "") + (人 ? " " + 人 : "") + 頂;
      }
      行.splice(卡x.起, 卡x.迄 - 卡x.起 + 1, 蓋時戳(新首), ...尾, ...留);
      /* ⚠ 改完內容,這張卡片的**身分就換了** —— 鍵是「第一行的文字」算出來的。
         隨打隨存的時候如果不把新的鍵交回去,下一次自動存就會拿舊鍵去找,
         找不到 → 每打幾個字跳一次「找不到這張卡片」。 */
      this.__新鍵 = 鍵由首行(蓋時戳(新首), 名單);
    })).then(r => (r === true && this.__新鍵) ? this.__新鍵 : r);
  }

  /* 新增一張卡片:插在指定分類(`## 標題`)的正下面。
     ⚠ 只加行,不重排別人的卡片。 */
  async 新增卡片(檔, 分類, 首行, 尾行) {
    首行 = this.一行(首行);
    尾行 = (尾行 || []).map(t => this.一行(t));
    return await this.排隊做(() => this.安全改(檔, (文) => {
      const 行 = 文.split("\n");
      let 位 = -1;
      for (let i = 0; i < 行.length; i++) {
        const h = 標題Re.exec(行[i]);
        if (h && h[1].trim() === 分類) { 位 = i; break; }
      }
      if (位 < 0) { 行.push("", "## " + 分類, ""); 位 = 行.length - 2; }
      let 插 = 位 + 1;
      while (插 < 行.length && 行[插].trim() === "") 插++;
      行.splice(插, 0, 首行, ...(尾行 || []));
      return { 文: 行.join("\n") };
    }));
  }

  /* 只改卡片的第一行(打勾、置頂、改日期、改指派人都走這裡)。
     換句話說:內容和留言一個字都不會被碰到。 */
  async 改首行(檔, 卡, 換, 名單) {
    return await this.排隊做(() => this.改卡片(檔, 卡, 名單, (行, 卡x) => {
      const 新 = 換(行[卡x.起], 卡x);
      if (新 === null || 新 === 行[卡x.起]) return null;
      行[卡x.起] = 蓋時戳(新);
    }));
  }

  /* 只改主題(第一行開頭那個 `[主題]`),內容和留言完全不碰 */
  async 改主題(檔, 卡, 新主題, 名單) {
    return await this.改首行(檔, 卡, (首) => {
      const m = 卡首Re.exec(首);
      if (!m) return null;
      let 本體 = m[3].replace(主題Re, "");
      return m[1] + "- [" + m[2] + "] " + (新主題 ? "[" + 新主題 + "] " : "") + 本體;
    }, 名單);
  }

  /* 把整張卡片(首行 + 底下所有行)搬到另一個分類底下。封存就是搬到 `## Archive`。 */
  async 搬分類(檔, 卡, 到, 名單) {
    return await this.排隊做(() => this.改卡片(檔, 卡, 名單, (行, 卡x) => {
      if (卡x.分類 === 到) return null;
      const 整張 = 行.slice(卡x.起, 卡x.迄 + 1);
      整張[0] = 蓋時戳(整張[0]);
      行.splice(卡x.起, 卡x.迄 - 卡x.起 + 1);
      let 標 = -1;
      for (let i = 0; i < 行.length; i++) {
        const h = 標題Re.exec(行[i]);
        if (h && h[1].trim() === 到) { 標 = i; break; }
      }
      if (標 < 0) { 行.push("", "## " + 到, ""); 標 = 行.length - 2; }
      let 插 = 標 + 1;
      while (插 < 行.length && 行[插].trim() === "") 插++;
      行.splice(插, 0, ...整張);
    }));
  }

  /* 刪掉整張卡片(首行 + 底下所有行)。只有已封存的卡片會走到這裡。 */
  async 刪卡片(檔, 卡, 名單) {
    return await this.排隊做(() => this.改卡片(檔, 卡, 名單, (行, 卡x) => {
      行.splice(卡x.起, 卡x.迄 - 卡x.起 + 1);
    }));
  }

  /* 指派人改名:把整份檔案裡的 `#舊名` 換成 `#新名`。
     ⚠ 這是會一次改很多行的動作,所以只換 `#名字` 這個 token,不碰其他字。 */
  async 改指派人名(檔, 舊, 新) {
    return await this.排隊做(() => this.安全改(檔, (文) => {
      const re = new RegExp("#" + 舊.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        "(?![\\w\\u4e00-\\u9fff])", "g");
      const 換 = (文.match(re) || []).length;
      if (!換) return { 文: 文, 值: 0 };
      return { 文: 文.replace(re, "#" + 新), 值: 換 };
    }));
  }

  /* 融合:好幾張合成一張。
     ⚠ **任何一張對不上或分不出來就整份不動** —— 半套的融合會直接吃掉卡片。 */
  async 融合(檔, 卡們, 到分類, 首行, 尾行, 名單) {
    首行 = this.一行(首行);
    尾行 = (尾行 || []).map(t => this.一行(t));
    return await this.排隊做(() => this.安全改(檔, (文) => {
      const 位們 = [];
      for (const k of 卡們) {
        const 位 = 定位文(文, k, 名單);
        if (!位) return { 誤: this.T.lost };
        if (位.含糊) return { 誤: this.T.ambiguous };
        位們.push(位.卡);
      }
      const 行 = 文.split("\n");
      // 由下往上刪,行號才不會邊刪邊跑掉
      位們.slice().sort((a, b) => b.起 - a.起).forEach(k => {
        行.splice(k.起, k.迄 - k.起 + 1);
      });
      let 標 = -1;
      for (let i = 0; i < 行.length; i++) {
        const h = 標題Re.exec(行[i]);
        if (h && h[1].trim() === 到分類) { 標 = i; break; }
      }
      if (標 < 0) { 行.push("", "## " + 到分類, ""); 標 = 行.length - 2; }
      let 插 = 標 + 1;
      while (插 < 行.length && 行[插].trim() === "") 插++;
      行.splice(插, 0, 首行, ...(尾行 || []));
      return { 文: 行.join("\n") };
    }));
  }

  /* 本次完成:同一次寫檔裡做兩件事 —— 首行日期換成下一次、底下插一條記錄。 */
  async 本次完成(檔, 卡, 記錄行, 原日, 新日, 名單) {
    記錄行 = this.一行(記錄行);
    return await this.排隊做(() => this.改卡片(檔, 卡, 名單, (行, 卡x) => {
      標記Re.lastIndex = 0;
      行[卡x.起] = 蓋時戳(行[卡x.起].replace(標記Re, "＠{" + 新日 + "}"));
      行.splice(卡x.起 + 1, 0, 記錄行);
    }));
  }
  async 復原本次(檔, 卡, 記錄行, 從, 回, 名單) {
    const 找 = 去符(this.一行(記錄行));
    return await this.排隊做(() => this.改卡片(檔, 卡, 名單, (行, 卡x) => {
      標記Re.lastIndex = 0;
      行[卡x.起] = 蓋時戳(行[卡x.起].replace(標記Re, "＠{" + 回 + "}"));
      for (let i = 卡x.起 + 1; i <= 卡x.迄; i++) {
        if (去符(行[i]) === 找) { 行.splice(i, 1); break; }
      }
    }));
  }

  /* 拖曳排序:把一張卡片整段搬到另一張卡片的前面/後面。
     ⚠ 兩張都要在同一份文字裡定位過才動,而且只搬行、不改任何一個字。 */
  async 搬到(檔, 卡, 目標, 放後面, 名單) {
    return await this.排隊做(() => this.安全改(檔, (文) => {
      const pa = 定位文(文, 卡, 名單), pb = 定位文(文, 目標, 名單);
      if (!pa || !pb) return { 誤: this.T.lost };
      if (pa.含糊 || pb.含糊) return { 誤: this.T.ambiguous };
      const a = pa.卡, b = pb.卡;
      if (a.起 === b.起) return { 文: 文 };
      const 行 = 文.split("\n");
      const 整張 = 行.slice(a.起, a.迄 + 1);
      行.splice(a.起, a.迄 - a.起 + 1);
      const 位移 = (b.起 > a.起) ? (a.迄 - a.起 + 1) : 0;
      const 落 = (放後面 ? b.迄 + 1 : b.起) - 位移;
      行.splice(Math.max(0, 落), 0, ...整張);
      return { 文: 行.join("\n") };
    }));
  }

  /* 新看板:一次把分區開好(`## 1` ~ `## 5`)。已經有任何 `##` 標題的檔案完全不碰。 */
  async 開好分區(檔, 名們) {
    return await this.排隊做(() => this.安全改(檔, (文) => {
      const 行 = 文.split("\n");
      if (行.some(t => 標題Re.test(t))) return { 文: 文, 值: false };
      const 加 = [];
      名們.forEach(n => { 加.push("## " + n, ""); });
      const 底 = 文.replace(/\s+$/, "");
      return { 文: (底 ? 底 + "\n\n" : "") + 加.join("\n"), 值: true };
    }));
  }

  // 同步衝突檔
  找衝突檔(檔) {
    try {
      const base = 檔.basename;
      return this.app.vault.getMarkdownFiles()
        .filter(f => f.path !== 檔.path && f.basename.indexOf(base) === 0 &&
          /conflicted copy|衝突|conflict/i.test(f.basename));
    } catch (e) { return []; }
  }
}



/* ============================================================
   看板視圖 —— 版面完全照 `日誌看板.md` 原版
   ------------------------------------------------------------
   class 名稱刻意跟原版一模一樣(tk-board / tk-塊 / tk-統計格 / tk-欄框 /
   tk-上排 / tk-文欄 / tk-題行 / tk-留區 / tk-色條 / tk-釘 / tk-date …),
   CSS 也是從原版整塊搬過來的 —— 兩邊要一起改的時候才對得起來。

   版面由上而下:
     ① 導覽列(深色 block):年 + 本日/本周/本月 ‧ 全部/已逾期 ‧ 未排期 ‧ 封存
     ② 行事曆(預設收起來,點年格上的「📅 行事曆」打開)
     ③ 新增區:兩列,每列都是「左邊會伸縮的群組 + 右邊固定寬的群組」
          第一列 [主題 ‧ 常用主題] [分類 ‧ 指派人]
          第二列 [內容]           [送出]
     ④ 表格:日期 112 ‧ 分類 78 ‧ 內容(吃掉剩下的)—— table-layout:fixed
     ⑤ 版本列(固定 26px)

   ⚠ 兩件事從原版一路踩出來的,不要拆掉:
     ・`overflow-anchor:none` + 最底下永遠有一條固定高度的版本列。
       編修框長高時瀏覽器會一直重選捲動錨點,Mac 上的捲軸滑塊就會瘋狂跳。
     ・看板裡面不要有第二層捲軸(用 overflow:clip,不是 hidden)。
   ============================================================ */
const 封存區 = "Archive";
/* 全新的看板檔案先開好這五區。名字就是 1~5 —— 檔案裡的 `## 標題` 本來就該是中性的,
   要叫什麼在設定裡改「圓點裡的字」就好,不必去動 Markdown。 */
const 預設分區 = ["1", "2", "3", "4", "5"];
const 露幾則留言 = 2;      // 平常只露這麼多則,其餘收起來
const 週字 = ["日", "一", "二", "三", "四", "五", "六"];
/* 尺寸都從調校台調過來(260911v1):
     日期欄 112→110 ‧ 分類欄 78→72 ‧ 統計格 96→98 ‧ 格高 68→60
     動作留寬 150→145 ‧ 主題膠囊 22→24 ‧ 留言露 3→2 則 ‧ 反悔 3→2 秒 */
const 格寬 = 98, 格高 = 60, 年格寬 = 98;
const 日期欄寬 = 110, 分類欄寬 = 72, 主題高 = 24;
// 內容第一行右邊只剩一顆「編輯」,不用再留 145px
const 動作留寬 = 62;
const 反悔毫秒 = 2000;
// ⚠ 最新版把「本日」獨立成一欄(整欄就它一列,所以垂直置中、字最大),
//   本周 / 本月 才疊在下一欄各佔一半高 —— 這樣整條只要兩列就夠,比三列疊矮。
//   舊版是三層疊在同一欄,不要再做回去。
const 日格寬 = 98, 週月格寬 = 118;
const 完成色 = "var(--color-green, #3aa76d)";

function st(el, css) { el.style.cssText = css; return el; }

/* ============================================================
   圖示 —— 0.9.0 起全部走 Obsidian 內建的那一套 Lucide
   ------------------------------------------------------------
   以前是散在各處的 emoji 和文字符號(✎ 🗄 🔁 ⋯),問題有三個:
     ① 每個平台長得不一樣,Windows 的 emoji 又大又花
     ② ✎ 同時當「編輯主題」和「最後編修時間」,看起來一模一樣
     ③ 沒辦法跟著主題的文字顏色走
   Obsidian 本來就打包了 Lucide,用 setIcon 拿就好 —— 不要自己畫 SVG 路徑。
   ⚠ 但舊版 Obsidian 可能沒有某幾顆比較新的圖示(例如 circle-dot),
     所以 圖() 拿完會檢查有沒有真的畫出東西,沒有就退回一顆自己畫的備胎。
   ============================================================ */
const 備胎圖 = {
  "circle-dot": '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none"/>',
  "square-pen": '<path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7"/><path d="M18.4 2.6a2 2 0 0 1 2.8 2.8L12 14.6l-3.6.9.9-3.6z"/>',
  "ellipsis": '<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  "archive": '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/>',
  "message-square": '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  "check": '<path d="M20 6 9 17l-5-5"/>',
  "pin": '<path d="M12 17v5"/><path d="M9 10.8V4h6v6.8l2.4 3.2H6.6z"/>',
  "trash-2": '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-14"/>',
  "calendar-days": '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  "file-text": '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  "search": '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  "x": '<path d="M18 6 6 18M6 6l12 12"/>',
  "plus": '<path d="M12 5v14M5 12h14"/>',
  "list": '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  "download": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
  "git-merge": '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 9v12"/><path d="M21 18h-3a9 9 0 0 1-9-9"/>',
  "chevrons-up-down": '<path d="m7 15 5 5 5-5M7 9l5-5 5 5"/>',
  "chevrons-down-up": '<path d="m7 20 5-5 5 5M7 4l5 5 5-5"/>',
  "image": '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1.6"/><path d="m21 15-5-5L5 21"/>',
  "printer": '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
  "folder": '<path d="M4 20a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2z"/>',
  "rotate-ccw": '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  "archive-restore": '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h3"/><path d="M20 8v11a2 2 0 0 1-2 2h-3"/><path d="M12 19v-7"/><path d="M9 15l3-3 3 3"/>',
  "pencil": '<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/><path d="m15 5 4 4"/>'
};

/* 在一顆已經 st() 好的按鈕裡塞「圖示 + 文字」。
   ⚠ 一定要在 st() **之後**呼叫 —— st 是整個覆寫 cssText,
     先呼叫的話 display:inline-flex 會被清掉,圖示和文字就上下錯位。 */
/* ⚠⚠ 卡片上的動作鈕故意**不用 <button>**。
   踩了兩次的坑:Obsidian 的主題對 button 有自己的一整套規則 ——
   背景色、背景漸層、box-shadow、還有它自己的圓角變數。我們寫 border-radius:10px,
   它的 hover 底色卻用主題的圓角去畫,於是滑過去的瞬間底色會從膠囊兩端的角落溢出來。
   用 !important 一條一條壓得沒完沒了(壓了 radius 還有 background-image、還有 box-shadow),
   換成 div + role="button" 就一勞永逸:主題的 button 規則根本碰不到它,
   長相完全由我們自己決定,鍵盤和無障礙也照顧到了。 */
function 膠囊(容器, 文) {
  const b = 容器.createDiv();
  b.addClass("tk-膠囊");
  b.setAttribute("role", "button");
  b.setAttribute("tabindex", "0");
  if (文) b.setText(文);
  b.onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " " || e.code === "Space") {
      e.preventDefault();
      if (typeof b.onclick === "function") b.onclick(e);
    }
  };
  // div 沒有 disabled,但「按下去之後不要再按第二次」還是要有
  b.鎖住 = (字) => {
    b.__鎖 = true;
    b.style.pointerEvents = "none";
    b.style.opacity = "0.6";
    if (字 !== undefined) b.setText(字);
  };
  return b;
}

/* ---- 行內 Markdown 快捷鍵 ----
   跟 Obsidian 一樣是 toggle:選起來按第二次會把記號拆掉。
   ⚠ 一定要 preventDefault + stopImmediatePropagation —— 不然 Obsidian 自己的
     Ctrl+B / Ctrl+K 也會收到同一個按鍵,結果變成「粗體記號插了兩次」或跳出它的連結視窗。 */
function 包起來(ta, 左, 右) {
  const a = ta.selectionStart, b = ta.selectionEnd;
  const 選 = ta.value.slice(a, b);
  const 前 = ta.value.slice(0, a), 後 = ta.value.slice(b);
  if (前.slice(-左.length) === 左 && 後.slice(0, 右.length) === 右) {      // 記號在選取範圍外面
    ta.value = 前.slice(0, 前.length - 左.length) + 選 + 後.slice(右.length);
    ta.selectionStart = a - 左.length; ta.selectionEnd = b - 左.length;
    return;
  }
  if (選.length >= 左.length + 右.length &&
      選.slice(0, 左.length) === 左 && 選.slice(-右.length) === 右) {      // 記號被一起選起來了
    const 內 = 選.slice(左.length, 選.length - 右.length);
    ta.value = 前 + 內 + 後;
    ta.selectionStart = a; ta.selectionEnd = a + 內.length;
    return;
  }
  ta.value = 前 + 左 + 選 + 右 + 後;
  if (a === b) { ta.selectionStart = ta.selectionEnd = a + 左.length; }     // 沒選字就把游標放中間
  else { ta.selectionStart = a + 左.length; ta.selectionEnd = b + 左.length; }
}
/* ⚠⚠⚠ 這裡錯過兩次,把原因寫死在這裡免得再犯。
   要判斷「使用者按的是哪一顆鍵」,一定要用 **e.code**(實體鍵位),不可以用 e.key。
   e.key 給的是「這一下**打出什麼字**」,那會被輸入法和鍵盤配置改掉 ——
   注音輸入法開著的時候,同一顆 B 鍵給出來的 e.key 可能是 "Process"、
   可能是注音符號、也可能 keyCode 變成 229。於是 `e.key === "b"` 永遠不成立,
   快捷鍵在中文使用者身上就是「完全沒反應」。
   e.code 是實體鍵位("KeyB"),不管什麼輸入法、什麼語言都一樣。
   同理:**不可以**因為 keyCode === 229 就直接 return —— 那是給「正在拼字」用的判斷,
   按著 Ctrl 的組合鍵不是在拼字。只擋 e.isComposing 就好。 */
const md快捷 = [
  ["KeyB", false, "**", "**"],
  ["KeyI", false, "*", "*"],
  ["KeyK", false, "[[", "]]"],
  ["KeyH", true, "==", "=="],
  ["KeyE", true, "`", "`"],
  ["KeyX", true, "~~", "~~"]
];
function 處理md快捷(e) {
  const ta = e.target;
  if (!ta || !ta.classList || !ta.classList.contains("tk-md")) return;
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
  if (e.isComposing) return;
  if (e.__cjb已處理) return;                 // 兩層監聽器都收到同一個事件時只做一次
  const code = String(e.code || "");
  const 中 = md快捷.find(x => x[0] === code && !!x[1] === !!e.shiftKey);
  if (!中) return;
  e.__cjb已處理 = true;
  e.preventDefault();
  e.stopPropagation();
  if (e.stopImmediatePropagation) e.stopImmediatePropagation();
  包起來(ta, 中[2], 中[3]);
  if (ta.__md後) ta.__md後();
}
/* 掛兩層:
     ① window 的捕獲階段(在 onOpen 掛一次)—— 這是整條事件路徑的第一站,
        排在 Obsidian 自己那層 document 處理之前。
     ② 輸入框自己再掛一次 —— 萬一某個版本的 Obsidian 在 window 更早的地方就攔掉了,
        至少事件走到輸入框的時候還有一次機會。
   兩層都收到就靠 e.__cjb已處理 擋掉第二次。 */
function 掛md快捷(ta, 之後) {
  ta.addClass("tk-md");
  ta.__md後 = 之後 || null;
  ta.addEventListener("keydown", 處理md快捷, true);
}

/* 量出「游標那一行」在 textarea 裡的 y。
   ⚠ 不能用「行數 × 行高」算 —— 一行太長會自動折行,算出來會愈差愈多。
     所以做一個看不見的鏡子 div,同樣的寬度和字體,把游標前面的字倒進去,
     再量最後那個零寬字元的位置。這是唯一會把折行算對的做法。 */
let 鏡子 = null;
function 量游標(ta) {
  if (!鏡子 || !鏡子.isConnected) {
    鏡子 = document.body.createDiv();
    鏡子.addClass("tk-鏡");
  }
  const cs = window.getComputedStyle(ta);
  鏡子.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;" +
    "left:-99999px;top:0;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;" +
    "box-sizing:border-box;width:" + ta.clientWidth + "px;" +
    "padding:" + cs.paddingTop + " " + cs.paddingRight + " " + cs.paddingBottom + " " + cs.paddingLeft + ";" +
    "font-family:" + cs.fontFamily + ";font-size:" + cs.fontSize + ";font-weight:" + cs.fontWeight + ";" +
    "line-height:" + cs.lineHeight + ";letter-spacing:" + cs.letterSpacing + ";";
  鏡子.empty();
  鏡子.createSpan({ text: ta.value.slice(0, ta.selectionStart) });
  const 點 = 鏡子.createSpan({ text: "​" });
  const y = 點.offsetTop;
  const h = parseFloat(cs.lineHeight) || 20;
  return { y: y, 行高: h };
}

function 圖鈕(鈕, 名, 文, 大小) {
  鈕.empty();
  鈕.style.display = "inline-flex";
  鈕.style.alignItems = "center";
  鈕.style.justifyContent = "center";
  鈕.style.gap = "4px";
  圖(鈕, 名, 大小 || 13);
  if (文) 鈕.createSpan({ text: 文 });
  return 鈕;
}
/* 畫一顆圖示。回傳那個 span,呼叫端可以再改大小/顏色。 */
function 圖(容器, 名, 大小, 色) {
  const sp = 容器.createSpan();
  sp.addClass("cjb-ico");
  try { setIcon(sp, 名); } catch (e) {}
  const 有 = sp.querySelector("svg");
  if (!有) {
    // Obsidian 沒有這顆 → 用備胎(一樣是 24 格、一樣的線寬,看起來才是同一套)
    const d = 備胎圖[名];
    if (d) sp.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ' +
      'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" ' +
      'stroke-linejoin="round" class="svg-icon">' + d + '</svg>';
  }
  const px = 大小 || 14;
  st(sp, "display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;" +
    "width:" + px + "px;height:" + px + "px;line-height:0;" + (色 ? "color:" + 色 + ";" : ""));
  const sv = sp.querySelector("svg");
  if (sv) {
    sv.setAttribute("width", String(px));
    sv.setAttribute("height", String(px));
    sv.style.width = px + "px"; sv.style.height = px + "px";
    // ⚠ 線寬統一 1.75 —— Obsidian 預設會跟著主題變,同一列裡粗細不一樣很明顯
    sv.setAttribute("stroke-width", "1.75");
  }
  return sp;
}

/* ---- 中文輸入法 ----
   注音/倉頡選字時,Chromium 會把按鍵報成 e.key = "Process"、keyCode = 229,
   光看 e.key 抓不到 Enter。e.code 不受輸入法影響,拿它當備援才可靠。 */
function 是Enter鍵(e) {
  return e.key === "Enter" || e.code === "Enter" || e.code === "NumpadEnter" || e.keyCode === 13;
}

/* ---- 動畫 ----
   ⚠ 規矩(準則第五章):
     ・只用在「內容量真的變了」的地方 —— 展開、收合。
       **換模式(進出編輯)一律不做高度動畫**:文字本來就在原地,硬加一段除了多餘,
       還會因為高度在動而讓外層捲軸出現/消失,長行重折,看起來就是左右抖。
     ・差不到 10px 就別動畫,硬要動反而看得出來在抖。
     ・高度一律取整數 —— 使用者的縮放常常不是 100%,小數高度會讓字一直在小數點上跳。
     ・時間跟著「差多少」走,不要固定秒數。
     ・動畫期間把寬度鎖成當下的 px,結束再放開(高度一變捲軸可能出現,容器變窄就重折)。
     ・留一顆開關給使用者,而且吃 prefers-reduced-motion。 */
let 要動畫 = () => true;
function 鎖寬(節點) {
  try {
    const w = Math.round(節點.getBoundingClientRect().width);
    if (w > 0) { 節點.__鎖寬 = true; 節點.style.width = w + "px"; }
  } catch (e) {}
}
function 放寬(節點) {
  try { if (節點 && 節點.__鎖寬) { 節點.style.width = ""; delete 節點.__鎖寬; } } catch (e) {}
}
function 滑順(元素, 收, 立刻) {
  if (!元素) return;
  if (!要動畫()) 立刻 = true;
  try { clearTimeout(元素.__收時); } catch (e) {}
  // clip 而不是 hidden:hidden 在規範上仍然是捲動容器,mac 勾了「總是顯示捲軸」就會冒出來
  元素.style.overflow = "clip";
  if (立刻) {
    元素.style.transition = "";
    元素.style.display = 收 ? "none" : "";
    元素.style.maxHeight = 收 ? "0px" : "none";
    元素.style.opacity = 收 ? "0" : "1";
    return;
  }
  元素.style.transition = "max-height .26s cubic-bezier(.4,0,.2,1),opacity .18s ease";
  鎖寬(元素);
  setTimeout(() => 放寬(元素), 320);
  if (收) {
    元素.style.display = "";
    元素.style.maxHeight = Math.ceil(元素.scrollHeight) + "px";
    void 元素.offsetHeight;                     // 先讓瀏覽器認得起點,不然會直接跳到 0
    元素.style.maxHeight = "0px";
    元素.style.opacity = "0";
    元素.__收時 = setTimeout(() => { 元素.style.display = "none"; }, 280);
  } else {
    元素.style.display = "";
    元素.style.maxHeight = "0px";
    元素.style.opacity = "0";
    void 元素.offsetHeight;
    元素.style.maxHeight = Math.ceil(元素.scrollHeight) + "px";
    元素.style.opacity = "1";
    元素.__收時 = setTimeout(() => { 元素.style.maxHeight = "none"; }, 280);
  }
}
/* 一塊本來不存在的東西長出來:從「起點高度」滑到「該有的高度」。
   起 不給 = 從 0 長出來;起 給一個高度 = 原地長大。 */
function 滑開(節點, 起) {
  if (!節點) return;
  if (!要動畫()) { 節點.style.height = "auto"; 節點.style.opacity = "1"; return; }
  try {
    const 目標 = Math.ceil(節點.scrollHeight);
    const 從 = Math.round((起 === undefined || 起 === null) ? 0 : 起);
    if (Math.abs(目標 - 從) < 10) { 節點.style.height = "auto"; 節點.style.opacity = "1"; return; }
    鎖寬(節點);
    const 秒 = Math.min(0.34, 0.14 + Math.abs(目標 - 從) / 900);
    節點.style.overflow = "clip";
    節點.style.height = 從 + "px";
    節點.style.opacity = 從 ? "1" : "0.35";
    void 節點.offsetHeight;
    節點.style.transition = "height " + 秒.toFixed(3) +
      "s cubic-bezier(.22,.61,.36,1),opacity .16s ease";
    節點.style.height = 目標 + "px";
    節點.style.opacity = "1";
    setTimeout(() => {
      節點.style.height = "auto"; 節點.style.overflow = ""; 節點.style.transition = "";
      放寬(節點);
    }, 秒 * 1000 + 40);
  } catch (e) {}
}

/* ---- 內文裡的 [[筆記連結]] 和網址 ----
   把一行字畫進容器,遇到 [[名稱]] 就畫成真的可以點的 Obsidian 連結,
   遇到 http(s):// 就畫成外部連結。其餘照原樣是純文字。 */
/* ---- 行內 Markdown ----
   1.0 新增。以前只認得 [[筆記]] 和網址,其他一律當純文字 ——
   卡片裡寫 **賽速安** 就真的顯示三顆星號,很醜也很難讀。
   現在一次掃過去,認這幾種:
     [[筆記]] / [[筆記|顯示]] ‧ http(s):// ‧ `程式碼` ‧ **粗體** ‧ *斜體* ‧ ==highlight== ‧ ~~刪除線~~
   ⚠ 故意**不**做 _底線斜體_:農藥的品名和檔名常常有底線
     (chlorantraniliprole_20SC),做了會整串變斜體。
   ⚠ 順序有意義:`程式碼` 要排在粗體斜體前面,
     這樣 `**不是粗體**` 寫在反引號裡就會原樣顯示。
   ⚠ 粗體/斜體/highlight 裡面會遞迴再畫一次,所以 **[[筆記]]** 這種也點得動;
     限制三層,避免惡意或手滑寫出無限巢狀。 */
const 連結Re = /(\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\])|(https?:\/\/[^\s<>"'）)]+)/g;
const 行內Re = new RegExp([
  "(\\[\\[[^\\]|\\n]+(?:\\|[^\\]\\n]+)?\\]\\])",   // 1 [[筆記]]
  "(https?:\\/\\/[^\\s<>\"'）)]+)",                 // 2 網址
  "(`[^`\\n]+`)",                                  // 3 `程式碼`
  "(\\*\\*[^*\\n]+\\*\\*)",                        // 4 **粗體**
  "(==[^=\\n]+==)",                                // 5 ==highlight==
  "(~~[^~\\n]+~~)",                                // 6 ~~刪除線~~
  "(\\*[^*\\n]+\\*)"                               // 7 *斜體*
].join("|"), "g");

function 畫連結(容器, 原, app, 來源檔) {
  連結Re.lastIndex = 0;
  const m = 連結Re.exec(原);
  if (!m) { 容器.createSpan({ text: 原 }); return; }
  if (m[1]) {
    const 目標 = String(m[2] || "").trim();
    const 顯 = String(m[3] || 目標).trim();
    const a = 容器.createEl("a", { text: 顯 });
    a.addClass("internal-link");
    a.style.cursor = "pointer";
    a.title = 目標;
    a.onclick = (e) => {
      e.preventDefault(); e.stopPropagation();
      try { app.workspace.openLinkText(目標, 來源檔 || "", e.metaKey || e.ctrlKey); } catch (x) {}
    };
  } else {
    const a = 容器.createEl("a", { text: m[4] });
    a.addClass("external-link");
    a.setAttribute("href", m[4]);
    a.onclick = (e) => e.stopPropagation();
  }
}

function 畫文字(容器, 文, app, 來源檔, 深) {
  const s = String(文 || "");
  const 層 = 深 || 0;
  const re = new RegExp(行內Re.source, "g");
  let 位 = 0, m;
  while ((m = re.exec(s)) !== null) {
    if (m.index > 位) 容器.createSpan({ text: s.slice(位, m.index) });
    const 全 = m[0];
    if (m[1] || m[2]) {
      畫連結(容器, 全, app, 來源檔);
    } else if (m[3]) {
      const c = 容器.createSpan({ text: 全.slice(1, -1) });
      c.addClass("cjb-code");
    } else if (m[4]) {
      const b = 容器.createEl("strong");
      if (層 < 3) 畫文字(b, 全.slice(2, -2), app, 來源檔, 層 + 1);
      else b.setText(全.slice(2, -2));
    } else if (m[5]) {
      const h = 容器.createEl("mark");
      h.addClass("cjb-mark");
      if (層 < 3) 畫文字(h, 全.slice(2, -2), app, 來源檔, 層 + 1);
      else h.setText(全.slice(2, -2));
    } else if (m[6]) {
      const d = 容器.createEl("del");
      d.addClass("cjb-del");
      if (層 < 3) 畫文字(d, 全.slice(2, -2), app, 來源檔, 層 + 1);
      else d.setText(全.slice(2, -2));
    } else {
      const i = 容器.createEl("em");
      if (層 < 3) 畫文字(i, 全.slice(1, -1), app, 來源檔, 層 + 1);
      else i.setText(全.slice(1, -1));
    }
    位 = m.index + 全.length;
  }
  if (位 < s.length) 容器.createSpan({ text: s.slice(位) });
  return 容器;
}
// 主題膠囊:淡淡的分類底色 + 分類色的字(常用主題那排鈕也是同一個樣子)
function 清掉落點線() {
  try {
    document.querySelectorAll(".tk-board tbody tr").forEach(x => { x.style.boxShadow = ""; });
  } catch (e) {}
}
function 分類樣式類(色) {
  return "padding:1px 9px;border-radius:11px;white-space:nowrap;" +
    "color:" + 色 + ";background:" + 透明(色, 0.16) + ";";
}
function 透明(hex, a) {
  const h = String(hex).replace("#", "");
  const 六 = h.length === 3 ? h.split("").map(x => x + x).join("") : h;
  const n = parseInt(六, 16) || 0;
  return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
}
function 短日(d) {
  const p = String(d || "").split("-");
  return p.length > 2 ? (Number(p[1]) + "/" + Number(p[2])) : String(d || "");
}
function 加日(基, n) {
  const d = new Date(基 + "T00:00:00"); d.setDate(d.getDate() + n); return 日字(d);
}
function 週一的(基) {
  const d = new Date(基 + "T00:00:00"); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return 日字(d);
}

class 看板視圖 extends TextFileView {
  constructor(leaf, 插件) {
    super(leaf);
    this.插件 = 插件;
    this.T = 語();
    this.內文 = "";
    const d = new Date(), 今 = 日字(d);
    this.狀態 = {
      篩: { 型: 插件.設定.預設範圍 || "今日" },   // 型: 今日/7天內/本月/年度/範圍/全部/逾期/未排期/封存
      起: null, 迄: null, 來源: null,
      統計年: String(d.getFullYear()),
      偏移: {},                       // { 今日: -1 } = 往前走了一天
      開行事曆: false, 顯示月: 日字(d).slice(0, 7),
      選起: null, 選迄: null,
      指派: null, 主題: null, 搜尋: "",
      編修: null, 寫留言: null, 改留: null, 管人開: false,
      展開: {}, 展開全部: false, 留言展開: {},
      融合中: false, 融合選: {},
      新主題: "", 新內容: "", 新分類: null, 新指派: null
    };
    this.今 = 今;
  }
  getViewType() { return 視圖種類; }
  getIcon() { return "layout-list"; }
  getDisplayText() { return this.file ? this.file.basename : this.T.board; }
  getViewData() { return this.內文; }
  setViewData(data, clear) {
    this.內文 = data || "";
    if (clear) { this.狀態.編修 = null; this.狀態.改留 = null; }
    /* ⚠⚠ 隨打隨存的關鍵一步。我們自己寫檔之後 Obsidian 會回頭呼叫這裡,
       照原樣重畫就等於把正在打字的 textarea 砍掉重建 —— 游標歸零、注音打到一半的字消失。
       所以自動存的那一下會先設一個很短的「略過到」時窗,只更新內文、不重畫。
       ⚠ 一定要有時間上限,不能只用一個布林旗子:萬一 setViewData 沒來,
         旗子會一直留著,之後別台電腦同步過來的真正變更就被吃掉了。 */
    if (this.狀態.編修 && this.略過到 && Date.now() < this.略過到) return;
    this.畫();
    this.開分區如果是新的();
  }
  clear() { this.內文 = ""; }
  /* ⚠⚠⚠ 這一個 override 是 1.1 最重要的安全鎖,不要拿掉。
     TextFileView 的預設行為是「關分頁 / 換檔案 / 定時存檔時,
     把 getViewData() 寫回檔案」。但這個看板**從來不用視圖的資料寫檔** ——
     所有修改都是寫手直接對 vault 做原子讀改寫。
     兩邊並存的話,只要 this.內文 比檔案舊一點(我們剛寫完、setViewData 還沒回來,
     或 Obsidian Sync 剛拉到新內容),那一次自動存檔就會拿舊的整份文字蓋掉檔案 ——
     看起來就是「剛剛打的東西不見了」「被搬走的卡片又冒出來一張」。
     所以這裡直接不存:沒有第二個人寫這個檔案,就沒有這一類的災難。 */
  async save(要清空) { if (要清空) this.clear(); }
  async onOpen() {
    this.contentEl.addClass("tk-board");
    /* ⚠ 一定要 window + 捕獲階段(第三個參數 true)—— 理由寫在 處理md快捷() 上面。
       registerDomEvent 會在視圖關掉時自動拆掉,不會留下孤兒監聽器。 */
    this.registerDomEvent(window, "keydown", 處理md快捷, true);
    /* 編輯到一半去點別的地方 = 這一段寫完了。
       ⚠ 用 mousedown 不是 click:click 要等放開,中間畫面已經重畫過一輪了。
       ⚠ 要排除編修框自己、動作鈕、還有浮在 body 上的面板(日期、循環、色盤)——
         點那些是「還在編輯的一部分」,不是離開。 */
    this.registerDomEvent(document, "mousedown", (e) => {
      if (!this.狀態.編修 || !this.編修卡) return;
      const t = e.target;
      if (!t || !t.closest) return;
      if (t.closest(".tk-編框") || t.closest(".tk-動作")) return;
      if (t.closest(".tk-分類挑,.tk-分類設定,.menu,.suggestion-container")) return;
      if (t.closest("body > div[style*=\"position:fixed\"]")) return;
      const k = this.編修卡;
      this.完成編輯(k);
    }, true);
  }
  /* 全新的看板檔案(一個 `## 標題` 都沒有)先把五個分區開好。
     ⚠ 沒有分區的話,新增的卡片會被塞到檔案最後面自己長出來的標題底下,
       使用者看到的是一個空白看板加一個莫名其妙的區名。
     ⚠ 每個檔案只做一次(已開分區 記住是哪個檔),寫完 setViewData 會再進來一次,
       那時候標題已經存在,開好分區() 自己也會判斷有標題就不動。 */
  開分區如果是新的() {
    if (!this.file) return;
    if (this.分類清單.length) return;
    if (this.已開分區 === this.file.path) return;
    this.已開分區 = this.file.path;
    this.插件.寫手.開好分區(this.file, 預設分區.slice()).then(ok => {
      if (ok) new Notice(this.T.boardReady);
    });
  }
  async onClose() { this.contentEl.empty(); }

  get 名單() { return this.插件.設定.指派人 || []; }
  get 卡片() { return 解析卡片(this.內文, this.名單); }
  get 分類清單() {
    const 出 = [];
    String(this.內文 || "").split("\n").forEach(t => {
      const h = 標題Re.exec(t);
      if (h) { const n = h[1].trim(); if (n && 出.indexOf(n) < 0) 出.push(n); }
    });
    return 出;
  }
  我是誰() { const n = 讀我是誰(); return (n && this.名單.indexOf(n) >= 0) ? n : null; }
  是封存(k) { return /archive|封存/i.test(k.分類); }
  是逾期(k) { return !!k.起日 && k.迄日 < this.今 && !k.完成; }

  /* ---- 篩選 ---- */
  現在區間() {
    const s = this.狀態, f = s.篩 || {};
    const 偏 = (鍵) => s.偏移[鍵] || 0;
    if (f.型 === "範圍") {
      if (s.起) return [s.起, s.迄 || s.起];
      // 保險:起迄不知怎麼掉了,就照「來源那一層 + 走了幾格」重算一次,
      // 不然會整個掉回「全部」—— 使用者會以為篩選壞了
      const 回 = { "今日": (n) => { const d = 加日(this.今, n); return [d, d]; },
        "7天內": (n) => { const a = 加日(週一的(this.今), n * 7); return [a, 加日(a, 6)]; },
        "本月": (n) => {
          const b = new Date(this.今 + "T00:00:00");
          const m = new Date(b.getFullYear(), b.getMonth() + n, 1);
          return [日字(m), 日字(new Date(m.getFullYear(), m.getMonth() + 1, 0))];
        } }[f.來源];
      return 回 ? 回(偏(f.來源)) : null;
    }
    if (f.型 === "今日") { const d = 加日(this.今, 偏("今日")); return [d, d]; }
    if (f.型 === "7天內") {
      const a = 加日(週一的(this.今), 偏("7天內") * 7);
      return [a, 加日(a, 6)];
    }
    if (f.型 === "本月") {
      const b = new Date(this.今 + "T00:00:00");
      const m = new Date(b.getFullYear(), b.getMonth() + 偏("本月"), 1);
      return [日字(m), 日字(new Date(m.getFullYear(), m.getMonth() + 1, 0))];
    }
    if (f.型 === "年度") return [s.統計年 + "-01-01", s.統計年 + "-12-31"];
    return null;
  }
  // 「合顯示」= 這張卡片在現在的篩選底下算不算數(統計數字和清單用同一套,才不會對不上)
  // 一組關鍵字:拆成幾個字,每一個都要出現(順序不拘)
  拆詞(文) {
    return String(文 || "").trim().toLowerCase().split(/[\s,、，]+/).filter(Boolean);
  }
  中幾個(詞們, 文) {
    if (!詞們.length) return null;              // null = 這一組沒有打字
    const t = String(文 || "").toLowerCase();
    return 詞們.every(w => t.indexOf(w) >= 0);
  }
  搜尋分數(k) {
    const s = this.狀態;
    const 題詞 = this.拆詞(s.新主題), 文詞 = this.拆詞(s.新內容);
    if (!題詞.length && !文詞.length) return 0;
    const 主題 = String(k.主題 || "").toLowerCase();
    const 全文 = (k.主題 + " " + k.分類 + " " + (k.指派 || "") + " " +
      k.內容行.join(" ") + " " + k.留言.map(c => c.文).join(" ")).toLowerCase();
    // 每一組都要命中(主題或內容任一邊算命中)
    if (題詞.length && !this.中幾個(題詞, 全文)) return -1;
    if (文詞.length && !this.中幾個(文詞, 全文)) return -1;
    // 命中了,再算相關性:主題也對上就加分,兩組都有更高
    let 分 = 1;
    if (題詞.length && this.中幾個(題詞, 主題)) 分 += 4;
    if (文詞.length && this.中幾個(文詞, 主題)) 分 += 2;
    if (題詞.length && 文詞.length) 分 += 2;
    if (主題 && 題詞.length && 主題 === 題詞.join(" ")) 分 += 3;   // 完全等於主題最高
    return 分;
  }
  基底(全) {
    const s = this.狀態;
    return 全.filter(k => {
      if (s.指派 && k.指派 !== s.指派) return false;
      if (s.搜尋) { k.__分 = this.搜尋分數(k); if (k.__分 < 0) return false; }
      else k.__分 = 0;
      return true;
    });
  }
  /* 「顯示」三開關:封存要不要算、做完的要不要算。跟原版的 合顯示 同一套 ——
     清單、統計數字、行事曆的點都走這個,兩邊才不會對不上。 */
  合顯示(k) {
    const 設 = this.插件.設定.排程顯示 || {};
    if (this.是封存(k) && !設.封存) return false;
    return k.完成 ? !!設.完成 : !!設.未完成;
  }
  // 有寫日期(或標了 #長期)的才進得了主清單;兩者都沒有的走底下那張「未寫日期」表
  合日期(k) { return !!k.起日 || !!k.長期; }
  清單池(全) { return this.基底(全).filter(k => this.合顯示(k) && this.合日期(k)); }
  活的(全) { return this.清單池(全); }
  過濾(全) {
    const s = this.狀態, f = s.篩 || {};
    const 區 = this.現在區間();
    return this.清單池(全).filter(k => {
      // ⚠ 置頂 = 「我要一直看到它」,所以不受日期篩選影響,永遠在清單裡、永遠在最上面。
      //   (搜尋和指派人篩選還是會作用 —— 那是你主動在找東西。)
      if (k.置頂 && f.型 !== "長期") return true;
      if (f.型 === "全部") return true;
      if (f.型 === "逾期") return this.是逾期(k);
      if (f.型 === "長期") return !!k.長期;
      if (!區) return true;
      if (!k.起日) return false;
      return !(k.迄日 < 區[0] || k.起日 > 區[1]);
    }).sort((a, b) => this.比大小(a, b));
  }
  /* 排序:置頂永遠在最上面,做完的沉到最下面,剩下的照選的模式。
       編修(預設)= 最近新增或編修的排最上面。時間取自卡片自己的 `✎{}` 標記,
                   所以換一台電腦、換一支手機看到的順序都一樣。
       顏色       = 日期 → 分類順序(照卡片日誌裡標題的先後)→ 最近編修 */
  比大小(a, b) {
    // 有在搜尋的時候,相關性最優先(兩組都中、主題也對上的排最上面)
    if (this.搜尋中() && (a.__分 || 0) !== (b.__分 || 0)) return (b.__分 || 0) - (a.__分 || 0);
    if (a.置頂 !== b.置頂) return a.置頂 ? -1 : 1;
    if (a.完成 !== b.完成) return a.完成 ? 1 : -1;
    // 檔案順序:照卡片在檔案裡的先後,不再重排 —— 這樣拖曳排序才有意義
    if (this.插件.設定.排序 === "檔案") return (a.起 || 0) - (b.起 || 0);
    if ((this.插件.設定.排序 || "編修") === "編修") {
      const t = String(b.編修時 || "").localeCompare(String(a.編修時 || ""));
      if (t) return t;
      return String(a.起日 || "9999").localeCompare(String(b.起日 || "9999"));
    }
    const d = String(a.起日 || "9999").localeCompare(String(b.起日 || "9999"));
    if (d) return d;
    const c = this.插件.分類序序號(a.分類) - this.插件.分類序序號(b.分類);
    if (c) return c;
    return String(b.編修時 || "").localeCompare(String(a.編修時 || ""));
  }

  區間張數(全, a, b) {
    return this.清單池(全).filter(k => k.起日 && !(k.迄日 < a || k.起日 > b)).length;
  }
  // 底下那張「未寫日期」表:沒有日期、也沒標 #長期 的卡片
  未寫日期(全) {
    return this.基底(全).filter(k => !k.起日 && !k.長期 && this.合顯示(k));
  }

  /* ============================================================
     畫 —— 分區重畫
     ------------------------------------------------------------
     ⚠ 為什麼要分區:整個看板重畫會把「主題 / 內容」那兩個輸入框整個換掉,
       游標和正在打的字就沒了 —— 打一個字被打斷一次,根本沒辦法連續打。
       所以搜尋只重畫「清單」那一塊,新增區完全不碰。
       (原版就是這樣:搜尋變動 → 重畫回顧(),不動別的。)
     ============================================================ */
  建殼() {
    const 根 = this.contentEl;
    根.empty();
    /* ⚠⚠ 捲動 —— 這裡踩過兩次,原因寫清楚:
       dataviewjs 版是「外面那一層筆記」在捲,看板自己完全不捲;plugin 沒有那一層,
       所以看板自己得是那唯一的捲動容器。但光把 overflow 設好還不夠 ——
       根如果是 `display:flex; flex-direction:column`,底下每一塊都是 flex item
       (`flex-shrink:1`),而只要那一塊的 overflow 不是 visible(.tk-塊 是 clip),
       它的自動最小尺寸就掉成 0,表格被壓成剩下的高度、內容被裁掉,
       整個看板高度剛好等於容器高度 —— 沒有東西溢出,當然捲不動。
       所以根一律 block,間距用 margin。 */
    st(根, "display:block;padding:10px 14px 0;height:100%;box-sizing:border-box;" +
      "overflow-y:scroll;overflow-x:clip;scrollbar-gutter:stable;" +
      "overflow-anchor:none;overscroll-behavior:contain;");
    this.區 = {
      衝突: 根.createDiv(),
      導覽: 根.createDiv(),
      曆: 根.createDiv(),
      新增: 根.createDiv(),
      清單: 根.createDiv(),
      未定: 根.createDiv(),
      版本: 根.createDiv()
    };
    this.區.曆.addClass("tk-空隱");
    this.區.衝突.addClass("tk-空隱");
    this.區.未定.addClass("tk-空隱");
  }

  畫() {
    if (!this.區 || !this.contentEl.contains(this.區.清單)) this.建殼();
    const 捲 = this.contentEl.scrollTop;
    const 全 = this.卡片;
    // 顏色照檔案裡標題的先後,不是照畫到的順序
    this.插件.設分類順序(this.分類清單.filter(x => !/archive|封存/i.test(x)));
    this.畫衝突提示(this.區.衝突);
    this.畫導覽列(this.區.導覽, 全);
    this.畫行事曆(this.區.曆, 全);
    this.畫新增區(this.區.新增, 全);
    this.畫清單(this.區.清單, 全);
    this.畫未定區(this.區.未定, 全);
    this.畫版本列(this.區.版本);
    this.contentEl.scrollTop = 捲;
  }

  /* 打字搜尋專用:只重畫清單,新增區那兩個輸入框完全不碰 */
  重畫清單() {
    if (!this.區) { this.畫(); return; }
    const 捲 = this.contentEl.scrollTop;
    const 全 = this.卡片;
    this.插件.設分類順序(this.分類清單.filter(x => !/archive|封存/i.test(x)));
    this.畫清單(this.區.清單, 全);
    this.畫未定區(this.區.未定, 全);
    this.畫導覽列(this.區.導覽, 全);      // 數字要跟著搜尋走,不然對不上
    this.contentEl.scrollTop = 捲;
  }
  重畫() { this.畫(); }

  畫衝突提示(根) {
    根.empty();
    if (!this.file) return;
    const 壞 = this.插件.寫手.找衝突檔(this.file);
    if (!壞.length) return;
    const 條 = 根.createDiv();
    st(條, "display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:8px;" +
      "font-size:0.84em;background:var(--background-modifier-error);color:var(--text-normal);");
    條.createSpan({ text: "⚠ " + this.T.conflict + "：" + 壞.map(f => f.name).join("、") });
    const b = 條.createEl("button", { text: "開啟" });
    b.onclick = () => this.app.workspace.getLeaf(true).openFile(壞[0]);
  }

  /* ---- ① 導覽列:深色 block,裡面一排統計格 ----
     排法完全照最新版的 日誌看板.md:
       [ 年 + 本日/本周/本月 ]  [ 全部 / 已逾期 ]  [ 長期・週期 ]  …靠右… [ 顯示 ]
     「顯示」是開關不是篩選,所以靠右分家、左邊那條也不用重點色。 */
  畫導覽列(根, 全) {
    根.empty();
    const 導 = 根.createDiv();
    導.addClass("tk-塊");
    st(導, "display:flex;flex-direction:column;gap:0;padding:7px;border-radius:10px;" +
      "background:var(--background-secondary);" +
      "border:1px solid var(--background-modifier-border);" +
      "box-shadow:inset 0 0 0 1px rgba(0,0,0,0.12);");
    const 條 = 導.createDiv();
    st(條, "display:flex;gap:4px;flex-wrap:wrap;align-items:stretch;flex:1 1 auto;");

    this.畫期間格(條, 全);
    this.畫綜合格(條, 全);
    this.統計格(條, this.T.longTerm, this.清單池(全).filter(k => k.長期).length,
      "var(--color-purple, #8a6ed4)", "長期");
    條.createDiv().addClass("tk-換行");
    this.畫顯示格(條, 全);
  }

  格子樣式(亮, 色, 底) {
    return "flex:0 0 " + 格寬 + "px;width:" + 格寬 + "px;min-width:0;min-height:" + 格高 + "px;" +
      "text-align:center;box-sizing:border-box;" +
      "padding:6px 9px;border-radius:8px;gap:2px;white-space:nowrap;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "cursor:pointer;user-select:none;transition:transform .1s ease,border-color .12s ease;" +
      "border:1px solid " + (亮 ? "var(--text-accent)" : "var(--background-modifier-border)") + ";" +
      "border-left:3px solid " + 色 + ";" +
      "background:" + (底 || "var(--background-primary)") + ";" +
      (亮 ? "box-shadow:inset 0 0 0 1px var(--text-accent);" : "");
  }
  統計格(條, 標題, 數, 色, 鍵) {
    const 亮 = (this.狀態.篩 || {}).型 === 鍵;
    const 盒 = 條.createDiv();
    盒.addClass("tk-統計格");
    st(盒, this.格子樣式(亮, 色));
    盒.title = "點一下:清單只看「" + 標題 + "」,新增的卡片也會放到這裡";
    盒.onmouseenter = () => { 盒.style.transform = "translateY(-1px)"; };
    盒.onmouseleave = () => { 盒.style.transform = ""; };
    盒.onclick = () => { this.狀態.篩 = { 型: 鍵 }; this.狀態.開行事曆 = false; this.畫(); };
    st(盒.createDiv({ text: String(數) }),
      "font-size:1.1em;font-weight:700;color:" + 色 + ";line-height:1.05;");
    st(盒.createDiv({ text: 標題 }),
      "font-size:0.72em;color:var(--text-muted);margin-top:1px;white-space:nowrap;");
    return 盒;
  }
  箭頭樣式() {
    return "flex:0 0 16px;width:16px;height:16px;padding:0;margin:0;min-height:0;" +
      "box-shadow:none;background:none;border:0;border-radius:5px;cursor:pointer;line-height:1;" +
      "font-size:0.9em;color:var(--text-faint);";
  }

  /* 期間格:左邊「年」,右邊三小層 本日/本周/本月。
     年格由上到下:那一年有幾張卡 → ◀ 年份 ▶ → 📅 行事曆
     ⚠ 上面的數字和下面的行事曆鈕**同高 18px**,中間那排「◀ 2026 ▶」才會落在正中間
       (以前年份會偏上,就是因為上下兩塊不一樣高)。
     ⚠ 點數字或點年份 = 直接看那一整年;按 ◀ ▶ 換年也是直接看那一年。
       最下面那一行才是行事曆開關。 */
  畫期間格(條, 全) {
    const T = this.T, s = this.狀態, f = s.篩 || {};
    const 時間篩 = ["今日", "7天內", "本月", "範圍", "年度"];
    const 年亮 = !!s.開行事曆 || 時間篩.indexOf(f.型) >= 0;

    const 複合格 = 條.createDiv();
    複合格.addClass("tk-統計格"); 複合格.addClass("tk-期間格");
    st(複合格, "display:flex;align-items:stretch;flex:0 0 auto;border-radius:8px;overflow:hidden;" +
      "box-sizing:border-box;max-width:100%;min-height:" + 格高 + "px;" +
      "border:1px solid " + (年亮 ? "var(--text-accent)" : "var(--background-modifier-border)") + ";" +
      "background:var(--background-primary);");

    const 年格 = 複合格.createDiv();
    st(年格, "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;" +
      "box-sizing:border-box;flex:0 0 " + 年格寬 + "px;width:" + 年格寬 + "px;min-width:0;" +
      "padding:4px 3px;user-select:none;border-left:3px solid var(--text-accent);" +
      (年亮 ? "background:var(--background-modifier-hover);box-shadow:inset 0 0 0 1px var(--text-accent);" : ""));

    const 看整年 = () => { s.篩 = { 型: "年度" }; s.開行事曆 = false; this.畫(); };
    const 換年 = (步) => {
      const y = Number(s.統計年) + 步;
      if (!(y > 1900 && y < 2200)) return;
      s.統計年 = String(y);
      s.顯示月 = s.統計年 + "-" + this.今.slice(5, 7);   // 換年保持在同一個月份
      看整年();                                  // 換年就直接看那一年
    };

    const 年數 = 年格.createDiv({
      text: String(this.清單池(全).filter(k =>
        String(k.起日 || "").slice(0, 4) === s.統計年).length)
    });
    st(年數, "font-size:1.02em;font-weight:700;color:var(--text-accent);" +
      "height:18px;line-height:18px;cursor:pointer;");
    年數.title = "看 " + s.統計年 + " 一整年";
    年數.onclick = (e) => { e.stopPropagation(); 看整年(); };

    const 年列 = 年格.createDiv();
    st(年列, "display:flex;align-items:center;justify-content:center;gap:2px;width:100%;");
    const 上年 = 年列.createEl("button", { text: "◀" });
    st(上年, this.箭頭樣式()); 上年.title = "看前一年";
    上年.onclick = (e) => { e.stopPropagation(); 換年(-1); };
    const 年字 = 年列.createEl("span", { text: s.統計年 });
    st(年字, "font-size:1.02em;font-weight:700;text-align:center;flex:0 0 44px;width:44px;" +
      "font-variant-numeric:tabular-nums;color:var(--text-muted);cursor:pointer;");
    年字.title = "看 " + s.統計年 + " 一整年";
    年字.onclick = (e) => { e.stopPropagation(); 看整年(); };
    const 下年 = 年列.createEl("button", { text: "▶" });
    st(下年, this.箭頭樣式()); 下年.title = "看後一年";
    下年.onclick = (e) => { e.stopPropagation(); 換年(1); };

    const 曆鈕 = 年格.createEl("button");
    st(曆鈕, "font-size:0.6em;height:18px;line-height:1;cursor:pointer;min-height:0;margin:0;" +
      "padding:0 6px;border-radius:6px;box-shadow:none;white-space:nowrap;" +
      (s.開行事曆
        ? "color:var(--text-on-accent, #fff);font-weight:700;" +
          "background:var(--interactive-accent, var(--text-accent));" +
          "border:1px solid var(--interactive-accent, var(--text-accent));"
        : "color:var(--text-muted);background:var(--background-secondary);" +
          "border:1px solid var(--background-modifier-border);"));
    圖鈕(曆鈕, "calendar-days", T.calendar, 11);
    曆鈕.title = s.開行事曆 ? "收起行事曆" : "打開行事曆:點一天、點起迄選一段";
    曆鈕.onclick = (e) => {
      e.stopPropagation();
      s.開行事曆 = !s.開行事曆; s.選起 = null; s.選迄 = null;
      /* ⚠ 打開行事曆一律先跳到**現在篩選的那一段所在的月份**,沒有就跳本月。
         以前是跳到統計年的一月,每次打開都要自己按好幾下 ▶ 才回到這個月。 */
      if (s.開行事曆) {
        const 區 = this.現在區間();
        s.顯示月 = (區 && 區[0]) ? 區[0].slice(0, 7) : this.今.slice(0, 7);
      }
      this.畫();
    };

    /* ⚠ 本日自己一欄(整欄就它一列,所以垂直置中、字最大);
         本周 / 本月 疊在下一欄各佔一半高。整條只要兩列高,比三列疊矮。 */
    const 小層定義 = [
      { 名: T.dayLayer, 鍵: "今日", 色: "var(--color-orange, #e08a2e)",
        區間: (n) => { const d = 加日(this.今, n); return { 起: d, 迄: d }; } },
      { 名: T.weekLayer, 鍵: "7天內", 色: "var(--color-yellow, #c99a2e)",
        區間: (n) => { const a = 加日(週一的(this.今), n * 7); return { 起: a, 迄: 加日(a, 6) }; } },
      { 名: T.monthLayer, 鍵: "本月", 色: "var(--color-cyan, #45a7bd)",
        區間: (n) => {
          const b = new Date(this.今 + "T00:00:00");
          const m = new Date(b.getFullYear(), b.getMonth() + n, 1);
          return { 起: 日字(m), 迄: 日字(new Date(m.getFullYear(), m.getMonth() + 1, 0)) };
        } }
    ];
    const 日層 = this.畫小層(複合格, 小層定義.slice(0, 1), 日格寬, 全, true, true);
    日層.style.borderLeft = "1px solid var(--background-modifier-border)";
    this.畫小層(複合格, 小層定義.slice(1), 週月格寬, 全, true, false);
  }

  /* 「全部」和「已逾期」合成同一欄、上下兩格(跟本周 / 本月同一種做法) */
  畫綜合格(條, 全) {
    const T = this.T;
    const 外 = 條.createDiv();
    外.addClass("tk-統計格");
    st(外, "display:flex;align-items:stretch;flex:0 0 auto;border-radius:8px;overflow:hidden;" +
      "box-sizing:border-box;border:1px solid var(--background-modifier-border);" +
      "border-left:3px solid var(--text-faint);background:var(--background-primary);" +
      "min-height:" + 格高 + "px;");
    this.畫小層(外, [
      { 名: T.all, 鍵: "全部", 色: "var(--text-muted)", 數: () => this.清單池(全).length },
      { 名: T.overdue, 鍵: "逾期", 色: "var(--color-red, #e05252)",
        數: () => this.清單池(全).filter(k => this.是逾期(k)).length }
    ], 格寬 - 4, 全, false, false);
  }

  /* ---- 顯示開關:未完成 / 已完成 / 含封存 ----
     排法跟「本日 / 本周 / 本月」那一格一樣,三個小層疊在同一格裡、右邊帶數字。
     ⚠ 這是開關不是篩選,所以靠右分家(margin-left:auto)、左邊那條不用重點色,
       而且打勾方塊要畫出來 —— 一眼看得出這格跟旁邊的篩選格不是同一種東西。
     ⚠ 數字跟著目前的篩選走(選本日就是本日的未完成/已完成/封存各幾張),
       不是整年度的總數,不然上面選本日、右邊卻掛著一整年的數字,對不起來。 */
  畫顯示格(條, 全) {
    const T = this.T, 設 = this.插件.設定.排程顯示;
    const 項 = [["未完成", T.showTodo, "var(--text-accent)"],
                ["完成", T.showDone, "var(--color-green, #4a9e5c)"],
                ["封存", T.showArchived, "var(--text-muted)"]];
    const 格 = 條.createDiv();
    格.addClass("tk-顯示格");
    st(格, "display:flex;align-items:stretch;flex:0 0 auto;margin-left:auto;border-radius:8px;" +
      "overflow:hidden;box-sizing:border-box;max-width:100%;min-height:" + 格高 + "px;" +
      "border:1px solid var(--background-modifier-border);" +
      "border-left:3px solid var(--background-modifier-border);background:var(--background-primary);");
    const 區 = 格.createDiv();
    st(區, "display:flex;flex-direction:column;box-sizing:border-box;flex:0 0 116px;width:116px;min-width:0;");
    項.forEach(([k, t, c], i) => {
      const 開 = !!設[k], 末 = i === 項.length - 1;
      const 列 = 區.createDiv();
      st(列, "display:flex;align-items:center;gap:6px;flex:1 1 0;min-height:23px;padding:0 8px;" +
        "cursor:pointer;user-select:none;" +
        (末 ? "" : "border-bottom:1px solid var(--background-modifier-border);") +
        (開 ? "background:var(--background-modifier-hover);" : ""));
      const 框 = 列.createDiv({ text: 開 ? "✓" : "" });
      st(框, "flex:0 0 12px;height:12px;border-radius:3px;line-height:1;font-size:9px;" +
        "display:flex;align-items:center;justify-content:center;font-weight:800;" +
        (開 ? "background:" + c + ";border:1px solid " + c + ";color:var(--background-primary);"
            : "border:1px solid var(--text-faint);color:transparent;"));
      st(列.createDiv({ text: t }),
        "flex:1 1 auto;min-width:0;font-size:0.68em;line-height:1.45;white-space:nowrap;" +
        "overflow:hidden;text-overflow:ellipsis;" +
        (開 ? "font-weight:700;color:" + c + ";" : "color:var(--text-faint);opacity:0.75;"));
      st(列.createDiv({ text: String(this.顯示數(全, k)) }),
        "flex:0 0 24px;text-align:right;font-size:0.78em;font-weight:700;line-height:1.45;" +
        "font-variant-numeric:tabular-nums;color:" + c + ";" + (開 ? "" : "opacity:0.5;"));
      列.title = (開 ? "目前有顯示" : "目前不顯示") + "「" + t +
        "」的卡片(數字是目前篩選範圍內的張數)。點一下切換";
      列.onclick = async () => {
        設[k] = !設[k];
        if (!設.未完成 && !設.完成) 設.未完成 = true;   // 兩個都關掉就什麼都看不到了
        await this.插件.存設定();
        this.畫();
      };
    });
  }
  顯示數(全, k) {
    const 池 = this.基底(全).filter(x => this.合日期(x));
    if (k === "封存") return 池.filter(x => this.是封存(x)).length;
    const 非封存 = 池.filter(x => !this.是封存(x));
    return k === "完成" ? 非封存.filter(x => x.完成).length : 非封存.filter(x => !x.完成).length;
  }

  /* 一欄裡疊好幾層  /* 一欄裡疊好幾層,每層「上:數字 下:◀ 名稱 ▶」。
     ⚠ 名字那格的寬度寫死 —— 按上一週/下一週換成日期時,兩邊的箭頭不會跟著跑。 */
  畫小層(容器, 定義們, 寬, 全, 有箭, 大) {
    const s = this.狀態, f = s.篩 || {};
    // 名字那格寬度寫死 —— 換成「9/14–9/20」這種日期也不會把左右箭頭推開
    const 標寬 = 大 ? 54 : 74;
    const 區 = 容器.createDiv();
    st(區, "display:flex;flex-direction:column;box-sizing:border-box;" +
      "flex:0 0 " + 寬 + "px;width:" + 寬 + "px;min-width:0;");
    定義們.forEach((定, i) => {
      const 末 = i === 定義們.length - 1;
      const n = 有箭 ? (s.偏移[定.鍵] || 0) : 0;
      const 亮 = f.型 === 定.鍵 || (f.型 === "範圍" && f.來源 === 定.鍵);
      const 列 = 區.createDiv();
      st(列, "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
        "gap:1px;flex:1 1 0;padding:2px 3px;cursor:pointer;user-select:none;box-sizing:border-box;" +
        (末 ? "" : "border-bottom:1px solid var(--background-modifier-border);") +
        (亮 ? "background:var(--background-modifier-hover);box-shadow:inset 0 0 0 1px var(--text-accent);" : ""));

      let 字 = 定.名, 數;
      if (定.區間) {
        const r = 定.區間(n);
        數 = this.區間張數(全, r.起, r.迄);
        if (n) 字 = 短日(r.起) + (r.迄 !== r.起 ? "–" + 短日(r.迄) : "");
        else if (亮) 字 = 短日(r.起) + (r.迄 !== r.起 ? "–" + 短日(r.迄) : "");
      } else 數 = 定.數();

      st(列.createDiv({ text: String(數) }),
        "font-size:" + (大 ? "1.1em" : "0.92em") + ";font-weight:700;line-height:1.1;" +
        "font-variant-numeric:tabular-nums;color:" + 定.色 + ";" + (亮 ? "" : "opacity:0.75;"));
      const 行 = 列.createDiv();
      st(行, "display:flex;align-items:center;justify-content:center;gap:1px;width:100%;");
      if (定.區間) {
        const 左 = 行.createEl("button", { text: "◀" });
        st(左, this.箭頭樣式()); 左.title = "往前一格";
        左.onclick = (e) => {
          e.stopPropagation();
          s.偏移[定.鍵] = n - 1; s.篩 = { 型: "範圍", 來源: 定.鍵 };
          const r = 定.區間(n - 1); s.起 = r.起; s.迄 = r.迄; this.畫();
        };
        const 標 = 行.createDiv({ text: 字 });
        st(標, "flex:0 0 " + 標寬 + "px;width:" + 標寬 + "px;min-width:0;text-align:center;" +
          "font-size:0.68em;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" +
          (亮 ? "font-weight:700;color:" + 定.色 + ";" : "color:var(--text-muted);"));
        const 右 = 行.createEl("button", { text: "▶" });
        st(右, this.箭頭樣式()); 右.title = "往後一格";
        右.onclick = (e) => {
          e.stopPropagation();
          s.偏移[定.鍵] = n + 1; s.篩 = { 型: "範圍", 來源: 定.鍵 };
          const r = 定.區間(n + 1); s.起 = r.起; s.迄 = r.迄; this.畫();
        };
      } else {
        st(行.createDiv({ text: 字 }),
          "flex:0 0 " + 標寬 + "px;width:" + 標寬 + "px;text-align:center;font-size:0.68em;" +
          "line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" +
          (亮 ? "font-weight:700;color:" + 定.色 + ";" : "color:var(--text-muted);"));
      }
      列.onclick = () => {
        s.偏移[定.鍵] = 0; s.篩 = { 型: 定.鍵 };
        s.統計年 = String(new Date().getFullYear());
        s.開行事曆 = false; this.畫();
      };
    });
    return 區;
  }

  /* ---- ② 行事曆:點第一下 = 起,點第二下 = 迄,選滿一段就自動收起來 ---- */
  畫行事曆(根, 全) {
    根.empty();
    if (!this.狀態.開行事曆) return;
    const T = this.T, s = this.狀態;
    const 盒 = 根.createDiv();
    盒.addClass("tk-塊");
    st(盒, "padding:9px 10px;border-radius:10px;background:var(--background-secondary);" +
      "border:1px solid var(--background-modifier-border);");

    const 頭 = 盒.createDiv();
    st(頭, "display:flex;align-items:center;gap:6px;margin-bottom:6px;");
    const 左 = 頭.createEl("button", { text: "◀" });
    st(左, this.箭頭樣式() + "width:20px;height:20px;font-size:0.62em;color:var(--text-muted);");
    左.onclick = () => { s.顯示月 = this.移月(s.顯示月, -1); this.畫(); };
    const 月字 = 頭.createDiv({ text: s.顯示月.replace("-", " / ") });
    st(月字, "flex:0 0 96px;width:96px;text-align:center;font-size:0.9em;font-weight:700;");
    const 右 = 頭.createEl("button", { text: "▶" });
    st(右, this.箭頭樣式() + "width:20px;height:20px;font-size:0.62em;color:var(--text-muted);");
    右.onclick = () => { s.顯示月 = this.移月(s.顯示月, 1); this.畫(); };
    const 提示 = 頭.createDiv({ text: s.選起 ? T.pickEnd : T.pickStart });
    st(提示, "font-size:0.72em;color:var(--text-faint);margin-left:6px;");
    const 收 = 頭.createEl("button", { text: T.close });
    st(收, "margin-left:auto;font-size:0.72em;height:22px;padding:0 10px;border-radius:6px;cursor:pointer;");
    收.onclick = () => { s.開行事曆 = false; s.選起 = null; s.選迄 = null; this.畫(); };

    const 每日 = {};
    this.清單池(全).forEach(k => {
      if (!k.起日) return;
      let d = k.起日; const 末 = k.迄日 || d;
      for (let n = 0; d && d <= 末 && n < 400; n++) { 每日[d] = (每日[d] || 0) + 1; d = 加日(d, 1); }
    });

    const 年 = Number(s.顯示月.slice(0, 4)), 月 = Number(s.顯示月.slice(5, 7)) - 1;
    const 網 = 盒.createDiv();
    st(網, "display:grid;grid-template-columns:repeat(7,1fr);gap:2px;");
    週字.forEach(w => st(網.createDiv({ text: w }),
      "font-size:0.66em;color:var(--text-faint);text-align:center;padding-bottom:2px;"));
    const 頭空 = new Date(年, 月, 1).getDay(), 天數 = new Date(年, 月 + 1, 0).getDate();
    for (let i = 0; i < 頭空; i++) 網.createDiv();
    const 區 = this.現在區間();
    for (let d = 1; d <= 天數; d++) {
      const 日 = 年 + "-" + 兩位(月 + 1) + "-" + 兩位(d);
      const n = 每日[日] || 0;
      const 在選 = s.選起 && !s.選迄 && 日 === s.選起;
      const 在區 = 區 && 日 >= 區[0] && 日 <= 區[1];
      const 格 = 網.createDiv();
      st(格, "position:relative;display:flex;flex-direction:column;align-items:center;" +
        "justify-content:center;height:34px;border-radius:6px;cursor:pointer;box-sizing:border-box;" +
        "border:1px solid " + (日 === this.今 ? "var(--text-accent)" : "transparent") + ";" +
        (在選 ? "background:var(--interactive-accent);color:var(--text-on-accent);"
              : 在區 ? "background:var(--background-modifier-hover);" : "") +
        (n ? "font-weight:700;" : "color:var(--text-faint);"));
      st(格.createDiv({ text: String(d) }), "font-size:0.76em;line-height:1;");
      if (n) st(格.createDiv({ text: String(n) }),
        "font-size:0.58em;line-height:1;margin-top:1px;opacity:0.75;");
      格.title = 日 + (n ? "  " + n + " " + T.cards : "");
      格.onclick = () => {
        if (!s.選起) { s.選起 = 日; this.畫(); return; }
        const a = s.選起 <= 日 ? s.選起 : 日, b = s.選起 <= 日 ? 日 : s.選起;
        s.篩 = { 型: "範圍", 來源: "行事曆" }; s.起 = a; s.迄 = b;
        s.選起 = null; s.開行事曆 = false; this.畫();
      };
    }
    /* 底下一行:這個月總共幾張、幾天有卡片 —— 一眼看得出這個月忙不忙 */
    let 張 = 0, 天 = 0;
    for (let d = 1; d <= 天數; d++) {
      const 日 = 年 + "-" + 兩位(月 + 1) + "-" + 兩位(d);
      if (每日[日]) { 張 += 每日[日]; 天++; }
    }
    const 腳 = 盒.createDiv();
    st(腳, "display:flex;align-items:center;gap:10px;margin-top:7px;padding-top:6px;" +
      "border-top:1px solid var(--background-modifier-border);" +
      "font-size:0.72em;color:var(--text-faint);");
    腳.createSpan({ text: T.calMonthTotal.replace("D", String(張)).replace("N", String(天)) });
    const 回 = 腳.createEl("button", { text: T.thisMonth });
    st(回, "margin-left:auto;font-size:0.9em;height:20px;padding:0 9px;border-radius:6px;" +
      "cursor:pointer;box-shadow:none;");
    回.onclick = () => { s.顯示月 = this.今.slice(0, 7); this.畫(); };
  }
  移月(ym, n) {
    const y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)) - 1 + n;
    const d = new Date(y, m, 1);
    return d.getFullYear() + "-" + 兩位(d.getMonth() + 1);
  }

  /* ---- ③ 新增區:兩列,每列都是「左邊會伸縮的群組 + 右邊固定寬的群組」 ---- */
  /* 標籤右:給一個函式就能在「分類」「指派人」這幾個字的**右邊**掛東西。
     ⚠ 掛在欄位右邊(身的那一排)會多佔一整個欄寬,窄螢幕就把輸入框擠沒了;
       掛在標籤那一行是免費的 —— 那一行本來就只有幾個字,右邊全是空的。 */
  建框(容器, 標籤, 外css, 標籤右) {
    const 盒 = 容器.createDiv();
    盒.addClass("tk-欄框");
    st(盒, "display:flex;flex-direction:column;gap:3px;padding:5px 8px 6px;border-radius:7px;" +
      "box-sizing:border-box;min-width:0;" +
      "border:1px solid var(--background-modifier-border);background:var(--background-secondary);" +
      (外css || ""));
    if (標籤) {
      const 標行 = 盒.createDiv();
      st(標行, "display:flex;align-items:center;gap:4px;min-width:0;");
      st(標行.createDiv({ text: 標籤 }),
        "font-size:0.66em;color:var(--text-faint);white-space:nowrap;");
      if (標籤右) 標籤右(標行);
    }
    const 身 = 盒.createDiv();
    st(身, "display:flex;gap:5px;align-items:center;flex-wrap:wrap;flex:1 1 auto;");
    return 身;
  }

  畫新增區(根, 全) {
    根.empty();
    const T = this.T, s = this.狀態;
    const 列間隔 = 8, 右欄寬 = 172;
    const 左群 = "display:flex;gap:" + 列間隔 + "px;align-items:stretch;flex-wrap:wrap;" +
      "flex:1 1 250px;min-width:0;max-width:100%;";
    const 右群 = "display:flex;gap:" + 列間隔 + "px;align-items:stretch;flex-wrap:wrap;" +
      "flex:0 0 " + 右欄寬 + "px;width:" + 右欄寬 + "px;min-width:0;max-width:100%;box-sizing:border-box;";

    const 本體 = 根.createDiv();
    本體.addClass("tk-新增列"); 本體.addClass("tk-本體");
    st(本體, "display:flex;flex-direction:column;gap:" + 列間隔 + "px;");

    const 主題行 = 本體.createDiv(); 主題行.addClass("tk-行");
    st(主題行, "display:flex;gap:" + 列間隔 + "px;align-items:stretch;flex-wrap:wrap;");
    const 主行 = 本體.createDiv(); 主行.addClass("tk-行");
    st(主行, "display:flex;gap:" + 列間隔 + "px;align-items:stretch;flex-wrap:wrap;");

    // 第一列左群:主題 + 常用主題
    const 第一左 = 主題行.createDiv(); 第一左.addClass("tk-群"); st(第一左, 左群);
    const 題框 = this.建框(第一左, T.topic, "flex:1 1 130px;min-width:104px;");
    題框.parentElement.addClass("tk-主題框");
    st(題框, "display:flex;align-items:center;width:100%;");
    /* ⚠ 主題框同時就是搜尋框(準則:同一個功能只給一個入口)——
       所以表格上不再另外做一個搜尋欄。打字 → 只重畫清單,這兩個框完全不碰,
       游標和正在打的字都留著,可以一直打下去。 */
    const 題輸 = 題框.createEl("input", { type: "text" });
    st(題輸, "flex:1 1 auto;min-width:0;width:100%;height:24px;font-size:0.88em;font-weight:700;");
    題輸.placeholder = T.newTitle; 題輸.value = s.新主題;
    題輸.oninput = () => { s.新主題 = 題輸.value; this.搜尋變動(); };
    題輸.onkeydown = (e) => {
      if ((e.ctrlKey || e.metaKey) && 是Enter鍵(e)) { e.preventDefault(); this.送出新增(); return; }
      if (e.isComposing || e.keyCode === 229) return;   // 選字中,方向鍵和 Enter 留給輸入法
      if (是Enter鍵(e)) {
        e.preventDefault();
        if (e.shiftKey) this.送出新增(); else if (this.內輸) this.內輸.focus();
        return;
      }
      if (e.key === "Escape" || e.code === "Escape") { e.preventDefault(); this.清除搜尋(); }
    };
    this.題輸 = 題輸;
    if (s.新主題) {
      const 清 = 題框.createDiv();
      st(清, "flex:0 0 auto;margin-left:4px;cursor:pointer;color:var(--text-faint);" +
        "display:inline-flex;line-height:0;user-select:none;");
      圖(清, "x", 12);
      清.title = T.clearSearch;
      清.onclick = () => this.清除搜尋();
    }

    /* ---- 常用主題 ----
       ⚠ 固定就是一橫列,放不下的收進「☰ 更多」(擺在**最前面**,再窄的螢幕也切不掉),
         而且「更多」裡面可以打字查主題。
       ⚠ 清單跟著現在篩出來的結果走 —— 打了關鍵字,常用主題就只剩相關的那幾個;
         新增或編修過某個主題,它也會跟著往前排(最近動過的優先)。 */
    const 常框 = this.建框(第一左, T.hotTopics, "flex:2 1 200px;min-width:0;");
    常框.parentElement.addClass("tk-常用主題");
    st(常框, "display:flex;gap:6px;align-items:center;width:100%;min-width:0;" +
      "flex-wrap:nowrap;overflow:hidden;");

    // 現在篩出來的那一批(有打關鍵字就只算那一批),再照「最近動過」排
    const 池 = this.搜尋中() ? this.過濾(全) : this.清單池(全);
    const 次 = {}, 新 = {};
    池.forEach(k => {
      if (!k.主題) return;
      次[k.主題] = (次[k.主題] || 0) + 1;
      const t = String(k.編修時 || "");
      if (!新[k.主題] || t > 新[k.主題]) 新[k.主題] = t;
    });
    const 全主題 = Object.keys(次).sort((a, b) => {
      const t = String(新[b] || "").localeCompare(String(新[a] || ""));   // 最近動過的優先
      return t || (次[b] - 次[a]);
    });
    const 露幾個 = 7;
    const 熱 = 全主題.slice(0, 露幾個);
    const 其餘 = 全主題.slice(露幾個);

    // ☰ 更多:擺在最前面,點開可以打字查
    const 更多 = 常框.createEl("button");
    st(更多, "flex:0 0 auto;font-size:0.72em;height:20px;padding:0 8px;border-radius:10px;" +
      "cursor:pointer;white-space:nowrap;box-shadow:none;color:var(--text-muted);");
    圖鈕(更多, "list", String(其餘.length || 全主題.length), 12);
    更多.title = "所有主題(可以打字查)";
    更多.onclick = (e) => { e.stopPropagation(); this.開主題面板(e, 全主題, 次); };

    if (this.搜尋中()) {
      const 清 = 常框.createEl("button");
      st(清, "flex:0 0 auto;font-size:0.72em;height:20px;padding:0 8px;border-radius:10px;" +
        "cursor:pointer;box-shadow:none;color:var(--text-accent);border:1px solid var(--text-accent);");
      圖鈕(清, "x", "", 12);
      清.title = T.clearSearch;
      清.onclick = () => this.清除搜尋();
    }
    熱.forEach(t => {
      const b = 常框.createEl("button", { text: t });
      st(b, 分類樣式類(this.插件.分類色(this.主題分類(全, t))) +
        "font-size:0.72em;height:20px;padding:0 8px;cursor:pointer;white-space:nowrap;" +
        "flex:0 0 auto;box-shadow:none;border:1px solid transparent;");
      b.title = t + " · " + 次[t] + " " + T.cards + "。點一下把同主題的卡片都篩出來";
      b.onclick = () => this.帶入主題(t);
    });
    if (!全主題.length) st(常框.createDiv({ text: T.noTopics }),
      "font-size:0.72em;color:var(--text-faint);");

    // 第一列右群:分類 + 指派人
    const 第一右 = 主題行.createDiv(); 第一右.addClass("tk-群"); st(第一右, 右群);
    const 區 = this.分類清單.filter(x => !/archive|封存/i.test(x));
    if (s.新分類 === null || 區.indexOf(s.新分類) < 0) s.新分類 = 區[0] || "紅色";
    const 分框 = this.建框(第一右, T.section, "flex:0 0 62px;width:62px;", (標行) => {
      const 管分類 = 標行.createDiv();
      st(管分類, "margin-left:auto;display:inline-flex;align-items:center;cursor:pointer;" +
        "line-height:0;color:var(--text-faint);");
      圖(管分類, "ellipsis", 13);
      管分類.title = T.editSections;
      管分類.onclick = (e) => { e.stopPropagation(); this.開分類設定(e, 區); };
    });
    分框.parentElement.addClass("tk-分類框");
    st(分框, "display:flex;align-items:center;justify-content:center;width:100%;");
    /* ⚠ 顏色和名字兩個都要看得到,不是一個下拉選單的文字 ——
       顏色是分類的語言,名字是它的代號,少一個就要猜。 */
    const 點 = 分框.createDiv();
    const nc = this.插件.分類色(s.新分類);
    st(點, "width:22px;height:22px;border-radius:50%;cursor:pointer;flex:0 0 auto;" +
      "color:" + nc + ";border:2px solid " + nc + ";background:" + 透明(nc, 0.14) + ";");
    點.title = s.新分類 + " —— 點一下換要放到哪一區";
    /* ⚠ 以前這裡開的是 Obsidian 的選單,一條一條都是**文字**(Markdown 的 `##` 標題名)。
       但分類在看板上的語言是**顏色** —— 使用者記得的是「藍色那一區」,
       不是「## 藍色」這五個字。所以改成一排真正的色點,挑顏色就是挑分區。 */
    點.onclick = (e) => {
      e.stopPropagation();
      const 舊 = document.body.querySelector(".tk-分類挑");
      if (舊) { try { 舊.remove(); } catch (x) {} return; }
      /* ⚠ 掛在 document.body,不可以掛在分類框裡面 ——
         新增區那幾個框都設了 overflow:clip(擋橫向溢出用的),
         色盤長在裡面會被裁掉一半,只看得到最上面一條。 */
      const 盤 = document.body.createDiv();
      盤.addClass("tk-分類挑");
      const r0 = 點.getBoundingClientRect();
      st(盤, "position:fixed;z-index:9999;padding:7px;border-radius:10px;display:flex;gap:7px;" +
        "background:var(--background-primary);border:1px solid var(--background-modifier-border);" +
        "box-shadow:0 6px 22px rgba(0,0,0,0.28);");
      盤.style.left = Math.max(6, Math.min(r0.left - 60, window.innerWidth - 210)) + "px";
      盤.style.top = (r0.bottom + 6) + "px";
      區.forEach(n => {
        const c = this.插件.分類色(n);
        const 圓 = 盤.createDiv();
        st(圓, "width:22px;height:22px;border-radius:50%;cursor:pointer;flex:0 0 auto;" +
          "border:2px solid " + c + ";background:" + 透明(c, 0.14) + ";" +
          (n === s.新分類 ? "outline:2px solid var(--text-accent);outline-offset:2px;" : ""));
        圓.title = n;
        圓.onclick = (ev) => { ev.stopPropagation(); s.新分類 = n; this.畫(); };
      });
      const 關 = (ev) => {
        if (盤.contains(ev.target) || 點.contains(ev.target)) return;
        try { 盤.remove(); } catch (x) {}
        document.removeEventListener("mousedown", 關, true);
      };
      setTimeout(() => document.addEventListener("mousedown", 關, true), 0);
    };


    const 人框 = this.建框(第一右, T.assignee, "flex:1 1 auto;min-width:0;", (標行) => {
      const 管 = 標行.createDiv();
      st(管, "margin-left:auto;display:inline-flex;align-items:center;cursor:pointer;" +
        "line-height:0;color:var(--text-faint);");
      圖(管, "ellipsis", 13);
      管.title = T.managePeople;
      管.onclick = () => { this.狀態.管人開 = !this.狀態.管人開; this.畫(); };
    });
    人框.parentElement.addClass("tk-指派框");
    st(人框, "display:flex;align-items:center;width:100%;min-width:0;");
    const 選 = 人框.createEl("select");
    選.createEl("option", { value: "", text: T.none });
    this.名單.forEach(n => 選.createEl("option", { value: n, text: n }));
    選.value = s.新指派 || this.我是誰() || "";
    const 有人 = !!選.value;
    const pc = 有人 ? this.插件.人色(選.value) : null;
    st(選, "padding:3px 6px;font-size:0.85em;border-radius:5px;cursor:pointer;" +
      "flex:1 1 auto;min-width:0;width:100%;" +
      (有人 ? "font-weight:700;color:" + pc + ";border:1px solid " + pc + ";" : ""));
    選.onchange = () => {
      s.新指派 = 選.value || null;
      if (選.value) 存我是誰(選.value);      // 順手記住這台電腦是誰 —— 留言的「編輯」靠它認人
      this.畫();
    };

    // 第二列:內容(左)+ 送出(右)
    const 內框 = this.建框(主行, null, "flex:1 1 250px;min-width:0;max-width:100%;");
    內框.parentElement.addClass("tk-內容框");
    st(內框, "display:flex;align-items:stretch;width:100%;");
    const 內輸 = 內框.createEl("textarea");
    st(內輸, "width:100%;flex:1 1 auto;min-width:0;min-height:2.4em;resize:none;" +
      "font-family:var(--font-text);font-size:0.92em;line-height:1.5;");
    內輸.placeholder = T.newBody; 內輸.value = s.新內容;
    // 打字造成的長高不要做過場,瞬間到位就好(準則第五章)
    const 長高 = () => { 內輸.style.height = "auto"; 內輸.style.height = Math.ceil(內輸.scrollHeight) + "px"; };
    內輸.oninput = () => { s.新內容 = 內輸.value; 長高(); this.搜尋變動(); };
    /* 鍵盤跟編修框完全一樣,不用記兩套:
         Enter 換行 ‧ Shift+Enter 送出 ‧ Ctrl/⌘+Enter 送出 ‧ Esc 清空 */
    內輸.onkeydown = (e) => {
      if ((e.ctrlKey || e.metaKey) && 是Enter鍵(e)) { e.preventDefault(); this.送出新增(); return; }
      if (e.isComposing || e.keyCode === 229) return;
      if (是Enter鍵(e) && e.shiftKey) { e.preventDefault(); this.送出新增(); return; }
      if (e.key === "Escape" || e.code === "Escape") { e.preventDefault(); this.清除搜尋(); }
    };
    this.內輸 = 內輸;
    this.掛連結建議(內輸);            // 打 [[ 就跳出筆記清單
    掛md快捷(內輸);                   // Ctrl/Cmd + B / I / K … 跟 Obsidian 一樣
    setTimeout(長高, 0);

    const 送欄 = 主行.createDiv(); 送欄.addClass("tk-送出欄"); st(送欄, 右群);
    const 送框 = this.建框(送欄, null, "flex:1 1 auto;width:100%;");
    st(送框, "display:flex;flex-direction:column;gap:3px;align-items:stretch;width:100%;");
    const 去向 = 送框.createDiv({ text: "→ " + this.新增去向文() });
    st(去向, "font-size:0.66em;color:var(--text-faint);white-space:nowrap;overflow:hidden;" +
      "text-overflow:ellipsis;text-align:center;");
    const 送 = 送框.createEl("button");
    const bc = 選.value ? this.插件.人色(選.value) : "var(--interactive-accent)";
    st(送, "width:100%;height:32px;padding:0;border-radius:6px;" +
      "cursor:pointer;color:var(--text-on-accent, #fff);background:" + bc + ";" +
      "border:1px solid " + bc + ";");
    圖鈕(送, "plus", "", 18);
    送.title = 選.value ? (T.add + " · " + 選.value) : T.add;
    送.onclick = () => this.送出新增();

    if (s.管人開) this.畫管人(根);
  }

  /* 打字即時搜尋:稍微延遲一下再重畫,打字才不會卡。
     ⚠ 只重畫清單 —— 新增區那兩個輸入框完全不碰,游標和字都留著。 */
  /* ---- 搜尋 ----
     ⚠ 兩個框各自是一組關鍵字,而且**每一組都同時去比對主題和內容**:
       ・只打主題框 → 主題或內容有這幾個字的都找得到
       ・主題框 + 內容框都打 → 兩組都要命中(所以越打越準),
         但每一組仍然是「主題或內容」都算 —— 你不用記哪個字該打在哪一格
       ・**兩組都命中、而且主題也對上**的排更前面(相關性更高)
     字串用「拆成一個一個關鍵字,每個都要出現」的模糊比對,順序不拘。 */
  搜尋變動() {
    const s = this.狀態;
    s.搜尋 = (String(s.新主題 || "") + " " + String(s.新內容 || "")).trim();
    if (this.搜尋計時) clearTimeout(this.搜尋計時);
    this.搜尋計時 = setTimeout(() => { this.搜尋計時 = null; this.重畫清單(); }, 160);
  }
  清除搜尋() {
    const s = this.狀態;
    s.新主題 = ""; s.新內容 = ""; s.搜尋 = ""; s.主題 = null; s.指派 = null;
    this.畫();
    setTimeout(() => { try { this.題輸.focus(); } catch (e) {} }, 0);
  }
  /* 點主題膠囊 / 常用主題:把主題帶進輸入框(等於用它搜尋),游標跳到內容 */
  帶入主題(名) {
    const s = this.狀態;
    s.新主題 = String(名 || "");
    s.主題 = null;                       // 用搜尋做,不再另外掛一個主題篩選
    s.搜尋 = (s.新主題 + " " + String(s.新內容 || "")).trim();
    this.畫();
    setTimeout(() => { try { this.內輸.focus(); } catch (e) {} }, 0);
  }

  搜尋中() { return !!String(this.狀態.搜尋 || "").trim(); }

  /* ---- 打 `[[` 跳出筆記清單 ----
     在輸入框裡打 `[[` 就列出 vault 裡的筆記,↑↓ 選、Enter/Tab 帶入、Esc 關掉。
     ⚠ 清單開著的時候,Enter 是「選這一個」,不是送出 —— 所以要掛在原本的
       keydown 前面先攔一次。 */
  掛連結建議(框) {
    const T = this.T;
    let 面板 = null, 選中 = 0, 候選 = [], 起位 = -1;
    const 關 = () => {
      if (面板) { try { 面板.remove(); } catch (e) {} 面板 = null; }
      候選 = []; 選中 = 0; 起位 = -1;
    };
    const 畫 = () => {
      if (!面板) {
        面板 = document.body.createDiv();
        面板.addClass("tk-可捲");
        st(面板, "position:fixed;z-index:10000;width:280px;max-height:230px;overflow-y:auto;" +
          "padding:4px;border-radius:8px;background:var(--background-primary);" +
          "border:1px solid var(--background-modifier-border);box-shadow:0 6px 22px rgba(0,0,0,0.34);");
      }
      const r = 框.getBoundingClientRect();
      面板.style.left = Math.max(6, Math.min(r.left, window.innerWidth - 292)) + "px";
      面板.style.top = Math.min(r.bottom + 4, window.innerHeight - 240) + "px";
      面板.empty();
      候選.forEach((f, i) => {
        const 行 = 面板.createDiv({ text: f.basename });
        st(行, "padding:3px 7px;border-radius:5px;cursor:pointer;font-size:0.84em;" +
          "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" +
          (i === 選中 ? "background:var(--background-modifier-hover);font-weight:700;" : ""));
        行.title = f.path;
        行.onmousedown = (e) => { e.preventDefault(); 帶入(i); };
      });
    };
    const 帶入 = (i) => {
      const f = 候選[i]; if (!f) return;
      const v = 框.value;
      // ⚠ 游標後面如果本來就有 `]]`(使用者自己先打了),要吃掉它,
      //   不然會變成 `[[名]]]]`,畫面上就多出一截莫名其妙的 `]]`
      let 後 = v.slice(框.selectionStart);
      if (後.slice(0, 2) === "]]") 後 = 後.slice(2);
      框.value = v.slice(0, 起位) + "[[" + f.basename + "]]" + 後;
      const 落 = 起位 + f.basename.length + 4;
      關();
      try { 框.focus(); 框.setSelectionRange(落, 落); } catch (e) {}
      框.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const 查 = () => {
      const v = String(框.value || ""), 游 = 框.selectionStart;
      const 前 = v.slice(0, 游);
      const i = 前.lastIndexOf("[[");
      if (i < 0 || 前.slice(i).indexOf("]]") >= 0 || 前.slice(i).indexOf("\n") >= 0) { 關(); return; }
      起位 = i;
      const q = 前.slice(i + 2).toLowerCase();
      let 檔們 = [];
      try { 檔們 = this.app.vault.getMarkdownFiles(); } catch (e) {}
      候選 = 檔們.filter(f => !q || f.basename.toLowerCase().indexOf(q) >= 0).slice(0, 40);
      if (!候選.length) { 關(); return; }
      選中 = 0; 畫();
    };
    框.addEventListener("input", 查);
    框.addEventListener("blur", () => setTimeout(關, 140));
    // ⚠ 這一層要比原本的 keydown 早跑,所以用 capture
    框.addEventListener("keydown", (e) => {
      if (!面板 || !候選.length) return;
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === "ArrowDown") { e.preventDefault(); e.stopPropagation(); 選中 = (選中 + 1) % 候選.length; 畫(); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); e.stopPropagation(); 選中 = (選中 + 候選.length - 1) % 候選.length; 畫(); return; }
      if (是Enter鍵(e) || e.key === "Tab") { e.preventDefault(); e.stopPropagation(); 帶入(選中); return; }
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); 關(); return; }
    }, true);
    return { 關: 關 };
  }

  /* 「☰ 更多」的面板:上面一個查詢框,底下是所有主題(照最近動過排) */
  開主題面板(e, 全主題, 次) {
    const T = this.T;
    if (this.主題面板) { try { this.主題面板.remove(); } catch (x) {} this.主題面板 = null; return; }
    const 盒 = document.body.createDiv();
    this.主題面板 = 盒;
    st(盒, "position:fixed;z-index:9999;width:260px;max-height:340px;display:flex;" +
      "flex-direction:column;gap:6px;padding:8px;border-radius:9px;" +
      "background:var(--background-primary);border:1px solid var(--background-modifier-border);" +
      "box-shadow:0 6px 22px rgba(0,0,0,0.34);");
    const r = e.currentTarget.getBoundingClientRect();
    盒.style.left = Math.max(6, Math.min(r.left, window.innerWidth - 272)) + "px";
    盒.style.top = (r.bottom + 5) + "px";
    const 查 = 盒.createEl("input", { type: "text" });
    查.placeholder = T.findTopic;
    st(查, "width:100%;height:26px;font-size:0.86em;");
    const 單 = 盒.createDiv();
    單.addClass("tk-可捲");
    st(單, "display:flex;flex-direction:column;gap:3px;overflow-y:auto;max-height:270px;");
    const 畫單 = () => {
      單.empty();
      const q = String(查.value || "").trim().toLowerCase();
      const 出 = 全主題.filter(t => !q || t.toLowerCase().indexOf(q) >= 0);
      if (!出.length) { st(單.createDiv({ text: T.noTopics }), "font-size:0.76em;color:var(--text-faint);"); return; }
      出.forEach(t => {
        const 行 = 單.createDiv();
        st(行, "display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:5px;cursor:pointer;");
        行.onmouseenter = () => { 行.style.background = "var(--background-modifier-hover)"; };
        行.onmouseleave = () => { 行.style.background = ""; };
        st(行.createDiv({ text: t }), "flex:1 1 auto;min-width:0;font-size:0.84em;" +
          "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;");
        st(行.createDiv({ text: String(次[t] || 0) }), "font-size:0.72em;color:var(--text-faint);");
        行.onclick = () => { 關(); this.帶入主題(t); };
      });
    };
    查.oninput = 畫單;
    查.onkeydown = (e2) => { if (e2.key === "Escape") { e2.preventDefault(); 關(); } };
    畫單();
    const 關 = () => {
      try { 盒.remove(); } catch (x) {}
      this.主題面板 = null;
      document.removeEventListener("mousedown", 外, true);
    };
    const 外 = (ev) => { if (!盒.contains(ev.target)) 關(); };
    setTimeout(() => { document.addEventListener("mousedown", 外, true); try { 查.focus(); } catch (x) {} }, 0);
  }

  主題分類(全, 題) {
    const k = 全.find(x => x.主題 === 題);
    return k ? k.分類 : "";
  }
  // 新卡片會被放到哪一天:完全看上面統計列現在選的是哪一格
  /* 新卡片會被放到哪一天,完全看上面統計列現在選的是哪一格:
       今日 → 今天 ‧ 選了一段 → 那一段 ‧ 長期・週期 → 直接標上 #長期 */
  新增日期() {
    const f = this.狀態.篩 || {};
    if (f.型 === "長期") return { 起: null, 迄: null, 長期: true };
    const 區 = this.現在區間();
    if (區 && 區[0]) return { 起: 區[0], 迄: (區[1] && 區[1] !== 區[0]) ? 區[1] : null };
    return { 起: this.今, 迄: null };
  }
  新增去向文() {
    const d = this.新增日期();
    if (d.長期) return "#長期";
    if (!d.起) return this.T.undated;
    return 日期短(d.起) + (d.迄 ? " – " + 日期短(d.迄) : "");
  }

  /* ---- 分類設定(從分類圓點旁邊的「⋯」打開) ----
     改的是「圓點裡顯示什麼字」和「這一區是什麼顏色」。
     ⚠ Markdown 裡的 `## 標題` 一個字都不會動 —— 標題是卡片的家,改了等於全部搬家。 */
  開分類設定(e, 區) {
    const T = this.T;
    const 舊 = document.body.querySelector(".tk-分類設定");
    if (舊) { try { 舊.remove(); } catch (x) {} return; }
    const 盒 = document.body.createDiv();
    盒.addClass("tk-分類設定");
    st(盒, "position:fixed;z-index:9999;padding:12px;border-radius:10px;min-width:260px;" +
      "display:flex;flex-direction:column;gap:9px;" +
      "background:var(--background-primary);border:1px solid var(--background-modifier-border);" +
      "box-shadow:0 6px 22px rgba(0,0,0,0.3);");
    const r0 = e.currentTarget.getBoundingClientRect();
    盒.style.left = Math.max(6, Math.min(r0.left - 120, window.innerWidth - 290)) + "px";
    盒.style.top = Math.min(r0.bottom + 6, window.innerHeight - 60) + "px";

    const 頭 = 盒.createDiv();
    st(頭, "font-size:0.82em;font-weight:700;color:var(--text-normal);");
    頭.setText(T.editSections);
    st(盒.createDiv({ text: T.sectionColorHint }), "font-size:0.72em;color:var(--text-faint);margin-top:-4px;");

    (區 || []).slice(0, 5).forEach(n => {
      const 列 = 盒.createDiv();
      st(列, "display:flex;align-items:center;gap:8px;");
      const c = this.插件.分類色(n);
      const 圓 = 列.createDiv();
      st(圓, "position:relative;width:20px;height:20px;border-radius:50%;flex:0 0 auto;" +
        "cursor:pointer;overflow:hidden;background:" + c + ";");
      const 色輸 = 圓.createEl("input", { type: "color" });
      色輸.value = c;
      st(色輸, "position:absolute;inset:0;opacity:0;cursor:pointer;padding:0;border:0;");
      /* ⚠ 抖動的原因在這裡。色盤拖曳的時候 oninput 每幾毫秒就發一次,
         舊版每一次都「存設定 + 重畫所有看板」—— 整份清單一秒重建幾十次,
         畫面當然會抖,而且色盤面板自己也被重畫掉。
         現在:拖的時候只改這一顆圓點的顏色(便宜),放開手(change)才真的存檔和重畫。 */
      色輸.oninput = () => { 圓.style.background = 色輸.value; };
      色輸.onchange = async () => {
        this.插件.設定.分類顏色 = this.插件.設定.分類顏色 || {};
        this.插件.設定.分類顏色[n] = 色輸.value;
        await this.插件.存設定();
        this.插件.重畫所有看板();
      };
      const 名 = 列.createDiv({ text: n });
      st(名, "flex:1 1 auto;min-width:0;font-size:0.82em;color:var(--text-muted);" +
        "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;");
      名.title = n;
      if ((this.插件.設定.分類顏色 || {})[n]) {
        const 回 = 列.createDiv();
        st(回, "display:inline-flex;cursor:pointer;color:var(--text-faint);line-height:0;");
        圖(回, "rotate-ccw", 13);
        回.title = T.resetColor;
        回.onclick = async () => {
          delete this.插件.設定.分類顏色[n];
          await this.插件.存設定();
          this.插件.重畫所有看板();
          try { 盒.remove(); } catch (x) {}
        };
      }
    });

    const 關 = (ev) => {
      if (盒.contains(ev.target)) return;
      try { 盒.remove(); } catch (x) {}
      document.removeEventListener("mousedown", 關, true);
    };
    setTimeout(() => document.addEventListener("mousedown", 關, true), 0);
  }

  /* ---- 管理指派人(從「⋯」打開) ---- */
  畫管人(根) {
    const T = this.T, 設 = this.插件.設定;
    const 盒 = 根.createDiv();
    盒.addClass("tk-欄框");
    st(盒, "padding:8px 10px;border-radius:8px;background:var(--background-secondary);" +
      "border:1px solid var(--background-modifier-border);");
    st(盒.createDiv({ text: T.managePeople }),
      "font-size:0.7em;font-weight:700;color:var(--text-muted);margin-bottom:5px;");
    設.指派人.forEach((n, i) => {
      const 行 = 盒.createDiv();
      st(行, "display:flex;align-items:center;gap:6px;margin-bottom:4px;");
      const 色 = 行.createEl("input", { type: "color" });
      色.value = this.插件.人色(n);
      st(色, "width:26px;height:22px;padding:0;border:0;background:none;cursor:pointer;");
      色.onchange = async () => {
        設.指派人顏色 = 設.指派人顏色 || {};
        設.指派人顏色[n] = 色.value;
        await this.插件.存設定(); this.畫();
      };
      const 名 = 行.createEl("input", { type: "text" });
      st(名, "flex:1 1 auto;min-width:0;height:24px;font-size:0.86em;");
      名.value = n;
      名.onblur = async () => {
        const 新 = String(名.value || "").trim();
        if (!新 || 新 === n) { 名.value = n; return; }
        if (設.指派人.indexOf(新) >= 0) { new Notice(T.dupName); 名.value = n; return; }
        // ⚠ 改名要連檔案裡的 `#舊名` 一起換,不然那些卡片就認不出指派給誰了
        const 換 = await this.插件.寫手.改指派人名(this.file, n, 新);
        設.指派人[i] = 新;
        if (設.指派人顏色 && 設.指派人顏色[n]) { 設.指派人顏色[新] = 設.指派人顏色[n]; delete 設.指派人顏色[n]; }
        if (讀我是誰() === n) 存我是誰(新);
        await this.插件.存設定();
        new Notice(T.renamed + (換 ? "（" + 換 + "）" : ""));
        this.畫();
      };
      const 刪 = 行.createDiv();
      st(刪, "cursor:pointer;color:var(--text-faint);padding:0 5px;display:inline-flex;line-height:0;");
      圖(刪, "x", 13);
      刪.title = T.removePerson;
      刪.onclick = async () => {
        設.指派人 = 設.指派人.filter(x => x !== n);
        if (讀我是誰() === n) 存我是誰(null);
        await this.插件.存設定(); this.畫();
      };
    });
    const 加行 = 盒.createDiv();
    st(加行, "display:flex;align-items:center;gap:6px;");
    const 新名 = 加行.createEl("input", { type: "text" });
    st(新名, "flex:1 1 auto;min-width:0;height:24px;font-size:0.86em;");
    新名.placeholder = T.newPerson;
    const 加 = 加行.createEl("button");
    st(加, "height:24px;padding:0 12px;font-size:0.84em;border-radius:6px;cursor:pointer;");
    圖鈕(加, "plus", "", 15);
    加.onclick = async () => {
      const v = String(新名.value || "").trim();
      if (!v || 設.指派人.indexOf(v) >= 0) return;
      設.指派人.push(v);
      await this.插件.存設定(); this.畫();
    };
    st(盒.createDiv({ text: T.whoAmI + "：" + (this.我是誰() || "—") + "　" + T.whoAmIShort }),
      "font-size:0.68em;color:var(--text-faint);margin-top:5px;");
  }

  /* ============================================================
     ④ 表格 —— 日期 112 ‧ 分類 78 ‧ 內容(剩下的全部)
     table-layout:fixed:欄寬完全照 <th> 的數字走,不會因為某一列內容長
     就把那一欄撐開,進入編修模式時內容欄也不會變寬。
     ============================================================ */
  畫清單(根, 全) {
    根.empty();
    const T = this.T;
    const 顯 = this.過濾(全);
    const 塊 = 根.createDiv();
    塊.addClass("tk-塊");
    st(塊, "border-radius:9px;" +
      "border:1px solid var(--background-modifier-border);background:var(--background-primary);" +
      "box-shadow:0 1px 3px rgba(0,0,0,0.16);");
    const 頭 = 塊.createDiv();
    st(頭, "display:flex;align-items:center;gap:8px;padding:6px 10px;" +
      "background:var(--background-secondary);" +
      "border-bottom:1px solid var(--background-modifier-border);");
    st(頭.createDiv({ text: this.篩選標題() }),
      "font-size:0.82em;font-weight:700;color:var(--text-normal);white-space:nowrap;");
    st(頭.createDiv({ text: 顯.length + " " + T.cards }),
      "font-size:0.72em;color:var(--text-faint);");
    // ⚠ 這裡不再做搜尋欄 —— 搜尋就是上面的「主題 / 內容」框(同一個功能只給一個入口)
    if (this.狀態.搜尋) {
      const 清 = 頭.createEl("button");
      st(清, "font-size:0.72em;height:21px;padding:0 9px;border-radius:10px;cursor:pointer;" +
        "box-shadow:none;color:var(--text-accent);border:1px solid var(--text-accent);" +
        "max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;");
      圖鈕(清, "search", this.狀態.搜尋, 12);
      圖(清, "x", 12);
      清.title = T.clearSearch;
      清.onclick = () => this.清除搜尋();
    }
    if (this.狀態.指派) {
      const 清 = 頭.createEl("button");
      st(清, "font-size:0.72em;height:21px;padding:0 8px;border-radius:10px;cursor:pointer;box-shadow:none;");
      圖鈕(清, "x", this.狀態.指派, 12);
      清.onclick = () => { this.狀態.指派 = null; this.畫(); };
    }
    this.畫工具群(頭);

    if (this.狀態.融合中) this.畫融合列(塊, 全);
    const 身外 = 塊.createDiv();
    st(身外, "overflow:visible;min-width:0;");   // ⚠ 不可以是 overflow-x:auto —— 那是左右抖動的元凶
    if (!顯.length) {
      st(身外.createDiv({ text: T.noCards }),
        "padding:26px 0;text-align:center;color:var(--text-faint);font-size:0.9em;");
      return;
    }
    const 表 = 身外.createEl("table");
    st(表, "width:100%;margin:0;table-layout:fixed;border-collapse:collapse;font-size:1.02em;");
    const 頭列 = 表.createEl("thead").createEl("tr");
    // 融合模式:每一列最前面多一個勾選欄(把「完成」勾選換掉,兩個勾選並排會分不清在勾什麼)
    const 欄們 = this.狀態.融合中
      ? [[T.mergeCol, "40px", "center"], [T.colDate, 日期欄寬 + "px", "center"],
         [T.colSection, 分類欄寬 + "px", "center"], [T.colBody, "", "left"]]
      : [[T.colDate, 日期欄寬 + "px", "center"], [T.colSection, 分類欄寬 + "px", "center"],
         [T.colBody, "", "left"]];
    欄們.forEach(([字, 寬, 對]) => {
        const th = 頭列.createEl("th", { text: 字 });
        st(th, "text-align:" + 對 + ";padding:6px 8px;white-space:nowrap;" +
          "color:var(--text-muted);font-weight:600;font-size:0.9em;" + (寬 ? "width:" + 寬 + ";" : ""));
      });
    const 身 = 表.createEl("tbody");
    顯.forEach(k => this.畫一列(身, k));
  }

  /* 底下那張「未寫日期」表:第一欄換成「補日期」——一鍵把它排進今天 */
  畫未定區(根, 全) {
    根.empty();
    const T = this.T;
    const 未 = this.未寫日期(全);
    if (!未.length) return;
    const 塊 = 根.createDiv();
    塊.addClass("tk-塊");
    st(塊, "border-radius:9px;margin-top:2px;" +
      "border:1px solid var(--background-modifier-border);background:var(--background-primary);" +
      "box-shadow:0 1px 3px rgba(0,0,0,0.16);");
    const 頭 = 塊.createDiv();
    st(頭, "display:flex;align-items:center;gap:8px;padding:6px 10px;" +
      "background:var(--background-secondary);" +
      "border-bottom:1px solid var(--background-modifier-border);");
    st(頭.createDiv({ text: T.undatedBlock }),
      "font-size:0.82em;font-weight:700;white-space:nowrap;");
    st(頭.createDiv({ text: 未.length + " " + T.cards }), "font-size:0.72em;color:var(--text-faint);");
    const 身外 = 塊.createDiv();
    st(身外, "overflow:visible;min-width:0;");
    const 表 = 身外.createEl("table");
    st(表, "width:100%;margin:0;table-layout:fixed;border-collapse:collapse;font-size:1.02em;");
    const 頭列 = 表.createEl("thead").createEl("tr");
    [[T.fillDate, "100px", "center"], [T.colSection, 分類欄寬 + "px", "center"], [T.colBody, "", "left"]]
      .forEach(([字, 寬, 對]) => {
        const th = 頭列.createEl("th", { text: 字 });
        st(th, "text-align:" + 對 + ";padding:6px 8px;white-space:nowrap;" +
          "color:var(--text-muted);font-weight:600;font-size:0.9em;" + (寬 ? "width:" + 寬 + ";" : ""));
      });
    const 身 = 表.createEl("tbody");
    未.forEach(k => this.畫一列(身, k, true));
  }

  /* 表格標題列右上角這一組:排序 / 全部展開 / 融合 / 輸出 */
  畫工具群(頭) {
    const T = this.T, s = this.狀態, 設 = this.插件.設定;
    const 群 = 頭.createDiv();
    st(群, "display:flex;gap:6px;align-items:center;margin-left:auto;flex-wrap:wrap;");
    群.onclick = (e) => e.stopPropagation();

    const 展 = 群.createEl("button");
    st(展, "padding:2px 8px;font-size:0.74em;line-height:1.5;cursor:pointer;border-radius:6px;" +
      "white-space:nowrap;flex:0 0 auto;box-shadow:none;" +
      (s.展開全部 ? "font-weight:700;border:1px solid var(--text-accent);color:var(--text-accent);"
                  : "color:var(--text-muted);"));
    圖鈕(展, s.展開全部 ? "chevrons-down-up" : "chevrons-up-down",
      s.展開全部 ? T.collapseAll : T.expandAll, 13);
    展.title = s.展開全部 ? "目前所有卡片都攤開顯示全文。點一下收回,只留主題 + 兩行"
                          : "展開全部:所有卡片一次顯示全部文字";
    展.onclick = () => { s.展開全部 = !s.展開全部; s.展開 = {}; this.重畫清單(); };

    /* 排序方式:預設「新增/編輯順序」(照卡片自己的 ✎ 時戳,所以換一台電腦也一樣),
       另一個是「分類顏色順序」= 日期 → 分類順序 → 最近編修 */
    const 排 = 群.createEl("select");
    [["編修", T.sortEdited], ["顏色", T.sortColor], ["檔案", T.sortFile]]
      .forEach(([v, t]) => 排.createEl("option", { value: v, text: t }));
    排.value = ["顏色", "檔案"].indexOf(設.排序) >= 0 ? 設.排序 : "編修";
    st(排, "padding:2px 4px;font-size:0.72em;border-radius:6px;cursor:pointer;" +
      "color:var(--text-muted);flex:0 1 auto;min-width:0;max-width:132px;");
    排.title = "「新增/編輯順序」= 最近新增或編修的排最上面(預設);" +
      "「分類顏色順序」= 日期 → 分類順序 → 最近編修";
    排.onchange = async () => { 設.排序 = 排.value; await this.插件.存設定(); this.重畫清單(); };

    const 融 = 群.createEl("button");
    st(融, "padding:2px 8px;font-size:0.74em;line-height:1.5;cursor:pointer;border-radius:6px;" +
      "white-space:nowrap;flex:0 0 auto;box-shadow:none;" +
      (s.融合中 ? "font-weight:700;border:1px solid var(--text-accent);color:var(--text-accent);"
                : "color:var(--text-muted);"));
    圖鈕(融, "git-merge", T.merge, 13);
    融.title = s.融合中 ? "融合模式進行中 —— 勾選要合併的卡片,再按「融合成一張」。點一下離開"
                        : "融合卡片:勾選好幾張把它們合併成一張";
    融.onclick = () => { s.融合中 = !s.融合中; s.融合選 = {}; this.重畫清單(); };

    const 出 = 群.createEl("button");
    st(出, "padding:2px 8px;font-size:0.74em;line-height:1.5;cursor:pointer;border-radius:6px;" +
      "white-space:nowrap;flex:0 0 auto;box-shadow:none;color:var(--text-muted);");
    圖鈕(出, "download", T.exportWord, 13);
    出.title = "把現在篩出來的這幾張輸出成圖或 PDF(白底,可以列印、可以傳給別人)";
    出.onclick = (e) => this.開輸出選單(e);
  }

  畫融合勾(格, k) {
    st(格, "padding:7px 4px;vertical-align:middle;text-align:center;");
    const box = 格.createEl("input", { type: "checkbox" });
    box.checked = !!this.狀態.融合選[k.鍵];
    box.onclick = (e) => {
      e.stopPropagation();
      if (box.checked) this.狀態.融合選[k.鍵] = true;
      else delete this.狀態.融合選[k.鍵];
      this.重畫清單();
    };
  }

  /* 融合成一張:
       ・主題和第一行用「日期最新」那張的
       ・日期不一樣就寫成區間 ＠{最早~最晚};都一樣就是那一天
       ・內容依卡片新到舊排成小清單,每一段前面標原本的日期
       ・最新那張的第一行只會出現一次(它就是合併後的第一行,不再重複列一條)
       ・指派人沿用最新那張的(沒有就往下找);任何一張置頂,合併後就置頂
       ・留言全部搬進來,照時間新到舊
     整個流程在同一次寫檔裡完成,中途發現位置對不上就整份不動。 */
  畫融合列(根, 全) {
    const T = this.T, s = this.狀態;
    const 選 = 全.filter(k => s.融合選[k.鍵]);
    const 條 = 根.createDiv();
    st(條, "display:flex;align-items:center;gap:10px;padding:7px 10px;" +
      "background:var(--background-secondary);" +
      "border-bottom:1px solid var(--background-modifier-border);");
    st(條.createDiv({ text: T.mergeHint.replace("N", String(選.length)) }),
      "font-size:0.78em;color:var(--text-muted);");
    const 做 = 條.createEl("button", { text: T.mergeDo });
    st(做, "margin-left:auto;padding:3px 12px;font-size:0.8em;font-weight:700;border-radius:6px;" +
      "cursor:pointer;box-shadow:none;" +
      (選.length > 1 ? "color:var(--text-on-accent, #fff);background:var(--interactive-accent);" +
                       "border:1px solid var(--interactive-accent);"
                     : "color:var(--text-faint);opacity:0.5;"));
    做.disabled = 選.length < 2;
    做.onclick = () => this.做融合(選);
    const 離 = 條.createEl("button", { text: T.cancelWord });
    st(離, "padding:3px 10px;font-size:0.8em;border-radius:6px;cursor:pointer;box-shadow:none;");
    離.onclick = () => { s.融合中 = false; s.融合選 = {}; this.重畫清單(); };
  }

  async 做融合(選) {
    const T = this.T;
    if (選.length < 2) return;
    // 日期最新的那張當主卡(沒日期的排最後)
    const 排 = 選.slice().sort((a, b) => String(b.起日 || "0000").localeCompare(String(a.起日 || "0000")));
    const 主 = 排[0];
    const 日們 = 選.map(k => k.起日).filter(Boolean).sort();
    const 迄們 = 選.map(k => k.迄日 || k.起日).filter(Boolean).sort();
    const 起 = 日們[0] || null, 迄 = 迄們[迄們.length - 1] || null;
    const 人 = (排.find(k => k.指派) || {}).指派 || null;
    const 頂 = 選.some(k => k.置頂);
    const 題 = (排.find(k => k.主題) || {}).主題 || "";

    const 尾 = [];
    排.forEach((k, i) => {
      const 行們 = (i === 0) ? k.內容行.slice(1) : k.內容行;   // 主卡第一行就是合併後的第一行,不重複
      if (i > 0 && 行們.length) 尾.push("\t" + 項目符 + (k.起日 ? 日期短(k.起日) + "  " : "") + 行們[0]);
      行們.slice(i > 0 ? 1 : 0).forEach(t => 尾.push("\t\t" + 項目符 + t));
    });
    // 留言全部搬進來,新到舊
    const 留 = [];
    選.forEach(k => k.留言.forEach(c => 留.push(c)));
    留.sort((a, b) => (b.日 + b.分).localeCompare(a.日 + a.分));
    留.forEach(c => 留.push);
    const 留行 = 留.map(c => "\t" + 項目符 + "💬{" + c.日 + " " + c.分 + "|" + c.人 + "} " + c.文);

    const 日 = 起 ? ("＠{" + 起 + ((迄 && 迄 !== 起) ? " ~ " + 迄 : "") + "}") : "";
    const 首行 = "- [ ] " + (題 ? "[" + 題 + "] " : "") + 項目符 + (主.內容行[0] || "") +
      (日 ? " " + 日 : "") + (人 ? " #" + 人 : "") + (頂 ? " 📌" : "") + " ✎{" + 現在戳() + "}";

    const ok = await this.插件.寫手.融合(this.file, 選, 主.分類, 首行, 留行.concat(尾), this.名單);
    if (ok) {
      this.狀態.融合中 = false; this.狀態.融合選 = {};
      new Notice(T.merged.replace("N", String(選.length)));
    }
  }

  篩選標題() {
    const T = this.T, f = this.狀態.篩 || {}, s = this.狀態;
    if (f.型 === "範圍") return 日期短(s.起) + (s.迄 !== s.起 ? "  –  " + 日期短(s.迄) : "");
    if (f.型 === "今日") return T.dayLayer + "  " + 日期短(this.今);
    if (f.型 === "7天內") { const r = this.現在區間(); return T.weekLayer + "  " + 短日(r[0]) + " – " + 短日(r[1]); }
    if (f.型 === "本月") { const r = this.現在區間(); return T.monthLayer + "  " + 短日(r[0]) + " – " + 短日(r[1]); }
    if (f.型 === "年度") return s.統計年;
    return { 全部: T.all, 逾期: T.overdue, 長期: T.longTerm }[f.型] || T.all;
  }

  畫一列(身, k, 未定) {
    const 列 = 身.createEl("tr");
    列.__鍵 = k.鍵;                      // 動作做完要捲回這一列,靠這個找
    列.__卡 = k;
    /* 拖曳排序:整列可以拖。
       ⚠ 只在「分類顏色順序」以外的情況才有意義 —— 排序若是自動算的,
         拖完下次重畫又跳回去。所以拖曳只在排序選「檔案順序」時開放。 */
    if (this.插件.設定.排序 === "檔案" && !未定) {
      列.draggable = true;
      列.ondragstart = (e) => {
        this.拖的是 = k;
        try { e.dataTransfer.setData("text/plain", k.鍵); e.dataTransfer.effectAllowed = "move"; } catch (x) {}
        列.style.opacity = "0.45";
      };
      列.ondragend = () => { 列.style.opacity = ""; this.拖的是 = null; 清掉落點線(); };
      列.ondragover = (e) => {
        if (!this.拖的是 || this.拖的是.鍵 === k.鍵) return;
        e.preventDefault();
        const r = 列.getBoundingClientRect();
        const 下半 = (e.clientY - r.top) > r.height / 2;
        清掉落點線();
        列.style.boxShadow = 下半 ? "inset 0 -3px 0 var(--text-accent)"
                                  : "inset 0 3px 0 var(--text-accent)";
        列.__下半 = 下半;
      };
      列.ondragleave = () => { 列.style.boxShadow = ""; };
      列.ondrop = async (e) => {
        e.preventDefault();
        const 來 = this.拖的是; 清掉落點線();
        if (!來 || 來.鍵 === k.鍵) return;
        await this.插件.寫手.搬到(this.file, 來, k, !!列.__下半, this.名單);
      };
    }
    if (this.要看的卡 === k.鍵) 列.addClass("tk-剛動過");
    if (!k.完成) 列.addClass("tk-todo");
    /* 三種狀態掛在列上,長相全部交給 CSS ——
       inline style 會被 tr:hover 壓過去,而且滑過去要能恢復可讀性。 */
    if (this.是封存(k)) 列.addClass("tk-封存");
    else if (k.完成) {
      const 樣 = this.插件.設定.完成樣式 || "淡化劃掉";
      if (樣.indexOf("淡化") >= 0) 列.addClass("tk-完淡");
      if (樣.indexOf("劃掉") >= 0) 列.addClass("tk-完劃");
    }
    列.style.setProperty("--tk-sec", this.插件.分類色(k.分類));
    const 欄 = [];
    if (this.狀態.融合中 && !未定) 欄.push(["融合", "center", (格) => this.畫融合勾(格, k)]);
    欄.push([未定 ? "補日期" : "日期", "center",
      (格) => 未定 ? this.畫補日期格(格, k) : this.畫日期格(格, k, 列)]);
    欄.push(["分類", "center", (格) => this.畫分類格(格, k, 列)]);
    欄.push(["內容", "left", (格) => this.畫內文(格, k, 列)]);
    欄.forEach(([名, 對, 產]) => {
      const 格 = 列.createEl("td");
      格.setAttribute("data-col", 名);       // 窄螢幕堆疊時當欄位標籤用
      st(格, "padding:7px 8px;vertical-align:top;text-align:" + 對 + ";");
      產(格);
    });
    this.掛色條(列, k);                       // 分類色線永遠貼在整列最前面那格的左緣
  }

  /* 分類色線:釘在「這一列最前面那一格」的左緣 —— 不管欄位怎麼排、
     卡片多寬多高,色線永遠貼著整列最左邊、永遠填滿整列高。 */
  掛色條(列, k) {
    const 首格 = 列.firstElementChild;
    if (!首格) return;
    try { const 舊 = 首格.querySelector(".tk-色條"); if (舊) 舊.remove(); } catch (e) {}
    const c = this.插件.分類色(k.分類);
    const 條 = 首格.createDiv();
    條.addClass("tk-色條");
    const 樣 = (寬, 亮) => "width:" + 寬 + "px;cursor:pointer;border-radius:0 3px 3px 0;" +
      "background:linear-gradient(180deg," + 透明(c, 0.85) + "," + c + ");" +
      "transition:width .12s ease,box-shadow .12s ease;" +
      (k.完成 ? "opacity:0.42;" : "box-shadow:" + (亮 ? "2px 0 7px " + 透明(c, 0.5) : "1px 0 3px " + 透明(c, 0.22)) + ";");
    st(條, 樣(6, false));
    首格.insertBefore(條, 首格.firstChild);
    條.title = k.分類 + " —— 點一下換顏色 / 換分類";
    條.onmouseenter = () => st(條, 樣(10, true));
    條.onmouseleave = () => st(條, 樣(6, false));
    條.onclick = (e) => { e.stopPropagation(); this.開分類選單(e, k); };
  }

  /* ---- 日期欄:置頂鈕釘在左上角,日期置中,逾期多一顆「設為今日」 ---- */
  畫日期格(格, k, 列) {
    const T = this.T;
    st(格, "padding:7px 6px;vertical-align:middle;text-align:center;position:relative;");
    // 📌 用絕對定位鎖死在左上角 —— 單日/區間、有沒有「設為今日」,它都待在同一個位置
    const 釘列 = 格.createDiv();
    st(釘列, "height:19px;");
    const 釘 = 釘列.createDiv();
    釘.addClass("tk-釘");
    /* ⚠ 沒置頂的也要看得到,只是淡淡的 —— 全部藏起來的話,
       根本分不出哪幾張有置頂、也不知道這裡可以按。
       置頂的用重點色、沒置頂的用最淡的字色,不必再靠 grayscale。 */
    st(釘, "display:inline-flex;cursor:pointer;line-height:0;user-select:none;" +
      "transition:opacity .12s ease,color .12s ease;" +
      (k.置頂 ? "color:var(--text-accent);opacity:1;" : "color:var(--text-faint);opacity:0.35;"));
    圖(釘, "pin", 13);
    釘.title = k.置頂 ? T.unpin : T.pin;
    釘.onclick = (e) => { e.stopPropagation(); this.切置頂(k); };

    const 醒目 = (日) => "font-variant-numeric:tabular-nums;white-space:nowrap;line-height:1.35;" +
      "font-size:0.88em;font-weight:600;text-align:center;" +
      (日 === this.今 ? "color:var(--text-accent);" : "");
    const 盒 = 格.createDiv();
    盒.addClass("tk-date");
    st(盒, "cursor:pointer;border-radius:4px;padding:2px 4px;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;gap:1px;");
    盒.title = T.changeDate;
    盒.onmouseenter = () => { 盒.style.background = "var(--background-modifier-border)"; };
    盒.onmouseleave = () => { 盒.style.background = ""; };
    盒.onclick = (e) => { e.stopPropagation(); this.開日期編輯(e, k); };
    st(盒.createDiv({ text: k.起日 ? 日期短(k.起日) : T.noDate }), 醒目(k.起日));
    if (k.迄日 && k.迄日 !== k.起日) {
      // 區間畫成:起日 / 一條細直線(不用～字元)/ 迄日
      const 線 = 盒.createDiv();
      線.addClass("tk-date-bar");
      st(線, "width:1px;height:8px;background:var(--text-faint);opacity:0.55;margin:1px 0;");
      st(盒.createDiv({ text: 日期短(k.迄日) }), 醒目(k.迄日));
    }
    if (k.循環 && !k.完成) {
      const 排 = 格.createDiv();
      st(排, "margin-top:5px;display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap;");
      /* 循環膠囊:圓框中間一點(circle-dot)+ 每N週。點下去就是改循環的面板。
         ⚠ 以前這裡只有一顆「延」,看不出這張是循環卡、也看不出隔多久一次,
           要滑到完成鈕上看 tooltip 才知道 —— 那等於沒說。 */
      const 循鈕 = 膠囊(排, "");
      st(循鈕, "display:inline-flex;align-items:center;gap:3px;font-size:0.66em;height:19px;" +
        "min-height:0;padding:0 7px 0 5px;border-radius:9px;cursor:pointer;box-shadow:none;" +
        "white-space:nowrap;color:var(--text-accent);" +
        "border:1px solid var(--text-accent);opacity:0.85;");
      圖(循鈕, "circle-dot", 11);
      循鈕.createSpan({ text: 循環說明短(k.循環) });
      循鈕.title = 循環說明(k.循環) + " ‧ " + T.cycleEdit;
      循鈕.onclick = (e) => { e.stopPropagation(); this.開循環編輯(e, k); };

      const 延 = 膠囊(排, T.postpone);
      st(延, "font-size:0.66em;height:19px;min-height:0;padding:0 7px;" +
        "border-radius:9px;cursor:pointer;box-shadow:none;white-space:nowrap;" +
        "color:var(--text-muted);" +
        "border:1px solid var(--background-modifier-border);");
      延.title = "只改日期、不留記錄(挑一天延期)";
      延.onclick = (e) => { e.stopPropagation(); this.開日期編輯(e, k); };
    }
    if (this.是逾期(k)) {
      const 今鈕 = 膠囊(格, T.setToday);
      今鈕.addClass("tk-日鈕");
      st(今鈕, "margin-top:5px;font-size:0.66em;height:19px;min-height:0;padding:0 7px;" +
        "border-radius:9px;cursor:pointer;box-shadow:none;white-space:nowrap;" +
        "color:var(--color-red, #e05252);" +
        "border:1px solid var(--color-red, #e05252);");
      今鈕.title = "已逾期,點一下把日期改成今天(" + this.今 + ")";
      今鈕.onclick = async (e) => {
        e.stopPropagation();
        if (今鈕.__鎖) return;
        今鈕.鎖住("…");
        const ok = await this.設日期(k, this.今);
        if (ok === false) return;
        // 改成今天之後,現在的篩選常常就看不到它了 —— 自動切到「本日」讓它看得見
        if (this.插件.設定.跳轉_設回今日) {
          this.狀態.篩 = { 型: "今日" }; this.狀態.偏移 = {};
          this.狀態.統計年 = String(new Date().getFullYear());
        }
        this.記剛動過(k, this.T.movedToday, () => this.設日期(k, k.起日));
        this.浮到最上(k);
      };
    }
  }

  // 「未寫日期」表專用的第一欄:一顆「設為今日」,按了就排進今天
  畫補日期格(格, k) {
    const T = this.T;
    st(格, "padding:7px 6px;vertical-align:middle;text-align:center;");
    const 鈕 = 膠囊(格, T.setToday);
    st(鈕, "font-size:0.7em;height:22px;min-height:0;padding:0 9px;border-radius:11px;" +
      "cursor:pointer;box-shadow:none;white-space:nowrap;" +
      "color:var(--text-accent);border:1px solid var(--text-accent);");
    鈕.title = "把這張排進今天(" + this.今 + ")";
    鈕.onclick = async (e) => {
      e.stopPropagation();
      if (鈕.__鎖) return;
      鈕.鎖住("…");
      const ok = await this.設日期(k, this.今);
      if (ok === false) return;
      if (this.插件.設定.跳轉_設回今日) {
        this.狀態.篩 = { 型: "今日" }; this.狀態.偏移 = {};
        this.狀態.統計年 = String(new Date().getFullYear());
      }
      this.記剛動過(k, this.T.movedToday, () => {});
      this.浮到最上(k);
    };
  }

  /* ---- 分類欄:圓點固定在整格正中間,指派人貼著下緣 ---- */
  /* ⚠ 1.4 改成單純的上下排列。舊版把指派人**絕對定位**在格子下緣,
     格子一矮(卡片只有一行的時候)那一層就壓到中間的完成圓點上。
     上下排 + gap 就不會有這個問題,而且圓點永遠在正中間。 */
  畫分類格(格, k, 列) {
    st(格, "padding:7px 6px;vertical-align:middle;text-align:center;");
    const 盒 = 格.createDiv();
    st(盒, "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "gap:5px;width:100%;min-height:48px;");
    this.畫完成點(盒.createDiv(), k);
    this.畫指派人(盒.createDiv(), k);
  }

  /* 沒做完 = 分類色的空心圈,做完 = 統一的綠色打勾(不管哪一區都同一個綠,
     掃一眼就知道哪些做完了)。點圓點就是打勾。 */
  畫完成點(格, k) {
    const T = this.T;
    st(格, "display:flex;justify-content:center;align-items:center;padding:0;");
    /* 剛剛才按過 → 圓點暫時換成「↺」反悔鈕,三秒內都可以退回去 */
    const 剛 = this.剛動過 && this.剛動過[k.鍵];
    if (剛 && Date.now() - 剛.時 < 反悔毫秒) {
      const 復 = 膠囊(格, "↺");
      st(復, "width:23px;height:23px;padding:0;border-radius:50%;cursor:pointer;flex:0 0 auto;" +
        "display:flex;align-items:center;justify-content:center;font-size:0.9em;line-height:1;" +
        "border:2px solid var(--text-faint);color:var(--text-muted);" +
        "background:var(--background-secondary);box-shadow:none;");
      復.title = 剛.說 + " —— 按錯了就點這裡退回去";
      復.onclick = async (e) => {
        e.stopPropagation();
        if (復.__鎖) return;
        復.鎖住("…");
        delete this.剛動過[k.鍵];
        await 剛.退();
      };
      return;
    }
    /* 循環卡的完成欄不是勾選框,而是「本次完成」。
       ⚠ 長相是**圓框中間一點**(跟 circle-dot 同一個語彙)——
         一眼就分得出「這張是循環的」,跟一般卡片的空心圈不一樣。
         滑過去中間那一點才變成勾,表示「按下去 = 這一次做完了」。 */
    if (k.循環 && !k.完成) {
      const b = 膠囊(格, "");
      const 畫 = (滑過) => {
        b.empty();
        st(b, "width:23px;height:23px;padding:0;border-radius:50%;cursor:pointer;flex:0 0 auto;" +
          "display:flex;align-items:center;justify-content:center;line-height:1;" +
          "box-shadow:none;color:var(--text-accent);background:transparent;" +
          "border:2px solid var(--text-accent);transition:transform .12s ease;" +
          (滑過 ? "transform:scale(1.12);" : ""));
        if (滑過) 圖(b, "check", 13);
        else st(b.createDiv(), "width:7px;height:7px;border-radius:50%;background:currentColor;");
      };
      畫(false);
      b.title = 循環說明(k.循環) + " —— 按一下「本次完成」:日期推到下一次,並留一條記錄" +
        (k.完成過 ? "(已完成 " + k.完成過 + " 次)" : "");
      b.onmouseenter = () => 畫(true);
      b.onmouseleave = () => 畫(false);
      b.onclick = async (e) => {
        e.stopPropagation();
        if (b.__鎖) return;
        b.鎖住(); b.empty(); st(b.createDiv({ text: "…" }), "font-size:0.8em;");
        await this.本次完成(k);
      };
      return;
    }
    const c = this.插件.分類色(k.分類), 完 = k.完成;
    const 鈕 = 格.createDiv();
    if (完) 圖(鈕, "check", 13);
    const 樣 = (放大) => "width:21px;height:21px;border-radius:50%;cursor:pointer;flex:0 0 auto;" +
      "display:flex;align-items:center;justify-content:center;font-size:0.8em;font-weight:700;" +
      "line-height:1;transition:transform .12s ease;" +
      (完 ? "color:#fff;background:" + 完成色 + ";border:2px solid " + 完成色 + ";"
          : "color:" + c + ";background:transparent;border:2px solid " + 透明(c, 0.75) + ";") +
      (放大 ? "transform:scale(1.12);" : "");
    st(鈕, 樣(false));
    鈕.title = k.分類 + " ‧ " + (完 ? this.T.undone : this.T.done);
    鈕.onmouseenter = () => st(鈕, 樣(true));
    鈕.onmouseleave = () => st(鈕, 樣(false));
    鈕.onclick = (e) => { e.stopPropagation(); this.切完成(k); };
  }

  畫指派人(格, k) {
    const T = this.T;
    st(格, "display:flex;justify-content:center;align-items:center;min-height:0;");
    if (k.指派) {
      /* ⚠⚠ 指派人在這一格裡是**最輕的一層**,不可以比完成圓點搶眼。
         1.3 做成實心圓形名章,結果反而比旁邊那顆空心的完成圓點還重,
         兩顆圓形擠在一起,視線先看到人、才看到「這張做完了沒有」—— 主次顛倒。
         1.4:沒有邊框、沒有底色、沒有形狀,就是一行小字,顏色是那個人的顏色。
         需要的時候認得出是誰就夠了。 */
      const c = this.插件.人色(k.指派);
      const 標 = 格.createDiv({ text: String(k.指派) });
      st(標, "font-size:0.68em;font-weight:600;line-height:1.2;white-space:nowrap;" +
        "cursor:pointer;padding:0;background:none;border:0;opacity:0.85;color:" + c + ";");
      標.title = "指派人:" + k.指派 + "(點一下改)";
      標.onclick = (e) => { e.stopPropagation(); this.改指派(e, k); };
    } else {
      const 空 = 格.createDiv();
      st(空, "cursor:pointer;color:var(--text-faint);opacity:0.35;font-size:0.72em;" +
        "padding:0 4px;white-space:nowrap;display:inline-flex;align-items:center;gap:3px;");
      圖(空, "plus", 11);
      空.createSpan({ text: T.assignee });
      空.onmouseenter = () => { 空.style.opacity = "1"; };
      空.onmouseleave = () => { 空.style.opacity = "0.35"; };
      空.onclick = (e) => { e.stopPropagation(); this.改指派(e, k); };
    }
  }

  /* ---- 內容欄 ----
     上排 = 文欄(主題行 + 寫留言位 + 留言區 + 內容),右上角是這張卡片的動作組。 */
  畫內文(格, k, 列) {
    const T = this.T, s = this.狀態;
    格.empty();
    st(格, "padding:7px 8px;vertical-align:top;text-align:left;");
    const 上排 = 格.createDiv();
    上排.addClass("tk-上排");
    st(上排, "display:flex;align-items:flex-start;gap:6px;");
    const 文區 = 上排.createDiv();
    文區.addClass("tk-文欄");
    st(文區, "flex:1 1 auto;min-width:0;");

    const 編修中 = s.編修 === k.鍵;
    const 已封存 = this.是封存(k);

    /* 題行一分為二:左邊主題膠囊 + 狀態小字,右邊整組動作。
       ⚠ 高度寫死 22px(編修時的主題輸入框也是 22px)——兩邊一樣高,
         底下的留言和內容才不會往下掉一點點。 */
    const 題行 = 文區.createDiv();
    題行.addClass("tk-題行");
    st(題行, "display:flex;align-items:center;gap:6px;margin-bottom:3px;min-width:0;" +
      "min-height:" + 主題高 + "px;flex-wrap:wrap;");
    const 左組 = 題行.createDiv();
    左組.addClass("tk-題左");
    st(左組, "display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0;flex:0 1 auto;");
    if (編修中) {
      const 題輸 = 左組.createEl("input", { type: "text" });
      題輸.value = k.主題 || "";
      題輸.placeholder = T.topic;
      st(題輸, "flex:0 1 176px;min-width:88px;height:" + 主題高 + "px;min-height:0;" +
        "box-sizing:border-box;padding:0 9px;margin:0;border:0;outline:none;" +
        "line-height:" + 主題高 + "px;font-size:0.84em;font-weight:700;" +
        "border-radius:" + Math.round(主題高 / 2) + "px;" +
        "background:var(--background-modifier-border);color:var(--text-normal);");
      this.題編框 = 題輸;
    } else if (k.主題) {
      const 題籤 = 左組.createDiv();
      題籤.addClass("tk-主題");
      畫文字(題籤, k.主題, this.app, this.file ? this.file.path : "");
      st(題籤, 分類樣式類(this.插件.分類色(k.分類)) +
        "font-weight:700;font-size:0.84em;cursor:pointer;" +
        "display:inline-flex;align-items:center;height:" + 主題高 + "px;box-sizing:border-box;");
      題籤.title = "主題「" + k.主題 + "」。點一下把同主題的卡片都篩出來";
      題籤.onclick = (e) => { e.stopPropagation(); this.帶入主題(k.主題); };
    }
    /* 主題的編輯是獨立一顆鍵,就放在主題右邊 ——
       跟內容的「編輯」分開,改主題不用連內容一起進編修模式。 */
    if (!編修中) {
      /* ⚠ 0.9.0 換掉這顆圖示。舊的是「✎」,但同一列右邊的「最後編修時間」也是 ✎,
         兩個長得一模一樣、意思卻完全不同(一個是動作、一個是資訊)。
         現在:改主題 = square-pen(有框的筆,一看就是可按的),時間 = clock。 */
      const 改題 = 左組.createSpan();
      改題.addClass("tk-改題");
      st(改題, "display:inline-flex;align-items:center;color:var(--text-faint);cursor:pointer;" +
        "padding:0 2px;user-select:none;");
      圖(改題, "square-pen", 13);
      改題.title = k.主題 ? T.editTopic : T.addTopic;
      改題.onclick = (e) => { e.stopPropagation(); this.改主題(e, k); };
    }
    /* 狀態不要跟主題長得一樣:主題是有底色的膠囊,狀態就做成「小記號 + 文字」 */
    const 狀態字 = (文, 色) => st(左組.createDiv({ text: 文 }),
      "font-size:0.72em;font-weight:600;letter-spacing:0.04em;white-space:nowrap;" +
      "padding:0;background:transparent;border:0;color:" + 色 + ";");
    /* 狀態小記號也換成同一套 Lucide —— emoji 在 Windows 上又大又花,跟旁邊對不齊 */
    const 狀態圖 = (名, 文, 色) => {
      const d = 左組.createDiv();
      st(d, "display:inline-flex;align-items:center;gap:3px;font-size:0.72em;font-weight:600;" +
        "letter-spacing:0.04em;white-space:nowrap;color:" + 色 + ";");
      圖(d, 名, 12);
      d.createSpan({ text: 文 });
      return d;
    };
    if (k.完成) 狀態圖("check", T.doneTag, 完成色);
    else if (已封存) 狀態圖("archive", T.archivedTag, "var(--text-faint)");
    // 資訊(不是動作)掛在主題那一行的右邊:最後動過的時間、留言則數
    const 訊 = 題行.createDiv();
    st(訊, "margin-left:auto;display:flex;align-items:center;gap:8px;flex:0 0 auto;");
    this.畫卡片工具(題行.createDiv(), k, 編修中, 已封存, "整張");
    const 訊條 = (名, 文, 提示) => {
      const d = 訊.createDiv();
      st(d, "display:inline-flex;align-items:center;gap:3px;font-size:0.68em;" +
        "color:var(--text-faint);white-space:nowrap;");
      圖(d, 名, 11);
      d.createSpan({ text: 文 });
      if (提示) d.title = 提示;
      return d;
    };
    if (k.留言.length) 訊條("message-square", String(k.留言.length));
    if (k.編修時) 訊條("clock", k.編修時.slice(11), "最後動過:" + k.編修時);

    // 留言:整區排在內容的上方。寫新留言的框在最上面(主題正下方)。
    const 寫位 = 文區.createDiv();
    寫位.addClass("tk-寫位");
    if (s.寫留言 === k.鍵) this.畫寫留言(寫位, k);
    this.畫留言區(文區, k);
    /* ⚠ 動作組(封存 ‧ 編輯 ‧ 留言)釘在**內容第一行的右邊**,不是主題那一行。
       用絕對定位釘住,內容那邊固定讓出同寬的位置(動作留寬),
       文字不會跑到按鈕底下,而且閱讀跟編輯讓一樣寬 —— 折行位置才不會變。 */
    const 內盒 = 文區.createDiv();
    st(內盒, "position:relative;");
    const 具位 = 內盒.createDiv();
    st(具位, "position:absolute;right:0;top:0;z-index:2;");
    this.畫卡片工具(具位.createDiv(), k, 編修中, 已封存, "內容");
    this.畫內容區(內盒, k, 編修中);
  }

  /* 卡片動作組:edited 時間 ‧ 封存/✕ ‧ 編輯/儲存 ‧ 留言 ‧ ⋯
     ⚠ 編修時「編輯→儲存」「封存→✕」在原位換字,寬高都寫死不變 ——
       位置一變,按下去的瞬間畫面就會晃一下。 */
  /* 動作分兩邊放(照 comment):
       右上角(主題那一行)= 封存 ‧ 留言 —— 這兩個是「對整張卡片」做的事
       內容第一行右邊    = 編輯      —— 這個是「對內容」做的事,就放在內容旁邊
     編修時兩邊都原地換字:封存→✕、編輯→儲存,寬高都寫死不變。 */
  畫卡片工具(盒, k, 編修中, 已封存, 哪一組) {
    const T = this.T, s = this.狀態;
    盒.addClass("tk-動作");
    // 淡入淡出交給 CSS 的 .tk-動作 / tr:hover 管 —— inline 寫 opacity 會壓過 :hover,
    // 那樣按鈕就永遠不會亮起來
    // ⚠ 時間和留言則數已經放在主題那一行(資訊不是動作),這裡只留真正的動作
    /* ⚠⚠ 這一塊以前有自己的底色(background-primary)。它是為了擋住底下的文字,
       但內容第一行本來就已經留了 動作留寬 的右邊空間,根本沒有東西會跑到按鈕底下。
       留著的代價是:滑鼠移到整列上時,列的底色變成 hover 色,這一塊卻還是原本的底色,
       於是按鈕後面浮出一塊圓角 6px 的方形 —— 看起來就是「按鈕的顏色溢出框框」。
       兩種底色疊在一起才是那個溢出,不是按鈕本身。拿掉就乾淨了。 */
    st(盒, "display:flex;align-items:center;gap:7px;flex:0 0 auto;" +
      "background:transparent;padding-left:6px;");

    /* ⚠ 1.3:動作鈕全部只剩圖示,沒有文字。
       四顆字鈕排在一起會讓卡片右上角變成一條字牆,而且中英文一換長度就跳。
       圖示固定寬、看一眼就認得,說明留在 tooltip 裡。 */
    const 具樣 = (色, 寬) => "display:inline-flex;align-items:center;justify-content:center;" +
      "flex:0 0 auto;width:" + (寬 || 26) + "px;height:20px;min-height:0;padding:0;margin:0;box-sizing:border-box;" +
      "font-size:0.7em;line-height:1;border-radius:10px;cursor:pointer;box-shadow:none;" +
      "white-space:nowrap;color:" + 色 + ";" +
      "border:1px solid var(--background-modifier-border);";
    // ⚠ 這裡**故意不寫 background** —— inline 的 background 會蓋過
    //   CSS 裡 .tk-膠囊:hover 的底色,結果滑過去完全沒反應。底色交給 CSS。

    if (哪一組 === "內容") {
      /* ⚠ 封存 = 這張已經收起來了,不再是「還在用的卡片」。
         還讓人編輯的話,等於封存只是換個地方放,語意就散掉了。
         要改就先「取消封存」,那是一個明確的動作。 */
      if (已封存) return;
      /* ⚠ 1.2:內容改成隨打隨存,所以這一顆不再是「儲存」而是「完成」——
         儲存是一個動作(你要記得按),完成是一個狀態(你已經寫完了)。
         旁邊那顆是「復原」:退回這一次編輯開始時的樣子。
         整段不小心刪光的時候,那是唯一的救生索 —— 所以它跟完成放在一起,不藏在選單裡。 */
      const 乙 = 膠囊(盒, "");
      st(乙, 具樣(編修中 ? "var(--text-accent)" : "var(--text-muted)") +
        (編修中 ? "border-color:var(--text-accent);" : ""));
      圖(乙, 編修中 ? "check" : "pencil", 13);
      乙.title = 編修中 ? T.finish : T.edit;
      乙.onclick = async (e) => {
        e.stopPropagation();
        if (編修中) { this.完成編輯(k); return; }
        // 上一張如果還開著,先把它的字寫掉再換人
        if (this.編修卡 && this.編修卡.鍵 !== k.鍵) { await this.收掉編修(); this.畫(); }
        s.編修 = k.鍵; s.寫留言 = null;
        this.編修卡 = k;
        this.就地重畫(e, k);          // ⚠ 只換那一格 —— 重畫整份清單會讓畫面自己跳走
      };
      return;
    }

    /* ⚠ 1.2 拿掉了編修時的「取消」。隨打隨存之後,取消是一句謊話 ——
       字早就寫進檔案了,按下去也退不回來。真正的退路是那顆「復原」。 */
    const 甲 = 膠囊(盒, "");
    st(甲, 具樣(已封存 ? "var(--text-accent)" : "var(--text-faint)") +
      (已封存 ? "border-color:var(--text-accent);" : ""));
    圖(甲, 已封存 ? "archive-restore" : "archive", 13);
    甲.title = 已封存 ? T.unarchive : T.archive;
    甲.onclick = async (e) => {
      e.stopPropagation();
      /* 危險動作先問一次,而且就地問,不要跳對話框把版面推歪。
         ⚠ 1.1 加了一條會自己走完的進度條:以前「確定?」只是靜靜地待 2.6 秒,
           沒按第二下就悄悄變回「封存」—— 使用者不知道自己有多少時間,
           也不知道剛剛那一下到底算不算。現在條子走完 = 當作你不要封存了。 */
      if (甲.__確認) { 甲.__確認 = false; await this.切封存(k, 已封存); return; }
      甲.__確認 = true;
      甲.empty();
      甲.style.position = "relative";
      甲.style.overflow = "hidden";
      甲.style.color = "var(--color-red, #e05252)";
      甲.style.borderColor = "var(--color-red, #e05252)";
      const 條 = 甲.createDiv();
      條.addClass("tk-倒數");
      const 記 = 甲.createDiv();
      st(記, "position:relative;z-index:1;display:inline-flex;");
      圖(記, "check", 13);
      甲.title = T.sure;
      const 收回 = () => {
        if (!甲.__確認) return;
        甲.__確認 = false;
        甲.empty();
        甲.style.position = ""; 甲.style.overflow = "";
        甲.style.color = 已封存 ? "var(--text-accent)" : "var(--text-faint)";
        甲.style.borderColor = 已封存 ? "var(--text-accent)" : "var(--background-modifier-border)";
        圖(甲, 已封存 ? "archive-restore" : "archive", 13);
        甲.title = 已封存 ? T.unarchive : T.archive;
      };
      條.addEventListener("animationend", 收回);
      setTimeout(收回, 2900);          // 保險:動畫被系統關掉時也要收回來
    };
    /* 已封存的卡片:刪除直接擺出來。
       ⚠ UX 的順序是有意的 —— 封存(可回復) → 刪除(不可回復)。
         沒封存之前看不到刪除,封存之後就不必再去翻選單找,
         因為會去封存區的人,十次有九次就是要清掉它。 */
    if (已封存 && !編修中) {
      const 刪 = 膠囊(盒, "");
      st(刪, 具樣("var(--color-red, #e05252)") + "border-color:var(--background-modifier-border);");
      圖(刪, "trash-2", 13);
      刪.title = T.deleteCard;
      刪.onclick = (e) => { e.stopPropagation(); this.問刪除(k); };
    }

    /* ⚠ 封存的卡片不給留言 —— 收起來的東西不會再有人接話。
       1.0 也把「⋯」拿掉了:一張卡片上四顆按鈕太吵,而且刪除已經直接擺出來,
       選單裡剩下的(置頂、移到別區、回原始 Markdown)都另有入口 ——
       置頂在日期欄、換分類點色條、回 Markdown 在分頁的「⋯」。 */
    if (已封存) return;

    const 丙 = 膠囊(盒, "");
    st(丙, 具樣("var(--text-muted)"));
    圖(丙, "message-square", 13);
    丙.title = T.comment;
    丙.onclick = async (e) => {
      e.stopPropagation();
      if (s.編修) await this.收掉編修();          // 編修框要被換掉了,先把字寫進去
      s.寫留言 = (s.寫留言 === k.鍵) ? null : k.鍵;
      s.編修 = null;
      this.就地重畫(e, k);
    };
  }

  /* ---- 留言 ---- */
  /* 留言:排在內容的上方,越新的越上面。
     跟內容一樣做收合 —— 平常只露 3 則,其餘收起來,展開收合都有動畫,
     而且留言區任何一處都點得動(點到連結、編輯鈕不算)。 */
  畫留言區(文區, k) {
    if (!k.留言.length) return;
    const T = this.T;
    const 開 = !!this.狀態.留言展開[k.鍵] || !!this.狀態.展開全部;
    const 多 = k.留言.length > 露幾則留言;
    const 顯 = (多 && !開) ? k.留言.slice(0, 露幾則留言) : k.留言;
    const 區 = 文區.createDiv();
    區.addClass("tk-留區");
    st(區, "display:flex;flex-direction:column;gap:6px;margin:0 0 8px;padding:3px 0 4px 9px;" +
      "border-left:2px solid var(--background-modifier-border);" + (多 ? "cursor:pointer;" : ""));
    let 末 = null;
    顯.forEach(c => { 末 = this.畫一則留言(區, k, c); });
    if (多) {
      const 鈕 = (末 || 區).createSpan({
        text: 開 ? T.less : (T.moreComments.replace("N", String(k.留言.length - 露幾則留言)))
      });
      st(鈕, "font-size:0.74em;color:var(--text-faint);cursor:pointer;" +
        "margin-left:8px;white-space:nowrap;user-select:none;");
      鈕.onclick = (e) => { e.stopPropagation(); this.切留言(k, 區); };
      this.掛收合(區, () => this.切留言(k, 區));
    }
  }
  切留言(k, 區) {
    const 舊高 = Math.ceil(區.getBoundingClientRect().height);
    if (this.狀態.留言展開[k.鍵]) delete this.狀態.留言展開[k.鍵];
    else this.狀態.留言展開[k.鍵] = true;
    const 格 = 區.closest ? 區.closest("td") : null;
    const 列 = 格 ? 格.parentElement : null;
    if (!格 || !列) { this.重畫清單(); return; }
    this.畫內文(格, k, 列);
    const 新區 = 格.querySelector(".tk-留區");
    if (新區) 滑開(新區, 舊高);
  }

  畫一則留言(區, k, c) {
    const T = this.T;
    const 行 = 區.createDiv();
    行.addClass("tk-留");
    st(行, "display:flex;align-items:flex-start;gap:8px;font-size:0.95em;line-height:1.55;");
    const pc = this.插件.人色(c.人);
    const 頭 = 行.createDiv({ text: String(c.人 || "?").slice(-1) });
    st(頭, "flex:0 0 auto;width:20px;height:20px;border-radius:50%;margin-top:0.15em;" +
      "display:flex;align-items:center;justify-content:center;line-height:1;" +
      "font-size:0.62em;font-weight:700;color:#141414;background:" + pc + ";");
    頭.title = c.人;
    const 文 = 行.createDiv();
    st(文, "flex:1 1 auto;min-width:0;word-break:break-word;");

    if (this.狀態.改留 === c.id) {
      const inp = 文.createEl("textarea");
      st(inp, "width:100%;min-height:2.1em;resize:none;padding:5px 8px;" +
        "font-family:var(--font-text);font-size:0.94em;line-height:1.5;border-radius:6px;" +
        "background:var(--background-secondary);border:1px solid var(--text-accent);" +
        "color:var(--text-normal);");
      inp.value = c.文;
      掛md快捷(inp);
      inp.onclick = (e) => e.stopPropagation();
      inp.onkeydown = (e) => {
        if ((e.ctrlKey || e.metaKey) && 是Enter鍵(e)) { e.preventDefault(); this.存留言(k, c, inp.value); return; }
        if (e.isComposing || e.keyCode === 229) return;
        if (是Enter鍵(e) && !e.shiftKey) { e.preventDefault(); this.存留言(k, c, inp.value); return; }
        if (e.key === "Escape" || e.code === "Escape") { e.preventDefault(); this.狀態.改留 = null; this.重畫清單(); }
      };
      setTimeout(() => { try { inp.focus(); inp.select(); } catch (e) {} }, 0);
      return;
    }

    /* ⚠ 誰能按「編輯」:認的是這台電腦記住的人(localStorage),
       不是「指派人下拉現在選到誰」。舊版用後者,那個值一重新整理就沒了,
       自己留的話反而看不到編輯 —— 260909v1.17 修掉的就是這個。
       還沒認過人的新電腦先全開,認過之後就只剩自己的。 */
    const 我 = this.我是誰();
    if (!this.是封存(k) && (!我 || c.人 === 我)) {      // 封存的卡片:留言也鎖住
      const b = 文.createSpan({ text: T.edit });
      b.addClass("tk-留具");
      st(b, "float:right;margin-left:10px;font-size:0.76em;color:var(--text-faint);cursor:pointer;");
      b.title = T.clearToDelete;
      b.onclick = (e) => { e.stopPropagation(); this.狀態.改留 = c.id; this.畫(); };
    }
    畫文字(文, c.文, this.app, this.file ? this.file.path : "");
    const t = 文.createSpan({ text: 多久前(留言時值(c), T) });
    st(t, "font-size:0.78em;color:var(--text-faint);white-space:nowrap;margin-left:8px;");
    t.title = c.人 + " ‧ " + c.日 + " " + c.分;
    return 文;          // 「還有 N 則」要接在最後一則的尾端
  }

  畫寫留言(寫位, k) {
    const T = this.T, 我 = this.我是誰();
    if (!我) {
      const 殼 = 寫位.createDiv();
      st(殼, "display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:0 0 8px;");
      st(殼.createSpan({ text: T.whoAmI + "：" }), "font-size:0.76em;color:var(--text-faint);");
      this.名單.forEach(n => {
        const c = this.插件.人色(n);
        const b = 殼.createEl("button", { text: n });
        st(b, "padding:2px 11px;font-size:0.82em;cursor:pointer;border-radius:12px;box-shadow:none;" +
          "color:" + c + ";background:" + 透明(c, 0.15) + ";border:1px solid transparent;");
        b.onclick = () => { 存我是誰(n); this.畫(); };
      });
      return;
    }
    const 盒 = 寫位.createDiv();
    st(盒, "display:flex;align-items:flex-start;gap:8px;margin:0 0 8px;padding-left:7px;" +
      "border-left:2px solid var(--interactive-accent, var(--text-accent));");
    const pc = this.插件.人色(我);
    const 頭 = 盒.createDiv({ text: 我.slice(-1) });
    st(頭, "flex:0 0 auto;width:20px;height:20px;border-radius:50%;margin-top:0.5em;" +
      "display:flex;align-items:center;justify-content:center;line-height:1;" +
      "font-size:0.62em;font-weight:700;color:#141414;background:" + pc + ";");
    const ta = 盒.createEl("textarea");
    ta.placeholder = T.placeholder;
    st(ta, "flex:1 1 auto;min-width:0;min-height:2.1em;resize:none;" +
      "padding:5px 8px;font-family:var(--font-text);font-size:0.94em;line-height:1.5;" +
      "border-radius:6px;background:var(--background-secondary);" +
      "border:1px solid var(--background-modifier-border);color:var(--text-normal);");
    ta.onclick = (e) => e.stopPropagation();
    // 鍵盤跟新增框、編修框完全一樣:Enter 換行,Shift/Ctrl+Enter 送出,Esc 取消
    /* ⚠ 留言和內容一樣:**Enter = 儲存,Shift+Enter = 換行**。
       (新增框例外 —— 它同時是搜尋框,Enter 送出會變成打字打到一半就開卡片。) */
    ta.onkeydown = (e) => {
      if ((e.ctrlKey || e.metaKey) && 是Enter鍵(e)) { e.preventDefault(); this.送留言(k, 我, ta.value, ta); return; }
      if (e.isComposing || e.keyCode === 229) return;
      if (是Enter鍵(e) && !e.shiftKey) { e.preventDefault(); this.送留言(k, 我, ta.value, ta); return; }
      if (e.key === "Escape" || e.code === "Escape") { e.preventDefault(); this.狀態.寫留言 = null; this.重畫清單(); }
    };
    ta.oninput = () => { ta.style.height = "auto"; ta.style.height = Math.ceil(ta.scrollHeight) + "px"; };
    const 送 = 盒.createEl("button", { text: T.send });
    st(送, "flex:0 0 auto;align-self:flex-start;margin-top:2px;padding:3px 11px;font-size:0.78em;" +
      "border-radius:6px;cursor:pointer;box-shadow:none;font-weight:700;" +
      "color:var(--text-on-accent, #fff);background:var(--interactive-accent);" +
      "border:1px solid var(--interactive-accent);");
    送.title = "Shift+Enter 也可以送出";
    this.掛連結建議(ta);
    掛md快捷(ta);
    送.onclick = (e) => { e.stopPropagation(); this.送留言(k, 我, ta.value, ta); };
    setTimeout(() => { try { ta.focus({ preventScroll: true }); } catch (e) {} }, 0);
  }

  /* ---- 內容:閱讀跟編修用同一個縮排(17px),字才不會左右跳 ---- */
  畫內容區(文區, k, 編修中) {
    const 掛行縮排 = 17;
    if (編修中) {
      /* ⚠ 1.3:編修框改成看得出邊界的一個框(跟留言的輸入框同一套長相)。
         以前是「透明的 textarea 直接躺在卡片上」,進了編輯模式畫面幾乎沒變,
         常常不知道自己到底在不在編輯 —— 一個框就解決了。 */
      const 框 = 文區.createDiv();
      框.addClass("tk-編框");
      /* ⚠ 完成鈕是絕對定位釘在內容區右上角的,編輯框如果拉滿寬,
         框線就會從鈕底下穿過去(看起來像壓到那個勾)。右邊讓出它的寬度就好。 */
      框.style.marginRight = "34px";
      const ta = 框.createEl("textarea");
      ta.addClass("tk-編");
      /* ⚠ 不再在文字裡塞「．」。1.2 塞進去是為了讓編輯時看得到項目符,
         但那會變成使用者要自己管的字(刪一半、貼上時多一顆…)。
         現在改成單純**縮排**:內容比主題再右邊一點,層級關係就看得出來了。 */
      st(ta, "display:block;vertical-align:top;width:100%;box-sizing:border-box;" +
        "padding:0 4px 0 " + 掛行縮排 + "px;margin:0;border:0;outline:none;resize:none;" +
        "font-family:var(--font-text);font-size:0.94em;line-height:1.55;" +
        "background:transparent;color:var(--text-normal);");
      const 草 = this.草稿 && this.草稿[k.鍵];
      ta.value = (草 !== undefined && 草 !== null) ? 草 : k.內容行.join("\n");
      ta.onclick = (e) => e.stopPropagation();

      const 長高 = () => {
        ta.style.height = "auto";
        ta.style.height = Math.ceil(ta.scrollHeight) + "px";
      };
      /* ⚠⚠ 1.4:**完全不自動捲動了。**
         1.2 是每打一個字就檢查游標,1.3 收到「只有框長高才檢查」——
         都還是會在某些時候自己動一下,而使用者要的很簡單:
         **跟一般 Markdown 編輯器一樣,畫面不要自己跑。**
         瀏覽器本來就會在游標跑出可視範圍時自己把它捲回來,我們什麼都不做才是對的。
         量游標() 留著,但這裡不再呼叫它。 */

      // 隨打隨存:停手 900 毫秒就寫進檔案
      const 排存 = () => {
        this.草稿 = this.草稿 || {};
        this.草稿[k.鍵] = ta.value;
        clearTimeout(this.存計時);
        this.存計時 = setTimeout(() => { this.自動存(k, ta); }, 900);
      };
      this.排存 = 排存;
      this.編修卡 = k;

      掛md快捷(ta, () => { 長高(); 排存(); });

      ta.onkeydown = (e) => {
        /* 收工的三條路都在這裡:Esc、Shift+Enter、Ctrl/Cmd+Enter。
           ⚠ Enter 是換行(跟一般 Markdown 一樣),不要再拿它當儲存鍵。 */
        if (e.key === "Escape" || e.code === "Escape") { e.preventDefault(); this.完成編輯(k); return; }
        if (e.isComposing || e.keyCode === 229) return;
        if (是Enter鍵(e) && (e.shiftKey || e.ctrlKey || e.metaKey)) {
          e.preventDefault(); this.完成編輯(k); return;
        }
      };
      ta.oninput = () => { 長高(); 排存(); };
      this.編框 = ta;
      this.掛連結建議(ta);
      /* ⚠ 游標跳到第一行開頭(不是最後一行),而且**絕對不要捲動頁面**:
         preventScroll 擋掉 focus 自己的捲動,外面 重畫清單() 也已經把 scrollTop 放回去了。 */
      setTimeout(() => {
        try { 長高(); ta.focus({ preventScroll: true }); ta.setSelectionRange(0, 0); ta.scrollTop = 0; } catch (e) {}
      }, 0);
      return;
    }
    const 區 = 文區.createDiv();
    區.addClass("tk-文區");
    區.style.cursor = k.內容行.length > 2 ? "pointer" : "";
    /* 收合仿聊天軟體:平常只露兩行,第三行淡淡露一點當預告,
       「⋯⋯查看更多」用絕對定位釘在內容區的右下角 ——
       不接在文字裡、不浮動,展開/收合時不會從一行搬到另一行,右邊也不會抖。
       ⚠ 動作留寬 92px:文字不能跑到右上角那組按鈕底下,
         而且閱讀跟編修要留一樣寬,折行的位置才會一模一樣。 */
    const 露幾行 = 2;
    const 開 = !!this.狀態.展開[k.鍵] || !!this.狀態.展開全部;
    const 多 = k.內容行.length > 露幾行;
    const 要收 = 多 && !開;
    st(區, "position:relative;" + (要收 ? "padding-bottom:2px;" : ""));
    const 顯行 = 要收 ? k.內容行.slice(0, 露幾行 + 1) : k.內容行;
    顯行.forEach((t, i) => {
      const 行 = 區.createDiv();
      行.addClass("卡片內文");
      const 預告 = 要收 && i === 露幾行;      // 第三行只露一半高度當預告
      st(行, "padding-left:" + 掛行縮排 + "px;text-indent:-" + 掛行縮排 + "px;" +
        "line-height:1.55;font-size:0.94em;" + (i === 0 ? "padding-right:" + 動作留寬 + "px;" : "") +
        (預告 ? "max-height:0.8em;overflow:clip;opacity:0.42;" +
                "mask-image:linear-gradient(180deg,#000 30%,transparent);" +
                "-webkit-mask-image:linear-gradient(180deg,#000 30%,transparent);" : ""));
      行.createSpan({ text: 項目符 });
      // [[筆記]] 畫成真的可以點的連結,http(s) 也是
      畫文字(行, t, this.app, this.file ? this.file.path : "");
    });
    if (多) {
      /* ⚠ 接在**真正露出的最後一行**尾端 —— 不是那條淡淡的預告行
         (掛在預告行上會跟著一起淡掉、也跟著被裁掉一半)。 */
      const 行們 = 區.querySelectorAll(".卡片內文");
      const 尾 = 要收 ? 行們[Math.max(0, 露幾行 - 1)] : 行們[行們.length - 1];
      const 鈕 = (尾 || 區).createSpan({ text: 開 ? this.T.less : this.T.more });
      鈕.addClass("tk-更多");
      鈕.onclick = (e) => { e.stopPropagation(); this.切內容(k, 區); };
      this.掛收合(區, () => this.切內容(k, 區));
    }
  }

  /* 全域可點擊收合。
     ⚠ 但是「點住拖曳選字」也會觸發 click —— 使用者是要複製文字,不是要收合。
     所以:按下去記座標,放開時如果有選到字、或滑鼠移動超過 4px,就不算點擊。 */
  掛收合(區, 動作) {
    let x = 0, y = 0;
    區.style.cursor = "pointer";
    區.addEventListener("mousedown", (e) => { x = e.clientX; y = e.clientY; });
    區.addEventListener("click", (e) => {
      if (e.target.closest && e.target.closest("a,button,textarea,input,.tk-留具")) return;
      if (Math.abs(e.clientX - x) > 4 || Math.abs(e.clientY - y) > 4) return;   // 拖過 = 在選字
      let 選 = "";
      try { 選 = String(window.getSelection()); } catch (ex) {}
      if (選 && 選.trim()) return;                                              // 有選到字 = 在複製
      動作();
    });
  }

  /* 展開 / 收合內容。⚠ 動畫只用在這種「內容量真的變了」的地方(準則第五章)。
     做法:先量現在的高度,重畫那一格,再從舊高度滑到新高度 —— 起點要對,
     不要從 0 長出來,也不要先塌回去再彈開(那個「閃一下」就是這樣來的)。 */
  切內容(k, 區) {
    const 舊高 = Math.ceil(區.getBoundingClientRect().height);
    if (this.狀態.展開[k.鍵]) delete this.狀態.展開[k.鍵];
    else this.狀態.展開[k.鍵] = true;
    const 格 = 區.closest ? 區.closest("td") : null;
    const 列 = 格 ? 格.parentElement : null;
    if (!格 || !列) { this.重畫清單(); return; }
    this.畫內文(格, k, 列);
    const 新區 = 格.querySelector(".tk-文區");
    if (新區) 滑開(新區, 舊高);
  }

  /* ---- 選單 / 小浮框 ---- */
  /* ---- 換顏色 / 換分類:跟原版一樣,就地把「分類欄」那一格換成色盤 ----
     不是下拉選單 —— 色盤要看得到顏色本身才選得下去。
     一顆色點的意思分兩種:
       ・還沒有別的區用這個顏色(圓點是淡的)→ 按了是「把這一區改成這個顏色」
       ・已經有某一區在用這個顏色(圓點是實的)→ 按了是「把這張卡片搬去那一區」
     這樣一個色盤同時解決「換色」和「換區」,不用兩層選單。 */
  色對分類(色名) {
    const 設 = this.插件.設定.分類顏色 || {};
    return this.分類清單.find(n => this.分類色名(n) === 色名) || null;
  }
  分類色名(名) {
    const 自訂 = (this.插件.設定.分類顏色 || {})[名];
    if (自訂 && 標籤色[自訂]) return 自訂;
    if (是色碼(自訂)) return null;          // 自訂色碼不屬於任何一個色票
    if (!名 || 名 === "—" || /archive|封存/i.test(名)) return "灰";
    const 序 = this.插件.分類序序號(名);
    return 自動色名[序 % 自動色名.length];
  }
  /* ⚠ 色盤要開在**分類那一格**,不是日期欄。
     色線雖然釘在整列最前面(日期欄)的左緣,但它換的是「分類」這件事,
     所以面板要長在分類欄裡 —— 開在日期欄會讓人以為在改日期。 */
  開分類選單(e, k) {
    const 列 = (e.currentTarget.closest ? e.currentTarget.closest("tr") : null);
    if (!列) return;
    const 格 = 列.querySelector('td[data-col="分類"]');
    if (!格) return;
    this.畫換色盤(格, k);
  }
  畫換色盤(格, k) {
    const T = this.T;
    格.empty();
    // 欄寬是固定的(table-layout:fixed),所以色盤要能在窄欄裡自己排整齊:
    // 色點置中換行、不寫標題那行,省下來的高度留給色點。
    st(格, "padding:6px 4px;vertical-align:middle;text-align:center;position:relative;");
    const 盒 = 格.createDiv();
    st(盒, "display:flex;flex-direction:column;align-items:center;gap:5px;width:100%;");
    const 現在 = k.分類;
    const 色列 = 盒.createDiv();
    st(色列, "display:flex;gap:5px;flex-wrap:wrap;justify-content:center;width:100%;");
    const 全部鈕 = [];
    // 灰留給封存、綠留給已完成,兩個都不給分類選
    自動色名.forEach((色名) => {
      const 碼 = 標籤色[色名];
      const 圓 = 色列.createDiv();
      const 目標 = this.色對分類(色名);
      st(圓, "width:15px;height:15px;border-radius:50%;cursor:pointer;flex:0 0 auto;" +
        "background:" + 碼 + ";" +
        (this.分類色名(現在) === 色名 ? "outline:2px solid var(--text-accent);outline-offset:1px;" : "") +
        (目標 ? "" : "opacity:0.35;"));
      圓.title = 目標 ? (色名 + "（" + 目標 + "）")
        : (色名 + " —— 還沒有欄位用這個顏色,按了會把「" + 現在 + "」改成這個顏色");
      圓.onclick = async (ev) => {
        ev.stopPropagation();
        if (!目標 || 目標 === 現在) {          // 沒有別的區用這色 → 改「這一區」的顏色
          this.插件.設定.分類顏色 = this.插件.設定.分類顏色 || {};
          this.插件.設定.分類顏色[現在] = 色名;
          await this.插件.存設定();
          this.畫();
          return;
        }
        全部鈕.forEach(x => { x.style.pointerEvents = "none"; });
        盒.empty(); st(盒.createDiv({ text: T.changing }), "font-size:0.72em;");
        const ok = await this.插件.寫手.搬分類(this.file, k, 目標, this.名單);   // 有區在用這色 → 把卡片搬過去
        if (ok) this.浮到最上(k);
      };
      全部鈕.push(圓);
    });
    /* 第六顆 = 自訂顏色。用原生的色盤(<input type=color>),挑完就存。
       ⚠ 自訂色只改「這一區」的顏色,不會把卡片搬到別區(五個色票才會)。 */
    const 自訂色 = (this.插件.設定.分類顏色 || {})[現在];
    const 自 = 色列.createDiv();
    st(自, "position:relative;width:15px;height:15px;border-radius:50%;cursor:pointer;flex:0 0 auto;" +
      "display:flex;align-items:center;justify-content:center;overflow:hidden;" +
      (是色碼(自訂色)
        ? "background:" + 自訂色 + ";outline:2px solid var(--text-accent);outline-offset:1px;"
        : "background:conic-gradient(#ff5f57,#ff9f0a,#e8c000,#32b850,#0a84ff,#bf5af0,#ff5f57);opacity:0.75;"));
    自.title = T.customColor;
    const 色輸 = 自.createEl("input", { type: "color" });
    色輸.value = 是色碼(自訂色) ? 自訂色 : this.插件.分類色(現在);
    st(色輸, "position:absolute;inset:0;opacity:0;cursor:pointer;padding:0;border:0;");
    色輸.onclick = (ev) => ev.stopPropagation();
    色輸.oninput = async (ev) => {
      ev.stopPropagation();
      this.插件.設定.分類顏色 = this.插件.設定.分類顏色 || {};
      this.插件.設定.分類顏色[現在] = 色輸.value;
      await this.插件.存設定();
      this.畫();
    };
    // 設過顏色才給「重設為自動」——沒設過就不用佔位置
    if (自訂色) {
      const 重 = 盒.createDiv({ text: T.resetColor });
      st(重, "font-size:0.68em;color:var(--text-faint);cursor:pointer;text-decoration:underline;");
      重.onclick = async (ev) => {
        ev.stopPropagation();
        delete this.插件.設定.分類顏色[現在];
        await this.插件.存設定();
        this.畫();
      };
    }
    const 取 = 盒.createEl("button", { text: T.cancelWord });
    st(取, "padding:1px 7px;font-size:0.72em;line-height:1.5;cursor:pointer;flex:0 0 auto;box-shadow:none;");
    取.onclick = (ev) => { ev.stopPropagation(); this.畫(); };
  }
  /* 只重畫「這一張卡片的內容欄」,不動整份清單。
     按編輯 / 開留言框都走這裡 —— 重畫整份清單會讓捲動位置對不回去,
     看起來就是「按了編輯畫面自己跳走」。 */
  就地重畫(e, k) {
    const 格 = (e && e.currentTarget && e.currentTarget.closest) ? e.currentTarget.closest("td") : null;
    const 列 = 格 ? 格.parentElement : null;
    if (!格 || !列) { this.重畫清單(); return; }
    this.畫內文(格, k, 列);
  }

  /* 改主題:就地變成一個輸入框(跟主題膠囊同高,版面不會跳),Enter 存、Esc 取消 */
  改主題(e, k) {
    const T = this.T;
    const 籤 = e.currentTarget.parentElement;
    if (!籤) return;
    籤.empty();
    const inp = 籤.createEl("input", { type: "text" });
    inp.value = k.主題 || "";
    inp.placeholder = T.topic;
    st(inp, "flex:0 1 176px;min-width:88px;height:" + 主題高 + "px;min-height:0;box-sizing:border-box;" +
      "padding:0 9px;margin:0;border:1px solid var(--text-accent);outline:none;" +
      "line-height:" + (主題高 - 2) + "px;font-size:0.84em;font-weight:700;" +
      "border-radius:" + Math.round(主題高 / 2) + "px;background:var(--background-primary);" +
      "color:var(--text-normal);");
    inp.onclick = (ev) => ev.stopPropagation();
    const 存 = async () => {
      const 新 = String(inp.value || "").trim();
      if (新 === (k.主題 || "")) { this.重畫清單(); return; }
      await this.插件.寫手.改主題(this.file, k, 新, this.名單);
    };
    inp.onkeydown = (ev) => {
      if (ev.isComposing || ev.keyCode === 229) return;
      if (是Enter鍵(ev) && !ev.shiftKey) { ev.preventDefault(); 存(); return; }
      if (ev.key === "Escape") { ev.preventDefault(); this.重畫清單(); }
    };
    inp.onblur = 存;
    setTimeout(() => { try { inp.focus({ preventScroll: true }); inp.select(); } catch (x) {} }, 0);
  }

  改指派(e, k) {
    const T = this.T, m = new Menu();
    m.addItem(i => i.setTitle(T.none).onClick(() => this.設指派(k, null)));
    this.名單.forEach(n => m.addItem(i => i.setTitle(n).onClick(() => this.設指派(k, n))));
    m.showAtMouseEvent(e);
  }
  開日期編輯(e, k) {
    const 盒 = document.body.createDiv();
    st(盒, "position:fixed;z-index:9999;padding:7px;border-radius:8px;display:flex;gap:5px;" +
      "background:var(--background-primary);box-shadow:0 4px 16px rgba(0,0,0,0.28);" +
      "border:1px solid var(--background-modifier-border);");
    const 起 = 盒.createEl("input", { type: "date" });
    起.value = k.起日 || this.今;
    const 迄 = 盒.createEl("input", { type: "date" });
    迄.value = (k.迄日 && k.迄日 !== k.起日) ? k.迄日 : "";
    迄.title = this.T.rangeHint;
    const 循 = 盒.createEl("button");
    st(循, "height:26px;padding:0 9px;cursor:pointer;box-shadow:none;" +
      "color:" + (k.循環 ? "var(--text-accent)" : "var(--text-muted)") + ";" +
      "border:1px solid " + (k.循環 ? "var(--text-accent)" : "var(--background-modifier-border)") + ";" +
      "background:transparent;border-radius:7px;");
    圖鈕(循, "circle-dot", "", 14);
    循.title = k.循環 ? (循環說明(k.循環) + " ‧ " + this.T.cycleEdit) : this.T.cycleEdit;
    const 好 = 盒.createEl("button", { text: "✓" });
    st(好, "height:26px;padding:0 10px;cursor:pointer;");
    const r = e.currentTarget.getBoundingClientRect();
    盒.style.left = Math.max(6, Math.min(r.left, window.innerWidth - 320)) + "px";
    盒.style.top = (r.bottom + 4) + "px";
    const 關 = () => { try { 盒.remove(); } catch (x) {} document.removeEventListener("mousedown", 外, true); };
    const 外 = (ev) => { if (!盒.contains(ev.target)) 關(); };
    setTimeout(() => document.addEventListener("mousedown", 外, true), 0);
    循.onclick = (ev) => {
      ev.stopPropagation();
      const 位 = 循.getBoundingClientRect();
      關();
      this.開循環編輯({ currentTarget: { getBoundingClientRect: () => 位 } }, k);
    };
    好.onclick = async () => {
      const a = 起.value, b = 迄.value;
      關(); if (a) await this.設日期(k, a, (b && b !== a) ? b : null);
    };
    setTimeout(() => { try { 起.focus(); } catch (x) {} }, 0);
  }

  /* ---- 改循環:日 / 週 / 月 + 間隔 ----
     0.9.0 新增。以前只能自己回去 Markdown 把 `🔁 每2週` 那幾個字改掉,
     等於這個功能只有寫得出語法的人用得到。 */
  開循環編輯(e, k) {
    const T = this.T;
    const 現 = k.循環 || { 型: "週", 隔: 1 };
    let 型 = 現.型, 隔 = 現.隔;
    const 盒 = document.body.createDiv();
    st(盒, "position:fixed;z-index:9999;padding:10px;border-radius:10px;" +
      "display:flex;flex-direction:column;gap:8px;min-width:212px;" +
      "background:var(--background-primary);box-shadow:0 6px 22px rgba(0,0,0,0.3);" +
      "border:1px solid var(--background-modifier-border);");

    const 頭 = 盒.createDiv();
    st(頭, "display:flex;align-items:center;gap:6px;font-size:0.82em;font-weight:700;color:var(--text-normal);");
    圖(頭, "circle-dot", 14, "var(--text-accent)");
    頭.createSpan({ text: T.cycleEdit });

    const 列 = 盒.createDiv();
    st(列, "display:flex;align-items:center;gap:6px;");
    列.createSpan({ text: T.cycleEvery }).style.cssText = "font-size:0.8em;color:var(--text-muted);";
    const 數 = 列.createEl("input", { type: "number" });
    數.value = String(隔); 數.min = "1"; 數.max = "99";
    st(數, "width:52px;height:26px;padding:0 6px;font-size:0.84em;text-align:center;");

    const 組 = 列.createDiv();
    st(組, "display:flex;gap:0;border-radius:8px;overflow:hidden;" +
      "border:1px solid var(--background-modifier-border);");
    const 選項 = [["日", T.cycleDay], ["週", T.cycleWeek], ["月", T.cycleMonth]];
    const 鈕們 = [];
    const 刷 = () => 鈕們.forEach(([v, b]) => {
      st(b, "height:26px;padding:0 10px;font-size:0.78em;cursor:pointer;box-shadow:none;" +
        "border:0;border-radius:0;white-space:nowrap;" +
        (v === 型 ? "background:var(--interactive-accent);color:var(--text-on-accent);font-weight:700;"
                  : "background:transparent;color:var(--text-muted);"));
    });
    選項.forEach(([v, 字]) => {
      const b = 組.createEl("button", { text: 字 });
      鈕們.push([v, b]);
      b.onclick = (ev) => { ev.stopPropagation(); 型 = v; 刷(); };
    });
    刷();

    const 底 = 盒.createDiv();
    st(底, "display:flex;align-items:center;gap:6px;justify-content:space-between;");
    const 停 = 底.createEl("button", { text: T.cycleOff });
    st(停, "height:26px;padding:0 9px;font-size:0.76em;cursor:pointer;box-shadow:none;" +
      "background:transparent;color:var(--text-faint);border:1px solid var(--background-modifier-border);");
    const 好 = 底.createEl("button", { text: "✓" });
    st(好, "height:26px;padding:0 14px;cursor:pointer;box-shadow:none;font-weight:700;" +
      "background:var(--interactive-accent);color:var(--text-on-accent);border:0;");

    const 錨 = e && e.currentTarget;
    const r = (錨 && 錨.getBoundingClientRect) ? 錨.getBoundingClientRect()
      : { left: (e && e.clientX) || 80, bottom: (e && e.clientY) || 120 };
    盒.style.left = Math.max(6, Math.min(r.left, window.innerWidth - 240)) + "px";
    盒.style.top = Math.min(r.bottom + 4, window.innerHeight - 150) + "px";
    const 關 = () => { try { 盒.remove(); } catch (x) {} document.removeEventListener("mousedown", 外, true); };
    const 外 = (ev) => { if (!盒.contains(ev.target)) 關(); };
    setTimeout(() => document.addEventListener("mousedown", 外, true), 0);

    停.onclick = async (ev) => { ev.stopPropagation(); 關(); await this.設循環(k, null); };
    好.onclick = async (ev) => {
      ev.stopPropagation();
      const n = Math.max(1, Math.min(99, parseInt(數.value, 10) || 1));
      關();
      await this.設循環(k, { 型: 型, 隔: n });
    };
    setTimeout(() => { try { 數.focus(); 數.select(); } catch (x) {} }, 0);
  }

  /* 把 🔁 標記寫回首行。循 = null 就是把循環拿掉。 */
  async 設循環(k, 循) {
    const T = this.T;
    const ok = await this.插件.寫手.改首行(this.file, k, (首) => {
      const m = 卡首Re.exec(首);
      if (!m) return null;
      let 本體 = m[3];
      if (循環標記Re.test(本體)) {
        本體 = 循 ? 本體.replace(循環標記Re, 循環字(循))
                  : 本體.replace(循環標記Re, "").replace(/[ \t]{2,}/g, " ");
      } else if (循) {
        /* 還沒有標記 → 加在本體最前面(主題後面)。
           ⚠ 不可以加在最後面:尾巴是 ＠{日期} #指派人 📌 那一串,
             插進去會把日期標記切開,解析就對不上了。 */
        const 主 = 主題Re.exec(本體);
        const 前 = 主 ? 主[0] : "";
        本體 = 前 + 循環字(循) + " " + 本體.slice(前.length);
      } else return null;
      return m[1] + "- [" + m[2] + "] " + 本體.replace(/[ \t]+$/, "");
    }, this.名單);
    if (ok) {
      new Notice(循 ? T.cycleSaved.replace("N", 循環說明短(循)) : T.cycleNone);
      this.閃一下(k, 320);
    }
    return ok;
  }

  /* ---- 🖼 輸出 ----
     ⚠ 準則第八章:深色底是主場,但輸出成圖 / PDF 要**白底**(要列印、要傳給別人)。
     做法:把現在篩出來的卡片重畫成一份乾淨的白底 HTML(不是截現在的畫面),
     再交給瀏覽器 —— PNG 走 SVG foreignObject → canvas,PDF 走列印。
     兩條路都不需要外部函式庫,也不會有跨來源污染的問題(整份沒有外部圖片)。 */
  開輸出選單(e) {
    const T = this.T, m = new Menu();
    m.addItem(i => i.setTitle(T.exportPng).setIcon("image").onClick(() => this.輸出(true)));
    m.addItem(i => i.setTitle(T.exportPdf).setIcon("printer").onClick(() => this.輸出(false)));
    m.showAtMouseEvent(e);
  }

  輸出白底DOM() {
    const 全 = this.卡片, 顯 = this.過濾(全);
    const 白 = document.createElement("div");
    白.style.cssText = "width:1000px;padding:22px 24px;background:#ffffff;color:#1a1a1a;" +
      "font-family:-apple-system,'PingFang TC','Noto Sans TC',sans-serif;font-size:14px;";
    const 題 = document.createElement("div");
    題.style.cssText = "font-size:17px;font-weight:700;margin-bottom:3px;";
    題.textContent = (this.file ? this.file.basename : "") + "　" + this.篩選標題();
    白.appendChild(題);
    const 副 = document.createElement("div");
    副.style.cssText = "font-size:11px;color:#777;margin-bottom:12px;";
    副.textContent = 顯.length + " " + this.T.cards + "　" + 現在戳();
    白.appendChild(副);

    const 表 = document.createElement("table");
    表.style.cssText = "width:100%;border-collapse:collapse;table-layout:fixed;";
    const 頭 = document.createElement("tr");
    [[this.T.colDate, "104px"], [this.T.colSection, "76px"], [this.T.colBody, ""]].forEach(([字, w]) => {
      const th = document.createElement("th");
      th.textContent = 字;
      th.style.cssText = "border:1px solid #d6d6d6;background:#f2f2f2;padding:5px 7px;" +
        "font-size:12px;color:#555;text-align:center;" + (w ? "width:" + w + ";" : "");
      頭.appendChild(th);
    });
    表.appendChild(頭);
    顯.forEach(k => {
      const tr = document.createElement("tr");
      const 色 = this.插件.分類色(k.分類);
      const td1 = document.createElement("td");
      td1.style.cssText = "border:1px solid #d6d6d6;border-left:5px solid " + 色 + ";" +
        "padding:6px 7px;text-align:center;font-size:12px;vertical-align:middle;white-space:nowrap;";
      td1.textContent = (k.置頂 ? "📌 " : "") + (k.起日 ? 日期短(k.起日) : "—") +
        ((k.迄日 && k.迄日 !== k.起日) ? "\n" + 日期短(k.迄日) : "");
      td1.style.whiteSpace = "pre-line";
      tr.appendChild(td1);
      const td2 = document.createElement("td");
      td2.style.cssText = "border:1px solid #d6d6d6;padding:6px 7px;text-align:center;" +
        "font-size:12px;vertical-align:middle;";
      td2.innerHTML = "";
      const 圈 = document.createElement("div");
      圈.style.cssText = "width:13px;height:13px;border-radius:50%;margin:0 auto 3px;" +
        (k.完成 ? "background:#3aa76d;" : "border:2px solid " + 色 + ";");
      td2.appendChild(圈);
      if (k.指派) {
        const 人 = document.createElement("div");
        人.style.cssText = "font-size:11px;font-weight:700;color:" + this.插件.人色(k.指派) + ";";
        人.textContent = k.指派;
        td2.appendChild(人);
      }
      tr.appendChild(td2);
      const td3 = document.createElement("td");
      td3.style.cssText = "border:1px solid #d6d6d6;padding:6px 8px;font-size:13px;line-height:1.5;" +
        "vertical-align:top;word-break:break-word;";
      if (k.主題) {
        const p = document.createElement("span");
        p.style.cssText = "display:inline-block;padding:1px 8px;border-radius:10px;font-size:12px;" +
          "font-weight:700;color:" + 色 + ";background:" + 透明(色, 0.14) + ";margin-bottom:3px;";
        p.textContent = k.主題;
        td3.appendChild(p);
      }
      k.留言.forEach(c => {
        const d = document.createElement("div");
        d.style.cssText = "font-size:12px;color:#444;border-left:2px solid #ccc;padding-left:7px;margin:2px 0;";
        d.textContent = "💬 " + c.人 + "  " + c.文 + "   " + c.日 + " " + c.分;
        td3.appendChild(d);
      });
      k.內容行.forEach(t => {
        const d = document.createElement("div");
        d.style.cssText = "padding-left:16px;text-indent:-16px;";
        d.textContent = 項目符 + t;
        td3.appendChild(d);
      });
      tr.appendChild(td3);
      表.appendChild(tr);
    });
    白.appendChild(表);
    return 白;
  }

  async 輸出(要圖) {
    const T = this.T;
    const 白 = this.輸出白底DOM();
    if (!要圖) {
      // PDF:開一個乾淨的列印視窗,交給系統的「另存為 PDF」
      const w = window.open("", "_blank", "width=1100,height=820");
      if (!w) { new Notice(T.exportBlocked); return; }
      w.document.write("<!doctype html><html><head><meta charset='utf-8'><title>" +
        (this.file ? this.file.basename : "board") + "</title>" +
        "<style>@page{size:A4;margin:12mm}body{margin:0;background:#fff}" +
        "tr{break-inside:avoid;page-break-inside:avoid}</style></head><body></body></html>");
      w.document.body.appendChild(w.document.importNode(白, true));
      w.document.close();
      setTimeout(() => { try { w.focus(); w.print(); } catch (e) {} }, 350);
      return;
    }
    // 長圖 PNG:整份 DOM 塞進 SVG 的 foreignObject,再畫到 canvas
    new Notice(T.exporting);
    const 台 = document.body.createDiv();
    台.style.cssText = "position:fixed;left:-99999px;top:0;";
    台.appendChild(白);
    await new Promise(r => setTimeout(r, 60));
    const w = 1000, h = Math.ceil(白.getBoundingClientRect().height) + 8;
    台.remove();
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
      '<foreignObject width="100%" height="100%">' +
      '<div xmlns="http://www.w3.org/1999/xhtml">' + 白.outerHTML + '</div>' +
      '</foreignObject></svg>';
    try {
      const img = new Image();
      const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
      await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = url; });
      const cv = document.createElement("canvas");
      cv.width = w * 2; cv.height = h * 2;
      const cx = cv.getContext("2d");
      cx.scale(2, 2);
      cx.fillStyle = "#ffffff"; cx.fillRect(0, 0, w, h);
      cx.drawImage(img, 0, 0);
      const blob = await new Promise(r => cv.toBlob(r, "image/png"));
      const buf = await blob.arrayBuffer();
      const 名 = (this.file ? this.file.parent.path : "") + "/" +
        (this.file ? this.file.basename : "board") + "-" +
        現在戳().replace(/[: ]/g, "").replace(/-/g, "") + ".png";
      await this.app.vault.createBinary(名.replace(/^\//, ""), buf);
      new Notice(T.exported + "：" + 名);
    } catch (e) {
      new Notice(T.exportFail);
    }
  }

  畫版本列(根) {
    根.empty();
    /* ⚠ 這一條一定要在(固定 26px,永遠存在,尺寸不會變)。
       它同時是捲動錨點 —— 沒有它,編修框長高時 Mac 上的捲軸滑塊會一直跳。 */
    const T = this.T, 列 = 根.createDiv();
    列.addClass("tk-版本列");
    st(列, "height:26px;min-height:26px;box-sizing:border-box;overflow:clip;" +
      "display:flex;align-items:center;gap:10px;padding:0 4px;margin-top:12px;" +
      "font-size:0.68em;color:var(--text-faint);letter-spacing:0.04em;user-select:none;" +
      "border-top:1px solid var(--background-modifier-border);" +
      "contain:layout size;overflow-anchor:none;");
    /* ⚠ 這一條**還是要在**(固定 26px,永遠存在)—— 它是捲動錨點,拿掉的話
       編修框長高時 Mac 上的捲軸滑塊會一直跳。但上面不再放東西:
       ・版本號給開發的人看,使用者不需要,每天看著它只是雜訊
       ・動畫開關拿掉了 —— 動畫現在只剩「展開/收合」和「閃一下」兩處,
         兩處都很短而且都尊重系統的「減少動態」設定,不需要再給一顆開關。 */
    const 我 = this.我是誰();
    if (我) {
      const sp = 列.createSpan({ text: "· " + 我 });
      sp.style.color = this.插件.人色(我);
      sp.title = T.whoAmIShort;
    }
  }

  /* ============================================================
     寫檔動作 —— 全部走 寫手,一律重新定位過才動
     ============================================================ */
  async 送出新增() {
    const T = this.T, s = this.狀態;
    const 題 = String(s.新主題 || "").trim();
    const 文 = String(this.內輸 ? this.內輸.value : s.新內容 || "").trim();
    if (!題 && !文) { new Notice(T.needSomething); return; }
    const 人 = s.新指派 || this.我是誰() || "";
    const d = this.新增日期();
    const 段 = 文.replace(/\r/g, "").split("\n").map(x => 去符(x)).filter(Boolean);
    const 首內 = 段.shift() || 題;
    const 日 = d.起 ? ("＠{" + d.起 + (d.迄 ? " ~ " + d.迄 : "") + "}") : "";
    const 長 = d.長期 ? " #長期" : "";
    const 首行 = "- [ ] " + (題 ? "[" + 題 + "] " : "") + 項目符 + 首內 +
      (日 ? " " + 日 : "") + 長 + (人 ? " #" + 人 : "") + " ✎{" + 現在戳() + "}";
    const 尾行 = 段.map(x => "\t" + 項目符 + x);
    /* ⚠ 卡片的身分是「第一行的文字」。兩張第一行一模一樣的卡片,之後任何一個動作
       都分不出要改哪一張(1.1 之前會硬挑一張,結果就是把別人的內容蓋掉)。
       現在寫入端會擋下來不寫,但最好的時機是**在這裡先講一聲**,讓人順手改一個字。 */
    const 新鍵先看 = 鍵由首行(首行, this.名單);
    if (this.卡片.some(x => x.鍵 === 新鍵先看)) new Notice(T.dupWarn);
    const ok = await this.插件.寫手.新增卡片(this.file, s.新分類, 首行, 尾行);
    if (ok) {
      // 清空主題和內容(它們同時是搜尋框,不清就會把清單篩成只剩這一張)
      s.新主題 = ""; s.新內容 = ""; s.搜尋 = "";
      if (人) 存我是誰(人);
      /* 新卡片一定要看得到:排序切回「最近編輯」(新的就在第一列),
         篩選切到看得到它的那一段,再捲過去。 */
      this.插件.設定.排序 = "編修";
      if (d.長期) s.篩 = { 型: "長期" };
      else if (d.起) {
        const 區 = this.現在區間();
        if (!區 || d.起 < 區[0] || d.起 > 區[1]) { s.篩 = { 型: "今日" }; s.偏移 = {}; }
      }
      await this.插件.存設定();
      const 新鍵 = 鍵由首行(首行, this.名單);
      const 要跳 = this.插件.設定.跳轉_新增 !== false;
      if (要跳) this.要看的卡 = 新鍵;
      this.畫();
      setTimeout(() => {
        try {
          if (要跳) {
            const 列 = this.找列(新鍵);
            if (列) 列.scrollIntoView({ block: "center", behavior: 要動畫() ? "smooth" : "auto" });
            this.要看的卡 = null;
            this.閃一下(新鍵);
          }
        } catch (e) {}
        try { this.題輸.focus(); } catch (e) {}
      }, 220);
      new Notice(T.added);
    }
  }

  /* 送出留言。
     ⚠ 準則第二章:寫失敗時**使用者打的字要留在框裡不清空**,並給一顆「重送」。
     ⚠ 同一張卡連續留言有 8 秒冷卻 —— 檔案吐回磁碟、索引重掃都要時間,
       間隔太短第二筆會踩到還沒穩定的檔案。
     ⚠ 正在寫入的狀態至少顯示 0.9 秒,太快閃過去等於沒有回饋。 */
  async 送留言(k, 我, 文, 框) {
    const T = this.T;
    const 內 = String(文 || "").trim();
    if (!內) { this.狀態.寫留言 = null; this.重畫清單(); return; }
    const 毫 = Date.now(), d = new Date(毫);
    const 行 = 組留言行(我, 內, 毫);
    const id = 日字(d) + " " + 時字(d) + "|" + 我;
    /* ⚠⚠ 留言 id 是「日期 時:分|誰」,只精確到**分鐘**。
       同一分鐘內同一個人連留兩則,兩則的 id 一模一樣 ——
       第二則的「有沒有寫過了」會直接命中第一則,於是**什麼都沒寫就回報成功**。
       這就是「第二次留言顯示已存檔但存不進去」。
       所以判斷重複要連**內文**一起比:同一分鐘、不同內容,本來就是兩則。 */
    const 已經有了 = (新卡) => 新卡.留言.some(c => c.id === id && c.文 === 內);
    const 起 = Date.now();
    if (框) { 框.disabled = true; 框.style.opacity = "0.6"; }
    const ok = await this.插件.寫手.插一行(this.file, k, 行, this.名單, 已經有了);
    const 剩 = 900 - (Date.now() - 起);
    if (剩 > 0) await new Promise(r => setTimeout(r, 剩));
    if (框) { 框.disabled = false; 框.style.opacity = ""; }
    if (ok) {
      this.狀態.寫留言 = null;
      new Notice(T.saved);
    } else if (框) {
      框.focus();                                  // 字留在框裡,使用者按「重送」就好
      new Notice(T.writeFail);
    }
  }
  async 存留言(k, c, 新文) {
    const 內 = String(新文 || "").trim();
    // ⚠ 同一分鐘可能有兩則 id 一樣的留言,所以要連「原本的內文」一起比,才不會改到隔壁那則
    const 認 = (t) => {
      const x = 去符(t || "");
      const m = 留言Re.exec(x);
      if (!m) return false;
      if ((m[1] + " " + m[2] + "|" + m[3].trim()) !== c.id) return false;
      return String(m[4] || "").trim() === c.文;
    };
    const 新行 = 內 ? ("\t" + 項目符 + "💬{" + c.日 + " " + c.分 + "|" + c.人 + "} " + 內) : null;
    await this.插件.寫手.改一行(this.file, k, 認, 新行, this.名單);   // 清空 = 刪掉
    this.狀態.改留 = null;
  }
  /* ⚠⚠ 0.9.0:打太快會存不進去的第二個原因在這裡。
     舊版是「先把編修狀態關掉,再去寫檔」——寫檔現在是排隊的,可能要等前一棒跑完,
     萬一那一棒失敗(檔案正在同步、卡片被別的動作搬走),使用者剛打的整段就沒了,
     而且畫面已經回到閱讀模式,他根本不知道沒存到。
     現在:字先收在 草稿 裡,寫成功才丟掉;失敗就原封不動放回編修框並說一聲。 */
  /* ---- 隨打隨存 ----
     ⚠ 寫進檔案會讓 Obsidian 回頭呼叫 setViewData,預設會整份重畫 ——
       重畫就等於把正在打字的那個 textarea 砍掉重建,游標和輸入法都會斷。
       所以自己寫的那一下要跟看板說「這一次別重畫」(略過到),
       然後手動把記憶體裡這張卡片的資料更新成新的樣子。 */
  async 自動存(k, ta) {
    /* ⚠ 這裡**不可以**檢查「現在編修的是不是這一張」。
       使用者按另一張卡片的「編輯」時,狀態那一瞬間就換過去了,
       這一張還沒寫進去的字就會被這個檢查擋掉、然後永遠消失。
       唯一該看的是「那個輸入框還在不在畫面上」。 */
    if (!ta || !ta.isConnected) return;
    const 內 = ta.value;
    if (內 === this.上次存的) return;
    if (this.存中) { clearTimeout(this.存計時); this.存計時 = setTimeout(() => this.自動存(k, ta), 400); return; }
    this.存中 = true;
    this.略過到 = Date.now() + 2500;
    let r = null;
    try {
      r = await this.插件.寫手.換內容(this.file, k, 去符多行(內), this.名單, null);
    } finally { this.存中 = false; }
    if (r === false || r === null || r === undefined) {
      this.略過到 = 0;
      new Notice(this.T.saveFailed);
      return;                                   // 字還在框裡,下一次停手會再試
    }
    this.上次存的 = 內;
    const 舊鍵 = k.鍵;
    if (typeof r === "string" && r !== 舊鍵) {
      // 第一行改過了 = 這張卡片的身分換了,記憶體裡的每一處都要跟著換
      k.鍵 = r;
      if (this.狀態.編修 === 舊鍵) this.狀態.編修 = r;
      if (this.草稿 && this.草稿[舊鍵] !== undefined) {
        this.草稿[r] = this.草稿[舊鍵]; delete this.草稿[舊鍵];
      }
      const 列 = this.找列(舊鍵);
      if (列) 列.__鍵 = r;
    }
    k.內容行 = 去符多行(內).split("\n").map(x => 去符(x)).filter(Boolean);
  }

  /* 把還沒寫進去的那一下寫掉,然後把編修相關的狀態清乾淨。
     ⚠ 任何會讓編修框消失的動作(按完成、切去編另一張、開留言框)都要先過這裡,
       不然那一下的字就跟著框一起不見了。 */
  async 收掉編修() {
    clearTimeout(this.存計時);
    const ta = this.編框, k = this.編修卡;
    if (ta && ta.isConnected && k) await this.自動存(k, ta);
    this.編框 = null;
    this.編修卡 = null;
    this.上次存的 = null;
    this.略過到 = 0;
  }

  /* 按「完成」或 Esc:把還沒寫的那一下寫掉,然後回到閱讀模式 */
  async 完成編輯(k) {
    if (this.收工中) return;                     // 點外面 + 按 Esc 可能同時進來
    this.收工中 = true;
    try {
      const 題 = this.題編框 ? String(this.題編框.value || "").trim() : null;
      /* 收合動畫要「從編修框那麼高」滑到「收起來那麼高」,所以高度要**在重畫之前**量。
         重畫之後才量,量到的已經是收好的高度,動畫就沒有起點了。 */
      let 舊高 = 0;
      try {
        const 列 = this.找列(k.鍵);
        const 區 = 列 && 列.querySelector(".tk-文欄");
        if (區) 舊高 = Math.ceil(區.getBoundingClientRect().height);
      } catch (e) {}
      await this.收掉編修();                     // ⚠ 會把 k.鍵 更新成新的
      if (題 !== null && 題 !== (k.主題 || "")) {
        await this.插件.寫手.改主題(this.file, k, 題, this.名單);
      }
      this.狀態.編修 = null;
      if (this.草稿) delete this.草稿[k.鍵];
      this.畫();
      if (舊高) {
        const 列2 = this.找列(k.鍵);
        const 區2 = 列2 && 列2.querySelector(".tk-文欄");
        if (區2) 滑開(區2, 舊高);
      }
      this.閃一下(k, 120);
    } finally { this.收工中 = false; }
  }



  async 切置頂(k) {
    const ok = await this.插件.寫手.改首行(this.file, k, (首) =>
      置頂Re.test(首) ? 首.replace(置頂清除Re, "")
                      : (首.replace(時戳清除Re, "").replace(/\s+$/, "") + " 📌"),
      this.名單);
    if (ok) this.浮到最上(k);       // 置頂會把卡片搬到最上面 —— 一定要跟著跑過去
    return ok;
  }
  /* 打勾 / 取消打勾。
     ⚠ 打完勾之後那張卡片常常會從現在的篩選裡消失(例如關掉「已完成」),
       使用者會以為卡片不見了。所以:
         ① 告訴他搬到哪裡去了(已搬到 完成區 / 未完成區 / 已封存)
         ② **自動把篩選調到看得到它的地方**(該勾的顯示開關自動勾起來)
         ③ 那張卡片會浮到最上面(排序預設就是「最近編修的最上面」,打勾會蓋時戳)
         ④ 三秒內圓點變成「↺」,按了就退回去 */
  async 切完成(k) {
    const T = this.T, 設 = this.插件.設定.排程顯示;
    const 變完成 = !k.完成;
    const ok = await this.插件.寫手.改首行(this.file, k, (首) =>
      首.replace(卡首Re, (全, 空, 勾, 本體) =>
        空 + "- [" + (勾.toLowerCase() === "x" ? " " : "x") + "] " + 本體),
      this.名單);
    if (!ok) return;
    // ② 自動把篩選調到看得到它的地方(設定裡可以個別關掉)
    const 要跳 = 變完成 ? this.插件.設定.跳轉_未完成到完成 : this.插件.設定.跳轉_完成到未完成;
    if (要跳) {
      let 調 = false;
      if (變完成 && !設.完成) { 設.完成 = true; 調 = true; }
      if (!變完成 && !設.未完成) { 設.未完成 = true; 調 = true; }
      if (調) await this.插件.存設定();
    }
    this.記剛動過(k, 變完成 ? T.movedDone : T.movedTodo, () => this.切完成(k));
    if (要跳) this.浮到最上(k);
  }

  /* 記下「剛剛動過」,三秒內圓點是反悔鈕 */
  記剛動過(k, 說, 退) {
    this.剛動過 = this.剛動過 || {};
    this.剛動過[k.鍵] = { 時: Date.now(), 說: 說, 退: 退 };
    new Notice(說);
    setTimeout(() => {
      if (this.剛動過[k.鍵] && Date.now() - this.剛動過[k.鍵].時 >= 反悔毫秒 - 100) {
        delete this.剛動過[k.鍵];
        try { this.重畫清單(); } catch (e) {}
      }
    }, 反悔毫秒 + 100);
  }
  /* 讓那張卡片留在畫面上看得到:重畫之後捲到它的位置,然後閃一下。
     ⚠ 為什麼一定要閃:打勾/封存/改日期之後卡片常常會換到另一段、另一個位置,
       畫面自己捲過去,使用者根本不知道剛剛那張跑到哪裡去了。
       捲過去 + 閃一下 = 「它在這裡」,這是這個動作唯一的回饋。 */
  浮到最上(k) {
    this.要看的卡 = k.鍵;
    setTimeout(() => {
      try {
        const 列 = this.找列(this.要看的卡);
        if (列) 列.scrollIntoView({ block: "center", behavior: 要動畫() ? "smooth" : "auto" });
        this.要看的卡 = null;
        this.閃一下(k);
      } catch (e) {}
    }, 260);
  }
  找列(鍵) {
    try {
      return Array.from(this.contentEl.querySelectorAll("tbody tr")).find(tr => tr.__鍵 === 鍵) || null;
    } catch (e) { return null; }
  }
  /* 閃一下:在那一列蓋一層會自己淡掉的底色。
     ⚠ 用 class + CSS keyframes,不要用 inline style 逐格改 ——
       inline 會被 tr:hover 的底色壓過去,而且捲動中改 style 會卡。
     ⚠ 每次都先拿掉再加回去(中間強制 reflow),不然連按兩下第二次不會播。 */
  閃一下(k, 延遲) {
    const 鍵 = (k && k.鍵) ? k.鍵 : k;
    const 跑 = () => {
      const 列 = this.找列(鍵);
      if (!列) return;
      if (!要動畫()) {        // 關了動畫的人就停一下下,不要閃
        列.addClass("tk-定位");
        setTimeout(() => { try { 列.removeClass("tk-定位"); } catch (e) {} }, 900);
        return;
      }
      列.removeClass("tk-閃");
      void 列.offsetWidth;     // 強制 reflow,動畫才會重播
      列.addClass("tk-閃");
      setTimeout(() => { try { 列.removeClass("tk-閃"); } catch (e) {} }, 1300);
    };
    setTimeout(跑, 延遲 === undefined ? 60 : 延遲);
  }
  設指派(k, 人) {
    const 清 = 人規則(this.名單).清;
    return this.插件.寫手.改首行(this.file, k, (首) => {
      const 去 = 首.replace(清, "");
      if (!人) return 去;
      return 去.replace(時戳清除Re, "").replace(/\s+$/, "") + " #" + 人;
    }, this.名單);
  }
  async 設日期(k, 起, 迄) {
    const 標 = "＠{" + 起 + (迄 ? " ~ " + 迄 : "") + "}";
    const ok = await this.插件.寫手.改首行(this.file, k, (首) => {
      標記Re.lastIndex = 0;
      if (標記Re.test(首)) { 標記Re.lastIndex = 0; return 首.replace(標記Re, 標); }
      return 首.replace(時戳清除Re, "").replace(/\s+$/, "") + " " + 標;
    }, this.名單);
    // 改了日期 = 卡片多半會換到別的一段去,捲過去閃一下他才找得到
    if (ok) this.浮到最上(k);
    return ok;
  }
  /* 本次完成:日期推到下一次,並在卡片裡插一條記錄(新的排最上面)。
     三秒內圓點是「↺」,按了就把記錄拿掉、日期退回那一天。 */
  /* ---- 本次完成 ----
     ⚠ 邏輯順序很重要(以前一直按會一直把日期往後堆):
       ① **先看內容**:已經記過哪些「✔ 本次完成 <日期>」
       ② 這次完成的是**卡片現在的日期**。如果那一天已經記過了,
          代表剛剛才按過、只是畫面還沒重畫 —— 就不要再記一次,直接擋掉。
       ③ 下一次從「這次完成的那一天」往後推,而且**一路推到今天之後**為止。
          逾期三週的每週卡按一次就回到下一個還沒過的日子,不是只推一週還是逾期。 */
  async 本次完成(k) {
    const T = this.T;
    if (!k.循環 || !k.起日) return;
    const 這次 = k.起日;
    // ① 先看內容
    /* ⚠ 記錄行寫的是 `26-08-14(五)`(帶星期),所以比對時**只比日期那一段**,
       不要拿帶星期的字串去比 —— 那樣永遠比不中,擋不住重複。 */
    const 只日 = (x) => { const m = /(\d{2}-\d{2}-\d{2})/.exec(String(x || "")); return m ? m[1] : ""; };
    const 已記 = (k.內容行 || []).filter(x => 本次完成Re.test(x)).map(只日);
    // ② 同一天不重複記
    if (已記.indexOf(只日(日期短(這次))) >= 0) {
      new Notice(T.alreadyDone.replace("N", 日期短(這次)));
      return;
    }
    // ③ 推到今天之後
    let 新日 = 下一次(這次, k.循環);
    for (let i = 0; i < 400 && 新日 <= this.今; i++) 新日 = 下一次(新日, k.循環);
    const 記 = "\t" + 項目符 + "✔ 本次完成 " + 日期短(這次);
    const ok = await this.插件.寫手.本次完成(this.file, k, 記, 這次, 新日, this.名單);
    if (!ok) return;
    this.記剛動過(k, T.doneOnce.replace("N", 日期短(新日)),
      () => this.復原本次(k, 記, 新日, 這次));
    this.浮到最上(k);
  }
  async 復原本次(k, 記, 從, 回) {
    await this.插件.寫手.復原本次(this.file, k, 記, 從, 回, this.名單);
  }

  /* 刪除:就地問一次(不跳對話框把版面推歪),確認了才真的刪 */
  問刪除(k) {
    const T = this.T;
    const 列 = Array.from(this.contentEl.querySelectorAll("tbody tr")).find(tr => tr.__鍵 === k.鍵);
    if (!列) return;
    const 格 = 列.lastElementChild;
    if (!格) return;
    格.empty();
    const 盒 = 格.createDiv();
    st(盒, "display:flex;align-items:center;gap:10px;padding:4px 0;");
    st(盒.createDiv({ text: T.deleteAsk }), "font-size:0.86em;color:var(--color-red, #e05252);font-weight:700;");
    const 是 = 盒.createEl("button", { text: T.deleteYes });
    st(是, "padding:3px 12px;font-size:0.8em;border-radius:6px;cursor:pointer;box-shadow:none;" +
      "color:#fff;background:var(--color-red, #e05252);border:1px solid var(--color-red, #e05252);");
    是.onclick = async () => {
      是.disabled = true; 是.setText("…");
      const ok = await this.插件.寫手.刪卡片(this.file, k, this.名單);
      if (ok) new Notice(T.deleted);
    };
    const 否 = 盒.createEl("button", { text: T.cancelWord });
    st(否, "padding:3px 10px;font-size:0.8em;border-radius:6px;cursor:pointer;box-shadow:none;");
    否.onclick = () => this.重畫清單();
  }

  async 切封存(k, 已封存) {
    const T = this.T, 設 = this.插件.設定.排程顯示;
    const 到 = 已封存 ? (k.原分類 || this.分類清單.find(x => !/archive|封存/i.test(x)) || "紅色") : 封存區;
    const ok = await this.插件.寫手.搬分類(this.file, k, 到, this.名單);
    if (!ok) return;
    if (!已封存 && !設.封存) { 設.封存 = true; await this.插件.存設定(); }
    this.記剛動過(k, 已封存 ? T.movedBack.replace("N", 到) : T.movedArchive,
      () => this.切封存(k, !已封存));
    // ⚠ 封存 = 卡片整張搬到另一段去了。不捲過去的話使用者只看到它「消失」
    this.浮到最上(k);
  }
}

/* ============================================================
   Plugin 本體
   ============================================================ */
function 是色碼(v) { return typeof v === "string" && /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v.trim()); }
const 標籤色 = { 紅: "#ff5f57", 橘: "#ff9f0a", 黃: "#e8c000", 藍: "#0a84ff", 綠: "#32b850", 紫: "#bf5af0", 灰: "#98989d" };
// 灰留給封存、綠留給已完成,兩個都不自動配給分類 —— 免得綠色卡片跟做完的卡片看起來一樣
const 自動色名 = ["紅", "橘", "黃", "藍", "紫"];
// 指派人的顏色故意不用綠和灰(跟上面同一個理由),也避開分類已經在用的識別方式
const 人色盤 = ["#ff9f0a", "#0a84ff", "#bf5af0", "#ff5f57", "#e8c000", "#5ac8fa", "#ff6482"];

module.exports = class 卡片日誌看板 extends Plugin {
  async onload() {
    this.設定 = Object.assign({}, 預設設定, await this.loadData());
    this.設定.版本 = 插件版本;
    語言設定 = this.設定.語言 || "auto";
    this.T = 語();
    this.寫手 = new 寫手(this.app, this.T);
    this.分類序 = {};

    /* 動畫不再是一個選項。只剩下「展開/收合」和「動作之後閃一下」兩處,
       都很短、都在卡片自己身上;唯一該尊重的是**系統層級**的減少動態設定。 */
    要動畫 = () => {
      try { return !window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return true; }
    };
    this.registerView(視圖種類, (leaf) => new 看板視圖(leaf, this));
    this.addSettingTab(new 設定頁(this.app, this));

    this.addCommand({
      id: "toggle-board",
      name: this.T.openBoard,
      checkCallback: (只問) => {
        const leaf = this.app.workspace.activeLeaf;
        if (!leaf) return false;
        const t = leaf.getViewState().type;
        if (t !== "markdown" && t !== 視圖種類) return false;
        if (只問) return true;
        this.切視圖(leaf);
      }
    });
    this.addCommand({
      id: "new-card",
      name: this.T.add,
      checkCallback: (只問) => {
        const v = this.app.workspace.getActiveViewOfType(看板視圖);
        if (!v) return false;
        if (只問) return true;
        v.狀態.新增開 = true; v.畫();
      }
    });

    this.addRibbonIcon("layout-list", this.T.openBoard, () => {
      const leaf = this.app.workspace.activeLeaf;
      if (leaf) this.切視圖(leaf);
    });

    /* ⚠⚠ 0.9.0 修:分頁的「⋯」以前**永遠**只寫「用卡片日誌看板開啟」——
       已經在看板裡了還是那一句,按下去看起來像沒反應(其實是切回去又被自動切換拉回來的錯覺),
       總之就是沒有一條路寫著「回到原本的閱讀模式」。
       現在標題跟著目前這個分頁的狀態走,兩邊都有明確的出口。
       ⚠ 這個 file-menu 也會被看板自己的分頁選單觸發(FileView.onPaneMenu 會 trigger),
         所以不需要再寫一個 onPaneMenu,不然會出現兩條一模一樣的。 */
    this.registerEvent(this.app.workspace.on("file-menu", (menu, file, source, leaf) => {
      if (!file || file.extension !== "md" || !leaf) return;
      let 型 = "";
      try { 型 = leaf.getViewState().type; } catch (e) {}
      const 在看板 = (型 === 視圖種類);
      menu.addItem(i => i
        .setTitle(在看板 ? this.T.backToMd : this.T.openWithBoard)
        .setIcon(在看板 ? "file-text" : "layout-list")
        .onClick(() => this.切視圖(leaf, 在看板 ? "markdown" : 視圖種類)));
    }));

    /* ---- 記住每個檔案上次用哪一種模式 ----
       ⚠⚠ 1.0 把這一塊整個換掉了,因為舊做法太繞。
       舊做法:要在筆記的 frontmatter 手寫 `看板: 卡片日誌`,插件去讀 metadataCache 判斷。
       毛病一路跟著:metadataCache 比 file-open 晚到所以要重試、開機已經開著的分頁不會
       觸發 file-open 所以要再掃一次、手動切回 Markdown 又會被掃回去所以要一個旗子…
       每修一個就多一層。
       新做法就一句話:**你上次在這個檔案用哪一種,下次就給你哪一種。**
       切換的那一刻就記進 data.json(設定.看板檔案),不必讀 frontmatter、不必等索引、
       也沒有「自己跳回去」的問題 —— 因為手動切回 Markdown 本身就是在記「我要 Markdown」。
       frontmatter 只留成「還沒記過的檔案」的第一印象,舊筆記照樣能用。 */
    const 記得的 = (路) => {
      const m = this.設定.看板檔案 || {};
      return (路 && Object.prototype.hasOwnProperty.call(m, 路)) ? !!m[路] : null;
    };
    const 靠frontmatter = (路) => {
      try {
        const c = this.app.metadataCache.getCache(路);
        const fm = c && c.frontmatter;
        const v = fm ? (fm["看板"] !== undefined ? fm["看板"] : fm["card-board"]) : undefined;
        if (v === undefined || v === null || v === "") return false;
        return !/忽略|ignore|skip|false/i.test(String(v));
      } catch (e) { return false; }
    };
    // 這個檔案該不該用看板開。null = 還不知道(索引還沒讀到,等一下再問一次)
    const 該用看板路 = (路) => {
      if (!路 || !/\.md$/i.test(路)) return false;
      const 記 = 記得的(路);
      if (記 !== null) return 記;                 // 記過就照記的,最優先
      if (!this.設定.自動切換) return false;
      return 靠frontmatter(路);
    };

    /* ⚠ 攔截 setViewState 的理由沒變:Obsidian 要顯示一個檔案一定會經過它,
       在視圖被建出來**之前**就換掉,所以不會先閃一下 Markdown 再跳成看板,
       而且開新分頁、分割、從連結點進去、開機還原分頁全都會經過。 */
    const 原setViewState = WorkspaceLeaf.prototype.setViewState;
    const 我 = this;
    WorkspaceLeaf.prototype.setViewState = function (state, ...其餘) {
      try {
        if (state && state.type === "markdown" && state.state && state.state.file &&
            該用看板路(state.state.file)) {
          state = Object.assign({}, state, { type: 視圖種類 });
        }
      } catch (e) {}
      return 原setViewState.apply(this, [state, ...其餘]);
    };
    // 外掛關掉的時候要還原,不然會留著一個指向舊程式的函式
    this.register(() => { WorkspaceLeaf.prototype.setViewState = 原setViewState; });

    /* 保險:開機時已經開著的分頁不會經過 setViewState。
       ⚠ 只把「該是看板卻還是 markdown」的換過去 —— 反方向不碰,
         不然使用者剛切到 Markdown 的那一秒又被拉回來。 */
    const 掃一次 = (再試) => {
      let 有沒讀到 = false;
      this.app.workspace.getLeavesOfType("markdown").forEach(leaf => {
        const file = leaf.view && leaf.view.file;
        if (!file) return;
        if (記得的(file.path) === null && !this.app.metadataCache.getFileCache(file)) {
          有沒讀到 = true; return;               // 索引還沒好,等一下再問
        }
        if (該用看板路(file.path)) this.切視圖(leaf, 視圖種類);
      });
      if (有沒讀到 && 再試) setTimeout(() => 掃一次(false), 400);
    };
    this.自動掃 = 掃一次;
    this.app.workspace.onLayoutReady(() => 掃一次(true));
    this.registerEvent(this.app.workspace.on("file-open", () => 掃一次(true)));

    /* 檔案改名 / 刪掉,記憶要跟著走,不然 data.json 會一直長 */
    this.registerEvent(this.app.vault.on("rename", async (檔, 舊路) => {
      const m = this.設定.看板檔案 || {};
      if (Object.prototype.hasOwnProperty.call(m, 舊路)) {
        m[檔.path] = m[舊路]; delete m[舊路];
        this.設定.看板檔案 = m; await this.存設定();
      }
    }));
    this.registerEvent(this.app.vault.on("delete", async (檔) => {
      const m = this.設定.看板檔案 || {};
      if (Object.prototype.hasOwnProperty.call(m, 檔.path)) {
        delete m[檔.path]; this.設定.看板檔案 = m; await this.存設定();
      }
    }));

    this.addCommand({
      id: "scan-auto",
      name: this.T.scanNow,
      callback: () => { if (this.自動掃) this.自動掃(true); new Notice(this.T.scanned); }
    });
  }

  onunload() {}

  async 存設定() { await this.saveData(this.設定); }
  重畫所有看板() {
    this.app.workspace.getLeavesOfType(視圖種類).forEach(l => {
      try { l.view.畫(); } catch (e) {}
    });
  }

  /* 切換視圖。⚠ **先記、後切** —— 順序不能反過來:
     setViewState 的攔截會去問「這個檔案該用哪一種」,
     如果還沒記就切,攔截讀到的是舊值,切去 Markdown 會當場又被換回看板。 */
  切視圖(leaf, 指定) {
    const 州 = leaf.getViewState();
    const 到 = 指定 || (州.type === 視圖種類 ? "markdown" : 視圖種類);
    const 路 = (州.state && 州.state.file) ||
      (leaf.view && leaf.view.file && leaf.view.file.path) || null;
    if (路) {
      this.設定.看板檔案 = this.設定.看板檔案 || {};
      this.設定.看板檔案[路] = (到 === 視圖種類);
      this.存設定();                       // 不等它,切換不要卡在寫檔上
    }
    leaf.setViewState(Object.assign({}, 州, { type: 到, state: 州.state }));
  }


  /* ⚠ 分類顏色的順序必須照「卡片日誌裡 ## 標題的實際先後」——
     紅色→橘色→黃色→藍色→紫色。以前是「誰先被畫到誰先拿號碼」,
     而清單是照編修時間排的,所以每次開起來顏色都可能不一樣、也對不上分類的名字。
     現在由看板在解析完之後把真正的順序灌進來(見 設分類順序)。 */
  設分類順序(名單) {
    this.分類序 = {};
    (名單 || []).forEach((n, i) => { this.分類序[n] = i; });
  }
  /* 畫面上顯示的分類名字。
     ⚠ 0.9.0 改了預設:以前沒設過就塞一個阿拉伯數字(1、2、3…),
       但那個數字不代表任何意思 —— 只是「這一區在檔案裡排第幾」,
       看板上卻長得像優先序或數量,反而誤導。現在沒設過就是**空白**,
       維持原本乾淨的圓點;要顯示什麼自己去設定裡打(一個字最好看)。 */
  /* ⚠ 1.3 起圓點裡**永遠不放字**。
     一個圓點加一個字,兩個東西各自表示一半的意思,反而要讀兩次;
     顏色本來就已經是分類的語言,字是多的。封存區也一樣(它本來就整列變灰)。 */
  分類顯示名() { return ""; }
  分類序序號(名) {
    if (this.分類序[名] === undefined) this.分類序[名] = Object.keys(this.分類序).length;
    return this.分類序[名];
  }
  /* 分類顏色。設定裡存的可以是兩種東西:
       ① 色票名(「紅」「橘」…)—— 快速挑的那五個
       ② 直接一個色碼(#3a7bd5)—— 自訂色盤挑的
     ⚠ 顏色是綁在**分類(## 標題)**上,不是綁在卡片上。
       所以把自訂色刪掉,卡片一張都不會受影響 ——
       那一區只是退回「照順序自動配」的顏色而已。 */
  分類色(名) {
    const 自訂 = this.設定.分類顏色 && this.設定.分類顏色[名];
    if (自訂 && 標籤色[自訂]) return 標籤色[自訂];
    if (是色碼(自訂)) return 自訂;
    if (!名 || 名 === "—" || /archive|封存/i.test(名)) return 標籤色["灰"];
    return 標籤色[自動色名[this.分類序序號(名) % 自動色名.length]];
  }
  人色(名) {
    const 自訂 = this.設定.指派人顏色 && this.設定.指派人顏色[名];
    if (自訂) return 自訂;
    const i = Math.max(0, (this.設定.指派人 || []).indexOf(名));
    return 人色盤[i % 人色盤.length];
  }
};

/* ============================================================
   設定頁
   ============================================================ */
class 設定頁 extends PluginSettingTab {
  constructor(app, 插件) { super(app, 插件); this.插件 = 插件; }
  display() {
    const T = 語(), c = this.containerEl;
    c.empty();

    /* ⚠ 1.2:指派人名單和分類都從設定頁搬走了。
       它們是「這一份看板長什麼樣」的事,不是「這個外掛怎麼運作」的事 ——
       擺在設定頁要先離開看板、開設定、改完再回來,而且改的時候看不到卡片。
       現在都在新增卡片那一排:分類圓點旁邊的「⋯」改分類,指派人框的「⋯」改名單。 */
    new Setting(c).setName(T.whoAmI).setDesc(T.whoAmIDesc)
      .addDropdown(d => {
        d.addOption("", "—");
        (this.插件.設定.指派人 || []).forEach(n => d.addOption(n, n));
        d.setValue(讀我是誰() || "");
        d.onChange(v => 存我是誰(v || null));
      });

    new Setting(c).setName(T.defaultRange).setDesc(T.defaultRangeDesc)
      .addDropdown(d => {
        [["今日", T.today], ["本週", T.week], ["本月", T.month], ["全部", T.all]]
          .forEach(([v, t]) => d.addOption(v, t));
        d.setValue(this.插件.設定.預設範圍 || "今日");
        d.onChange(async (v) => { this.插件.設定.預設範圍 = v; await this.插件.存設定(); });
      });

    new Setting(c).setName(T.lang).setDesc(T.langDesc)
      .addDropdown(d => {
        d.addOption("auto", T.langAuto);
        d.addOption("zh-TW", T.langZh);
        d.addOption("en", T.langEn);
        d.setValue(this.插件.設定.語言 || "auto");
        d.onChange(async (v) => {
          this.插件.設定.語言 = v; 語言設定 = v;
          await this.插件.存設定();
          this.插件.T = 語();
          // 已經開著的看板立刻換語言
          this.app.workspace.getLeavesOfType(視圖種類).forEach(l => {
            try { l.view.T = 語(); l.view.畫(); } catch (e) {}
          });
          this.display();
        });
      });

    new Setting(c).setName(T.doneLook).setDesc(T.doneLookDesc)
      .addDropdown(d => {
        [["淡化劃掉", T.doneBoth], ["淡化", T.doneFade], ["劃掉", T.doneStrike], ["無", T.doneNone]]
          .forEach(([v, t]) => d.addOption(v, t));
        d.setValue(this.插件.設定.完成樣式 || "淡化劃掉");
        d.onChange(async (v) => {
          this.插件.設定.完成樣式 = v;
          await this.插件.存設定(); this.插件.重畫所有看板();
        });
      });

    /* ⚠ frontmatter 那一排拿掉了。每個檔案上次用哪一種模式都會自動記住,
       frontmatter 只是「從來沒開過的檔案」的第一印象 —— 那是一條規則,不是一個選項,
       擺在設定裡只會讓人以為要先開它才會自動切換。 */
    c.createEl("h3", { text: T.jumps });
    [["跳轉_未完成到完成", T.jumpDone], ["跳轉_完成到未完成", T.jumpTodo],
     ["跳轉_設回今日", T.jumpToday], ["跳轉_新增", T.jumpAdd]].forEach(([k, 名]) => {
      new Setting(c).setName(名).setDesc(T.jumpDesc)
        .addToggle(t => t.setValue(this.插件.設定[k] !== false)
          .onChange(async (v) => { this.插件.設定[k] = v; await this.插件.存設定(); }));
    });

    c.createEl("p", { cls: "cjb-淡", text: T.board + " " + 插件版本 });
  }
}
