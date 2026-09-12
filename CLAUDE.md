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
| `main.js` 的 `看板版本` | `YYMMDDvN`,畫面上看得到 | `260912v2` |
| `main.js` 的 `插件版本` | semver,要跟 manifest 一致 | `1.4.0` |
| `manifest.json` 的 `version` | semver | `1.4.0` |

semver 升版時,`versions.json` 也要加一筆 `"新版本": "最低 Obsidian 版本"`。

## 筆記裡的文字格式就是儲存格式

沒有資料庫、沒有隱藏索引。日期、負責人、釘選、留言、循環全都是筆記裡的純文字,
外掛關掉之後那份筆記仍然是一般人讀得懂的待辦清單。格式對照表在 README.md。
**改格式等於改使用者已經存在的筆記**,要往回相容。

## Git

- remote:`https://github.com/WUYEAHS/obsidian-card-table.git`,branch `main`
- 命令列沒設 credential helper,**push 用 GitHub Desktop**
- `git` 在 `%LOCALAPPDATA%\GitHubDesktop\...\git\cmd`,已加進使用者 PATH
