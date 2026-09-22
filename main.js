"use strict";
/* ============================================================
   Card Table / 卡片日誌   (起源:v0.1.0 的 Card Journal Board)
   ------------------------------------------------------------
   這是 `日誌看板.md` 那一大塊 dataviewjs 的 plugin 版骨架。

   第一版的原則(講在最前面,以後改東西都照這個走):

   1. 資料就是筆記裡的純文字。1.6.1 起寫成(舊寫法照讀,見「格式」那一段)
      `- [ ] [pin:: on] [主題] [due:: 2026-09-16] #嘉峻`,
      內容、留言、最後編輯在底下縮排的行:`內容`、`[cm:: 2026-09-16 18:30|嘉峻] 留言`、`[ed:: …]`。
      所以 plugin 沒裝、或哪天不用了,筆記照樣看得懂 —— 這是最高原則。
   2. 不依賴 Dataview。檔案自己讀、自己解析(下面「格式」那一段)。
   3. 設定走 saveData() → 存在 .obsidian/plugins/card-table/data.json,
      會跟著 Obsidian Sync 一起同步。
      「這台電腦是誰在用」不進 data.json(那會被同步),改走 app.saveLocalStorage ——
      那是 Obsidian 自己的 per-vault 儲存,不要直接碰 window.localStorage。
   4. 手機可以用(manifest 的 isDesktopOnly = false)。
   5. 中英文雙語,照 Obsidian 自己的語言自動切。

   還沒搬進來的(照著 `搬遷清單.md` 一項一項搬):
   行事曆、匯出圖片／PDF、循環卡片、封存、拖曳排序、統計列。
   ============================================================ */

const { Plugin, TextFileView, PluginSettingTab, Setting, Notice, Menu, Modal, WorkspaceLeaf, setIcon, addIcon,
  MarkdownRenderer, Component, getIcon } = require("obsidian");

const 視圖種類 = "card-table";
/* 準則第九章:版本號格式 YYMMDDvN,程式和說明文件同一組,畫面上看得到。
   manifest.json 另外用 semver —— 那是 Obsidian 自己要認的,兩者並存。 */
const 看板版本 = "260922v2";
const 插件版本 = "1.6.4";
// ⚠ 要跟 manifest.json 的 fundingUrl 一致
const 贊助網址 = "https://ko-fi.com/jiajiunwu";

/* ---- 外掛自己的圖示 ----
   以前分頁和左側欄都借用 Lucide 的 layout-list,那是一個「清單」,
   長得跟另外七八個外掛一樣,在側邊欄裡認不出來。
   這一個畫的就是這個外掛在做的事:一張表,左邊一條窄欄(日期 —— 整個外掛的主軸),
   右邊三列卡片。
   ⚠ addIcon() 的座標系固定是 0 0 100 100(不是 Lucide 的 24),所以線寬要放大到 8
     才會跟 Obsidian 內建那些圖示一樣粗(24 格的 2 ≈ 100 格的 8.3)。
   ⚠ 側邊欄實際只畫到 18px 左右,細節多一點就糊成一團 —— 這裡刻意只留四筆。 */
const 圖示名 = "card-table-board";
const 圖示筆畫 =
  '<rect x="14" y="18" width="72" height="64" rx="11" />' +
  '<path d="M40 18 V82" />' +
  '<path d="M40 39.5 H86" />' +
  '<path d="M40 60.5 H86" />';
const 圖示SVG =
  '<g fill="none" stroke="currentColor" stroke-width="8" ' +
  'stroke-linecap="round" stroke-linejoin="round">' + 圖示筆畫 + '</g>';

/* ============================================================
   語言 —— 只有兩份對照表,要加語言就再加一份
   ============================================================ */
const 字典 = {
  "zh-TW": {
    board: "卡片看板 - 任務分類日誌", today: "今日", week: "本週", month: "本月",
    all: "全部", overdue: "已逾期", search: "搜尋主題或內容…",
    assignee: "指派人", none: "不指派", noCards: "這個範圍裡沒有卡片",
    edit: "編輯", save: "儲存", cancel: "取消", comment: "留言", pin: "置頂",
    archiveZone: "封存區", archiveSection: "封存整個分類(按 ✓ 儲存才生效)", unarchiveSection: "取消封存", oldArchived: "以前單張封存的卡片", restoreSection: "還原這一區", restoreAgain: "再按一次還原", searchArchive: "搜尋這一區", detailEdit: "詳細編輯", backToBoard: "回到看板", done: "完成", placeholder: "留一則給大家看的…", /* C10:張數只寫數字,不寫「張」(跟英文一樣) */ cards: "", undo: "按一下復原", doneOnceShort: "按一下 = 本次完成",
    /* 1.6.3(U43–U46)封存區的移出 / 整批刪除。NAME = 封存區的名字、CNT = 幾張、FILE = 新檔案 */
    moveOut: "移出 Card Table", moveOutYes: "移出",
    moveOutAsk: "移出「NAME」?\n這一區的 CNT 張卡片會搬到:\nFILE\n搬走之後封存區清單裡就沒有這一區了(檔案還在)。",
    moveOutFailed: "移出失敗:新檔案建不起來,原本的筆記一個字都沒動",
    deleteAllSection: "整批刪除這一區(刪掉就沒了)", deleteAllYes: "刪除",
    deleteAllAsk: "整批刪除「NAME」?\n這一區的 CNT 張卡片會直接從筆記裡刪掉,\n不留檔、沒辦法復原。",
    moveOutSuffix: "移出的檔名後綴", moveOutSuffixDesc: "封存區「移出」出去的檔名 = 封存區的名字 + 這個後綴。預設「-card table-archive」。",
    moveOutFolder: "移出放哪個資料夾", moveOutFolderDesc: "空白 = 跟看板筆記同一個資料夾(預設)。填路徑(例:Archive/2026)就放那裡,資料夾要先存在。",
    justNow: "剛剛", minsAgo: "分鐘前", hoursAgo: "小時前",
    yesterday: "昨天", daysAgo: "天前",
    openBoard: "用卡片看板開啟", openMd: "回到原始 Markdown",
    whoAmI: "這台電腦是誰在用", whoAmIDesc: "留言要靠它認出「哪幾則是我留的」。只存在這台電腦上,不會同步。",
    people: "指派人名單", peopleDesc: "用逗號隔開,例如:嘉峻, 欣明, 月柑",
    busy: "剛剛那個動作還在存,等一下再按",
    lost: "找不到這張卡片的位置,檔案可能剛被別台電腦改過,請重新整理再試一次",
    conflict: "偵測到同步衝突檔",
    saved: "已存檔",
    add: "新增", added: "✓ 已新增", submit: "送出", submitHint: "Shift / M + Enter 送出",
    submitHintEnter: "Enter 送出 · Shift + Enter 換行",
    newPerson: "新的名字",
    needSomething: "主題和內容至少要有一個",
    dToday: "今天", dTomorrow: "明天", dNextWeek: "下週", rangeHint: "要做一段區間才填第二個日期",
    noDate: "未定", undated: "未排期", archived: "封存", archive: "封存", unarchive: "取消封存",
    undone: "取消完成", unpin: "取消置頂", moveTo: "移到", openInMd: "回到原始 Markdown",
    changeDate: "點一下改日期", changeAssignee: "點一下改指派給誰", pickColor: "點一下換顏色",
    monthUnit: " 月", expandYear: "展開整年", collapseYear: "收合",
    removePerson: "從名單移除（卡片裡的名字不會動）",
    dupName: "這個名字已經在名單裡了",
    whoAmIShort: "留言的「編輯」認的是這個人",
    clearToDelete: "清空再存 = 刪掉這一則",
    defaultRange: "打開看板時先看哪一段", defaultRangeDesc: "每次開看板的預設篩選範圍",
    colors: "顏色",
    calendar: "行事曆", pickStart: "點一天當開始", pickEnd: "再點一天當結束", close: "收起",
    週名: ["日", "一", "二", "三", "四", "五", "六"],
    週寬: "1.9em",       // 1.5:卡片日期的「(一)」固定寬,每一列的日期左右邊才對得齊

    日期欄寬: 128, 補日期欄寬: 84, 分類欄寬: 72,     // 1.5:110 → 128,日期兩段固定寬之後留一點呼吸,跨年的「26-12-30(三)」也放得下
    everyShort: "每NU", everyLong: "每 N L循環",
    unitDay: "天", unitWeek: "週", unitMonth: "月",
    longDay: "天", longWeek: "週", longMonth: "個月",
    topic: "主題", hotTopics: "常用主題", section: "分類",
    colDate: "日期", colSection: "分類", colBody: "內容",
    dayLayer: "本日", weekLayer: "本周", monthLayer: "本月",
    setToday: "設為今日", doneTag: "已完成", archivedTag: "已封存", colorWord: "改成",
    longTerm: "週期", showTodo: "未完成", showDone: "已完成", showArchived: "含封存",
    undatedBlock: "未寫日期", fillDate: "補日期",
    clearSearch: "清空主題和內容,回到平常的看板（Esc）",
    expandAll: "全部展開", collapseAll: "收回",
    sortEdited: "新增/編輯順序", sortColor: "分類顏色順序",
    tools: "更多功能", merge: "融合", mergeCol: "融合", mergeDo: "融合成一張",
    mergeHint: "勾好要合併的卡片（已選 N 張）", merged: "✓ N 張已合併成一張",
    exportPng: "匯出長圖",
    exporting: "輸出中…", exported: "✓ 已輸出", exportFail: "輸出失敗,請再試一次",
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
    jumpDone: "標成已完成 → 自動勾選「已完成」", jumpTodo: "移回未完成 → 自動勾選「未完成」",
    jumpArchive: "封存 → 自動勾選「含封存」", jumpToday: "設為今日",
    calMonthTotal: "這個月 D 張 ‧ N 天有卡片", thisMonth: "回到本月",
    changing: "更改中…", cancelWord: "取消", more: "更多", less: "收合",
    finish: "完成", undoEdit: "復原這一次編輯(全部刪掉了也退得回來)",
    sectionsAndPeople: "分類與封存區", editHere: "在這裡改",
    ambiguous: "有兩張卡片的第一行一模一樣,分不出要改哪一張。先把其中一張的第一行改掉一點,再試一次",
    dupWarn: "這一行跟另一張卡片一模一樣,之後會分不出誰是誰",
    boardReady: "✓ 已建立 1 2 3 4 5 五個分區",
    jumpAdd: "新增卡片", jumpAddDesc: "新增完把畫面帶到那張卡片並閃一下",
    editPos: "按下編輯之後,那張卡片停在哪裡",
    editPosDesc: "內容很長的時候,編修框會一次撐開很多行。不處理的話瀏覽器會把畫面拉到框的底部。",
    editPosKeep: "原地不動（預設）", editPosTop: "拉到最上面", editPosNone: "交給瀏覽器",
    pinnedBlock: "置頂", addBlock: "新增卡片", filterBlock: "時間篩選", fold: "收合", unfold: "展開", lastEdited: "最後編輯",
    meName: "我",
    donate: "支持這個外掛", donateDesc: "卡片看板是一個人利用下班時間做的。覺得好用的話,可以請作者喝杯咖啡。",
    donateBtn: "在 Ko-fi 贊助",
    reportBug: "回報問題", reportBugDesc: "打開 GitHub issue。外掛版本、Obsidian 版本、平台會自動帶入;不會帶任何筆記內容。",
    copyDebug: "複製除錯資訊", copiedDebug: "已複製除錯資訊", allVersionsLink: "所有版本的更新紀錄(GitHub)", feedbackLink: "回饋與討論",
    月名: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
    weekMon: "週一起（預設）", weekSun: "週日起",
    sendKey: "送出鍵", sendKeyDesc: "新增卡片、編輯內容、寫留言、改留言都用同一套",
    sendKeyCombo: "Enter 換行；Shift / Ctrl / ⌘ + Enter 送出（預設）", sendKeyEnter: "Enter 送出；Shift + Enter 換行",
    useComments: "使用留言功能", useCommentsDesc: "關掉之後卡片上不再有留言鈕,也不顯示留言。筆記裡已經寫好的留言不會被刪掉,再打開就回來。",
    hoverHighlight: "滑過卡片時高亮", hoverHighlightDesc: "滑鼠停在卡片上時,整張卡片亮一點。",
    showEditTime: "顯示最後編輯時間", showEditTimeDesc: "卡片右上角的 🕐 時間。關掉只是不顯示,筆記裡的 [ed:: …] 時戳照樣會寫(分辨同名卡片要用)。",
    jumpPin: "置頂 → 跳到那張卡片",
    pinTopic: "釘選這個主題", unpinTopic: "取消釘選", topicsPinHint: "所有主題(可以打字查,📌 釘選的會一直排在最前面)",
    showTopics: "展開常用主題", hideTopics: "收起常用主題", topicFull: "主題最多 3 個",
    topicCut: "主題最多 6 個中文字(英文 12 個字母),多的截掉了",
    archivePreview: "預覽這一區(按 ✓ 才真的封存)",
    backToEdit: "回到詳細編輯",
    layoutToggleWide: "改成寬版", layoutToggleNarrow: "改成窄版",
    commentPos: "留言放在哪裡", commentPosDesc: "卡片的留言顯示在內容的上面或下面",
    commentAbove: "內容上面（預設）", commentBelow: "內容下面",
    bullet: "新增卡片時自動加項目符號「-」", bulletDesc: "開著的話,新增卡片時沒有自己打符號的內容行會寫成「- 內容」(畫面上顯示成「．」)。已經寫好的內容不會被加上或拿掉,編輯時照你打的寫 —— 自己打「- 」「* 」「1. 」都會留著。內容裡的待辦一律寫成「- [ ]」(打「-[ ]」「[]」也可以)。預設關。",
    doneRec: "本次完成",
    whatsNew: "看這一版更新了什麼", noWhatsNew: "這一版沒有更新介紹",
    updates: "更新內容", updatesDesc: "現在是 N。這一版的更新介紹,以及每一版加了什麼", updatesBtn: "看更新內容", allVersions: "所有版本",
    setGeneral: "一般", setLook: "卡片外觀", setEdit: "新增與編輯", setFormat: "筆記格式", setSupport: "支持",
    convertAll: "把舊寫法全部轉成新格式(測試中)",
    convertAllDesc: "記住用卡片看板開的筆記有 N 份,把裡面 1.6.1 以前寫法的卡片一次換成新格式([due:: …]、[pin:: on]、[repeat:: …]、[cm:: …]、最後一行的 [ed:: …])。平常不需要按:舊寫法照讀,卡片被改到的時候會自己換。",
    convertBtn: "全部轉換",
    convertAsk: "⚠ 這會一次改寫下面這些筆記裡的每一張舊寫法卡片:\n\nLIST\n\n" +
      "・轉換前會在每份筆記旁邊存一份原文備份(「名字 backup-日期-時間」),但還是請先自己再備份一次。\n" +
      "・有用 Obsidian Sync 或好幾台裝置的話,先確認其他裝置都同步完了、沒有人正在編輯這幾份筆記。\n" +
      "・1.6.0 以前的卡片看板讀不懂新寫法(置頂、循環、留言、區間會失效),其他裝置要先更新到 1.6.1。\n" +
      "・這個動作沒有復原鍵,要還原只能用備份。",
    convertYes: "我了解,全部轉換",
    convertNone: "沒有需要轉換的卡片",
    convertDone: "✓ 已轉換 N 張卡片(F 份筆記),原文備份在每份筆記旁邊",
    convertFail: "有 N 份筆記沒有轉換(備份失敗或檔案剛被改過),原檔沒動",
    doneLook: "已完成的卡片長相", doneLookDesc: "做完的跟還沒做的要一眼分得出來",
    doneBoth: "淡化 + 劃掉", doneFade: "只淡化", doneStrike: "只劃掉", doneNone: "不變",
    saving: "儲存中…", saveFailed: "沒存進去,字還在框裡,再按一次儲存",
    backToMd: "回到 Markdown 閱讀模式", openWithBoard: "用卡片看板開啟",
    needArchiveFirst: "要先封存才能刪除",
    cycleEdit: "改循環", cycleEvery: "每", cycleDay: "天", cycleWeek: "週", cycleMonth: "個月",
    cycleOff: "取消循環", cycleNone: "不循環", cycleSaved: "✓ 循環已改成 N",
    customColor: "自訂顏色", resetColor: "重設為自動",
    // ---- 1.5 ----
    editCursor: "按下編輯之後游標在哪裡", editCursorDesc: "電腦版按下編輯會直接把游標放進內容:放在最前面或最後面(手機不會自動聚焦)",
    cursorStart: "最前面（預設）", cursorEnd: "最後面",
    showSectionName: "顯示分類名稱", showSectionNameDesc: "把分類的標題當成狀態顯示(例如把紅色那一區取名「等回復」):電腦版在完成圓點上方,手機版在主題後面。點名字可以換分類;卡片完成之後改顯示「已完成」。",
    changeSection: "點一下換分類", changeSectionMenu: "換分類",
    unpinOnDone: "完成時自動取消置頂", unpinOnDoneDesc: "置頂的卡片標成完成,同時取消置頂",
    sectionExists: "已經有叫這個名字的分類了",
    askOpenTitle: "用卡片看板開啟", askOpenBody: "「N」還沒有用卡片看板開過。", askOpenThis: "把這份筆記開成卡片看板",
    askOpenNew: "開一份新檔案當卡片看板", newBoardName: "卡片看板",
    // ---- 1.6 ----
    月年: "Y年M", tileHint: "點一下看這一段,再點一次回到今天", backToToday: "回到今天",
    weekRule: "一週怎麼算",
    weekRuleDesc: "決定「週」那一格的範圍和行事曆的第一欄。週照星期切,可以跨月(例如 9/28–10/4);「今天起七天」只套用在包含今天的那一週,往前往後翻還是照星期;「每月 1 號起」是 1–7、8–14…,最後一段到月底。",
    weekMonRolling: "週一起,這一週改成今天起七天", weekSunRolling: "週日起,這一週改成今天起七天",
    weekMonthStart: "每月 1 號起,每七天一段",
    backDiscard: "返回(放棄這次的修改)", discardAsk: "這次的修改還沒儲存,確定要放棄嗎?", discard: "放棄修改",
    sectionNamePh: "分類名稱", addSection: "新增分類", deleteSection: "刪除這個分類",
    sectionLimit: "分類最少 1 個、最多 10 個", sectionNameEmpty: "分類名稱不能空白",
    sectionReserved: "分類名稱不能有「封存」或 archive,那是封存區專用的",
    moveCardsTo: "裡面有 N 張卡片,要搬到哪一個分類?", willDelete: "刪除「N」", undoDelete: "不刪了",
    willRemove: "移除「N」(卡片裡的名字不會動)",
    useAssignees: "使用指派人", addPerson: "新增指派人"
  },
  "en": {
    board: "Card Table - Dated Tasks", today: "Today", week: "This week", month: "This month",
    all: "All", overdue: "Overdue", search: "Search title or content…",
    /* ⚠ 這個字會出現在兩個很窄的地方:新增列的欄框標籤,以及沒有指派人的卡片上那個
       「＋ …」提示。"Assignee" 兩邊都塞不下(分類欄要撐到 88px 才不會被切)。
       設定頁那些位置寬鬆的地方仍然用完整的 Assignees / Manage assignees。 */
    assignee: "Who", none: "Unassigned", noCards: "No cards in this range",
    edit: "Edit", save: "Save", cancel: "Cancel", comment: "Comment", pin: "Pin",
    archiveZone: "Archive", archiveSection: "Archive the whole section (applies when you save)", unarchiveSection: "Keep", oldArchived: "Cards archived one by one", restoreSection: "Restore this section", restoreAgain: "Click again to restore", searchArchive: "Search this section", detailEdit: "Detailed edit", backToBoard: "Back to board", done: "Done", placeholder: "Leave a note for everyone…", cards: "", undo: "click to undo", doneOnceShort: "click = done this time",
    moveOut: "Move out of Card Table", moveOutYes: "Move out",
    moveOutAsk: "Move “NAME” out?\nThe CNT cards in this section move to:\nFILE\nThe section then disappears from the archive list (the file stays).",
    moveOutFailed: "Move out failed: the new file could not be created, the note was left untouched",
    deleteAllSection: "Delete this whole section (gone for good)", deleteAllYes: "Delete",
    deleteAllAsk: "Delete “NAME” entirely?\nThe CNT cards in this section are removed from the note,\nwith no copy kept and no way back.",
    moveOutSuffix: "Suffix for moved-out files", moveOutSuffixDesc: "A moved-out section is saved as the section name plus this suffix. Default “-card table-archive”.",
    moveOutFolder: "Folder for moved-out files", moveOutFolderDesc: "Empty = the same folder as the board note (default). Give a path (e.g. Archive/2026) to use that folder; it has to exist already.",
    justNow: "just now", minsAgo: "m ago", hoursAgo: "h ago",
    yesterday: "yesterday", daysAgo: "d ago",
    openBoard: "Open as Card Table", openMd: "Back to raw Markdown",
    whoAmI: "Who is using this computer", whoAmIDesc: "Used to tell which comments are yours. Stored on this computer only; never synced.",
    people: "Assignees", peopleDesc: "Comma separated, e.g. Alice, Bob, Carol",
    busy: "The previous action is still saving — try again in a moment",
    lost: "Could not find this card any more; the file may have just changed on another device. Reload and try again.",
    conflict: "Sync conflict file detected",
    saved: "Saved",
    add: "New", added: "✓ Added", submit: "Add", submitHint: "Shift / M + Enter to add",
    submitHintEnter: "Enter adds · Shift+Enter newline",
    newPerson: "New name",
    needSomething: "Give it a title or some content",
    dToday: "Today", dTomorrow: "Tomorrow", dNextWeek: "Next week", rangeHint: "Second date only for a range",
    noDate: "—", undated: "Undated", archived: "Archived", archive: "Archive", unarchive: "Unarchive",
    undone: "Mark not done", unpin: "Unpin", moveTo: "Move to", openInMd: "Back to raw Markdown",
    changeDate: "Click to change the date", changeAssignee: "Click to reassign", pickColor: "Click to recolour",
    monthUnit: "", expandYear: "Whole year", collapseYear: "Collapse",
    removePerson: "Remove from the list (names in cards are left alone)",
    dupName: "That name is already on the list",
    whoAmIShort: "comments recognise you as this person",
    clearToDelete: "clear the text and save to delete it",
    defaultRange: "Range on open", defaultRangeDesc: "Which filter the board starts on",
    colors: "Colours",
    calendar: "Calendar", pickStart: "Click a day to start", pickEnd: "Click another day to end", close: "Close",
    週名: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    週寬: "3.3em",       // (Wed) 最寬(3em 量到差 2px)
    日期欄寬: 150, 補日期欄寬: 112, 分類欄寬: 72,     // 1.5:132 → 150
    everyShort: "every N U", everyLong: "repeats every N L",
    unitDay: "d", unitWeek: "w", unitMonth: "mo",
    longDay: "days", longWeek: "weeks", longMonth: "months",
    topic: "Title", hotTopics: "Frequent titles", section: "Section",
    colDate: "Date", colSection: "Section", colBody: "Content",
    dayLayer: "Day", weekLayer: "Week", monthLayer: "Month",
    setToday: "Move to today", doneTag: "Done", archivedTag: "Archived", colorWord: "Recolour to",
    longTerm: "Repeat", showTodo: "To do", showDone: "Done", showArchived: "Archived",
    undatedBlock: "No date yet", fillDate: "Set date",
    clearSearch: "Clear title and body, back to the plain board (Esc)",
    expandAll: "Expand all", collapseAll: "Collapse",
    sortEdited: "Recently edited", sortColor: "Date then section",
    tools: "More", merge: "Merge", mergeCol: "Merge", mergeDo: "Merge into one",
    mergeHint: "Tick the cards to merge (N selected)", merged: "✓ Merged N cards into one",
    exportPng: "Export long image",
    exporting: "Exporting…", exported: "✓ Exported", exportFail: "Export failed — please try again",
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
    jumpDone: "Marked done → tick Done", jumpTodo: "Back to to do → tick To do",
    jumpArchive: "Archived → tick Archived", jumpToday: "Move to today",
    calMonthTotal: "D cards this month across N days", thisMonth: "This month",
    changing: "Changing…", cancelWord: "Cancel", more: "more", less: "less",
    finish: "Done", undoEdit: "Undo this edit (works even if you deleted everything)",
    sectionsAndPeople: "Sections and archive", editHere: "Edit here",
    ambiguous: "Two cards have the same first line, so I cannot tell which one to change. Edit one of them a little and try again",
    dupWarn: "This line is identical to another card, they will be hard to tell apart later",
    boardReady: "✓ Created sections 1 2 3 4 5",
    jumpAdd: "Adding a card", jumpAddDesc: "After adding, scroll to the new card and flash it",
    editPos: "Where a card sits when you start editing",
    editPosDesc: "A long card opens a tall editor. Left alone, the browser scrolls to the bottom of it.",
    editPosKeep: "Leave it where it is (default)", editPosTop: "Pull it to the top", editPosNone: "Let the browser decide",
    pinnedBlock: "Pinned", addBlock: "New card", filterBlock: "Time filters", fold: "Collapse", unfold: "Expand", lastEdited: "Last edited",
    meName: "me",
    donate: "Support this plugin", donateDesc: "Card Table is built by one person in spare time. If it helps you, you can buy the author a coffee.",
    donateBtn: "Support on Ko-fi",
    reportBug: "Report a problem", reportBugDesc: "Opens a GitHub issue. Plugin, Obsidian and platform versions are filled in; no note content is included.",
    copyDebug: "Copy debug info", copiedDebug: "Debug info copied", allVersionsLink: "Every version's changes (GitHub)", feedbackLink: "Feedback and discussion",
    月名: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    weekMon: "Monday (default)", weekSun: "Sunday",
    sendKey: "Submit key", sendKeyDesc: "The same for adding cards, editing content, writing and editing comments",
    sendKeyCombo: "Enter for a new line; Shift / Ctrl / ⌘ + Enter to submit (default)", sendKeyEnter: "Enter to submit; Shift + Enter for a new line",
    useComments: "Use comments", useCommentsDesc: "When off, cards have no comment button and comments are hidden. Comments already in the note are kept and come back when you turn this on.",
    hoverHighlight: "Highlight card on hover", hoverHighlightDesc: "Lightens the whole card while the mouse is over it.",
    showEditTime: "Show last edited time", showEditTimeDesc: "The 🕐 time on each card. Turning it off only hides it; the [ed:: …] stamp is still written to the note (it tells identical cards apart).",
    jumpPin: "Pinned → jump to the card",
    pinTopic: "Pin this title", unpinTopic: "Unpin this title", topicsPinHint: "All titles (type to search; pinned ones always come first)",
    showTopics: "Show titles", hideTopics: "Hide titles", topicFull: "Up to 3 titles",
    topicCut: "A title fits 6 CJK characters (12 letters); the rest was trimmed",
    archivePreview: "Preview this section (it is archived when you save)",
    backToEdit: "Back to detailed edit",
    layoutToggleWide: "Use wide layout", layoutToggleNarrow: "Use narrow layout",
    commentPos: "Where comments go", commentPosDesc: "Show a card's comments above or below its content",
    commentAbove: "Above the content (default)", commentBelow: "Below the content",
    bullet: "Add a - bullet to new cards", bulletDesc: "When on, content lines of a new card that have no marker of their own are written as “- text” (shown as ． on the board). Content that already exists never gains or loses bullets, and edits are saved as you type them — your own “- ”, “* ” and “1. ” stay. To-dos are always written as “- [ ]” (typing “-[ ]” or “[]” works too). Off by default.",
    doneRec: "Done",
    whatsNew: "What’s new in this version", noWhatsNew: "No release notes for this version",
    updates: "What’s new", updatesDesc: "You are on N. This version's highlights, and what each version added", updatesBtn: "See what's new", allVersions: "All versions",
    setGeneral: "General", setLook: "Cards", setEdit: "Adding and editing", setFormat: "Note format", setSupport: "Support",
    convertAll: "Convert everything to the new format (testing)",
    convertAllDesc: "N notes are remembered as Card Tables. Rewrite every card in them that still uses the pre-1.6.1 syntax to the new format ([due:: …], [pin:: on], [repeat:: …], [cm:: …], [ed:: …] as the last line). You normally don't need this: the old syntax is still read, and a card switches when it is changed.",
    convertBtn: "Convert all",
    convertAsk: "⚠ This rewrites every old-format card in these notes at once:\n\nLIST\n\n" +
      "• A copy of each note's original text is saved next to it first (“name backup-date-time”), but please make your own backup too.\n" +
      "• If you use Obsidian Sync or several devices, make sure they have finished syncing and nobody is editing these notes.\n" +
      "• Card Table 1.6.0 and older cannot read the new format (pins, repeats, comments and ranges stop working); update your other devices to 1.6.1 first.\n" +
      "• There is no undo; the backup is the only way back.",
    convertYes: "I understand, convert all",
    convertNone: "No cards need converting",
    convertDone: "✓ Converted N cards in F notes; the originals are backed up next to each note",
    convertFail: "N notes were not converted (backup failed or the file just changed); they were left untouched",
    doneLook: "How done cards look", doneLookDesc: "Done and not-done should read apart at a glance",
    doneBoth: "Fade + strike through", doneFade: "Fade only", doneStrike: "Strike through only", doneNone: "No change",
    saving: "Saving…", saveFailed: "Not saved. Your text is still here, press save again",
    backToMd: "Back to Markdown", openWithBoard: "Open with Card Table",
    needArchiveFirst: "Archive it first, then you can delete it",
    cycleEdit: "Repeat", cycleEvery: "every", cycleDay: "day(s)", cycleWeek: "week(s)", cycleMonth: "month(s)",
    cycleOff: "Stop repeating", cycleNone: "No repeat", cycleSaved: "✓ Repeat set to N",
    customColor: "Custom colour", resetColor: "Back to automatic",
    // ---- 1.5 ----
    editCursor: "Cursor position when editing", editCursorDesc: "On desktop, Edit puts the cursor straight into the content: at the start or the end (phones do not focus automatically)",
    cursorStart: "Start (default)", cursorEnd: "End",
    showSectionName: "Show section names", showSectionNameDesc: "Show each card's section heading as its status (for example, name the red section “Waiting”): above the done circle on desktop, after the title on phones. Tap the name to move the card to another section; done cards show Done instead.",
    changeSection: "Click to move to another section", changeSectionMenu: "Change section",
    unpinOnDone: "Unpin when marked done", unpinOnDoneDesc: "A pinned card that is marked done is unpinned at the same time",
    sectionExists: "A section with that name already exists",
    askOpenTitle: "Open with Card Table", askOpenBody: "“N” has not been opened with Card Table yet.", askOpenThis: "Open this note as a Card Table",
    askOpenNew: "Create a new Card Table note", newBoardName: "Card Table",
    // ---- 1.6 ----
    月年: "M Y", tileHint: "tap to view this range, tap again to go back to today", backToToday: "Back to today",
    weekRule: "How weeks are counted",
    weekRuleDesc: "Sets the Week tile and the first column of the calendar. Weeks follow the weekdays and may cross months (for example 9/28–10/4). Seven days from today only applies to the week containing today; stepping back or forward uses weekdays again. From the 1st of each month gives 1–7, 8–14… with the last part ending on the last day of the month.",
    weekMonRolling: "Monday; this week is seven days from today", weekSunRolling: "Sunday; this week is seven days from today",
    weekMonthStart: "From the 1st of each month, seven days at a time",
    backDiscard: "Back (discard these changes)", discardAsk: "You have unsaved changes. Discard them?", discard: "Discard",
    sectionNamePh: "Section name", addSection: "Add section", deleteSection: "Delete this section",
    sectionLimit: "Keep between 1 and 10 sections", sectionNameEmpty: "A section needs a name",
    sectionReserved: "Section names cannot contain “archive”, that name belongs to the archive section",
    moveCardsTo: "N cards inside. Move them to:", willDelete: "Delete “N”", undoDelete: "Keep it",
    willRemove: "Remove “N” (names in cards are left alone)",
    useAssignees: "Use assignees", addPerson: "Add assignee"
  }
};
/* onload 的時候放進來。快捷鍵要去問 app.hotkeyManager,而處理鍵盤的是一個
   掛在 window 上的普通函式,拿不到 this —— 所以這裡留一個給它用。 */
let 目前app = null;
/* 窄螢幕。
   ⚠⚠ 1.4.4 起**只有這裡**判斷窄不窄,styles.css 裡已經沒有 @media (max-width) 了。
   看板在 畫() 的時候問一次,把答案掛成 `.tk-窄` 這個 class,CSS 全部跟著 class 走。
   以前是 JS 和 CSS 各自判斷(JS 決定工具列要不要收成選單、CSS 決定表格要不要攤平),
   兩邊只要有一邊沒跟上(例如視窗剛拉寬、還沒重畫)就是半套版面;
   而且 CSS 要把桌機的 inline style 蓋掉只能用 !important、要把表格攤平只能用 display:contents
   —— 審核那兩項警告全是從這裡來的。現在窄螢幕的卡片直接由 JS 畫成另一種結構,兩個都不需要了。
   視窗跨過門檻時由 onOpen 掛的監聽器重畫。 */
const 窄門檻 = "(max-width: 700px)";
// 看板分頁本身比這個窄,也用窄版(1.4.7,見 看板視圖.該窄)。桌機表格加統計列大約要這麼寬才放得下
const 窄分頁寬 = 560;
function 是窄螢幕() {
  try { return window.matchMedia(窄門檻).matches; }
  catch (e) { return false; }
}
function 是Mac() {
  try { return /mac|iphone|ipad/i.test(window.navigator.platform || window.navigator.userAgent || ""); }
  catch (e) { return false; }
}

let 語言設定 = "auto";      // auto = 跟著 Obsidian;也可以強制 zh-TW / en
function 語() {
  if (語言設定 === "zh-TW" || 語言設定 === "en") return 字典[語言設定];
  try {
    /* ⚠ 1.4.2:這裡本來是 localStorage.getItem("language")。
       社群外掛的審核會把「自己動 localStorage」列為建議事項(該用官方的資料 API),
       而且那個 key 是 Obsidian 的內部實作,不是公開介面。
       `<html lang>` 是同一個值、是公開的 DOM,而且 Obsidian 換語言時會自己更新它。
       ⚠ 不可以改用 navigator.language —— 那是**作業系統**的語言,
         使用者的 Windows 是 zh-TW 但 Obsidian 介面設成英文的時候會判斷成中文。 */
    const l = String(document.documentElement.lang || "").toLowerCase();
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
  跳轉_封存: true,              // 1.4.6:封存之後要不要自動勾「含封存」並跳過去(以前是一定會)
  跳轉_置頂: true,              // 1.4.7:置頂之後要不要跳到那張卡片
  /* 1.4.7 */
  週起始: "一",                 // 一 = 週一 / 日 = 週日。影響「本周」的範圍和行事曆的第一欄
  送出鍵: "組合",               // 組合 = Enter 換行、Shift/Ctrl/⌘+Enter 送出 / Enter = Enter 送出、Shift+Enter 換行
  使用留言: true,               // false = 不顯示留言和留言鈕(筆記裡的留言不動)
  顯示編輯時間: true,           // false = 卡片上不顯示 🕐(1.4.8;✎ 時戳照寫)
  /* 常用主題裡釘選的那幾個,永遠排在最前面。
     ⚠ 1.5 起**每份筆記各自一組**:{ "路徑.md": ["主題", …] }。1.4.7–1.4.9 是全部筆記共用一個陣列,
       開新檔案也冒出別份筆記的釘選。舊的陣列在 onload 搬到 釘選主題_舊,
       哪一份筆記裡真的有那幾個主題,第一次打開時就認領過去(見 認領舊釘選)。 */
  釘選主題: {},
  /* 1.5 */
  編輯游標: "前",               // 前 = 按編輯時游標在最前面(預設)/ 後 = 最後面
  滑過高亮: false,              // 1.6.3 C20:滑過卡片整張亮一點
  顯示分類名稱: false,          // 卡片上寫出分類標題(桌機在完成圓點上方、手機在主題右邊)
  完成取消置頂: false,          // 置頂的卡片標成完成時,順便取消置頂
  週模式: "週曆",               // 週曆 = 照星期 / 七天 = 包含今天的那一週改成今天起七天 / 月初 = 每月 1 號起每七天(1.6)
  /* 1.4.6 個人使用:不用指派人。新增區沒有指派人欄位、卡片不顯示指派人、新卡片不寫 #名字。
     ⚠ 只管畫面和新寫的東西,筆記裡已經有的 #名字 一個字都不動。 */
  個人模式: true,               // 1.6:新裝的預設不用指派人(設定面板裡的開關是灰的);已經存過設定的人照舊
  跳轉_設回今日: true,
  跳轉_新增: true,
  /* 按下「編輯」之後,那一張要停在畫面的哪裡。
     原位 = 停在原本的高度,畫面完全不動(預設)
     頂端 = 把那一列拉到看板上緣,長內容從第一行開始看
     不動 = 交給瀏覽器 —— 內容一長它會把畫面拉到編修框底部 */
  編輯位置: "原位",
  /* 1.4.5 新增的三個版面設定
     版面寬度 窄 = 跟 Obsidian 可讀行寬一樣收在中間(預設)/ 寬 = 用滿分頁。只管桌機。
     留言位置 上 = 留言在內容上面(預設,原本的樣子)/ 下 = 內容下面
     項目符號 true = 寫入和顯示「．」(預設)/ false = 都不要 */
  版面寬度: "窄",
  留言位置: "上",
  項目符號: false,              // 1.6.1:設定拿掉了,留著這個鍵只是為了讀舊的 data.json 不出錯
  排序: "編修",          // 編修 = 最近新增/編修的排最上面(預設);顏色 = 日期 → 分類順序
  /* 1.6.3(U44,mockup v14 Q27 定案)封存區「移出」出去的檔案叫什麼、放哪裡。
     移出後綴   接在封存區名字後面(`2025秋季專案-card table-archive.md`)
     移出資料夾 空的 = 跟看板筆記同一個資料夾(使用者定的預設);填了就放那個資料夾 */
  移出後綴: "-card table-archive",
  移出資料夾: "",
  看過版本: "",          // 1.6.1:更新介紹看過哪一版(見 秀更新介紹)
  版本: 插件版本
};
/* 「這台電腦是誰在用」。故意不進 data.json —— 那個會被 Obsidian Sync 同步,
   同步過去就變成三台電腦都說自己是同一個人。
   ⚠ 走 app.loadLocalStorage / saveLocalStorage,不要自己碰 window.localStorage:
     前者會**照 vault 分開存**,同一台電腦開兩個 vault 才不會互相蓋掉身分。 */
const 我是誰鍵 = "card-table-who";
function 讀我是誰() {
  try { return String((目前app && 目前app.loadLocalStorage(我是誰鍵)) || "").trim() || null; }
  catch (e) { return null; }
}
function 存我是誰(名) {
  try {
    if (!目前app) return;
    目前app.saveLocalStorage(我是誰鍵, 名 ? String(名) : null);
  } catch (e) {}
}
/* 新增區收起來了沒。跟「我是誰」一樣記在這台裝置 ——
   手機上常常收起來省空間、電腦上多半開著,放進 data.json 同步過去會互相打架。 */
/* 置頂表收起來了沒(1.4.5),理由同上。 */
const 新增收合鍵 = "card-table-add-folded";
const 置頂收合鍵 = "card-table-pin-folded";
const 篩選收合鍵 = "card-table-filter-folded";   // 1.4.9:篩選列也能收
const 清單收合鍵 = "card-table-list-folded";     // 1.6:清單表也能收
function 讀收合(鍵) {
  try { return String((目前app && 目前app.loadLocalStorage(鍵)) || "") === "1"; }
  catch (e) { return false; }
}
function 存收合(鍵, 收) {
  try { if (目前app) 目前app.saveLocalStorage(鍵, 收 ? "1" : null); } catch (e) {}
}
function 讀新增收合() { return 讀收合(新增收合鍵); }
function 存新增收合(收) { 存收合(新增收合鍵, 收); }
/* 1.6.3(U26,使用者 09-20):常用主題那一排可以收合,**預設收起** ——
   所以不能用 讀收合()(它沒存就是展開),這裡沒存當成 "1"。理由同上:記在這台裝置。 */
const 主題收合鍵 = "card-table-topics-folded";
function 讀主題收合() {
  try { return String((目前app && 目前app.loadLocalStorage(主題收合鍵)) || "1") === "1"; }
  catch (e) { return true; }
}
function 存主題收合(收) {
  try { if (目前app) 目前app.saveLocalStorage(主題收合鍵, 收 ? "1" : "0"); } catch (e) {}
}
/* U33(1.6.3,使用者 09-20「不可不指派」):新增卡片的指派人是誰 ——
   選過的優先,其次「這台電腦是誰」,最後名單第一個。舊的 ""(選了不指派)當成沒選過。
   名單整個是空的才回 "",那時候畫空頭像(user-plus)。 */
function 人選之(選過, 我, 名單) {
  const 單 = Array.isArray(名單) ? 名單.filter(Boolean) : [];
  return String(選過 || "").trim() || String(我 || "").trim() || 單[0] || "";
}

/* ============================================================
   格式 —— 跟現在的卡片日誌一模一樣,一個字都沒改
   ------------------------------------------------------------
   ⚠ 這一整段是「合約」。要動格式,先看 `搬遷清單.md` 裡的規則:
     舊格式永遠讀得懂,新格式才是寫出去的樣子。
   ============================================================ */
/* ⚠⚠ 1.6.1 的寫法(2026-09-17 跟使用者定案,見 CLAUDE.md「1.6.1 的格式」)——
   用 Dataview / Tasks 的行內欄位 `[key:: value]`:
     - [ ] [pin:: on] [主題] [start:: 2026-09-01] [due:: 2026-09-30] [repeat:: every 2 weeks] #指派人
     	內容(照使用者打的,符號可有可無)
     	[done:: 2026-09-02]                ← 只有循環卡片的「本次完成」會寫
     	[cm:: 2026-09-17 09:00|欣明] 留言
     	[ed:: 2026-09-17 02:37]            ← 永遠是卡片的最後一行
   ・start / due / repeat 是 Tasks 外掛認得的欄位名,Tasks、Dataview、Task Genius 都讀得到日期;
     只有一天的卡片只寫 due。筆記裡的時間一律四碼年份(畫面上怎麼顯示是另一回事)。
   ・內容不放第一行(沒有主題的卡片例外,第一行內容留在第一行)。
   ・不認得的欄位(Tasks 寫的 [completion:: …]、[priority:: …]…)原樣留在第一行尾巴。
   ・**舊寫法永遠照讀,改到才轉**:1.6.0 以前的 ＠{} ✎{} 📌 🔁 💬 ．,以及 1.6.1 開發中寫過的
     Ed{} Pin{} Re{} Cm{} Done{} @{a} ~ @{b}。每一次寫入都經過 蓋卡(),那一張就換成新寫法;沒被寫到的卡片一個字都不動。 */
const 顯示符 = "•";           // 純文字場合(拖曳預覽)的項目符號;卡片上用 Obsidian 的 .list-bullet(見 畫預覽行)
/* 項目符號:**既往不咎**(使用者明講)。1.6.1 起「自動加項目符號」的設定拿掉了,自動項目符 固定 false ——
   內容一律照使用者打的寫(自己打的 `- `、`* `、`1. ` 都留著),畫面只在有符號的行畫 bullet。
   外掛自己寫的行(留言、本次完成、ed)**不帶**符號(使用者明講);舊的「- [cm:: …]」照讀。程式路徑(新增行)留著,將來要加回來再討論。 */
let 自動項目符 = false;
function 符() { return 自動項目符 ? "- " : ""; }
// 內容裡的待辦(`[ ] …`)一定要有 `- `,不然就不是 checkbox 了
const 內勾Re = /^\[( |x|X)\][\t ]+/;
/* 1.6.3(A4)一行原文是不是「會畫成方框」的待辦:縮排、任意層 `> `(callout / 引用)、清單符號、`[ ]`。
   $1 = 符號前面的全部、$2 = 符號加空白、$3 = 方框後面的字 */
const 勾行Re = /^([ \t]*(?:>[ \t]?)*[ \t]*)((?:[-*+]|\d+[.)])[ \t]+)\[(?: |x|X)\](?=[ \t]|$)[ \t]*(.*)$/;
// 方框的字比對用:去掉 Markdown 記號和空白(畫出來的字沒有 ** [[ ]] 這些)
function 勾字正規(t) { return String(t || "").replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2").replace(/[*_=~`#\[\]()!\s]/g, ""); }
function 帶符(x) { x = String(x || ""); return 內勾Re.test(x) ? "- " + x : 符() + x; }
/* 待辦的各種打法(`-[ ]`、`[]`、`* - [ ]`、`．[x]`)一律整理成 `- [ ] ` / `- [x] `。x = 不含前面縮排的一行 */
function 正規勾(x) {
  return String(x || "").replace(/^(?:[-*+．·・•][\t ]*)*\[( ?|x|X)\][\t ]*/,
    (a, c) => "- [" + (c === "x" || c === "X" ? "x" : " ") + "] ");
}
// 一行內容剝掉縮排和符號之後的字(內容行 存的就是這個)
function 內文之(t) { return 去符(正規勾(String(t || "").replace(/^[ \t]+/, ""))); }
// 一行內容原本的符號:`- `、`* `、`1. `…;舊的「．」算 `- `;待辦算 `- `;沒有就是 ""
function 取符(t) {
  const x = 正規勾(String(t || "").replace(/^[ \t]+/, ""));
  const m = 符號Re.exec(x);
  if (!m) return "";
  return /[．·・•]/.test(m[0]) ? "- " : m[0].replace(/[\t ]+/g, " ");
}
// 使用者打的一行 → 要寫進筆記的樣子(不含縮排):照打的,只整理待辦、把「．」換成「- 」
function 照打行(t) {
  return 正規勾(String(t || "").trim()).replace(/^[．·・•][\t ]*/, "- ").trim();
}
/* 1.6.2(B3)內容照你打的存:編修框裡的一段字 → 卡片的內容行(還沒加卡片那一層的 tab)。
   每一行只整理待辦的寫法(正規勾)、把舊的「．」換成「- 」;**行首縮排、行中的空白、中間的空行都照打的**,
   行尾空白拿掉、頭尾的空行拿掉。
   ⚠ 1.6.1 以前是 照打行() + 寫手.一行():縮排被 trim 掉、兩個以上的空白壓成一個、空行丟掉 ——
     巢狀清單存回去就變成同一層,表格的對齊也沒了。 */
function 照打段(文) {
  const 行們 = String(文 || "").replace(/\r/g, "").split("\n").map(t => {
    const s = t.replace(/\s+$/, ""), 空 = 前空白(s);
    return s ? 空 + 照打行(s.slice(空.length)) : "";
  });
  while (行們.length && !行們[0]) 行們.shift();
  while (行們.length && !行們[行們.length - 1]) 行們.pop();
  return 行們;
}
/* 1.6.2(B3)卡片底下的原始行 → 拿掉「卡片那一層」的縮排。
   基準 = 所有非空白行共同的行首空白(通常是一個 tab;使用者自己改筆記時也可能是空白),
   比基準更深的縮排照留,巢狀清單的層級才不會掉。空白行變成 ""。 */
function 去卡縮排(行們) {
  const 非空 = 行們.filter(t => String(t).trim());
  let 基 = 非空.length ? 前空白(非空[0]) : "";
  非空.forEach(t => { while (基 && !String(t).startsWith(基)) 基 = 基.slice(0, -1); });
  return 行們.map(t => {
    t = String(t);
    if (!t.trim()) return "";
    return 基 ? t.slice(基.length) : t.replace(/^(\t| {1,4})/, "");
  });
}
// 新增卡片的一行:開著自動項目符號,而且這一行沒有自己的符號,才加「- 」(目前固定不加)
function 新增行(t) {
  const x = 照打行(t);
  return (x && 自動項目符 && !符號Re.test(x)) ? "- " + x : x;
}
/* 沒有主題的卡片,第一行內容放在第一行 —— 但那一行有符號(待辦、清單)、長得像 [主題] 或 [欄位:: 值] 的話不行,
   讀回來會變成別的東西,那就從第二行開始。x = 照打行() 的結果 */
function 可放首行(x) { return !!x && !符號Re.test(x) && !主題Re.test(x) && !欄首Re.test(x); }
// 畫面上顯示的內文:本次完成的記錄 [done:: 2026-09-16] 照語言寫成「✔ 本次完成 26-09-16(三)」
function 顯示內文(t, T) {
  const m = 完成記Re.exec(String(t || ""));
  return m ? "✔ " + T.doneRec + " " + 日期短(m[1] || m[2]) : t;
}
/* 1.6.2(B4 / B7)要交給 Obsidian 渲染的 Markdown:內容原文照樣,只把循環的 [done:: 日期] 記錄換成「✔ 本次完成 日期」。
   看板(畫md)和匯出長圖(輸出白底DOM)用同一個,兩邊才長得一樣。 */
// 1.6.3(A5)畫出來有這些東西的內容不快取(活的:嵌入、外掛的程式碼區塊、可以摺的 callout、影音)
const md不快取 = ".internal-embed, iframe, video, audio, [class*='block-language-'], .callout.is-collapsible";
function 顯示md(原, T) {
  return (原 || []).map(t => { const x = 內文之(t), d = 顯示內文(x, T); return (d !== x) ? 前空白(t) + d : t; }).join("\n");
}
const 符號Re = /^(?:[-*+]\s+|\d+[.)]\s+|[．·・•]\s*)+/;
const 卡首Re = /^(\s*)-\s+\[( |x|X)\]\s*(.*)$/;      // - [ ] 或 - [x]
/* [主題]。⚠ 開頭是 [[連結]]、[文字](網址)、`[ ]` 待辦、`[key:: 值]` 欄位的都不是主題 */
const 主題Re = /^\[(?!\[)(?![ xX]\])((?:(?!::)[^\]\n]){1,40})\](?!\()\s*/;

/* ---- 行內欄位 [key:: value] / (key:: value) ---- */
const 欄Re = /[ \t]*[\[(]([A-Za-z][\w-]*)::[ \t]*([^\]\)\n]*?)[ \t]*[\])]/g;
const 欄首Re = /^[\[(][A-Za-z][\w-]*::/;
// 把一段字裡所有的欄位拿出來:{ 剩: 拿掉欄位之後的字, 欄: [{ 鍵(小寫), 值, 原 }] }
function 拿欄(s) {
  const 欄 = [];
  const 剩 = String(s || "").replace(欄Re, (全, k, v) => { 欄.push({ 鍵: k.toLowerCase(), 值: v, 原: 全.trim() }); return ""; });
  return { 剩: 剩, 欄: 欄 };
}
const 我的欄 = { pin: 1, start: 1, due: 1, repeat: 1, ed: 1 };
const 日式Re = /^(\d{4}-\d{2}-\d{2})/;

/* ---- 舊寫法(照讀) ---- */
const 日期Re = /[＠@]\{(\d{4}-\d{2}-\d{2})(?:[^}]*)\}/;
// 區間:舊的 ＠{a ~ b},1.6.1 開發中的 @{a} ~ @{b}
const 區間Re = /[＠@]\{(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})\}|[＠@]\{(\d{4}-\d{2}-\d{2})\}\s*~\s*[＠@]\{(\d{4}-\d{2}-\d{2})\}/;
function 讀區間(s) {
  const m = 區間Re.exec(String(s || ""));
  if (!m) return null;
  return m[1] ? [m[1], m[2]] : [m[3], m[4]];
}
// 整段日期標記(含區間中間的 ~)。⚠ 只吃日期;Kanban 的 @@{10:00} 時間不是我們的,留著
const 標記Re = /\s*[＠@]\{\d{4}-\d{2}-\d{2}[^}]*\}(?:\s*~\s*[＠@]\{\d{4}-\d{2}-\d{2}[^}]*\})?/g;
const 置頂Re = /\s*(?:📌|\bPin\{\})/;
const 置頂清除Re = /\s*(?:📌|\bPin\{\})/g;
/* 最後編輯時戳。1.6.1 起是卡片最後一行的 [ed:: 2026-09-17 02:37];
   第一行的 ✎{2026-09-13 14:20}(1.5–1.6.0)和 Ed{26-09-16 01:31}(1.6.1 開發中)照讀,被寫到時搬到最後一行。
   1.5 起**只寫到分鐘**;1.4.6–1.4.9 寫過的秒數照讀。
   ⚠ 1.4.6 寫到秒,是拿秒數當「第一行一模一樣的兩張卡片」的身分證。秒數讓筆記太繁複,
     1.5 改成先靠**位置**(`## 分類` 底下第幾張,見 定位文)分開雙胞胎,時戳退成最後一層保險。 */
const 編時Re = /(?:✎|\bEd)\{((?:\d{2})?\d{2}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?\}/;
const 時戳清除Re = /\s*(?:✎|\bEd)\{[^}]*\}/g;
// ⚠⚠ 1.6.4(B3):Canvas 的卡片 ID(^ct-…)可能接在 [ed::] 後面,只讀進 k.ID、原樣留著,這一版不寫新的(1.7 才寫)
const 編行Re = /^[\[(]ed::[ \t]*((?:\d{2})?\d{2}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?[ \t]*[\])](?:[ \t]+(\^ct-[A-Za-z0-9_-]+))?[ \t]*$/i;
// 沒有 [ed::] 前綴、整行只有 ^ct-… 的孤行(防呆,目前不會自己寫出這種格式)也不算內容,但不是編輯時戳
const 純IDRe = /^\^ct-[A-Za-z0-9_-]+$/;
// 兩碼年份讀成 20xx
function 全日(d) { d = String(d || ""); return /^\d{2}-/.test(d) ? "20" + d : d; }
function 讀編時(首) {
  const e = 編時Re.exec(String(首 || ""));
  return e ? { 日: 全日(e[1]), 分: e[2], 秒: e[3] || "00" } : null;
}
// 一行內容是不是 [ed:: …](後面可能接 ^ct-… ID);是的話回傳時間 + ID
function 讀編行(t) {
  const e = 編行Re.exec(內文之(t));
  return e ? { 日: 全日(e[1]), 分: e[2], 秒: e[3] || "00", ID: e[4] || null } : null;
}
// t 這一行是不是外掛自己寫的「不算內容」的行([ed::…] 或孤立的 ^ct-… ID)
function 非內容行(t) { return !!讀編行(t) || 純IDRe.test(內文之(t)); }
function 組編行(戳, id) { return "\t[ed:: " + 戳 + "]" + (id ? " " + id : ""); }

/* ---- 留言 ----
   1.6.1:[cm:: 2026-09-17 09:00|誰] 內容;舊的 💬{2026-09-16 09:00|誰}、開發中的 Cm{26-09-16 09:00|誰} 照讀 */
const 留言Re = /^(?:💬[\t ]*|Cm)\{((?:\d{2})?\d{2}-\d{2}-\d{2})[ T](\d{2}:\d{2})\|([^}|\n]{1,16})\}[\t ]*([\s\S]*)$/;
const 新留言Re = /^[\[(]cm::[ \t]*((?:\d{2})?\d{2}-\d{2}-\d{2})[ T](\d{2}:\d{2})[ \t]*\|[ \t]*([^\]\)|\n]{1,16}?)[ \t]*[\])][\t ]*([\s\S]*)$/i;
function 讀留言(x) {
  const m = 新留言Re.exec(String(x || "")) || 留言Re.exec(String(x || ""));
  if (!m) return null;
  const 日 = 全日(m[1]), 人 = m[3].trim();
  return { 日: 日, 分: m[2], 人: 人, 文: String(m[4] || "").trim(), id: 日 + " " + m[2] + "|" + 人 };
}
function 組留言行文(日, 分, 人, 文) {
  return "\t[cm:: " + 全日(日) + " " + 分 + "|" + 人 + "] " + String(文 || "").replace(/\s*\n\s*/g, " ").trim();
}
const 標題Re = /^#{1,6}\s+(.+?)\s*$/;
/* ⚠⚠ 1.5 拿掉「長期」:#long-term / #長期 不再有特別的意思,就是一般的標籤文字(筆記裡原樣留著)。
   「週期」那一格只看 k.循環。沒有日期的長期卡片從此出現在「未寫日期」那張表。 */
/* ⚠ 1.5 的「狀態」**就是分類的標題**:紅色那一區取名「等回復」,那一區的卡片就是等回復,
   換狀態 = 換分類。開發中做過一個獨立寫在第一行的 `〔…〕` 狀態標籤,拿掉了 —— 不要再加回去。
   顯示見 畫分類名()(設定「顯示分類名稱」)。 */
/* ---- 循環卡片 ----
   1.6.1 寫 `[repeat:: every 2 weeks]`(跟 Tasks 外掛同一種寫法)。舊的 `🔁 每2週`、`🔁 every 2 weeks`、只有 🔁、
   開發中的 `Re{every 2 weeks}` 都照讀。
   完成欄不是勾選框,而是「本次完成」——按下去:
     ① 日期推到下一次
     ② 在內容底下(留言前面)插一條 `[done:: 2026-09-10]` 記錄(只有循環卡片會寫) */
const 週期Re = /🔁|\bRe\{/;
const 循環標記Re = /\s*(?:\bRe\{[^}]*\}|🔁[ \t]*(?:每[ \t]*\d*[ \t]*(?:天|日|週|周|星期|月)|every[ \t]*\d*[ \t]*(?:day|week|month)s?)?)/gi;
/* ⚠ 1.4.5:寫出去的是英文寫法(`every 2 weeks`、`every week`)。
   中文寫法 `每2週` 照舊讀得懂(見 解循環字),但不再寫 ——
   筆記是存檔格式,要的是一種不分介面語言、誰打開都看得懂的寫法。 */
function 循環字(循) {
  if (!循) return "";
  const 單 = 循.型 === "月" ? "month" : (循.型 === "日" ? "day" : "week");
  return "[repeat:: every " + (循.隔 > 1 ? 循.隔 + " " + 單 + "s" : 單) + "]";
}
/* 本次完成的記錄行。1.6.1 寫 `[done:: 2026-09-16]`,畫面上照語言顯示;
   舊的「✔ 本次完成 26-09-16(三)」、開發中的 `Done{2026-09-16}` 照讀。 */
const 本次完成Re = /^(?:(?:✅|✔|☑)\s*本次完成|Done\{|[\[(]done::)/i;
const 完成記Re = /^(?:Done\{(\d{4}-\d{2}-\d{2})\}|[\[(]done::[ \t]*(\d{4}-\d{2}-\d{2})[ \t]*[\])])\s*$/i;
function 組完成記(日) { return "\t[done:: " + 日 + "]"; }
const 週期單位 = { 月: "月", 日: "天", 週: "週" };
// 「every 2 weeks」「每2週」「(空)」→ { 型, 隔 }
function 解循環字(s) {
  s = String(s || "");
  let m = /每\s*(\d*)\s*(天|日|週|周|星期|月)/.exec(s);
  if (m) {
    const n = parseInt(m[1] || "1", 10) || 1;
    const u = m[2];
    return { 型: (u === "月") ? "月" : ((u === "天" || u === "日") ? "日" : "週"), 隔: n };
  }
  m = /every\s*(\d*)\s*(day|week|month)/i.exec(s);
  if (m) {
    const n = parseInt(m[1] || "1", 10) || 1;
    const u = m[2].toLowerCase();
    return { 型: (u === "month") ? "月" : ((u === "day") ? "日" : "週"), 隔: n };
  }
  return { 型: "週", 隔: 1 };            // 只寫了 🔁 / 值看不懂,當成每週
}
// 舊寫法的循環(第一行裡的 🔁 / Re{})
function 讀循環(首行) {
  const 首 = String(首行 || "").split("\n")[0];
  if (!週期Re.test(首)) return null;
  const m = /(?:🔁|\bRe\{)([^}\n]*)/.exec(首);
  return 解循環字(m ? m[1] : "");
}
/* ⚠ 這兩個是**畫面上的說明文字**,要跟著語言走 —— 以前寫死中文,
   英文介面的循環卡片上會冒出一顆寫著「每1週」的膠囊。
   注意:筆記裡的 `🔁 每2週` / `🔁 every 2 weeks` 是**存檔格式**,兩種寫法都照舊讀,
   這裡改的只是顯示。 */
function 循環說明短(循) {
  if (!循) return "";
  const T = 語();
  return T.everyShort.replace("N", 循.隔)
    .replace("U", 循.型 === "月" ? T.unitMonth : (循.型 === "日" ? T.unitDay : T.unitWeek));
}
function 循環說明(循) {
  if (!循) return "";
  const T = 語();
  return T.everyLong.replace("N", 循.隔)
    .replace("L", 循.型 === "月" ? T.longMonth : (循.型 === "日" ? T.longDay : T.longWeek));
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
function 兩位(n) { return (n < 10 ? "0" : "") + n; }
function 日字(d) {
  return d.getFullYear() + "-" + 兩位(d.getMonth() + 1) + "-" + 兩位(d.getDate());
}
function 時字(d) { return 兩位(d.getHours()) + ":" + 兩位(d.getMinutes()); }
// 表格上顯示用:年份只留兩碼,後面帶星期,省下的寬度給內容欄
// ⚠ 星期要跟著語言走。以前這裡寫死中文,英文介面的日期會變成 26-09-12(六)。
function 日期短(d) {
  if (!d) return "";
  const w = new Date(d + "T00:00:00");
  const 週 = 語().週名[w.getDay()];
  return String(d).slice(2) + "(" + 週 + ")";
}
/* 窄螢幕卡片第一行的區間:「09-12(六) – 09-15(二)」橫著排。
   同一年的區間**兩邊都不寫年份** —— 手機的第一行要裝 📌、完成圈、日期、指派人、⋯,
   實測 360px 的手機上日期只分得到 166px,帶年份的「26-09-12(六) – 09-15(二)」要 184,
   英文的 (Sat) (Sun) 更長,一定被省略號吃掉後半段 —— 而後半段正是「到哪一天」。
   跨年的區間才把年份寫回去。 */
/* 1.5:卡片上的日期**今年的不寫年份**(09-14(一));有任何一天不在今年,才把年份寫出來。 */
function 今年嗎(...日們) {
  const y = String(new Date().getFullYear());
  return 日們.every(d => !d || String(d).slice(0, 4) === y);
}
/* ⚠ 1.6.3(mockup v15 Q34,使用者定案):**區間用波浪號、而且不寫星期**(`09-17 ~ 10-18`)——
   兩個 (六)(二) 擠在一條線上很吵,而且區間要看的是「從哪天到哪天」,不是星期幾。
   單日照舊寫星期(`09-19(六)`)。 */
function 日期範圍字(起, 迄) {
  if (!起) return "";
  const 省年 = 今年嗎(起, 迄);
  if (!迄 || 迄 === 起) return 省年 ? 日期短(起).slice(3) : 日期短(起);
  const 字 = (d) => 省年 ? String(d).slice(5) : String(d).slice(2);
  return 字(起) + " ~ " + 字(迄);
}
/* 1.6 送出鈕上的日期:不寫星期、也不寫年份(09-14 – 09-20、12-28 – 01-03)。
   ⚠ 手機的送出鈕只有 88px 寬,跨年的「26-12-28 – 27-01-03」要 111px(實測)。年份看年格,完整日期在送出鈕的滑鼠提示。 */
function 日期無週字(起, 迄) {
  if (!起) return "";
  const 字 = (d) => String(d).slice(5);
  return (!迄 || 迄 === 起) ? 字(起) : 字(起) + " – " + 字(迄);
}
function 現在戳() { const d = new Date(); return 日字(d) + " " + 時字(d); }     // 1.5 起到分鐘

/* 把第一行(新舊寫法都吃)拆成零件。不是卡片第一行就回傳 null。
   名單 有給才認得哪一個 #名字 是指派人;沒給的話指派人就當一般的標籤,順序照原樣留著。
   ⚠ 只有**結尾**的 #標籤 會被拿出來;夾在句子中間的(「打給 #bob 問報價」)是內文,不動。 */
function 拆首行(首, 名單) {
  const m = 卡首Re.exec(String(首 || "").split("\n")[0]);
  if (!m) return null;
  const 拿 = 拿欄(m[3]);
  let 本 = 拿.剩.replace(/^[ \t]+/, "");
  const 值 = (k) => { const f = 拿.欄.find(x => x.鍵 === k); return f ? f.值 : null; };
  const 主 = 主題Re.exec(本);
  if (主) 本 = 本.slice(主[0].length);
  // 日期:start / due;沒有的話看舊的 ＠{} / @{} 標記
  const 始 = (日式Re.exec(值("start") || "") || [])[1] || null;
  const 到 = (日式Re.exec(值("due") || "") || [])[1] || null;
  const 區 = 讀區間(本), 日 = 日期Re.exec(本);
  let 起 = null, 迄 = null;
  if (始 || 到) { 起 = 始 || 到; 迄 = (始 && 到 && 到 !== 始) ? 到 : null; }
  else if (區) { 起 = 區[0]; 迄 = 區[1]; }
  else if (日) 起 = 日[1];
  const 頂值 = 值("pin");
  const 頂 = 頂值 !== null ? !/^(off|false|no|0)?$/i.test(頂值.trim()) : 置頂Re.test(本);
  const 循值 = 值("repeat");
  const 循 = 循值 !== null ? 解循環字(循值) : 讀循環(本);
  const 編值 = 值("ed");
  const 編新 = 編值 ? /^((?:\d{2})?\d{2}-\d{2}-\d{2})[ T](\d{2}:\d{2})/.exec(編值) : null;
  const 編 = 編新 ? { 日: 全日(編新[1]), 分: 編新[2] } : 讀編時(本);
  /* 1.6.3(ADR 1.6.3-01)指派人 = @名字(第一個);舊的 #名字 在名單裡的照讀成指派人。
     名單 沒給就用最近一次解析看板時的名單(預設名單),蓋卡 / 換日期 這些中間步驟才不會把 #嘉峻 當成主題。 */
  const 單 = 名單 || 預設名單;
  let 人 = null;
  本 = 本.replace(標記Re, "");                        // 先拿掉 @{日期},@ 才不會被當成指派人
  const at = 人At.exec(本);
  if (at) { 人 = 對名(at[2], 單); 本 = 本.slice(0, at.index) + at[1] + 本.slice(at.index + at[0].length); }
  if (單 && 單.length) {
    const r = 人規則(單);
    const p = r.找.exec(本);
    if (p) { if (!人) 人 = p[1]; 本 = 本.replace(r.清, ""); }
  }
  let 文 = 本.replace(置頂清除Re, "").replace(時戳清除Re, "").replace(循環標記Re, "")
    .replace(/[\t ]{2,}/g, " ").trim();
  /* 主題 = [主題](舊寫法)+ 第一行開頭、結尾的 #標籤,照出現順序、最多 3 個;第 4 個以後照舊是一般標籤。
     ⚠ 夾在句子中間的 #標籤(「打給 #bob 問報價」)是內文,不動 —— 拿掉會把句子吃掉。 */
  const 題們 = [];
  if (主) 題們.push(題正(主[1]));
  let t;
  const 前題 = [];
  while ((t = 題頭Re.exec(文)) && !/^\d+$/.test(t[1])) { 前題.push(t[1]); 文 = 文.slice(t[0].length).trim(); }
  const 後題 = [];
  while ((t = 題尾Re.exec(文)) && !/^\d+$/.test(t[1])) { 後題.unshift(t[1]); 文 = 文.slice(0, t.index).trim(); }
  const 標籤 = [];
  前題.concat(後題).forEach(x => {
    const n = 題正(x);
    if (!n || 題們.indexOf(n) >= 0) return;
    if (題們.length < 主題上限) 題們.push(n); else 標籤.push("#" + x);
  });
  return {
    縮: m[1], 勾: m[2], 題: 題們.length ? 題們.join(" ") : null, 題們: 題們, 文: 去符(文),
    文符: 取符(文),     // 舊寫法第一行內容前面的「．」→「- 」;搬到第二行時帶著(既往不咎:原本沒有就不加)
    起: 起, 迄: 迄, 人: 人, 標籤: 標籤, 頂: 頂, 循: 循,
    欄: 拿.欄.filter(x => !我的欄[x.鍵]).map(x => x.原),     // 不認得的欄位,原樣留著
    戳: 編 ? 編.日 + " " + 編.分 : null                       // 第一行上的舊時戳(整份轉換時搬到最後一行)
  };
}
/* 照新寫法組回第一行。有主題的卡片,第一行不放內容(p.文 由 蓋卡 放到第二行);沒有主題的,第一行內容留在第一行。
   留文:中間步驟用(接著會進 蓋卡),舊寫法的第一行內容先留在原位,由 蓋卡 搬 —— 不然內容會不見;
   舊的「．」也要留著,搬到第二行時才知道原本有符號(既往不咎)。 */
function 組首行(p, 留文) {
  const 件 = [], 題們 = 題表(p.題);
  if (p.頂) 件.push("[pin:: on]");
  題們.forEach(x => 件.push("#" + x));                  // 1.6.3(ADR 1.6.3-01)主題寫成 #主題
  if (p.文 && 題們.length && 留文) 件.push((p.文符 ? "．" : "") + p.文);
  else if (p.文 && !題們.length) 件.push(p.文);
  if (p.起 && p.迄 && p.迄 !== p.起) 件.push("[start:: " + p.起 + "]", "[due:: " + p.迄 + "]");
  else if (p.起) 件.push("[due:: " + p.起 + "]");
  if (p.循) 件.push(循環字(p.循));
  if (p.人) 件.push("@" + 人正(p.人));                 // 指派人寫成 @名字
  (p.標籤 || []).forEach(x => 件.push(x));
  (p.欄 || []).forEach(x => 件.push(x));
  return (p.縮 || "") + "- [" + (p.勾 || " ") + "] " + 件.join(" ");
}
/* 改第一行的某個零件(打勾、置頂、日期、指派人、循環)。改(p) 回傳 false = 不必改。
   回傳的那一行還沒蓋時戳 —— 寫手.改首行 會蓋卡,順便換成新寫法。 */
function 改零件(首, 名單, 改) {
  const p = 拆首行(首, 名單);
  if (!p || 改(p) === false) return null;
  return 組首行(p, true);
}
function 換日期(首, 起, 迄) {
  return 改零件(首, null, p => { p.起 = 起; p.迄 = 迄 || null; }) || 首;
}
// [起, 迄] 裡最後一個不是空白的行(至少是 起)
function 卡尾(行, 起, 迄) {
  let i = Math.min(迄, 行.length - 1);
  while (i > 起 && !String(行[i] || "").trim()) i--;
  return i;
}
/* ⚠⚠ 1.6.1:每一次寫卡片都經過這裡 —— 蓋上新的 [ed:: …],同時把這張卡片換成新寫法(改到才轉)。
   ・第一行照新寫法重組(舊寫法有主題又有第一行內容的,內容搬到第二行)
   ・卡片裡原本的 [ed:: …] 全部拿掉,在最後一個不是空白的行後面補一行新的(ed 永遠是最後一行)
   ・1.6.4(B3):原本 [ed::] 後面接的 ^ct-… ID 原樣留著,不寫新的
   ⚠ 會 splice 行陣列(卡片後面的行號會動),所以**一定是呼叫的人做的最後一件事**;卡片的 起 不會變。
   戳 不給就是現在。回傳新的 迄。 */
function 蓋卡(行, 起, 迄, 戳) {
  const p = 拆首行(行[起]);
  if (p) {
    行[起] = 組首行(p);
    if (p.題 && p.文) { 行.splice(起 + 1, 0, "\t" + 正規勾(p.文符 + p.文)); 迄++; }
  }
  let id = null;
  for (let i = 迄; i > 起; i--) {
    const e = 讀編行(行[i]);
    if (e) { if (e.ID) id = e.ID; 行.splice(i, 1); 迄--; }
  }
  const 尾 = 卡尾(行, 起, 迄);
  行.splice(尾 + 1, 0, 組編行(戳 || 現在戳(), id));
  return 迄 + 1;
}

/* 1.6.1 設定裡的「全部轉成新格式」:整份筆記的卡片一次換成新寫法(純函式,給 寫手.轉新格式 用)。
   ・第一行照新寫法重組;**編輯時間沿用原本的**(不蓋新的,「最近編輯」的排序才不會全亂),放到最後一行
   ・內容:原本有符號的留著(「．」換成「- 」),原本沒有的不加(既往不咎);縮排照留
   ・舊的本次完成記錄 → [done:: 日期](原位);留言 → [cm:: …](排在內容後面);ed 最後
   ・卡片以外的行(標題、一般段落)一個字都不動
   回傳 { 文, 張 }(張 = 有改到的卡片數) */
function 轉整份(文, 名單) {
  const 行 = String(文 || "").split("\n");
  const 卡們 = 解析卡片(文, 名單);
  let 張 = 0;
  // 由下往上換,前面的行號才不會跑掉
  卡們.slice().sort((a, b) => b.起 - a.起).forEach(k => {
    const 舊 = 行.slice(k.起, k.迄 + 1);
    const p = 拆首行(舊[0], 名單);
    if (!p) return;
    const 新 = [組首行(p)], 留 = [];
    if (p.題 && p.文) 新.push("\t" + 正規勾(p.文符 + p.文));
    let 空尾 = 舊.length;
    while (空尾 > 1 && !舊[空尾 - 1].trim()) 空尾--;
    舊.slice(1, 空尾).forEach(t => {
      const 空 = 前空白(t), 身 = t.slice(空.length);
      if (!身.trim()) { 新.push(t); return; }
      if (讀編行(t)) return;                                   // ed 最後再補
      const x = 內文之(t);
      const c = 讀留言(x);
      if (c) { 留.push(組留言行文(c.日, c.分, c.人, c.文)); return; }
      const r = /^(?:✅|✔|☑)\s*本次完成\s*(\d{2})-(\d{2})-(\d{2})/.exec(x) || /^Done\{(\d{4})-(\d{2})-(\d{2})\}/.exec(x);
      if (r) { 新.push(空 + "[done:: " + 全日(r[1]) + "-" + r[2] + "-" + r[3] + "]"); return; }
      新.push(空 + 照打行(身));
    });
    新.push(...留);
    if (k.編修戳) 新.push(組編行(k.編修戳.slice(0, 16)));
    新.push(...舊.slice(空尾));
    if (新.join("\n") !== 舊.join("\n")) {
      行.splice(k.起, 舊.length, ...新);
      張++;
    }
  });
  return { 文: 行.join("\n"), 張: 張 };
}

/* 卡片的身分:檔案 + 「[主題] 第一行內容」。
   行號會變,內文比較穩 —— 換一台電腦、被別人插入一張卡都還認得出來。
   ⚠⚠ 1.6.1 以前是「第一行拿掉日期／指派人／置頂／編修時間」。新寫法的第一行沒有內容,
     只剩主題的話同主題的卡片全部變成雙胞胎,所以改成**主題 + 第一行內容**(跳過本次完成的記錄)。
     打勾、置頂、改日期、改指派人、改循環都不會改到它;新舊寫法轉換前後也一樣(內容行的「．」會先剝掉)。
     寫手.改卡片 寫完會重新解析,把新的基鍵記回卡片物件(記新首),所以改內容、改主題之後也接得上。 */
function 算基鍵(k) {
  const 首內 = (k.內容行 || []).find(x => !本次完成Re.test(x)) || "";
  return ((k.主題 ? "[" + k.主題 + "] " : "") + 首內).replace(/[\t ]{2,}/g, " ").trim();
}
/* 第一行一模一樣的卡片,在畫面上靠「第幾張」分開(1.4.6)。
   k.基鍵 = 算基鍵(大家一樣);k.鍵 = 基鍵 + 重鍵分隔 + 序號(只有重複的才加)。
   ⚠ 序號**只給畫面用**(哪一張在編修、哪一張展開、閃哪一列)。寫檔時一律用 基鍵 找候選,
     再用整行原文、到秒的時戳、內容指紋挑 —— 見 定位文。 */
const 重鍵分隔 = "⁣#";
function 基鍵之(鍵) { return String(鍵 == null ? "" : 鍵).split(重鍵分隔)[0]; }
function 序號之(鍵) { const p = String(鍵 == null ? "" : 鍵).split(重鍵分隔); return p.length > 1 ? (parseInt(p[1], 10) || 0) : 0; }
/* ---- 1.6.3(ADR 1.6.3-01)主題 = #主題(最多 3 個)、指派人 = @名字 ----
   主題不能有空格(Obsidian 的標籤不能有):空格和標點換成「-」,畫面上也照樣顯示「-」(使用者明講)。 */
const 主題上限 = 3;
const 題字 = "[^\\s#@＠\\[\\](){}<>.,;:!?'\"`~$%^&*=+|\\\\，。、；：！？「」]";
const 題頭Re = new RegExp("^#(" + 題字 + "+)(?:\\s+|$)");
const 題尾Re = new RegExp("(?:^|\\s)#(" + 題字 + "+)$");
// @ 前面是字母數字(email)、@@{10:00}、@{日期} 都不是指派人
const 人At = /(^|[^\w@＠])@([^\s#@＠\[\](){}<>,;:!?'"，。、]+)/;
let 預設名單 = null;       // 最近一次解析看板時的指派人名單(拆首行 沒給名單時用)
function 題正(s) {
  const x = String(s == null ? "" : s).trim().replace(/^#+/, "")
    .replace(/[\s.,;:!?'"()\[\]{}<>#@＠，。、；：！？「」]+/g, "-").replace(/^-+|-+$/g, "");
  return /^\d+$/.test(x) ? "" : x;
}
// 主題:null / 陣列 / 字串("a b"、"#a #b"、"a")→ 正規化過、不重複、最多 3 個的陣列
function 題表(x) {
  const 源 = x == null ? [] : (Array.isArray(x) ? x : String(x).split(/[\s#]+/));
  const 出 = [];
  源.forEach(s => { const n = 題正(s); if (n && 出.indexOf(n) < 0 && 出.length < 主題上限) 出.push(n); });
  return 出;
}
/* 1.6.3(C17)頭像上的一個字:全中文取最後一個字(嘉峻 → 峻)、中文開頭混英文取第一個字(吳kelly → 吳)、
   英文開頭取第一個字母大寫(kelly吳 → K)。 */
function 頭字(名) {
  const s = String(名 || "").trim();
  if (!s) return "?";
  const 中 = /[\u3400-\u9fff\uf900-\ufaff]/;
  if (!中.test(s[0])) return s[0].toUpperCase();
  return [...s].every(c => 中.test(c)) ? [...s].pop() : s[0];
}
/* 1.6.3(ADR 1.6.3-01)新增卡片的輸入框:#主題 打在最前面或最後面都可以(最多 3 個),@名字 = 指派人(第一個)。
   夾在句子中間的 #標籤 是內文,不動。回傳 { 題們, 人, 文: 拿掉它們之後的內容 } */
function 析輸入(原, 名單) {
  const 行們 = String(原 || "").replace(/\r/g, "").split("\n");
  const 題們 = [];
  let 人 = null;
  for (let i = 0; i < 行們.length && !人; i++) {
    const m = 人At.exec(行們[i]);
    if (!m) continue;
    人 = 對名(m[2], 名單);
    行們[i] = (行們[i].slice(0, m.index) + m[1] + 行們[i].slice(m.index + m[0].length)).replace(/[ \t]{2,}/g, " ").replace(/\s+$/, "");
  }
  const 首 = 行們.findIndex(x => x.trim());
  if (首 >= 0) {
    let x = 行們[首].replace(/^[ \t]+/, ""), t;
    while ((t = 題頭Re.exec(x)) && !/^\d+$/.test(t[1]) && 題們.length < 主題上限) {
      const n = 題正(t[1]); if (n && 題們.indexOf(n) < 0) 題們.push(n);
      x = x.slice(t[0].length).replace(/^[ \t]+/, "");
    }
    行們[首] = 前空白(行們[首]) + x;
  }
  let 末 = 行們.length - 1;
  while (末 >= 0 && !行們[末].trim()) 末--;
  if (末 >= 0) {
    let x = 行們[末].replace(/\s+$/, ""), t;
    const 後 = [];
    while ((t = 題尾Re.exec(x)) && !/^\d+$/.test(t[1])) { 後.unshift(t[1]); x = x.slice(0, t.index).replace(/\s+$/, ""); }
    後.forEach(y => {
      const n = 題正(y);
      if (n && 題們.indexOf(n) < 0 && 題們.length < 主題上限) 題們.push(n);
      else if (n && 題們.indexOf(n) < 0) x += " #" + y;
    });
    行們[末] = x;
  }
  return { 題們: 題們, 人: 人, 文: 行們.join("\n").replace(/^\n+|\n+$/g, "") };
}
/* 1.6.3 整區封存的標題:`## Archive/分類名`。舊版把名字裡有 Archive 的標題都當封存,所以不衝突。
   封存區名(標題)→ 顯示的名字:Archive/X → X;單獨的 Archive / 封存 → null(以前單張封存的卡片) */
function 封存題(名) { return "Archive/" + 名; }
function 封存原名(標題) {
  const m = /^(?:archive|封存)\s*\/\s*(.+)$/i.exec(String(標題 || "").trim());
  return m ? m[1].trim() : null;
}
function 人正(s) { return String(s == null ? "" : s).trim().replace(/^[@#＠]+/, "").replace(/\s+/g, "-"); }
// @Kelly-Wu 對到名單裡的「Kelly Wu」;名單裡沒有就照寫的
function 對名(n, 單) {
  const 正 = 人正(n);
  const hit = (單 || []).find(x => 人正(x) === 正);
  return hit || 正;
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
  if (名單 && 名單.length) 預設名單 = 名單;
  const 人Re = 人規則(名單);
  const 行 = String(內文 || "").replace(/\r/g, "").split("\n");
  const 卡 = [];
  let 分類 = "—", 目前 = null, 前置 = true;
  const 區數 = {};             // 1.5:每個分類數到第幾張了(k.區序,定位文 先用位置找)

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
      目前.區序 = 區數[分類] = (區數[分類] || 0) + 1;
      卡.push(目前);
      continue;
    }
    if (目前 && (t.trim() === "" || /^[ \t]/.test(t))) {
      目前.行.push(t); 目前.迄 = i;         // 縮排的行都算這張卡的內容
      continue;
    }
    目前 = null;
  }
  卡.forEach(k => 收尾(k, 人Re, 名單));
  /* ⚠⚠ 1.4.6:第一行一模一樣的卡片,畫面上要分得開。
     以前兩張的 鍵 一樣,狀態都是用 鍵 記的 —— 按其中一張的「編輯」,兩張一起進編修模式;
     展開一張兩張一起展開;閃光、捲動、刪除確認都只找得到第一張。
     現在重複的那幾張在 鍵 後面加上「第幾張」,畫面上每一張都是獨一無二的。 */
  const 數 = {}, 序 = {};
  卡.forEach(k => { 數[k.基鍵] = (數[k.基鍵] || 0) + 1; });
  卡.forEach(k => {
    if (數[k.基鍵] > 1) { 序[k.基鍵] = (序[k.基鍵] || 0) + 1; k.鍵 = k.基鍵 + 重鍵分隔 + 序[k.基鍵]; }
  });
  return 卡;
}
function 新卡(原行, m, 分類, 行號, 人Re) {
  return {
    分類: 分類, 起: 行號, 迄: 行號,
    完成: m[2].toLowerCase() === "x",
    主題: "",                // 收尾 用 拆首行 填(1.6.1:主題前面可能有 [pin:: on])
    首行原文: 原行,
    行: [],
    留言: [], 內容行: []
  };
}
function 收尾(k, 人Re, 名單) {
  const 首 = k.首行原文;
  // 首行的零件(新舊寫法都吃,見 拆首行);內容 = 去掉 `- [ ] [主題]`、所有欄位標記和指派人,結尾的其他 #標籤 照樣顯示
  const 拆 = 拆首行(首, 名單);
  k.主題 = (拆 && 拆.題) || "";             // 1.6.3:多個主題用空白隔開(主題本身沒有空格)
  k.主題們 = 拆 ? 拆.題們 : [];
  k.起日 = 拆 ? 拆.起 : null;
  k.迄日 = (拆 && 拆.迄) || k.起日;
  k.置頂 = !!(拆 && 拆.頂);
  k.循環 = 拆 ? 拆.循 : null;
  k.指派 = (拆 && 拆.人) || null;                 // 1.6.3:@名字,舊的 #名字 照讀(拆首行)
  // 最後編輯:卡片裡最後一個 [ed:: …];沒有的話看第一行的舊時戳
  let e = null;
  k.行.forEach(t => { const x = 讀編行(t); if (x) e = x; });
  if (!e && 拆 && 拆.戳) { const q = 讀編時(首); e = q || { 日: 拆.戳.slice(0, 10), 分: 拆.戳.slice(11, 16), 秒: "00" }; }
  k.編修時 = e ? (e.日 + " " + e.分) : null;                     // 顯示用,到分鐘
  k.編修戳 = e ? (e.日 + " " + e.分 + ":" + e.秒) : null;        // 排序和辨識用,到秒
  k.ID = (e && e.ID) || null;    // 1.6.4(B3):Canvas 的 ^ct-… ID,只讀不寫,寫回去原樣留著

  const 純 = 拆 ? [拆.文].concat(拆.標籤).filter(Boolean).join(" ") : "";
  k.內容行 = [純].filter(Boolean);
  /* 1.6.1:每一行原本寫的 Markdown 符號(`- `、`* `、`1. `,沒有就是 "")。跟 內容行 一格一格對齊。
     內容行 永遠是剝掉符號的(身分、指紋、待辦判斷都靠它);關掉「自動項目符號」時,
     畫面和編修框用 內容符 把使用者自己打的符號還原回去。 */
  k.內容符 = k.內容行.map(() => (拆 && 拆.文) ? 拆.文符 : "");      // 舊寫法第一行的「．」也算

  k.行.forEach(t => {
    const x = 內文之(t);
    if (!x || 非內容行(t)) return;             // [ed:: …]、孤立的 ^ct-… 不是內容
    const c = 讀留言(x);
    if (c) {
      k.留言.push(c);
      return;
    }
    if (本次完成Re.test(x)) k.完成過 = (k.完成過 || 0) + 1;   // 記錄行原封不動顯示,日期就是重點
    k.內容行.push(x);
    k.內容符.push(取符(t));
  });
  /* 新寫法有主題的卡片,第一行結尾的 #標籤 接在第一行內容後面顯示 ——
     舊寫法它們本來就跟第一行內容在一起,轉換前後畫面和指紋才一樣。 */
  if (拆 && 拆.題 && !拆.文 && 拆.標籤.length) {
    k.內容行.shift(); k.內容符.shift();
    const i = k.內容行.findIndex(x => !本次完成Re.test(x));
    if (i >= 0) k.內容行[i] += " " + 拆.標籤.join(" ");
    else { k.內容行.unshift(拆.標籤.join(" ")); k.內容符.unshift(""); }
  }
  /* 1.6.2(B3/B4)內容的原文:拿掉卡片那一層縮排之後照原樣(巢狀縮排、空行、行中的空白都在)。
     編修框的初值和閱讀畫面(Obsidian 的 Markdown 渲染)都用它;內容行 / 內容符 照舊給身分、指紋、搜尋用,
     所以舊卡片的身分不會因為這一版改變。外掛自己寫的 [cm::] 留言、[ed::] 不算內容。 */
  const 原 = 去卡縮排(k.行.filter(t => { const x = 內文之(t); return !非內容行(t) && !(x && 讀留言(x)); }));
  while (原.length && !原[原.length - 1]) 原.pop();
  while (原.length && !原[0]) 原.shift();
  if (拆 && 拆.題 && !拆.文 && 拆.標籤.length) {
    const i = 原.findIndex(x => x.trim() && !本次完成Re.test(內文之(x)));
    if (i >= 0) 原[i] += " " + 拆.標籤.join(" "); else 原.unshift(拆.標籤.join(" "));
  } else if (純) 原.unshift(((拆 && 拆.文) ? (拆.文符 || "") : "") + 純);
  k.內容原 = 原;
  k.基鍵 = 算基鍵(k);
  k.鍵 = k.基鍵;             // 重複的會在 解析卡片 最後加上序號
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
// 從剛寫出去的那幾行算出它的「卡片鍵」,新增完才找得到它在哪一列
function 鍵由行們(首行, 尾行, 名單) {
  const k = 解析卡片([首行].concat(尾行 || []).join("\n"), 名單)[0];
  return k ? k.基鍵 : "";
}
function 組留言行(人, 文, 毫秒) {
  const d = new Date(毫秒 || Date.now());
  return 組留言行文(日字(d), 時字(d), 人, 文);
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
      (檔案 + 主題 + 第一行內容,見 算基鍵)重新找到它現在在第幾行。
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
  const 基 = (卡.基鍵 !== undefined && 卡.基鍵 !== null) ? 卡.基鍵 : 基鍵之(卡.鍵);
  const 中 = 全.filter(k => k.基鍵 === 基);
  if (!中.length) return null;
  if (中.length === 1) return { 卡: 中[0], 幾張: 1, 含糊: false };
  const 定 = (k) => ({ 卡: k, 幾張: 中.length, 含糊: false });
  /* ⚠⚠ 1.5 先看「位置」:這張卡片讀進來的時候是 `## 分類` 底下的第幾張(k.區序)。
     在當下的檔案裡直接走到同一個分類的同一個位置,**第一行原文和內容指紋都一模一樣**才算數 ——
     兩張雙胞胎卡片靠位置一次分開,不必再靠到秒的時戳(1.5 起時戳只寫到分鐘)。
     對不上(別台裝置剛在前面插了一張、卡片被搬走、內容剛改過)就退回底下原本那一套,
     所以位置過期**不會**寫錯卡片,只是回到 1.4.6 的找法。 */
  if (卡.區序) {
    const 位 = 全.find(k => k.分類 === 卡.分類 && k.區序 === 卡.區序);
    const 原首 = String(卡.首行原文 || "").replace(/\s+$/, "");
    if (位 && 位.基鍵 === 基 && String(位.首行原文 || "").replace(/\s+$/, "") === 原首 &&
        指紋(位).join("\n") === 指紋(卡).join("\n")) return 定(位);
  }
  /* ⚠⚠ 1.4.6:同一份檔案裡有好幾張第一行(拿掉日期、指派人、📌、時戳之後)一模一樣的卡片。
     一層一層縮小範圍,哪一層剩一張就是它:
       ① 內容指紋最像(內容每一行 + 留言 id)。**一定要排第一。**
          內容是我們自己寫的動作不太會動到的東西;第一行卻是**每寫一次就換一次時戳**。
       ② 內容分不出來(常見:兩張都沒有內容)→ 整行一字不差(日期、指派人、📌、到秒的時戳)。
          「兩張都叫 [買菜] ．牛奶,一張 9/13 一張 9/20」在這一層分開。
       ③ ✎ 時戳一樣(到秒)。
       ④ 還是分不出來:內容也一模一樣 → 挑同一個序號的那張(畫面上第幾張就是檔案裡第幾張);
          內容不一樣卻同分 → **什麼都不要寫**(回報含糊)。
     ⚠⚠ 1.4.6 開發中踩到、順序不可以改回來:原本「整行一字不差」排第一。
       兩張一模一樣的卡片(同一秒建立),改第二張的內容 → 第二張的時戳換新 →
       記憶體裡的舊整行現在**只跟第一張**對得上 → 接著改主題,主題被寫到第一張上。
       (寫手 現在也會在每次寫完把新的第一行記回卡片物件,見 記新首。兩道都要。)
     ⚠ 不要改回「用行號最近的那張硬挑」:行號是上一次渲染記下來的,檔案一動就整個位移,
       2026-09-11 那次「一篇被吃掉、變成兩張一樣的卡片」就是這樣來的。 */
  const 我指紋 = 指紋(卡);
  const 分 = 中.map(k => ({ k: k, 像: 相似(指紋(k), 我指紋) }));
  const 最像 = Math.max.apply(null, 分.map(x => x.像));
  let 候 = 分.filter(x => x.像 === 最像).map(x => x.k);
  if (候.length === 1) return 定(候[0]);
  const 同行 = 候.filter(k => String(k.首行原文 || "").replace(/\s+$/, "") === String(卡.首行原文 || "").replace(/\s+$/, ""));
  if (同行.length === 1) return 定(同行[0]);
  if (同行.length) 候 = 同行;
  if (卡.編修戳) {
    const 同戳 = 候.filter(k => k.編修戳 === 卡.編修戳);
    if (同戳.length === 1) return 定(同戳[0]);
    if (同戳.length) 候 = 同戳;
  }
  const 一樣 = 候.every(k => 指紋(k).join("") === 指紋(候[0]).join(""));
  if (!一樣) return { 卡: 候[0], 幾張: 中.length, 含糊: true };
  const 我序 = 序號之(卡.鍵);
  if (我序 && 中[我序 - 1] && 候.indexOf(中[我序 - 1]) >= 0) return 定(中[我序 - 1]);
  const 原 = Number(卡.起) || 0;
  return 定(候.reduce((a, b) => (Math.abs(b.起 - 原) < Math.abs(a.起 - 原) ? b : a)));
}
/* 寫成功之後,把新的第一行記回卡片物件(1.4.6)。
   畫面要等 Obsidian 回頭呼叫 setViewData 才會重畫,在那之前使用者手上的卡片物件還是舊的;
   緊接著再做下一個動作(改完內容馬上改主題、打勾馬上置頂),定位文 拿到的就是過期的整行和時戳。 */
/* 1.6.1:新 = 寫完之後重新解析出來的那張卡片。基鍵也要記回去 ——
   舊寫法的卡片第一次被寫到就換成新寫法,改內容、改主題也會換基鍵;不記的話,
   緊接著的「反悔」拿舊基鍵去找,就是「找不到這張卡片」。 */
function 記新首(卡, 新) {
  if (!卡 || !新) return;
  卡.首行原文 = 新.首行原文;
  卡.基鍵 = 新.基鍵;
  if (新.編修戳) 卡.編修戳 = 新.編修戳;
}

/* 1.6.3(U43–U46,mockup v14 Q27 定案)封存區的「移出」和「整批刪除」共用的純函式:
   把 `## <標名>` 那一段(標題 + 底下所有行)整段切出來。
   回傳 { 段: 那一段的文字(結尾一個換行), 剩: 拿掉之後的整份, 張: 這一段裡有幾張卡片 };
   找不到那個標題回傳 null(呼叫的人就不要寫)。
   ⚠ 同名的標題出現兩次以上就全部算進去(跟 改分類們 一樣 —— 使用者的筆記真的會這樣)。
   ⚠ 只切標題,其他行一個字都不動(寫手規則 4:一次只碰最少的行)。 */
function 抓分區(文, 標名) {
  const 名 = String(標名 == null ? "" : 標名).trim();
  if (!名) return null;
  const 塊 = [{ 名: null, 頭: null, 身: [] }];
  String(文 == null ? "" : 文).split("\n").forEach(t => {
    const h = 標題Re.exec(t);
    if (h) 塊.push({ 名: h[1].trim(), 頭: t, 身: [] });
    else 塊[塊.length - 1].身.push(t);
  });
  const 走 = 塊.filter(b => b.名 === 名);
  if (!走.length) return null;
  const 段 = [];
  let 張 = 0;
  走.forEach(b => {
    段.push(b.頭);
    b.身.forEach(t => { 段.push(t); const c = 卡首Re.exec(t); if (c && !c[1]) 張++; });
  });
  const 出 = [];
  塊.filter(b => 走.indexOf(b) < 0).forEach(b => { if (b.頭 !== null) 出.push(b.頭); 出.push(...b.身); });
  return { 段: 段.join("\n").replace(/\s+$/, "") + "\n", 剩: 出.join("\n"), 張: 張 };
}
/* 檔名不能有 * " \ / < > : | ? (Obsidian / Windows),# ^ [ ] 會弄壞連結 —— 一律換成 - */
function 淨檔名(s) {
  const x = String(s == null ? "" : s).replace(/[*"\\/<>:|?#^[\]]/g, "-")
    .replace(/-{2,}/g, "-").replace(/\s+/g, " ").trim().replace(/^[.\-]+/, "").slice(0, 80).trim();
  return x || "archive";
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
  /* 1.6.3 C21:緩衝只擋**下一棒**,不擋呼叫的人。
     以前呼叫的人要連緩衝一起等(完成編輯、打勾都多等 120ms 才重畫);現在寫完就回傳,
     佇列尾巴(this.隊)照樣等緩衝過了才放下一棒 —— 順序和「不抓到舊行號」都不變。 */
  async 排隊做(工作) {
    if (this.排隊數 >= this.上限) { new Notice(this.T.busy); return null; }
    this.排隊數++;
    const 這一棒 = this.隊.then(async () => {
      this.忙 = true;
      try { return await 工作(); }
      catch (e) { console.error("[card-table] 寫入失敗", e); return false; }
    });
    this.隊 = 這一棒.then(() => {}, () => {}).then(() => new Promise(r => setTimeout(r, this.緩衝))).then(() => { this.忙 = false; });
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
      const 新 = (typeof r.文 === "string") ? r.文 : null;
      /* 1.6.3:記下自己最後寫出去的整份文字。Obsidian 寫完會回頭呼叫 setViewData,
         內容一模一樣就是自己的回音 —— 編修中不重畫(見 setViewData),不再只靠 2.5 秒的時窗。 */
      if (新 !== null) (this.最後寫出 = this.最後寫出 || {})[檔.path] = 新;
      return 新;
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
  /* 做(行, 卡x) 的回傳:false = 找不到該動的地方;null = 不必改;
     字串 = 這張卡片寫完之後的第一行(搬走的卡片用這個,空字串 = 卡片已經不在了);
     其他 = 原地改,第一行就是 行[卡x.起]。
     ⚠ 寫成功之後把新的第一行記回卡片物件(記新首),下一個動作才不會拿過期的整行去找。 */
  // 收:呼叫的人想拿到寫完之後的新卡片,就傳一個物件進來(收.新)。不要用 this 上的欄位 —— 佇列的下一棒可能先把它蓋掉
  改卡片(檔, 卡, 名單, 做, 收) {
    let 新 = null;
    return this.安全改(檔, (文) => {
      新 = null;
      const 位 = 定位文(文, 卡, 名單);
      if (!位) return { 誤: this.T.lost };
      if (位.含糊) return { 誤: this.T.ambiguous };
      const 行 = 文.split("\n");
      const r = 做(行, 位.卡);
      if (r === false) return { 誤: this.T.lost };
      if (r === null) return { 文: 文 };
      // 搬走的卡片回傳它的第一行(字串);原地改的卡片,第一行還在 起
      const 新首 = String((typeof r === "string") ? r : 行[位.卡.起]).split("\n")[0];
      const 新文 = 行.join("\n");
      if (新首) {
        const 新行 = 新文.split("\n");
        const 在 = (typeof r === "string") ? 新行.indexOf(新首) : 位.卡.起;
        新 = 解析卡片(新文, 名單).find(k => k.起 === 在) || null;
      }
      return { 文: 新文 };
    }).then(ok => { if (ok) { 記新首(卡, 新); if (收) 收.新 = 新; } return ok; });
  }

  /* ⚠⚠ 一行就是一行 —— 寫進去的字裡面**絕對不可以有換行**。
     踩過的坑:使用者留了一則多行的留言,那一整串被當成「一行」splice 進陣列,
     join 之後就變成好幾個實體行 —— 第一行還帶著 `．💬{...}` 前綴,
     第二行以後是**沒有前綴的裸文字**,卡片上看起來就像多了兩行莫名其妙的內容,
     而且解析時也不會被當成留言。所以所有寫入都先過這一關。 */
  一行(文) {
    return String(文 || "").replace(/[\r\n]+/g, " ").replace(/[\t ]{2,}/g, " ");
  }
  /* 1.6.2(B3)內容行用:只擋換行(一行就是一行),**縮排和行中的空白照留**。
     一行() 會把連續的 tab / 空白壓成一個 —— 用在內容上,巢狀清單的縮排、表格的對齊就沒了。 */
  一行留空白(文) {
    return String(文 || "").replace(/[\r\n]+/g, " ");
  }

  /* 只插一行:加在內容後面、[ed::] 前面(留言就是這樣進去的)。
     ⚠ 舊版寫完會重讀三次確認、沒看到就「補送一次」—— 那個補送本身就是重複留言的來源。
       現在是原子寫入,重複檢查跟寫入在同一個交易裡,不需要補送也不會重複。 */
  async 插一行(檔, 卡, 行文, 名單, 檢查重複) {
    行文 = this.一行(行文);
    return await this.排隊做(() => this.改卡片(檔, 卡, 名單, (行, 卡x) => {
      if (檢查重複 && 檢查重複(卡x)) return null;      // 已經在裡面了
      行.splice(卡尾(行, 卡x.起, 卡x.迄) + 1, 0, 行文);
      蓋卡(行, 卡x.起, 卡x.迄 + 1);          // ed 會被搬到新留言後面
    }));
  }

  /* 只改／刪一行:找到那一行(用留言 id 或整行比對)換掉它 */
  // 新文 也可以是函式:拿到找到的那一行,回傳新的那一行(1.6.1 勾內容裡的待辦)
  async 改一行(檔, 卡, 認行, 新文, 名單) {
    if (新文 !== null && typeof 新文 !== "function") 新文 = this.一行(新文);
    return await this.排隊做(() => this.改卡片(檔, 卡, 名單, (行, 卡x) => {
      let 目標 = -1;
      for (let i = 卡x.起; i <= 卡x.迄; i++) { if (認行(行[i])) { 目標 = i; break; } }
      if (目標 < 0) return false;
      let 值 = 新文;
      if (typeof 新文 === "function") {
        const 原 = String(新文(行[目標]) || ""), 空 = 前空白(原);    // 原本的縮排(可能是兩個 tab)照留
        值 = 空 + this.一行留空白(原.slice(空.length));
      }
      // ⚠ 先換那一行、再蓋卡(蓋卡會 splice,一定是最後一步)
      if (值 === null) 行.splice(目標, 1); else 行[目標] = 值;
      蓋卡(行, 卡x.起, 值 === null ? 卡x.迄 - 1 : 卡x.迄);
    }));
  }

  /* 整段內容改寫(編修框按儲存)。留言不動,原樣留著。 */
  async 換內容(檔, 卡, 新內容, 名單, 新主題) {
    const 收 = {};
    return await this.排隊做(() => this.改卡片(檔, 卡, 名單, (行, 卡x) => {
      // 留言照原本的順序留著,順便換成新寫法(這一張整張都在重寫)
      const 留 = [];
      for (let i = 卡x.起 + 1; i <= 卡x.迄; i++) {
        const c = 讀留言(去符(行[i]));
        if (c) 留.push(組留言行文(c.日, c.分, c.人, c.文));
      }
      const p = 拆首行(行[卡x.起], 名單);
      if (!p) return false;
      if (新主題 !== undefined && 新主題 !== null) p.題 = String(新主題).trim() || null;
      /* 第一行結尾的 #標籤 在畫面上是接在第一行內容後面的(見 收尾),編修框裡也是 ——
         所以它們跟著內容一起寫回去,第一行不再留一份。 */
      p.標籤 = [];
      // 1.6.1 既往不咎:照使用者打的寫(自己打的符號留著,沒打的不加)
      // 1.6.2(B3):縮排、空行、行中的空白也照打的(照打段);每一行只擋換行
      const 段 = 照打段(新內容).map(t => this.一行留空白(t));
      // 沒有主題的卡片,第一行內容留在第一行(有縮排的行不行);有主題的全部放到第二行以下
      p.文 = (!p.題 && 段.length && !/^\s/.test(段[0]) && 可放首行(段[0])) ? 段.shift() : "";
      const 尾 = 段.map(t => t ? "\t" + t : "");
      // 內容 → 留言 → [ed::](最後一行);卡片後面原本的空白行留著
      const 空行 = [];
      for (let i = 卡x.迄; i > 卡x.起 && !String(行[i]).trim(); i--) 空行.unshift(行[i]);
      行.splice(卡x.起, 卡x.迄 - 卡x.起 + 1, 組首行(p), ...尾, ...留, 組編行(現在戳()), ...空行);
    }, 收)).then(r => {
      /* ⚠ 改完內容,這張卡片的**身分就換了** —— 鍵是「主題 + 第一行內容」算出來的。
         隨打隨存的時候如果不把新的鍵交回去,下一次自動存就會拿舊鍵去找,
         找不到 → 每打幾個字跳一次「找不到這張卡片」。 */
      return (r === true && 收.新 && 收.新.基鍵) ? 收.新.基鍵 : r;
    });
  }

  /* 新增一張卡片:插在指定分類(`## 標題`)的正下面。
     ⚠ 只加行,不重排別人的卡片。 */
  async 新增卡片(檔, 分類, 首行, 尾行) {
    首行 = this.一行(首行);
    尾行 = (尾行 || []).map(t => this.一行留空白(t));        // 1.6.2(B3):內容的縮排照留
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
      行[卡x.起] = 新;
      蓋卡(行, 卡x.起, 卡x.迄);
    }));
  }

  /* 只改主題(第一行開頭那個 `[主題]`),內容和留言完全不碰 */
  async 改主題(檔, 卡, 新主題, 名單) {
    return await this.改首行(檔, 卡, (首) => 改零件(首, 名單, p => { p.題 = String(新主題 || "").trim() || null; }), 名單);
  }

  /* 把整張卡片(首行 + 底下所有行)搬到另一個分類底下。封存就是搬到 `## Archive`。 */
  async 搬分類(檔, 卡, 到, 名單) {
    return await this.排隊做(() => this.改卡片(檔, 卡, 名單, (行, 卡x) => {
      if (卡x.分類 === 到) return null;
      const 整張 = 行.slice(卡x.起, 卡x.迄 + 1);
      蓋卡(整張, 0, 整張.length - 1);
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
      return 整張[0];                 // 搬走了,第一行不在原來的行號上
    }));
  }

  /* 刪掉整張卡片(首行 + 底下所有行)。只有已封存的卡片會走到這裡。 */
  async 刪卡片(檔, 卡, 名單) {
    return await this.排隊做(() => this.改卡片(檔, 卡, 名單, (行, 卡x) => {
      行.splice(卡x.起, 卡x.迄 - 卡x.起 + 1);
      return "";                      // 刪掉了,沒有新的第一行
    }));
  }

  /* 指派人改名:把整份檔案裡的 `#舊名` 換成 `#新名`。
     ⚠ 這是會一次改很多行的動作,所以只換 `#名字` 這個 token,不碰其他字。 */
  async 改指派人名(檔, 舊, 新) {
    return await this.排隊做(() => this.安全改(檔, (文) => {
      // 1.6.3:新寫法 @名字、舊寫法 #名字 都換(照原本的符號)
      const re = new RegExp("([#@])" + 舊.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        "(?![\\w\\u4e00-\\u9fff-])", "g");
      const 換 = (文.match(re) || []).length;
      if (!換) return { 文: 文, 值: 0 };
      return { 文: 文.replace(re, (全, 符) => 符 + (符 === "@" ? 人正(新) : 新)), 值: 換 };
    }));
  }

  /* 融合:好幾張合成一張。
     ⚠ **任何一張對不上或分不出來就整份不動** —— 半套的融合會直接吃掉卡片。 */
  async 融合(檔, 卡們, 到分類, 首行, 尾行, 名單) {
    首行 = this.一行(首行);
    尾行 = (尾行 || []).map(t => this.一行留空白(t));        // 1.6.2(B3):內容的縮排照留
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
      行[卡x.起] = 換日期(行[卡x.起], 新日, null);
      // 記錄放在內容後面、留言和 [ed::] 前面
      let 插 = 卡x.起 + 1;
      while (插 <= 卡x.迄 && !讀留言(內文之(行[插])) && !非內容行(行[插])) 插++;
      插 = Math.min(插, 卡尾(行, 卡x.起, 卡x.迄) + 1);
      行.splice(插, 0, 記錄行);
      蓋卡(行, 卡x.起, 卡x.迄 + 1);
    }));
  }
  async 復原本次(檔, 卡, 記錄行, 從, 回, 名單) {
    const 找 = 去符(this.一行(記錄行));
    return await this.排隊做(() => this.改卡片(檔, 卡, 名單, (行, 卡x) => {
      行[卡x.起] = 換日期(行[卡x.起], 回, null);
      let 迄 = 卡x.迄;
      for (let i = 卡x.起 + 1; i <= 迄; i++) {
        if (去符(行[i]) === 找) { 行.splice(i, 1); 迄--; break; }
      }
      蓋卡(行, 卡x.起, 迄);
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

  /* 1.6 分類設定按 ✓:新增、刪除(卡片搬到指定的分類)、改名,**一次原子寫入**做完。
     計畫 = { 新增: [名…], 刪: [[舊名, { 名, 新 }]…], 改名: [[舊, 新]…] }
       ・新增的標題插在第一個封存區前面(沒有封存區就放最後)
       ・刪掉的那一段,底下所有非空白的行搬到目標那一段的最上面(跟 搬分類 同一個位置),標題拿掉
       ・改名只改**原本就有**的標題 —— 新增的分類剛好叫某個舊名字時,不會被一起改到
     卡片行本身一個字都不改(不蓋 ✎ 時戳):這是整段搬家,不是編輯卡片。
     ⚠ 標題對不上(別台裝置剛改過)就整份不動。 */
  async 改分類們(檔, 計畫) {
    return await this.排隊做(() => this.安全改(檔, (文) => {
      const 行 = 文.split("\n");
      const 名之 = (t) => { const h = 標題Re.exec(t); return h ? h[1].trim() : null; };
      const 塊 = [{ 名: null, 頭: null, 身: [] }];            // 第一塊 = 第一個標題前面的東西
      行.forEach(t => {
        const n = 名之(t);
        if (n !== null) 塊.push({ 名: n, 頭: t, 身: [] });
        else 塊[塊.length - 1].身.push(t);
      });
      const 有 = (n) => 塊.some(b => b.名 === n);
      if (計畫.刪.some(([舊]) => !有(舊)) || 計畫.改名.some(([舊]) => !有(舊))) return { 誤: this.T.lost };
      if (計畫.刪.some(([, 到]) => !到.新 && !有(到.名))) return { 誤: this.T.lost };
      const 補空行 = (b) => { if (b && b.身.length && b.身[b.身.length - 1].trim() !== "") b.身.push(""); };
      // ① 新增
      計畫.新增.forEach(n => {
        const 新塊 = { 名: n, 頭: "## " + n, 身: [""], 新: true, 動: true };
        const 封 = 塊.findIndex(b => b.名 !== null && /archive|封存/i.test(b.名));
        if (封 > 0) { 補空行(塊[封 - 1]); 塊.splice(封, 0, 新塊); }
        else { 補空行(塊[塊.length - 1]); 塊.push(新塊); }
      });
      // ② 刪除 + 搬家
      計畫.刪.forEach(([舊, 到]) => {
        const 走們 = 塊.filter(b => b.名 === 舊 && !b.新 && !b.刪);
        const 目 = 塊.find(b => b.名 === 到.名 && !!b.新 === !!到.新 && !b.刪 && 走們.indexOf(b) < 0);
        if (!目) return;
        const 搬 = [];
        走們.forEach(b => { b.身.forEach(t => { if (t.trim()) 搬.push(t); }); b.刪 = true; });
        if (!搬.length) return;
        // 跳過標題底下的空白行,插在第一個非空白行前面;標題底下沒有空白行就補一行
        let 插 = 0;
        while (插 < 目.身.length && 目.身[插].trim() === "") 插++;
        if (插 === 0) { 目.身.unshift(""); 插 = 1; }
        目.身.splice(插, 0, ...搬);
        目.動 = true;
      });
      if (計畫.刪.some(([舊]) => 塊.some(b => b.名 === 舊 && !b.新 && !b.刪))) return { 誤: this.T.lost };
      // ③ 改名(同時對映,兩個分類互換名字也可以)
      const 改 = new Map(計畫.改名);
      塊.forEach(b => {
        if (b.名 !== null && !b.新 && !b.刪 && 改.has(b.名)) b.頭 = b.頭.replace(/^(#{1,6}\s+).*$/, (全, 井) => 井 + 改.get(b.名));
      });
      const 留 = 塊.filter(b => !b.刪);
      // 動過的那幾段(新增的、搬進卡片的):後面還有標題的話,結尾留一行空白。沒動過的段落照原樣
      留.forEach((b, i) => { if (b.動 && i < 留.length - 1) 補空行(b); });
      const 出 = [];
      留.forEach(b => { if (b.頭 !== null) 出.push(b.頭); 出.push(...b.身); });
      return { 文: 出.join("\n"), 值: true };
    }));
  }

  /* U43–U45(mockup v14 Q27 定案)把整個封存區**移出**看板:
     建一份 `<封存區的名字><移出後綴>.md`(預設同資料夾),那一段原文搬進去,
     **建檔成功了才**從看板筆記裡刪掉那一段。回傳 { 檔: 新檔路徑, 張: 幾張 },失敗回傳 false。
     ⚠⚠ 兩個檔案不可能「一次原子寫入」(寫手規則 1 只保證單一檔案)。
       順序一定是「先建新檔 → 再刪原文」:中間掛掉最壞是兩邊都有(看得到、救得回);
       反過來先刪再建,建失敗就直接吃掉使用者整區的卡片。
     ⚠ 同名的檔案已經在了就在後面加序號,**絕對不覆蓋**(跟 轉新格式 的備份一樣)。 */
  async 移出分區(檔, 標名, 檔底, 夾) {
    return await this.排隊做(async () => {
      const v = this.app.vault;
      let 路 = null, 張 = 0;
      try {
        const 段 = 抓分區(await v.read(檔), 標名);
        if (!段) { new Notice(this.T.lost); return false; }
        張 = 段.張;
        const 本夾 = (檔.parent && 檔.parent.path && 檔.parent.path !== "/") ? 檔.parent.path : "";
        const 用夾 = String(夾 || "").replace(/^\/+|\/+$/g, "") || 本夾;
        const 底 = (用夾 ? 用夾 + "/" : "") + 淨檔名(檔底);
        路 = 底 + ".md";
        for (let i = 2; v.getAbstractFileByPath(路) && i < 200; i++) 路 = 底 + " " + i + ".md";
        await v.create(路, 段.段);
      } catch (e) {
        console.error("[card-table] 移出:新檔建不起來,原文一個字都沒動", e);
        new Notice(this.T.moveOutFailed);
        return false;
      }
      const ok = await this.安全改(檔, (文) => {
        const 段 = 抓分區(文, 標名);
        if (!段) return { 誤: this.T.lost };
        return { 文: 段.剩, 值: true };
      });
      return ok === false ? false : { 檔: 路, 張: 張 };
    });
  }

  /* U46(Q27 定案,使用者:「刪掉就是刪掉就沒了」)整批刪除一個封存區:
     那一段(標題 + 卡片)整段從筆記裡拿掉,**不留檔**。一次原子寫入。回傳刪掉幾張。 */
  async 刪分區(檔, 標名) {
    return await this.排隊做(() => this.安全改(檔, (文) => {
      const 段 = 抓分區(文, 標名);
      if (!段) return { 誤: this.T.lost };
      return { 文: 段.剩, 值: 段.張 };
    }));
  }

  /* 1.6.1 設定 →「全部轉成新格式」:整份筆記一次原子寫入(見 轉整份)。
     ⚠ 寫之前先把原文備份成**同一個資料夾**裡的一份筆記(使用者要的:「<名字> backup-20260916-1420.md」)。
       備份寫不進去就整份不動。回傳 { 張, 備份 };沒東西要轉回傳 { 張: 0 };失敗回傳 false。 */
  async 轉新格式(檔, 名單) {
    return await this.排隊做(async () => {
      const v = this.app.vault;
      let 備份 = null;
      try {
        const 原 = await v.read(檔);
        if (!轉整份(原, 名單).張) return { 張: 0 };
        const 夾 = (檔.parent && 檔.parent.path && 檔.parent.path !== "/") ? 檔.parent.path + "/" : "";
        const 底 = 夾 + 檔.basename + " backup-" + 現在戳().replace(/[-:]/g, "").replace(" ", "-");
        let 路 = 底 + ".md", i = 1;
        while (v.getAbstractFileByPath(路)) { i++; 路 = 底 + " " + i + ".md"; }
        await v.create(路, 原);
        備份 = 路;
      } catch (e) {
        console.error("[card-table] 備份失敗", e);
        return false;
      }
      const 張 = await this.安全改(檔, (文) => {
        const r = 轉整份(文, 名單);
        return { 文: r.張 ? r.文 : 文, 值: r.張 };
      });
      return (張 === false) ? false : { 張: 張, 備份: 備份 };
    });
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
  /* ⚠ 1.4.4:只看**同一個資料夾**。衝突檔一定跟原檔放在一起,
     以前每次重畫都把整個 vault 的檔案列一遍(審核的「Vault Enumeration」就是在講這個)。 */
  找衝突檔(檔) {
    try {
      const base = 檔.basename;
      const 兄弟 = (檔.parent && 檔.parent.children) || [];
      return 兄弟.filter(f => f && f.extension === "md" && f.path !== 檔.path &&
        f.basename.indexOf(base) === 0 && /conflicted copy|衝突|conflict/i.test(f.basename));
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
const 分類上限 = 10;          // 1.6:設定面板裡分類最少 1 個、最多 10 個(封存區不算)
const 露幾則留言 = 2;      // 平常只露這麼多則,其餘收起來
/* 尺寸都從調校台調過來(260911v1):
     日期欄 112→110 ‧ 分類欄 78→72 ‧ 統計格 96→98 ‧ 格高 68→60
     主題膠囊 22→24 ‧ 留言露 3→2 則 ‧ 反悔 3→2 秒
   (動作留寬拿掉了:1.4.5 起內容區右邊沒有按鈕,不必讓位) */
const 格寬 = 98, 格高 = 60, 年格寬 = 98;
const 主題高 = 24;
/* 分類欄寬跟著語言走(T.分類欄寬):沒有指派人的卡片會在這一欄顯示「＋指派人」,
   英文的 "+ Assignee" 比中文寬,寫死 72 會被切掉。 */
/* ⚠ 日期欄寬度跟著語言走,放在字典裡(T.日期欄寬)。
   中文的「26-09-12(六)」剛好塞得進 110,英文的星期是三個字母,
   「26-09-12(Sat)」要 115 才不會被切掉 —— 以前寫死 110,英文介面的日期左右都被削掉一塊。 */
const 反悔毫秒 = 2000;
// ⚠ 最新版把「本日」獨立成一欄(整欄就它一列,所以垂直置中、字最大),
//   本周 / 本月 才疊在下一欄各佔一半高 —— 這樣整條只要兩列就夠,比三列疊矮。
//   舊版是三層疊在同一欄,不要再做回去。
// 1.5:週月格 118 → 124。本月 / 本周改成高箭頭,「9/28–10/4」在 118 裡差 3px
const 日格寬 = 98, 週月格寬 = 132;     // 1.6:124 → 132,週的標籤寫兩次月份(10/12–10/18)
/* 1.6:標籤放不下就一級一級縮小字(每次 0.04em,最小 0.5em)。分頁還沒顯示(寬度 0)的時候不動。 */
function 縮到放得下(el) {
  try {
    let em = parseFloat(el.style.fontSize) || 0.7;
    for (let n = 0; n < 6 && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 0.5 && em > 0.5; n++) {
      em = Math.round((em - 0.04) * 100) / 100;
      el.style.fontSize = em + "em";
    }
  } catch (e) {}
}
/* 1.6 標題列上的字(時間篩選的「今日 09-15(二)」、清單表的標題和張數)。
   ⚠ 中文字在行框裡本來就偏上,使用者看得出來 → 上面補 2px(flex 置中之後整行往下 1px)。
   ⚠ 不可以用 line-height:1 去壓:字身比 1em 高,配上 overflow:hidden(省略號要用)上緣就被裁掉(開發中「今日」被吃掉一截)。 */
// 1.6:主題框(house)和內容框(pen-line)空白時的圖示,兩顆同一個大小
const 空框圖寬 = 12;
const 標頭補正 = "line-height:1.4;padding-top:2px;box-sizing:border-box;";
const 標頭字樣 = "font-size:0.72em;" + 標頭補正 + "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;";
const 完成色 = "var(--color-green, #3aa76d)";

function st(el, css) { el.style.cssText = css; return el; }
/* 表頭標題前面那一格(1.4.6)1.6.3 拿掉了:所有標題列改用同一個 `.tk-溝`(3–18),
   沒有收合箭頭的表就畫一個空的溝,後面的東西照樣落在 22。 */

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
  "pencil": '<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/><path d="m15 5 4 4"/>',
  "chevron-left": '<path d="m15 18-6-6 6-6"/>',
  "chevron-right": '<path d="m9 18 6-6-6-6"/>',
  "chevron-down": '<path d="m6 9 6 6 6-6"/>'
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
/* 1.6.1:把 [起, 迄) 換成 字,而且**留在瀏覽器的復原紀錄裡**(Ctrl+Z 退得回來)。
   ⚠ 不要再直接 `ta.value = …`:那會把整個 textarea 的復原紀錄清掉(使用者回報「不能 undo」)。
     execCommand 雖然被標成過時,Chromium / Electron / iOS WebKit 都還支援,而且是唯一會進復原紀錄的做法;
     不支援時才退回 setRangeText(至少字是對的)。 */
function 可復原換(ta, 起, 迄, 字) {
  try { ta.focus({ preventScroll: true }); } catch (e) {}
  ta.setSelectionRange(起, 迄);
  let ok = false;
  try { ok = 字 ? document.execCommand("insertText", false, 字) : document.execCommand("delete"); } catch (e) {}
  if (!ok) ta.setRangeText(字, 起, 迄, "end");
  return ok;        // true = 瀏覽器已經自己發了 input 事件
}
function 包起來(ta, 左, 右, 游標尾) {
  const a = ta.selectionStart, b = ta.selectionEnd;
  const 選 = ta.value.slice(a, b);
  const 前 = ta.value.slice(0, a), 後 = ta.value.slice(b);
  if (前.slice(-左.length) === 左 && 後.slice(0, 右.length) === 右) {      // 記號在選取範圍外面
    可復原換(ta, a - 左.length, b + 右.length, 選);
    ta.selectionStart = a - 左.length; ta.selectionEnd = b - 左.length;
    return;
  }
  if (選.length >= 左.length + 右.length &&
      選.slice(0, 左.length) === 左 && 選.slice(-右.length) === 右) {      // 記號被一起選起來了
    const 內 = 選.slice(左.length, 選.length - 右.length);
    可復原換(ta, a, b, 內);
    ta.selectionStart = a; ta.selectionEnd = a + 內.length;
    return;
  }
  可復原換(ta, a, b, 左 + 選 + 右);
  if (a === b) { ta.selectionStart = ta.selectionEnd = a + 左.length; }     // 沒選字就把游標放中間
  else if (游標尾) {
    // 連結那一種:包完游標要跳進括號裡(`[選起來的字](|)`),不是把字再選一次
    const p = ta.value.length - 後.length - 游標尾;
    ta.selectionStart = ta.selectionEnd = p;
  }
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
/* ⚠⚠⚠ 1.4.1:快捷鍵**不可以寫死**,要讀這一台 Obsidian 自己的設定。
   1.4 以前這裡是一張固定表(Ctrl+B / Ctrl+Shift+H …),問題是:
     ・改過鍵位的人正是最在意快捷鍵的人,而他們一按就是沒反應
     ・Obsidian 沒有預設綁鍵的指令(Toggle code、Toggle strikethrough 兩個就沒有),
       我們卻自己發明了一組,變成「只有這個外掛有、別的地方沒有」的怪規則
   現在的規則只有一句話:**在卡片裡打字,跟在一般 .md 檔案裡打字一模一樣**。
   Obsidian 的 Toggle bold 綁什麼,這裡就是什麼;Obsidian 沒綁,這裡就沒有
   (要的話去設定 → 快捷鍵綁上去,兩邊會同時生效)。 */
const md指令 = [
  // 指令 id,                       左記號, 右記號, 包完游標要退回幾個字
  ["editor:toggle-bold", "**", "**", 0],
  ["editor:toggle-italics", "*", "*", 0],
  ["editor:toggle-highlight", "==", "==", 0],
  ["editor:toggle-code", "`", "`", 0],
  ["editor:toggle-strikethrough", "~~", "~~", 0],
  ["editor:insert-wikilink", "[[", "]]", 0],
  ["editor:insert-link", "[", "]()", 1]     // 包完游標跳進括號裡
];

/* getHotkeys() 只會給**使用者自己改過的**那些,沒改過的要再問 getDefaultHotkeys()。
   只問其中一個都會漏掉一半的人。
   讀出來的東西存一下下就好 —— 使用者在設定裡改完鍵位不必重開,最多一秒半就跟上。 */
let md表 = null, md表時 = 0;
function 取md快捷() {
  const 現在 = Date.now();
  if (md表 && 現在 - md表時 < 1500) return md表;
  const hm = 目前app && 目前app.hotkeyManager;
  const 表 = [];
  if (hm) {
    md指令.forEach((項) => {
      let 組 = null;
      try { 組 = hm.getHotkeys(項[0]) || hm.getDefaultHotkeys(項[0]) || null; } catch (e) {}
      if (!組 || !組.length) return;
      組.forEach((h) => 表.push({ 鍵: h, 左: 項[1], 右: 項[2], 游標尾: 項[3] }));
    });
  }
  md表 = 表; md表時 = 現在;
  return 表;
}

/* Obsidian 存的 hotkey 長這樣:{ modifiers:["Mod","Shift"], key:"B" }。
   Mod 在 Windows / Linux 是 Ctrl,在 Mac 是 ⌘ —— 這是它跨平台的寫法,要照著翻。 */
function 合修飾鍵(e, 修飾) {
  const 要 = { ctrl: false, meta: false, alt: false, shift: false };
  (修飾 || []).forEach((m) => {
    const s = String(m).toLowerCase();
    if (s === "mod") { if (是Mac()) 要.meta = true; else 要.ctrl = true; }
    else if (s === "ctrl" || s === "control") 要.ctrl = true;
    else if (s === "meta" || s === "cmd" || s === "win") 要.meta = true;
    else if (s === "alt" || s === "option") 要.alt = true;
    else if (s === "shift") 要.shift = true;
  });
  // 四顆都要**完全一樣**,多按一顆就不算 —— 不然 Ctrl+B 會把 Ctrl+Shift+B 也吃掉
  return !!e.ctrlKey === 要.ctrl && !!e.metaKey === 要.meta &&
         !!e.altKey === 要.alt && !!e.shiftKey === 要.shift;
}

/* ⚠⚠⚠ 這裡錯過兩次,把原因寫死在這裡免得再犯。
   要判斷「使用者按的是哪一顆鍵」,一定要用 **e.code**(實體鍵位),不可以用 e.key。
   e.key 給的是「這一下**打出什麼字**」,那會被輸入法和鍵盤配置改掉 ——
   注音輸入法開著的時候,同一顆 B 鍵給出來的 e.key 可能是 "Process"、
   可能是注音符號、也可能 keyCode 變成 229。於是 `e.key === "b"` 永遠不成立,
   快捷鍵在中文使用者身上就是「完全沒反應」。
   e.code 是實體鍵位("KeyB"),不管什麼輸入法、什麼語言都一樣。
   同理:**不可以**因為 keyCode === 229 就直接 return —— 那是給「正在拼字」用的判斷,
   按著 Ctrl 的組合鍵不是在拼字。只擋 e.isComposing 就好。
   ⚠ Obsidian 那邊存的是 e.key 的寫法("B"、"1"、"F2"、"ArrowUp"),所以英數要自己
     翻成 code 再比;功能鍵和方向鍵不受輸入法影響,直接比 e.key 就對了。 */
function 合實體鍵(e, 鍵) {
  const k = String(鍵 || "");
  if (!k) return false;
  if (/^[A-Za-z]$/.test(k)) return e.code === "Key" + k.toUpperCase();
  if (/^[0-9]$/.test(k)) return e.code === "Digit" + k || e.code === "Numpad" + k;
  return String(e.key || "").toLowerCase() === k.toLowerCase();
}

function 處理md快捷(e) {
  const ta = e.target;
  if (!ta || !ta.classList || !ta.classList.contains("tk-md")) return;
  if (e.isComposing) return;
  if (e.__cjb已處理) return;                 // 兩層監聽器都收到同一個事件時只做一次
  /* ⚠ 一定要有修飾鍵。Obsidian 允許把指令綁在單獨一顆鍵上,但那種鍵在輸入框裡
     就是「使用者想打這個字」,攔下來會讓人打不出字 —— 寧可不支援。 */
  if (!(e.ctrlKey || e.metaKey || e.altKey)) return;
  const 中 = 取md快捷().find((x) => 合修飾鍵(e, x.鍵.modifiers) && 合實體鍵(e, x.鍵.key));
  if (!中) return;
  e.__cjb已處理 = true;
  e.preventDefault();
  e.stopPropagation();
  if (e.stopImmediatePropagation) e.stopImmediatePropagation();
  包起來(ta, 中.左, 中.右, 中.游標尾);
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

/* 把 textarea 撐到剛好裝得下內容。所有會長高的輸入框都要走這裡。
   ⚠⚠⚠ 1.4.1:量高度之前**一定要**把看板的捲動位置存起來,設完再放回去。
     量高度非得先 height:auto 不可(不然 scrollHeight 只會長不會縮),但是
     textarea 的 height:auto **不是「內容那麼高」,是「預設的兩行」**。
     所以那一瞬間整個看板真的塌掉,瀏覽器把超出範圍的 scrollTop 夾回去,
     高度設回來之後捲動位置已經回不來了 —— 使用者看到的就是「一打字畫面自己彈走」。
     最底下那張卡片 scrollTop 最接近上限,塌得最嚴重,常常直接彈到最上面。 */
/* ⚠⚠ 1.4.4:改成**用鏡子量**,textarea 本身完全不塌。
   上面那個「先 height:auto 再量」的做法在桌機上看不出問題(同一個 task 裡塌下去又撐回來,
   瀏覽器來不及畫),但 iOS 的 WebKit 捲動是非同步的:塌下去那一瞬間捲動位置被夾住,
   撐回來之後我們再把 scrollTop 設回去 —— 使用者看到的就是
   「手機編輯時捲軸莫名動一下往下、又被拉回來」。
   鏡子是一個看不見的 div,同樣的寬度、字體、padding,把文字倒進去量高度。
   ⚠ 鏡子量得比真的矮一點點(折行規則差一個字)時,textarea 會自己多出一行內部捲動 ——
     所以設完再看一次 scrollHeight,不夠就補到夠。補只會往上長,不會塌。 */
let 量高鏡 = null;
function 撐高(ta) {
  if (!ta || !ta.isConnected) return;
  const 板 = (ta.closest ? ta.closest(".tk-board") : null);
  const 捲 = 板 ? 板.scrollTop : 0;
  try {
    if (!量高鏡 || !量高鏡.isConnected) { 量高鏡 = document.body.createDiv(); 量高鏡.addClass("tk-鏡"); }
    const cs = window.getComputedStyle(ta);
    const 框線 = (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
    const 內距 = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    量高鏡.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;left:-99999px;top:0;" +
      "white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;box-sizing:border-box;" +
      "width:" + ta.clientWidth + "px;" +
      "padding:" + cs.paddingTop + " " + cs.paddingRight + " " + cs.paddingBottom + " " + cs.paddingLeft + ";" +
      "font-family:" + cs.fontFamily + ";font-size:" + cs.fontSize + ";font-weight:" + cs.fontWeight + ";" +
      "line-height:" + cs.lineHeight + ";letter-spacing:" + cs.letterSpacing + ";tab-size:" + cs.tabSize + ";";
    // 結尾補一個零寬字:最後一行是空行時,div 不會替它留高度,textarea 會
    量高鏡.setText(String(ta.value || "") + "​");
    const 內容高 = 量高鏡.scrollHeight;                     // 含 padding
    const 最小 = parseFloat(cs.minHeight) || 0;
    let 高 = (cs.boxSizing === "border-box") ? 內容高 + 框線 : 內容高 - 內距;
    if (最小 && 高 < 最小) 高 = 最小;
    ta.style.height = Math.ceil(高) + "px";
    if (ta.scrollHeight > ta.clientHeight + 1) {
      ta.style.height = Math.ceil(ta.scrollHeight + (cs.boxSizing === "border-box" ? 框線 : -內距)) + "px";
    }
  } catch (e) {
    ta.style.height = "auto";
    ta.style.height = Math.ceil(ta.scrollHeight) + "px";
  }
  if (板 && 板.scrollTop !== 捲) 板.scrollTop = 捲;
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

/* 1.6.3 C1:照字寬截斷。中文 / 全形算 2、其他算 1,超過 寬 就截掉補「…」。
   用在標題列的搜尋膠囊、主題膠囊(C22 / U16:使用者 09-20「# 不超過 6 個中文字」)。 */
const 主題顯寬 = 12;        // 6 個中文字寬(英文 12 個字母)
/* 一串字佔幾個「半形」寬(中文 / 全形 2、其他 1)。1 個單位 ≈ 1ch,
   所以直接拿來當輸入框的寬度剛好(使用者 09-20:「主題欄位不要拉這麼長,有輸入再長出來」)。 */
function 字寬(字) {
  let n = 0;
  for (const c of String(字 || "")) n += (截寬(c, 1) === "…" ? 2 : 1);
  return n;
}
function 截寬(字, 寬) {
  const s = String(字 || "");
  let 計 = 0, 出 = "";
  for (const c of s) {
    const w = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/.test(c) ? 2 : 1;
    if (計 + w > 寬) return 出 + "…";
    計 += w;
    出 += c;
  }
  return 出;
}
/* C22(使用者 09-20:「要限制使用者不能打超過六個字」)**新打**的主題最多 6 個中文字寬:
   多的直接截掉,**不補「…」**(這是要寫進筆記的字)。
   ⚠ 只管新打的(新增卡片、改主題那一格);舊筆記裡比較長的主題照讀、一個字都不改,
     畫面上由 截寬() 截成「…」—— 不可以在讀的路徑上截,那會換掉卡片的身分(基鍵)。 */
function 題限(s) {
  const x = 截寬(s, 主題顯寬);
  return x.endsWith("…") ? x.slice(0, -1) : x;
}

/* 1.6.3 C3:選單項目的圖示,跟 圖備() 一樣依序試名字(Lucide 改過名);轉 = 旋轉角度。 */
function 選單圖(項, 名們, 轉) {
  const 單 = Array.isArray(名們) ? 名們 : [名們];
  const 名 = 單.find(n => { try { return !!(getIcon && getIcon(n)); } catch (e) { return false; } }) || 單[0];
  項.setIcon(名);
  if (轉) { try { 項.iconEl.style.transform = "rotate(" + 轉 + "deg)"; } catch (e) {} }
  return 項;
}

function 圖鈕(鈕, 名, 文, 大小) {
  鈕.empty();
  鈕.style.display = "inline-flex";
  鈕.style.alignItems = "center";
  鈕.style.justifyContent = "center";
  鈕.style.gap = "4px";
  圖(鈕, 名, 大小 || 13);
  /* 字另外包一層並掛上 class —— 窄螢幕的工具列要把字收掉只留圖示,
     靠的就是這個(見 styles.css 的 .tk-工具群)。title 還在,長按仍看得到名稱。 */
  if (文) 鈕.createSpan({ text: 文, cls: "cjb-鈕字" });
  return 鈕;
}
/* 畫一顆圖示。回傳那個 span,呼叫端可以再改大小/顏色。 */
/* 1.5.1:依序試幾個圖示名,第一個畫得出來的就用。Lucide 改過不少名字
   (send-horizonal → send-horizontal、check-circle → circle-check、pen-square → square-pen…),
   Obsidian 內建的版本新舊不一,只給一個名字可能畫出一個空格。 */
function 圖備(容器, 名們, 大小, 色) {
  const 單 = Array.isArray(名們) ? 名們 : [名們];
  for (let i = 0; i < 單.length; i++) {
    const sp = 圖(容器, 單[i], 大小, 色);
    if (sp && sp.querySelector("svg")) return sp;
    try { if (sp) sp.remove(); } catch (e) {}
  }
  return null;
}
function 圖(容器, 名, 大小, 色) {
  const sp = 容器.createSpan();
  sp.addClass("cjb-ico");
  try { setIcon(sp, 名); } catch (e) {}
  const 有 = sp.querySelector("svg");
  if (!有) {
    // Obsidian 沒有這顆 → 用備胎(一樣是 24 格、一樣的線寬,看起來才是同一套)
    const d = 備胎圖[名];
    /* ⚠ 這裡以前是 sp.innerHTML = "<svg …>"。**不可以再寫回去**:
       Obsidian 社群外掛的審核會直接擋掉任何 innerHTML 指派(不管字串是不是自己寫死的)。
       DOMParser 解出來的是一份不會執行任何東西的獨立文件,把節點搬過來就好。 */
    if (d) {
      try {
        const 文件 = new DOMParser().parseFromString(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ' +
          'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" ' +
          'stroke-linejoin="round" class="svg-icon">' + d + '</svg>', "image/svg+xml");
        const 根 = 文件 && 文件.documentElement;
        if (根 && 根.nodeName.toLowerCase() === "svg") sp.appendChild(document.importNode(根, true));
      } catch (e) {}
    }
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
/* ---- 送出鍵(1.4.7,設定 → 送出鍵)----
   新增卡片、編輯內容、寫留言、改留言**全部同一套**,不用記好幾種:
     組合(預設):Enter 換行 ‧ Shift+Enter 送出 ‧ Ctrl+Enter / ⌘+Enter 送出
     Enter      :Enter 送出 ‧ Shift+Enter 換行 ‧ Ctrl+Enter / ⌘+Enter 一樣送出
   ⚠ 1.4.6 以前留言是反過來的(Enter 送出),新增和編輯才是 Shift+Enter —— 同一個看板裡兩套規則。
   ⚠ 輸入法選字中(isComposing / keyCode 229)的 Enter 一律不算,那是在選字。
     Ctrl / ⌘ 組合鍵不是在選字,照樣放行。 */
let 送出用Enter = false;
/* 送出鈕底下那一行提示。⚠ 要短:桌機那一欄只有 169px,
   「Shift + Enter 或 ⌘/Ctrl + Enter 送出」量出來 175px 會被切掉。
   M 換成這台電腦的修飾鍵(Mac 是 ⌘,其他是 Ctrl),不必兩個都寫。 */
function 送出提示字(T) {
  return 送出用Enter ? T.submitHintEnter : String(T.submitHint).replace("M", 是Mac() ? "⌘" : "Ctrl");
}
function 是送出(e) {
  if (!是Enter鍵(e)) return false;
  if (e.ctrlKey || e.metaKey) return true;
  if (e.isComposing || e.keyCode === 229) return false;
  return 送出用Enter ? !e.shiftKey : !!e.shiftKey;
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
/* 1.6.1 所見即所得(統一原則第 10 條):卡片閱讀時的一行 = 即時預覽編輯器裡的那一行。
   ⚠ 不是自己畫一顆「•」:編輯器的項目符號是 Obsidian 的 `.list-bullet`(一個 CSS 圓點,掛在「-」字的位置上),
     字元「•」的高度跟它不一樣,使用者看到閱讀時的點比編輯時低一點。所以這裡用**同樣的 class、同樣的結構**,
     間距照編輯器量出來的值寫在 styles.css 的 .tk-預覽行(字級 0.94em、行高、清單行上下 list-spacing、
     符號前 0.75em、懸掛縮排)。改編輯器那邊的字級或邊距時,兩邊一起改。
   記 = 這一行原本的符號(`- `、`1. `,沒有就是 "");t = 剝掉符號的內文;勾了(是否) = 點待辦時要做的事 */
function 畫預覽行(行, t, 記, 勾了, app, 來源檔, T) {
  行.addClass("tk-預覽行");
  const 勾 = 內勾Re.exec(t);
  if (勾) {
    行.addClass("tk-預覽-待辦");
    const 標 = 行.createEl("label");
    標.addClass("task-list-label");
    const box = 標.createEl("input", { type: "checkbox" });
    box.addClass("task-list-item-checkbox");
    box.addClass("tk-內勾");
    box.checked = 勾[1] !== " ";
    box.onclick = (e) => { e.stopPropagation(); 勾了(box.checked); };
    畫文字(行, t.slice(勾[0].length), app, 來源檔);
    return;
  }
  if (記) {
    const 號 = /\d/.test(記);
    行.addClass(號 ? "tk-預覽-編號" : "tk-預覽-清單");
    const 座 = 行.createSpan();
    座.addClass("tk-預覽符");
    if (號) {
      座.createSpan({ text: 記.trim() + " " }).addClass("list-number");
    } else {
      座.createSpan({ text: "-" }).addClass("list-bullet");
      座.appendText(" ");
    }
  }
  // [[筆記]] 畫成真的可以點的連結,http(s) 也是
  畫文字(行, 顯示內文(t, T), app, 來源檔);
}
// 主題膠囊:淡淡的分類底色 + 分類色的字(常用主題那排鈕也是同一個樣子)
function 清掉落點線() {
  try {
    document.querySelectorAll(".tk-board .tk-列").forEach(x => { x.style.boxShadow = ""; });
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
function 月末的(日) {
  return 日字(new Date(Number(String(日).slice(0, 4)), Number(String(日).slice(5, 7)), 0));
}
/* 1.6 時間篩選:層(年 / 月 / 週 / 日)⇄ 篩選的型。型的名字沿用舊的(7天內 = 週),設定和顏色表都認這幾個字 */
const 層鍵 = { 年: "年度", 月: "本月", 週: "7天內", 日: "今日" };
const 型層 = { 年度: "年", 本月: "月", "7天內": "週", 今日: "日" };
/* 格子上的字(1.6):月「10月 / Oct」‧ 週「10/12–18」「9/28–10/4」‧ 日「10/15」 */
function 格標字(層, r, T) {
  if (層 === "月") return (T.月名 || [])[Number(String(r.起).slice(5, 7)) - 1] || "";
  if (層 === "週") return 區間短字("7天內", r, T);
  return 短日(r.起);
}
// 標題列的月份:今年只寫月(10月),別的年份帶年(2027年10月 / Oct 2027)
function 月年字(日, T) {
  const 月 = (T.月名 || [])[Number(String(日).slice(5, 7)) - 1] || "";
  if (今年嗎(日)) return 月;
  return String(T.月年 || "M Y").replace("M", 月).replace("Y", String(日).slice(0, 4));
}
/* 一週從哪天開始(1.4.7,設定 → 一週從哪天開始):1 = 週一(預設),0 = 週日。
   「本周」的範圍和行事曆的第一欄都看它。 */
let 週起日 = 1;
function 週首的(基) {
  const d = new Date(基 + "T00:00:00"); d.setDate(d.getDate() - ((d.getDay() - 週起日 + 7) % 7)); return 日字(d);
}
/* 本周/本月那一格的標籤(1.4.7):短到放得下,後半段不會被省略號吃掉。
     本月 → 「10月」「Oct」
     本周 → 「9/14–9/20」「9/28–10/4」(1.6 起同一個月也寫兩次月份)
   1.4.6 以前一律「9/28–10/4」這種寫法,「10/26–11/1」在格子裡會被切掉後半。 */
function 區間短字(鍵, r, T) {
  if (!r || !r.起) return "";
  if (r.起 === r.迄) return 短日(r.起);
  const a = String(r.起).split("-"), b = String(r.迄).split("-");
  if (鍵 === "本月") return (T.月名 || [])[Number(a[1]) - 1] || (Number(a[1]) + "");
  // 1.6(使用者):同一個月也要寫第二個月份 —— 「9/14–20」的 20 看起來像另一個數字,「9/14–9/20」一眼就是日期
  return 短日(r.起) + "–" + 短日(r.迄);
}
class 看板視圖 extends TextFileView {
  constructor(leaf, 插件) {
    super(leaf);
    this.插件 = 插件;
    this.T = 語();
    this.內文 = "";
    this.hoverPopover = null;       // 1.6.2(B4):卡片裡連結的頁面預覽要一個 HoverParent
    const d = new Date(), 今 = 日字(d);
    this.狀態 = {
      // 型: 今日/7天內/本月/年度/範圍(行事曆)/全部/逾期/週期。設定裡的「本週」就是 7天內
      篩: { 型: ({ 本週: "7天內" })[插件.設定.預設範圍] || 插件.設定.預設範圍 || "今日" },
      起: null, 迄: null,
      /* 1.6:年 / 月 / 週 / 日四格不再各自記「走了幾格」,全部由**同一個游標日期**推出來(見 移游標)。
         統計年 永遠等於游標的年份,由 設游標() 一起改。 */
      游標: 今,
      統計年: String(d.getFullYear()),
      開行事曆: false, 顯示月: 日字(d).slice(0, 7),
      選起: null, 選迄: null,
      指派: null, 主題: null, 搜尋: "",
      編修: null, 寫留言: null, 改留: null,
      設定模式: false,                // 1.6:新增卡片那一塊切成「分類與指派人」設定(見 畫設定面板)
      展開: {}, 展開全部: false, 留言展開: {},
      融合中: false, 融合選: {},
      新主題: "", 新內容: "", 新分類: null, 新指派: null
    };
    this.今 = 今;
  }
  getViewType() { return 視圖種類; }
  getIcon() { return 圖示名; }
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
    /* ⚠ 1.6.3:時窗過了、但回來的正是自己剛寫的那一份(寫手排隊比較久時會這樣)—— 照樣不重畫。
       以前這裡會整份重畫、把編修框砍掉重建:Ctrl+Z 的紀錄沒了、游標跳走(editor-test 5 次失敗 1 次抓到的)。
       別台裝置同步來的變更內容不一樣,照樣會重畫。 */
    const 寫出 = this.插件.寫手.最後寫出;
    if (this.狀態.編修 && this.file && 寫出 && 寫出[this.file.path] === this.內文) return;
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
    /* 視窗跨過窄螢幕門檻(手機轉向、桌機把視窗拉窄)就整份重畫 ——
       窄和寬是兩種 DOM 結構,不是同一份 DOM 換 CSS。 */
    try {
      const mq = window.matchMedia(窄門檻);
      const 變 = () => { if (this.區 && this.該密() !== this.密) this.畫(); };
      mq.addEventListener("change", 變);
      this.register(() => mq.removeEventListener("change", 變));
    } catch (e) {}
    /* 分頁本身變寬變窄(拖側邊欄、分割畫面)時:
         ① 跨過 窄分頁寬 → 整份重畫(窄版和桌機版是兩種 DOM)
         ② 沒跨過、還是桌機版 → 只重畫上面那條統計列,「未完成/已完成/含封存」擠不擠得下要重新量
       寬度差不到 8px 不理它。 */
    try {
      let 上寬 = 0;
      const 觀 = new ResizeObserver(() => {
        this.排對齊線();                  // 看板變寬變窄,置中的日期線會移到半個像素上,重新對齊
        const w = Math.round(this.contentEl.clientWidth);
        if (!this.區 || !w) return;
        if (this.該密() !== this.密) {
          上寬 = w;
          window.requestAnimationFrame(() => { try { this.畫(); } catch (x) {} });
          return;
        }
        if (this.密 || Math.abs(w - 上寬) < 8) return;
        上寬 = w;
        window.requestAnimationFrame(() => { try { this.畫導覽列(this.區.導覽, this.卡片); } catch (x) {} });
      });
      觀.observe(this.contentEl);
      this.register(() => 觀.disconnect());
    } catch (e) {}
    /* 編輯到一半去點別的地方 = 這一段寫完了。
       ⚠ 用 mousedown 不是 click:click 要等放開,中間畫面已經重畫過一輪了。
       ⚠ 要排除編修框自己、動作鈕、還有浮在 body 上的面板(日期、循環、色盤)——
         點那些是「還在編輯的一部分」,不是離開。 */
    this.registerDomEvent(document, "mousedown", (e) => {
      if (!this.狀態.編修 || !this.編修卡) return;
      const t = e.target;
      if (!t || !t.closest) return;
      /* ⚠ 1.4.6 修:主題輸入框(.tk-題編)也是「還在編輯的一部分」。
         漏掉它的時候,一點主題框就被當成「點外面」,編修當場結束 —— 主題永遠改不了。 */
      if (t.closest(".tk-編框") || t.closest(".tk-動作") || t.closest(".tk-題編")) return;
      // 1.6.1:即時預覽編輯器會用到 Obsidian 自己的建議清單、手機工具列、連結預覽、對話框
      if (t.closest(".tk-分類挑,.tk-分類設定,.menu,.suggestion-container,.mobile-toolbar,.modal-container,.popover,.hover-popover")) return;
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
  async onClose() {
    // 1.6.1:關掉分頁前把編輯中的字寫掉,並卸掉即時預覽編輯器
    try { await this.收掉編修(); } catch (e) {}
    this.清即時(true);
    this.卸渲染件();
    this.contentEl.empty();
  }

  get 名單() { return this.插件.設定.指派人 || []; }
  get 個人() { return !!this.插件.設定.個人模式; }
  get 用留言() { return this.插件.設定.使用留言 !== false; }
  get 顯示編時() { return this.插件.設定.顯示編輯時間 !== false; }
  // 1.5:這一份筆記釘選的常用主題(每份筆記各自一組,存在 設定.釘選主題[路徑])
  get 釘選主題們() {
    const m = this.插件.設定.釘選主題, p = this.file ? this.file.path : "";
    return (p && m && !Array.isArray(m) && Array.isArray(m[p])) ? m[p] : [];
  }
  /* ---- 1.6 時間游標 ----
     年 / 月 / 週 / 日四格看的是同一個日期 s.游標:
       年 = 游標那一年 ‧ 月 = 游標那個月 ‧ 週 = 游標所在的那一週 ‧ 日 = 游標那一天
     任何一格的箭頭動了,其他三格自然跟著變。移動的規則(移游標):
       換年 → 那一年 1/1 ‧ 換月 → 那個月 1 號 ‧ 換週 → 下一週 / 上一週的第一天 ‧ 換日 → 前後一天
     例:在 9/15 想看 10/15 → 月 ▶(10/1)→ 週 ▶▶(10/12–18)→ 日 ▶▶▶(10/15)。
     ⚠ 週照星期切,**可以跨月**:游標 10/1 的那一週是 9/28–10/4。 */
  週區間(日) {
    const 模 = this.插件.設定.週模式;
    if (模 === "月初") {
      // 每月 1 號起每七天一段:1–7、8–14、15–21、22–28、29–月底
      const 起 = 加日(日.slice(0, 8) + "01", Math.floor((Number(日.slice(8, 10)) - 1) / 7) * 7);
      const 末 = 月末的(日), 七 = 加日(起, 6);
      return { 起: 起, 迄: 七 < 末 ? 七 : 末 };
    }
    // 今天起七天是例外:只有游標落在「今天 ~ 今天+6」裡才這樣算,往前往後翻還是照星期
    if (模 === "七天" && 日 >= this.今 && 日 <= 加日(this.今, 6)) return { 起: this.今, 迄: 加日(this.今, 6) };
    const 起 = 週首的(日);
    return { 起: 起, 迄: 加日(起, 6) };
  }
  層區間(層, 日) {
    日 = 日 || this.狀態.游標 || this.今;
    if (層 === "日") return { 起: 日, 迄: 日 };
    if (層 === "週") return this.週區間(日);
    if (層 === "月") return { 起: 日.slice(0, 8) + "01", 迄: 月末的(日) };
    return { 起: 日.slice(0, 4) + "-01-01", 迄: 日.slice(0, 4) + "-12-31" };
  }
  設游標(日) {
    const s = this.狀態;
    s.游標 = 日;
    s.統計年 = 日.slice(0, 4);
    if (s.開行事曆) s.顯示月 = 日.slice(0, 7);     // 行事曆開著的話,翻到游標那個月
  }
  移游標(層, 步) {
    const 日 = this.狀態.游標 || this.今;
    let 新;
    if (層 === "年") {
      const y = Number(日.slice(0, 4)) + 步;
      if (!(y > 1900 && y < 2200)) return;
      新 = y + "-01-01";
    } else if (層 === "月") {
      新 = 日字(new Date(Number(日.slice(0, 4)), Number(日.slice(5, 7)) - 1 + 步, 1));
    } else if (層 === "週") {
      const r = this.週區間(日);
      if (步 > 0) {
        const 下 = 加日(r.迄, 1), r2 = this.週區間(下);
        新 = r2.起 > r.迄 ? r2.起 : 下;       // 今天起七天那一段跟下一個週曆週重疊時,不要走回頭
      } else 新 = this.週區間(加日(r.起, -1)).起;
    } else 新 = 加日(日, 步);
    this.設游標(新);
    this.狀態.篩 = { 型: 層鍵[層] };
    this.畫();
  }
  // 設為今日、新增卡片之後跳轉、標題列的「今日」都走這裡
  回到今天(型) {
    this.設游標(this.今);
    this.狀態.篩 = { 型: 型 || "今日" };
  }
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
    if (f.型 === "範圍") return s.起 ? [s.起, s.迄 || s.起] : null;     // 1.6 起只有行事曆會選出「範圍」
    const 層 = 型層[f.型];
    if (!層) return null;
    const r = this.層區間(層);
    return [r.起, r.迄];
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
  /* 1.6.2(U3)搜尋框打 #分類名 = 只看那一區(使用者要的,不多一顆按鈕,原則 7)。
     名字有空白的分類也認得(長的名字先比);跟內容裡的 #標籤撞名時以分類為準。回傳 { 區: 分類名或 null, 剩: 拿掉那一段之後的字 } */
  /* 1.6.3(ADR 1.6.3-01)取代 1.6.2 的「#分類名」:搜尋打 #主題 = 只看有那個主題的卡片、@名字 = 只看指派給他的;
     分類改用篩選選。回傳 { 題: [主題字…], 人: 名字或 null, 剩: 拿掉之後的字 } */
  拆分類詞(字) {
    const s = String(字 || "");
    if (!/[#@]/.test(s)) return { 題: [], 人: null, 剩: s };
    const 題 = [];
    let 人 = null;
    const 剩 = s.replace(/(^|\s)([#@])([^\s#@]+)/g, (全, 前, 符, 字) => {
      if (符 === "#") { const n = 題正(字); if (n) 題.push(n.toLowerCase()); }
      else 人 = 人正(字).toLowerCase();
      return 前;
    }).trim();
    return { 題: 題, 人: 人, 剩: 剩 };
  }
  搜尋分數(k) {
    const s = this.狀態;
    // 1.6.2(U3):#分類名 先拿出來(每一輪篩選只算一次,見 基底)
    const 拆 = this.__搜拆 || (this.__搜拆 = { 題: this.拆分類詞(s.新主題), 文: this.拆分類詞(s.新內容) });
    const 限題 = 拆.題.題.concat(拆.文.題), 限人 = 拆.題.人 || 拆.文.人;
    const 有限 = 限題.length || !!限人;
    if (限題.length) {
      const 我題 = (k.主題們 || []).map(x => x.toLowerCase());
      if (!限題.every(w => 我題.some(x => x.indexOf(w) === 0))) return -1;   // 打一半的主題也算(#使用 → #使用者體驗)
    }
    if (限人 && 人正(k.指派 || "").toLowerCase().indexOf(限人) !== 0) return -1;
    const 題詞 = this.拆詞(拆.題.剩), 文詞 = this.拆詞(拆.文.剩);
    if (!題詞.length && !文詞.length) return 有限 ? 1 : 0;
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
    this.__搜拆 = null;
    return 全.filter(k => {
      if (s.指派 && k.指派 !== s.指派) return false;
      if (s.搜尋) { k.__分 = this.搜尋分數(k); if (k.__分 < 0) return false; }
      else k.__分 = 0;
      return true;
    });
  }
  /* 「顯示」三開關:封存要不要算、做完的要不要算。跟原版的 合顯示 同一套 ——
     清單、統計數字、行事曆的點都走這個,兩邊才不會對不上。 */
  /* 1.6.3(mockup v7)未完成 / 已完成**二選一**(使用者:不可複選);封存的卡片只在「封存區」看。
     剛打勾的那張 2 秒內還留在畫面上(色條是 ↺ 反悔),不然一打勾就不見、反悔鈕也跟著不見。 */
  /* 1.6.3(mockup v12 Q26,使用者:「要做跟現在一樣左右切分,左邊是分類、右邊是封存區」)
     封存區不再是自己一塊,而是**分類設定面板的右半邊**。所以「正在看封存區」=
     面板開著、而且右邊選了某一區。 */
  get 看封存區() { return !!(this.狀態.設定模式 && this.狀態.封存看); }
  合顯示(k) {
    const 設 = this.插件.設定.排程顯示 || {};
    /* 1.6.3:正在看封存區(或設定面板上按了 🗄 的**預覽**)—— 清單只剩那一區的卡片。
       預覽的 封存看 是還沒封存的分類名(例「紅色」),所以這裡比的是分類、不再先問 是封存()
       (使用者 09-20:「分類區設定 按封存 會顯示一個預覽 跳到右邊分類封存區」)。 */
    if (this.看封存區) return k.分類 === this.狀態.封存看 && this.封存搜合(k);
    if (this.是封存(k)) return false;             // 平常的清單不放封存的卡片(要看就進封存區)
    const 剛 = this.剛動過 && this.剛動過[k.鍵];
    if (剛 && Date.now() - 剛.時 < 反悔毫秒) return true;
    // CR-1.6.3-01:未完成 / 已完成是各自獨立的複選,不再二選一 —— 兩個都開就都顯示
    return k.完成 ? !!設.完成 : !!設.未完成;
  }
  // 有寫日期(或是 🔁 循環卡)的才進得了主清單;兩者都沒有的走底下那張「未寫日期」表(1.5 起長期不算)
  合日期(k) { return !!k.起日 || !!k.循環; }
  清單池(全) { return this.基底(全).filter(k => this.合顯示(k) && this.合日期(k)); }
  活的(全) { return this.清單池(全); }
  過濾(全) {
    const s = this.狀態, f = s.篩 || {};
    const 區 = this.現在區間();
    return this.清單池(全).filter(k => {
      if (this.看封存區) return true;             // 1.6.3:封存區不看日期篩選(整區都列出來)
      // ⚠ 置頂 = 「我要一直看到它」,所以不受日期篩選影響,永遠在清單裡、永遠在最上面。
      //   (搜尋和指派人篩選還是會作用 —— 那是你主動在找東西。)
      if (k.置頂 && f.型 !== "週期") return true;
      if (f.型 === "全部") return true;
      if (f.型 === "逾期") return this.是逾期(k);
      if (f.型 === "週期") return !!k.循環;
      if (!區) return true;
      if (!k.起日) return false;
      return !(k.迄日 < 區[0] || k.起日 > 區[1]);
    }).sort((a, b) => this.比大小(a, b));
  }
  /* 排序:置頂永遠在最上面,做完的沉到最下面,剩下的照選的模式。
       編修(預設)= 最近新增或編修的排最上面。時間取自卡片最後一行的 `[ed:: …]`(舊的 `✎{}` / `Ed{}`),
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
      const t = String(b.編修戳 || "").localeCompare(String(a.編修戳 || ""));
      if (t) return t;
      return String(a.起日 || "9999").localeCompare(String(b.起日 || "9999"));
    }
    const d = String(a.起日 || "9999").localeCompare(String(b.起日 || "9999"));
    if (d) return d;
    const c = this.插件.分類序序號(a.分類) - this.插件.分類序序號(b.分類);
    if (c) return c;
    return String(b.編修戳 || "").localeCompare(String(a.編修戳 || ""));
  }

  區間張數(全, a, b) {
    return this.清單池(全).filter(k => k.起日 && !(k.迄日 < a || k.起日 > b)).length;
  }
  // 底下那張「未寫日期」表:沒有日期、也不是 🔁 循環卡的卡片
  未寫日期(全) {
    return this.基底(全).filter(k => !k.起日 && !k.循環 && this.合顯示(k));
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
      新增: 根.createDiv(),
      清單: 根.createDiv(),
      未定: 根.createDiv(),
      版本: 根.createDiv()
    };
    this.區.衝突.addClass("tk-空隱");
    this.區.未定.addClass("tk-空隱");
    /* 1.5.1:時間篩選 → (行事曆)→ 新增卡片 這兩三塊是同一組控制區,彼此只隔 4px;
       底下的卡片表之間維持 styles.css 的 8px。 */
    this.區.導覽.style.marginBottom = "4px";
  }

  畫() {
    if (!this.區 || !this.contentEl.contains(this.區.清單)) this.建殼();
    this.定窄();
    /* 1.6.2(B5):換了篩選或游標日期 = 換一批卡片看,展開過的卡片回到收合。
       (存檔後保持展開,見 完成編輯;要在這裡才收,使用者 1.6.1 開發日誌寫的。) */
    const 篩印 = JSON.stringify([this.狀態.篩, this.狀態.游標]);
    if (this.上次篩印 !== undefined && this.上次篩印 !== 篩印) { this.狀態.展開 = {}; this.狀態.留言展開 = {}; }
    this.上次篩印 = 篩印;
    const 捲 = this.contentEl.scrollTop;
    this.卸渲染件();                   // 1.6.2(B4):上一輪 Markdown 渲染的子元件
    const 全 = this.卡片;
    // 顏色照檔案裡標題的先後,不是照畫到的順序
    this.插件.設分類順序(this.分類清單.filter(x => !/archive|封存/i.test(x)));
    this.畫衝突提示(this.區.衝突);
    this.畫導覽列(this.區.導覽, 全);
    this.畫新增區(this.區.新增, 全);
    this.畫清單(this.區.清單, 全);
    this.畫未定區(this.區.未定, 全);
    this.畫版本列(this.區.版本);
    /* 1.6.4(B1):要看的卡 還在,表示還沒捲過去(寫檔的回音重畫插進來、或這一輪本來就該捲)——
       重捲一次,不要拿這一輪開頭存的 scrollTop 蓋過去(那個值跟這張新卡片的位置無關)。 */
    if (this.要看的卡) this.捲到卡(this.要看的卡);
    else this.contentEl.scrollTop = 捲;
    this.清即時();
  }

  /* 打字搜尋專用:只重畫清單,新增區那兩個輸入框完全不碰 */
  /* 這一輪用哪一種版面。畫() 開頭問一次,之後這一輪所有的畫法都看 this.窄 ——
     不要在各個畫法裡各自再去問 matchMedia,那樣同一輪裡可能問到兩種答案。 */
  /* 這一個看板該不該用窄版(1.4.7):視窗窄(手機)**或者分頁本身窄**。
     ⚠ 以前只看視窗。桌機把側邊欄打開、或分割成兩欄時,視窗還是 1000 多 px,
       看板分頁卻只剩 400 多 —— 桌機的表格塞進去,最上面的期間格比分頁還寬,
       本周/本月被裁掉一半,統計列被擠成三排。分頁窄到放不下桌機版面,就直接用卡片版面。
     ⚠ clientWidth 是 0(分頁還沒顯示)的時候不算,不然每個背景分頁都會被當成窄版。 */
  /* ⚠⚠ 1.6.3(B1,使用者:只留一種版面,用手機版來改):卡片**永遠**是卡片版面(div 卡片),this.窄 永遠是 true。
     以前的「窄不窄」只剩一個用途 —— 時間篩選那一條要不要擠成一排(this.密,見 該密)。
     手機才有的行為(底部留空、按編輯不自動聚焦)看 this.觸(是不是手機),不看寬度。 */
  該窄() { return true; }
  /* 時間篩選要不要用擠的排法(1.4.7 的判斷搬過來):視窗窄(手機)**或者分頁本身窄**。
     ⚠ clientWidth 是 0(分頁還沒顯示)的時候不算,不然每個背景分頁都會被當成窄版。 */
  該密() {
    const w = this.contentEl ? this.contentEl.clientWidth : 0;
    return 是窄螢幕() || (w > 0 && w < 窄分頁寬);
  }
  定窄() {
    this.窄 = this.該窄();
    this.密 = this.該密();
    this.觸 = !!(this.app && this.app.isMobile);
    const 根 = this.contentEl;
    根.toggleClass("tk-窄", this.窄);
    根.toggleClass("tk-密", this.密);
    根.toggleClass("tk-觸", this.觸);
    根.toggleClass("tk-滑亮", !!this.插件.設定.滑過高亮);     // 1.6.3 C20
    /* ⚠ 手機底部多留 84px:手機版 Obsidian 的底部導覽列是浮在畫面上的,
       不留的話最後一張卡片永遠被它蓋住、捲也捲不出來。 */
    根.style.padding = this.觸 ? "8px 8px 84px" : (this.密 ? "8px 8px 24px" : "10px 14px 24px");
    /* 版面寬度(1.4.5):窄版 = 跟 Obsidian 的可讀行寬一樣,整份看板收在中間。
       只管桌機 —— 手機本來就用滿整個畫面。寬度本身在 styles.css 的 .tk-定寬。 */
    根.toggleClass("tk-定寬", !this.觸 && !this.密 && this.插件.設定.版面寬度 !== "寬");
  }

  重畫清單() {
    if (!this.區) { this.畫(); return; }
    if (this.該密() !== this.密) { this.畫(); return; }   // 時間篩選的排法換了,整份重畫
    const 捲 = this.contentEl.scrollTop;
    this.卸渲染件();                   // 1.6.2(B4):上一輪 Markdown 渲染的子元件
    const 全 = this.卡片;
    this.插件.設分類順序(this.分類清單.filter(x => !/archive|封存/i.test(x)));
    /* ⚠ 1.6.3(A5)先清掉清單、先畫導覽列,再畫清單。導覽列最後的 縮到放得下() 要量字寬,
       量的時候頁面上如果已經有 200 多張卡片,每量一次瀏覽器就重排整份 —— 實測 218 張的筆記光這一段 1171ms
       (打字搜尋每個字都卡一秒多)。頁面還小的時候量,幾毫秒就好。 */
    this.區.清單.empty(); if (this.區.未定) this.區.未定.empty();
    this.畫導覽列(this.區.導覽, 全);      // 數字要跟著搜尋走,不然對不上
    this.畫清單(this.區.清單, 全);
    this.畫未定區(this.區.未定, 全);
    this.contentEl.scrollTop = 捲;
    this.清即時();
  }
  重畫() { this.畫(); }

  /* 1.6.1 即時預覽編輯器的生命週期:每一個都記在這裡;重畫完把已經不在畫面上的卸掉,關分頁時全部卸掉。 */
  即時編(容器, 值, 選) {
    const 編 = this.插件.建即時編輯(this, 容器, 值, 選);
    if (編) (this.__即時們 = this.__即時們 || new Set()).add(編);
    return 編;
  }
  清即時(全部) {
    if (!this.__即時們) return;
    for (const 編 of Array.from(this.__即時們)) {
      if (全部 || !編.isConnected) { try { 編.卸(); } catch (e) {} this.__即時們.delete(編); }
    }
  }

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
       1.5:[ (全部) 年 + 本周/本月 + 本日 ]  [ 已逾期 / 週期 ]  …靠右… [ 顯示 ]
     「顯示」是開關不是篩選,所以靠右分家、左邊那條也不用重點色。 */
  /* 可以收合的控制塊(1.4.9):篩選列和新增卡片共用同一種標題列,長相才會一致。
     收合狀態記在這台裝置(讀收合 / 存收合)。收起來的時候標題旁邊放一行小字摘要。
     ⚠ 1.4.8 層級:控制區整塊是 background-secondary,底下的卡片表本體是 background-primary ——
       控制區才有重心,不會跟卡片表糊成一片淺色。塊裡面的欄框一律透明,不再加第三層。 */
  畫收合塊(根, 標題, 收, 摘要, 切收, 圖示) {
    const T = this.T;
    const 塊 = 根.createDiv();
    塊.addClass("tk-塊");
    st(塊, "border-radius:9px;border:1px solid var(--background-modifier-border);" +
      "background:var(--background-secondary);box-shadow:0 1px 3px rgba(0,0,0,0.16);");
    const 標頭 = 塊.createDiv();
    標頭.setAttribute("role", "button");
    標頭.setAttribute("tabindex", "0");
    // 1.5.1:標題列上下 6 → 4px,只放圖示之後不需要那麼高
    /* ⚠ 1.5.1:所有塊的標題列**固定 26px 高,手機和桌機一樣**,不再由裡面的東西撐:
       只有圖示、有「⋯」、有「1 張」字、手機的工具鈕 —— 以前量到 23.5 / 24.5 / 25.6 / 30.5 各不一樣。 */
    st(標頭, "display:flex;align-items:center;gap:8px;height:26px;box-sizing:border-box;padding:0 10px;cursor:pointer;user-select:none;min-width:0;" +
      "background:var(--background-secondary);" +
      (收 ? "" : "border-bottom:1px solid var(--background-modifier-border);"));
    圖(標頭, 收 ? "chevron-right" : "chevron-down", 15, "var(--text-muted)");
    /* 1.5.1:控制區的標題列只放圖示(篩選 = filter、新增卡片 = square-plus),字留在 title / aria-label。
       三個塊的標題都是字的時候,一眼掃過去要讀三次;圖示看形狀就認得。 */
    if (圖示) {
      const 圖框 = 標頭.createDiv();
      st(圖框, "display:inline-flex;align-items:center;line-height:0;color:var(--text-normal);");
      // 16 太搶眼,跟旁邊 15px 的收合箭頭差不多大就好;一個名字都畫不出來就退回方塊,標題列不會空一格
      圖備(圖框, [].concat(圖示, "square"), 14);
      標頭.setAttribute("aria-label", 標題);
    } else st(標頭.createDiv({ text: 標題 }),
      "font-size:0.82em;font-weight:700;color:var(--text-normal);white-space:nowrap;" + 標頭補正);
    if (收 && 摘要) st(標頭.createDiv({ text: 摘要 }), 標頭字樣 + "color:var(--text-faint);");
    標頭.title = 標題 + " · " + (收 ? T.unfold : T.fold);
    標頭.onclick = 切收;
    標頭.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); 切收(); } };
    return 塊;
  }

  /* 1.6:所有塊的標題列收合 / 展開都滑動(時間篩選、新增卡片、置頂表、清單表)。
       收 → 本體先淡出、整塊高度滑到只剩標題列,滑完才真的重畫(收合狀態也在那時候才存)
       展 → 先重畫,新的塊從「只有標題列」的高度滑開,本體淡入
     找新塊:重畫之後塊是新的 DOM,由呼叫的人告訴我去哪裡找。
     ⚠ 動畫中再按一次不理它,不然舊的塊還在滑、狀態已經被翻兩次。系統要求減少動態就直接重畫。 */
  收合滑動(塊, 收, 重畫, 找新塊) {
    // U49:鎖掛在這一塊自己身上,不是整個看板 —— 不然 A 塊收合動畫還沒完,B 塊的收合鈕會被一起擋住
    if (塊 && 塊.__收合中) return;
    const 頭 = 塊 && 塊.firstElementChild;
    if (!要動畫() || !塊 || !塊.isConnected || !頭) { 重畫(); return; }
    const 頭高 = 頭.offsetHeight;
    if (收) {
      const 高 = 塊.clientHeight;
      if (高 - 頭高 < 10) { 重畫(); return; }
      const 秒 = Math.min(0.3, 0.16 + (高 - 頭高) / 1600);
      塊.__收合中 = true;
      塊.style.transition = "";
      塊.style.height = 高 + "px";
      void 塊.offsetHeight;
      塊.style.transition = "height " + 秒.toFixed(3) + "s cubic-bezier(.4,0,.2,1)";
      塊.style.height = 頭高 + "px";
      [...塊.children].slice(1).forEach(c => { c.style.transition = "opacity .14s ease"; c.style.opacity = "0"; });
      setTimeout(() => { 塊.__收合中 = false; 重畫(); }, 秒 * 1000 + 20);
      return;
    }
    重畫();
    const 新 = 找新塊 ? 找新塊() : null;
    if (!新) return;
    滑開(新, 頭高);
    [...新.children].slice(1).forEach(c => {
      if (typeof c.animate === "function") c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" });
    });
  }

  /* ⚠⚠ 1.6.3(mockup v7)時間篩選整塊重畫:
       標題列  [⌄ 收合(溝)] 今日 09-19(六) ················ [⋯]
                ⋯ 按下去往左彈出:全部 · (未完成 | 已完成)二選一 · 封存區 · 📅行事曆
       格子    [‹ 年 ›] [‹ 月 › / ‹ 週 ›] [‹ 日 ›] [逾期] [週期] —— 四格一樣寬(104px),逾期 / 週期 52px
     ・所有張數在同一條橫線(每一格上面 25px 那一排,等於「9 月」那一排);年份、日期、逾期 / 週期的圖示在格子裡置中。
     ・月、週不寫張數;格子不上色(選到的那一格亮一點),只有逾期紅、週期紫。
     ・週的標籤永遠是 M/D – M/D;週跨年時年格寫「26–27」。
     ・只有 ⌄ 會收合;標題列其他地方點了回到今天(C9)。
     長相在 styles.css 的 .tk-篩…;規則見技能 card-table-ui-rules。 */
  畫導覽列(根, 全) {
    const T = this.T, s = this.狀態;
    根.empty();
    const 收 = 讀收合(篩選收合鍵);
    const 塊 = 根.createDiv();
    塊.addClass("tk-塊"); 塊.addClass("tk-篩塊");
    const 頭 = 塊.createDiv();
    頭.addClass("tk-塊頭");
    if (!收) 頭.addClass("tk-有身");
    const 切收 = () => this.收合滑動(塊, !收, () => { 存收合(篩選收合鍵, !收); this.畫(); }, () => this.區.導覽.firstElementChild);
    const 溝 = 頭.createDiv();
    溝.addClass("tk-溝");
    溝.setAttribute("role", "button"); 溝.setAttribute("tabindex", "0");
    溝.setAttribute("aria-label", T.filterBlock + " · " + (收 ? T.unfold : T.fold));
    圖(溝, 收 ? "chevron-right" : "chevron-down", 14);      // 溝 3–18:圖示填滿整條溝(mockup v9 Q19)
    溝.onclick = (e) => { e.stopPropagation(); 切收(); };
    溝.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); 切收(); } };
    // 漏斗圖示拿掉了(使用者 2026-09-19:只留 ⌄ 📅今日 … ⋯)

    /* 1.6.3(mockup v9 #3、#4,使用者:「直接拿掉了,放在 header 日期的左邊」)
       行事曆鈕從 ⋯ 搬到標題列,就在「今日」左邊 —— 標題列 = ⌄ · 📅 · 今日 ·… · ⋯。
       ⚠ 它掛在溝後面,所以是標題列的**第一個圖示**:22 那條線(v15 Q31)。 */
    const 曆 = 頭.createDiv();
    曆.addClass("tk-頭鈕");
    if (s.開行事曆) 曆.addClass("tk-亮");
    曆.setAttribute("role", "button"); 曆.setAttribute("tabindex", "0");
    曆.setAttribute("aria-label", T.calendar);
    圖備(曆, ["calendar", "calendar-days"], 14);
    曆.onclick = (e) => { e.stopPropagation(); this.切行事曆(); };
    曆.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); this.切行事曆(); } };
    const 今 = 頭.createDiv({ text: T.today + " " + 日期範圍字(this.今) });
    今.addClass("tk-頭字"); 今.addClass("tk-今色");
    今.setAttribute("aria-label", T.backToToday);
    頭.onclick = () => { this.回到今天(); this.畫(); };
    頭.createDiv().addClass("tk-撐");
    this.畫顯示彈出(頭, 全);
    if (收) return;
    const 條 = 塊.createDiv();
    條.addClass("tk-篩條");
    this.畫篩格們(條, 全);
  }

  /* 標題列右邊的 ⋯:平常收著;按了往左彈出「全部 · 未完成|已完成 · 封存區」,樣子跟沒收起來一樣(使用者 v4 留言) */
  畫顯示彈出(頭, 全) {
    const T = this.T, s = this.狀態, 設 = this.插件.設定.排程顯示 || {};
    const 鈕 = (父, 字, 圖名, 亮, 做, 類) => {
      const b = 父.createDiv();
      b.addClass("tk-段鈕"); if (類) b.addClasses(類.split(" "));   // addClass 只收一個 class,帶空白會丟例外、整份畫不出來
      if (亮) b.addClass("tk-亮");
      b.setAttribute("role", "button"); b.setAttribute("tabindex", "0");
      if (圖名) 圖備(b, [].concat(圖名), 12);
      if (字) b.createSpan({ text: 字 });
      b.onclick = (e) => { e.stopPropagation(); 做(); };
      b.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); 做(); } };
      return b;
    };
    if (s.顯示彈出) {
      const 彈 = 頭.createDiv();
      彈.addClass("tk-彈");
      /* 1.6.3(mockup v9 #1、Q13):「全部」搬到**行事曆標題列的右邊**(見 畫新增區內)——
         它是「所有日期」,跟未完成 / 已完成不是同一件事,擺在一起會被當成同一組。
         1.6.3(mockup v9 #3):行事曆鈕搬到時間篩選標題列的「今日」左邊。
         所以這個 ⋯ 裡只剩未完成 / 已完成(Q25:只剩兩顆,⋯ 照樣留著)。 */
      const 段 = 彈.createDiv();
      段.addClass("tk-段");
      // CR-1.6.3-01(使用者):未完成 / 已完成各自獨立的勾選,不是二選一;兩個都關掉就退回未完成(不然看不到東西)
      const 切 = async (k) => {
        設[k] = !設[k];
        if (!設.未完成 && !設.完成) 設.未完成 = true;
        await this.插件.存設定(); this.畫();
      };
      鈕(段, T.showTodo + " " + this.顯示數(全, "未完成"), ["circle"], !!設.未完成, () => 切("未完成"));
      鈕(段, T.showDone + " " + this.顯示數(全, "完成"), ["circle-check", "check-circle"], !!設.完成, () => 切("完成"));
    }
    const 更 = 頭.createDiv();
    更.addClass("tk-頭鈕");
    if (s.顯示彈出) 更.addClass("tk-亮");
    更.setAttribute("role", "button"); 更.setAttribute("tabindex", "0");
    更.setAttribute("aria-label", [T.showTodo, T.showDone].join(" / "));
    圖(更, "ellipsis", 14);
    更.onclick = (e) => { e.stopPropagation(); s.顯示彈出 = !s.顯示彈出; this.畫(); };
  }

  /* 行事曆開關(以前是年格底下的小鈕,1.6.3 搬到時間篩選標題列的「今日」前面) */
  切行事曆() {
    const s = this.狀態;
    const 切 = () => {
      s.開行事曆 = !s.開行事曆; s.選起 = null; s.選迄 = null;
      /* C8(1.6.3,使用者要的):打開時跳到目前篩選(游標)的那個月。
         ⚠ 推翻 1.4.7 的「一律從這個月開始」:當時是各格各自偏移,翻到隔年再打開會停在奇怪的月份;
         1.6 起只有一個游標,「今日」一按就回今天,跟著游標走不會迷路。 */
      if (s.開行事曆) { s.顯示月 = String(s.游標 || this.今).slice(0, 7); if (讀新增收合()) 存新增收合(false); }
      this.畫();
    };
    if (!s.開行事曆 && s.設定模式) { this.離開設定模式(切); return; }
    切();
  }

  畫篩格們(條, 全) {
    const T = this.T, s = this.狀態, f = s.篩 || {};
    const 箭 = (父, 往右, 提示, 做) => {
      const b = 父.createDiv();
      b.addClass("tk-篩箭");
      b.setAttribute("role", "button"); b.setAttribute("aria-label", 提示);
      圖(b, 往右 ? "chevron-right" : "chevron-left", 12);
      b.onclick = (e) => { e.stopPropagation(); 做(); };
      return b;
    };
    const 格 = (父, 類們, 亮) => {
      const g = 父.createDiv();
      g.addClass("tk-篩格"); 類們.forEach(c => g.addClass(c));
      if (亮) g.addClass("tk-亮");
      g.setAttribute("role", "button"); g.setAttribute("tabindex", "0");
      return g;
    };
    /* U21(mockup v16 的 .two / .hi / .lo,Q29):格子中間是**上下兩排** —— 上排張數(25 高)、下排字或圖示(25 高),
       箭頭照舊跨整格高。以前張數是絕對定位疊在上面、字在整格裡置中,下排的字因此偏高。
       ⚠ 同一格要先 數() 再 中():中() 看那時候有沒有張數,沒有就把兩排的盒子改成置中(tk-篩單)。 */
    const 兩 = (g) => {
      let w = g.querySelector(":scope > .tk-篩兩");
      if (!w) { w = g.createDiv(); w.addClass("tk-篩兩"); }
      return w;
    };
    const 數 = (g, n, 色) => { const d = 兩(g).createDiv({ text: String(n) }); d.addClass("tk-篩數"); if (色) d.style.color = 色; return d; };
    const 中 = (g) => {
      const w = 兩(g);
      if (!w.querySelector(".tk-篩數")) w.addClass("tk-篩單");
      const d = w.createDiv(); d.addClass("tk-篩中"); return d;
    };
    const 選層 = (鍵, 層) => {
      const 亮 = f.型 === 鍵;
      const 段 = this.層區間(層);
      if (亮 && !(段.起 <= this.今 && this.今 <= 段.迄)) this.設游標(this.今);   // 選著、不在今天:再點一次回到今天
      s.篩 = { 型: 鍵 }; s.開行事曆 = false; this.畫();
    };
    const 月日 = (d) => (+d.slice(5, 7)) + "/" + (+d.slice(8, 10));

    // 年
    {
      const 年選 = f.型 === "年度";
      const g = 格(條, ["tk-大"], 年選);
      const 週段 = this.層區間("週");
      const 跨 = 週段.起.slice(0, 4) !== 週段.迄.slice(0, 4);
      箭(g, false, "看前一年", () => this.移游標("年", -1));
      數(g, this.清單池(全).filter(k => String(k.起日 || "").slice(0, 4) === s.統計年).length);
      const c = 中(g);
      const 字 = c.createSpan({ text: 跨 ? 週段.起.slice(2, 4) + "–" + 週段.迄.slice(2, 4) : s.統計年 });
      字.addClass("tk-年字");
      箭(g, true, "看後一年", () => this.移游標("年", 1));
      g.setAttribute("aria-label", s.統計年 + " · " + T.tileHint);
      g.onclick = () => {
        if (年選 && s.統計年 !== this.今.slice(0, 4)) { this.設游標(this.今); s.顯示月 = this.今.slice(0, 7); }
        s.篩 = { 型: "年度" }; s.開行事曆 = false; this.畫();
      };
    }
    // 月 / 週(上下兩格,不寫張數)
    {
      const 欄 = 條.createDiv();
      欄.addClass("tk-篩欄");
      [["本月", "月"], ["7天內", "週"]].forEach(([鍵, 層]) => {
        const g = 格(欄, ["tk-半"], f.型 === 鍵);
        const 段 = this.層區間(層);
        箭(g, false, "往前一格", () => this.移游標(層, -1));
        const c = 中(g);
        if (層 === "月") c.createSpan({ text: 格標字("月", 段, T) });
        else { c.createSpan({ text: 月日(段.起) }); c.createSpan({ text: "–" }).addClass("tk-週連"); c.createSpan({ text: 月日(段.迄) }); }
        箭(g, true, "往後一格", () => this.移游標(層, 1));
        g.setAttribute("aria-label", (層 === "月" ? T.monthLayer : T.weekLayer) + " · " + T.tileHint);
        g.onclick = () => 選層(鍵, 層);
      });
    }
    // 日
    {
      const g = 格(條, ["tk-大"], f.型 === "今日");
      const 段 = this.層區間("日");
      箭(g, false, "前一天", () => this.移游標("日", -1));
      數(g, this.區間張數(全, 段.起, 段.迄));
      const c = 中(g);
      c.createSpan({ text: 月日(段.起) });
      c.createSpan({ text: "(" + 語().週名[new Date(段.起 + "T00:00:00").getDay()] + ")" }).addClass("tk-週名");
      箭(g, true, "後一天", () => this.移游標("日", 1));
      g.setAttribute("aria-label", T.dayLayer + " · " + T.tileHint);
      g.onclick = () => 選層("今日", "日");
    }
    // 逾期 / 週期:只有圖示 + 張數
    [
      { 名: T.overdue, 鍵: "逾期", 色: "var(--color-red, #e05252)", 圖示: ["clock-alert", "alarm-clock", "clock"],
        數: () => this.清單池(全).filter(k => this.是逾期(k)).length },
      { 名: T.longTerm, 鍵: "週期", 色: "var(--color-purple, #8a6ed4)", 圖示: ["refresh-ccw-dot", "refresh-ccw", "repeat"],
        數: () => this.清單池(全).filter(k => k.循環).length }
    ].forEach(定 => {
      const g = 格(條, ["tk-大", "tk-小"], f.型 === 定.鍵);
      數(g, 定.數(), 定.色);
      const c = 中(g);
      c.style.color = 定.色;
      圖備(c, 定.圖示, 14);
      g.setAttribute("aria-label", 定.名);
      g.onclick = () => { s.篩 = { 型: 定.鍵 }; s.開行事曆 = false; this.畫(); };
    });
  }
  /* ◀ ▶ 換一格的箭頭。
     ⚠ 1.4.4:以前是 16px 的方框裡放一個 0.9em 的「◀」字元,實際畫出來的三角形只有 7px 寬,
       手機上幾乎點不到。改成 Lucide 的 chevron,框放大到 20px(手機 26px)。
     ⚠ 用 膠囊()(div + role=button)不用 <button>:手機版 Obsidian 會給 button 一個
       44px 的高度和底色,箭頭會被撐成一塊方磚(列表標題那顆「⋯」在 1.4.3 就是這樣)。
     ⚠ 桌機的寬度是算過的:本日那一格 98 = 箭 20 + 標 50 + 箭 20 + 間隔 2 + padding 6。
       箭頭再大,標籤那格就要跟著縮,不然「9/14–9/20」會被切掉。 */
  畫箭(容器, 往右, 提示, 動作, 直) {
    /* 直 = 窄螢幕的「高箭頭」(1.4.6):寬 26、高度撐滿整塊(跨數字和標籤兩行)。
       其他情況:窄螢幕 24、桌機 20。 */
    // 1.5:高箭頭手機也是 22(以前 26)。本月 / 本周也改成高箭頭之後,360px 的手機上「9/28–10/4」會被兩條 26 的箭頭夾到放不下;高度撐滿整格,點擊面積還是很大
    // 1.5.1:窄螢幕的高箭頭再縮到 18,篩選列才排得成一排(高度還是撐滿整格,點得到)
    const 大 = 直 ? (this.密 ? 18 : 22) : (this.密 ? 24 : 20);
    const b = 膠囊(容器, "");
    b.addClass("tk-箭");
    st(b, "flex:0 0 " + 大 + "px;width:" + 大 + "px;" +
      (直 ? "height:auto;align-self:stretch;min-height:" + 大 + "px;" : "height:" + 大 + "px;") +
      "padding:0;margin:0;" +
      "display:inline-flex;align-items:center;justify-content:center;border-radius:6px;" +
      "cursor:pointer;line-height:0;color:var(--text-muted);border:1px solid transparent;");
    圖(b, 往右 ? "chevron-right" : "chevron-left", this.密 ? 17 : 15);
    b.title = 提示;
    b.onclick = (e) => { e.stopPropagation(); 動作(); };
    return b;
  }

  顯示數(全, k) {
    const 池 = this.基底(全).filter(x => this.合日期(x));
    if (k === "封存") return 池.filter(x => this.是封存(x)).length;
    const 非封存 = 池.filter(x => !this.是封存(x));
    return k === "完成" ? 非封存.filter(x => x.完成).length : 非封存.filter(x => !x.完成).length;
  }

  /* ---- ② 行事曆:點第一下 = 起,點第二下 = 迄,選滿一段就自動收起來 ---- */
  /* 1.6:行事曆是新增卡片那一塊的第三種內容(見 畫新增區),畫在塊的標題列底下;收起鈕在標題列上。 */
  畫行事曆(外塊, 全) {
    const T = this.T, s = this.狀態;
    const 盒 = 外塊.createDiv();
    st(盒, "padding:9px 10px 9px 18px;");       // 內容從 18 開始(Guide 18)

    const 頭 = 盒.createDiv();
    st(頭, "display:flex;align-items:center;gap:6px;margin-bottom:6px;");
    this.畫箭(頭, false, "", () => { s.顯示月 = this.移月(s.顯示月, -1); this.畫(); });
    const 月字 = 頭.createDiv({ text: s.顯示月.replace("-", " / ") });
    st(月字, "flex:0 0 96px;width:96px;text-align:center;font-size:0.9em;font-weight:700;");
    this.畫箭(頭, true, "", () => { s.顯示月 = this.移月(s.顯示月, 1); this.畫(); });
    // 1.6.3 C8:不寫「點一天當開始」灰字(UI 規則:不寫灰色說明字),改放 title
    盒.title = s.選起 ? T.pickEnd : T.pickStart;

    const 每日 = {};
    this.清單池(全).forEach(k => {
      if (!k.起日) return;
      let d = k.起日; const 末 = k.迄日 || d;
      for (let n = 0; d && d <= 末 && n < 400; n++) { 每日[d] = (每日[d] || 0) + 1; d = 加日(d, 1); }
    });

    const 年 = Number(s.顯示月.slice(0, 4)), 月 = Number(s.顯示月.slice(5, 7)) - 1;
    const 網 = 盒.createDiv();
    st(網, "display:grid;grid-template-columns:repeat(7,1fr);gap:2px;");
    // 第一欄是星期幾看設定(1.4.7):週一開始就把週日排到最後
    const 週名 = 語().週名;
    for (let i = 0; i < 7; i++) st(網.createDiv({ text: 週名[(i + 週起日) % 7] }),
      "font-size:0.66em;color:var(--text-faint);text-align:center;padding-bottom:2px;");
    const 頭空 = (new Date(年, 月, 1).getDay() - 週起日 + 7) % 7, 天數 = new Date(年, 月 + 1, 0).getDate();
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
        this.設游標(a);                  // 年 / 月 / 週 / 日四格跟著選的那一段走
        s.選起 = null; s.開行事曆 = false; this.畫();
      };
    }
    /* 1.6.3 C8:這個月幾張 = 月份右邊的灰字數字(不寫「張」,C10;幾天有卡片放 title),
       「回到本月」也在月份右邊;底下那一排拿掉了。 */
    let 張 = 0, 天 = 0;
    for (let d = 1; d <= 天數; d++) {
      const 日 = 年 + "-" + 兩位(月 + 1) + "-" + 兩位(d);
      if (每日[日]) { 張 += 每日[日]; 天++; }
    }
    const 數 = 頭.createDiv({ text: String(張) });
    st(數, "font-size:0.72em;color:var(--text-faint);margin-left:4px;");
    數.title = T.calMonthTotal.replace("D", String(張)).replace("N", String(天));
    const 回 = 頭.createEl("button", { text: T.thisMonth });
    st(回, "margin-left:6px;font-size:0.72em;height:20px;min-height:0;padding:0 9px;border-radius:6px;" +
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
    /* 1.5.1:上下 padding 一樣(以前 5 / 6),內容**垂直置中** ——
       標籤那一行拿掉之後,矮的東西(常用主題膠囊 20px、分類圓點 22px)在比較高的列裡會貼著上緣。 */
    st(盒, "display:flex;flex-direction:column;justify-content:center;gap:3px;padding:5px 8px;border-radius:7px;" +
      "box-sizing:border-box;min-width:0;" +
      "border:1px solid var(--background-modifier-border);background:var(--background-secondary);" +
      (外css || ""));
    /* 1.5.1:標籤可以是字、是 { 圖示, 提示 }(內容框只放一顆 square-pen),或 null
       (主題、常用主題、分類、指派人都不要標籤)。有標籤的那一行固定 14px 高 ——
       送出欄靠一行空白標籤跟內容框對齊,兩邊要一樣高。 */
    if (標籤) {
      const 標行 = 盒.createDiv();
      st(標行, "display:flex;align-items:center;gap:4px;min-width:0;height:14px;");
      if (typeof 標籤 === "object") {
        const 圖框 = 標行.createDiv();
        st(圖框, "display:inline-flex;align-items:center;line-height:0;color:var(--text-faint);");
        圖備(圖框, 標籤.圖示, 12);
        if (標籤.提示) 圖框.title = 標籤.提示;
      } else {
        /* ⚠ 標籤不換行,但**要讓得出空間**:min-width:0 + 省略號。
           沒有這一段的話,一個比較長的譯名(中文「分類」→ 英文「Section」)就會
           把整個框的最小寬度撐大,右欄放不下,兩個框各自掉到一行去。 */
        st(標行.createDiv({ text: 標籤 }),
          "font-size:0.66em;color:var(--text-faint);white-space:nowrap;" +
          "min-width:0;overflow:hidden;text-overflow:ellipsis;");
      }
      if (標籤右) 標籤右(標行);
    }
    const 身 = 盒.createDiv();
    st(身, "display:flex;gap:5px;align-items:center;flex-wrap:wrap;flex:1 1 auto;");
    // 沒有標籤那一行的時候,「⋯」(標籤右)改排在欄位本體的最右邊
    if (!標籤 && 標籤右) { 標籤右(身); const 右 = 身.lastElementChild; if (右) 右.style.order = "9"; }
    return 身;
  }

  /* 1.6:新增卡片這一塊有四種內容 —— 新增 / **詳細編輯** / 分類與指派人(「⋯」)/ 行事曆。
     換內容的時候:整塊的高度從舊的滑到新的,新內容同時淡入、從旁邊滑進來
     (去設定、行事曆、詳細編輯從右邊進,回到新增從左邊進 —— 看得出是「進去」還是「回來」)。
     ⚠ 只有「換了內容」才動;平常的重畫(打字篩選、打勾、翻日期)不動(U49:同一個狀態不重播)。
       系統要求減少動態就不動。
     ⚠ 1.6.3(使用者 09-20:「詳細編輯要做動畫開合怎麼沒做」):`詳` 一定要算在模式裡 ——
       以前 進 / 出詳細編輯 的模式都是「新」,所以整塊長高一倍是**瞬間跳**的,沒有滑動。 */
  畫新增區(根, 全) {
    const s = this.狀態;
    const 模式 = s.開行事曆 ? "曆" : (s.設定模式 && this.設草 ? "設" : (s.詳細 ? "詳" : "新"));
    const 舊模式 = this.__新增模式, 舊塊 = 根.firstElementChild;
    const 舊高 = 舊塊 ? 舊塊.clientHeight : 0;
    this.畫新增區內(根, 全);
    this.__新增模式 = 模式;
    const 塊 = 根.firstElementChild;
    if (!舊模式 || 舊模式 === 模式 || !塊 || !舊高 || 讀新增收合() || !要動畫()) return;
    滑開(塊, 舊高);
    const 身 = 塊.children[1];
    if (身 && typeof 身.animate === "function") {
      const 位 = (模式 === "新" ? -14 : 14) + "px";
      身.animate([{ opacity: 0, transform: "translateX(" + 位 + ")" }, { opacity: 1, transform: "translateX(0)" }],
        { duration: 220, easing: "cubic-bezier(.22,.61,.36,1)" });
    }
  }

  /* ⚠⚠ 1.6.3(mockup v7)新增卡片整塊重畫:
       標題列  [⤢ 詳細編輯(溝)] (●) [☰ 57] #主題 #主題 … ········ (頭像) [⋯ 分類與指派人]
       本體    輸入框(透明,字從 5px 開始)·················· [➤](小)
     ・沒有主題框了:主題打在輸入框裡(#主題,打在前面或後面都可以,最多 3 個)、@人 = 指派人(ADR 1.6.3-01)。
       輸入框同時是搜尋框(#主題 = 只看那個主題、@人 = 只看他的)。點常用主題 = 在輸入框最前面放 #主題。
     ・分類圓點、頭像的 ▾ 縮小放在右上角,不會跟收合箭頭搞混。
     ・這一塊不收合了(溝被詳細編輯鈕用掉);設定模式、行事曆模式溝裡是那個模式的圖示。 */
  畫新增區內(根, 全) {
    根.empty();
    document.body.querySelectorAll(".tk-主題建議").forEach(x => { try { x.remove(); } catch (e) {} });
    const T = this.T, s = this.狀態;
    this.題輸 = null;
    // 1.6.3(mockup v12 Q26):封存區不再是自己一塊,搬進設定面板的右半邊(見 畫設定面板 → 畫封存半)
    const 外塊 = 根.createDiv();
    外塊.addClass("tk-塊"); 外塊.addClass("tk-篩塊"); 外塊.addClass("tk-新塊");
    const 頭 = 外塊.createDiv();
    頭.addClass("tk-塊頭"); 頭.addClass("tk-有身"); 頭.addClass("tk-靜");
    const 小鈕 = (圖名們, 提示, 動作, 亮) => {
      const b = 頭.createDiv();
      b.addClass("tk-頭鈕"); if (亮) b.addClass("tk-亮");
      b.setAttribute("role", "button"); b.setAttribute("tabindex", "0");
      b.setAttribute("aria-label", 提示);
      圖備(b, 圖名們, 15);
      b.onclick = (e) => { e.stopPropagation(); 動作(e); };
      b.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); 動作(e); } };
      return b;
    };
    const 溝 = 頭.createDiv();
    溝.addClass("tk-溝");
    /* U30(mockup v9 #9,使用者「增加返回按鍵」):行事曆是從**詳細編輯**打開的 →
       溝裡放返回 chevron-left,按了回詳細編輯;從時間篩選打開的照 U23 放 calendar-days(不能按,所以不掛 role)。 */
    if (s.開行事曆 && s.詳細) {
      溝.setAttribute("role", "button"); 溝.setAttribute("tabindex", "0");
      溝.setAttribute("aria-label", T.backToEdit);
      圖備(溝, ["chevron-left", "arrow-left"], 14);
      const 回 = (e) => { e.stopPropagation(); this.切行事曆(); };
      溝.onclick = 回;
      溝.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); 回(e); } };
    }
    else if (s.開行事曆) 圖備(溝, ["calendar-days", "calendar"], 14);
    else if (s.設定模式 && this.設草) 圖備(溝, ["settings", "cog"], 14);
    else {
      const 詳 = !!s.詳細;
      溝.setAttribute("role", "button"); 溝.setAttribute("tabindex", "0");
      溝.setAttribute("aria-label", 詳 ? T.backToBoard : T.detailEdit);
      if (詳) 溝.addClass("tk-亮");
      圖備(溝, ["maximize-2", "expand"], 14);      // 詳細編輯的「回到看板」用同一個圖示(亮著 = 正在詳細編輯)
      const 開 = (e) => { e.stopPropagation(); if (詳) this.關詳細編輯(); else this.開詳細編輯(); };
      溝.onclick = 開;
      溝.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); 開(e); } };
    }
    const 切設定 = () => {
      if (s.設定模式) { this.離開設定模式(); return; }
      s.開行事曆 = false; s.選起 = null; s.選迄 = null;
      s.設定模式 = true;
      this.設草 = this.建設草();
      this.畫新增區(根, this.卡片);
    };
    if (s.開行事曆 || (s.設定模式 && this.設草)) {
      頭.createDiv().addClass("tk-撐");
      if (s.開行事曆) {
        /* 1.6.3(mockup v9 #1 / Q13,使用者:「放進行事曆」):
           「全部」= 所有日期,跟未完成 / 已完成不是同一件事,所以不放在時間篩選的 ⋯ 裡,
           放在**行事曆標題列的右邊**(v16:有框)。 */
        const 全鈕 = 頭.createDiv({ text: T.all });
        全鈕.addClass("tk-頭鈕"); 全鈕.addClass("tk-框鈕");
        if ((s.篩 || {}).型 === "全部") 全鈕.addClass("tk-亮");
        全鈕.setAttribute("role", "button"); 全鈕.setAttribute("tabindex", "0");
        const 看全部 = () => { s.篩 = { 型: "全部" }; s.開行事曆 = false; s.選起 = null; s.選迄 = null; this.畫(); };
        全鈕.onclick = (e) => { e.stopPropagation(); 看全部(); };
        全鈕.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); 看全部(); } };
        小鈕(["x"], T.close, () => { s.開行事曆 = false; s.選起 = null; s.選迄 = null; this.畫(); });
      }
      else {
        小鈕(["undo-2", "undo", "rotate-ccw"], T.backDiscard, () => this.離開設定模式());
        小鈕(["check"], T.save, () => this.存設草(), true);
      }
      小鈕(["ellipsis"], T.sectionsAndPeople, 切設定, !!s.設定模式);
      if (s.開行事曆) { this.畫行事曆(外塊, 全); return; }
      this.畫設定面板(外塊); return;
    }

    // ---- 詳細編輯模式:標題列是 📅 這張卡片的日期(點了開行事曆);分類圓點和常用主題在第三排 ----
    const 詳 = !!s.詳細;
    let 題排 = 頭;
    if (詳) {
      const 日 = 頭.createDiv();
      日.addClass("tk-頭圖"); 日.addClass("tk-可點");
      日.setAttribute("role", "button"); 日.setAttribute("tabindex", "0");
      日.setAttribute("aria-label", T.calendar);
      圖備(日, ["calendar", "calendar-days"], 13);
      const d = this.新增日期();
      const 日字樣 = 日.createSpan({ text: d.起 ? 日期範圍字(d.起, d.迄) : T.noDate });
      日字樣.addClass("tk-頭字"); 日字樣.style.marginLeft = "5px"; 日字樣.style.color = "var(--text-normal)";
      日.onclick = (e) => { e.stopPropagation(); this.切行事曆(); };
      /* U30(mockup v9 #12,使用者「如果是按循環 在這邊加一個選單」):日期右邊的「🔁 每 2 週 ▾」。
         U24(Q20,使用者「循環只在 time filter 按循環時才出現選項,通常都是不循環」):
         **只有時間篩選選到「週期」那格、或這張卡片已經設了循環**才畫,平常不佔位。 */
      if ((s.篩 || {}).型 === "週期" || s.新循環) this.畫循鈕(頭, "tk-頭循");
      頭.createDiv().addClass("tk-撐");
      /* ⚠ mockup v16 的詳細編輯**沒有**「[‹ 週 ›][‹ 日 ›]」那一排(舊的 畫小篩)——
         日期就是標題列上的 📅 + 日期,要改日期點它開行事曆。使用者 09-20 問「日期 layout 改了你有看嗎」,
         那一排在這裡拿掉了(要找舊的程式看 git 的 畫小篩)。 */
      題排 = 外塊.createDiv();
      題排.addClass("tk-題排");
    }
    // ---- 分類圓點(U25:圓點 16、點擊範圍 26):點了選要放到哪一區 ----
    const 區 = this.分類清單.filter(x => !/archive|封存/i.test(x));
    if (s.新分類 === null || 區.indexOf(s.新分類) < 0) s.新分類 = 區[0] || "紅色";
    const 點座 = 題排.createDiv();
    點座.addClass("tk-點座");
    點座.setAttribute("role", "button"); 點座.setAttribute("tabindex", "0");
    const 點 = 點座.createDiv();
    點.addClass("tk-點");
    const 尖 = 點座.createDiv();
    尖.addClass("tk-小尖");
    圖(尖, "chevron-down", 7);          // U25 / ui-rules:▾ 7px,不能跟收合箭頭長得一樣
    const 上色 = () => {
      const nc = this.插件.分類色(s.新分類);
      點.style.borderColor = nc;
      點.style.background = 透明(nc, 0.14);
      點座.setAttribute("aria-label", s.新分類 + " —— 點一下換要放到哪一區");
    };
    this.套新分類色 = 上色;
    上色();
    點座.onclick = (e) => { e.stopPropagation(); this.開分類清單(點座, s.新分類, (n) => { s.新分類 = n; this.畫(); }); };

    // ---- ☰ 更多 + 常用主題 ----
    const 常 = 題排.createDiv();
    常.addClass("tk-常用列");
    // U26 / U31:新增卡片和詳細編輯兩處的常用主題都可以收合(小箭頭在「☰ 57」右邊,預設收起)
    this.畫常用主題列(常, 全, true);

    // ---- 指派人:頭像 + 右上角小 ▾ ----
    let 選值 = "";
    if (!this.個人) {
      /* U33(mockup v16 #5,使用者「不可不指派」):沒有「不指派」這個選項了 ——
         沒選過(null)或舊的空字串都退回「這台電腦是誰」,再退回名單第一個。名單整個是空的才畫空頭像。 */
      選值 = 人選之(s.新指派, this.我是誰(), this.名單);
      const 人鈕 = 頭.createDiv();
      人鈕.addClass("tk-人鈕");
      人鈕.setAttribute("role", "button"); 人鈕.setAttribute("tabindex", "0");
      人鈕.setAttribute("aria-label", T.assignee + ":" + (選值 || T.none));
      // U09(v12 #9,使用者「顏色太混亂」):頭像底色統一(styles.css 的 .tk-頭像),不再用 人色() ——
      // 卡片上 1.6.3 第一輪就改了(main.js 的 畫題行),新增卡片這一顆是漏掉的
      if (選值) { const a = 人鈕.createDiv({ text: 頭字(選值) }); a.addClass("tk-頭像"); }
      else { const a = 人鈕.createDiv(); a.addClass("tk-頭像空"); a.style.opacity = "0.7"; 圖備(a, ["user-plus", "plus"], 14); }
      const 人尖 = 人鈕.createDiv();
      人尖.addClass("tk-小尖");
      圖(人尖, "chevron-down", 8);
      人鈕.onclick = (e) => {
        e.stopPropagation();
        const m = new Menu();
        // U33:選單裡沒有「不指派」
        this.名單.forEach(n => m.addItem(i => i.setTitle(n).setChecked(n === 選值)
          .onClick(() => { s.新指派 = n; 存我是誰(n); this.畫(); })));
        m.showAtMouseEvent(e);
      };
    }
    小鈕(["ellipsis"], T.sectionsAndPeople, 切設定);

    // ---- 本體:透明的輸入框 + 小的送出鈕(詳細編輯:分隔線、高的內容框、送出自己一排) ----
    if (詳) 外塊.createDiv().addClass("tk-分隔");
    const 身 = 外塊.createDiv();
    身.addClass("tk-新身");
    if (詳) 身.addClass("tk-詳身");
    const 入 = 身.createDiv();
    入.addClass("tk-新入");
    const 內即 = this.即時編(入, s.新內容, {
      改了: (v) => { s.新內容 = v; this.記輸入主題(全, v); this.搜尋變動(); },
      送出: () => this.送出新增(),
      取消: () => this.清除搜尋(),
      // U34(mockup v16 #7,使用者「新增框換 square-pen」):空白時的圖示用 Lucide 原版 square-pen
      提示圖: ["square-pen", "pen-square", "pen-line"]
    });
    if (內即) this.內輸 = 內即;
    else {
      const 內輸 = 入.createEl("textarea");
      內輸.addClass("tk-新入字");
      內輸.value = s.新內容;
      const 長高 = () => 撐高(內輸);
      內輸.oninput = () => { s.新內容 = 內輸.value; this.記輸入主題(全, 內輸.value); 長高(); this.搜尋變動(); };
      內輸.onkeydown = (e) => {
        if (是送出(e)) { e.preventDefault(); this.送出新增(); return; }
        if (e.isComposing || e.keyCode === 229) return;
        if (e.key === "Escape" || e.code === "Escape") { e.preventDefault(); this.清除搜尋(); }
      };
      this.內輸 = 內輸;
      this.掛連結建議(內輸);
      掛md快捷(內輸);
      長高(); setTimeout(長高, 0);
    }
    const 送 = 身.createDiv();
    送.addClass("tk-送小");
    送.setAttribute("role", "button"); 送.setAttribute("tabindex", "0");
    /* R4(UI/UX critic,使用者 09-20 同意):主要按鈕一律 --interactive-accent,
       **不跟指派人或分類變色** —— 顏色只給分類、逾期、週期、今天,送出鈕是「主要動作」這個角色。 */
    送.style.background = "var(--interactive-accent)";
    圖備(送, ["send-horizontal", "send-horizonal", "send"], 14);
    送.setAttribute("aria-label", T.submit + " → " + this.新增去向文());
    送.title = (選值 ? (T.add + " · " + 選值) : T.add) + " → " + this.新增去向文() + "\n" + 送出提示字(T);
    送.onclick = () => this.送出新增();
    送.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.送出新增(); } };
    if (詳) {
      // 詳細編輯:送出鈕自己一排、靠右,寫「送出」(不寫日期,日期看標題列)
      送.remove();
      const 送排 = 外塊.createDiv();
      送排.addClass("tk-送排");
      送排.appendChild(送);
      送.addClass("tk-送寬");
      送.createSpan({ text: T.submit });
    }
  }

  /* 1.6.3(mockup v7)封存區:時間篩選 ⋯ 裡的「封存區」打開。
       ▌封存區 3
        ● 2026 春季專案 ·········· 8  [還原]
        ● 2025 秋季專案(選到:底色 + 底線)12 [✓ 再按一次]
        ● 以前單張封存的卡片 ······ 92
       ─────────
        🔍 搜尋 · ☰ 12 · 這一區的主題…
     一次只看一區(點名字換);底下的清單只剩那一區的卡片,不看日期篩選。 */
  /* 1.6.3(mockup v12 Q26)封存區 = 設定面板的**右半邊**(以前自己一塊)。
     這個函式只畫內容:小標(archive + 幾區)→ 每一區一列 → 選到的那一區的搜尋和主題。
     外面的塊、標題列、✓ / ↩ 都是設定面板的(見 畫設定面板)。 */
  畫封存半(容器, 全, 小標) {
    const T = this.T, s = this.狀態, 草 = this.設草;
    const 標題們 = this.分類清單.filter(x => /archive|封存/i.test(x));
    /* 使用者 09-20:「分類區設定 按封存 會顯示一個預覽 跳到右邊分類封存區」——
       左半按了 🗄 的分類(還是草稿,✓ 才寫檔)在右半多一列**預覽**:選它就看得到那一區有哪些卡片。
       預覽那一列的 id 是分類**現在**的名字(k.分類 就是它),不是還不存在的 `Archive/名字`。 */
    const 預覽們 = ((草 && 草.分類) || []).filter(x => x.封存 && x.原 && !x.刪)
      .map(x => ({ 原: x.原, 名: String(x.名 || x.原).trim() || x.原 }));
    const 有這一區 = (n) => 標題們.indexOf(n) >= 0 || 預覽們.some(x => x.原 === n);
    if (s.封存看 && !有這一區(s.封存看)) s.封存看 = null;
    小標(容器, ["archive"], T.archiveZone, 標題們.length + 預覽們.length);
    const 表 = 容器.createDiv(); 表.addClass("tk-封表"); 表.addClass("tk-細捲");   // U41:區多了自己捲
    if (!標題們.length) 表.createDiv({ text: T.noCards }).addClass("tk-封空");
    標題們.forEach(標 => {
      const 原名 = 封存原名(標);
      const 張 = this.卡片.filter(k => k.分類 === 標).length;
      const 列 = 表.createDiv(); 列.addClass("tk-封列");
      const 選 = s.封存看 === 標;
      if (選) 列.addClass("tk-亮");
      const 點 = 列.createDiv(); 點.addClass("tk-封點");
      if (原名) 點.style.background = this.插件.分類色(原名);
      const 名 = 列.createDiv({ text: 原名 || T.oldArchived }); 名.addClass("tk-封名");
      if (!原名) 名.addClass("tk-淡");
      列.setAttribute("role", "button"); 列.setAttribute("tabindex", "0");
      列.setAttribute("aria-pressed", 選 ? "true" : "false");
      // 再點一次 = 不看這一區(回到平常的清單)
      列.onclick = () => { s.封存看 = 選 ? null : 標; s.封存搜 = ""; this.畫(); };
      列.createDiv({ text: String(張) }).addClass("tk-頭數");
      /* U39 / U40(v13 #9、Q42 使用者回「→ 和 ⋯ 的距離」):每一列右邊是 **→(移出)** 和 **⋯**,
         兩顆貼在一起(群組內 4px)。「還原這一區」從按鈕搬進 ⋯ —— 不常用的收進 ⋯(ui-rules 第 5 節),
         這一列才放得下 →;移出和整批刪除都用確認框問一次(危險動作)。 */
      const 具 = 列.createDiv(); 具.addClass("tk-封具");
      if (!原名) { 具.addClass("tk-空位"); return; }   // 「以前單張封存的卡片」不是一個區,沒有這些動作
      const 具鈕 = (圖名們, 提示, 做) => {
        const b = 具.createDiv(); b.addClass("tk-封鈕");
        b.setAttribute("role", "button"); b.setAttribute("tabindex", "0");
        b.setAttribute("aria-label", 提示);
        圖備(b, 圖名們, 13);
        b.onclick = (e) => { e.stopPropagation(); 做(e); };
        b.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); 做(e); } };
        return b;
      };
      具鈕(["log-out", "arrow-right-from-line", "arrow-right"], T.moveOut, () => this.問移出(標, 原名, 張));
      具鈕(["ellipsis"], T.more, (e) => {
        const m = new Menu();
        m.addItem(i => i.setTitle(T.restoreSection).setIcon("archive-restore").onClick(() => this.還原封存區(標, 原名)));
        m.addItem(i => i.setTitle(T.moveOut).setIcon("log-out").onClick(() => this.問移出(標, 原名, 張)));
        m.addSeparator();
        m.addItem(i => {
          i.setTitle(T.deleteAllSection).setIcon("trash-2").onClick(() => this.問整批刪(標, 原名, 張));
          try { i.setWarning(true); } catch (err) {}
        });
        m.showAtMouseEvent(e);
      });
    });
    /* 預覽列(按 ✓ 才真的封存):虛線框 + 分類色,選它 = 清單只剩那一區(見 合顯示)。
       沒有 → / ⋯ —— 那兩個是對已經封存的區做的,這一區還沒封存。 */
    預覽們.forEach(x => {
      const 列 = 表.createDiv(); 列.addClass("tk-封列"); 列.addClass("tk-封預");
      const 選 = s.封存看 === x.原;
      if (選) 列.addClass("tk-亮");
      const 點 = 列.createDiv(); 點.addClass("tk-封點");
      點.style.background = this.插件.分類色(x.原);
      列.createDiv({ text: x.名 }).addClass("tk-封名");
      列.setAttribute("role", "button"); 列.setAttribute("tabindex", "0");
      列.setAttribute("aria-pressed", 選 ? "true" : "false");
      列.setAttribute("aria-label", x.名 + " —— " + T.archivePreview);
      列.onclick = () => { s.封存看 = 選 ? null : x.原; s.封存搜 = ""; this.畫(); };
      列.createDiv({ text: String(this.卡片.filter(k => k.分類 === x.原).length) }).addClass("tk-頭數");
      const 位 = 列.createDiv(); 位.addClass("tk-封具"); 位.addClass("tk-空位");   // 佔位:張數跟上面幾列對齊
    });
    if (!s.封存看) return;
    const 搜排 = 容器.createDiv(); 搜排.addClass("tk-封搜");
    const 搜 = 搜排.createDiv(); 搜.addClass("tk-封搜框");
    圖(搜, "search", 12);
    const inp = 搜.createEl("input", { type: "text" });
    inp.value = s.封存搜 || "";
    inp.setAttribute("aria-label", T.searchArchive);
    inp.oninput = () => {
      s.封存搜 = inp.value;
      if (this.搜尋計時) clearTimeout(this.搜尋計時);
      this.搜尋計時 = setTimeout(() => { this.搜尋計時 = null; this.重畫清單(); }, 160);
    };
    const 常 = 搜排.createDiv(); 常.addClass("tk-常用列");
    this.畫常用主題列(常, 全, false, this.卡片.filter(k => k.分類 === s.封存看), (題) => {
      s.封存搜 = "#" + 題; this.畫();
    });
  }
  /* 還原一整區(1.6.3 起在封存區那一列的 ⋯ 裡,以前是列上的 archive-restore 鈕):
     `## Archive/名字` 變回 `## 名字`;同名的分類已經在了就把卡片搬過去。一次原子寫入(改分類們)。 */
  async 還原封存區(標, 原名) {
    const 已有 = this.分類清單.indexOf(原名) >= 0;
    const 計畫 = 已有 ? { 新增: [], 刪: [[標, { 名: 原名, 新: false }]], 改名: [] }
                      : { 新增: [], 刪: [], 改名: [[標, 原名]] };
    const ok = await this.插件.寫手.改分類們(this.file, 計畫);
    if (ok) { this.狀態.封存看 = null; new Notice("↩ " + 原名); }
  }

  /* U43 / U44(Q27 定案):按 → 問一次,確定就把整區搬到
     `<封存區的名字><移出後綴>.md`(預設同資料夾;路徑和後綴在 Obsidian 設定頁可改)。 */
  問移出(標, 原名, 張) {
    const T = this.T, 設 = this.插件.設定;
    const 檔底 = 淨檔名(原名 + (設.移出後綴 || ""));
    const 夾 = String(設.移出資料夾 || "").replace(/^\/+|\/+$/g, "");
    const 本夾 = (this.file && this.file.parent && this.file.parent.path !== "/") ? this.file.parent.path : "";
    const 顯 = ((夾 || 本夾) ? (夾 || 本夾) + "/" : "") + 檔底 + ".md";
    const 文 = T.moveOutAsk.replace("NAME", 原名).replace("CNT", String(張)).replace("FILE", 顯);
    new 確認框(this.app, 文, T.moveOutYes, async () => {
      const r = await this.插件.寫手.移出分區(this.file, 標, 檔底, 夾);
      if (r && r.檔) { this.狀態.封存看 = null; new Notice("→ " + r.檔); }
    }).open();
  }

  /* U46(Q27 定案,使用者:「刪掉就是刪掉就沒了」):整批刪除,不留檔。問一次。 */
  問整批刪(標, 原名, 張) {
    const T = this.T;
    const 文 = T.deleteAllAsk.replace("NAME", 原名).replace("CNT", String(張));
    new 確認框(this.app, 文, T.deleteAllYes, async () => {
      const n = await this.插件.寫手.刪分區(this.file, 標);
      if (n !== false) { this.狀態.封存看 = null; new Notice(原名 + " · " + n); }
    }).open();
  }

  // 封存區的搜尋:#主題 = 只看那個主題(打一半也算),其他字 = 主題、內容、留言裡都要出現
  封存搜合(k) {
    const q = String(this.狀態.封存搜 || "").trim().toLowerCase();
    if (!q) return true;
    const 題們 = (k.主題們 || []).map(x => x.toLowerCase());
    const 全文 = (k.主題 + " " + (k.指派 || "") + " " + k.內容行.join(" ") + " " + k.留言.map(c => c.文).join(" ")).toLowerCase();
    return q.split(/\s+/).every(w => w[0] === "#" ? 題們.some(x => x.indexOf(題正(w).toLowerCase()) === 0) : 全文.indexOf(w) >= 0);
  }

  開詳細編輯() {
    const s = this.狀態;
    if (s.設定模式) { this.離開設定模式(() => this.開詳細編輯()); return; }
    s.詳細 = true; s.開行事曆 = false;
    this.畫新增區(this.區.新增, this.卡片);
    setTimeout(() => this.聚焦輸入({ preventScroll: true }), 0);
  }
  關詳細編輯() {
    this.狀態.詳細 = false;
    this.畫新增區(this.區.新增, this.卡片);
  }

  /* ⚠ 1.6.3(mockup v16,使用者 09-20 問「詳細編輯的日期 layout 改了你有看嗎」):
     詳細編輯的日期**只剩標題列上的 📅 + 日期**,點它開行事曆挑。
     以前那一排 `畫小篩()`([‹ 週 ›][‹ 日 ›])整個拿掉了,連 `.tk-小篩` 的 CSS 一起 ——
     不要留著沒人用的函式和規則(CLAUDE.md 的坑 #1)。要看舊的:git 的 1.6.3 WIP。 */

  /* U30(mockup v9 #12)+ U24(Q20):「🔁 每 2 週 ▾」—— 詳細編輯標題列上、日期的右邊。
     以前接在 畫小篩 後面(週、日的旁邊),v16 起搬到標題列,而且**平常不畫**:
     只有時間篩選選到「週期」那格、或這張卡片已經設了循環才出現(判斷在呼叫的人那裡)。 */
  畫循鈕(容器, 額外) {
    const T = this.T, s = this.狀態;
    const 循 = s.新循環;
    const 鈕 = 容器.createDiv();
    鈕.addClass("tk-循鈕"); if (額外) 鈕.addClass(額外);
    if (循) 鈕.addClass("tk-亮");
    鈕.setAttribute("role", "button"); 鈕.setAttribute("tabindex", "0");
    圖備(鈕, ["refresh-ccw-dot", "refresh-ccw", "repeat"], 12);
    鈕.createSpan({ text: 循 ? 循環說明短(循) : T.cycleNone });
    const 尖 = 鈕.createDiv(); 尖.addClass("tk-小尖"); 圖(尖, "chevron-down", 7);
    const 開 = (e) => {
      e.stopPropagation();
      const m = new Menu();
      const 選 = (v) => { s.新循環 = v; this.畫新增區(this.區.新增, this.卡片); };
      const 同 = (a) => !!循 && 循.型 === a.型 && 循.隔 === a.隔;
      m.addItem(i => i.setTitle(T.cycleNone).setChecked(!循).onClick(() => 選(null)));
      [{ 型: "日", 隔: 1 }, { 型: "週", 隔: 1 }, { 型: "週", 隔: 2 }, { 型: "月", 隔: 1 }].forEach(a =>
        m.addItem(i => i.setTitle(循環說明短(a)).setChecked(同(a)).onClick(() => 選(a))));
      m.showAtMouseEvent(e);
    };
    鈕.onclick = 開;
    鈕.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); 開(e); } };
    return 鈕;
  }

  /* 1.6.3 輸入框裡打了用過的主題(#主題),分類自動換成它上一次的分類(沿用 記主題分類 的規則) */
  記輸入主題(全, 文) {
    const 析 = 析輸入(文, this.名單);
    this.記主題分類(全, 析.題們.length ? 析.題們[0] : "");
  }

  /* 把游標放回輸入框(即時編輯器或退路的 textarea) */
  聚焦輸入(選) {
    const 入 = this.內輸;
    if (!入) return;
    try { if (typeof 入.聚焦 === "function") 入.聚焦(); else 入.focus(選 || {}); } catch (e) {}
  }

  /* 1.6.3 常用主題那一排(新增卡片、詳細編輯、封存區的搜尋列):☰ 更多 永遠在最前面,放不下的主題整顆藏起來。
     可收 = 要不要畫收合的小箭頭(U26 / U31:新增卡片和詳細編輯兩處要,封存區的搜尋列不要)——
       箭頭在「☰ 57」**右邊**、沒有框,收起 ⌄ / 展開 ›,**預設收起**,狀態記在這台裝置(讀主題收合)。 */
  畫常用主題列(容器, 全, 可收, 池源, 點題) {
    const T = this.T;
    const 池 = 池源 || (this.搜尋中() ? this.過濾(全) : this.清單池(全));
    const 次 = {}, 新 = {};
    池.forEach(k => (k.主題們 && k.主題們.length ? k.主題們 : (k.主題 ? [k.主題] : [])).forEach(題 => {
      次[題] = (次[題] || 0) + 1;
      const t = String(k.編修時 || "");
      if (!新[題] || t > 新[題]) 新[題] = t;
    }));
    let 釘 = [];
    if (!池源) { this.認領舊釘選(全); 釘 = this.釘選主題們.filter(Boolean); }
    const 全主題 = 釘.concat(Object.keys(次).filter(t => 釘.indexOf(t) < 0).sort((a, b) => {
      const t = String(新[b] || "").localeCompare(String(新[a] || ""));
      return t || (次[b] - 次[a]);
    }));
    const 更多 = 容器.createDiv();
    更多.addClass("tk-主題"); 更多.addClass("tk-更多");
    更多.setAttribute("role", "button");
    圖(更多, "list", 11);
    // U27(v13 #3,使用者「這個數字應該是張數的層級,不應該粗體」):跟其他張數一樣 11px 灰、不粗
    更多.createSpan({ text: String(全主題.length) }).addClass("tk-更多數");
    更多.setAttribute("aria-label", T.topicsPinHint);
    更多.onclick = (e) => { e.stopPropagation(); this.開主題面板(e, 全主題, 次); };
    const 收 = 可收 ? 讀主題收合() : false;
    if (可收) {
      const 箭 = 容器.createDiv();
      箭.addClass("tk-題箭");
      if (!收) 箭.addClass("tk-亮");
      箭.setAttribute("role", "button"); 箭.setAttribute("tabindex", "0");
      箭.setAttribute("aria-label", 收 ? T.showTopics : T.hideTopics);
      圖(箭, 收 ? "chevron-down" : "chevron-right", 12);
      const 切 = (e) => { e.stopPropagation(); 存主題收合(!收); this.畫新增區(this.區.新增, this.卡片); };
      箭.onclick = 切;
      箭.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); 切(e); } };
    }
    if (收) return;
    /* U32(mockup v14/v16):輸入框裡已經有 3 個主題時,還沒選到的膠囊**變淡、不能按**(主題最多 3 個)。
       封存區的搜尋列(點題 自己傳進來)不受限。 */
    // ⚠ 讀 狀態.新內容,不讀 this.內輸 —— 重畫時 內輸 還是上一個(已經拔掉的)編輯器,
    //    而 改了() 每一次打字都會同步 狀態.新內容,所以這一份才是現在框裡的字。
    const 已選 = 點題 ? [] : 析輸入(this.狀態.新內容, this.名單).題們;
    const 滿 = 已選.length >= 主題上限;
    全主題.slice(0, Math.max(12, 釘.length)).forEach(t => {
      const 已釘 = 釘.indexOf(t) >= 0;
      const b = 容器.createDiv();
      b.addClass("tk-主題");
      if (已釘) b.addClass("tk-已釘題");
      const c = this.插件.分類色(this.主題分類(全, t));
      b.style.color = c; b.style.background = 透明(c, 0.14);
      const 不能按 = 滿 && 已選.indexOf(t) < 0;
      if (不能按) { b.addClass("tk-題滿"); b.setAttribute("aria-disabled", "true"); }
      else b.setAttribute("role", "button");
      if (已釘) 圖(b, "pin", 9);
      b.createSpan({ text: 截寬(t, 主題顯寬) });     // C22 / U16:最多 6 個中文字,全名在 aria-label
      b.setAttribute("aria-label", "#" + t + " · " + (次[t] || 0) +
        (不能按 ? "\n" + T.topicFull : "\n" + (已釘 ? T.unpinTopic : T.pinTopic) + " → 右鍵"));
      b.onclick = (e) => { e.stopPropagation(); if (不能按) return; if (點題) 點題(t); else this.帶入主題(t); };
      b.oncontextmenu = (e) => {
        e.preventDefault(); e.stopPropagation();
        const m = new Menu();
        m.addItem(i => i.setTitle(已釘 ? T.unpinTopic : T.pinTopic).setIcon(已釘 ? "pin-off" : "pin")
          .onClick(() => this.切主題釘選(t)));
        m.showAtMouseEvent(e);
      };
    });
  }
  /* ---- 常用主題 ----
     ⚠ 固定就是一橫列,放不下的收進「☰ 更多」(擺在**最前面**,再窄的螢幕也切不掉),
       而且「更多」裡面可以打字查主題。
     ⚠ 清單跟著現在篩出來的結果走 —— 打了關鍵字,常用主題就只剩相關的那幾個;
       新增或編修過某個主題,它也會跟著往前排(最近動過的優先)。 */
  畫常用主題(第一左, 全, 只更多) {
    const T = this.T;
    const 常框 = this.建框(第一左, null, 只更多 ? "flex:0 0 auto;padding-left:2px;" : "flex:2 1 200px;min-width:0;");
    常框.parentElement.addClass("tk-常用主題");
    /* ⚠ 1.4.5:放不下的主題膠囊要**整顆消失**,不是被裁掉半顆。
       以前是 nowrap + overflow:hidden,窄版(700px)底下第五、六顆會被從字中間切開。
       現在允許換行、但框只有一列高:放不下的那幾顆掉到看不見的第二列去。
       (「☰ 更多」排在最前面,永遠看得到,被藏起來的主題在那裡面都找得到。) */
    st(常框, "display:flex;gap:6px;align-items:center;align-content:flex-start;width:100%;min-width:0;" +
      "flex-wrap:wrap;height:20px;overflow:hidden;");

    // 現在篩出來的那一批(有打關鍵字就只算那一批),再照「最近動過」排
    const 池 = this.搜尋中() ? this.過濾(全) : this.清單池(全);
    const 次 = {}, 新 = {};
    池.forEach(k => {
      if (!k.主題) return;
      次[k.主題] = (次[k.主題] || 0) + 1;
      const t = String(k.編修時 || "");
      if (!新[k.主題] || t > 新[k.主題]) 新[k.主題] = t;
    });
    /* 1.4.7:釘選的主題**永遠排在最前面**(照釘選的先後),而且不管現在篩出來的有沒有它都在 ——
       釘選就是「我每天都要點這個」。其他的照最近動過排。
       釘選的方法:「☰ 更多」面板每一列右邊的 📌,或在主題膠囊上按右鍵。 */
    this.認領舊釘選(全);
    const 釘 = this.釘選主題們.filter(Boolean);           // 1.5:只有這一份筆記自己的
    const 全主題 = 釘.concat(Object.keys(次).filter(t => 釘.indexOf(t) < 0).sort((a, b) => {
      const t = String(新[b] || "").localeCompare(String(新[a] || ""));   // 最近動過的優先
      return t || (次[b] - 次[a]);
    }));
    const 露幾個 = Math.max(7, 釘.length);
    const 熱 = 全主題.slice(0, 露幾個);
    const 其餘 = 全主題.slice(露幾個);

    // ☰ 更多:擺在最前面,點開可以打字查
    const 更多 = 常框.createEl("button");
    st(更多, "flex:0 0 auto;font-size:0.72em;height:20px;padding:0 8px;border-radius:10px;" +
      "cursor:pointer;white-space:nowrap;box-shadow:none;color:var(--text-muted);");
    圖鈕(更多, "list", String(只更多 ? 全主題.length : (其餘.length || 全主題.length)), 12);
    更多.title = T.topicsPinHint;
    更多.onclick = (e) => { e.stopPropagation(); this.開主題面板(e, 全主題, 次); };
    if (只更多) return;

    if (this.搜尋中()) {
      const 清 = 常框.createEl("button");
      st(清, "flex:0 0 auto;font-size:0.72em;height:20px;padding:0 8px;border-radius:10px;" +
        "cursor:pointer;box-shadow:none;color:var(--text-accent);border:1px solid var(--text-accent);");
      圖鈕(清, "x", "", 12);
      清.title = T.clearSearch;
      清.onclick = () => this.清除搜尋();
    }
    熱.forEach(t => {
      const 已釘 = 釘.indexOf(t) >= 0;
      const b = 常框.createEl("button");
      st(b, 分類樣式類(this.插件.分類色(this.主題分類(全, t))) +
        "font-size:0.72em;height:20px;padding:0 8px;cursor:pointer;white-space:nowrap;" +
        // 一顆就比整個框還長的主題:出省略號,不要撐破框
        "flex:0 0 auto;max-width:100%;overflow:hidden;text-overflow:ellipsis;" +
        "box-shadow:none;border:1px solid " + (已釘 ? "currentColor" : "transparent") + ";" +
        "display:inline-flex;align-items:center;gap:3px;");
      if (已釘) 圖(b, "pin", 10);
      const 字 = b.createSpan({ text: t });
      st(字, "min-width:0;overflow:hidden;text-overflow:ellipsis;");
      b.title = t + " · " + (次[t] || 0) + " " + T.cards + "\n" + (已釘 ? T.unpinTopic : T.pinTopic) + " → 右鍵";
      b.onclick = () => this.帶入主題(t);
      b.oncontextmenu = (e) => {
        e.preventDefault(); e.stopPropagation();
        const m = new Menu();
        m.addItem(i => i.setTitle(已釘 ? T.unpinTopic : T.pinTopic).setIcon(已釘 ? "pin-off" : "pin")
          .onClick(() => this.切主題釘選(t)));
        m.showAtMouseEvent(e);
      };
    });
    if (!全主題.length) st(常框.createDiv({ text: T.noTopics }),
      "font-size:0.72em;color:var(--text-faint);");
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
    this.__記題 = null; this.__記前 = null;
    this.畫();
    setTimeout(() => this.聚焦輸入(), 0);
  }
  /* 點主題膠囊 / 常用主題:把主題帶進輸入框(等於用它搜尋),游標跳到內容 */
  /* 1.6.3:點常用主題 / 卡片上的主題膠囊 = 在輸入框**最前面**放一個 #主題(已經有就不重複),等於用它搜尋 */
  帶入主題(名) {
    const s = this.狀態;
    /* C22:帶進輸入框的也先截到 6 個中文字 —— 使用者看到的就是等一下會寫進筆記的字(原則 10)。
       舊筆記裡比較長的主題照樣搜得到:搜尋是前綴比對。 */
    const 題 = 題限(題正(名));
    if (!題) return;
    const 現 = String(this.內輸 ? this.內輸.value : s.新內容 || "");
    const 析 = 析輸入(現, this.名單);
    const 新 = 析.題們.indexOf(題) >= 0 ? 現 : ("#" + 題 + " " + 現.replace(/^[ \t]+/, ""));
    s.新主題 = ""; s.新內容 = 新;
    if (this.內輸) this.內輸.value = 新;
    this.__記題 = null;
    this.記主題分類(this.卡片, 題);
    s.主題 = null;
    s.搜尋 = 新.trim();
    this.畫();
    setTimeout(() => this.聚焦輸入(), 0);
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
      let 迄 = 框.selectionStart;
      if (v.slice(迄, 迄 + 2) === "]]") 迄 += 2;
      const 落 = 起位 + f.basename.length + 4;
      關();
      // 1.6.1:走 可復原換,Ctrl+Z 退得回來(execCommand 自己會發 input 事件)
      const 有發 = 可復原換(框, 起位, 迄, "[[" + f.basename + "]]");
      try { 框.setSelectionRange(落, 落); } catch (e) {}
      if (!有發) 框.dispatchEvent(new Event("input", { bubbles: true }));
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
    const 觸 = e.currentTarget;          // 1.5 修:再按一次「☰」是關掉,不是關了又開(mousedown 先關、click 又開)
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
        // 1.4.7:每一列右邊一顆 📌,點了就釘選 / 取消,面板不關
        const 已釘 = this.釘選主題們.indexOf(t) >= 0;
        const 釘鈕 = 行.createDiv();
        st(釘鈕, "display:inline-flex;line-height:0;cursor:pointer;padding:3px;border-radius:4px;flex:0 0 auto;" +
          "color:" + (已釘 ? "var(--text-accent)" : "var(--text-faint)") + ";" + (已釘 ? "" : "opacity:0.5;"));
        圖(釘鈕, "pin", 12);
        釘鈕.title = 已釘 ? T.unpinTopic : T.pinTopic;
        釘鈕.onclick = async (ev) => { ev.stopPropagation(); await this.切主題釘選(t); 畫單(); };
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
    const 外 = (ev) => { if (!盒.contains(ev.target) && !(觸 && 觸.contains(ev.target))) 關(); };
    setTimeout(() => { document.addEventListener("mousedown", 外, true); try { 查.focus(); } catch (x) {} }, 0);
  }

  async 切主題釘選(題) {
    const 設 = this.插件.設定, p = this.file ? this.file.path : "";
    if (!p) return;
    const m = (設.釘選主題 && !Array.isArray(設.釘選主題)) ? 設.釘選主題 : {};
    const 單 = (m[p] || []).slice();
    const i = 單.indexOf(題);
    if (i >= 0) 單.splice(i, 1); else 單.push(題);
    m[p] = 單;                 // 全部取消也留一個空陣列:這份筆記不會再去認領舊的釘選
    設.釘選主題 = m;
    await this.插件.存設定();
    this.畫();
  }
  /* 1.4.7–1.4.9 的釘選是所有筆記共用一個陣列(onload 搬到 釘選主題_舊)。
     一份筆記第一次打開、而且還沒有自己的釘選時,把舊陣列裡「這份筆記真的有」的主題認領過來 ——
     原本在用的看板保住它的釘選,新開的空白筆記什麼都沒有。 */
  認領舊釘選(全) {
    const 設 = this.插件.設定, 舊 = 設.釘選主題_舊, p = this.file ? this.file.path : "";
    if (!p || !Array.isArray(舊) || !舊.length) return;
    const m = (設.釘選主題 && !Array.isArray(設.釘選主題)) ? 設.釘選主題 : {};
    if (Object.prototype.hasOwnProperty.call(m, p)) return;
    const 有 = 舊.filter(t => 全.some(k => k.主題 === t));
    if (!有.length) return;
    m[p] = 有;
    設.釘選主題 = m;
    this.插件.存設定();
  }

  // 常用主題膠囊的顏色:1.6 起看這個主題**最近一次**寫在哪個分類(以前是檔案裡第一張)
  主題分類(全, 題) { return this.主題最近分類(全, 題) || ""; }
  主題最近分類(全, 題) {
    const 活區 = this.分類清單.filter(x => !/archive|封存/i.test(x));
    let 最 = null;
    全.forEach(k => {
      if (k.主題 !== 題 || 活區.indexOf(k.分類) < 0) return;
      if (!最 || String(k.編修戳 || "") > String(最.編修戳 || "")) 最 = k;
    });
    return 最 ? 最.分類 : null;
  }
  /* 1.6:打出(或點選)一個用過的主題 → 新卡片的分類換成那個主題**上一次寫進去的分類**
     (「訂貨」上次放紫色,下次打訂貨或點常用主題就自動跳紫色)。
     同一個主題只帶一次:帶完之後使用者自己換了分類,繼續打字不會又被蓋回去。 */
  記主題分類(全, 題) {
    /* 1.6(使用者):**一字不差**才算(不去頭尾空白)。不再相符 → 退回換色之前的分類,
       除非使用者在中間自己換過分類(那就尊重他選的)。以前對上一次就一直留著那個顏色,打別的字也還是那個色。 */
    const s = this.狀態, t = String(題 || "");
    const 區 = t ? this.主題最近分類(全, t) : null;
    const 上色 = () => { if (this.套新分類色 && this.題輸 && this.題輸.isConnected) this.套新分類色(); };
    if (!區) {
      if (this.__記題 && this.__記前 && s.新分類 === this.__記後 && this.__記前 !== s.新分類) { s.新分類 = this.__記前; 上色(); }
      this.__記題 = null; this.__記前 = null; this.__記後 = null;
      return;
    }
    if (t === this.__記題) return;
    if (!this.__記題) this.__記前 = s.新分類;          // 第一次對上:記住原本的分類
    this.__記題 = t; this.__記後 = 區;
    if (區 !== s.新分類) { s.新分類 = 區; 上色(); }
  }
  // 所有用過的主題:這份筆記釘選的在前,其他照最近動過
  主題清單(全) {
    const 新 = Object.create(null);
    全.forEach(k => {
      if (!k.主題) return;
      const t = String(k.編修戳 || "");
      if (!(k.主題 in 新) || t > 新[k.主題]) 新[k.主題] = t;
    });
    const 釘 = this.釘選主題們.filter(t => t in 新);
    return 釘.concat(Object.keys(新).filter(t => 釘.indexOf(t) < 0).sort((a, b) => 新[b].localeCompare(新[a])));
  }
  /* 1.6:主題框的下拉建議 —— 打字就列出用過、而且含這幾個字的主題;框是空的時候按 ↓ 列出全部。
     ↑↓ 選、Enter / Tab 帶入、Esc 關掉。⚠ 沒有選中任何一個的時候,Enter 照舊是「跳到內容框」,不攔。
     ⚠ 用 stopImmediatePropagation:capture 跟框自己的 onkeydown 在同一個元素上,只擋冒泡擋不住它
       (Esc 會連搜尋一起清掉)。 */
  掛主題建議(框, 全) {
    let 面板 = null, 候選 = [], 選中 = -1;
    const 主題們 = this.主題清單(全);
    const 關 = () => {
      if (面板) { try { 面板.remove(); } catch (e) {} 面板 = null; }
      候選 = []; 選中 = -1;
    };
    const 擋 = (e) => { e.preventDefault(); e.stopImmediatePropagation(); };
    const 帶 = (i) => { const t = 候選[i]; 關(); if (t) this.帶入主題(t); };
    const 畫 = () => {
      if (!框.isConnected) { 關(); return; }
      if (!面板) {
        面板 = document.body.createDiv();
        面板.addClass("tk-可捲"); 面板.addClass("tk-主題建議");
        st(面板, "position:fixed;z-index:10000;max-height:230px;overflow-y:auto;box-sizing:border-box;" +
          "padding:4px;border-radius:8px;background:var(--background-primary);" +
          "border:1px solid var(--background-modifier-border);box-shadow:0 6px 22px rgba(0,0,0,0.34);");
      }
      const r = 框.getBoundingClientRect();
      const 寬 = Math.max(200, Math.round(r.width));
      面板.style.width = 寬 + "px";
      面板.style.left = Math.max(6, Math.min(r.left, window.innerWidth - 寬 - 6)) + "px";
      面板.style.top = Math.min(r.bottom + 4, window.innerHeight - 240) + "px";
      面板.empty();
      候選.forEach((t, i) => {
        const 行 = 面板.createDiv();
        st(行, "display:flex;align-items:center;gap:7px;padding:3px 7px;border-radius:5px;cursor:pointer;font-size:0.84em;" +
          (i === 選中 ? "background:var(--background-modifier-hover);" : ""));
        st(行.createDiv(), "flex:0 0 8px;width:8px;height:8px;border-radius:50%;" +
          "background:" + this.插件.分類色(this.主題分類(全, t)) + ";");
        st(行.createDiv({ text: t }), "flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" +
          (i === 選中 ? "font-weight:700;" : ""));
        if (this.釘選主題們.indexOf(t) >= 0) {
          const 釘 = 行.createDiv();
          st(釘, "display:inline-flex;line-height:0;color:var(--text-faint);");
          圖(釘, "pin", 11);
        }
        行.onmousedown = (e) => { e.preventDefault(); 帶(i); };
      });
    };
    const 查 = (全部) => {
      const q = String(框.value || "").trim().toLowerCase();
      候選 = 主題們.filter(t => {
        if (全部) return true;
        const x = t.toLowerCase();
        return !!q && x.indexOf(q) >= 0 && x !== q;       // 已經打得一模一樣就不必再列它
      }).slice(0, 40);
      選中 = -1;
      if (!候選.length) { 關(); return; }
      畫();
    };
    框.addEventListener("input", () => 查(false));
    框.addEventListener("blur", () => setTimeout(關, 140));
    框.addEventListener("keydown", (e) => {
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === "ArrowDown") {
        擋(e);
        if (!面板) { 查(!String(框.value || "").trim()); if (面板) { 選中 = 0; 畫(); } return; }
        選中 = (選中 + 1) % 候選.length; 畫(); return;
      }
      if (!面板) return;
      if (e.key === "ArrowUp") { 擋(e); 選中 = 選中 <= 0 ? 候選.length - 1 : 選中 - 1; 畫(); return; }
      if ((是Enter鍵(e) || e.key === "Tab") && 選中 >= 0 && !是送出(e)) { 擋(e); 帶(選中); return; }
      if (e.key === "Escape" || e.code === "Escape") { 擋(e); 關(); }
    }, true);
  }
  // 新卡片會被放到哪一天:完全看上面統計列現在選的是哪一格
  /* 新卡片會被放到哪一天,完全看上面統計列現在選的是哪一格:
       今日 → 今天 ‧ 選了一段 → 那一段 ‧ 週期 → 從今天開始、每週一次(1.5,長期拿掉了) */
  新增日期() {
    const f = this.狀態.篩 || {};
    if (f.型 === "週期") return { 起: this.今, 迄: null, 週期: true };
    const 區 = this.現在區間();
    if (區 && 區[0]) return { 起: 區[0], 迄: (區[1] && 區[1] !== 區[0]) ? 區[1] : null };
    return { 起: this.今, 迄: null };
  }
  新增去向文() {
    const d = this.新增日期();
    if (d.週期) return this.T.longTerm;
    if (!d.起) return this.T.undated;
    return 日期短(d.起) + (d.迄 ? " – " + 日期短(d.迄) : "");
  }
  // 短版(1.4.7):放進送出鈕、收合的標題列。同一年不寫年份,跨年才拿掉星期
  新增去向短() {
    const d = this.新增日期();
    if (d.週期) return this.T.longTerm;
    if (!d.起) return this.T.undated;
    return 日期無週字(d.起, d.迄);        // 1.6:送出鈕上不寫星期(手機上「09-14(一) – 09-20(日)」放不下)
  }

  /* ============================================================
     1.6 分類與指派人設定(新增卡片標題列的「⋯」切換進來)
     ------------------------------------------------------------
     左半邊分類(名稱、顏色、新增、刪除)、右半邊指派人(開關、名稱、顏色、這台電腦是誰)。
     ⚠ 全部先改在草稿(this.設草)上,按 ✓ 才一次寫進去;按 ↩ 或再按一次「⋯」放棄,有改過會先問。
     ⚠ 筆記裡的標題(新增、刪除、改名、搬卡片)在**同一次原子寫入**裡做完(寫手.改分類們),
       中途對不上就整份不動。
     ⚠ 分類的自動顏色是照順序配的:刪掉前面一個,後面的會全部換色。所以存的時候
       「原本就是自動色、而且位置變了」的分類,把它現在的顏色釘住 —— 畫面上看到什麼,存完就是什麼。
     ============================================================ */
  建設草() {
    const 設 = this.插件.設定, 我 = 讀我是誰();
    let 號 = 0;
    const 草 = {
      分類: this.分類清單.filter(x => !/archive|封存/i.test(x)).map(n => {
        const 色 = (設.分類顏色 || {})[n] || null;
        return { id: 號++, 原: n, 名: n, 色: 色, 原色: 色, 刪: false, 搬到: null };
      }),
      用人: !設.個人模式,
      人: (設.指派人 || []).map(n => ({ id: 號++, 原: n, 名: n, 色: (設.指派人顏色 || {})[n] || null, 刪: false })),
      我: ""
    };
    const 我項 = 草.人.find(x => x.原 === 我);
    草.我 = 我項 ? String(我項.id) : "";
    草.下號 = 號;
    草.原樣 = this.草指紋(草);
    return 草;
  }
  草指紋(草) { return JSON.stringify([草.分類, 草.用人, 草.人, 草.我]); }
  草改過() { return !!this.設草 && this.草指紋(this.設草) !== this.設草.原樣; }
  // 草稿裡一個分類現在該是什麼顏色(i = 它在還活著的分類裡排第幾)
  草分類色(項, i) {
    const 解 = (c) => 標籤色[c] || (是色碼(c) ? c : null);
    if (項.色 && 解(項.色)) return 解(項.色);
    if (項.原 && !項.原色) return 標籤色[自動色名[this.插件.分類序序號(項.原) % 自動色名.length]];
    // 新的分類剛好叫一個已經有顏色的名字(顏色照名字記、所有看板共用):存了之後就是那個顏色,先照它畫
    const 共用 = !項.原 ? (this.插件.設定.分類顏色 || {})[String(項.名 || "").trim()] : null;
    if (共用 && 解(共用)) return 解(共用);
    return 標籤色[自動色名[i % 自動色名.length]];
  }
  離開設定模式(然後) {
    const 走 = () => {
      this.狀態.設定模式 = false; this.設草 = null;
      if (然後) 然後(); else this.畫新增區(this.區.新增, this.卡片);
    };
    if (!this.草改過()) { 走(); return; }
    new 確認框(this.app, this.T.discardAsk, this.T.discard, 走).open();
  }

  畫設定面板(外塊) {
    const T = this.T, 草 = this.設草, 窄 = this.密;
    const 重畫 = (焦點) => { this.__設焦點 = 焦點 || null; this.畫新增區(this.區.新增, this.卡片); };
    const 淨 = (v) => String(v || "").replace(/[\r\n]+/g, " ").trim();
    const 本體 = 外塊.createDiv();
    本體.addClass("tk-設定面板");
    // 桌機左右兩半;手機太窄,上下疊(分類在上)
    st(本體, "display:flex;flex-direction:" + (窄 ? "column" : "row") + ";align-items:stretch;min-width:0;");
    // 左半的內容從 18 開始(Guide 18,跟卡片的字同一條線);右半接在分隔線後面
    // U41(Q40,使用者:「下面的留白收掉」):下面的內距從 10 收到 6
    const 半 = "flex:1 1 0;min-width:0;padding:8px 10px 6px;display:flex;flex-direction:column;gap:6px;box-sizing:border-box;";
    const 左 = 本體.createDiv(), 右 = 本體.createDiv();
    st(左, 半 + "padding-left:18px;");
    st(右, 半 + (窄 ? "border-top:1px solid var(--background-modifier-border);padding-left:18px;"
                    : "border-left:1px solid var(--background-modifier-border);"));
    /* 1.6:兩半的標題**只放圖示**(分類 swatch-book、封存 archive),名字在滑鼠提示
       (使用者 09-20 v13 連說兩次「不要文字」)。
       1.6.3(v13 #8):圖示後面接**數量**(幾個分類 / 幾區封存)。 */
    const 小標 = (容器, 圖名們, 提示, 數) => {
      const 行 = 容器.createDiv();
      st(行, "display:flex;align-items:center;gap:6px;min-height:22px;min-width:0;");
      const 框 = 行.createDiv();
      st(框, "display:inline-flex;align-items:center;line-height:0;color:var(--text-muted);");
      圖備(框, 圖名們, 15);
      框.setAttribute("aria-label", 提示);
      if (數 != null) 行.createDiv({ text: String(數) }).addClass("tk-頭數");
      return 行;
    };
    const 輸入樣 = "flex:1 1 auto;min-width:0;height:26px;min-height:0;font-size:0.84em;padding:0 7px;margin:0;" +
      "border-radius:5px;box-sizing:border-box;";
    const 圖鈕樣 = "display:inline-flex;align-items:center;justify-content:center;flex:0 0 22px;width:22px;height:22px;" +
      "border-radius:5px;cursor:pointer;line-height:0;color:var(--text-faint);";
    // 1.6.3 C18:「新增分類 / 新增指派人」加框,看得出是按鈕
    const 加樣 = "display:inline-flex;align-items:center;gap:5px;align-self:flex-start;cursor:pointer;" +
      "font-size:0.76em;color:var(--text-muted);padding:2px 8px;border-radius:5px;" +
      "border:1px solid var(--background-modifier-border);";
    const 六碼 = (c) => /^#[0-9a-f]{3}$/i.test(c) ? "#" + c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c;
    const 色圓 = (列, c, 改) => {
      const 圓 = 列.createDiv();
      st(圓, "position:relative;width:20px;height:20px;border-radius:50%;flex:0 0 auto;cursor:pointer;overflow:hidden;background:" + c + ";");
      圓.title = T.pickColor;
      const 色輸 = 圓.createEl("input", { type: "color" });
      色輸.value = 六碼(c);
      /* ⚠ width / height / min-width 要寫死:Chromium 給 input[type=color] 一個 26px 的固有寬度,
         只寫 inset:0 的話它還是撐到 26,check4 會報「裝不下自己」(20 的圓圈裡 26 的東西)。 */
      st(色輸, "position:absolute;inset:0;width:100%;height:100%;min-width:0;box-sizing:border-box;" +
        "opacity:0;cursor:pointer;padding:0;border:0;");
      // 拖色盤的時候只改這顆圓點(便宜),放開手才重畫(理由同 1.4 的色盤抖動)
      色輸.oninput = () => { 圓.style.background = 色輸.value; };
      /* 1.6.2(B2):手機上選色器**還開著**的時候就會觸發 change(每點一個顏色就一次)——
         那時候重畫整塊面板,選色器跟著被拆掉,看起來就是「一直跳掉」(使用者回報,卡片和這個面板都會)。
         手機:change 只改草稿和這顆圓點,等選色器關掉(blur)才重畫;桌機照舊,放開就重畫。 */
      let 待重畫 = false;
      色輸.onchange = () => {
        圓.style.background = 色輸.value;
        if (document.body.classList.contains("is-mobile")) { 待重畫 = true; 改(色輸.value, true); }
        else 改(色輸.value);
      };
      色輸.onblur = () => { if (待重畫) { 待重畫 = false; 改(色輸.value); } };
    };
    const 小圖鈕 = (列, 名們, 提示, 動作, 淡) => {
      const b = 列.createDiv();
      b.setAttribute("role", "button");
      st(b, 圖鈕樣 + (淡 ? "opacity:0.3;cursor:default;" : ""));
      圖備(b, 名們, 13);
      b.title = 提示;
      b.onclick = 動作;
      return b;
    };

    /* ---- 左半:分類 ---- */
    const 活 = 草.分類.filter(x => !x.刪);
    小標(左, ["swatch-book", "palette"], T.sections, 活.length);
    /* U41(Q39 / Q40):分類多的時候這一段自己捲(細深灰捲軸,見 styles.css 的 .tk-細捲),
       不要把整塊面板撐長、把卡片清單推到看不見的地方。mockup v16 的高度是 92。 */
    const 分表 = 左.createDiv();
    分表.addClass("tk-細捲");
    st(分表, "display:flex;flex-direction:column;gap:6px;min-width:0;max-height:92px;overflow-y:auto;");
    const 張數 = {};
    this.卡片.forEach(k => { 張數[k.分類] = (張數[k.分類] || 0) + 1; });
    活.forEach((項, i) => {
      const 列 = 分表.createDiv();
      st(列, "display:flex;align-items:center;gap:6px;min-width:0;");
      色圓(列, this.草分類色(項, i), (v, 先不重畫) => { 項.色 = v; if (!先不重畫) 重畫(); });
      const 名 = 列.createEl("input", { type: "text" });
      名.value = 項.名;
      名.placeholder = T.sectionNamePh;
      名.setAttribute("data-設", "分" + 項.id);
      st(名, 輸入樣);
      名.oninput = () => { 項.名 = 名.value; };
      const n = 項.原 ? (張數[項.原] || 0) : 0;
      st(列.createDiv({ text: n ? String(n) : "" }),
        "flex:0 0 18px;width:18px;text-align:right;font-size:0.7em;color:var(--text-faint);font-variant-numeric:tabular-nums;");
      if (項.色) 小圖鈕(列, ["rotate-ccw"], T.resetColor, () => { 項.色 = null; 重畫(); });
      /* 1.6.3(mockup v7)封存整個分類:按 ✓ 儲存時標題改成 `## Archive/分類名`(舊版照樣當封存);再按一次取消 */
      if (項.原) {
        /* 使用者 09-20:「按封存 會顯示一個預覽 跳到右邊分類封存區」——
           按下去除了記在草稿,還把右半邊切到這一區的預覽(清單就只剩那一區的卡片);再按一次收回去。 */
        const 封 = 小圖鈕(列, ["archive"], 項.封存 ? T.unarchiveSection : T.archiveSection, () => {
          項.封存 = !項.封存;
          const st狀 = this.狀態;
          if (項.封存) st狀.封存看 = 項.原;
          else if (st狀.封存看 === 項.原) st狀.封存看 = null;
          st狀.封存搜 = "";
          this.__設焦點 = null;
          this.畫();          // ⚠ 不是 重畫():預覽會換掉**卡片清單**,只重畫新增區看不到
        });
        if (項.封存) { 封.style.color = "var(--color-orange, #e08a2e)"; 列.style.opacity = "0.55"; }
      }
      const 最後一個 = 活.length <= 1;
      小圖鈕(列, ["x"], 最後一個 ? T.sectionLimit : T.deleteSection, (e) => {
        if (最後一個) { new Notice(T.sectionLimit); return; }
        if (!項.原) { 草.分類 = 草.分類.filter(x => x !== 項); 重畫(); return; }
        if (!n) { 項.刪 = true; 重畫(); return; }
        // 裡面有卡片:先問要搬到哪一個分類
        const m = new Menu();
        m.addItem(it => it.setTitle(T.moveCardsTo.replace("N", String(n))).setDisabled(true));
        活.filter(x => x !== 項).forEach(x => m.addItem(it => it
          .setTitle(淨(x.名) || "—").setIcon("arrow-right")
          .onClick(() => { 項.刪 = true; 項.搬到 = x.id; 重畫(); })));
        m.showAtMouseEvent(e);
      }, 最後一個);
    });
    if (活.length < 分類上限) {
      const 加 = 左.createDiv();
      加.setAttribute("role", "button");
      st(加, 加樣);
      // 1.6:只放圖示(字在滑鼠提示)
      圖備(加, ["circle-plus", "plus-circle", "plus"], 16);
      加.setAttribute("aria-label", T.addSection);
      加.onclick = () => {
        const id = 草.下號++;
        草.分類.push({ id: id, 原: null, 名: "", 色: null, 原色: null, 刪: false, 搬到: null });
        重畫("分" + id);
      };
    }
    // 準備刪掉的分類列在最底下,可以反悔
    const 找活 = (項) => { let x = 項; for (let i = 0; x && x.刪 && i < 50; i++) x = 草.分類.find(y => y.id === x.搬到); return (x && !x.刪) ? x : null; };
    草.分類.filter(x => x.刪 && x.原).forEach(項 => {
      const 行 = 左.createDiv();
      st(行, "display:flex;align-items:center;gap:6px;min-width:0;font-size:0.72em;color:var(--text-faint);");
      const 到 = 項.搬到 !== null ? 找活(項) : null;
      st(行.createDiv({ text: T.willDelete.replace("N", 項.原) + (到 ? "  → " + (淨(到.名) || "—") : "") }),
        "flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-decoration:line-through;");
      小圖鈕(行, ["undo-2", "undo", "rotate-ccw"], T.undoDelete, () => {
        if (活.length >= 分類上限) { new Notice(T.sectionLimit); return; }
        項.刪 = false; 項.搬到 = null; 重畫();
      });
    });

    /* ---- 右半:封存區(1.6.3 mockup v12 Q26)----
       以前這一半是指派人。使用者 09-20:「指派人顏色統一、使用者不能改、只能在全域 setting 設定;
       新增卡片的 ⋯ 留給封存區」—— 名單和「使用指派人」開關搬到 Obsidian 設定頁(見 class 設定頁)。
       ⚠ 左半是**草稿**(按 ✓ 才寫),右半的封存區是**立即生效**的瀏覽區:兩邊的動作不要混在一起。 */
    this.畫封存半(右, this.卡片, 小標);

    if (this.__設焦點) {
      const el = 本體.querySelector('[data-設="' + this.__設焦點 + '"]');
      this.__設焦點 = null;
      if (el) setTimeout(() => { try { el.focus({ preventScroll: true }); } catch (e) {} }, 0);
    }
  }

  async 存設草() {
    const T = this.T, 草 = this.設草, 設 = this.插件.設定, s = this.狀態;
    if (!草 || this.__存設中) return;
    const 淨 = (v) => String(v || "").replace(/[\r\n]+/g, " ").trim();

    const 活 = 草.分類.filter(x => !x.刪);
    const 名們 = 活.map(x => 淨(x.名));
    if (!活.length || 活.length > 分類上限) { new Notice(T.sectionLimit); return; }
    if (名們.some(n => !n)) { new Notice(T.sectionNameEmpty); return; }
    if (名們.some(n => /archive|封存/i.test(n))) { new Notice(T.sectionReserved); return; }
    if (new Set(名們).size !== 名們.length) { new Notice(T.sectionExists); return; }
    const 活人 = 草.人.filter(x => !x.刪 && 淨(x.名));
    const 人名 = 活人.map(x => 淨(x.名));
    if (new Set(人名).size !== 人名.length) { new Notice(T.dupName); return; }
    const 原人 = 草.人.filter(x => x.原).map(x => x.原);
    const 人改 = 活人.filter(x => x.原 && 淨(x.名) !== x.原);
    // 改成「另一個人原本的名字」(兩個人互換)會把兩邊的 #名字 混在一起,不做
    if (人改.some(x => 原人.indexOf(淨(x.名)) >= 0)) { new Notice(T.dupName); return; }

    // ⚠ 顏色要在寫檔**之前**算:寫完 setViewData 會重畫,分類順序就換成新的了
    const 舊自動 = {};
    活.forEach(x => { if (x.原) 舊自動[x.id] = 自動色名[this.插件.分類序序號(x.原) % 自動色名.length]; });
    const 舊人色 = {};
    活人.forEach(x => { if (x.原) 舊人色[x.id] = this.插件.人色(x.原); });

    const 找活 = (項) => { let x = 項; for (let i = 0; x && x.刪 && i < 50; i++) x = 草.分類.find(y => y.id === x.搬到); return (x && !x.刪) ? x : null; };
    const 計畫 = {
      新增: 活.filter(x => !x.原).map(x => 淨(x.名)),
      刪: 草.分類.filter(x => x.刪 && x.原).map(x => {
        const 到 = 找活(x) || 活[0];
        return [x.原, 到.原 ? { 名: 到.原, 新: false } : { 名: 淨(到.名), 新: true }];
      }),
      改名: 活.filter(x => x.原 && (x.封存 || 淨(x.名) !== x.原)).map(x => [x.原, x.封存 ? 封存題(淨(x.名)) : 淨(x.名)])
    };

    this.__存設中 = true;
    try {
      if (計畫.新增.length || 計畫.刪.length || 計畫.改名.length) {
        const ok = await this.插件.寫手.改分類們(this.file, 計畫);
        if (!ok) return;             // 寫手已經說過為什麼了;草稿留著,可以再按一次
      }
      for (const x of 人改) await this.插件.寫手.改指派人名(this.file, x.原, 淨(x.名));

      /* ⚠ 分類顏色是**所有看板共用、照名字記**的(另一份筆記也可能有一區叫「研究」)。
         所以只動這一次真的改到的鍵:選了顏色 → 寫;按了重設 → 刪;改名 → 搬到新名字。
         刪掉的分類、新增但沒選顏色的分類,鍵一律不碰(開發中曾經把別份看板「研究」的紫色刪掉)。 */
      const 色表 = Object.assign({}, 設.分類顏色 || {}), 名表 = Object.assign({}, 設.分類名稱 || {});
      const 有 = (m, k) => Object.prototype.hasOwnProperty.call(m, k);
      活.forEach((x, i) => {
        const n = 淨(x.名), 改名 = !!x.原 && x.原 !== n;
        if (改名) {
          if (有(名表, x.原)) { 名表[n] = 名表[x.原]; delete 名表[x.原]; }
          delete 色表[x.原];
        }
        if (x.色) 色表[n] = x.色;
        else if (x.原 && x.原色) delete 色表[n];                  // 原本有自訂色、按了重設
        else if (x.原 && 自動色名[i % 自動色名.length] !== 舊自動[x.id]) 色表[n] = 舊自動[x.id];   // 自動色因為位置變了會換 → 釘住
        else if (x.原 && 改名) delete 色表[n];                     // 改名成一個別處用過的名字:照自動色,不要撿到別人的
      });
      設.分類顏色 = 色表;
      設.分類名稱 = 名表;

      const 人色表 = Object.assign({}, 設.指派人顏色 || {});
      草.人.forEach(x => { if (x.原) delete 人色表[x.原]; });
      活人.forEach((x, i) => {
        const n = 淨(x.名);
        if (x.色) 人色表[n] = x.色;
        else if (x.原 && 舊人色[x.id] !== 人色盤[i % 人色盤.length]) 人色表[n] = 舊人色[x.id];   // 同上:位置變了就釘住原本的顏色
      });
      設.指派人顏色 = 人色表;
      設.指派人 = 人名;
      設.個人模式 = !草.用人;
      const 我項 = 活人.find(x => String(x.id) === 草.我);
      存我是誰(我項 ? 淨(我項.名) : null);

      // 新增卡片那一格選著的分類 / 指派人:改名跟著改,刪掉的清回預設
      const 選分 = 草.分類.find(x => x.原 && x.原 === s.新分類);
      if (選分) s.新分類 = 選分.刪 ? null : 淨(選分.名);
      const 選人 = 草.人.find(x => x.原 && x.原 === s.新指派);
      if (選人) s.新指派 = 選人.刪 ? null : 淨(選人.名);

      await this.插件.存設定();
      s.設定模式 = false;
      this.設草 = null;
      new Notice(T.saved);
      this.插件.重畫所有看板();
    } finally {
      this.__存設中 = false;
    }
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
    /* ⚠ 1.4.5:置頂的卡片獨立一張表,放在最上面;主清單只剩沒置頂的。
       以前置頂混在主清單最前面,標題寫「本日 3 張」底下卻多了兩張別天的置頂卡,數字對不上,
       也分不出哪幾張是「因為今天」、哪幾張是「因為置頂」才出現的。
       ⚠ 工具「⋯」、搜尋膠囊、融合列只放在**最上面那一張表**(有置頂就是置頂那張)。 */
    const 頂 = 顯.filter(k => k.置頂), 其餘 = 顯.filter(k => !k.置頂);
    if (頂.length) {
      const 頂塊 = this.畫卡片塊(根, { 標題: T.pinnedBlock, 圖示: "pin", 卡們: 頂, 帶工具: true, 全: 全,
        收合鍵: 置頂收合鍵 });
      頂塊.style.marginBottom = "5px";            // 1.5.1:12 → 5,塊跟塊之間緊一點
    }
    // 1.6:清單表也能收合,標題前面一顆篩選圖示(跟時間篩選收起來時的標題列同一個語言)
    this.畫卡片塊(根, { 標題: this.篩選標題(), 色: this.篩選色(), 卡們: 其餘, 帶工具: !頂.length, 全: 全,
      收合鍵: 清單收合鍵, 前圖示: ["filter", "list-filter"] });
  }

  /* 一張卡片表:標題列 + 表格(桌機)或一疊卡片(窄螢幕)。置頂表和主清單共用。 */
  畫卡片塊(根, 設) {
    const T = this.T;
    const 卡們 = 設.卡們;
    const 塊 = 根.createDiv();
    塊.addClass("tk-塊");
    st(塊, "border-radius:9px;" +
      "border:1px solid var(--background-modifier-border);background:var(--background-primary);" +
      "box-shadow:0 1px 3px rgba(0,0,0,0.16);");
    const 頭 = 塊.createDiv();
    /* 1.6.3:清單表的標題列跟其他塊**同一種**(.tk-塊頭):26 高、溝 3–18、第一個圖示 22。
       ⚠ 1.5.1 的「標題列跟著篩選格上色 + 左邊 3px 色帶」使用者 09-19(mockup v8 Q6)說**不要了**。 */
    頭.addClass("tk-塊頭");
    st(頭, "background:var(--background-secondary);" +
      "border-bottom:1px solid var(--background-modifier-border);");
    /* 可收合的表(1.4.5:置頂表)。收合狀態記在這台裝置。
       ⚠ 點標題列上的膠囊或「⋯」不算收合 —— 那些有自己的動作。 */
    const 收 = 設.收合鍵 ? 讀收合(設.收合鍵) : false;
    const 溝 = 頭.createDiv();
    溝.addClass("tk-溝");
    if (設.收合鍵) {
      頭.style.userSelect = "none";
      if (收) 頭.style.borderBottom = "0";
      圖(溝, 收 ? "chevron-right" : "chevron-down", 14);
      溝.setAttribute("role", "button"); 溝.setAttribute("tabindex", "0");
      溝.setAttribute("aria-label", 設.標題 + " · " + (收 ? T.unfold : T.fold));
      塊.setAttribute("data-fold-key", 設.收合鍵);
      頭.onclick = (e) => {
        if (e.target && e.target.closest && e.target.closest("button, .tk-工具群")) return;
        const 鍵 = 設.收合鍵;
        this.收合滑動(塊, !收, () => { 存收合(鍵, !收); this.重畫清單(); },
          () => this.區.清單.querySelector('[data-fold-key="' + 鍵 + '"]'));
      };
    } else 頭.style.cursor = "default";      // 沒有箭頭的表:溝留著空位,標題才對齊
    // 第一個圖示在 22(漏斗 / 📌)
    if (設.前圖示) {
      const 前 = 頭.createDiv();
      前.addClass("tk-頭圖");
      圖備(前, 設.前圖示, 13);
      前.setAttribute("aria-label", 設.標題);
    }
    if (設.圖示) {
      // 1.5.1:置頂表的標題列只放 📌 圖示,字留在 aria-label
      const 圖框 = 頭.createDiv();
      圖框.addClass("tk-頭圖");
      圖(圖框, 設.圖示, 14);
      圖框.setAttribute("aria-label", 設.標題);
    }
    /* 1.6.3(mockup v15 Q30、v16):**張數在日期前面** —— 掃的時候先看到「幾張」,再看是哪一天 */
    頭.createDiv({ text: (卡們.length + " " + T.cards).trim() }).addClass("tk-頭數");
    if (!設.圖示) 頭.createDiv({ text: 設.標題 }).addClass("tk-頭字");
    頭.createDiv().addClass("tk-撐");
    if (設.帶工具) this.畫標題工具(頭);
    if (收) return 塊;
    if (設.帶工具 && this.狀態.融合中) this.畫融合列(塊, 設.全);
    const 身外 = 塊.createDiv();
    st(身外, "overflow:visible;min-width:0;");   // ⚠ 不可以是 overflow-x:auto —— 那是左右抖動的元凶
    if (!卡們.length) {
      /* U53(Q7):空清單**只有一個淡的 inbox 圖示**,水平 + 垂直置中(不寫灰色說明字 —— ui-rules 第 3 節);
         字留在 aria-label(mockup v16:56 高、18px 圖示)。 */
      const 空 = 身外.createDiv();
      空.addClass("tk-空清單");
      空.setAttribute("aria-label", T.noCards);
      圖備(空, ["inbox", "archive", "package"], 18);
      return 塊;
    }
    // 不是表格,是一疊卡片(理由見 畫卡片)。1.6.3(B5)起桌機也一樣,表格那一條拿掉了
    const 群 = 身外.createDiv();
    群.addClass("tk-卡群");
    卡們.forEach(k => this.畫一列(群, k));
    return 塊;
  }

  /* 最上面那張表的標題列右邊:搜尋膠囊 · 指派人膠囊 · ⋯ */
  畫標題工具(頭) {
    const T = this.T;
    // ⚠ 這裡不再做搜尋欄 —— 搜尋就是上面的「主題 / 內容」框(同一個功能只給一個入口)
    /* ⚠ 1.4.4:搜尋膠囊只顯示**第一行**,後面的一律「…」。
       內容框也是搜尋框,內容一打多行,以前這顆膠囊就跟著一直變長、把標題列擠來擠去;
       而且字是塞在一個不能縮的 span 裡,超過 260px 直接被裁,連「✕」都被擠出去。
       現在:字那一格可以縮(min-width:0 + 省略號),✕ 永遠看得到。 */
    if (this.狀態.搜尋) {
      const 清 = 頭.createEl("button");
      st(清, "font-size:0.72em;height:21px;min-height:0;padding:0 9px;border-radius:10px;cursor:pointer;" +
        "box-shadow:none;color:var(--text-muted);border:1px solid var(--background-modifier-border);" +      // 1.6.3 C1:灰
        "display:inline-flex;align-items:center;gap:4px;flex:0 1 auto;min-width:0;" +
        "max-width:" + ("44%") + ";overflow:hidden;white-space:nowrap;");
      圖(清, "search", 12);
      const 行們 = String(this.狀態.搜尋).split("\n").map(x => x.trim()).filter(Boolean);
      // 1.6.3 C1:最多 6 個中文字寬,其他變「…」
      let 顯 = 截寬(行們[0] || "", 12);
      if (行們.length > 1 && !顯.endsWith("…")) 顯 += "…";
      const 字 = 清.createSpan({ text: 顯 });
      st(字, "flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;");
      圖(清, "x", 12);
      清.title = this.狀態.搜尋 + "\n\n" + T.clearSearch;
      清.onclick = () => this.清除搜尋();
    }
    if (this.狀態.指派) {
      const 清 = 頭.createEl("button");
      st(清, "font-size:0.72em;height:21px;padding:0 8px;border-radius:10px;cursor:pointer;box-shadow:none;");
      圖鈕(清, "x", this.狀態.指派, 12);
      清.onclick = () => { this.狀態.指派 = null; this.畫(); };
    }
    this.畫工具群(頭);
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
    頭.addClass("tk-塊頭");
    頭.style.cursor = "default";
    st(頭, "background:var(--background-secondary);" +
      "border-bottom:1px solid var(--background-modifier-border);");
    頭.createDiv().addClass("tk-溝");              // 沒有收合箭頭,但溝要留著,後面的東西才在 22
    const 圖框 = 頭.createDiv();
    圖框.addClass("tk-頭圖");
    圖備(圖框, ["calendar-off", "calendar-x", "calendar"], 13);
    圖框.setAttribute("aria-label", T.undatedBlock);
    頭.createDiv({ text: (未.length + " " + T.cards).trim() }).addClass("tk-頭數");   // 張數在前(Q30)
    頭.createDiv({ text: T.undatedBlock }).addClass("tk-頭字");
    const 身外 = 塊.createDiv();
    st(身外, "overflow:visible;min-width:0;");
    const 群 = 身外.createDiv();
    群.addClass("tk-卡群");
    未.forEach(k => this.畫一列(群, k, true));
  }

  /* 表格標題列右上角:一顆「⋯」,裡面是 全部展開 / 排序 / 融合 / 輸出 / 版面寬度。
     ⚠ 1.4.5 起桌機也收進選單。以前桌機是三顆字鈕加一個排序下拉,
       佔掉整條標題列的右半邊,而且那幾個都是一週按不到一次的東西。 */
  畫工具群(頭) {
    const 群 = 頭.createDiv();
    群.addClass("tk-工具群");
    st(群, "display:flex;gap:6px;align-items:center;margin-left:auto;flex:0 0 auto;");
    群.onclick = (e) => e.stopPropagation();
    this.畫工具選單(群);
  }

  /* 真手機寬度:一張卡片右上角只留一顆「⋯」,裡面是封存 / 留言 / 刪除。 */
  畫卡片工具選單(盒, k, 已封存, 具樣) {
    const T = this.T, s = this.狀態;
    const 更 = 膠囊(盒, "");
    st(更, 具樣("var(--text-muted)", 26));
    圖(更, "ellipsis", 14);
    更.title = T.tools;
    更.onclick = (e) => {
      e.stopPropagation();
      const m = new Menu();
      /* 1.6.2(B2):卡片模式(手機)沒有分類欄,點色條、分類名以前都沒反應 —— 換分類放進這個「⋯」(使用者要的) */
      if (!已封存) {
        m.addItem((i) => i.setTitle(T.changeSectionMenu).setIcon("palette")
          .onClick(() => this.開分類清單(更, k.分類, (n) => this.搬去分類(k, n))));
      }
      /* 1.6.3(mockup v7)單張卡片不再封存 —— 封存是整個分類(分類設定裡)。
         以前單張封存的卡片照舊可以取消封存(1.6.2 B6:先問回哪一區)。 */
      if (已封存) {
        m.addItem((i) => i.setTitle(T.unarchive).setIcon("archive-restore")
          .onClick(() => this.選區取消封存(更, k)));
      }
      if (!已封存 && this.用留言) {
        m.addItem((i) => i.setTitle(T.comment).setIcon("message-square")
          .onClick(async () => {
            if (s.編修) await this.收掉編修();   // 編修框要被換掉了,先把字寫進去
            s.寫留言 = (s.寫留言 === k.鍵) ? null : k.鍵;
            s.編修 = null;
            this.重畫清單();
          }));
      }
      // 窄螢幕的主題那一行不顯示最後編輯時間(1.4.5),收在這裡
      if (k.編修時 && this.顯示編時) {
        m.addSeparator();
        m.addItem((i) => i.setTitle(T.lastEdited + "  " + k.編修時).setIcon("clock").setDisabled(true));
      }
      // 刪除放最後(不可回復的動作),會再問一次
      m.addSeparator();
      m.addItem((i) => { i.setTitle(T.deleteCard).setIcon("trash-2").onClick(() => this.問刪除(k)); try { i.setWarning(true); } catch (x) {} });
      m.showAtMouseEvent(e);
    };
  }

  /* 窄螢幕的工具列:一顆「⋯」裝下全部。
     ⚠ 排序在這裡不是下拉而是三個帶勾的選項 —— 選單裡再塞一個 <select> 很難按。 */
  畫工具選單(群) {
    const T = this.T, s = this.狀態, 設 = this.插件.設定;
    const 鈕 = 群.createEl("button");
    // ⚠ height 一定要寫:手機版 Obsidian 的 button 預設 44px 高,這顆會被撐成一塊方磚
    /* 1.5.1:長得跟「新增卡片」標題列右上角的「⋯」一樣 —— 沒有框、沒有底色,就是一顆淡色圖示。
       手機保留 28px 高的點擊範圍;展開全部 / 融合中的時候圖示變重點色。 */
    // 桌機 16px 高:跟新增卡片的「⋯」一樣,不把置頂表的標題列撐高(量過 22px 的鈕讓標題列變 30.5px)
    // 1.6.3:26 × 22、沒有左右內距 —— 14px 的圖示置中之後,右緣跟卡片和標題列的 ⋯ 對齊(M4)
    st(鈕, "height:22px;width:26px;min-height:0;padding:0;line-height:0;cursor:pointer;border-radius:5px;" +
      "display:inline-flex;align-items:center;justify-content:center;" +
      "white-space:nowrap;flex:0 0 auto;box-shadow:none;border:0;background:transparent;" +
      ((s.展開全部 || s.融合中) ? "color:var(--text-accent);" : "color:var(--text-muted);"));
    圖鈕(鈕, "ellipsis", "", 14);
    鈕.title = T.tools;
    鈕.onclick = (e) => {
      e.stopPropagation();
      const m = new Menu();
      m.addItem((i) => i
        .setTitle(s.展開全部 ? T.collapseAll : T.expandAll)
        .setIcon(s.展開全部 ? "chevrons-down-up" : "chevrons-up-down")
        .onClick(() => { s.展開全部 = !s.展開全部; s.展開 = {}; this.重畫清單(); }));
      m.addSeparator();
      // 1.6.3 C3:最近 / 日期 / 順序
      [["編修", T.sortEdited, "clock"], ["顏色", T.sortColor, ["calendar-minus-2", "calendar-minus"]],
       ["檔案", T.sortFile, "grip-vertical"]].forEach(([v, t, 名]) => {
        m.addItem((i) => 選單圖(i, 名)
          .setTitle(t)
          .setChecked(設.排序 === v || (v === "編修" && ["顏色", "檔案"].indexOf(設.排序) < 0))
          .onClick(async () => { 設.排序 = v; await this.插件.存設定(); this.重畫清單(); }));
      });
      m.addSeparator();
      m.addItem((i) => 選單圖(i, "git-fork", 90)      // 1.6.3 C3
        .setTitle(T.merge).setChecked(!!s.融合中)
        .onClick(() => { s.融合中 = !s.融合中; s.融合選 = {}; this.重畫清單(); }));
      // 1.6.2(B7):只留長圖;PDF 拿掉了(Obsidian 會擋開新視窗,手機也沒有列印)
      m.addItem((i) => i.setTitle(T.exportPng).setIcon("image").onClick(() => this.輸出()));
      // 版面寬度只對桌機有意義(手機、窄分頁本來就用滿畫面)。1.6.3:看 觸 / 密,不看 窄
      if (!this.觸 && !this.密) {
        m.addSeparator();
        const 寬版 = 設.版面寬度 === "寬";
        m.addItem((i) => 選單圖(i, 寬版 ? "chevrons-right-left" : "chevrons-left-right")      // 1.6.3 C3
          .setTitle(寬版 ? T.layoutToggleNarrow : T.layoutToggleWide)
          .onClick(async () => {
            設.版面寬度 = 寬版 ? "窄" : "寬";
            await this.插件.存設定();
            this.插件.重畫所有看板();
          }));
      }
      m.showAtMouseEvent(e);
    };
  }

  畫融合勾(格, k) {
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
       ・日期不一樣就寫成區間 @{最早} ~ @{最晚};都一樣就是那一天
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

    // 1.6.1:有主題的話主卡的內容全部放第二行以下;沒有主題的,主卡第一行內容留在第一行(不重複)
    // 1.6.1:每一行帶著它原本的符號搬過來(既往不咎)
    // 1.6.2(B3):每張卡片的內容照原文搬(巢狀縮排、空行都在),不再從剝掉縮排的 內容行 拼回去
    const 原行們 = (k) => (k.內容原 || []).slice();
    const 主行 = 原行們(主);
    const 首文 = (!題 && 主行.length && !/^\s/.test(主行[0]) && 可放首行(主行[0])) ? 主行[0] : "";
    const 尾 = [];
    排.forEach((k, i) => {
      const 行們 = (i === 0 && 首文) ? 主行.slice(1) : 原行們(k);
      /* 1.6:日期**自己一行**,那張卡片的內容排在它底下。
         以前日期黏在第一行內容前面(「09-14(一)  打給廠商」),日期和內容擠成一句,掃過去分不出來。
         ⚠ 內容跟日期同一層(一個 tab):以前寫的兩個 tab 會被 寫手.一行() 壓成一個空白,寫進筆記變成「 ．…」。 */
      if (i > 0 && 行們.length && k.起日) 尾.push("\t" + 符() + 日期短(k.起日));
      行們.forEach(t => 尾.push(t ? "\t" + t : ""));
    });
    // 留言全部搬進來,新到舊
    const 留 = [];
    選.forEach(k => k.留言.forEach(c => 留.push(c)));
    留.sort((a, b) => (b.日 + b.分).localeCompare(a.日 + a.分));
    const 留行 = 留.map(c => 組留言行文(c.日, c.分, c.人, c.文));

    const 首行 = 組首行({ 題: 題 || null, 文: 首文, 起: 起, 迄: 迄, 人: 人, 頂: 頂 });

    // 1.6.1 順序:內容 → 留言 → [ed::](最後一行)
    const ok = await this.插件.寫手.融合(this.file, 選, 主.分類, 首行, 尾.concat(留行, [組編行(現在戳())]), this.名單);
    if (ok) {
      this.狀態.融合中 = false; this.狀態.融合選 = {};
      new Notice(T.merged.replace("N", String(選.length)));
    }
  }

  篩選標題() {
    const T = this.T, f = this.狀態.篩 || {}, s = this.狀態;
    /* 1.5.1:日期一律用 日期範圍字(今年不寫年份,跟新增卡片收起來時的「09-15(二)」同一種寫法)。
       以前這裡是「26-09-15(二)」和「9/14 – 9/20」兩種,兩個控制塊收起來並排時看起來不一樣。 */
    if (f.型 === "範圍") return 日期範圍字(s.起, s.迄 !== s.起 ? s.迄 : null);
    // 1.6:寫實際的那一天 / 那一週 / 那個月 —— 游標不一定在今天,不能再寫「本日」「本周」
    if (f.型 === "今日") return 日期範圍字(s.游標 || this.今);
    if (f.型 === "7天內") { const r = this.現在區間(); return 日期範圍字(r[0], r[1]); }
    if (f.型 === "本月") { const r = this.現在區間(); return 月年字(r[0], T) + "  " + 日期範圍字(r[0], r[1]); }
    if (f.型 === "年度") return s.統計年;
    return { 全部: T.all, 逾期: T.overdue, 週期: T.longTerm }[f.型] || T.all;
  }

  /* ⚠⚠ 1.5.1:日期區間中間那條線要**對齊到整數裝置像素**才不會糊。
     光有 crispEdges 不夠:整條線置中之後,它的左邊常常落在 391.4px 這種位置,
     再乘上 Obsidian 的縮放(devicePixelRatio 1.2),寬 2px 的線變成 2.4 個裝置像素、跨在像素中間 ——
     瀏覽器只好把它反鋸齒成一條灰霧。所以畫完(和視窗變寬變窄)之後量一次,
     寬高取整數裝置像素、位置用 transform 補到整數上。 */
  排對齊線() {
    if (this.__排了對齊線) return;
    this.__排了對齊線 = true;
    // ⚠ 用 setTimeout 不用 requestAnimationFrame:Obsidian 視窗沒有焦點的時候 rAF 不會跑(測試時量到線完全沒對齊)
    setTimeout(() => { this.__排了對齊線 = false; try { this.對齊日期線(); } catch (e) {} }, 30);
  }
  對齊日期線() {
    const dpr = window.devicePixelRatio || 1;
    const 整 = (css) => Math.max(1, Math.round(css * dpr)) / dpr;      // 最接近的整數裝置像素,換回 CSS px
    this.contentEl.querySelectorAll(".tk-date-bar svg").forEach(g => {
      g.style.transform = "";
      g.style.width = 整(2) + "px";
      g.style.height = 整(10) + "px";
      const r = g.getBoundingClientRect();
      const dx = Math.round(r.left * dpr) / dpr - r.left;
      const dy = Math.round(r.top * dpr) / dpr - r.top;
      if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) g.style.transform = "translate(" + dx + "px," + dy + "px)";
    });
  }

  /* 清單表標題列的顏色(1.5.1):跟上面那一格篩選同一個顏色。全部 / 沒有對應的格子 → null(不上色) */
  篩選色() {
    const f = this.狀態.篩 || {};
    const 色表 = {
      今日: "var(--color-orange, #e08a2e)", "7天內": "var(--color-yellow, #c99a2e)", 本月: "var(--color-cyan, #45a7bd)",
      年度: "var(--text-accent)", 逾期: "var(--color-red, #e05252)", 週期: "var(--color-purple, #8a6ed4)"
    };
    if (f.型 === "範圍") return 色表[f.來源] || "var(--text-accent)";   // 行事曆選的區間沒有來源 → 重點色
    return 色表[f.型] || null;
  }

  畫一列(身, k, 未定) {
    /* 1.6.3(B5)只剩卡片版面:每一列都是 <div>(見 畫卡片)。以前桌機是 <tr>,所以「找這一列」一律用 .tk-列 / .tk-格。 */
    const 列 = 身.createDiv();
    列.addClass("tk-列");
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
    this.畫卡片(列, k, 未定);
  }

  /* ============================================================
     窄螢幕的一張卡片
     ------------------------------------------------------------
       卡頭  📌 ◯ 26-09-12(六) – 09-15(二) ·········· 嘉峻  ⋯
       ─────────────────────────────────────────  ← 分隔線
       內容  [主題] ✎ ✓已完成 ◉每週 延 ··········· 💬2 🕐14:30  ✎
             留言 / 內容(整個卡片寬)
     ⚠⚠ 1.4.4 以前窄螢幕是**同一份 <table>**,用 CSS 把 <td> 設成 display:contents
       攤平,再用 order 把各格裡面的東西重新排。三個問題一路跟著:
         ① display:contents 在審核的相容性檢查裡是「部分支援」;
         ② 桌機的排版有很多是 st() 寫的 inline style,CSS 要蓋掉只能 !important(78 個);
         ③ 佈景主題會畫表格的格線,攤平之後變成卡片裡莫名的細線,又要 !important 去壓。
       現在窄螢幕直接畫成 div:每一塊在哪裡是 **DOM 的順序**決定的,不是 order;
       inline 寫的就是窄螢幕要的值,沒有東西需要被蓋掉;不是 <table>,主題的表格規則碰不到。
     ⚠ 完成圈排在日期**前面**、指派人排在「⋯」**左邊**:
       日期的 x 不會被名字長短推動,右上角那一組永遠貼齊。
     ⚠ 卡頭**不准換行**(CSS 寫 nowrap):flex 是先斷行後壓縮,差 2px 就會整塊掉下去。
       放不下的時候壓縮的是日期和名字(兩個都有省略號),不是把「⋯」擠到第二行。
     ============================================================ */
  /* 1.6.3(mockup v7)卡片沒有卡頭了:
       ▌ #主題 #主題 ·········· 💬 (頭像) 日期 📌 ✎ ⋯
       ▌ 內容
     左邊 5px 的分類色條 = 完成鈕(點了完成、再點一次復原;循環卡 = 本次完成),滑過變寬出 ✓、上面浮出分類名。
     字一律從 18px 開始(styles.css 的 .tk-列 > .tk-格),見技能 card-table-ui-rules 的「三條線」。 */
  畫卡片(列, k, 未定) {
    列.__未定 = !!未定;
    this.畫色條(列, k);
    /* 📌 在色條上面(✓ 的上方,使用者 09-19 v7 留言):釘住的一直在;沒釘的滑過卡片才出現,色條往下讓位 */
    if (!未定 && !this.是封存(k)) {
      const 釘 = this.畫釘(列, k);
      釘.addClass("tk-溝釘");
      if (k.置頂) 列.addClass("tk-頂列");
    }
    const 內 = 列.createDiv();
    內.addClass("tk-格");
    內.setAttribute("data-col", "內容");
    this.畫內文(內, k, 列);
  }

  /* 1.6.3 分類色條 = 完成鈕(取代完成圓點)。剛按過的 2 秒內是「↺ 反悔」。 */
  畫色條(列, k) {
    const T = this.T;
    const 條 = 列.createDiv();
    條.addClass("tk-色條");
    條.setAttribute("role", "button");
    條.setAttribute("tabindex", "0");
    const 剛 = this.剛動過 && this.剛動過[k.鍵];
    if (剛 && Date.now() - 剛.時 < 反悔毫秒) {
      條.addClass("tk-色條-復");
      圖備(條, ["rotate-ccw", "undo"], 10);
      條.setAttribute("aria-label", 剛.說 + " —— " + T.undo);
      條.onclick = async (e) => {
        e.stopPropagation();
        if (條.__鎖) return;
        條.__鎖 = true;
        delete this.剛動過[k.鍵];
        await 剛.退();
      };
      return 條;
    }
    if (k.完成) 條.addClass("tk-色條-完");
    const 循 = k.循環 && !k.完成;
    const 勾 = 圖(條, "check", 9);
    勾.addClass("tk-色勾");
    勾.style.display = "";   // 顯示與否交給 CSS(平常不佔寬,4px 的色條才裝得下;滑過才出來)
    const 名 = 條.createDiv({ text: k.分類 });
    名.addClass("tk-色名");
    條.setAttribute("aria-label", k.分類 + " ‧ " + (循 ? 循環說明(k.循環) + " —— " + T.doneOnceShort : (k.完成 ? T.undone : T.done)));
    const 做 = async (e) => {
      e.stopPropagation();
      if (條.__鎖) return;
      條.__鎖 = true;
      if (循) await this.本次完成(k); else await this.切完成(k);
      條.__鎖 = false;
    };
    條.onclick = 做;
    條.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); 做(e); } };
    return 條;
  }

  /* 1.6.3 指派人 = 一顆圓頭像(名字的一個字,見 頭字)。沒有指派人:滑過卡片才出現淡淡的 + 人。 */
  畫頭像(容器, k) {
    const T = this.T;
    if (k.指派) {
      const 頭 = 容器.createDiv({ text: 頭字(k.指派) });
      頭.addClass("tk-頭像");
      // 1.6.3:底色統一(styles.css 的 .tk-頭像),不再用 人色() —— 使用者 09-20:「顏色太混亂」
      頭.setAttribute("aria-label", "指派人:" + k.指派);
      頭.onclick = (e) => { e.stopPropagation(); this.改指派(e, k); };
      return 頭;
    }
    const 空 = 容器.createDiv();
    空.addClass("tk-頭像空");
    圖備(空, ["user-plus", "plus"], 11);
    空.setAttribute("aria-label", T.changeAssignee);
    空.onclick = (e) => { e.stopPropagation(); this.改指派(e, k); };
    return 空;
  }

  畫釘(容器, k) {
    const T = this.T;
    const 釘 = 容器.createDiv();
    釘.addClass("tk-釘");
    /* ⚠ 沒置頂的也要看得到,只是淡淡的 —— 全部藏起來的話,
       根本分不出哪幾張有置頂、也不知道這裡可以按。
       ⚠ 1.4.4:顏色和透明度搬進 CSS(.tk-釘 / .tk-已釘)。以前寫成 inline,
         滑過整列要把它亮起來就只能用 !important 去蓋。 */
    if (k.置頂) 釘.addClass("tk-已釘");
    st(釘, "display:inline-flex;cursor:pointer;line-height:0;user-select:none;flex:0 0 auto;" +
      "transition:opacity .12s ease,color .12s ease;");
    // mockup v14/v16:📌 是 12px(溝裡 left 4 / top 5 的那個 12 × 12 盒子)。
    // ⚠ 以前畫 15:比盒子大,check4 會報「裝不下自己」(14>12),而且圖示邊緣被切掉。
    圖(釘, "pin", 12);
    釘.title = k.置頂 ? T.unpin : T.pin;
    釘.onclick = (e) => { e.stopPropagation(); this.切置頂(k); };
    return 釘;
  }

  畫日期盒(容器, k) {
    const T = this.T;
    const 盒 = 容器.createDiv();
    盒.addClass("tk-date");
    盒.title = T.changeDate;
    盒.onmouseenter = () => { 盒.style.background = "var(--background-modifier-border)"; };
    盒.onmouseleave = () => { 盒.style.background = ""; };
    盒.onclick = (e) => { e.stopPropagation(); this.開日期編輯(e, k); };
    const 今色 = (日) => (日 === this.今 ? "color:var(--text-accent);" : "");
    // 1.6.3(B5)只剩卡片版面:區間一律橫著排成一行(以前桌機的上下兩行拿掉了)
    /* 窄螢幕:區間**橫著排**成一行(26-09-12(六) – 09-15(二))。
       1.4.3 以前是上下疊兩行,卡頭因此忽高忽矮,每張卡片的主題起始高度都不一樣。 */
    st(盒, "cursor:pointer;border-radius:5px;padding:2px 2px;flex:0 1 auto;min-width:0;" +
      "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" +
      // 0.8em:英文區間「09-12(Sat) – 09-20(Sun)」在 360px 的手機上剛好放得下(0.86 差 17px)
      "font-variant-numeric:tabular-nums;font-size:0.8em;font-weight:600;line-height:1.4;" +
      今色(k.起日));
    盒.setText(k.起日 ? 日期範圍字(k.起日, k.迄日) : T.noDate);
    return 盒;
  }

  /* 循環膠囊 + 延。桌機在日期欄底下;窄螢幕在主題那一行(卡頭沒有位置給它)。 */
  畫循排(容器, k) {
    const T = this.T;
    {
      const 排 = 容器.createDiv();
      排.addClass("tk-循排");
      st(排, "display:flex;align-items:center;gap:4px;flex-wrap:wrap;" +
        "flex:0 0 auto;");
      /* 循環膠囊:圓框中間一點(circle-dot)+ 每N週。點下去就是改循環的面板。
         ⚠ 以前這裡只有一顆「延」,看不出這張是循環卡、也看不出隔多久一次,
           要滑到完成鈕上看 tooltip 才知道 —— 那等於沒說。 */
      /* ⚠ 1.4.5:「每N週」和「延」**長得一模一樣**(同色、同框、同高、同圓角)。
         以前一顆是重點色的框、一顆是灰框,並排起來像兩種不同地位的東西;
         它們其實是同一組 —— 都在管「這張循環卡的日期」。 */
      const 循樣 = "display:inline-flex;align-items:center;justify-content:center;gap:3px;" +
        "font-size:0.66em;height:19px;min-height:0;padding:0 7px;border-radius:9px;" +
        "cursor:pointer;box-shadow:none;white-space:nowrap;" +
        "color:var(--text-muted);border:1px solid var(--background-modifier-border);";
      const 循鈕 = 膠囊(排, "");
      st(循鈕, 循樣);
      圖(循鈕, "circle-dot", 11);
      循鈕.createSpan({ text: 循環說明短(k.循環) });
      循鈕.title = 循環說明(k.循環) + " ‧ " + T.cycleEdit;
      循鈕.onclick = (e) => { e.stopPropagation(); this.開循環編輯(e, k); };

      const 延 = 膠囊(排, T.postpone);
      st(延, 循樣);
      延.title = "只改日期、不留記錄(挑一天延期)";
      延.onclick = (e) => { e.stopPropagation(); this.開日期編輯(e, k); };
    }
  }

  // 「未寫日期」表專用的第一欄:一顆「設為今日」,按了就排進今天
  畫補日期格(格, k) {
    const T = this.T;
    /* ⚠ 這顆不要做大。它只是「補一個日期」的捷徑,做成一顆顯眼的大鈕之後,
       整欄看起來像是這張表最重要的東西 —— 尺寸跟逾期那顆(tk-日鈕)對齊就好。 */
    const 鈕 = 膠囊(格, T.setToday);
    // 同上:膠囊是 div,不指定 inline-flex 就會撐滿整個 <td>
    st(鈕, "display:inline-flex;align-items:center;justify-content:center;width:auto;" +
      "font-size:0.6em;height:17px;min-height:0;padding:0 6px;border-radius:9px;" +      // 1.6:跟逾期那顆一樣灰、小一號
      "cursor:pointer;box-shadow:none;white-space:nowrap;" +
      "color:var(--text-muted);border:1px solid var(--background-modifier-border);");
    鈕.title = "把這張排進今天(" + this.今 + ")";
    鈕.onclick = async (e) => {
      e.stopPropagation();
      if (鈕.__鎖) return;
      鈕.鎖住("…");
      const ok = await this.設日期(k, this.今);
      if (ok === false) return;
      const 要跳 = this.插件.設定.跳轉_設回今日;
      if (要跳) this.回到今天();
      this.記剛動過(k, this.T.movedToday, () => {});
      if (要跳) this.浮到最上(k);
    };
  }

  /* ---- 內容欄 ----
     上排 = 文欄(主題行 + 寫留言位 + 留言區 + 內容),右上角是這張卡片的動作組。 */
  畫內文(格, k, 列) {
    const T = this.T, s = this.狀態;
    格.empty();
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
    /* 窄螢幕:主題那一行**不准換行**,左邊(主題、狀態、循環)自己在裡面折行,
       右邊的資訊和「✎」永遠貼在這一行的最右邊。 */
    /* ⚠ 1.4.5:桌機也**不准換行**(以前是 wrap)。主題一長,右邊的時間和按鈕就被擠到下一行,
       每張卡片的「最後編輯時間」出現在不同位置。現在左邊那一塊自己在裡面折行,
       右邊的時間和按鈕永遠釘在第一行的最右邊。 */
    st(題行, "display:flex;gap:6px;margin-bottom:4px;min-width:0;" +
      "min-height:" + 主題高 + "px;align-items:flex-start;flex-wrap:nowrap;");
    const 左組 = 題行.createDiv();
    左組.addClass("tk-題左");
    st(左組, "display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0;flex:1 1 auto;" +
      "min-height:" + 主題高 + "px;");
    if (s.融合中 && !(列 && 列.__未定)) this.畫融合勾(左組, k);
    /* 1.6.3(mockup v9 #10,使用者:「指派人跟主題對調 這樣就會整齊了」)
       指派人在**最前面**(18 那條線上),主題接在後面 —— 頭像每張卡片都在同一個 x,
       以前放在日期左邊,名字長短一變,日期就跟著左右跑。
       沒有指派人的卡片留一個同寬的空位(Q21),主題才跟別張對齊;
       個人模式(關掉「使用指派人」)整欄不畫,主題直接從 18 開始。 */
    if (!this.個人) this.畫頭像(左組, k);
    if (編修中) {
      /* ⚠ R1(UI/UX critic,使用者 09-20 同意):編輯時主題**照樣是分類色膠囊 + 一條底線**,
         不變成灰色輸入框 —— 所見即所得(原則 10):字的 x、大小、粗細、顏色都不准變,只多一條底線。
         尺寸跟 styles.css 的 .tk-主題 一模一樣(高 17、圓角 8、左右內距 2、第一顆往左 2px)。 */
      const c編 = this.插件.分類色(k.分類);
      const 題輸 = 左組.createEl("input", { type: "text" });
      題輸.value = k.主題 || "";
      題輸.placeholder = T.topic;
      /* 使用者 09-20:「edit 時主題欄位不要拉這麼長,有輸入再長出來」——
         寬度跟著字走(字寬 ≈ ch),空的時候只有一小格;上限就是 6 個中文字(主題顯寬)。
         ⚠ 不要用 flex 去撐(以前 min-width:88 + flex:0 1 auto):空主題的卡片會多一截空膠囊。 */
      const 量題寬 = () => {
        題輸.style.width = (Math.min(主題顯寬, Math.max(3, 字寬(題輸.value))) + 1.2) + "ch";
      };
      /* ⚠ 1.6.4(S1):margin-left 不寫在這裡 —— 留給 styles.css 的
         `.tk-題左 > .tk-題編:first-child { margin-left:-2px; }`。這裡如果寫 margin:0(inline),
         inline 的權重蓋過 class,那條 -2px 就失效,字會比閱讀模式往右多 2px(原則 10 的 WYSIWYG 就破了)。 */
      st(題輸, "flex:0 0 auto;height:17px;min-height:0;margin-top:0;margin-right:0;margin-bottom:0;" +
        "box-sizing:content-box;padding:0 2px;outline:none;" +
        "border:0;border-bottom:1px solid " + c編 + ";" +
        "line-height:17px;font-size:0.8em;font-weight:700;border-radius:8px;" +
        "background:" + 透明(c編, 0.16) + ";color:" + c編 + ";");
      量題寬();
      /* ⚠ class 一定要掛:點外面結束編輯的那個監聽器靠它認出「這是編輯的一部分」(1.4.6 修)。
         完成編輯() 也是從這一列找這個 class 讀主題,不再用一個掛在 view 上的變數 ——
         那個變數會留著上一張卡片的輸入框,完成另一張時把舊主題寫到這一張上。 */
      題輸.addClass("tk-題編");
      /* C22(使用者 09-20:「要限制使用者不能打超過六個字」):打超過 6 個中文字寬就當場不讓他打進去。
         ⚠ 不用 maxlength:那個算的是字元數(中文 6 個 = 英文 6 個),我們要的是**字寬**。
         ⚠ 注音 / 拼音組字中(isComposing)不動,不然會把打到一半的字吃掉。 */
      題輸.oninput = (e) => {
        if (e && e.isComposing) { 量題寬(); return; }
        const 短 = 題限(題輸.value);
        if (短 !== 題輸.value) { 題輸.value = 短; new Notice(T.topicCut); }
        量題寬();          // 打字的時候跟著長出來
      };
      題輸.onclick = (e) => e.stopPropagation();
      題輸.onkeydown = (e) => {
        if (e.isComposing || e.keyCode === 229) return;
        if (是Enter鍵(e) || e.key === "Escape" || e.code === "Escape") { e.preventDefault(); this.完成編輯(k); }
      };
    } else if (k.主題) {
      /* 1.6.3(ADR 1.6.3-01)最多 3 個主題。膠囊樣子在 styles.css 的 .tk-主題
         (圓角 8、左右內距 2、高 17 —— 使用者在 mockup 自己調的)。第一顆往左 2px,字才對齊 18px 那條線。
         ⚠ mockup v15/v16 Q35 定案(使用者 09-20:「其他做副標」):
           **只有第一個 # 是主題**(分類色膠囊),第二個以後是**副標**:內文色、沒有底色。
           以前全部同一個分類色,一張卡片三顆同色膠囊分不出主次(Q23 的暫定 A 作廢)。 */
      const c = this.插件.分類色(k.分類);
      (k.主題們 && k.主題們.length ? k.主題們 : [k.主題]).forEach((題, i) => {
        const 題籤 = 左組.createDiv();
        題籤.addClass(i === 0 ? "tk-主題" : "tk-副標");
        /* C22 / U16(使用者 09-20 再講一次:「# 不超過 6 個中文字」):膠囊上最多 6 個中文字寬(= 12),
           超過就截掉補「…」;全名在 aria-label(滑過看得到)。 */
        const 短 = 截寬(題, 主題顯寬);
        畫文字(題籤, i === 0 ? 短 : "#" + 短, this.app, this.file ? this.file.path : "");
        /* ⚠ 顏色寫成 CSS 變數、不直接寫 color:淺色主題要把字**混黑加深**(Q8:對比 1.8 → 4.9–5.6),
           規則在 styles.css。寫 inline 的話 Obsidian 切深淺色時不會跟著變(視覺基準:只用 CSS 變數)。 */
        if (i === 0) { 題籤.style.setProperty("--tk-題色", c); 題籤.style.background = 透明(c, 0.16); }
        題籤.setAttribute("aria-label", "#" + 題 + " —— 點一下只看這個主題");
        題籤.onclick = (e) => { e.stopPropagation(); this.帶入主題(題); };
      });
    }
    /* ⚠ 1.4.5 拿掉了主題旁邊獨立的「改主題」鈕。按「✎ 編輯」就能同時改主題和內容
       (編修模式裡主題那一格本來就是輸入框)。一張卡片上兩顆長得差不多的筆,
       使用者得先想「我要改的是哪一個」—— 只留一顆。 */
    /* 1.5 分類名稱 = 狀態(設定「顯示分類名稱」):手機寫在主題後面,桌機寫在完成圓點上方(見 畫分類格)。
       完成的卡片那個位置換成「✓ 已完成」、封存的是「已封存」—— 同一個位置只講一種狀態。 */
    if (!編修中 && this.插件.設定.顯示分類名稱 && !k.完成 && !已封存) this.畫分類名(左組, k);
    /* 狀態小記號也換成同一套 Lucide —— emoji 在 Windows 上又大又花,跟旁邊對不齊 */
    const 狀態圖 = (名, 文, 色) => {
      const d = 左組.createDiv();
      st(d, "display:inline-flex;align-items:center;gap:3px;font-size:0.72em;font-weight:600;" +
        "letter-spacing:0.04em;white-space:nowrap;color:" + 色 + ";");
      圖(d, 名, 12);
      d.createSpan({ text: 文 });
      return d;
    };
    // 1.6.3:完成看色條(綠)和劃線,不再寫「✓ 已完成」;封存照舊標一下
    if (已封存) 狀態圖("archive", T.archivedTag, "var(--text-faint)");
    if (k.循環 && !k.完成) this.畫循排(左組, k);
    // 資訊(不是動作)掛在主題那一行的右邊:最後動過的時間、留言則數
    const 訊 = 題行.createDiv();
    訊.addClass("tk-題訊");
    /* 不讓它縮:它只有「💬2 🕐14:30」兩小塊,被壓縮就是數字被裁掉一半。
       要讓位的是左邊的主題 —— 主題本來就能在自己那一塊裡折行。 */
    st(訊, "display:flex;align-items:center;justify-content:flex-end;gap:8px;flex:0 0 auto;" +
      "min-height:" + 主題高 + "px;");
    /* 主題那一行的最右邊(1.4.5 重排):
         桌機   💬 留言 ‧ ✎ 編輯 —— 編輯在最右邊,就是以前留言的位置;封存搬到日期格的 📌 旁邊
         窄螢幕 ✎ 編輯 —— 封存、留言、最後編輯時間都在卡頭的「⋯」
       內容區不再有絕對定位的按鈕,所以閱讀和編輯都用滿整個寬度。 */
    // 1.6.3:以前卡頭上的東西搬到這一行的右邊:頭像 → 日期 → 📌(滑過才出現,釘住的一直在)→ ✎ → ⋯
    const 未定 = !!(列 && 列.__未定);
    const 右組 = 題行.createDiv();
    右組.addClass("tk-題右");
    // 頭像 1.6.3 搬到左邊最前面了(見上面),右邊只剩日期
    if (未定) this.畫補日期格(右組, k); else this.畫日期盒(右組, k);
    // 📌 搬到色條上面了(見 畫卡片)
    /* 1.6.3(mockup v16 的 .acts):✎ 和 ⋯ **在同一個盒子裡、中間沒有空隙**。
       以前是兩個各自有 padding-left:6 的盒子,中間硬是多了 6px(使用者 09-20:「太遠很怪」)。 */
    const 具盒 = 題行.createDiv();
    具盒.addClass("tk-題具");
    this.畫卡片工具(具盒, k, 編修中, 已封存, "右上");
    this.畫卡片工具選單(具盒, k, 已封存, this.卡具樣());
    /* ⚠⚠ 1.4.5:按鈕那一組**寬度固定**,時間才會在每張卡片的同一個位置。
       一般卡片是 🗄 💬 ✎ 三顆,封存的卡片是 ↩ 🗑 兩顆(編修中沒有 🗑)——
       組的寬度一變,左邊的時間就跟著左右跑。所以永遠留三顆的寬度(手機一顆),靠右排。
       桌機:6(左邊距)+ 26 + 7 + 26 + 7 + 26 = 98。手機:6 + 34 = 40。 */
    // 不用留言(1.4.7)的時候少一顆:6 + 26 + 7 + 26 = 65
    // ✎ 20 + ⋯ 26(手機 32 + 32)—— 寬度固定,左邊的日期才不會因為按鈕多寡左右跑
    具盒.style.minWidth = (this.觸 ? 64 : 46) + "px";
    具盒.style.justifyContent = "flex-end";
    具盒.style.minHeight = 主題高 + "px";
    /* 有固定寬的那一格(時間)**靠左**:🕐 永遠在同一個 x,數字從它右邊接著排。
       靠右的話,數字寬窄不一(1 比 0 窄、佈景主題的字型不一定有等寬數字),
       🕐 就跟著左右差一兩 px,一整排看下來不平。 */
    const 訊條 = (名, 文, 提示, 寬) => {
      const d = 訊.createDiv();
      st(d, "display:inline-flex;align-items:center;justify-content:" + (寬 ? "flex-start" : "flex-end") + ";" +
        "gap:3px;font-size:0.68em;" +
        "color:var(--text-faint);white-space:nowrap;font-variant-numeric:tabular-nums;" +
        (寬 ? "width:" + 寬 + ";" : ""));
      if (名) 圖(d, 名, 11);
      if (文) d.createSpan({ text: 文 });
      if (提示) d.title = 提示;
      return d;
    };
    if (k.留言.length && this.用留言) 訊條("message-square", String(k.留言.length));
    /* 時間是這一行最右邊的資訊,**一律佔一格固定寬**(沒有時間也留著空格),
       留言則數排在它左邊 —— 有沒有留言都不會推動時間。
       窄螢幕不顯示時間:手機上那一行只留真的要看的東西,時間收進卡頭的「⋯」。 */
    // 設定關掉編輯時間(1.4.8):連空格都不留
    // 1.6.3:只剩卡片版面;看板夠寬(不是 密)才在主題那一行顯示時間,手機照舊收在「⋯」
    if (!this.密 && this.顯示編時) {
      if (k.編修時) 訊條("clock", k.編修時.slice(11), T.lastEdited + " " + k.編修時, "4.2em");
      else 訊條(null, null, null, "4.2em");
    }

    /* 留言放在內容的上面還是下面,看設定(1.4.5)。寫新留言的框永遠緊貼著留言那一區。 */
    const 留下 = this.插件.設定.留言位置 === "下";
    const 畫留言們 = () => {
      const 寫位 = 文區.createDiv();
      寫位.addClass("tk-寫位");
      if (s.寫留言 === k.鍵) this.畫寫留言(寫位, k, 留下);
      this.畫留言區(文區, k, 留下);
    };
    const 用留言 = this.用留言;          // 設定關掉留言(1.4.7):不畫留言區、不畫寫留言框
    if (!留下 && 用留言) 畫留言們();
    const 內盒 = 文區.createDiv();
    內盒.addClass("tk-內盒");
    st(內盒, "position:relative;");
    this.畫內容區(內盒, k, 編修中);
    if (留下 && 用留言) 畫留言們();
  }

  /* 卡片動作(1.4.5 重排)。哪一組:
       "右上"  主題那一行最右邊。桌機 🗄 封存 · 💬 留言 · ✎ 編輯(已封存的卡片:↩ 取消封存 · 🗑 刪除);
               窄螢幕只有 ✎
       "選單"  窄螢幕卡頭的「⋯」:封存 / 留言 / 刪除 / 最後編輯時間
     ⚠ 封存試過放在日期格 📌 旁邊,太擠(日期格才 110px,還要放日期、循環、設為今日),
       所以跟留言、編輯排成同一組。編輯永遠在最右邊。
     ⚠ 編修時「編輯→完成」在原位換圖示,寬高寫死不變 —— 位置一變,按下去的瞬間畫面就會晃一下。 */
  /* 卡片右上角那兩顆圖示鈕的樣子(mockup v16 的 .ib / .ib2):
       沒有框、高 22,✎ 20 寬、⋯ 26 寬,**中間沒有空隙**(盒的 gap 0)—— 使用者 09-20:「太遠很怪」。
       手機是手指在點,一律放大到 32×28。
     ⚠ 這裡**故意不寫 background** —— inline 的 background 會蓋過 CSS 裡 .tk-膠囊:hover 的底色,
       結果滑過去完全沒反應。底色交給 CSS。 */
  卡具樣() {
    return (色, 寬) => "display:inline-flex;align-items:center;justify-content:center;" +
      "flex:0 0 auto;width:" + (this.觸 ? 32 : (寬 || 24)) + "px;" +
      "height:" + (this.觸 ? 28 : 22) + "px;" +
      "min-height:0;padding:0;margin:0;box-sizing:border-box;" +
      "font-size:0.7em;line-height:1;border-radius:7px;cursor:pointer;box-shadow:none;" +
      "white-space:nowrap;color:" + 色 + ";border:0;";
  }

  畫卡片工具(盒, k, 編修中, 已封存, 哪一組) {
    const T = this.T, s = this.狀態;
    盒.addClass("tk-動作");
    // 淡入淡出交給 CSS 的 .tk-動作 / tr:hover 管 —— inline 寫 opacity 會壓過 :hover,
    // 那樣按鈕就永遠不會亮起來
    // ⚠ 時間和留言則數已經放在主題那一行(資訊不是動作),這裡只留真正的動作
    /* ⚠⚠ 這一塊以前有自己的底色(background-primary),是為了擋住底下的文字。
       留著的代價是:滑鼠移到整列上時,列的底色變成 hover 色,這一塊卻還是原本的底色,
       於是按鈕後面浮出一塊圓角 6px 的方形 —— 看起來就是「按鈕的顏色溢出框框」。
       兩種底色疊在一起才是那個溢出,不是按鈕本身。拿掉就乾淨了。 */
    st(盒, "display:flex;align-items:center;gap:0;flex:0 0 auto;" +
      "background:transparent;padding-left:6px;");

    /* ⚠ 1.3:動作鈕全部只剩圖示,沒有文字。
       四顆字鈕排在一起會讓卡片右上角變成一條字牆,而且中英文一換長度就跳。
       圖示固定寬、看一眼就認得,說明留在 tooltip 裡。 */
    const 具樣 = this.卡具樣();

    /* 窄螢幕的「⋯」。⚠ 選單裡的封存不做「按兩次確認」:從選單裡選一項本來就是兩步,
       而且封存可回復(取消封存就在同一個選單)。 */
    if (哪一組 === "選單") { this.畫卡片工具選單(盒, k, 已封存, 具樣); return; }


    // ---- 右上 ----
    /* 已封存的卡片:封存 / 取消封存 / 刪除都在卡頭的「⋯」(1.6.3 B5 起桌機也一樣)。
       ⚠ UX 的順序是有意的 —— 封存(可回復) → 刪除(不可回復)。沒封存之前看不到刪除。
       ⚠ 封存的卡片不給編輯、不給留言:收起來的東西要改,先「取消封存」,那是一個明確的動作。 */
    if (已封存) return;

    {
      /* ⚠ 1.2:內容改成隨打隨存,所以這一顆不再是「儲存」而是「完成」——
         儲存是一個動作(你要記得按),完成是一個狀態(你已經寫完了)。 */
      const 乙 = 膠囊(盒, "");
      st(乙, 具樣(編修中 ? "var(--text-accent)" : "var(--text-muted)", 20) +
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
        /* ⚠⚠ 先記住這一列現在在畫面的哪個高度,重畫完再調回去。
           編修框是 textarea 撐出來的,內容一長它就從兩行變成二十行;
           Chromium 看到「正在聚焦而且剛剛變高」的元素,會自己把它捲進畫面 ——
           實測:捲動位置 584 → 834,那一列的頂端從 +243 被推到 -7,
           使用者看到的就是「一按編輯,畫面跳到卡片最下面」。 */
        const 列 = (e.currentTarget && e.currentTarget.closest) ? e.currentTarget.closest(".tk-列") : null;
        const 原頂 = 列 ? Math.round(列.getBoundingClientRect().top - this.contentEl.getBoundingClientRect().top) : null;
        this.就地重畫(e, k);          // ⚠ 只換那一格 —— 重畫整份清單會讓畫面自己跳走
        this.編修就位(k.鍵, 原頂);
      };
    }
  }

  /* ---- 留言 ---- */
  /* 留言:排在內容的上方,越新的越上面。
     跟內容一樣做收合 —— 平常只露 3 則,其餘收起來,展開收合都有動畫,
     而且留言區任何一處都點得動(點到連結、編輯鈕不算)。 */
  畫留言區(文區, k, 在下) {
    if (!k.留言.length) return;
    const T = this.T;
    const 開 = !!this.狀態.留言展開[k.鍵] || !!this.狀態.展開全部;
    const 多 = k.留言.length > 露幾則留言;
    const 顯 = (多 && !開) ? k.留言.slice(0, 露幾則留言) : k.留言;
    const 區 = 文區.createDiv();
    區.addClass("tk-留區");
    // 留言在內容上面 → 跟下面拉開;在內容下面 → 跟上面拉開
    st(區, "display:flex;flex-direction:column;gap:6px;" + (在下 ? "margin:8px 0 0;" : "margin:0 0 8px;") +
      "padding:3px 0 4px 9px;" +
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
    const 格 = 區.closest ? 區.closest(".tk-格") : null;
    const 列 = 格 ? 格.parentElement : null;
    if (!格 || !列) { this.重畫清單(); return; }
    const 捲 = this.contentEl.scrollTop;          // 理由見 切內容
    this.畫內文(格, k, 列);
    const 新區 = 格.querySelector(".tk-留區");
    if (新區) 滑開(新區, 舊高);
    this.contentEl.scrollTop = 捲;
  }

  畫一則留言(區, k, c) {
    const T = this.T;
    const 行 = 區.createDiv();
    行.addClass("tk-留");
    st(行, "display:flex;align-items:flex-start;gap:8px;font-size:0.95em;line-height:1.55;");
    const pc = this.插件.人色(c.人);
    const 頭 = 行.createDiv({ text: 頭字(c.人) });
    st(頭, "flex:0 0 auto;width:20px;height:20px;border-radius:50%;margin-top:0.15em;" +
      "display:flex;align-items:center;justify-content:center;line-height:1;" +
      "font-size:0.62em;font-weight:700;color:#141414;background:" + pc + ";");
    頭.title = c.人;
    const 文 = 行.createDiv();
    st(文, "flex:1 1 auto;min-width:0;word-break:break-word;");

    if (this.狀態.改留 === c.id) {
      const 取消改 = () => { this.狀態.改留 = null; this.重畫清單(); };
      // 1.6.1:改留言也用即時預覽編輯器;拿不到才用 textarea
      const 殼 = 文.createDiv();
      let inp = this.即時編(殼, c.文, { 送出: () => this.存留言(k, c, inp.value), 取消: 取消改 });
      if (inp) {
        殼.addClass("tk-即時框", "tk-即時框-強");
        殼.onclick = (e) => e.stopPropagation();
      } else {
        殼.remove();
        inp = 文.createEl("textarea");
        st(inp, "width:100%;min-height:2.1em;resize:none;padding:5px 8px;" +
          "font-family:var(--font-text);font-size:0.94em;line-height:1.5;border-radius:6px;" +
          "background:var(--background-secondary);border:1px solid var(--text-accent);" +
          "color:var(--text-normal);");
        inp.value = c.文;
        掛md快捷(inp);
        inp.onclick = (e) => e.stopPropagation();
        inp.oninput = () => 撐高(inp);
        inp.onkeydown = (e) => {
          if (是送出(e)) { e.preventDefault(); this.存留言(k, c, inp.value); return; }
          if (e.isComposing || e.keyCode === 229) return;
          if (e.key === "Escape" || e.code === "Escape") { e.preventDefault(); 取消改(); }
        };
      }
      /* ⚠ 1.4.4 補上送出 / 取消兩顆鈕。以前改留言只能按 Enter 存、Esc 取消 ——
         手機的鍵盤沒有 Esc,而且輸入法開著的時候 Enter 是「選字」(keyCode 229,上面直接略過),
         於是手機上改完留言**根本沒有辦法存**。 */
      const 鈕列 = 文.createDiv();
      st(鈕列, "display:flex;justify-content:flex-end;gap:6px;margin-top:5px;");
      const 取 = 鈕列.createEl("button", { text: T.cancelWord });
      st(取, this.小鈕樣(false));
      取.onmousedown = (e) => e.preventDefault();          // 不要讓輸入框先失焦又重畫
      取.onclick = (e) => { e.stopPropagation(); this.狀態.改留 = null; this.重畫清單(); };
      // 1.5.1:改留言的「送出」也是 send-horizontal 圖示(按下去才換成「…」,存完整份重畫)
      const 存 = 鈕列.createEl("button");
      st(存, this.小鈕樣(true) + "display:inline-flex;align-items:center;justify-content:center;");
      圖備(存, ["send-horizontal", "send-horizonal", "send"], 14);
      存.setAttribute("aria-label", T.send);
      存.title = T.send;
      存.onmousedown = (e) => e.preventDefault();
      存.onclick = (e) => {
        e.stopPropagation();
        if (存.disabled) return;
        存.disabled = true; 存.setText("…");
        this.存留言(k, c, inp.value);
      };
      setTimeout(() => {
        try {
          if (inp.聚焦) inp.聚焦(true, true);
          else { 撐高(inp); inp.focus({ preventScroll: true }); inp.select(); }
        } catch (e) {}
      }, 0);
      return;
    }

    /* ⚠ 誰能按「編輯」:認的是這台電腦記住的人(localStorage),
       不是「指派人下拉現在選到誰」。舊版用後者,那個值一重新整理就沒了,
       自己留的話反而看不到編輯 —— 260909v1.17 修掉的就是這個。
       還沒認過人的新電腦先全開,認過之後就只剩自己的。 */
    const 我 = this.個人 ? null : this.我是誰();      // 個人使用:每一則都是自己的,都能改
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

  畫寫留言(寫位, k, 在下) {
    // 個人使用:不必先選「這台電腦是誰」,留言一律記成「我」(除非之前選過名字)
    const T = this.T, 我 = this.我是誰() || (this.個人 ? T.meName : null);
    const 距 = 在下 ? "margin:8px 0 0;" : "margin:0 0 8px;";
    if (!我) {
      const 殼 = 寫位.createDiv();
      st(殼, "display:flex;align-items:center;gap:6px;flex-wrap:wrap;" + 距);
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
    st(盒, "display:flex;align-items:flex-start;gap:8px;padding-left:7px;" + 距 +
      "border-left:2px solid var(--interactive-accent, var(--text-accent));");
    const pc = this.插件.人色(我);
    const 頭 = 盒.createDiv({ text: 我.slice(-1) });
    st(頭, "flex:0 0 auto;width:20px;height:20px;border-radius:50%;margin-top:0.5em;" +
      "display:flex;align-items:center;justify-content:center;line-height:1;" +
      "font-size:0.62em;font-weight:700;color:#141414;background:" + pc + ";");
    const 取消寫 = () => { this.狀態.寫留言 = null; this.重畫清單(); };
    /* 1.6.1:寫留言也用即時預覽編輯器(送出 / Esc 走同一套 是送出);拿不到才用 textarea。
       鍵盤跟新增框、編修框完全一樣(1.4.7 統一,見 是送出) ‧ Esc 取消。
       ⚠ 1.4.6 以前留言是 Enter 送出、Shift+Enter 換行,跟新增和編輯反過來 —— 同一個看板裡兩套規則。 */
    const 殼 = 盒.createDiv();
    st(殼, "flex:1 1 auto;min-width:0;");
    let ta = this.即時編(殼, "", { 送出: () => this.送留言(k, 我, ta.value, ta), 取消: 取消寫, 提示: T.placeholder });
    const 即時 = !!ta;
    if (即時) {
      殼.addClass("tk-即時框");
      殼.onclick = (e) => e.stopPropagation();
    } else {
      殼.remove();
      ta = 盒.createEl("textarea");
      ta.placeholder = T.placeholder;
      st(ta, "flex:1 1 auto;min-width:0;min-height:2.1em;resize:none;" +
        "padding:5px 8px;font-family:var(--font-text);font-size:0.94em;line-height:1.5;" +
        "border-radius:6px;background:var(--background-secondary);" +
        "border:1px solid var(--background-modifier-border);color:var(--text-normal);");
      ta.onclick = (e) => e.stopPropagation();
      ta.onkeydown = (e) => {
        if (是送出(e)) { e.preventDefault(); this.送留言(k, 我, ta.value, ta); return; }
        if (e.isComposing || e.keyCode === 229) return;
        if (e.key === "Escape" || e.code === "Escape") { e.preventDefault(); 取消寫(); }
      };
      ta.oninput = () => 撐高(ta);
    }
    // 1.5.1:跟新增卡片的送出鈕同一顆 send-horizontal 圖示,「送出」留在 aria-label
    const 送 = 盒.createEl("button");
    st(送, "flex:0 0 auto;align-self:flex-start;margin-top:2px;" + this.小鈕樣(true) +
      "display:inline-flex;align-items:center;justify-content:center;");
    圖備(送, ["send-horizontal", "send-horizonal", "send"], 14);
    送.setAttribute("aria-label", T.send);
    送.title = T.send + " · " + 送出提示字(T);
    if (!即時) { this.掛連結建議(ta); 掛md快捷(ta); }
    送.onmousedown = (e) => e.preventDefault();          // 不要讓編輯器先失焦
    送.onclick = (e) => { e.stopPropagation(); this.送留言(k, 我, ta.value, ta); };
    setTimeout(() => { try { if (即時) ta.聚焦(true); else ta.focus({ preventScroll: true }); } catch (e) {} }, 0);
  }

  /* 卡片裡的小文字鈕(留言的送出/取消、刪除確認)。
     ⚠ height 一定要寫死:手機版 Obsidian 的 button 預設 44px 高,不寫就是一塊方磚。 */
  小鈕樣(主) {
    return "height:" + (30) + "px;min-height:0;padding:0 " + (14) + "px;" +
      "font-size:" + ("0.84em") + ";line-height:1;border-radius:6px;cursor:pointer;" +
      "box-shadow:none;white-space:nowrap;" +
      (主 ? "font-weight:700;color:var(--text-on-accent, #fff);background:var(--interactive-accent);" +
            "border:1px solid var(--interactive-accent);"
          : "color:var(--text-muted);background:transparent;border:1px solid var(--background-modifier-border);");
  }

  /* ---- 內容:閱讀跟編修用同一個縮排(17px),字才不會左右跳 ---- */
  畫內容區(文區, k, 編修中) {
    /* 1.6.1 所見即所得:閱讀時每一行的長相照抄即時預覽編輯器(見 畫預覽行)。 */
    const 符們 = k.內容符 || [];
    if (編修中) {
      /* ⚠ 1.3:編修框改成看得出邊界的一個框(跟留言的輸入框同一套長相)。
         以前是「透明的 textarea 直接躺在卡片上」,進了編輯模式畫面幾乎沒變,
         常常不知道自己到底在不在編輯 —— 一個框就解決了。 */
      const 框 = 文區.createDiv();
      框.addClass("tk-編框");
      const 草0 = this.草稿 && this.草稿[k.鍵];
      // 1.6.1:符號照筆記裡寫的放回去(使用者自己打的「- 」不能被吃掉)
      // 1.6.2(B3):直接用內容的原文 —— 巢狀縮排、空行、行中的空白都在,存回去才會一字不差
      const 初值 = (草0 !== undefined && 草0 !== null) ? 草0 : (k.內容原 || []).join("\n");
      /* 1.6.1:優先用 Obsidian 自己的即時預覽編輯器(見 插件.建即時編輯)。
         重畫時舊的那一個要先卸掉(它掛在外掛底下,DOM 拿掉了也還活著);字在 草稿 裡,新的會接著用。 */
      if (this.編框 && this.編框.卸) { this.編框.卸(); this.編框 = null; }
      let 即時 = null;
      const 即排存 = () => {
        if (!即時) return;
        this.草稿 = this.草稿 || {};
        this.草稿[k.鍵] = 即時.value;
        clearTimeout(this.存計時);
        this.存計時 = setTimeout(() => { this.自動存(k, 即時); }, 900);
      };
      即時 = this.即時編(框, 初值, { 改了: 即排存, 收工: () => this.完成編輯(k) });
      if (即時) {
        框.onclick = (e) => e.stopPropagation();
        this.排存 = 即排存;
        this.編修卡 = k;
        this.編框 = 即時;
        /* 1.6.2:① 剛打開、還沒改過(沒有草稿):記下原文,什麼都沒改就按完成的話不寫檔(不會白白換掉 [ed::] 時間)。
           ② 重畫的時候草稿還沒存(例如自己上一次寫檔引起的重畫,剛好蓋掉正在打字的框):馬上再排一次存檔 ——
              舊框排好的那一次,框卸掉就不算數了,不能等使用者再打一個字。 */
        if (草0 === undefined || 草0 === null) this.上次存的 = 初值;
        else if (草0 !== (k.內容原 || []).join("\n")) 即排存();
        // 1.4.5:窄螢幕不自動聚焦(聚焦 = 跳鍵盤 = iOS 自己捲畫面);游標位置照設定(1.6.3 B4:看是不是手機 this.觸,不看寬度 —— 桌機一律是卡片版面了)
        if (!this.觸) setTimeout(() => 即時.聚焦(this.插件.設定.編輯游標 === "後"), 0);
        return;
      }
      // 退路:一般的 textarea
      // 1.4.5 起完成鈕在主題那一行(兩種寬度都是),編輯框不必讓位,用滿整個寬度
      const ta = 框.createEl("textarea");
      ta.addClass("tk-編");
      /* ⚠ 不再在文字裡塞「．」。1.2 塞進去是為了讓編輯時看得到項目符,
         但那會變成使用者要自己管的字(刪一半、貼上時多一顆…)。
         現在改成單純**縮排**:內容比主題再右邊一點,層級關係就看得出來了。 */
      st(ta, "display:block;vertical-align:top;width:100%;box-sizing:border-box;" +
        "padding:0 4px 0 4px;margin:0;border:0;outline:none;resize:none;" +
        "font-family:var(--font-text);font-size:0.94em;line-height:1.55;" +
        "background:transparent;color:var(--text-normal);");
      ta.value = 初值;
      ta.onclick = (e) => e.stopPropagation();

      const 長高 = () => 撐高(ta);
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
      // 1.6.2:同上 —— 沒改過就不寫;重畫時草稿還沒存就馬上排一次
      if (草0 === undefined || 草0 === null) this.上次存的 = 初值;
      else if (草0 !== (k.內容原 || []).join("\n")) 排存();

      掛md快捷(ta, () => { 長高(); 排存(); });

      ta.onkeydown = (e) => {
        /* 收工的三條路都在這裡:Esc、Shift+Enter、Ctrl/Cmd+Enter。
           ⚠ Enter 是換行(跟一般 Markdown 一樣),不要再拿它當儲存鍵。 */
        if (e.key === "Escape" || e.code === "Escape") { e.preventDefault(); this.完成編輯(k); return; }
        if (是送出(e)) { e.preventDefault(); this.完成編輯(k); return; }
      };
      ta.oninput = () => { 長高(); 排存(); };
      this.編框 = ta;
      this.掛連結建議(ta);
      /* ⚠ 游標跳到第一行開頭(不是最後一行),而且**絕對不要捲動頁面**:
         preventScroll 擋掉 focus 自己的捲動,外面 重畫清單() 也已經把 scrollTop 放回去了。 */
      /* ⚠⚠ 1.4.5:高度**當場**撐好,不要等下一輪。
         等的那一格畫面裡編修框只有一行高;如果是最後一張卡片,整份看板在那一格變矮,
         捲動位置被夾到底,下一輪撐開之後 編修就位() 再把它拉回來 ——
         使用者看到的就是「最後一張卡片按編輯,畫面被扯一下又回到原位」。 */
      長高();
      /* ⚠⚠ 1.4.5:窄螢幕**不自動聚焦**。
         一聚焦手機就跳鍵盤,iOS 會把輸入框捲進鍵盤上方看得到的地方,我們再把卡片拉回原位 ——
         就是「按編輯,畫面先跟著往下跑又跑回來」。那兩下都不是使用者要的。
         不聚焦的話畫面完全不動;使用者點哪一行,游標就在哪一行,鍵盤也是那時候才出來。 */
      /* ⚠⚠ 1.4.5:游標要在**聚焦之前**放好。
         以前是 focus({preventScroll}) 之後才 setSelectionRange(0, 0) —— preventScroll 只管 focus 那一下,
         聚焦之後再移動游標,Chromium 會把游標「揭示」到畫面裡,而且是隔幾百毫秒才捲,
         編修就位() 那時候已經收工了。最後一張卡片實測被扯了 100–150px。
         先放游標再聚焦:聚焦時沿用已經放好的位置,沒有「移動游標」這件事,也就沒有揭示。 */
      if (!this.觸) setTimeout(() => {
        try {
          長高();
          // 1.5 設定:游標放在最前面(預設)或最後面
          const 尾 = this.插件.設定.編輯游標 === "後";
          const 游 = 尾 ? ta.value.length : 0;
          ta.setSelectionRange(游, 游);
          if (!尾) ta.scrollTop = 0;
          ta.focus({ preventScroll: true });
        } catch (e) {}
      }, 0);
      return;
    }
    const 區 = 文區.createDiv();
    區.addClass("tk-文區");
    /* 1.6.2(B4)閱讀時用 **Obsidian 自己的 Markdown 渲染**,標準是「跟 Obsidian 的閱讀模式一樣」(使用者明講):
       分隔線、表格、巢狀清單、[文字](網址)、callout、嵌入都照 Obsidian 畫,以後 Obsidian 支援什麼卡片就支援什麼。
       以前是自己一行一行畫(畫預覽行),只認得連結、粗體那幾種,`---` 會變成字、巢狀清單被攤平。
       收合仿聊天軟體:平常露大約兩行,下緣淡出,「⋯⋯查看更多」釘在右下角;
       改成「限制高度」而不是數行數 —— 表格、分隔線沒有「行」可以數。 */
    const 原 = k.內容原 || [];
    if (!原.length) return;
    const 開 = !!this.狀態.展開[k.鍵] || !!this.狀態.展開全部;
    const 多 = 原.filter(t => t.trim()).length > 2;
    const 要收 = 多 && !開;
    st(區, "position:relative;");
    const 文 = 區.createDiv();
    文.addClass("tk-md"); 文.addClass("markdown-rendered");
    if (要收) 文.addClass("tk-md-收");
    this.畫md(文, 原, k);
    if (多) {
      const 鈕 = 區.createSpan({ text: 開 ? this.T.less : this.T.more });
      鈕.addClass("tk-更多"); 鈕.addClass(要收 ? "tk-更多-收" : "tk-更多-開");
      鈕.onclick = (e) => { e.stopPropagation(); this.切內容(k, 區); };
      this.掛收合(區, () => this.切內容(k, 區));
    }
  }

  /* 1.6.2(B4)把卡片內容(原文的行)用 Obsidian 的 Markdown 渲染畫進 容器。
     ・循環卡片的 [done:: 日期] 記錄照語言寫成「✔ 本次完成 日期」(跟以前一樣)。
     ・內容裡的待辦:第 n 個方框 = 原文裡第 n 行待辦,勾了照舊走 切內勾()(寫手改那一行)。
     ・連結:點 [[連結]] 照 Obsidian 的規矩開(Ctrl / ⌘ = 新分頁),滑過去有頁面預覽(hover-link);#標籤 打開搜尋。
     ⚠ MarkdownRenderer 畫 DOM 是同步的(實測),畫完馬上量高度沒問題;嵌入之類的後處理才是非同步。
     ⚠ 子元件掛在 this.渲染件 底下,每次整份重畫(畫 / 重畫清單)先全部卸掉,不會越積越多。 */
  畫md(容器, 原, k) {
    const T = this.T, 來源 = this.file ? this.file.path : "";
    const 顯 = 顯示md(原, T);
    if (!this.渲染件 && Component) { this.渲染件 = new Component(); this.渲染件.load(); }
    /* 1.6.3(A5,QA 的 R3)照內容快取:218 張的筆記,重畫一次清單裡光渲染就花 1 秒(實測 993 / 1871ms),
       打字搜尋每打一個字就卡一下。內容一樣的卡片直接複製上一次畫好的 DOM(方框、連結的事件照樣在下面重新掛)。
       ⚠ 有嵌入、外掛的程式碼區塊(Dataview 之類)、可以摺的 callout 不快取 —— 那些是活的,複製只會留下死的快照。
       ⚠ 新增 / 刪除 / 改名檔案時整個清掉:[[連結]] 會從「不存在」變成「存在」。 */
    if (!this.md快取) {
      this.md快取 = new Map();
      const 清 = () => { if (this.md快取) this.md快取.clear(); };
      this.registerEvent(this.app.vault.on("create", 清));
      this.registerEvent(this.app.vault.on("delete", 清));
      this.registerEvent(this.app.vault.on("rename", 清));
    }
    const 快鍵 = 來源 + " " + 顯;
    const 存 = this.md快取.get(快鍵);
    try {
      if (存) {
        容器.append(存.cloneNode(true));
      } else if (MarkdownRenderer && MarkdownRenderer.render) {
        const p = MarkdownRenderer.render(this.app, 顯, 容器, 來源, this.渲染件 || this);
        const 記 = () => {
          if (!容器.isConnected || 容器.querySelector(md不快取)) return;
          const 片 = document.createDocumentFragment();
          容器.childNodes.forEach(n => 片.appendChild(n.cloneNode(true)));
          // 渲染完到記下來之間被勾過的方框不算:照原文(checked 屬性)放回剛畫好的樣子
          片.querySelectorAll("input.task-list-item-checkbox").forEach(b => { const li = b.closest("li"); b.checked = !!(li && li.classList.contains("is-checked")) || b.hasAttribute("checked"); });
          if (this.md快取.size > 600) this.md快取.clear();
          this.md快取.set(快鍵, 片);
        };
        if (p && p.then) p.then(記, () => {}); else 記();
      }
      else throw new Error("no MarkdownRenderer");
    } catch (e) {
      // 退路:拿不到 Obsidian 的渲染就照舊一行一行畫
      容器.empty();
      (k.內容行 || []).forEach((t, i) => 畫預覽行(容器.createDiv(), t, (k.內容符 || [])[i] || "", (勾) => this.切內勾(k, t, 勾), this.app, 來源, T));
      return;
    }
    /* 待辦:方框 ↔ 原文的哪一行。1.6.3(A4,QA 的 R1):
       以前是「第 n 個方框 = 第 n 行待辦」—— callout 裡的待辦(`> - [ ]`)不算、程式碼區塊裡的有時又會被 Obsidian 畫成方框,
       後面的方框就全部錯位,勾到別行。Obsidian 的渲染不帶行號(實測 data-line 是空的),所以改成:
       候選 = 原文裡每一行長得像待辦的(去掉縮排和 `> ` 之後是 `- [ ]` / `1. [ ]`,包括 callout、程式碼區塊);
       照順序往下找,文字對得上的那一行就是它;都對不上才退回下一個候選。 */
    const 候選 = [];
    原.forEach((t, i) => { const m = 勾行Re.exec(t); if (m) 候選.push({ i, 字: 勾字正規(m[3]) }); });
    let 指 = 0;
    容器.querySelectorAll("input.task-list-item-checkbox").forEach((box) => {
      if (指 >= 候選.length) return;
      const li = box.closest("li") || box.parentElement;
      const 字 = 勾字正規(String((li && li.textContent) || "").split("\n")[0]);
      let j = 候選.findIndex((c, n) => n >= 指 && 字 && (c.字.indexOf(字) === 0 || 字.indexOf(c.字) === 0));
      if (j < 0) j = 指;
      指 = j + 1;
      const 行號 = 候選[j].i;
      box.addEventListener("click", (e) => { e.stopPropagation(); this.切內勾行(k, 原, 行號, box.checked); });
    });
    if (容器.__掛連結) return;
    容器.__掛連結 = true;
    容器.addEventListener("click", (e) => {
      const a = e.target && e.target.closest ? e.target.closest("a") : null;
      if (!a || !容器.contains(a)) return;
      if (a.classList.contains("internal-link")) {
        e.preventDefault(); e.stopPropagation();
        const 目標 = a.getAttribute("data-href") || a.getAttribute("href") || "";
        try { this.app.workspace.openLinkText(目標, 來源, e.ctrlKey || e.metaKey); } catch (x) {}
      } else if (a.classList.contains("tag")) {
        e.preventDefault(); e.stopPropagation();
        try { this.app.internalPlugins.getPluginById("global-search").instance.openGlobalSearch("tag:" + a.textContent); } catch (x) {}
      } else {
        e.stopPropagation();          // 外部連結照瀏覽器的規矩開,只是不要順便收合卡片
      }
    });
    容器.addEventListener("mouseover", (e) => {
      const a = e.target && e.target.closest ? e.target.closest("a.internal-link") : null;
      if (!a || !容器.contains(a)) return;
      try {
        this.app.workspace.trigger("hover-link", {
          event: e, source: 視圖種類, hoverParent: this, targetEl: a,
          linktext: a.getAttribute("data-href") || a.getAttribute("href") || "", sourcePath: 來源
        });
      } catch (x) {}
    });
  }
  // 整份重畫之前:上一輪 Markdown 渲染掛的子元件(嵌入等)全部卸掉
  卸渲染件() {
    if (this.渲染件) { try { this.渲染件.unload(); } catch (e) {} this.渲染件 = null; }
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
    const 格 = 區.closest ? 區.closest(".tk-格") : null;
    const 列 = 格 ? 格.parentElement : null;
    if (!格 || !列) { this.重畫清單(); return; }
    /* ⚠⚠ 1.4.5:捲動位置要在重畫**之前**記下來、滑開() 撐回舊高度**之後**才放回去。
       收合最後一張卡片時,重畫完的那一格已經是收好的高度,整份看板變矮,
       瀏覽器立刻把捲動位置夾到新的底 —— 接著滑開() 把它撐回舊高度再往下收,
       使用者看到的是「先往上彈一下,才開始收」。 */
    const 捲 = this.contentEl.scrollTop;
    this.畫內文(格, k, 列);
    const 新區 = 格.querySelector(".tk-文區");
    if (新區) 滑開(新區, 舊高);
    this.contentEl.scrollTop = 捲;
  }

  /* ---- 選單 / 小浮框 ---- */
  /* ---- 換分類(= 換顏色 = 換狀態)----
     1.6.2(B1):一顆色點只有一種意思 ——「把這張卡片搬到這一區」。
     1.6.1 以前一顆色點有兩種意思(淡的 = 把整區改色、實的 = 搬卡片),使用者點顏色想搬一張卡,結果整區一起變色。
     分類改色只在「⋯ 分類與指派人」面板。 */
  /* ⚠ 色盤要開在**分類那一格**,不是日期欄。
     色線雖然釘在整列最前面(日期欄)的左緣,但它換的是「分類」這件事,
     所以面板要長在分類欄裡 —— 開在日期欄會讓人以為在改日期。 */
  開分類選單(e, k) {
    const 觸 = e.currentTarget;
    const 列 = (觸 && 觸.closest ? 觸.closest(".tk-列") : null);
    const 格 = 列 ? 列.querySelector('.tk-格[data-col="分類"]') : null;
    const 區 = this.分類清單.filter(x => !/archive|封存/i.test(x));
    /* 1.6.2(B1):5 個分類以內 → 分類那一格就地換成一排色點(一區一顆);
       6–10 個分類(色點擠不下,使用者明講)、或卡片模式沒有分類欄(以前這裡直接 return,點了沒反應)→ 下拉清單。 */
    if (格 && 區.length <= 5) { this.畫換色盤(格, k); return; }
    if (觸) this.開分類清單(觸, k.分類, (n) => this.搬去分類(k, n));
  }
  // 把這一張卡片搬到另一個分類(= 換狀態 / 換顏色)。只動這一張,設定一個字都不寫。
  async 搬去分類(k, 目標) {
    if (!目標 || 目標 === k.分類) return false;
    const ok = await this.插件.寫手.搬分類(this.file, k, 目標, this.名單);
    if (ok) this.浮到最上(k);
    return ok;
  }
  /* 1.6.2(B1 / B2 / U2)選分類的清單:一列一個分類 = 色點 + 名稱,現在的那一個標出來。
     桌機卡片(分類超過 5 個)、卡片模式的「⋯」、新增卡片的分類圓點,三個地方都用這一個。
     只負責「選」—— 選了要做什麼由呼叫的人決定;這裡不寫任何設定(不再有「按了就把整區改色」)。
     ⚠ 掛在 document.body(新增區、表格格子都有 overflow:clip);點外面就關,但不算開它的那顆鈕(1.5 的規則),
       再按一次同一顆 = 關掉。名字用一般字色,顏色交給圓點(黃色的字在淺色主題上看不清楚)。 */
  // 可選目前:標出來的那一個也可以按(取消封存時它是「建議」,不是「現在在這裡」)
  開分類清單(觸, 目前, 選了, 可選目前) {
    const 舊 = document.body.querySelector(".tk-分類挑");
    if (舊) {
      const 同一顆 = 舊.__觸 === 觸;
      try { if (舊.__關) 舊.__關(); else 舊.remove(); } catch (x) {}
      if (同一顆) return null;
    }
    const 區 = this.分類清單.filter(x => !/archive|封存/i.test(x));
    const 盤 = document.body.createDiv();
    盤.addClass("tk-分類挑");
    盤.__觸 = 觸;
    盤.setAttribute("role", "listbox");
    st(盤, "position:fixed;z-index:9999;padding:5px;border-radius:10px;display:flex;flex-direction:column;gap:1px;" +
      "min-width:150px;max-width:min(280px, calc(100vw - 16px));max-height:min(60vh, 420px);overflow-y:auto;" +
      "background:var(--background-primary);border:1px solid var(--background-modifier-border);" +
      "box-shadow:0 6px 22px rgba(0,0,0,0.28);");
    const 關 = () => {
      try { 盤.remove(); } catch (x) {}
      document.removeEventListener("mousedown", 外, true);
      document.removeEventListener("keydown", 鍵, true);
    };
    盤.__關 = 關;
    const 外 = (ev) => { if (盤.contains(ev.target) || (觸 && 觸.contains && 觸.contains(ev.target))) return; 關(); };
    const 鍵 = (ev) => { if (ev.key === "Escape" || ev.code === "Escape") { ev.stopPropagation(); 關(); } };
    區.forEach(n => {
      const c = this.插件.分類色(n);
      const 是 = n === 目前;
      const 列 = 盤.createDiv();
      列.setAttribute("role", "option");
      列.setAttribute("aria-selected", 是 ? "true" : "false");
      st(列, "display:flex;align-items:center;gap:8px;padding:" + ("8px 10px") + ";border-radius:6px;" +
        "cursor:pointer;font-size:0.88em;line-height:1.3;color:var(--text-normal);" +
        (是 ? "background:var(--background-modifier-hover);font-weight:600;" : ""));
      const 點 = 列.createDiv();
      st(點, "width:12px;height:12px;border-radius:50%;flex:0 0 auto;box-sizing:border-box;" +
        "border:2px solid " + c + ";background:" + 透明(c, 0.35) + ";");
      st(列.createDiv({ text: n }), "min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;");
      if (!是) {
        列.onmouseenter = () => { 列.style.background = "var(--background-modifier-hover)"; };
        列.onmouseleave = () => { 列.style.background = ""; };
      }
      列.onclick = (ev) => { ev.stopPropagation(); 關(); if (!是 || 可選目前) 選了(n); };
    });
    // 開在觸發鈕底下,放不下就翻到上面;左右、上下都夾回畫面裡
    const r = 觸.getBoundingClientRect();
    const 寬 = 盤.offsetWidth || 160, 高 = 盤.offsetHeight || 200;
    盤.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 寬 - 8)) + "px";
    const 想 = (r.bottom + 6 + 高 > window.innerHeight - 8) ? r.top - 6 - 高 : r.bottom + 6;
    盤.style.top = Math.max(8, Math.min(想, window.innerHeight - 高 - 8)) + "px";
    setTimeout(() => { document.addEventListener("mousedown", 外, true); document.addEventListener("keydown", 鍵, true); }, 0);
    return 盤;
  }
  /* 1.6.2(B1)桌機、5 個分類以內:分類那一格就地換成一排色點,**一個分類一顆**(用分類實際的顏色,滑過去看得到名字)。
     按了只做一件事:把**這一張**卡片搬到那一區(= 換狀態 / 換顏色)。
     ⚠ 1.6.1 以前色盤是固定的五色 + 自訂色:按到「沒有分類在用的顏色」會把**整個分類**改色(同一區的卡片一起變色),
       第 6 區以後、用自訂色的分類在卡片上選不到,還有一個看不懂的「重設為自動」。分類改色現在只在「⋯ 分類與指派人」面板。 */
  畫換色盤(格, k) {
    const T = this.T;
    格.empty();
    // 欄寬是固定的(table-layout:fixed),所以色點置中換行、不寫標題那行,省下來的高度留給色點
    st(格, "padding:6px 4px;vertical-align:middle;text-align:center;position:relative;");
    const 盒 = 格.createDiv();
    st(盒, "display:flex;flex-direction:column;align-items:center;gap:5px;width:100%;");
    const 色列 = 盒.createDiv();
    st(色列, "display:flex;gap:5px;flex-wrap:wrap;justify-content:center;width:100%;");
    const 全部鈕 = [];
    this.分類清單.filter(x => !/archive|封存/i.test(x)).forEach((n) => {
      const c = this.插件.分類色(n);
      const 圓 = 色列.createDiv();
      st(圓, "width:15px;height:15px;border-radius:50%;cursor:pointer;flex:0 0 auto;background:" + c + ";" +
        (n === k.分類 ? "outline:2px solid var(--text-accent);outline-offset:1px;" : ""));
      圓.setAttribute("role", "button");
      圓.setAttribute("aria-label", n);            // Obsidian 會把它畫成提示:滑過去看得到分類名稱
      圓.onclick = async (ev) => {
        ev.stopPropagation();
        if (n === k.分類) { this.畫(); return; }
        全部鈕.forEach(x => { x.style.pointerEvents = "none"; });
        盒.empty(); st(盒.createDiv({ text: T.changing }), "font-size:0.72em;");
        await this.搬去分類(k, n);
      };
      全部鈕.push(圓);
    });
    const 取 = 盒.createEl("button", { text: T.cancelWord });
    st(取, "padding:1px 7px;font-size:0.72em;line-height:1.5;cursor:pointer;flex:0 0 auto;box-shadow:none;");
    取.onclick = (ev) => { ev.stopPropagation(); this.畫(); };
  }
  /* 進入編修之後,把那一列拉回該在的位置。
     設定「編輯位置」決定該在哪:
       原位(預設)= 停在按下編輯之前的那個高度,畫面完全不動
       頂端      = 把那一列的頂端貼到看板上緣,長內容從第一行開始看
       不動      = 什麼都不做,交給瀏覽器(1.4.3 之前的行為)
     ⚠ 要連續校正好幾幀,不能只調一次:撐高、聚焦、瀏覽器把聚焦元素捲進畫面
       這三件事不在同一幀發生,只調一次會被後面那一下蓋掉(實測是在 150–250ms 之間)。 */
  編修就位(鍵, 原頂) {
    const 模式 = this.插件.設定.編輯位置 || "原位";
    if (模式 === "不動" || 原頂 === null || 原頂 === undefined) return;
    const 目標 = (模式 === "頂端") ? 6 : 原頂;
    /* ⚠ 1.4.4 在這裡加過「手機上卡片在畫面下半部就先拉到上面」,1.4.5 拿掉了:
       那是為了閃開鍵盤,而 1.4.5 起手機按編輯不再自動聚焦、不跳鍵盤,
       再拉到上面反而變成另一種「按了編輯畫面自己跑」。 */
    const ce = this.contentEl;
    const 截止 = Date.now() + 500;
    const 調 = () => {
      if (!ce || !ce.isConnected) return;
      const 列 = this.找列(鍵);
      if (列) {
        const 差 = Math.round(列.getBoundingClientRect().top - ce.getBoundingClientRect().top - 目標);
        if (差) ce.scrollTop += 差;
      }
      if (Date.now() < 截止) window.requestAnimationFrame(調);
    };
    window.requestAnimationFrame(調);
  }

  /* 只重畫「這一張卡片的內容欄」,不動整份清單。
     按編輯 / 開留言框都走這裡 —— 重畫整份清單會讓捲動位置對不回去,
     看起來就是「按了編輯畫面自己跳走」。 */
  就地重畫(e, k) {
    const 格 = (e && e.currentTarget && e.currentTarget.closest) ? e.currentTarget.closest(".tk-格") : null;
    const 列 = 格 ? 格.parentElement : null;
    if (!格 || !列) { this.重畫清單(); return; }
    /* ⚠⚠ 1.4.5:捲動位置在清空那一格**之前**記下來,畫完再放回去。
       格.empty() 之後到新內容撐開之前,只要量過一次版面(撐高就會量),
       最後一張卡片那一瞬間整份看板變矮,捲動位置就被夾到新的底,之後回不去。 */
    const ce = this.contentEl, 捲 = ce.scrollTop;
    this.畫內文(格, k, 列);
    ce.scrollTop = 捲;
    this.清即時();
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
    st(好, "height:" + (32) + "px;min-height:0;padding:0 12px;cursor:pointer;");
    /* ⚠⚠ 1.4.4:手機上這個面板會超出畫面,右邊的「✓」點不到。
       原因是兩個日期輸入框在 iPhone 上各自有 150px 以上寬,整排加起來 360 多,
       而舊版假設面板固定 320 寬去算 left。
       現在:面板最多只到畫面寬 - 16,放不下就換行;位置照**真的量出來的**寬高去夾,
       下面放不下就翻到上面。 */
    const r = e.currentTarget.getBoundingClientRect();
    {                                   // 1.6.3:只剩卡片版面,一律用手機的排法
      st(盒, 盒.style.cssText + "flex-wrap:wrap;max-width:calc(100vw - 16px);box-sizing:border-box;");
      [起, 迄].forEach(x => st(x, "flex:1 1 130px;min-width:0;height:32px;"));
      st(循, 循.style.cssText + "height:32px;min-height:0;");
    }
    const 寬 = 盒.offsetWidth || 320, 高 = 盒.offsetHeight || 40;
    盒.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 寬 - 8)) + "px";
    const 想 = (r.bottom + 4 + 高 > window.innerHeight - 8) ? r.top - 4 - 高 : r.bottom + 4;
    // 不管翻不翻,最後都夾回畫面裡(日期剛好被捲到畫面外時,算出來會是負的)
    盒.style.top = Math.max(8, Math.min(想, window.innerHeight - 高 - 8)) + "px";
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
    // 1.6.1:循環寫成 [repeat:: every 2 weeks],位置由 組首行 決定
    const ok = await this.插件.寫手.改首行(this.file, k, (首) => 改零件(首, this.名單, p => {
      if (!循 && !p.循) return false;
      p.循 = 循 || null;
    }), this.名單);
    if (ok) {
      new Notice(循 ? T.cycleSaved.replace("N", 循環說明短(循)) : T.cycleNone);
      this.閃一下(k, 320);
    }
    return ok;
  }

  /* 1.6.2(B7)匯出只留長圖,而且在手機上看得清楚(使用者回報:PDF 被擋、長圖太寬、字太小、沒有 Markdown)。
     ・寬 720px(手機、通訊軟體轉傳剛好),內文 16px(= 12pt),標題 20px,輸出 2 倍解析度(圖檔 1440px 寬)。
     ・內容用 Obsidian 的 Markdown 渲染(跟看板上同一套,B4);圖片裡外部 CSS 套不上去,
       所以另外塞一小段淺色的樣式(.ct-md)進去 —— 顏色寫死在這裡是刻意的:匯出永遠是白底。
     ・方框換成 ☐ / ☑ 字(畫成圖片時表單控制項不一定畫得出來)。
     ⚠ 1.6.1 以前還有「列印 / 存成 PDF」:開新視窗再列印,Obsidian 會擋 window.open(拿到的是空的),手機也沒有列印 —— 拿掉了(使用者選 C)。 */
  輸出白底DOM(件) {
    const 全 = this.卡片, 顯 = this.過濾(全);
    const 來源 = this.file ? this.file.path : "";
    const 白 = document.createElement("div");
    白.style.cssText = "width:720px;box-sizing:border-box;padding:20px 20px 22px;background:#ffffff;color:#1a1a1a;" +
      "font-family:-apple-system,'PingFang TC','Noto Sans TC',sans-serif;font-size:16px;";
    const 樣 = document.createElement("style");
    樣.textContent =
      ".ct-md{font-size:16px;line-height:1.55;color:#1a1a1a;overflow-wrap:anywhere;word-break:break-word}" +
      ".ct-md>:first-child{margin-top:0}.ct-md>:last-child{margin-bottom:0}" +
      ".ct-md p{margin:0 0 6px}.ct-md ul,.ct-md ol{margin:2px 0 6px;padding-left:22px}.ct-md li{margin:1px 0}" +
      ".ct-md ul.contains-task-list{list-style:none;padding-left:4px}" +
      ".ct-md hr{border:0;border-top:1px solid #cfcfcf;margin:8px 0}" +
      ".ct-md table{border-collapse:collapse;margin:4px 0 8px;font-size:14px}" +
      ".ct-md th,.ct-md td{border:1px solid #d6d6d6;padding:3px 7px}.ct-md th{background:#f2f2f2}" +
      ".ct-md a{color:#2563eb;text-decoration:none}" +
      ".ct-md code{background:#f1f1f1;border-radius:4px;padding:0 4px;font-size:14px}" +
      ".ct-md mark{background:#fff3a3;color:inherit}.ct-md del{color:#888}" +
      ".ct-md blockquote{margin:4px 0;padding-left:10px;border-left:3px solid #d6d6d6;color:#555}" +
      ".ct-md h1,.ct-md h2,.ct-md h3,.ct-md h4,.ct-md h5,.ct-md h6{font-size:17px;margin:6px 0 4px}";
    白.appendChild(樣);
    const 題 = document.createElement("div");
    題.style.cssText = "font-size:20px;font-weight:700;margin-bottom:4px;line-height:1.35;";
    題.textContent = (this.file ? this.file.basename : "") + "　" + this.篩選標題();
    白.appendChild(題);
    const 副 = document.createElement("div");
    副.style.cssText = "font-size:13px;color:#777;margin-bottom:14px;";
    副.textContent = 顯.length + " " + this.T.cards + "　" + 現在戳();
    白.appendChild(副);

    const 表 = document.createElement("table");
    表.style.cssText = "width:100%;border-collapse:collapse;table-layout:fixed;";
    const 頭 = document.createElement("tr");
    [[this.T.colDate, "96px"], [this.T.colSection, "64px"], [this.T.colBody, ""]].forEach(([字, w]) => {
      const th = document.createElement("th");
      th.textContent = 字;
      th.style.cssText = "border:1px solid #d6d6d6;background:#f2f2f2;padding:6px 7px;" +
        "font-size:13px;color:#555;text-align:center;" + (w ? "width:" + w + ";" : "");
      頭.appendChild(th);
    });
    表.appendChild(頭);
    顯.forEach(k => {
      const tr = document.createElement("tr");
      const 色 = this.插件.分類色(k.分類);
      const td1 = document.createElement("td");
      td1.style.cssText = "border:1px solid #d6d6d6;border-left:5px solid " + 色 + ";" +
        "padding:7px 6px;text-align:center;font-size:14px;vertical-align:top;white-space:pre-line;line-height:1.45;";
      td1.textContent = (k.置頂 ? "📌 " : "") + (k.起日 ? 日期短(k.起日) : "—") +
        ((k.迄日 && k.迄日 !== k.起日) ? "\n" + 日期短(k.迄日) : "");
      tr.appendChild(td1);
      const td2 = document.createElement("td");
      td2.style.cssText = "border:1px solid #d6d6d6;padding:7px 4px;text-align:center;font-size:13px;vertical-align:top;";
      const 圈 = document.createElement("div");
      圈.style.cssText = "width:14px;height:14px;border-radius:50%;margin:2px auto 4px;box-sizing:border-box;" +
        (k.完成 ? "background:#3aa76d;" : "border:2px solid " + 色 + ";");
      td2.appendChild(圈);
      if (k.指派) {
        const 人 = document.createElement("div");
        人.style.cssText = "font-size:13px;font-weight:700;overflow-wrap:anywhere;color:" + this.插件.人色(k.指派) + ";";
        人.textContent = k.指派;
        td2.appendChild(人);
      }
      tr.appendChild(td2);
      const td3 = document.createElement("td");
      td3.style.cssText = "border:1px solid #d6d6d6;padding:7px 9px;vertical-align:top;word-break:break-word;";
      if (k.主題) {
        const p = document.createElement("span");
        p.style.cssText = "display:inline-block;padding:1px 9px;border-radius:10px;font-size:14px;" +
          "font-weight:700;color:" + 色 + ";background:" + 透明(色, 0.14) + ";margin-bottom:4px;";
        p.textContent = k.主題;
        td3.appendChild(p);
      }
      k.留言.forEach(c => {
        const d = document.createElement("div");
        d.style.cssText = "font-size:14px;line-height:1.45;color:#444;border-left:2px solid #ccc;padding-left:8px;margin:2px 0 4px;";
        d.textContent = "💬 " + c.人 + "  " + c.文 + "   " + c.日 + " " + c.分;
        td3.appendChild(d);
      });
      const 內 = document.createElement("div");
      內.className = "ct-md";
      let 畫好 = false;
      try {
        if (MarkdownRenderer && MarkdownRenderer.render && 件) {
          MarkdownRenderer.render(this.app, 顯示md(k.內容原 || [], this.T), 內, 來源, 件);
          畫好 = true;
        }
      } catch (e) {}
      if (!畫好) {
        while (內.firstChild) 內.removeChild(內.firstChild);
        (k.內容原 || []).forEach(t => { const d = document.createElement("div"); d.textContent = t; 內.appendChild(d); });
      }
      內.querySelectorAll("input[type=checkbox]").forEach(b => {
        const s = document.createElement("span");
        s.textContent = b.checked ? "☑ " : "☐ ";
        b.replaceWith(s);
      });
      td3.appendChild(內);
      tr.appendChild(td3);
      表.appendChild(tr);
    });
    白.appendChild(表);
    return 白;
  }

  // 回傳寫出去的圖檔路徑(失敗是 null)
  async 輸出() {
    const T = this.T;
    new Notice(T.exporting);
    const 件 = Component ? new Component() : null;
    if (件) 件.load();
    try {
      // 長圖 PNG:整份 DOM 塞進 SVG 的 foreignObject,再畫到 canvas(2 倍解析度)
      const 白 = this.輸出白底DOM(件);
      const 台 = document.body.createDiv();
      台.style.cssText = "position:fixed;left:-99999px;top:0;";
      台.appendChild(白);
      await new Promise(r => setTimeout(r, 80));
      const w = 720, h = Math.ceil(白.getBoundingClientRect().height) + 8;
      台.remove();
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
        '<foreignObject width="100%" height="100%">' +
        /* ⚠ 用 XMLSerializer,不要用 白.outerHTML —— 兩者結果一樣,但是
           foreignObject 裡面必須是合法的 XML(outerHTML 給的是 HTML 序列化,
           <br> 這種沒有結尾的標籤會讓整張 SVG 解析失敗),而且審核的靜態檢查
           看到 outerHTML 就會問一次。 */
        '<div xmlns="http://www.w3.org/1999/xhtml">' +
        new XMLSerializer().serializeToString(白) + '</div>' +
        '</foreignObject></svg>';
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
      // ⚠ vault 最上層的筆記 parent.path 是 "/",以前會拼出「/名字.png」,檔案找不回來
      const 夾 = (this.file && this.file.parent && this.file.parent.path && this.file.parent.path !== "/") ? this.file.parent.path + "/" : "";
      const 名 = 夾 + (this.file ? this.file.basename : "board") + "-" +
        現在戳().replace(/[: ]/g, "").replace(/-/g, "") + ".png";
      await this.app.vault.createBinary(名, buf);
      new Notice(T.exported + "：" + 名);
      return 名;
    } catch (e) {
      new Notice(T.exportFail);
      return null;
    } finally {
      if (件) { try { 件.unload(); } catch (x) {} }
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
    // 1.6.3(ADR 1.6.3-01)主題、指派人從輸入框裡拿:#主題(前面或後面,最多 3 個)、@名字
    const 析 = 析輸入(this.內輸 ? this.內輸.value : s.新內容, this.名單);
    // C22(使用者 09-20:「要限制使用者不能打超過六個字」):新打的主題最多 6 個中文字寬,截掉的說一聲
    const 原題們 = 題表(題表(s.新主題).concat(析.題們));
    const 題們 = 題表(原題們.map(題限));
    if (題們.join(" ") !== 原題們.join(" ")) new Notice(T.topicCut);
    const 題 = 題們.join(" ");
    const 文 = 析.文.trim();
    if (!題 && !文) { new Notice(T.needSomething); return; }
    // U33(1.6.3):沒有「不指派」了 —— 沒選過就是「這台電腦是誰」,再退回名單第一個。輸入框裡打了 @名字 就用它
    const 人 = this.個人 ? "" : (析.人 || 人選之(s.新指派, this.我是誰(), this.名單));
    const d = this.新增日期();
    // 1.6.1:開著自動項目符號,沒有自己打符號的行才加「- 」;待辦的各種打法整理成「- [ ] 」
    const 段 = 照打段(文);            // 1.6.2(B3):縮排、空行、行中的空白照打的
    /* 1.6.1:有主題的卡片,內容全部從第二行開始;只打主題、內容留空,就**沒有內容**
       (以前會把主題再抄一份當第一行內容)。沒有主題的卡片,第一行內容留在第一行。
       「週期」那一格新增的卡片:從今天開始、每週一次。 */
    const 首行 = 組首行({
      題: 題 || null, 文: (!題 && 段.length && !/^\s/.test(段[0]) && 可放首行(段[0])) ? 段.shift() : "",
      起: d.起 || null, 迄: d.迄 || null, 人: 人 || null,
      循: s.新循環 || (d.週期 ? { 型: "週", 隔: 1 } : null)
    });
    const 尾行 = 段.map(x => { if (!x) return ""; const 空 = 前空白(x); return "\t" + 空 + 新增行(x.slice(空.length)); })
      .concat([組編行(現在戳())]);
    /* 1.4.6 拿掉了「這一行跟另一張卡片一模一樣」的提醒。第一行一樣的卡片現在分得開了
       (整行原文、到秒的時戳、內容指紋,見 定位文),不必再叫使用者去改字。 */
    const ok = await this.插件.寫手.新增卡片(this.file, s.新分類, 首行, 尾行);
    if (ok) {
      // 清空主題和內容(它們同時是搜尋框,不清就會把清單篩成只剩這一張)
      s.新主題 = ""; s.新內容 = ""; s.搜尋 = ""; s.新循環 = null;
      this.__記題 = null; this.__記前 = null;
      if (人 && !析.人) 存我是誰(人);
      // ADR 1.6.3-01:新的 @名字 自動加進指派人名單
      if (析.人 && this.名單.indexOf(析.人) < 0) this.插件.設定.指派人 = this.名單.concat([析.人]);
      const 新鍵 = 鍵由行們(首行, 尾行, this.名單);
      /* 新卡片一定要看得到:排序切回「最近編輯」(新的就在第一列),
         篩選切到看得到它的那一段,再捲過去。U55:這整組都算「跳轉」,關掉設定要整組都不動,
         不能只關捲動、排序和篩選照樣切(2026-09-22 修)。 */
      const 要跳 = this.插件.設定.跳轉_新增 !== false;
      if (要跳) {
        this.插件.設定.排序 = "編修";
        if (d.週期) s.篩 = { 型: "週期" };
        else if (d.起) {
          const 區 = this.現在區間();
          if (!區 || d.起 < 區[0] || d.起 > 區[1]) this.回到今天();
        }
        this.要看的卡 = 新鍵;
      }
      await this.插件.存設定();
      this.畫();     // 1.6.4(B1):要看的卡 已經設好了,畫() 自己會捲過去,不用再呼叫一次 捲到卡
      /* ⚠⚠ preventScroll 不能省。題輸在看板的最上面,focus() 預設會**把它捲進畫面**,
         也就是把上面那一次「捲到新卡片」整個抵銷掉、直接彈回最頂端。
         沒有置頂卡片的時候看不出來 —— 新卡片本來就排第一列,兩個位置剛好一樣;
         一旦有幾張置頂的把它往下擠,就變成「按了新增,畫面跳到最上面,新卡片不知道在哪」。 */
      setTimeout(() => this.聚焦輸入({ preventScroll: true }), 220);
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
      const m = 讀留言(去符(t || ""));
      return !!m && m.id === c.id && m.文 === c.文;
    };
    const 新行 = 內 ? 組留言行文(c.日, c.分, c.人, 內) : null;
    await this.插件.寫手.改一行(this.file, k, 認, 新行, this.名單);   // 清空 = 刪掉
    this.狀態.改留 = null;
  }
  /* 1.6.1 勾 / 取消勾 內容裡的待辦(`- [ ] …`)。只改那一行。
     t 是畫面上那一行(去掉符號之後);新寫法有主題的卡片,第一行的 #標籤 會接在第一行內容後面顯示,所以也認「t 的開頭」。 */
  /* 1.6.3(A4)勾原文的第 行號 行(畫md 對好的)。在檔案裡找「內容一樣的第幾個」那一行,
     只換 `[ ]` ↔ `[x]` 那一個字,前面的縮排、`> `、符號、後面的字都照原樣(callout 裡的待辦也勾得到)。 */
  async 切內勾行(k, 原, 行號, 勾上) {
    const 目標 = String(原[行號] || "").trim();
    if (!目標) return;
    let 第 = 0;
    for (let i = 0; i < 行號; i++) if (String(原[i] || "").trim() === 目標) 第++;
    let 見 = 0;
    const 認 = (x) => {
      if (!/^[ \t]/.test(x || "")) return false;          // 只找內容行,不找卡片第一行
      if (String(x).trim() !== 目標) return false;
      return 見++ === 第;
    };
    const 換 = (x) => x.replace(/^([ \t]*(?:>[ \t]?)*[ \t]*(?:[-*+]|\d+[.)])[ \t]+)\[(?: |x|X)\]/, "$1[" + (勾上 ? "x" : " ") + "]");
    const ok = await this.插件.寫手.改一行(this.file, k, 認, 換, this.名單);
    if (!ok) this.重畫清單();          // 沒寫進去:把 checkbox 放回原本的樣子
  }
  async 切內勾(k, t, 勾上) {
    const 認 = (x) => {
      if (!/^[ \t]/.test(x || "")) return false;          // 只找內容行,不找卡片第一行
      const y = 內文之(x);
      return 內勾Re.test(y) && (y === t || t.indexOf(y + " #") === 0);
    };
    const 換 = (x) => {
      const y = 內文之(x), m = 內勾Re.exec(y);
      return 前空白(x) + "- [" + (勾上 ? "x" : " ") + "] " + y.slice(m[0].length);
    };
    const ok = await this.插件.寫手.改一行(this.file, k, 認, 換, this.名單);
    if (!ok) this.重畫清單();          // 沒寫進去:把 checkbox 放回原本的樣子
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
  /* 回傳:true = 寫好了(或本來就沒有要寫的)、false = 沒寫進去、undefined = 框已經不在(不是收工,放棄這一次)。
     最後值:收工的時候由 收掉編修() 帶進來 —— 框等一下就要卸掉,不能再回頭讀 ta.value。 */
  async 自動存(k, ta, 最後值) {
    /* ⚠ 這裡**不可以**檢查「現在編修的是不是這一張」。
       使用者按另一張卡片的「編輯」時,狀態那一瞬間就換過去了,
       這一張還沒寫進去的字就會被這個檢查擋掉、然後永遠消失。
       唯一該看的是「那個輸入框還在不在畫面上」。 */
    const 收尾 = 最後值 !== undefined && 最後值 !== null;
    if (!收尾 && (!ta || !ta.isConnected)) return;
    const 內 = 收尾 ? 最後值 : ta.value;
    /* ⚠⚠ 1.6.3:先看「前一棒還在寫嗎」,**再**比「跟上次存的一樣嗎」。
       前一棒寫的是「有新一行」的版本,但它要寫完才會把 上次存的 換過去;中間這段時間 上次存的 還是舊的原文。
       這時候 Ctrl+Z 退回原文再按 Esc:原文 === 還沒換過去的 上次存的 → 以為沒改、不寫 → 前一棒寫完,
       檔案裡留著使用者已經復原掉的那一行。editor-test 重載後第一次跑才會碰到(寫手比較慢)。 */
    if (this.存中) {
      /* ⚠⚠ 1.6.2:收工(按完成 / Esc)的時候,前一次存檔還沒結束(寫完之後寫手還會留一段緩衝),
         以前是排到 400ms 之後再試 —— 那時候編修框已經卸掉,排好的那一次看到框不在了就放棄,
         使用者最後改的字就沒了。收工的這一次帶著字,等前一棒結束再寫。 */
      if (收尾) { try { await this.存承; } catch (e) {} return await this.自動存(k, ta, 內); }
      clearTimeout(this.存計時); this.存計時 = setTimeout(() => this.自動存(k, ta), 400); return;
    }
    if (內 === this.上次存的) return true;
    this.存中 = true;
    let 放 = null;
    this.存承 = new Promise(r => { 放 = r; });
    this.略過到 = Date.now() + 2500;
    let r = null;
    try {
      // ⚠ 1.6.1:不可以再先 去符多行 —— 使用者自己打的「- 」會被吃掉
      r = await this.插件.寫手.換內容(this.file, k, 內, this.名單, null);
    } finally { this.存中 = false; 放(); }
    if (r === false || r === null || r === undefined) {
      this.略過到 = 0;
      new Notice(this.T.saveFailed);
      return false;                             // 字還在框裡,下一次停手會再試
    }
    this.上次存的 = 內;
    const 舊鍵 = k.鍵;
    // ⚠ 比的是 基鍵:重複卡片的 鍵 帶序號,寫手回來的只有基鍵,第一行沒改也會看起來「不一樣」
    if (typeof r === "string" && r !== 基鍵之(舊鍵)) {
      // 第一行改過了 = 這張卡片的身分換了,記憶體裡的每一處都要跟著換
      k.鍵 = r; k.基鍵 = r;
      if (this.狀態.編修 === 舊鍵) this.狀態.編修 = r;
      if (this.草稿 && this.草稿[舊鍵] !== undefined) {
        this.草稿[r] = this.草稿[舊鍵]; delete this.草稿[舊鍵];
      }
      // 1.6.2(B5):展開、留言展開也是用鍵記的,身分換了一起搬,不然存完就自己收起來
      [this.狀態.展開, this.狀態.留言展開].forEach(表 => {
        if (表 && 表[舊鍵]) { 表[r] = true; delete 表[舊鍵]; }
      });
      const 列 = this.找列(舊鍵);
      if (列) 列.__鍵 = r;
    }
    const 新行們 = 內.replace(/\r/g, "").split("\n").filter(x => 內文之(x));
    k.內容行 = 新行們.map(內文之);
    k.內容符 = 新行們.map(取符);
    k.內容原 = 照打段(內);                      // 1.6.2(B3)
    return true;
  }

  /* 把還沒寫進去的那一下寫掉,然後把編修相關的狀態清乾淨。
     ⚠ 任何會讓編修框消失的動作(按完成、切去編另一張、開留言框)都要先過這裡,
       不然那一下的字就跟著框一起不見了。
     失敗就留著:1.6.2 起 完成編輯() 用它 —— 沒寫進去就不要把框關掉,字還在框裡,可以再按一次。
     回傳 true / false = 有沒有寫進去。 */
  async 收掉編修(失敗就留著) {
    clearTimeout(this.存計時);
    const ta = this.編框, k = this.編修卡;
    let 好 = true;
    if (ta && ta.isConnected && k) 好 = (await this.自動存(k, ta, ta.value)) !== false;
    if (!好 && 失敗就留著) return false;
    if (ta && ta.卸) ta.卸();                  // 1.6.1 即時預覽編輯器要卸掉
    this.編框 = null;
    this.編修卡 = null;
    this.上次存的 = null;
    this.略過到 = 0;
    return 好;
  }

  /* 按「完成」或 Esc:把還沒寫的那一下寫掉,然後回到閱讀模式 */
  async 完成編輯(k) {
    if (this.收工中) return;                     // 點外面 + 按 Esc 可能同時進來
    this.收工中 = true;
    try {
      const 題框 = (() => { const 列 = this.找列(k.鍵); return 列 ? 列.querySelector(".tk-題編") : null; })();
      const 題 = 題框 ? String(題框.value || "").trim() : null;
      /* 收合動畫要「從編修框那麼高」滑到「收起來那麼高」,所以高度要**在重畫之前**量。
         重畫之後才量,量到的已經是收好的高度,動畫就沒有起點了。 */
      let 舊高 = 0;
      try {
        const 列 = this.找列(k.鍵);
        const 區 = 列 && 列.querySelector(".tk-文欄");
        if (區) 舊高 = Math.ceil(區.getBoundingClientRect().height);
      } catch (e) {}
      // ⚠ 會把 k.鍵 更新成新的。1.6.2:最後一次沒寫進去就不關框(字還在,Notice 已經說了)
      if (!(await this.收掉編修(true))) return;
      if (題 !== null && 題 !== (k.主題 || "")) {
        await this.插件.寫手.改主題(this.file, k, 題, this.名單);
      }
      this.狀態.編修 = null;
      if (this.草稿) delete this.草稿[k.鍵];
      /* 1.6.2(B5):編輯時整張內容都看得到,存完也維持展開 —— 不要一存檔就縮回兩行。
         換篩選(畫() 發現篩選或游標變了)或按「收合」才收起來(使用者 1.6.1 開發日誌寫的)。 */
      this.狀態.展開[k.鍵] = true;
      const 捲 = this.contentEl.scrollTop;
      this.畫();
      if (舊高) {
        const 列2 = this.找列(k.鍵);
        const 區2 = 列2 && 列2.querySelector(".tk-文欄");
        if (區2) 滑開(區2, 舊高);
      }
      /* ⚠ 1.4.5:滑開() 會先把那一塊撐回「編修框那麼高」再往下收。
         捲動位置要等它撐回去**之後**才放回來 —— 畫() 裡面放的那一次是在收好的(比較矮的)
         版面上放的,最後一張卡片會先被夾到底、往上彈一下,才開始收。 */
      this.contentEl.scrollTop = 捲;
      this.閃一下(k, 120);
    } finally { this.收工中 = false; }
  }



  /* 分類名稱膠囊(1.5):分類的標題當成狀態看(例如紅色那一區叫「等回復」)。
     點一下是換分類的選單 —— 跟點左邊色條同一個,換分類就是換狀態。 */
  畫分類名(容器, k) {
    const c = this.插件.分類色(k.分類);
    // 1.5.1:不要框,就是一行 `#等回復` 小字 —— 框圈跟主題膠囊、張數徽章長得太像
    const 名 = 膠囊(容器, "#" + k.分類);
    st(名, "display:inline-block;max-width:100%;min-width:0;min-height:0;line-height:1.3;padding:0;" +
      "box-sizing:border-box;font-size:" + ("0.66em") + ";font-weight:600;" +
      "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;box-shadow:none;" +
      // 比主題淡 20%:主題是主角,分類名稱是旁註
      "border:0;background:none;opacity:0.8;color:" + c + ";");
    名.title = k.分類 + " —— " + this.T.changeSection;
    名.onclick = (e) => { e.stopPropagation(); this.開分類選單(e, k); };
    return 名;
  }

  async 切置頂(k) {
    const ok = await this.插件.寫手.改首行(this.file, k, (首) => 改零件(首, this.名單, p => { p.頂 = !p.頂; }),
      this.名單);
    // 置頂會把卡片搬到置頂表 —— 預設跟著跑過去,設定可以關(1.4.7)
    if (ok && this.插件.設定.跳轉_置頂 !== false) this.浮到最上(k);
    return ok;
  }
  /* 打勾 / 取消打勾。
     ⚠ 打完勾之後那張卡片可能會從現在的篩選裡消失(例如關掉「已完成」),
       使用者會以為卡片不見了。所以:
         ① 告訴他搬到哪裡去了(已搬到 完成區 / 未完成區 / 已封存)
         ② 設定開的話,浮到最上面捲過去(排序預設就是「最近編修的最上面」,打勾會蓋時戳)
         ③ 三秒內圓點變成「↺」,按了就退回去 */
  async 切完成(k) {
    const T = this.T, 設 = this.插件.設定.排程顯示;
    const 變完成 = !k.完成;
    const 取消釘 = 變完成 && !!this.插件.設定.完成取消置頂;
    const ok = await this.插件.寫手.改首行(this.file, k, (首) => 改零件(首, this.名單, p => {
      p.勾 = p.勾.toLowerCase() === "x" ? " " : "x";
      // 1.5:設定打開的話,打勾完成時順便取消置頂(同一次寫入)
      if (取消釘) p.頂 = false;
    }), this.名單);
    if (!ok) return;
    // ② CR-1.6.3-01:未完成 / 已完成是各自獨立的複選,不自動切開關(打一個勾不該動到使用者自己選的顯示範圍);
    //    那張卡片 2 秒內留在畫面上、色條是 ↺(見 合顯示)
    const 要跳 = 變完成 ? this.插件.設定.跳轉_未完成到完成 : this.插件.設定.跳轉_完成到未完成;
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
    this.捲到卡(k.鍵, k);
  }

  /* 捲到某一張卡片,然後閃一下。
     ⚠⚠ 不可以用「等固定幾毫秒再去找那一列」。那一列要等寫檔完成 → Obsidian 回頭
       呼叫 setViewData → 重畫,才會出現在 DOM 裡;檔案大一點、同步慢一點,
       那個時間就從 100 毫秒變成兩秒。等不夠久 = 找不到列 = 完全不捲,
       而且使用者看到的是「有時候會跳、有時候不會」,最難查的那一種。
     所以改成**找到才動**:每一格畫面找一次,找到就捲過去,最多找兩秒就放棄。
     ⚠⚠ 1.6.4(B1):一定要瞬間捲(behavior:"auto"),不可以 smooth ——
       這裡不在「動畫只剩展開/收合、動作之後閃一下」的名單上。置頂多的時候新卡片離得遠,
       smooth 捲動飛在半路,寫檔讓 Obsidian 回頭呼叫 setViewData → 畫() 重畫,
       畫() 會讀、寫回 scrollTop(見 畫()),讀到的正是飛到一半的座標,
       寫回去等於把還在飛的捲動硬生生中止在半路,畫面就卡住不動了。瞬間捲不會有這個空檔。 */
  捲到卡(鍵, k) {
    const 截止 = Date.now() + 2000;
    const 試 = () => {
      if (!this.contentEl || !this.contentEl.isConnected) return;
      const 列 = this.找列(鍵);
      if (!列) {
        if (Date.now() < 截止) { window.requestAnimationFrame(試); }
        else { this.要看的卡 = null; }
        return;
      }
      try { 列.scrollIntoView({ block: "center", behavior: "auto" }); } catch (e) {}
      this.要看的卡 = null;
      this.閃一下(k || 鍵);
    };
    window.requestAnimationFrame(試);
  }

  /* 先找完全一樣的鍵;找不到才退一步用基鍵找(1.4.6)——
     剛新增、剛改完第一行的卡片,手上拿的是基鍵,重畫之後如果剛好跟別張重複,它的鍵會多一個序號。 */
  找列(鍵) {
    try {
      const 列們 = Array.from(this.contentEl.querySelectorAll(".tk-列"));
      return 列們.find(tr => tr.__鍵 === 鍵) ||
        列們.find(tr => tr.__卡 && tr.__卡.基鍵 === 基鍵之(鍵)) || null;
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
      setTimeout(() => { try { 列.removeClass("tk-閃"); } catch (e) {} }, 1550);     // 動畫 1.4s(C21)
    };
    setTimeout(跑, 延遲 === undefined ? 60 : 延遲);
  }
  設指派(k, 人) {
    return this.插件.寫手.改首行(this.file, k, (首) => 改零件(首, this.名單, p => { p.人 = 人 || null; }),
      this.名單);
  }
  async 設日期(k, 起, 迄) {
    const ok = await this.插件.寫手.改首行(this.file, k, (首) => 換日期(首, 起, 迄), this.名單);
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
    // 1.6.1 的 Done{2026-09-16} 跟舊的「✔ 本次完成 26-09-16(三)」都比「26-09-16」那一段
    const 只日 = (x) => { const m = /(\d{2}-\d{2}-\d{2})(?!\d)/.exec(String(x || "")); return m ? m[1] : ""; };
    const 已記 = (k.內容行 || []).filter(x => 本次完成Re.test(x)).map(只日);
    // ② 同一天不重複記
    if (已記.indexOf(只日(日期短(這次))) >= 0) {
      new Notice(T.alreadyDone.replace("N", 日期短(這次)));
      return;
    }
    // ③ 推到今天之後
    let 新日 = 下一次(這次, k.循環);
    for (let i = 0; i < 400 && 新日 <= this.今; i++) 新日 = 下一次(新日, k.循環);
    const 記 = 組完成記(這次);
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
    const 列 = this.找列(k.鍵);
    if (!列) return;
    const 格 = 列.lastElementChild;
    if (!格) return;
    格.empty();
    const 盒 = 格.createDiv();
    st(盒, "display:flex;align-items:center;gap:10px;padding:4px 0;flex-wrap:wrap;");
    st(盒.createDiv({ text: T.deleteAsk }), "font-size:0.86em;color:var(--color-red, #e05252);font-weight:700;");
    const 是 = 盒.createEl("button", { text: T.deleteYes });
    st(是, this.小鈕樣(true) + "background:var(--color-red, #e05252);border-color:var(--color-red, #e05252);color:#fff;");
    是.onclick = async () => {
      是.disabled = true; 是.setText("…");
      const ok = await this.插件.寫手.刪卡片(this.file, k, this.名單);
      if (ok) new Notice(T.deleted);
    };
    const 否 = 盒.createEl("button", { text: T.cancelWord });
    st(否, this.小鈕樣(false));
    否.onclick = () => this.重畫清單();
  }

  /* 1.6.2(B6)取消封存:先問要回到哪一區(預設 = 這個主題最近用過的分類,沒有就第一區)。
     以前讀 k.原分類,但整份程式沒有地方寫它,所以一律回到第一個分類。
     要自動回原區就得把原分類記在筆記裡(格式變動),那是 1.7 分類封存的事;這一版先問(不改格式)。
     ⚠ 這裡不用「再按一次確定」:從清單挑一區本身就是確認。 */
  選區取消封存(觸, k) {
    const 活 = this.分類清單.filter(x => !/archive|封存/i.test(x));
    const 預 = (k.主題 && this.主題最近分類(this.卡片, k.主題)) || 活[0];
    this.開分類清單(觸, 預, (n) => this.切封存(k, true, n), true);
  }

  async 切封存(k, 已封存, 指定到) {
    const T = this.T, 設 = this.插件.設定.排程顯示;
    const 原 = k.分類;                  // 封存之前在哪一區:「復原」要回到這裡
    const 到 = 已封存 ? (指定到 || k.原分類 || this.分類清單.find(x => !/archive|封存/i.test(x)) || "紅色") : 封存區;
    const ok = await this.插件.寫手.搬分類(this.file, k, 到, this.名單);
    if (!ok) return;
    /* 1.4.6:要不要自動勾篩選並跳過去,三種各自一個設定。
       封存 → 看「封存」那一個;取消封存 → 卡片回到未完成或已完成,看那一個。 */
    const 設定 = this.插件.設定;
    const 要跳 = !已封存 ? 設定.跳轉_封存 !== false
      : (k.完成 ? 設定.跳轉_未完成到完成 !== false : 設定.跳轉_完成到未完成 !== false);
    if (要跳) {
      let 調 = false;
      if (!已封存 && !設.封存) { 設.封存 = true; 調 = true; }
      if (已封存 && k.完成 && !設.完成) { 設.完成 = true; 調 = true; }
      if (已封存 && !k.完成 && !設.未完成) { 設.未完成 = true; 調 = true; }
      if (調) await this.插件.存設定();
    }
    this.記剛動過(k, 已封存 ? T.movedBack.replace("N", 到) : T.movedArchive,
      () => 已封存 ? this.切封存(k, false) : this.切封存(k, true, 原));      // 1.6.2:復原封存 = 回到原本那一區
    // ⚠ 封存 = 卡片整張搬到另一段去了。不捲過去的話使用者只看到它「消失」
    if (要跳) this.浮到最上(k);
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
    /* ⚠ 要在 registerView / addRibbonIcon **之前**註冊,
       不然第一次畫出來的分頁圖示會是空白的。 */
    addIcon(圖示名, 圖示SVG);
    目前app = this.app;       // 快捷鍵要問 app.hotkeyManager,見 取md快捷()
    md表 = null;              // 重載外掛時把上一輪讀到的鍵位丟掉
    語言設定 = this.設定.語言 || "auto";
    自動項目符 = false;      // 1.6.1:設定拿掉了,舊的 data.json 裡的「項目符號」不再有作用
    週起日 = this.設定.週起始 === "日" ? 0 : 1;
    送出用Enter = this.設定.送出鍵 === "Enter";
    this.T = 語();
    delete this.設定.狀態選項;       // 1.5 開發中的獨立狀態標籤拿掉了(狀態 = 分類),留下的設定清掉
    // 1.5:釘選主題改成每份筆記一組。舊的共用陣列先收起來,各筆記第一次打開時認領(見 認領舊釘選)
    if (Array.isArray(this.設定.釘選主題)) {
      this.設定.釘選主題_舊 = this.設定.釘選主題.slice();
      this.設定.釘選主題 = {};
    }
    if (!this.設定.釘選主題 || typeof this.設定.釘選主題 !== "object") this.設定.釘選主題 = {};
    this.寫手 = new 寫手(this.app, this.T);
    this.分類序 = {};

    /* 動畫不再是一個選項。只剩下「展開/收合」和「動作之後閃一下」兩處,
       都很短、都在卡片自己身上;唯一該尊重的是**系統層級**的減少動態設定。 */
    要動畫 = () => {
      try { return !window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return true; }
    };
    this.registerView(視圖種類, (leaf) => new 看板視圖(leaf, this));
    // 1.6.2(B4):卡片裡的 [[連結]] 滑過去有頁面預覽;要不要按 Ctrl 在 Obsidian「頁面預覽」的設定裡改
    try { this.registerHoverLinkSource(視圖種類, { display: "Card Table", defaultMod: false }); } catch (e) {}
    this.addSettingTab(new 設定頁(this.app, this));

    this.addCommand({
      id: "toggle-board",
      name: this.T.openBoard,
      icon: 圖示名,
      checkCallback: (只問) => {
        const leaf = this.app.workspace.activeLeaf;
        if (!leaf) return false;
        const t = leaf.getViewState().type;
        // 1.6.1:Kanban 這類外掛開著的 .md 筆記也能切過來
        const 檔 = leaf.view && leaf.view.file;
        if (t !== 視圖種類 && !(檔 && 檔.extension === "md")) return false;
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

    // 留著它:設定裡換語言的時候,側邊欄這顆的提示文字要跟著換(1.4.6)
    this.絲帶 = this.addRibbonIcon(圖示名, this.T.openBoard, () => this.絲帶按下());

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
        .setIcon(在看板 ? "file-text" : 圖示名)     // 跟分頁、側邊欄同一顆圖示
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
    /* ⚠⚠ 1.4.7:跟別的外掛(例如 Kanban)**同時**攔截 setViewState 時要能和平共處。
       以前卸載時直接把原型上的函式設回「我們載入那一刻」的版本 ——
       如果 Kanban 比我們晚載入、把它的攔截包在我們外面,這一設就連 Kanban 的攔截一起拆掉了,
       Kanban 看板在重新載入 Obsidian 之前都會變回純 Markdown。
       現在:① 我們的攔截帶一個開關,卸載時先關掉(變成直接轉手給下一層);
            ② 只有在原型上掛的**還是我們這一個**時才換回去,不是的話就留著讓它轉手。
       這就是 monkey-around 那一套的做法。 */
    const 原setViewState = WorkspaceLeaf.prototype.setViewState;
    const 我的攔截 = function (state, ...其餘) {
      try {
        if (我的攔截.啟用 && state && state.type === "markdown" && state.state && state.state.file &&
            該用看板路(state.state.file)) {
          state = Object.assign({}, state, { type: 視圖種類 });
        }
      } catch (e) {}
      return 原setViewState.apply(this, [state, ...其餘]);
    };
    我的攔截.啟用 = true;
    WorkspaceLeaf.prototype.setViewState = 我的攔截;
    this.register(() => {
      我的攔截.啟用 = false;
      if (WorkspaceLeaf.prototype.setViewState === 我的攔截) WorkspaceLeaf.prototype.setViewState = 原setViewState;
    });

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
    // 1.5:每份筆記的釘選主題也是用路徑記的,一起搬
    const 照路徑記的 = ["看板檔案", "釘選主題"];
    this.registerEvent(this.app.vault.on("rename", async (檔, 舊路) => {
      let 動 = false;
      照路徑記的.forEach(鍵 => {
        const m = this.設定[鍵];
        if (m && !Array.isArray(m) && Object.prototype.hasOwnProperty.call(m, 舊路)) {
          m[檔.path] = m[舊路]; delete m[舊路]; 動 = true;
        }
      });
      if (動) await this.存設定();
    }));
    this.registerEvent(this.app.vault.on("delete", async (檔) => {
      let 動 = false;
      照路徑記的.forEach(鍵 => {
        const m = this.設定[鍵];
        if (m && !Array.isArray(m) && Object.prototype.hasOwnProperty.call(m, 檔.path)) {
          delete m[檔.path]; 動 = true;
        }
      });
      if (動) await this.存設定();
    }));

    this.addCommand({
      id: "scan-auto",
      name: this.T.scanNow,
      callback: () => { if (this.自動掃) this.自動掃(true); new Notice(this.T.scanned); }
    });
    this.addCommand({
      id: "whats-new",
      name: this.T.whatsNew,
      callback: () => this.秀更新介紹(true)
    });
    this.addCommand({
      id: "export-layout-diagnostics",
      name: 語() === 字典["en"] ? "Export layout diagnostics (for bug reports)" : "匯出版面診斷(回報問題用)",
      callback: () => this.匯出版面診斷()
    });
    // 1.6.1:安裝或更新之後跳一次這一版的更新介紹
    this.app.workspace.onLayoutReady(() => this.秀更新介紹(false));
  }

  onunload() {}

  /* ============================================================
     1.6.1 即時預覽編輯器(使用者:「md 編輯時沒有即時顯示、不能 undo」)
     ------------------------------------------------------------
     卡片內容改用 Obsidian 自己的編輯器(CodeMirror 6 + 即時預覽):
     粗體、螢光、連結當場呈現,Ctrl+Z、所有快捷鍵、[[ 建議都是 Obsidian 原生的。
     ⚠ Obsidian 沒有公開這個類別。做法跟 Kanban 外掛一樣:開一個看不見的 Markdown 嵌入,
       叫它進入編輯模式,從 editMode 的原型鏈拿到建構子。任何一步失敗就回傳 null,
       呼叫的人退回原本的 textarea —— 不能因為 Obsidian 改版就讓卡片不能編輯。 */
  取即時編輯器類() {
    if (this.__編類 !== undefined) return this.__編類;
    this.__編類 = null;
    try {
      const md = this.app.embedRegistry.embedByExtension.md({ app: this.app, containerEl: createDiv(), state: {} }, null, "");
      md.load(); md.editable = true; md.showEditor();
      const 類 = Object.getPrototypeOf(Object.getPrototypeOf(md.editMode)).constructor;
      md.unload();
      if (typeof 類 === "function" && typeof 類.prototype.buildLocalExtensions === "function") this.__編類 = 類;
    } catch (e) { console.warn("[card-table] 拿不到即時預覽編輯器,改用一般輸入框", e); }
    return this.__編類;
  }
  /* 在 容器 裡建一個即時預覽編輯器。
     選 = { 改了(值), 收工(), 送出(), 取消(), 提示: 空白時的灰字, 提示圖: [Lucide 名字…] }
       送出鍵 → 送出 ?? 收工;Esc → 取消 ?? 收工。
     回傳一個長得像 textarea 的物件(value / isConnected / disabled / style / focus()),
     自動存、送留言 那幾套不用改;另外有 聚焦(尾, 全選)、卸()、編輯器。
     ⚠ 用完一定要 卸():編輯器是掛在外掛底下的子元件,DOM 被拿掉它也還活著(看板用 即時編 / 清即時 管)。 */
  建即時編輯(view, 容器, 初值, 選) {
    const 類 = this.取即時編輯器類();
    if (!類) return null;
    try {
      const app = this.app;
      let 提示 = null;
      const 更新提示 = () => { if (提示 && ed) 提示.style.display = ed.editor.getValue() ? "none" : ""; };
      class 卡片編輯器 extends 類 {
        updateBottomPadding() {}                  // 不要在卡片底下留一大段捲動空白
        onUpdate(u, 變) {
          super.onUpdate(u, 變);
          if (!變) return;
          更新提示();
          if (選.改了) 選.改了(this.editor.getValue());
        }
      }
      let ed = null;
      const 控 = {
        app: app, scroll: 0, editMode: null,
        showSearch() {}, toggleMode() {}, onMarkdownScroll() {}, getMode: () => "source",
        get editor() { return ed ? ed.editor : null; },
        get file() { return view.file; },
        get path() { return view.file ? view.file.path : ""; }
      };
      // 卡片裡不要行號、不要折疊箭頭(照 Kanban 的做法,只在這個編輯器看到的 app 上蓋掉)
      const 關掉 = { showLineNumber: 1, foldHeading: 1, foldIndent: 1 };
      const app代 = new Proxy(app, { get: (t, p, r) => p !== "vault" ? Reflect.get(t, p, r) :
        new Proxy(app.vault, { get: (t2, p2, r2) => p2 !== "config" ? Reflect.get(t2, p2, r2) :
          new Proxy(app.vault.config, { get: (t3, p3, r3) => 關掉[p3] ? false : Reflect.get(t3, p3, r3) }) }) });
      ed = this.addChild(new 卡片編輯器(app代, 容器, 控));
      控.editMode = ed;
      ed.set(初值 || "");
      容器.addClass("tk-即時編");
      /* ⚠ 1.6.1 手機實測:iPhone 上新增卡片的內容框被撐到快 400px 高。
         手機版 Obsidian 會用**行內樣式**在編輯器底下加一大段空白(讓整頁筆記能捲過最後一行),
         行內樣式壓過 CSS,桌機的手機模擬也看不到。所以這幾層只要被寫上底部空白 / 最小高度就清掉。 */
      const 壓扁 = () => {
        容器.querySelectorAll(".markdown-source-view, .cm-editor, .cm-scroller, .cm-sizer, .cm-contentContainer, .cm-content").forEach(el => {
          const s = el.style;
          if (s.paddingBottom) s.paddingBottom = "";
          if (s.paddingBlockEnd) s.paddingBlockEnd = "";
          if (s.minHeight) s.minHeight = "";
          if (s.marginBottom) s.marginBottom = "";
        });
      };
      壓扁();
      /* ⚠ 手機版 Obsidian 在 .cm-scroller 上面加了浮動標題列那麼高的 padding-top(0,7,0 的規則,見 styles.css)。
         CSS 已經把變數歸零;這裡再用行內樣式釘一次,以防哪天 Obsidian 換了變數名字。
         (只設 padding-top:壓扁 只清底部,不會互相打架。) */
      容器.querySelectorAll(".cm-scroller").forEach(el => { el.style.paddingTop = "0px"; });
      const 看樣式 = new MutationObserver(壓扁);
      看樣式.observe(容器, { subtree: true, attributes: true, attributeFilter: ["style"] });
      // 空白時的提示(灰字或圖示),絕對定位在第一行開頭;有字就藏起來
      if (選.提示 || 選.提示圖) {
        if (!容器.style.position) 容器.style.position = "relative";
        提示 = 容器.createDiv();
        提示.addClass("tk-即時提示");
        if (選.提示圖) 圖備(提示, 選.提示圖, 空框圖寬); else 提示.setText(選.提示);
        更新提示();
      }
      /* 送出鍵、Esc:在**視窗**上用捕獲階段攔 —— 比 Obsidian 的快捷鍵(Ctrl+Enter 預設是「切換勾選框」)
         和 CodeMirror 自己的鍵盤處理都早一步(不用 import @codemirror)。只管焦點在這個容器裡的按鍵。
         判斷一律走 是送出()(1.4.7 的規則)。 */
      const 窗 = 容器.win || window;
      const 攔 = (e) => {
        if (e.isComposing || !容器.contains(e.target)) return;
        const 是Esc = e.key === "Escape" || e.code === "Escape";
        if (!是Esc && !是送出(e)) return;
        e.preventDefault(); e.stopPropagation();
        const 做 = 是Esc ? (選.取消 || 選.收工) : (選.送出 || 選.收工);
        if (做) 做();
      };
      窗.addEventListener("keydown", 攔, true);
      // 聚焦時讓 Obsidian 把它當成「現在的編輯器」:Ctrl+B 這類快捷鍵、手機工具列才會作用在這裡
      // ⚠ 手機上 Obsidian 會在聚焦之後把 activeEditor 重設一次,所以下一拍再設一次(Kanban 也是這樣做)
      const 設焦 = () => {
        if (卸了) return;
        try { app.workspace.activeEditor = 控; } catch (e) {}
        try { if (app.mobileToolbar) app.mobileToolbar.update(); } catch (e) {}
      };
      const 焦 = () => { 設焦(); (容器.win || window).setTimeout(設焦, 0); };
      容器.addEventListener("focusin", 焦);
      let 卸了 = false, 停用 = false;
      const 物 = {
        get value() { return 卸了 ? "" : ed.editor.getValue(); },
        set value(v) { if (!卸了) { ed.set(v || ""); 更新提示(); } },
        get isConnected() { return !卸了 && 容器.isConnected; },
        get 編輯器() { return 卸了 ? null : ed; },
        get style() { return 容器.style; },
        get disabled() { return 停用; },
        set disabled(v) {
          停用 = !!v;
          try { ed.cm.contentDOM.setAttribute("contenteditable", 停用 ? "false" : "true"); } catch (e) {}
        },
        focus() { 物.聚焦(true); },
        聚焦(尾, 全選) {
          if (卸了) return;
          try {
            const E = ed.editor;
            const 末 = E.offsetToPos(E.getValue().length);
            if (全選) E.setSelection({ line: 0, ch: 0 }, 末);
            else E.setCursor(尾 ? 末 : { line: 0, ch: 0 });
            ed.focus();
            焦();          // 視窗在背景時 focusin 不會觸發,直接設一次
          } catch (e) {}
        },
        卸: () => {
          if (卸了) return;
          卸了 = true;
          看樣式.disconnect();
          窗.removeEventListener("keydown", 攔, true);
          容器.removeEventListener("focusin", 焦);
          try { if (app.workspace.activeEditor === 控) app.workspace.activeEditor = null; } catch (e) {}
          try { app.mobileToolbar && app.mobileToolbar.update(); } catch (e) {}
          this.removeChild(ed);
        }
      };
      return 物;
    } catch (e) {
      console.warn("[card-table] 即時預覽編輯器建立失敗,改用一般輸入框", e);
      return null;
    }
  }

  /* 1.6.1 版面診斷:手機上的版面問題桌機模擬不出來(模擬的是 is-tablet)。
     在手機上跑這個指令,把看板裡每個編輯器從外到內每一層的尺寸、算出來的樣式、命中的 CSS 規則
     寫進 `ZZ-card-table-版面診斷.md`,Sync 回桌機再看。只寫這一份檔案,不碰任何看板筆記。 */
  async 匯出版面診斷() {
    const o = [];
    const b = document.body;
    o.push("# Card Table 版面診斷", "", "- 版本:" + 插件版本 + " / Obsidian " + (window.apiVersion || "?"),
      "- body:" + b.className, "- 視窗:" + window.innerWidth + "×" + window.innerHeight + " dpr " + window.devicePixelRatio,
      "- 時間:" + new Date().toISOString(), "");
    const 規則們 = (el) => {
      const r = [];
      [...document.styleSheets].forEach(sh => {
        let 列; try { 列 = sh.cssRules; } catch (e) { return; }
        const 走 = (x) => {
          if (x.cssRules && !x.selectorText) { [...x.cssRules].forEach(走); return; }
          if (!x.selectorText) return;
          try { if (el.matches(x.selectorText) && /height|padding|margin|flex|display|top|position/.test(x.style.cssText)) r.push(x.selectorText + " { " + x.style.cssText + " }"); } catch (e) {}
        };
        [...列].forEach(走);
      });
      return r;
    };
    const 描 = (el, 深) => {
      const c = getComputedStyle(el), r = el.getBoundingClientRect();
      const 名 = el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : "");
      o.push("  ".repeat(深) + "- `" + 名 + "` " + Math.round(r.width) + "×" + Math.round(r.height) +
        " | h " + c.height + " min " + c.minHeight + " | pad " + c.padding + " | mar " + c.margin +
        " | " + c.display + " flex " + c.flex + " | overflow " + c.overflow +
        (el.getAttribute("style") ? " | inline `" + el.getAttribute("style") + "`" : ""));
      ["::before", "::after"].forEach(p => {
        const s = getComputedStyle(el, p);
        if (s.content && s.content !== "none" && s.content !== "normal") o.push("  ".repeat(深 + 1) + "- " + p + " content " + s.content + " h " + s.height + " display " + s.display);
      });
    };
    const 編們 = [...document.querySelectorAll(".tk-board .tk-即時編")];
    o.push("## 編輯器 " + 編們.length + " 個", "");
    編們.forEach((容, i) => {
      o.push("### #" + (i + 1), "", "外層:");
      let 上 = 容.parentElement, 鏈 = [];
      for (let n = 0; 上 && n < 3; n++, 上 = 上.parentElement) 鏈.unshift(上);
      鏈.forEach(e => 描(e, 0));
      o.push("", "由外到內:");
      let 層 = 容, 深 = 0;
      while (層 && 深 < 8) {
        描(層, 深);
        if (層.classList.contains("cm-content")) break;
        層 = 層.querySelector(":scope > .markdown-source-view, :scope > .cm-editor, :scope > .cm-scroller, :scope > .cm-sizer, :scope > .cm-contentContainer, :scope > .cm-content");
        深++;
      }
      const 捲 = 容.querySelector(".cm-scroller");
      if (捲) { o.push("", "`.cm-scroller` 命中的規則:"); 規則們(捲).forEach(x => o.push("    " + x)); }
      const 源 = 容.querySelector(".markdown-source-view");
      if (源) { o.push("", "`.markdown-source-view` 命中的規則:"); 規則們(源).forEach(x => o.push("    " + x)); }
      o.push("");
    });
    const 路 = "ZZ-card-table-版面診斷.md";
    const 文 = o.join("\n") + "\n";
    try {
      const 舊 = this.app.vault.getAbstractFileByPath(路);
      if (舊) await this.app.vault.process(舊, () => 文);
      else await this.app.vault.create(路, 文);
      new Notice(路);
    } catch (e) { new Notice(String(e)); }
  }

  秀更新介紹(硬要) {
    const 版 = 插件版本;
    if (!硬要 && this.設定.看過版本 === 版) return;
    const 語碼 = 語() === 字典["en"] ? "en" : "zh-TW";
    const 項 = 更新介紹[版] && 更新介紹[版][語碼];
    // 1.6.2(D1):CHANGELOG 只寫英文(使用者明講:省 token),中文介面也顯示英文那一段
    const 說明 = 更新說明[版] && (更新說明[版][語碼] || 更新說明[版].en);
    if (!硬要 && this.設定.看過版本 !== 版) { this.設定.看過版本 = 版; this.存設定(); }
    if (!項 && !說明 && !硬要) return;
    // 自動跳出、指令、設定裡的「看所有版本」都是這同一個視窗(使用者:不要做兩種)
    new 更新介紹框(this.app, 版, 項 || [], 更新標題[語碼], 更新前言[版] && 更新前言[版][語碼], this.manifest.id, 說明).open();
  }

  /* 左側欄那顆圖示(1.5):
       看板裡 → 切回 Markdown ‧ 記過模式的筆記 → 照舊切換
       **沒開過**的筆記(或根本沒有開著的筆記)→ 先問:把這份開成卡片日誌,還是開一份新檔案 */
  絲帶按下() {
    const leaf = this.app.workspace.activeLeaf;
    let 型 = "";
    try { 型 = leaf ? leaf.getViewState().type : ""; } catch (e) {}
    const 檔 = leaf && leaf.view && leaf.view.file;
    if (型 === 視圖種類) { this.切視圖(leaf); return; }
    const 記 = this.設定.看板檔案 || {};
    /* 1.6.1 修:只要這個分頁開著一份 .md 筆記就算數 —— 不只 Markdown,Kanban 這類外掛的畫面也是。
       以前只認 "markdown",在 Kanban 模式按這顆圖示只剩「開一份新檔案」,切不過來。 */
    const 是筆記 = !!檔 && 檔.extension === "md";
    if (是筆記 && 型 === "markdown" && Object.prototype.hasOwnProperty.call(記, 檔.path)) { this.切視圖(leaf); return; }
    new 開啟詢問(this.app, this, 是筆記 ? leaf : null).open();
  }
  /* 開一份新的空白筆記當卡片日誌:放在「新筆記預設的資料夾」,名字撞到就加數字。
     分區(## 1 ~ ## 5)交給看板打開時的 開分區如果是新的() 建。 */
  async 開新看板檔() {
    const T = 語();
    let 夾 = null;
    try {
      const 現 = this.app.workspace.getActiveFile();
      夾 = this.app.fileManager.getNewFileParent(現 ? 現.path : "");
    } catch (e) {}
    const 底 = (夾 && 夾.path && 夾.path !== "/") ? 夾.path + "/" : "";
    let 名 = T.newBoardName, i = 1;
    while (this.app.vault.getAbstractFileByPath(底 + 名 + ".md")) { i++; 名 = T.newBoardName + " " + i; }
    const 檔 = await this.app.vault.create(底 + 名 + ".md", "");
    this.設定.看板檔案 = this.設定.看板檔案 || {};
    this.設定.看板檔案[檔.path] = true;
    await this.存設定();
    const leaf = this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: 視圖種類, state: { file: 檔.path } });
    this.app.workspace.setActiveLeaf(leaf, { focus: true });
  }

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

/* 1.6:「確定嗎?」的小視窗(分類與指派人設定按 ↩ 放棄修改的時候問) */
class 確認框 extends Modal {
  constructor(app, 文, 是字, 做) { super(app); this.文 = 文; this.是字 = 是字; this.做 = 做; }
  onOpen() {
    const T = 語(), c = this.contentEl;
    c.empty();
    st(c.createEl("p", { text: this.文 }), "white-space:pre-line;");
    const 列 = c.createDiv({ cls: "modal-button-container" });
    const 是 = 列.createEl("button", { text: this.是字, cls: "mod-warning" });
    是.onclick = () => { this.close(); this.做(); };
    const 否 = 列.createEl("button", { text: T.cancel });
    否.onclick = () => this.close();
  }
  onClose() { this.contentEl.empty(); }
}

/* ============================================================
   更新介紹(1.6.1 起每一版都要有,使用者明講)
   ------------------------------------------------------------
   安裝或更新之後,Obsidian 版面好了就跳一次「這一版新增了什麼」。看過的版本記在 設定.看過版本,
   同一版不再跳(data.json 會同步,所以一台看過,其他台也不跳)。
   ⚠ 升版時在這裡加一筆 [插件版本],內容跟 CHANGELOG.md 一起寫,中英兩份。
     沒有這一版的內容就不跳,只把版本記起來。
   每一項:[Lucide 圖示名, 標題, 說明]
   ============================================================ */
const 更新介紹 = {
  "1.6.1": {
    "zh-TW": [
      ["file-text", "Tasks、Dataview 讀得懂的格式", "卡片改用 [欄位:: 值]:日期 [due:: 2026-09-16]、區間 [start:: …] [due:: …]、循環 [repeat:: every 2 weeks],Tasks 和 Dataview 的查詢都看得到。"],
      ["tag", "格式裡不再有圖示", "置頂 [pin:: on]、留言 [cm:: …]、本次完成 [done:: …];最後一行永遠是編輯時間 [ed:: …]。第一行是置頂、主題、日期、循環、指派人,內容從第二行開始。"],
      ["history", "舊筆記不用轉", "舊的 ＠{…}、✎、📌、🔁、💬、「．」都照讀。哪張卡片被改到,那張才換成新寫法。想一次全部換掉,設定裡有「全部轉換」(會先備份)。其他裝置也要更新到 1.6.1,舊版讀不懂新寫法。"],
      ["square-check", "內容裡的待辦可以直接勾", "內容寫「- [ ] 事情」(或「-[ ]」「[]」),卡片上就是一個可以勾的方框。"],
      ["list", "內容照你打的", "不再自動加項目符號;自己打的「- 」「* 」「1. 」都會留著。卡片編輯改用 Obsidian 的即時預覽,粗體、螢光、連結當場呈現,也能 Ctrl+Z 復原。"],
      ["house", "只打主題就只有主題", "內容留空送出,不會再把主題抄一份當內容。"]
    ],
    "en": [
      ["file-text", "A format Tasks and Dataview understand", "Cards use [key:: value] fields: [due:: 2026-09-16], ranges as [start:: …] [due:: …], repeats as [repeat:: every 2 weeks] — visible to Tasks and Dataview queries."],
      ["tag", "No more emoji in the format", "Pins are [pin:: on], comments [cm:: …], repeat records [done:: …], and the last line is always the edit time [ed:: …]. The first line holds pin, title, dates, repeat and assignee; content starts on the next line."],
      ["history", "Old notes keep working", "The older ＠{…}, ✎, 📌, 🔁, 💬 and ． are still read. A card switches to the new format only when it is changed. To switch everything at once, use Convert all in settings (it backs up first). Update your other devices to 1.6.1 too; older versions cannot read the new format."],
      ["square-check", "Tick to-dos inside a card", "Write “- [ ] something” (or “-[ ]”, “[]”) in the content and the card shows a checkbox you can tick."],
      ["list", "Content as you type it", "Bullets are no longer added automatically; your own “- ”, “* ” and “1. ” stay. Cards are edited in Obsidian's Live Preview editor: formatting renders as you type, and Ctrl+Z works."],
      ["house", "A title alone stays a title", "Adding a card with an empty content no longer copies the title into the content."]
    ]
  }
};
const 更新標題 = { "zh-TW": "卡片看板 N 更新了什麼", "en": "What’s new in Card Table N" };
/* 1.6.1 彈窗額外的一段(使用者要的):大更新的道歉、新舊格式對照表、一鍵轉換、寄信回報。
   只有這一版有;之後的版本不用加。 */
const 聯絡信箱 = "jiajiunwu.y@gmail.com";
const 專案網址 = "https://github.com/WUYEAHS/obsidian-card-table";
/* 1.6.2(F1)回報問題要帶的資訊:只有版本、平台、語言、檢視模式、視窗大小 —— 不帶任何筆記內容。 */
function 除錯資訊(app) {
  // 檢視模式:看目前開著的看板(卡片模式 = this.窄);沒開看板就寫 none
  let 模式 = "none";
  try {
    const 板 = app && app.workspace.getLeavesOfType(視圖種類).map(l => l.view).find(v => v && typeof v.窄 === "boolean");
    if (板) 模式 = 板.窄 ? "card" : "table";
  } catch (e) {}
  const u = (typeof navigator !== "undefined" && navigator.userAgent) || "";
  const 平台 = /iPhone|iPad/.test(u) ? "iOS" : /Android/.test(u) ? "Android" : /Mac/.test(u) ? "macOS" : /Windows/.test(u) ? "Windows" : /Linux/.test(u) ? "Linux" : "?";
  let api = "";
  try { api = require("obsidian").apiVersion || ""; } catch (e) {}
  return ["Card Table " + 插件版本 + " (" + 看板版本 + ")", "Obsidian " + api + (app && app.isMobile ? " (mobile)" : ""),
    "Platform: " + 平台, "Language: " + (語() === 字典["en"] ? "en" : "zh-TW"), "View: " + 模式,
    "Window: " + window.innerWidth + "x" + window.innerHeight].join("\n");
}
// GitHub 的 issue 表單(.github/ISSUE_TEMPLATE/bug_report.yml)照欄位 id 帶入:environment
function 回報網址(資訊) { return 專案網址 + "/issues/new?template=bug_report.yml&environment=" + encodeURIComponent(資訊); }
/* 1.6.2(D1)CHANGELOG 只有一份(使用者明講):更新介紹視窗直接顯示 CHANGELOG.md 裡這一版的那一段(英文 / 繁中)。
   ⚠ 發版時由 card-table-release 技能從 CHANGELOG.md 複製過來,**不要在這裡另外寫**。最上面是釘選的 Reminder / Notice。 */
const 更新說明 = {
  "1.6.4": {
    "en": "> [!important]\n> **Reminder:** This plugin is still under active development and will change frequently over the next few months. Please back up your data/environment before using it. Bug reports and feedback are highly appreciated!\n>\n> **Notice:** This project is entirely built by AI agents using Claude. The project developer has limited experience with programming languages.\n\n**Cleanup release.** Two bugs fixed, ~490 lines of dead code removed, no new settings or format changes.\n\n### Bug fixes\n1. Adding a card while several cards are pinned no longer leaves the board stuck mid-scroll — it now lands on the new card and flashes it, every time.\n2. A card ID left behind by Canvas (`^ct-…`, appended after `[ed:: …]`) is now recognized when parsing and kept as-is on every rewrite (title, checkbox, content, date, archive). Cards without one are unaffected; nothing writes a new ID yet.\n3. The topic capsule no longer shifts 2px to the right while editing — reading and editing now line up exactly (an inline style was overriding the alignment rule).\n\n### Internal\n1. Removed ~490 lines of dead code left over from the pre-1.6.3 table layout, plus unused dictionary keys, an unused import, and superseded helper functions. No behavior change."
  },
  "1.6.3": {
    "en": "> [!important]\n> **Reminder:** This plugin is still under active development and will change frequently over the next few months. Please back up your data/environment before using it. Bug reports and feedback are highly appreciated!\n>\n> **Notice:** This project is entirely built by AI agents using Claude. The project developer has limited experience with programming languages.\n\n**One card layout.** The table view is gone — desktop and phone now share the same card layout, desktop is just wider. Titles and assignees moved to `#Title` / `@name`.\n\n### Format\n1. Titles are now `#Title` tags on the first line (up to 3); assignees are now `@name`, and a new name is added to the people list automatically. Old `[Title]` and old `#name` (when it was on the people list) are still read; a card switches to the new syntax only when it is changed.\n\n### Bug fixes\n1. Collapsing one block (a section table, the time-filter bar) no longer blocks the collapse/expand button on every other block while its animation is still playing.\n2. Turning off \"jump after adding a card\" or \"jump after set to today\" now actually stops every side effect of the jump (sort order, filter, scroll) — it used to still resort and refilter the list even with the setting off.\n3. \"Not done\" and \"Done\" in the time-filter bar are independent checkboxes again: turning both on shows both kinds of cards at once, instead of one silently winning.\n\n### UX improvements\n1. Card layout lines up to three fixed guides (3 / 18 / 22px) and a 26px block header, on every block.\n2. Archive moved into the section settings panel: a section can be moved out to its own note or bulk-deleted, with a filename suffix and folder you can set.\n3. Spacing between related controls (card tools, the archive row, block headers, time-filter tiles) is consistently 4px within a group and at least 8px between groups.\n4. Every popup on the board is now one of three kinds: an in-place expansion, a menu, or a hover tooltip (confirmation dialogs for destructive actions are the one deliberate exception)."
  },
  "1.6.2": {
    "en": "> [!important]\n> **Reminder:** This plugin is still under active development and will change frequently over the next few months. Please back up your data/environment before using it. Bug reports and feedback are highly appreciated!\n>\n> **Notice:** This project is entirely built by AI agents using Claude. The project developer has limited experience with programming languages.\n\n**Every button does one thing.** Colours, content and exports, straightened out.\n\n### Bug fixes\n1. Picking a colour on a card moves only that card. Section colours are changed in the section panel only.\n2. Every section can be picked from a card: up to five as dots, six to ten from a list with their names.\n3. On phones, *Change section* is in the card's ⋯ menu, and the colour picker in the section panel stays open.\n4. Nested lists, blank lines and spacing are saved exactly as typed, when adding, editing and merging cards.\n5. Card content is shown the way Obsidian shows it: dividers, tables, nested lists, links and callouts.\n6. Finishing an edit right after an automatic save no longer drops the last change.\n7. Opening a card to edit and closing it without changes no longer rewrites the card.\n8. A card stays open after you finish editing it, until you change the filter or fold it.\n9. Unarchiving asks which section the card goes back to.\n\n### UX improvements\n1. \"Tap again\" confirmations show ✓ with a countdown, for archive and delete. Only delete is red.\n2. Editing a card keeps the title and text exactly where they were.\n3. Section names appear wherever you pick a section, including New card.\n4. Type `#section` in search to see only that section; names with spaces work too.\n5. Export makes one phone-width image with larger text and formatted content. PDF export is gone.\n6. Links inside cards open on click and show a preview on hover.\n\n### New\n1. Settings → *Report a problem* opens a GitHub issue or an email with your versions filled in. No note content is sent."
  }
};
const 更新前言 = {
  "1.6.1": {
    "zh-TW": {
      歉題: "很抱歉:這一版是大更新,筆記格式改了",
      歉文: "舊筆記不用動,照樣讀得懂,卡片被改到時才換成新寫法。也可以在設定裡一鍵全部轉換(會先備份)。每台裝置都要更新到 1.6.1。",
      表題: "新舊寫法對照",
      表頭: ["意思", "1.6.1 起", "以前"],
      表: [
        ["置頂", "[pin:: on]", "📌"],
        ["單日", "[due:: 2026-09-11]", "＠{2026-09-11}"],
        ["區間", "[start:: …] [due:: …]", "＠{a ~ b}"],
        ["循環", "[repeat:: every 2 weeks]", "🔁 每2週"],
        ["內容", "第二行起,照你打的", "第一行主題後面"],
        ["項目符號", "自己打的 - * 1.", "．"],
        ["待辦", "- [ ] 事情", "—"],
        ["本次完成", "[done:: 日期](循環卡片)", "—"],
        ["留言", "[cm:: 時間|名字] 內容", "💬{時間|名字}"],
        ["編輯時間", "[ed:: 時間](最後一行)", "✎{時間}(第一行)"]
      ],
      轉鈕: "開啟設定:一鍵轉換",
      信前: "轉換或使用上有問題,請寄信給我:"
    },
    "en": {
      歉題: "Sorry: this is a big update, and the note format changed",
      歉文: "Old notes need nothing: they are still read, and a card switches to the new syntax when it is changed. You can also convert everything in one click in settings (with a backup). Update every device to 1.6.1.",
      表題: "Old and new syntax",
      表頭: ["Meaning", "From 1.6.1", "Before"],
      表: [
        ["Pinned", "[pin:: on]", "📌"],
        ["One day", "[due:: 2026-09-11]", "＠{2026-09-11}"],
        ["Range", "[start:: …] [due:: …]", "＠{a ~ b}"],
        ["Repeat", "[repeat:: every 2 weeks]", "🔁 every 2 weeks"],
        ["Content", "From line 2, as typed", "After the title"],
        ["Bullets", "Your own - * 1.", "．"],
        ["To-do", "- [ ] something", "—"],
        ["Repeat record", "[done:: date] (repeating)", "—"],
        ["Comment", "[cm:: time|name] text", "💬{time|name}"],
        ["Edit time", "[ed:: time] (last line)", "✎{time} (first line)"]
      ],
      轉鈕: "Open settings: convert all",
      信前: "Problems with the conversion or anything else? Email me:"
    }
  }
};
/* 1.6.1 設定最上面「看所有版本」用的精簡版(使用者要的:合併著寫,不列細項)。
   ⚠ 升版時在最前面加一筆,中英兩份,一版兩三句就好。
   1.6.3(A1):更新視窗在這一版的 CHANGELOG 下面列最近 10 版(不含這一版,見 畫版本摘要 的 上限、略過)。 */
const 版本摘要 = [
  ["1.6.4",
    ["清掃版:新增卡片在置頂多的時候不會再卡在捲到一半;Canvas 留下的卡片 ID 現在讀得懂、改卡片時原樣留著。",
     "主題編輯時字不再往右跳 2px;順手清掉約 490 行舊版面留下的死程式碼,沒有新設定、沒有格式變動。"],
    ["Cleanup release: adding a card no longer gets stuck mid-scroll when several cards are pinned; a card ID left by Canvas is now recognized and kept as-is when the card is edited.",
     "The topic no longer shifts while editing; also removed ~490 lines of dead code from the old table layout — no new settings, no format changes."]],
  ["1.6.3",
    ["看板收斂成一種卡片版面,桌機和手機一樣,表格模式拿掉了;主題和指派人改成 #主題 @人,Tasks / Dataview 讀得到,舊寫法照讀。",
     "介面照對齊、間距、彈出樣式的規則全面整理;封存區搬進分類設定,可以整區移出成獨立筆記或整批刪除。",
     "修掉幾個動畫和「動作後跳轉」設定關掉卻沒真的關掉的小 bug;未完成/已完成改成可以同時看。"],
    ["The board is now one card layout — desktop and phone the same, desktop just wider; the table view is gone. Titles and assignees moved to #Title / @name, still readable by Tasks and Dataview; old notes keep working.",
     "Alignment, spacing and popup styles were cleaned up across the board; archive moved into section settings, with move-out-to-a-note and bulk-delete.",
     "Fixed a few animation and jump-setting bugs where turning a setting off didn't fully turn it off; Not done / Done can now both be shown at once."]],
  ["1.6.2",
    ["卡片換色只動這一張;分類多也選得到;內容照 Obsidian 的樣子顯示,巢狀清單和空行一字不差。",
     "封存和刪除「再按一次確定」;取消封存會問回哪一區;匯出只剩一張手機寬的長圖。設定裡可以回報問題。"],
    ["Recolouring moves only that card; every section can be picked; card content looks the way Obsidian shows it and keeps nesting and blank lines exactly.",
     "Archive and delete use tap-again confirmation; unarchiving asks where to go; export is one phone-width image. Report a problem from settings."]],
  ["1.6.1",
    ["卡片改用 [欄位:: 值](due / start / repeat / pin / cm / ed),Tasks 和 Dataview 讀得到日期,格式裡不再有圖示。",
     "舊筆記照讀、改到才轉;設定裡也可以一次全部轉換(會先備份)。",
     "內容裡的待辦可以直接勾;卡片用 Obsidian 的即時預覽編輯;內容照你打的寫,不再自動加項目符號。設定分成幾個大標,最上面看得到所有版本。"],
    ["Cards use [key:: value] fields (due / start / repeat / pin / cm / ed): Tasks and Dataview see the dates, and the format has no emoji.",
     "Old notes keep working and switch when changed; settings can also convert everything at once (with a backup).",
     "Tick to-dos inside cards; cards are edited with Obsidian's Live Preview; content is saved as you type it, with no automatic bullets. Settings are grouped, with all versions at the top."]],
  ["1.6.0",
    ["時間篩選的年、月、週、日跟著同一個日期連動,格子寫實際的日期。",
     "新增卡片的「⋯」換成分類與指派人設定,行事曆也在同一塊打開。",
     "主題框會建議用過的主題,並帶回它上一次的分類。"],
    ["The year, month, week and day filters follow one date and show the actual dates.",
     "The New card `⋯` turns the block into section and assignee settings; the calendar opens there too.",
     "The title box suggests used titles and brings back their last section."]],
  ["1.5.2", ["英文名稱改成 Card Table - Dated Tasks。"], ["Renamed to Card Table - Dated Tasks."]],
  ["1.5.1",
    ["改名為卡片看板:任務分類日誌;標題列和按鈕改成圖示。",
     "新增卡片區更精簡;手機的卡片直接接在標題列底下。"],
    ["Renamed; block headers and buttons became icons.",
     "A leaner New card area; phone cards sit right under the table header."]],
  ["1.5.0",
    ["分類就是狀態,卡片上可以顯示分類名稱。",
     "已逾期和週期合成一格,長期拿掉了;可以多一格「全部」。",
     "第一行一樣的卡片先靠位置分辨;常用主題的釘選每份筆記各自一組。"],
    ["Sections double as status and can be shown on cards.",
     "Overdue and Repeat share one tile, long-term is gone, and an optional All tile was added.",
     "Identical cards are told apart by position first; pinned titles belong to each note."]],
  ["1.4.9", ["時間篩選也能收合,年份的箭頭跟本日齊平。"], ["Time filters fold like other blocks; the year arrows line up with Today."]],
  ["1.4.8", ["新增卡片區重新排版;可以隱藏最後編輯時間。"], ["A redesigned New card area; the last edited time can be hidden."]],
  ["1.4.7",
    ["箭頭加大,窄分頁自動換成手機版面。",
     "送出鍵統一(也可以改成 Enter 送出);一週可以從週一或週日開始;留言可以關掉,常用主題可以釘選。"],
    ["Bigger arrows; narrow panes switch to the phone layout.",
     "One submit key everywhere (or Enter to submit); Monday or Sunday weeks; comments can be turned off and titles pinned."]],
  ["1.4.6",
    ["第一行一模一樣的卡片分得開了。",
     "個人使用模式、三種動作後跳轉各自設定、贊助連結。"],
    ["Cards with identical first lines are told apart.",
     "Solo mode, separate jump settings per action, and a support link."]],
  ["1.4.5",
    ["置頂卡片獨立一張表;新增區和清單工具都能收合。",
     "窄版 / 寬版、留言位置、項目符號都可以設定;編輯最後一張卡片不再跳動。"],
    ["Pinned cards get their own table; the add area and list tools fold away.",
     "Narrow or wide layout, comment position and bullets are settings; editing the last card no longer jumps."]],
  ["1.4.4", ["窄螢幕版面重做,手機一輪修正。"], ["Rebuilt narrow-screen layout and a round of phone fixes."]],
  ["1.4.3", ["修掉手機上蓋滿畫面的閃光;窄螢幕卡片欄位固定;可以設定按編輯後卡片停在哪裡。"],
    ["Fixed a full-screen flash on phones; fixed card fields on narrow screens; choose where a card sits when editing."]],
  ["1.4.2", ["修掉手機上被裁掉的篩選;窄螢幕的工具收成一個「⋯」。"], ["Fixed clipped filters on phones; narrow-screen tools fold into one `⋯`."]],
  ["1.4.1", ["打字時畫面不再跳;格式快捷鍵跟著你的 Obsidian 設定。"], ["No more jumping while typing; formatting keys follow your Obsidian hotkeys."]],
  ["1.4.0", ["第一個正式版本。"], ["First release."]]
];
/* 所有版本的精簡清單,接在更新介紹視窗的下半部(1.6.1 起彈窗和設定的「看所有版本」是同一個視窗) */
function 畫版本摘要(c, 上限, 略過) {
  const 英 = 語() === 字典["en"];
  // 1.6.3(A1):更新視窗裡收成一個可以展開的區塊(預設收著,不讓視窗太長)
  const 摺 = 上限 ? c.createEl("details") : null;
  const 標 = 摺 ? 摺.createEl("summary", { text: 語().allVersions }) : c.createDiv({ text: 語().allVersions });
  st(標, "font-weight:600;margin:6px 0 8px;padding-top:10px;border-top:1px solid var(--background-modifier-border);" + (摺 ? "cursor:pointer;" : ""));
  const 清 = (摺 || c).createDiv();
  st(清, "display:flex;flex-direction:column;gap:14px;margin:2px 0 8px;");
  版本摘要.filter(([版]) => 版 !== 略過).slice(0, 上限 || 版本摘要.length).forEach(([版, 中, 英文], i) => {
    const 段 = 清.createDiv();
    const 頭 = 段.createDiv({ text: 版 });
    st(頭, "font-weight:700;font-size:0.95em;margin-bottom:4px;" +
      (版 === 插件版本 ? "color:var(--interactive-accent);" : "color:var(--text-normal);"));
    (英 ? 英文 : 中).forEach(t => {
      const 行 = 段.createDiv({ text: t });
      st(行, "font-size:0.88em;line-height:1.5;color:var(--text-muted);padding-left:12px;text-indent:-12px;");
      行.prepend("· ");
    });
  });
}
class 更新介紹框 extends Modal {
  constructor(app, 版, 項, 標, 前, 外掛id, 說明) { super(app); this.版 = 版; this.項 = 項; this.標 = 標; this.前 = 前; this.外掛id = 外掛id; this.說明 = 說明; }
  onOpen() {
    const c = this.contentEl;
    c.empty();
    this.titleEl.setText(this.標.replace("N", this.版));
    /* 1.6.2(D1):有 更新說明 就直接顯示 CHANGELOG 的那一段(Obsidian 的 Markdown 渲染),下面兩個連結:
       所有版本(GitHub 的 CHANGELOG)、回饋與討論。舊的「圖示條列 + 每版摘要」不再另外寫。 */
    if (this.說明) {
      const T = 語();
      const 文 = c.createDiv();
      文.addClass("markdown-rendered"); 文.addClass("tk-更新說明");
      this.件 = Component ? new Component() : null;
      if (this.件) this.件.load();
      { const 原關 = this.onClose.bind(this); this.onClose = () => { try { if (this.件) this.件.unload(); } catch (e) {} 原關(); }; }
      try { MarkdownRenderer.render(this.app, this.說明, 文, "", this.件); } catch (e) { 文.setText(this.說明); }
      // 1.6.3(A1,使用者:舊版本也嵌進來,十版為限):這一版以外最近 10 版的摘要;再舊的看底下的 GitHub 連結
      畫版本摘要(c, 10, this.版);
      const 連 = c.createDiv();
      st(連, "display:flex;flex-wrap:wrap;gap:6px 16px;margin:12px 0 4px;padding-top:10px;border-top:1px solid var(--background-modifier-border);font-size:0.9em;");
      連.createEl("a", { text: T.allVersionsLink, href: 專案網址 + "/blob/main/CHANGELOG.md" });
      連.createEl("a", { text: T.feedbackLink, href: 專案網址 + "/issues" });
      const 列0 = c.createDiv({ cls: "modal-button-container" });
      const 好0 = 列0.createEl("button", { text: T.finish, cls: "mod-cta" });
      好0.onclick = () => this.close();
      return;
    }
    const 前 = this.前;
    if (前) {
      // 道歉的那一塊:淡淡的警告色框,放在最上面
      const 歉 = c.createDiv();
      st(歉, "border:1px solid var(--color-orange);border-radius:8px;padding:10px 12px;margin:2px 0 14px;" +
        "background:rgba(var(--color-orange-rgb),0.08);");
      const 頭 = 歉.createDiv();
      st(頭, "display:flex;gap:8px;align-items:center;font-weight:600;line-height:1.4;color:var(--text-normal);");
      const 圖 = 頭.createSpan();
      st(圖, "color:var(--color-orange);display:inline-flex;");
      圖備(圖, ["triangle-alert", "alert-triangle"], 16);
      頭.createSpan({ text: 前.歉題 });
      st(歉.createDiv({ text: 前.歉文 }), "font-size:0.88em;line-height:1.5;color:var(--text-muted);margin-top:4px;");
    }
    const 清 = c.createDiv();
    st(清, "display:flex;flex-direction:column;gap:14px;margin:4px 0 10px;");
    this.項.forEach(([名, 題, 說]) => {
      const 列 = 清.createDiv();
      st(列, "display:flex;gap:12px;align-items:flex-start;");
      const 座 = 列.createDiv();
      st(座, "flex:0 0 30px;width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;" +
        "color:var(--interactive-accent);background:var(--background-modifier-hover);");
      圖備(座, [名, "sparkles"], 16);
      const 字 = 列.createDiv();
      st(字, "min-width:0;");
      st(字.createDiv({ text: 題 }), "font-weight:600;line-height:1.4;");
      st(字.createDiv({ text: 說 }), "font-size:0.88em;line-height:1.5;color:var(--text-muted);margin-top:2px;");
    });
    if (前) {
      // 新舊寫法對照表(預設收著,不讓彈窗太長)
      const 摺 = c.createEl("details");
      st(摺, "margin:4px 0 12px;");
      st(摺.createEl("summary", { text: 前.表題 }), "cursor:pointer;font-weight:600;");
      const 表 = 摺.createEl("table");
      st(表, "width:100%;border-collapse:collapse;margin-top:8px;font-size:0.82em;");
      const 格 = (tr, t, 頭) => {
        const td = tr.createEl(頭 ? "th" : "td", { text: t });
        st(td, "border:1px solid var(--background-modifier-border);padding:3px 6px;text-align:left;vertical-align:top;" +
          (頭 ? "background:var(--background-secondary);" : "") + "overflow-wrap:anywhere;");
        return td;
      };
      const 頭列 = 表.createEl("tr");
      前.表頭.forEach(t => 格(頭列, t, true));
      前.表.forEach(r => {
        const tr = 表.createEl("tr");
        r.forEach((t, i) => { const td = 格(tr, t); if (i > 0) st(td, "font-family:var(--font-monospace);"); });
      });
      // 聯絡:mailto 連結
      const 信 = c.createDiv();
      st(信, "font-size:0.88em;line-height:1.5;color:var(--text-muted);margin-bottom:6px;");
      信.appendText(前.信前 + " ");
      信.createEl("a", { text: 聯絡信箱, href: "mailto:" + 聯絡信箱 + "?subject=" + encodeURIComponent("Card Table " + this.版) });
    }
    畫版本摘要(c);
    const 列 = c.createDiv({ cls: "modal-button-container" });
    if (前 && this.外掛id) {
      const 轉 = 列.createEl("button", { text: 前.轉鈕 });
      轉.onclick = () => {
        this.close();
        try { this.app.setting.open(); this.app.setting.openTabById(this.外掛id); } catch (e) {}
      };
    }
    const 好 = 列.createEl("button", { text: 語().finish, cls: "mod-cta" });
    好.onclick = () => this.close();
  }
  onClose() { this.contentEl.empty(); }
}

/* 左側欄圖示的詢問視窗(1.5):沒開過的筆記先問一次,不直接把它變成看板。
   沒有開著的筆記時只剩「開一份新檔案」。 */
class 開啟詢問 extends Modal {
  constructor(app, 插件, leaf) { super(app); this.插件 = 插件; this.leaf = leaf; }
  onOpen() {
    const T = 語(), c = this.contentEl;
    c.empty();
    this.titleEl.setText(T.askOpenTitle);
    const 檔 = this.leaf && this.leaf.view && this.leaf.view.file;
    if (檔) c.createEl("p", { text: T.askOpenBody.replace("N", 檔.basename) });
    const 列 = c.createDiv();
    st(列, "display:flex;flex-direction:column;gap:8px;margin-top:6px;");
    if (檔) {
      const 這 = 列.createEl("button", { text: T.askOpenThis });
      這.addClass("mod-cta");
      這.onclick = () => { this.close(); this.插件.切視圖(this.leaf, 視圖種類); };
    }
    const 新 = 列.createEl("button", { text: T.askOpenNew });
    if (!檔) 新.addClass("mod-cta");
    新.onclick = async () => { this.close(); await this.插件.開新看板檔(); };
  }
  onClose() { this.contentEl.empty(); }
}

/* ============================================================
   設定頁
   ============================================================ */
class 設定頁 extends PluginSettingTab {
  constructor(app, 插件) { super(app, 插件); this.插件 = 插件; }
  display() {
    const T = 語(), c = this.containerEl;
    const 設 = this.插件.設定;
    c.empty();
    const 存 = async (重畫) => { await this.插件.存設定(); if (重畫) this.插件.重畫所有看板(); };
    // 1.6.1:設定分成幾個大標(使用者:「現在有點太亂」)
    const 標 = (名, 說) => { const s = new Setting(c).setName(名).setHeading(); if (說) s.setDesc(說); return s; };

    /* 1.6.1 最上面:看所有版本的更新內容(精簡版,見 版本摘要) */
    new Setting(c).setName(T.updates).setDesc(T.updatesDesc.replace("N", 插件版本))
      .addButton(b => b.setButtonText(T.updatesBtn).setCta()
        .onClick(() => this.插件.秀更新介紹(true)));

    /* ---- 一般 ----
       ⚠ 1.2:指派人名單和分類都從設定頁搬走了。
       它們是「這一份看板長什麼樣」的事,不是「這個外掛怎麼運作」的事 ——
       現在都在新增卡片標題列的「⋯」(分類與指派人)。 */
    標(T.setGeneral);
    new Setting(c).setName(T.lang).setDesc(T.langDesc)
      .addDropdown(d => {
        d.addOption("auto", T.langAuto);
        d.addOption("zh-TW", T.langZh);
        d.addOption("en", T.langEn);
        d.setValue(設.語言 || "auto");
        d.onChange(async (v) => {
          設.語言 = v; 語言設定 = v;
          await this.插件.存設定();
          this.插件.T = 語();
          /* 側邊欄那顆圖示的提示文字也跟著換。
             ⚠ 指令面板裡的指令名稱沒辦法當場換(Obsidian 註冊時就記住了),要重新載入外掛才會變。 */
          try { if (this.插件.絲帶) this.插件.絲帶.setAttribute("aria-label", this.插件.T.openBoard); } catch (e) {}
          // 已經開著的看板立刻換語言
          this.app.workspace.getLeavesOfType(視圖種類).forEach(l => {
            try { l.view.T = 語(); l.view.畫(); } catch (e) {}
          });
          this.display();
        });
      });
    /* 1.6.3 C19:看板裡已經有的設定,這裡不再出現(同一件事只給一個入口):
       分類 → 新增卡片「⋯」;「全部」→ 行事曆標題列;版面寬度 → 清單標題列的 ⋯。
       ⚠ 但**指派人相反**:1.6.3(mockup v12,使用者 09-20)把指派人從看板的面板搬回這裡 ——
         「指派人顏色統一、使用者不能改、只能在全域 setting 設定」,看板的 ⋯ 留給封存區。 */
    new Setting(c).setName(T.useAssignees)
      .addToggle(t => t.setValue(!設.個人模式)
        .onChange(async (v) => { 設.個人模式 = !v; await 存(true); this.display(); }));
    if (!設.個人模式) {
      /* 名單用一行逗號隔開就夠了 —— 顏色統一之後每個人只剩「名字」一個欄位,
         做成一列一列的編輯器只是把同一件事變複雜。 */
      new Setting(c).setName(T.people).setDesc(T.peopleDesc)
        .addText(t => {
          t.setValue((設.指派人 || []).join(", "));
          t.inputEl.style.width = "16em";
          t.onChange(async (v) => {
            設.指派人 = String(v).split(/[,、，\n]+/).map(x => x.trim()).filter(Boolean);
            await 存(true);
          });
        });
      new Setting(c).setName(T.whoAmI).setDesc(T.whoAmIDesc)
        .addDropdown(d => {
          d.addOption("", "—");
          (設.指派人 || []).forEach(n => d.addOption(n, n));
          d.setValue(讀我是誰() || "");
          d.onChange((v) => { 存我是誰(v); this.插件.重畫所有看板(); });
        });
    }

    /* ---- 時間篩選 ---- */
    標(T.filterBlock);
    new Setting(c).setName(T.defaultRange).setDesc(T.defaultRangeDesc)
      .addDropdown(d => {
        [["今日", T.today], ["7天內", T.week], ["本月", T.month], ["全部", T.all]]
          .forEach(([v, t]) => d.addOption(v, t));
        d.setValue(設.預設範圍 === "本週" ? "7天內" : (設.預設範圍 || "今日"));
        d.onChange(async (v) => { 設.預設範圍 = v; await 存(false); });
      });
    /* 1.6:「一週從哪天開始」和「本周怎麼算」合併成一個選項(兩個分開的時候,使用者分不出差在哪)。
       資料還是存在原本兩個鍵:週起始 一 / 日、週模式 週曆 / 七天 / 月初 —— 舊的設定照讀。
       「每月 1 號起」跟星期無關,週起始維持原值,行事曆的第一欄照舊看它。 */
    new Setting(c).setName(T.weekRule).setDesc(T.weekRuleDesc)
      .addDropdown(d => {
        [["一|週曆", T.weekMon], ["日|週曆", T.weekSun], ["一|七天", T.weekMonRolling],
         ["日|七天", T.weekSunRolling], ["月初", T.weekMonthStart]].forEach(([v, t]) => d.addOption(v, t));
        d.setValue(設.週模式 === "月初" ? "月初"
          : (設.週起始 === "日" ? "日" : "一") + "|" + (設.週模式 === "七天" ? "七天" : "週曆"));
        d.onChange(async (v) => {
          if (v === "月初") 設.週模式 = "月初";
          else {
            const 段 = v.split("|");
            設.週起始 = 段[0]; 設.週模式 = 段[1];
            週起日 = 段[0] === "日" ? 0 : 1;
          }
          await 存(true);
        });
      });

    /* ---- 卡片外觀 ---- */
    標(T.setLook);
    // 1.6.3 C20:滑過卡片要不要整張亮一點(預設不要)
    new Setting(c).setName(T.hoverHighlight).setDesc(T.hoverHighlightDesc)
      .addToggle(t => t.setValue(!!設.滑過高亮)
        .onChange(async (v) => { 設.滑過高亮 = v; await 存(true); }));
    new Setting(c).setName(T.doneLook).setDesc(T.doneLookDesc)
      .addDropdown(d => {
        [["淡化劃掉", T.doneBoth], ["淡化", T.doneFade], ["劃掉", T.doneStrike], ["無", T.doneNone]]
          .forEach(([v, t]) => d.addOption(v, t));
        d.setValue(設.完成樣式 || "淡化劃掉");
        d.onChange(async (v) => { 設.完成樣式 = v; await 存(true); });
      });
    new Setting(c).setName(T.showSectionName).setDesc(T.showSectionNameDesc)
      .addToggle(t => t.setValue(!!設.顯示分類名稱)
        .onChange(async (v) => { 設.顯示分類名稱 = v; await 存(true); }));
    new Setting(c).setName(T.showEditTime).setDesc(T.showEditTimeDesc)
      .addToggle(t => t.setValue(設.顯示編輯時間 !== false)
        .onChange(async (v) => { 設.顯示編輯時間 = v; await 存(true); }));
    new Setting(c).setName(T.useComments).setDesc(T.useCommentsDesc)
      .addToggle(t => t.setValue(設.使用留言 !== false)
        .onChange(async (v) => { 設.使用留言 = v; await 存(true); }));
    new Setting(c).setName(T.commentPos).setDesc(T.commentPosDesc)
      .addDropdown(d => {
        d.addOption("上", T.commentAbove);
        d.addOption("下", T.commentBelow);
        d.setValue(設.留言位置 === "下" ? "下" : "上");
        d.onChange(async (v) => { 設.留言位置 = v; await 存(true); });
      });

    /* ---- 新增與編輯 ---- */
    標(T.setEdit);
    new Setting(c).setName(T.sendKey).setDesc(T.sendKeyDesc)
      .addDropdown(d => {
        d.addOption("組合", T.sendKeyCombo);
        d.addOption("Enter", T.sendKeyEnter);
        d.setValue(設.送出鍵 === "Enter" ? "Enter" : "組合");
        d.onChange(async (v) => { 設.送出鍵 = v; 送出用Enter = v === "Enter"; await 存(true); });
      });
    // 1.6.1:「自動加項目符號」的設定拿掉了(使用者明講)—— 內容一律照打的寫
    new Setting(c).setName(T.editCursor).setDesc(T.editCursorDesc)
      .addDropdown(d => {
        d.addOption("前", T.cursorStart);
        d.addOption("後", T.cursorEnd);
        d.setValue(設.編輯游標 === "後" ? "後" : "前");
        d.onChange(async (v) => { 設.編輯游標 = v; await 存(false); });
      });
    new Setting(c).setName(T.editPos).setDesc(T.editPosDesc)
      .addDropdown(d => {
        d.addOption("原位", T.editPosKeep);
        d.addOption("頂端", T.editPosTop);
        d.addOption("不動", T.editPosNone);
        d.setValue(設.編輯位置 || "原位");
        d.onChange(async (v) => { 設.編輯位置 = v; await 存(false); });
      });
    new Setting(c).setName(T.unpinOnDone).setDesc(T.unpinOnDoneDesc)
      .addToggle(t => t.setValue(!!設.完成取消置頂)
        .onChange(async (v) => { 設.完成取消置頂 = v; await 存(false); }));

    /* ---- 動作後跳轉 ----(說明寫在大標上,六個開關就不再各寫一次)
       1.4.6:未完成 / 已完成 / 封存 三個各自獨立(順序跟看板上「顯示」那一格一樣) */
    標(T.jumps, T.jumpDesc);
    [["跳轉_完成到未完成", T.jumpTodo], ["跳轉_未完成到完成", T.jumpDone], ["跳轉_封存", T.jumpArchive],
     ["跳轉_置頂", T.jumpPin], ["跳轉_設回今日", T.jumpToday], ["跳轉_新增", T.jumpAdd]].forEach(([k, 名]) => {
      new Setting(c).setName(名)
        .addToggle(t => t.setValue(設[k] !== false)
          .onChange(async (v) => { 設[k] = v; await 存(false); }));
    });

    /* ---- 筆記格式 ----
       1.6.1 全部轉成新格式(使用者要求,先給他測)。平常不需要:舊寫法照讀、改到才轉。
       對象 = 記住用卡片看板開的筆記(看板檔案[路徑] === true)而且檔案還在。 */
    標(T.setFormat);
    /* U44(mockup v14 Q27 定案):封存區「移出」出去的檔名後綴和資料夾。
       檔名 = 封存區的名字 + 後綴;資料夾空白 = 跟看板筆記同一個資料夾。 */
    new Setting(c).setName(T.moveOutSuffix).setDesc(T.moveOutSuffixDesc)
      .addText(t => t.setPlaceholder(預設設定.移出後綴).setValue(設.移出後綴 || "")
        .onChange(async (v) => { 設.移出後綴 = String(v || "").replace(/[\r\n]+/g, " ").trim(); await 存(false); }));
    new Setting(c).setName(T.moveOutFolder).setDesc(T.moveOutFolderDesc)
      .addText(t => t.setPlaceholder("Archive/2026").setValue(設.移出資料夾 || "")
        .onChange(async (v) => { 設.移出資料夾 = String(v || "").replace(/[\r\n]+/g, " ").trim(); await 存(false); }));
    const 板們 = () => Object.keys(設.看板檔案 || {})
      .filter(p => 設.看板檔案[p] === true)
      .map(p => this.app.vault.getAbstractFileByPath(p))
      .filter(f => f && f.extension === "md");
    new Setting(c).setName(T.convertAll).setDesc(T.convertAllDesc.replace("N", String(板們().length)))
      .addButton(b => b.setButtonText(T.convertBtn).setWarning()
        .onClick(() => {
          const 檔們 = 板們();
          if (!檔們.length) { new Notice(T.convertNone); return; }
          const 清單 = 檔們.map(f => "・" + f.path).join("\n");
          new 確認框(this.app, T.convertAsk.replace("LIST", 清單), T.convertYes, async () => {
            const 名單 = 設.指派人 || [];
            let 張 = 0, 份 = 0, 敗 = 0;
            for (const f of 檔們) {
              const r = await this.插件.寫手.轉新格式(f, 名單);
              if (r === false) 敗++;
              else if (r.張 > 0) { 張 += r.張; 份++; }
            }
            if (敗) new Notice(T.convertFail.replace("N", String(敗)), 8000);
            new Notice(張 ? T.convertDone.replace("N", String(張)).replace("F", String(份)) : T.convertNone, 8000);
          }).open();
        }));

    /* ---- 支持 ----
       贊助(1.4.6)。網址跟 manifest.json 的 fundingUrl 是同一個 ——
       Obsidian 的社群外掛頁會自己放一顆 Donate,這裡是給已經裝好、只會打開設定頁的人。 */
    標(T.setSupport);
    new Setting(c).setName(T.donate).setDesc(T.donateDesc)
      .addButton(b => b.setButtonText(T.donateBtn)
        .onClick(() => { window.open(贊助網址, "_blank"); }));
    /* 1.6.2(F1)回報問題:GitHub issue(表單的「環境」欄自動帶入)。**不帶任何筆記內容**(隱私)。
       1.6.3(A3)Email 鈕拿掉了(使用者:只留 GitHub,沒空收信)。 */
    new Setting(c).setName(T.reportBug).setDesc(T.reportBugDesc)
      .addButton(b => b.setButtonText("GitHub").onClick(() => { window.open(回報網址(除錯資訊(this.app)), "_blank"); }))
      .addExtraButton(b => b.setIcon("copy").setTooltip(T.copyDebug).onClick(async () => {
        try { await navigator.clipboard.writeText(除錯資訊(this.app)); new Notice(T.copiedDebug); } catch (e) {}
      }));

    c.createEl("p", { cls: "cjb-淡", text: T.board + " " + 插件版本 });
  }
}
