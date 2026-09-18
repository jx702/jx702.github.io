const SUPABASE_URL = "https://lkgpjsraxgkutqdmrzcu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_R-AG1fe66WZqwf5uyD4NNw_khif0eaZ";
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const $ = (id) => document.getElementById(id);
const escapeHtml = (value='') => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

async function loadProjects() {
  const box = $('project-list'); if (!box) return;
  const { data, error } = await db.from('projects').select('*').order('created_at', { ascending:false });
  if (error) { box.innerHTML = '<p class="muted">项目暂时无法加载。</p>'; console.error(error); return; }
  if (!data.length) { box.innerHTML = '<p class="muted">目前还没有项目，可以从 Admin 后台新增。</p>'; return; }
  box.innerHTML = data.map(p => `<article class="card">${p.image_url ? `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.title)}">` : ''}<div class="card-body"><p class="tag">${escapeHtml(p.category || 'Project')}</p><h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.description || '')}</p></div></article>`).join('');
}

async function loadGallery() {
  const box = $('gallery-list'); if (!box) return;
  const { data, error } = await db.storage.from('gallery').list('', { limit:100, sortBy:{column:'created_at', order:'desc'} });
  if (error) { box.innerHTML = '<p class="muted">相册暂时无法加载。</p>'; console.error(error); return; }
  const files = (data || []).filter(x => x.name && !x.id?.endsWith('/'));
  if (!files.length) { box.innerHTML = '<p class="muted">目前还没有图片，可以从 Admin 后台上传。</p>'; return; }
  box.innerHTML = files.map(f => { const { data:urlData } = db.storage.from('gallery').getPublicUrl(f.name); return `<figure class="gallery-item"><img src="${escapeHtml(urlData.publicUrl)}" alt="${escapeHtml(f.name)}" loading="lazy"><figcaption>${escapeHtml(f.name)}</figcaption></figure>`; }).join('');
}

async function initPublic() { await Promise.all([loadProjects(), loadGallery()]); }

async function initAdmin() {
  const loginBox = $('login'); if (!loginBox) return;
  const { data:{ session } } = await db.auth.getSession();
  if (session) showDashboard(session.user); else showLogin();
  $('loginBtn').addEventListener('click', login);
  $('logoutBtn').addEventListener('click', logout);
  $('addProjectBtn').addEventListener('click', addProject);
  $('addPhotoBtn').addEventListener('click', addPhoto);
  db.auth.onAuthStateChange((_event, session) => { if (session) showDashboard(session.user); else showLogin(); });
}

function showLogin() { $('login').style.display='block'; $('dashboard').style.display='none'; }
async function showDashboard(user) { $('login').style.display='none'; $('dashboard').style.display='block'; if ($('loginMsg')) $('loginMsg').textContent = `已登录：${user.email}`; await renderAdmin(); }

async function login() {
  const email = $('email').value.trim(), password = $('password').value;
  if (!email || !password) { $('loginMsg').textContent='请输入 Email 和密码。'; return; }
  $('loginMsg').textContent='登录中……';
  const { error } = await db.auth.signInWithPassword({ email, password });
  $('loginMsg').textContent = error ? `登录失败：${error.message}` : '登录成功';
}
async function logout() { await db.auth.signOut(); location.reload(); }

async function addProject() {
  const title=$('pt').value.trim(), category=$('ptag').value.trim() || 'Project', description=$('pd').value.trim();
  if (!title) return alert('请先填写项目标题。');
  const { error } = await db.from('projects').insert({title, category, description});
  if (error) return alert('发布失败：'+error.message);
  $('pt').value=''; $('ptag').value=''; $('pd').value=''; await renderAdmin(); alert('项目已发布！');
}

async function addPhoto() {
  const file=$('photo').files[0]; if (!file) return alert('请选择图片。');
  if (!file.type.startsWith('image/')) return alert('只能上传图片。');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g,'-');
  const path = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  $('photoMsg').textContent='上传中……';
  const { error } = await db.storage.from('gallery').upload(path, file, { contentType:file.type, upsert:false });
  $('photoMsg').textContent = error ? `上传失败：${error.message}` : '上传成功！';
  if (!error) { $('photo').value=''; await renderAdmin(); }
}

async function editProject(id, oldTitle, oldCategory, oldDescription) {
  const title=prompt('项目标题：', oldTitle); if (title===null) return;
  const category=prompt('分类：', oldCategory || 'Project'); if (category===null) return;
  const description=prompt('项目介绍：', oldDescription || ''); if (description===null) return;
  const { error } = await db.from('projects').update({title, category, description}).eq('id', id);
  if (error) alert('修改失败：'+error.message); else await renderAdmin();
}
async function deleteProject(id) { if (!confirm('确定删除这个项目吗？')) return; const { error }=await db.from('projects').delete().eq('id',id); if(error) alert('删除失败：'+error.message); else await renderAdmin(); }
async function deletePhoto(name) { if (!confirm('确定删除这张图片吗？')) return; const { error }=await db.storage.from('gallery').remove([name]); if(error) alert('删除失败：'+error.message); else await renderAdmin(); }

async function renderAdmin() {
  const { data:projects, error:pErr }=await db.from('projects').select('*').order('created_at',{ascending:false});
  $('items').innerHTML = pErr ? `<p class="status">${escapeHtml(pErr.message)}</p>` : projects.length ? projects.map(p=>`<div class="admin-row"><div><strong>${escapeHtml(p.title)}</strong><span>${escapeHtml(p.category||'Project')}</span><p>${escapeHtml(p.description||'')}</p></div><div class="row-actions"><button class="btn" onclick='editProject(${p.id},${JSON.stringify(p.title)},${JSON.stringify(p.category||'')},${JSON.stringify(p.description||'')})'>编辑</button><button class="btn danger" onclick="deleteProject(${p.id})">删除</button></div></div>`).join('') : '<p class="muted">暂无项目。</p>';
  const { data:files, error:fErr }=await db.storage.from('gallery').list('',{limit:100,sortBy:{column:'created_at',order:'desc'}});
  const valid=(files||[]).filter(x=>x.name);
  $('galleryItems').innerHTML=fErr ? `<p class="status">${escapeHtml(fErr.message)}</p>` : valid.length ? valid.map(f=>{const {data:u}=db.storage.from('gallery').getPublicUrl(f.name); return `<div class="admin-photo"><img src="${escapeHtml(u.publicUrl)}" alt=""><div><small>${escapeHtml(f.name)}</small><button class="btn danger" onclick='deletePhoto(${JSON.stringify(f.name)})'>删除</button></div></div>`}).join('') : '<p class="muted">暂无图片。</p>';
}

if ($('project-list') || $('gallery-list')) initPublic();
if ($('login')) initAdmin();
