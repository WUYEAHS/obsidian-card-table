# 上架社群外掛

Obsidian 的社群外掛審核分兩關:一隻機器人跑靜態檢查,然後一個人讀程式碼。
機器人擋掉的都是固定那幾條,人看的則多半是「這個外掛有沒有動到不該動的東西」。

## 一、每次發版都要做的事

版本號有三個地方,**必須一致**,漏掉任何一個 Obsidian 的更新檢查就會出錯:

| 檔案 | 欄位 | 現在 |
| --- | --- | --- |
| `manifest.json` | `version` | 1.4.1 |
| `main.js` | `插件版本` | 1.4.1 |
| `versions.json` | 新增一筆 `"版本": "最低 Obsidian 版本"` | `"1.4.1": "1.4.0"` |

`main.js` 裡還有一個 `看板版本`(現在是 `260912v3`),那是畫面上給自己看的,
格式 `YYMMDDvN`,跟 semver 無關,不要混在一起。

然後建 GitHub Release:

- **tag 就是版本號本身,不要加 `v`** —— `1.4.1`,不是 `v1.4.1`。這是最常見的退件原因。
- 附件要分別上傳 **`main.js`、`manifest.json`、`styles.css` 三個檔案**。
  GitHub 自動產生的 source zip **不算**,審核抓的是這三個獨立附件。

## 二、第一次送審

1. Fork [`obsidianmd/obsidian-releases`](https://github.com/obsidianmd/obsidian-releases)
2. 在 `community-plugins.json` 最後面加一筆:

```json
{
  "id": "card-table",
  "name": "Card Table: Dated Tasks",
  "author": "jiajiunwu",
  "description": "Date-first task cards from a markdown note: filter today, this week or this month in one tap, comment on cards like a journal, a Kanban-style table that stays plain text.",
  "repo": "WUYEAHS/obsidian-card-table"
}
```

3. 開 PR,用它們的 plugin submission 樣板,照著把 checkbox 勾完。

## 三、已經處理掉的退件點

這幾條是 1.4.1 為了送審改的,**不要改回去**:

- **不可以有 `innerHTML` / `outerHTML` 指派。** 圖示的備胎路徑改走 `DOMParser`
  (`圖()`),PNG 匯出改走 `XMLSerializer`。順帶一提,`XMLSerializer` 同時比較正確:
  `outerHTML` 吐出來的 `<br>` 在 `foreignObject` 裡不是合法 XML,整張 SVG 會解析失敗
  (目前的匯出 DOM 剛好沒有這種標籤,所以還沒出事,但那是運氣)。
- **不可以有 `document.write`。** 列印視窗改成一個一個節點建。
- **`manifest.json` 的 `authorUrl` 不可以是空殼。** 本來是 `https://github.com/`。
- **不要自己碰 `window.localStorage`。** 改用 `app.loadLocalStorage` /
  `saveLocalStorage`,它會照 vault 分開存。
  ⚠ 例外:`語()` 還在讀 `localStorage.getItem("language")`,那是在讀 Obsidian
  自己的語言設定,API 沒有公開的讀法,社群都是這樣做的。被問到就這樣回答。
- **`onunload()` 裡不可以 detach leaf。** 現在是空的,是對的 —— Obsidian 明文說
  外掛不該在卸載時關掉使用者的分頁。
- 事件都走 `registerEvent` / `registerDomEvent`,卸載時會自動拆掉。

## 四、預期會被問到的地方

照實回答就好,這些不是錯,但審核的人會停下來看:

1. **`WorkspaceLeaf.prototype.setViewState` 被覆寫**(`main.js`,onload 裡)。
   這是整個外掛風險最高的一段 —— 改到了 Obsidian 核心類別的原型。
   理由是:要在視圖被建出來**之前**就換成看板,不然每次開檔案都會先閃一下 Markdown。
   已經做對的部分是 `this.register()` 有把原本的函式還回去,卸載不會留殘骸。
   如果審核要求拿掉,替代方案是改用 `registerEvent(workspace.on("file-open"))`
   事後換 —— 會閃一下,但過得了。**先不要主動改**,等他們開口。

2. **大量 inline style**(`st()` 這個函式)。審核偏好把樣式放進 `styles.css`,
   用 class 掛上去。這是「建議」不是「規定」,但量大到會被提。
   要回應的話,可以先把固定不變的那些搬進 `styles.css`,留下真正跟資料有關的
   (分類顏色、指派人顏色)繼續用 inline。

3. **`description` 開頭**。現在是 "Read one markdown note as…",沒有踩到
   「不可以用 This plugin 開頭」「不可以出現 Obsidian」那兩條,不用改。

## 五、送審前最後跑一次

```bash
obsidian plugin:reload id=card-table
```

```bash
obsidian dev:errors
```

兩個都乾淨,再建 release。
