/* 卡片看板:看板 DOM 的探針(只讀畫面,不寫檔、不存設定)。
   1.6.3 加的 —— 以前每次要問「那顆鈕在哪、編修框有沒有掛起來」都現寫一份 eval,很浪費;
   常用的幾種問法固定寫在這裡,用 tools/probe.ps1 叫。

   用法(probe.ps1 會幫你組好):
     window.__pq = '<指令>|<參數>|<檔名>';  eval(readFileSync('<repo>/tools/probe.js'))
     (等一下)window.__p 就是結果

   指令:
     state            看板現在的狀態(篩選、設定模式、詳細、行事曆、封存看、搜尋、編修)+ 畫了哪幾塊
     reset            回到「平常的樣子」:關掉設定 / 詳細 / 行事曆 / 封存區 / 編修,篩選設成全部
     head             每一塊標題列的子元素:class、圖示名、左緣(相對塊)、寬
     card <字>        含這段字的那張卡片:色條、📌、主題膠囊、✎ ⋯ 的位置和 class
     edit <字>        按那張卡片的「編輯」,回報編修框掛起來沒(結尾會收掉)
     hit              每一類小鈕的點擊範圍大小,四個角點下去是不是自己(1.7.6)
     overflow         裝不下自己內容的元素(check4 報 a>b 時用這個找是哪一個)
     sel <選擇器>     符合的元素的 rect + 幾個常看的 computed style

   ⚠ 探完**一定要 reset**(或跑 run-tests 重載):設定模式、封存看、編修留在看板上,
     下一次 measure.ps1 量到的就不是要量的東西(2026-09-20 踩過,白跑三次)。 */
