(async()=>{
const path='ZZ-css-fixture.md';
const f=app.vault.getAbstractFileByPath(path);
let leaf=app.workspace.getLeavesOfType('card-table').find(l=>l.view&&l.view.file&&l.view.file.path===path);
if(!leaf){ leaf=app.workspace.getLeaf(true); await leaf.openFile(f); await leaf.setViewState({type:'card-table',state:{file:path}}); }
app.workspace.setActiveLeaf(leaf,{focus:true});
// 兩邊的側邊欄都收起來:手機沒有側邊欄,不收的話 420px 的視窗只剩 306px 給看板,量到的是不存在的寬度
app.workspace.leftSplit.collapse();
app.workspace.rightSplit.collapse();
await new Promise(r=>setTimeout(r,500));
const v=leaf.view;
v['狀態']['篩']={'型':'全部'};   // 篩 = 全部
v['畫']();
await new Promise(r=>setTimeout(r,500));
const b=v.contentEl;
const bb=b.getBoundingClientRect();

// ovh = 視窗寬 - 看板寬(左側 ribbon、分頁邊框…)。check4 用它把視窗調到「看板剛好是手機那麼寬」
const out={ ovh:innerWidth-Math.round(bb.width), inner:innerWidth, 寬:Math.round(bb.width), 窄:!!v['窄'],板橫向溢出:b.scrollWidth>b.clientWidth+1 ? (b.scrollWidth+'>'+b.clientWidth) : false,
  溢出元素:[], 切字:[], 超出左右邊界:[] };

[...b.querySelectorAll('*')].forEach(el=>{
  const cs=getComputedStyle(el);
  if(cs.display==='none'||cs.display==='contents') return;
  const r=el.getBoundingClientRect();
  if(r.width===0&&r.height===0) return;
  const nm=(el.className&&String(el.className))||el.tagName;
  // 自己裝不下自己的內容(而且沒開捲動)
  if(el.scrollWidth>el.clientWidth+1 && cs.overflowX!=='auto' && cs.overflowX!=='scroll'){
    if(out.溢出元素.length<14) out.溢出元素.push(nm.slice(0,34)+'  '+el.scrollWidth+'>'+el.clientWidth);
  }
  // 文字被切掉(葉節點才算)
  if(el.children.length===0 && el.textContent.trim() && el.scrollWidth>el.clientWidth+1){
    if(out.切字.length<14) out.切字.push(nm.slice(0,26)+' 「'+el.textContent.trim().slice(0,16)+'」 '+el.scrollWidth+'>'+el.clientWidth);
  }
  // 跑出板子左右邊界
  if(r.width>0 && (r.right>bb.right+2 || r.left<bb.left-2)){
    if(out.超出左右邊界.length<14) out.超出左右邊界.push(nm.slice(0,30)+'  L'+Math.round(r.left-bb.left)+' R'+Math.round(r.right-bb.right));
  }
});
return JSON.stringify(out,null,1);
})()
