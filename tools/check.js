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
v['畫']();
await 睡(500);
const b=v.contentEl;

function 掃(){
  const bb=b.getBoundingClientRect();
  const o={ 板橫向溢出:b.scrollWidth>b.clientWidth+1 ? (b.scrollWidth+'>'+b.clientWidth) : false,
    溢出元素:[], 切字:[], 超出左右邊界:[] };
  [...b.querySelectorAll('*')].forEach(el=>{
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.display==='contents') return;
    const r=el.getBoundingClientRect();
    if(r.width===0&&r.height===0) return;
    const nm=(el.className&&String(el.className))||el.tagName;
    // 自己裝不下自己的內容(而且沒開捲動)
    if(el.scrollWidth>el.clientWidth+1 && cs.overflowX!=='auto' && cs.overflowX!=='scroll'){
      if(o.溢出元素.length<14) o.溢出元素.push(nm.slice(0,34)+'  '+el.scrollWidth+'>'+el.clientWidth);
    }
    // 文字被切掉(葉節點才算)
    if(el.children.length===0 && el.textContent.trim() && el.scrollWidth>el.clientWidth+1){
      if(o.切字.length<14) o.切字.push(nm.slice(0,26)+' 「'+el.textContent.trim().slice(0,16)+'」 '+el.scrollWidth+'>'+el.clientWidth);
    }
    // 跑出板子左右邊界
    if(r.width>0 && (r.right>bb.right+2 || r.left<bb.left-2)){
      if(o.超出左右邊界.length<14) o.超出左右邊界.push(nm.slice(0,30)+'  L'+Math.round(r.left-bb.left)+' R'+Math.round(r.right-bb.right));
    }
  });
  return o;
}

const bb=b.getBoundingClientRect();
const 清單寬=()=>{ const x=v['區']&&v['區']['清單']; return x?Math.round(x.getBoundingClientRect().width):null; };
// ovh = 視窗寬 - 看板寬;inner = CSS px 的視窗寬(CDP 設的是裝置 px,Obsidian 有縮放時兩者不同)
const out={ ovh:innerWidth-Math.round(bb.width), inner:innerWidth, 寬:Math.round(bb.width), 窄:!!v['窄'],
  版面:S['版面寬度'], 清單寬:清單寬() };
Object.assign(out, 掃());

// 桌機:兩種版面寬度都要掃(1.4.5 新增的設定)
if(!v['窄']){
  const 原=S['版面寬度'];
  S['版面寬度']=(原==='寬')?'窄':'寬';
  v['畫'](); await 睡(400);
  out['另一種版面']=Object.assign({ 版面:S['版面寬度'], 清單寬:清單寬() }, 掃());
  S['版面寬度']=原;
  v['畫'](); await 睡(200);
}
return JSON.stringify(out,null,1);
})()
