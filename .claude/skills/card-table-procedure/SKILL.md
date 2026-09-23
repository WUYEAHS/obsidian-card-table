---
name: card-table-procedure
description: 卡片看板(obsidian-card-table)的工作流程(2026-09-18 起,使用者明講)。每一版先在 vault 的 Dialogue 文件用 tandem comments 討論,使用者檢查完才開發。遇到這些情況使用:使用者寫了新的 Dialogue 或需求清單、說「開始 1.x」「新版本」「討論」;要做分流(triage)、PRD、CR、Review pack;每次開工前確認現在在哪個階段、能不能寫程式。
---

# Card Table 工作流程

**正本在 vault**,使用者可以直接改、也可以在上面留言。每次用這個技能都先讀正本:
- Windows:`C:\Users\新春\Documents\Cintrun3\0.常用\Card table project\Procedure\Working procedure.md`
- Mac:`/Users/wujiajun/Documents/Cintrun3/0.常用/Card table project/Procedure/Working procedure.md`
- 角色:同一個資料夾的 `Roles.md`;範本:`Procedure/Templates/`。
- **開工順序(2026-09-20 使用者明講)**:`Handoff.md` → `Roles.md` → `Working procedure.md`。
  **Handoff 只留最新一版**,最上面是「大方向」(這一版在做什麼、三段進度)+ 進度表;舊的搬到 `0.Procedure/Handoff archive/`(檔名帶日期和那一輪做了什麼)。

找不到正本就問使用者,不要照記憶做。正本跟這份不一樣時以正本為準,並提醒使用者要不要更新這份。

## 硬規則

1. **使用者檢查完之前不做新版本**:不寫產品程式(main.js / styles.css / manifest)、不升版、不 commit。
   可以做的:流程文件、分析、讀程式、不寫使用者筆記的 POC(例如在 Obsidian 裡跑純函式)。
2. **討論一律在 Dialogue 文件**:逐項用 tandem comments(技能 `obsidian-tandem-comments`)。
   正文只動最下面的「Claude REPLY」,使用者寫的字一個都不改。
3. **每次回覆最後有「PM 自我批評」**:這個提案最弱的地方、我不確定的、我會砍掉的。
4. **推 tag 永遠是使用者**;commit 要等使用者看過 Review pack 說 OK。
5. **每一項一個編號**:`<版本>-B1`(Bug)、`U`(UX)、`F`(新功能)、`D`(文件)、`P`(流程)。
   留言、PRD、CR、commit 訊息、CHANGELOG 都用同一個編號。

## 階段(細節照正本,這裡是檢查清單)

| 階段 | 角色 | 產出 | 關卡 |
| --- | --- | --- | --- |
| 0 收件 | 使用者 | Dialogue 文件(什麼格式都可以) | |
| 1 分流 Triage | PM | 每項一則留言 + REPLY 總覽 + 決策清單(一輪最多約 12 題) | **Gate A** 使用者回覆決策 |
| 2 定義 Define | PM + UX | PRD(範圍、Problem statement、每項的 AC、**§5 實作指南**);新流程先 wireframe;格式變動寫 ADR | **Gate B** 使用者簽核 PRD |
| 3 實作 Build | Dev | 照 CLAUDE.md;範圍變了就寫 CR | |
| 4 驗證 QA | QA(subagent) | Review pack:每項 ✅ / ❌ + 證據 | **Gate C** 使用者驗收(桌機 + 手機) |
| 5 發版 | PM | 技能 `card-table-release` | 使用者推 tag |
| 6 回顧 | PM | 技能 `card-table-self-review`(大版本的一輪結束時;小的一輪有值得講的才寫) | |

⚠ **PRD 要能交接**(使用者明講,2026-09-23):PRD 寫給**接手的工程師**看,`§5 實作指南` 必寫 ——
資料流(函式名 + `main.js:行號`)、要改的地方一覽表、每一處的程式骨架和坑、「不要做的事」。
判準:**沒參與討論的人只讀那一節 + 程式就能開工**;寫不出來代表還沒想清楚,Gate B 不該過。
範本在 vault 的 `0.Procedure/Templates/Template - PRD.md`。

**平常的溝通像 Discord**(使用者明講):每做一件事,在 `Diologue/Dev chat.md` 最下面留一兩句(發現、做了什麼、需要使用者什麼)。
大的決定還是在 Dialogue 用留言討論;Dev chat 只放短訊息。

## 分流留言的寫法

每則留言開頭一個看得到的代號(`【C05】`),回覆區用代號互相指。內容依序:
- **判斷**:這是什麼、根因(附 `main.js:行號`)、證據。
- **建議**:一個主建議;有需要才列替代方案。
- **問你**:只有真的要使用者決定才問。
- **歸類**:1.6.x / 1.x / 研究 / 流程 / 已完成。

Bug 先證明再提案:讀程式、在 Obsidian 裡跑純函式(像 `tools/format-test.js` 那樣載入 main.js)、列 EU(極端使用者)情境。
證明不了就寫「假設」,並說需要使用者提供什麼(步驟、截圖、手機的「匯出版面診斷」)。

## 分量與節奏

- 一輪最多約 12 個要使用者決定的問題;其他的合併,或排到下一輪。
- 同一項最多來回 3 次,還沒結論就標「擱置」,不要卡住整版。
- 換角色跟著階段換,不是每句話換。
- subagent `card-table-qa` **只在大版本(1.x)的 Gate C 之前用**(使用者 2026-09-18:太燒 token);修正版的 QA 在主對話做。UX critic 使用者拿掉了(太複雜);其他時間在主對話做,省 token。
- 走錯方向最貴的是**大版本的畫面和格式**:這兩種一定先 wireframe / ADR,再寫程式。

## 文件放哪裡

vault 的 `0.常用/Card table project/`:
- `Main navigator.md`:所有文件的索引。每新增一份文件,把連結加進來。
- `Procedure/Handoff.md`:**現在做到哪裡**(版本、階段、下一步、等使用者決定的)。新對話先讀它;
  對話快滿或過了一個 Gate 就更新它(只寫現況,不寫歷史),並提醒使用者開新對話(2026-09-18 使用者要的,省 token)。
- `Diologue/Dev chat.md`:平常的短訊息,最新的在最下面。
- Dialogue 文件(一個版本週期一份)、`PRD/`、`CR/`、`Reviews/`、`Procedure/`。
- `Repo mirror/`:repo 文件的唯讀鏡像,用 `.\tools\mirror-docs.ps1` 更新(改了 README、CHANGELOG、CLAUDE.md、技能之後要重跑)。
