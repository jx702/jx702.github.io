const defaultData={projects:[
 {title:"我的第一个项目",tag:"Project",desc:"这是一个示例项目。登录后台后，你可以把它换成自己的作品。"},
 {title:"Creative Work",tag:"Design",desc:"展示设计、摄影、学校活动或其他你想记录的内容。"},
 {title:"Coming Soon",tag:"Future",desc:"未来的作品可以继续添加到这里。"}
],gallery:[]};

function loadData(){try{return JSON.parse(localStorage.getItem("jimsonData"))||defaultData}catch(e){return defaultData}}
function render(){
 const d=loadData();
 document.querySelector("#project-list").innerHTML=d.projects.map(p=>`<article class="card"><span class="tag">${esc(p.tag||"Project")}</span><h3>${esc(p.title)}</h3><p>${esc(p.desc)}</p></article>`).join("");
 const g=document.querySelector("#gallery-list");
 g.innerHTML=d.gallery.length?d.gallery.map(x=>`<img src="${x.src}" alt="${esc(x.title||"Jimson gallery image")}">`).join(""):`<div class="empty">相册暂时为空<br>你可以在 Admin 后台上传图片。</div>`;
}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
render();