window.__p = 'running';
(async () => {
  const 睡 = (ms) => new Promise(r => setTimeout(r, ms));
  const [指令, 參數, 檔名] = String(window.__pq || 'state||ZZ-css-fixture.md').split('|');
  const path = 檔名 || 'ZZ-css-fixture.md';
  const f = app.vault.getAbstractFileByPath(path);
  if (!f) return '找不到 ' + path + '(先跑 measure.ps1 或 check4.ps1 建 fixture)';
  let leaf = app.workspace.getLeavesOfType('card-table').find(l => l.view && l.view.file && l.view.file.path === path);
  if (!leaf) {
    leaf = app.workspace.getLeaf(true);
    await leaf.openFile(f);
    await leaf.setViewState({ type: 'card-table', state: { file: path } });
    await 睡(700);
  }
  app.workspace.setActiveLeaf(leaf, { focus: true });
  const v = leaf.view, b = v.contentEl, s = v.狀態;
  const 圓 = (x) => x == null ? 'null' : Math.round(x * 10) / 10;
  const 看得見 = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  // 基準線跟 measure.js 一樣:塊的左邊框**內側**(不扣框線的話每個數字都會多 0.6,對不上 M 那幾項)
  const 塊基 = (塊) => 塊.getBoundingClientRect().left + parseFloat(getComputedStyle(塊).borderLeftWidth || 0);
  const 基 = (el) => { const 塊 = el.closest('.tk-塊'); return 塊 ? 塊基(塊) : 0; };
  const 圖名 = (el) => {
    const svg = el.tagName === 'svg' ? el : el.querySelector('svg');
    return svg ? String(svg.getAttribute('class') || '').replace('svg-icon lucide-', '').trim() : '';
  };
  const 描述 = (el, x0) => {
    const r = el.getBoundingClientRect();
    return (el.className || el.tagName) + (圖名(el) ? '[' + 圖名(el) + ']' : '') +
      ' 左' + 圓(r.left - (x0 == null ? 基(el) : x0)) + ' 寬' + 圓(r.width) + ' 高' + 圓(r.height);
  };
  const 塊名 = (塊) => 塊.classList.contains('tk-新塊') ? '新增' : 塊.classList.contains('tk-篩塊') ? '時間篩選' :
    (塊.querySelector('.tk-頂列') ? '置頂' : 塊.querySelector('.tk-列') ? '清單' : '空清單');
  const 找卡 = (字) => [...b.querySelectorAll('.tk-列')].find(r => r.textContent.indexOf(字) >= 0);
  const 回平常 = () => {
    s.設定模式 = false; v.設草 = null; s.詳細 = false; s.開行事曆 = false;
    s.封存看 = null; s.封存搜 = ''; s.編修 = null; s.搜尋 = ''; s.主題 = null; s.指派 = null;
    v.畫();
  };
  const 出 = [];

  if (指令 === 'reset') {
    回平常(); await 睡(300);
    return '回到平常的樣子了(篩選沒動:' + JSON.stringify(s.篩) + ')';
  }

  if (指令 === 'state') {
    出.push('檔案 ' + path + ' · 版本 ' + app.plugins.plugins['card-table'].manifest.version);
    出.push('篩 ' + JSON.stringify(s.篩) + ' · 游標 ' + s.游標 + ' · 今 ' + v.今);
    出.push('設定模式 ' + !!s.設定模式 + '(設草 ' + !!v.設草 + ')· 詳細 ' + !!s.詳細 +
      ' · 行事曆 ' + !!s.開行事曆 + ' · 封存看 ' + JSON.stringify(s.封存看) + ' · 看封存區 ' + v.看封存區);
    出.push('搜尋 ' + JSON.stringify(s.搜尋) + ' · 編修 ' + JSON.stringify(s.編修) + ' · 編框 ' + !!v.編框);
    出.push('窄 ' + v.窄 + ' · 密 ' + v.密 + ' · 觸 ' + v.觸 + ' · 卡片 ' + v.卡片.length + ' 張');
    出.push('塊:' + [...b.querySelectorAll('.tk-塊')].filter(看得見).map(塊名).join(' / '));
    return 出.join('\n');
  }

  if (指令 === 'head') {
    [...b.querySelectorAll('.tk-塊')].filter(看得見).forEach(塊 => {
      const 頭 = 塊.children[0];
      if (!頭) return;
      const x0 = 塊基(塊);
      出.push('【' + 塊名(塊) + '】高 ' + 圓(頭.getBoundingClientRect().height));
      [...頭.children].filter(看得見).forEach(e => 出.push('   ' + 描述(e, x0)));
    });
    return 出.join('\n') || '沒有塊';
  }

  if (指令 === 'card') {
    const 列 = 找卡(參數 || '');
    if (!列) return '找不到含「' + 參數 + '」的卡片';
    const r0 = 列.getBoundingClientRect(), x0 = 基(列);
    出.push('列 ' + 列.className + ' 高 ' + 圓(r0.height));
    const 條 = 列.querySelector('.tk-色條'), 釘 = 列.querySelector('.tk-溝釘');
    if (條) { const r = 條.getBoundingClientRect();
      出.push('色條 左' + 圓(r.left - x0) + '–' + 圓(r.right - x0) + ' top' + 圓(r.top - r0.top) + ' 高' + 圓(r.height)); }
    if (釘) { const r = 釘.getBoundingClientRect();
      出.push('📌 左' + 圓(r.left - x0) + ' top' + 圓(r.top - r0.top) + ' 寬' + 圓(r.width) +
        ' 透明度 ' + getComputedStyle(釘).opacity + (條 ? ' · 跟色條左緣差 ' + 圓(r.left - 條.getBoundingClientRect().left) : '')); }
    ['.tk-主題', '.tk-副標', '.tk-頭像, .tk-頭像空', '.tk-date', '.tk-題具 > *'].forEach(sel => {
      [...列.querySelectorAll(sel)].filter(看得見).forEach(e => 出.push(sel + ' → ' + 描述(e, x0)));
    });
    return 出.join('\n');
  }

  if (指令 === 'edit') {
    const 列 = 找卡(參數 || '');
    if (!列) return '找不到含「' + 參數 + '」的卡片';
    const 鈕 = [...列.querySelectorAll('[aria-label],[title]')]
      .find(e => /^(編輯|Edit)$/.test(e.title || e.getAttribute('aria-label') || ''));
    if (!鈕) return '那張卡片上找不到「編輯」鈕';
    鈕.click(); await 睡(700);
    const 列2 = 找卡(參數 || '');
    出.push('狀態.編修 = ' + JSON.stringify(s.編修));
    出.push('.tk-編框 ' + !!(列2 && 列2.querySelector('.tk-編框')) +
      ' · .cm-content ' + !!(列2 && 列2.querySelector('.tk-編框 .cm-content')) +
      ' · textarea(退路) ' + !!(列2 && 列2.querySelector('.tk-編框 textarea')));
    出.push('v.編框 ' + (v.編框 ? '有(編輯器 ' + !!v.編框.編輯器 + ')' : 'null'));
    const 題編 = 列2 && 列2.querySelector('input.tk-題編');
    if (題編) 出.push('題編 值 ' + JSON.stringify(題編.value) + ' · ' + 描述(題編));
    try { await v.收掉編修(); } catch (e) { 出.push('收掉編修 丟錯 ' + e.message); }
    s.編修 = null; v.重畫清單();
    return 出.join('\n');
  }

  /* hit(1.7.6-R1):每一類小鈕的點擊範圍(::after 的大小)+ 四個角往內 1px 用 elementFromPoint 取樣,
     點到的不是自己(或自己的子孫)就報「被誰搶」。每類最多看 4 個。 */
  if (指令 === 'hit') {
    const 類 = ['.tk-色條', '.tk-溝釘', '.tk-溝', '.tk-頭鈕', '.tk-篩箭', '.tk-卡鈕', '.tk-曆鈕'];
    const 名 = (e) => e ? (e.className && e.className.baseVal === undefined ? String(e.className).split(' ').filter(c => c.startsWith('tk-')).slice(0, 2).join('.') : e.tagName) || e.tagName : 'null';
    const 出 = [];
    類.forEach(sel => {
      const 們 = [...b.querySelectorAll(sel)].filter(e => 看得見(e) && getComputedStyle(e).visibility !== 'hidden').slice(0, 4);
      if (!們.length) { 出.push(sel + '  (畫面上沒有)'); return; }
      const 錯 = new Set(); let 大 = '';
      們.forEach(e => {
        const r = e.getBoundingClientRect(), a = getComputedStyle(e, sel === '.tk-曆鈕' ? '::before' : '::after');
        const z = parseFloat(getComputedStyle(b).zoom) || 1;      // CR-1.7.6-02:::after 的數字是放大前的,rect 是螢幕上的
        const w = (parseFloat(a.width) * z) || r.width, h = (parseFloat(a.height) * z) || r.height;
        // ::after 的位置 = 元素左上 + left/top(已經是 px)+ transform 的位移
        const m = /matrix\([^,]+,[^,]+,[^,]+,[^,]+,\s*([-\d.]+),\s*([-\d.]+)\)/.exec(a.transform) || [0, 0, 0];
        const x0 = r.left + ((parseFloat(a.left) || 0) + +m[1]) * z, y0 = r.top + ((parseFloat(a.top) || 0) + +m[2]) * z;
        大 = 圓(w) + '×' + 圓(h) + '(鈕 ' + 圓(r.width) + '×' + 圓(r.height) + ')';
        [[x0 + 1, y0 + 1], [x0 + w - 1, y0 + 1], [x0 + 1, y0 + h - 1], [x0 + w - 1, y0 + h - 1]].forEach(([x, y]) => {
          const t = document.elementFromPoint(x, y);
          if (!t || !(t === e || e.contains(t))) 錯.add(名(t));
        });
      });
      出.push(sel + '  ' + 大 + (錯.size ? '  ✗ 被搶:' + [...錯].join(', ') : '  ✓'));
    });
    return 出.join('\n');
  }
  if (指令 === 'overflow') {
    [...b.querySelectorAll('*')].forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || !看得見(el)) return;
      /* 跟 check.js 同一套判斷:只看**寬度**裝不裝得下、而且沒開左右捲動。
         色條的 ::before 是刻意放大的點擊區(往右多 5),check4 也放過它。 */
      const 點擊區 = el.classList.contains('tk-色條') && el.scrollWidth <= el.clientWidth + 6;
      if (!點擊區 && el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll') {
        出.push((el.className || el.tagName) + ' ' + el.scrollWidth + '>' + el.clientWidth +
          ' · overflow ' + cs.overflowX +
          ' · 子 ' + ([...el.children].map(c => c.tagName + (c.type || '')).join(',') || '(只有字)') +
          ' · 在 ' + (el.parentElement ? (el.parentElement.className || el.parentElement.tagName) : '?'));
      }
    });
    return 出.join('\n') || '沒有裝不下自己的元素';
  }

  if (指令 === 'sel') {
    const 們 = [...b.querySelectorAll(參數 || '*')].filter(看得見).slice(0, 12);
    if (!們.length) return '沒有符合「' + 參數 + '」的元素';
    們.forEach(e => {
      const cs = getComputedStyle(e);
      出.push(描述(e) + ' · ' + ['display', 'position', 'top', 'left', 'opacity', 'backgroundColor', 'color']
        .map(k => k + ':' + cs[k]).join(' '));
    });
    return 出.join('\n');
  }

  return '不認得的指令「' + 指令 + '」,有:state / reset / head / card / edit / overflow / sel';
})().then(r => window.__p = r, e => window.__p = 'ERROR ' + (e && e.stack || e));
