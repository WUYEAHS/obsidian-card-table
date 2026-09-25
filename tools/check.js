(async()=>{
const path='ZZ-css-fixture.md';
const f=app.vault.getAbstractFileByPath(path);
let leaf=app.workspace.getLeavesOfType('card-table').find(l=>l.view&&l.view.file&&l.view.file.path===path);
if(!leaf){ leaf=app.workspace.getLeaf(true); await leaf.openFile(f); await leaf.setViewState({type:'card-table',state:{file:path}}); }
app.workspace.setActiveLeaf(leaf,{focus:true});
// 兩邊的側邊欄都收起來:手機沒有側邊欄
app.workspace.leftSplit.collapse();
app.workspace.rightSplit.collapse();
await new Promise(r=>setTimeout(r,500));
const v=leaf.view;
const S=app.plugins.plugins['card-table']['設定'];
const 睡=(ms)=>new Promise(r=>setTimeout(r,ms));
v['狀態']['篩']={'型':'全部'};   // 篩 = 全部
// 1.6.3:這台裝置記著的收合(時間篩選 / 新增 / 清單)先打開 —— 清單收著的話什麼都量不到,報告是空的卻不是「過」。結尾還原
const 收鍵=['card-table-filter-folded','card-table-add-folded','card-table-list-folded'];
const 原收=收鍵.map(k=>app.loadLocalStorage(k));
收鍵.forEach(k=>app.saveLocalStorage(k,null));
// 1.6.3(mockup v7):未完成 / 已完成二選一、封存的卡片只在封存區 —— 三種畫面各量一次(見 全掃);結尾還原,不存檔
const 原顯示=S['排程顯示']; S['排程顯示']={'未完成':true,'完成':false,'封存':false};
v['畫']();
await 睡(500);
const b=v.contentEl;

function 掃(){
  const bb=b.getBoundingClientRect();
  const o={ 板橫向溢出:b.scrollWidth>b.clientWidth+1 ? (b.scrollWidth+'>'+b.clientWidth) : false,
    溢出元素:[], 切字:[], 超出左右邊界:[] };
  // 1.7.6-U1:小鈕的點擊範圍(::after)會讓元素自己的 scrollWidth 變大,那是刻意的 ——
  // 板橫向溢出 在上面已經帶著點擊範圍量過了;逐個元素掃的時候先把點擊範圍歸 0,掃完再套回來。
  // CR-1.7.6-02:圖示大小(--tk-圖倍)也是只在畫面上放大(transform),一樣歸回 1;看板大小(--tk-板倍)不動,照實際設定量
  const 點鍵=[...document.body.style].filter(k=>k.startsWith('--tk-點-')||k==='--tk-圖倍');
  const 點原=點鍵.map(k=>document.body.style.getPropertyValue(k));
  點鍵.forEach(k=>document.body.style.setProperty(k,k==='--tk-圖倍'?'1':'0px'));
  // 看板放大(zoom ≠ 1)時 scrollWidth 是整數、會多進位 1–2px(實測 callout-icon 20>18、圖示框 17>15,換成 100% 就沒有)→ 容許 2
  const 容=(parseFloat(getComputedStyle(b).zoom)||1)!==1?2:1;
  [...b.querySelectorAll('*')].forEach(el=>{
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.display==='contents') return;
    const r=el.getBoundingClientRect();
    if(r.width===0&&r.height===0) return;
    const nm=(el.className&&String(el.className))||el.tagName;
    // 自己裝不下自己的內容(而且沒開捲動)
    // 例外:色條的 ::before 是刻意放大的點擊區(往右多 5px),會讓 scrollWidth 多 5,不是真的溢出
    const 點擊區=el.classList.contains('tk-色條') && el.scrollWidth<=el.clientWidth+5 + 1;
    // 例外:CR-1.6.6-04,📌 的 icon(9)刻意比底色膠囊(7)大,左右各露 1px。
    // ⚠ 上限 +3:再大就是真的做壞了(1.6.6 曾經把 12px 的 icon 塞進 7px 的盒子,被切掉半邊)。
    const 露出的釘=el.classList.contains('tk-溝釘') && el.scrollWidth<=el.clientWidth+3;
    if(!點擊區 && !露出的釘 && el.scrollWidth>el.clientWidth+容 && cs.overflowX!=='auto' && cs.overflowX!=='scroll'){
      if(o.溢出元素.length<14) o.溢出元素.push(nm.slice(0,34)+'  '+el.scrollWidth+'>'+el.clientWidth);
    }
    // 文字被切掉(葉節點才算)
    if(el.children.length===0 && el.textContent.trim() && el.scrollWidth>el.clientWidth+容){
      if(o.切字.length<14) o.切字.push(nm.slice(0,26)+' 「'+el.textContent.trim().slice(0,16)+'」 '+el.scrollWidth+'>'+el.clientWidth);
    }
    // 跑出板子左右邊界
    if(r.width>0 && (r.right>bb.right+2 || r.left<bb.left-2)){
      if(o.超出左右邊界.length<14) o.超出左右邊界.push(nm.slice(0,30)+'  L'+Math.round(r.left-bb.left)+' R'+Math.round(r.right-bb.right));
    }
  });
  點鍵.forEach((k,i)=>document.body.style.setProperty(k,點原[i]));      // 還原成量之前的值(check4 的手機組也是這樣設的,不要叫 套點擊 蓋回桌機那組)
  return o;
}
// 未完成 → 已完成 → 封存區,三個畫面的結果併在一起(每一項標是哪個畫面);卡片數各記一個
async function 全掃(){
  const 併={ 板橫向溢出:false, 溢出元素:[], 切字:[], 超出左右邊界:[], 卡片:{} };
  // ⚠ 1.6.3:封存區不再是自己一塊(s.封存區 沒了)—— 它是設定面板的右半邊(看封存區 = 設定模式 && 封存看),
  //   所以第三個畫面要開設定模式(連 設草 一起建),不然量到的還是平常的清單(2026-09-20 修)
  const 畫面=[['未完成',()=>{ S['排程顯示']={'未完成':true,'完成':false,'封存':false}; }],
    ['已完成',()=>{ S['排程顯示']={'未完成':false,'完成':true,'封存':false}; }],
    ['封存區',()=>{ S['排程顯示']={'未完成':true,'完成':false,'封存':false}; v['狀態']['設定模式']=true; v['設草']=v['建設草'](); v['狀態']['封存看']=null; }]];
  for(const [名,設] of 畫面){
    設(); v['畫'](); await 睡(400);
    const o=掃();
    併.卡片[名]=b.querySelectorAll('.tk-列').length;
    if(o.板橫向溢出) 併.板橫向溢出=名+' '+o.板橫向溢出;
    ['溢出元素','切字','超出左右邊界'].forEach(k=>o[k].forEach(x=>{ if(併[k].length<14) 併[k].push('['+名+'] '+x); }));
  }
  v['狀態']['設定模式']=false; v['設草']=null; S['排程顯示']={'未完成':true,'完成':false,'封存':false};
  return 併;
}

const bb=b.getBoundingClientRect();
const 清單寬=()=>{ const x=v['區']&&v['區']['清單']; return x?Math.round(x.getBoundingClientRect().width):null; };
// ovh = 視窗寬 - 看板寬;inner = CSS px 的視窗寬(CDP 設的是裝置 px,Obsidian 有縮放時兩者不同)
const out={ ovh:innerWidth-Math.round(bb.width), inner:innerWidth, 寬:Math.round(bb.width), 窄:!!v['窄'], 密:!!v['密'],
  版面:S['版面寬度'], 清單寬:清單寬() };
Object.assign(out, await 全掃());

// 桌機:兩種版面寬度都要掃(1.4.5 新增的設定)。1.6.3 起 窄 永遠是 true(只有卡片版面),看 密(時間篩選擠不擠)
if(!v['密']){
  const 原=S['版面寬度'];
  S['版面寬度']=(原==='寬')?'窄':'寬';
  v['畫'](); await 睡(400);
  out['另一種版面']=Object.assign({ 版面:S['版面寬度'], 清單寬:清單寬() }, await 全掃());
  S['版面寬度']=原;
  v['畫'](); await 睡(200);
}
S['排程顯示']=原顯示; 收鍵.forEach((k,i)=>app.saveLocalStorage(k,原收[i]||null)); v['畫']();
return JSON.stringify(out,null,1);
})()
