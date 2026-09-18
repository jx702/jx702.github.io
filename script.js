const SUPABASE_URL = "https://lkgpjsraxgkutqdmrzcu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_R-AG1fe66WZqwf5uyD4NNw_khif0eaZ";
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const $ = (id) => document.getElementById(id);
const escapeHtml = (value='') => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const publicUrl = (path) => db.storage.from('gallery').getPublicUrl(path).data.publicUrl;
const filePath = (name, folder='') => `${folder ? folder + '/' : ''}${Date.now()}-${crypto.randomUUID()}-${name.replace(/[^a-zA-Z0-9._-]/g,'-')}`;

async function loadAbout() {
  const { data, error } = await db.from('site_content').select('*').eq('id', 1).maybeSingle();
  if (error) { console.warn('About content unavailable:', error.message); return; }
  if (!data) return;
  if ($('about-name')) $('about-name').textContent = data.name || 'Jimson';
  if ($('about-bio')) $('about-bio').textContent = data.bio || '';
  if ($('about-interest')) $('about-interest').textContent = data.interest || '';
  if ($('about-current')) $('about-current').textContent = data.current || '';
  if ($('about-website')) $('about-website').textContent = data.website || '';
  setProfileImages(data.profile_image_url || '');
}

function setProfileImages(url) {
  const heroImg = $('hero-profile-image');
  const heroPlaceholder = $('hero-profile')?.querySelector('.initial');
  if (heroImg) { heroImg.src = url || ''; heroImg.style.display = url ? 'block' : 'none'; }
  if (heroPlaceholder) heroPlaceholder.style.display = url ? 'none' : 'block';
  const aboutImg = $('about-profile-image');
  const aboutPlaceholder = $('about-photo-placeholder');
  if (aboutImg) { aboutImg.src = url || ''; aboutImg.style.display = url ? 'block' : 'none'; }
  if (aboutPlaceholder) aboutPlaceholder.style.display = url ? 'none' : 'grid';
}

async function loadProjects() {
  const box = $('project-list'); if (!box) return;
  const { data, error } = await db.from('projects').select('*').order('created_at', { ascending:false });
  if (error) { box.innerHTML = '<p class="muted">项目暂时无法加载。</p>'; console.error(error); return; }
  if (!data.length) { box.innerHTML = '<p class="muted">目前还没有项目，可以从 Admin 后台新增。</p>'; return; }
  box.innerHTML = data.map(p => `
    <button class="project-card card" type="button" data-project-id="${escapeHtml(p.id)}">
      ${p.image_url ? `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.title)}" loading="lazy">` : '<div class="project-no-image">PROJECT</div>'}
      <div class="card-body">
        <p class="tag">${escapeHtml(p.category || 'Project')}</p>
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(p.description || '')}</p>
        ${p.content ? '<span class="read-more">阅读文章 →</span>' : ''}
      </div>
    </button>`).join('');
  box.querySelectorAll('.project-card').forEach(btn => {
    const project = data.find(p => String(p.id) === btn.dataset.projectId);
    btn.addEventListener('click', () => openProject(project));
  });
}

function openProject(project) {
  if (!project) return;
  const modal = $('projectModal'), content = $('projectModalContent');
  if (!modal || !content) return;
  content.innerHTML = `
    <div class="modal-head">
      <p class="eyebrow">PROJECT · ${escapeHtml(project.category || 'PROJECT')}</p>
      <h2>${escapeHtml(project.title)}</h2>
      ${project.description ? `<p class="project-modal-intro">${escapeHtml(project.description)}</p>` : ''}
    </div>
    ${project.image_url ? `<img class="project-modal-image" src="${escapeHtml(project.image_url)}" alt="${escapeHtml(project.title)}">` : ''}
    ${project.content ? `<article class="project-article">${escapeHtml(project.content)}</article>` : '<div class="empty">这个项目还没有文章内容。</div>'}
  `;
  modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); document.body.classList.add('modal-open');
}

function closeProject() { const modal=$('projectModal'); if (!modal) return; modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); document.body.classList.remove('modal-open'); }

async function loadGallery() {
  const box = $('gallery-list'); if (!box) return;
  const { data: albums, error } = await db.from('gallery_albums').select('*').order('created_at', { ascending:false });
  if (error) { box.innerHTML = '<p class="muted">相册暂时无法加载。请检查 Supabase 的 Gallery 表权限。</p>'; console.error(error); return; }
  if (!albums?.length) { box.innerHTML = '<p class="muted">目前还没有相册，可以从 Admin 后台创建。</p>'; return; }
  const { data: photos, error: pError } = await db.from('gallery_photos').select('*').order('created_at', { ascending:true });
  if (pError) { box.innerHTML = '<p class="muted">照片暂时无法加载。</p>'; console.error(pError); return; }
  const byAlbum = {};
  (photos || []).forEach(p => (byAlbum[p.album_id] ||= []).push(p));
  box.innerHTML = albums.map(a => {
    const list = byAlbum[a.id] || [];
    const cover = list[0] ? publicUrl(list[0].image_path) : '';
    return `<button class="album-card" type="button" data-album-id="${escapeHtml(a.id)}"><div class="album-cover">${cover ? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(a.title)}" loading="lazy">` : '<div class="album-placeholder">NO PHOTO</div>'}<span class="album-count">${list.length} 张</span></div><div class="album-info"><h3>${escapeHtml(a.title)}</h3><p>${escapeHtml(a.description || '打开相册查看照片')}</p></div></button>`;
  }).join('');
  box.querySelectorAll('.album-card').forEach(btn => btn.addEventListener('click', () => openAlbum(btn.dataset.albumId, albums, byAlbum)));
}

function openAlbum(albumId, albums, byAlbum) {
  const album = albums.find(a => a.id === albumId); if (!album) return;
  const photos = byAlbum[albumId] || [];
  const modal = $('albumModal'), content = $('modalContent');
  content.innerHTML = `<div class="modal-head"><p class="eyebrow">GALLERY</p><h2>${escapeHtml(album.title)}</h2><p class="muted">${escapeHtml(album.description || '')}</p></div>${photos.length ? `<div class="modal-gallery">${photos.map(p => `<figure><img src="${escapeHtml(publicUrl(p.image_path))}" alt="${escapeHtml(p.caption || album.title)}" loading="lazy">${p.caption ? `<figcaption>${escapeHtml(p.caption)}</figcaption>` : ''}</figure>`).join('')}</div>` : '<div class="empty">这个相册目前还没有照片。</div>'}`;
  modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); document.body.classList.add('modal-open');
}
function closeAlbum() { const modal=$('albumModal'); if (!modal) return; modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); document.body.classList.remove('modal-open'); }

async function initPublic() {
  await Promise.all([loadAbout(), loadProjects(), loadGallery()]);
  if ($('closeModal')) $('closeModal').addEventListener('click', closeAlbum);
  if ($('albumModal')) $('albumModal').addEventListener('click', e => { if (e.target === $('albumModal')) closeAlbum(); });
  if ($('closeProjectModal')) $('closeProjectModal').addEventListener('click', closeProject);
  if ($('projectModal')) $('projectModal').addEventListener('click', e => { if (e.target === $('projectModal')) closeProject(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeAlbum(); closeProject(); } });
}

async function initAdmin() {
  const loginBox = $('login'); if (!loginBox) return;
  const { data:{ session } } = await db.auth.getSession();
  if (session) showDashboard(session.user); else showLogin();
  $('loginBtn').addEventListener('click', login);
  $('logoutBtn').addEventListener('click', logout);
  $('saveAboutBtn').addEventListener('click', saveAbout);
  $('profilePhoto')?.addEventListener('change', () => {
    const file=$('profilePhoto').files?.[0];
    if(file){ const reader=new FileReader(); reader.onload=()=>updateProfilePreview(reader.result); reader.readAsDataURL(file); }
  });
  $('removeProfilePhotoBtn')?.addEventListener('click', removeProfilePhoto);
  $('addProjectBtn').addEventListener('click', addProject);
  $('createAlbumBtn').addEventListener('click', createAlbum);
  $('uploadAlbumPhotosBtn').addEventListener('click', uploadAlbumPhotos);
  db.auth.onAuthStateChange((_event, session) => { if (session) showDashboard(session.user); else showLogin(); });
}
function showLogin() { $('login').style.display='block'; $('dashboard').style.display='none'; }
async function showDashboard(user) { $('login').style.display='none'; $('dashboard').style.display='block'; if ($('loginMsg')) $('loginMsg').textContent = `已登录：${user.email}`; await Promise.all([loadAboutAdmin(), renderAdmin(), loadAlbumSelect()]); }
async function login() { const email=$('email').value.trim(), password=$('password').value; if(!email||!password){$('loginMsg').textContent='请输入 Email 和密码。';return;} $('loginMsg').textContent='登录中……'; const {error}=await db.auth.signInWithPassword({email,password}); $('loginMsg').textContent=error?`登录失败：${error.message}`:'登录成功'; }
async function logout(){await db.auth.signOut();location.reload();}

let currentProfilePath = '';

function updateProfilePreview(url) {
  const img = $('profilePreview');
  const placeholder = $('profilePreviewPlaceholder');
  if (img) { img.src = url || ''; img.style.display = url ? 'block' : 'none'; }
  if (placeholder) placeholder.style.display = url ? 'none' : 'grid';
}

async function loadAboutAdmin(){
  const {data,error}=await db.from('site_content').select('*').eq('id',1).maybeSingle();
  if(error){$('aboutMsg').textContent='读取关于我失败：'+error.message;return;}
  if(!data)return;
  $('aboutName').value=data.name||'';
  $('aboutBio').value=data.bio||'';
  $('aboutInterest').value=data.interest||'';
  $('aboutCurrent').value=data.current||'';
  $('aboutWebsite').value=data.website||'';
  currentProfilePath=data.profile_image_path||'';
  updateProfilePreview(data.profile_image_url||'');
}

async function uploadProfileImage(file){
  if(!file)return null;
  if(!file.type.startsWith('image/')) throw new Error('个人照片只能是图片。');
  const path=filePath(file.name,'profile');
  const {error}=await db.storage.from('gallery').upload(path,file,{contentType:file.type,upsert:false});
  if(error)throw error;
  return {url:publicUrl(path),path};
}

async function saveAbout(){
  const file=$('profilePhoto')?.files?.[0];
  const payload={id:1,name:$('aboutName').value.trim()||'Jimson',bio:$('aboutBio').value.trim(),interest:$('aboutInterest').value.trim(),current:$('aboutCurrent').value.trim(),website:$('aboutWebsite').value.trim()||'Jimson的网'};
  $('aboutMsg').textContent='保存中……';
  let newImage=null;
  try{
    if(file) newImage=await uploadProfileImage(file);
    if(newImage){ payload.profile_image_url=newImage.url; payload.profile_image_path=newImage.path; }
    else { payload.profile_image_url=$('profilePreview')?.src || ''; payload.profile_image_path=currentProfilePath || ''; }
    const {error}=await db.from('site_content').upsert(payload,{onConflict:'id'});
    if(error){ if(newImage?.path) await db.storage.from('gallery').remove([newImage.path]); throw error; }
    if(newImage && currentProfilePath && currentProfilePath!==newImage.path){ await db.storage.from('gallery').remove([currentProfilePath]); }
    currentProfilePath=newImage?.path || currentProfilePath;
    if($('profilePhoto')) $('profilePhoto').value='';
    updateProfilePreview(payload.profile_image_url||'');
    $('aboutMsg').textContent='保存成功！';
  }catch(e){ $('aboutMsg').textContent='保存失败：'+e.message; }
}

async function removeProfilePhoto(){
  $('aboutMsg').textContent='处理中……';
  try{
    const {error}=await db.from('site_content').update({profile_image_url:null,profile_image_path:null}).eq('id',1);
    if(error)throw error;
    if(currentProfilePath) await db.storage.from('gallery').remove([currentProfilePath]);
    currentProfilePath='';
    if($('profilePhoto')) $('profilePhoto').value='';
    updateProfilePreview('');
    $('aboutMsg').textContent='已恢复默认头像。';
  }catch(e){ $('aboutMsg').textContent='操作失败：'+e.message; }
}

async function uploadProjectImage(file){ if(!file)return {url:null,path:null}; if(!file.type.startsWith('image/')) throw new Error('项目照片只能是图片。'); const path=filePath(file.name,'projects'); const {error}=await db.storage.from('gallery').upload(path,file,{contentType:file.type,upsert:false}); if(error)throw error; return {url:publicUrl(path),path}; }
async function addProject(){ const title=$('pt').value.trim(),category=$('ptag').value.trim()||'Project',description=$('pd').value.trim(),content=$('pc').value.trim(),file=$('projectPhoto').files[0]; if(!title)return alert('请先填写项目标题。'); $('projectMsg').textContent='发布中……'; try{const image=await uploadProjectImage(file); const {error}=await db.from('projects').insert({title,category,description,content,image_url:image.url,image_path:image.path}); if(error){if(image.path)await db.storage.from('gallery').remove([image.path]);throw error;} $('pt').value='';$('ptag').value='';$('pd').value='';$('pc').value='';$('projectPhoto').value='';$('projectMsg').textContent='项目发布成功！';await renderAdmin();}catch(e){$('projectMsg').textContent='发布失败：'+e.message;} }

async function editProject(id, oldTitle, oldCategory, oldDescription, oldContent){
  const title=prompt('项目标题：',oldTitle); if(title===null)return;
  const category=prompt('分类：',oldCategory||'Project'); if(category===null)return;
  const description=prompt('项目简介：',oldDescription||''); if(description===null)return;
  const content=prompt('项目文章内容：\n（可以写多段文字）',oldContent||''); if(content===null)return;
  const fileInput=document.createElement('input'); fileInput.type='file'; fileInput.accept='image/*';
  const wantImage=confirm('要更换项目照片吗？\n点击「确定」选择新照片；点击「取消」保留原照片。');
  let image=null;
  if(wantImage){ fileInput.click(); await new Promise(resolve=>{fileInput.onchange=resolve;}); if(fileInput.files[0])image=await uploadProjectImage(fileInput.files[0]); }
  const payload={title:title.trim(),category:category.trim()||'Project',description:description.trim(),content:content.trim()};
  if(image){payload.image_url=image.url;payload.image_path=image.path;}
  const {error}=await db.from('projects').update(payload).eq('id',id);
  if(error){if(image?.path)await db.storage.from('gallery').remove([image.path]);alert('修改失败：'+error.message);return;}
  await renderAdmin();
}
async function deleteProject(id,path){ if(!confirm('确定删除这个项目吗？'))return; const {error}=await db.from('projects').delete().eq('id',id);if(error){alert('删除失败：'+error.message);return;}if(path)await db.storage.from('gallery').remove([path]);await renderAdmin(); }

async function createAlbum(){const title=$('albumTitle').value.trim(),description=$('albumDescription').value.trim();if(!title)return alert('请先填写相册名称。');$('albumMsg').textContent='创建中……';const {data,error}=await db.from('gallery_albums').insert({title,description}).select().single();if(error){$('albumMsg').textContent='创建失败：'+error.message;return;}$('albumTitle').value='';$('albumDescription').value='';$('albumMsg').textContent='相册创建成功！';await loadAlbumSelect();await renderAdmin();if(data)$('albumSelect').value=data.id;}
async function loadAlbumSelect(){const select=$('albumSelect');if(!select)return;const {data,error}=await db.from('gallery_albums').select('id,title').order('created_at',{ascending:false});if(error){select.innerHTML='<option value="">无法读取相册</option>';return;}select.innerHTML='<option value="">请选择相册</option>'+(data||[]).map(a=>`<option value="${escapeHtml(a.id)}">${escapeHtml(a.title)}</option>`).join('');}
async function uploadAlbumPhotos(){const albumId=$('albumSelect').value,files=Array.from($('albumPhotos').files||[]),caption=$('photoCaption').value.trim();if(!albumId)return alert('请先选择相册。');if(!files.length)return alert('请选择至少一张图片。');$('photoMsg').textContent=`准备上传 ${files.length} 张……`;let success=0;for(const file of files){try{if(!file.type.startsWith('image/'))throw new Error('只能上传图片');const path=filePath(file.name,`albums/${albumId}`);const {error:uploadError}=await db.storage.from('gallery').upload(path,file,{contentType:file.type,upsert:false});if(uploadError)throw uploadError;const {error:dbError}=await db.from('gallery_photos').insert({album_id:albumId,image_path:path,caption});if(dbError){await db.storage.from('gallery').remove([path]);throw dbError;}success++;$('photoMsg').textContent=`已上传 ${success}/${files.length} 张……`;}catch(e){console.error(e);}}$('albumPhotos').value='';$('photoCaption').value='';$('photoMsg').textContent=`上传完成：${success}/${files.length} 张成功。`;await renderAdmin();}
async function deleteAlbum(id){if(!confirm('确定删除这个相册吗？相册里的照片记录也会被删除。'))return;const {data:photos}=await db.from('gallery_photos').select('image_path').eq('album_id',id);const {error}=await db.from('gallery_albums').delete().eq('id',id);if(error){alert('删除失败：'+error.message);return;}if(photos?.length)await db.storage.from('gallery').remove(photos.map(p=>p.image_path));await Promise.all([loadAlbumSelect(),renderAdmin()]);}
async function deleteAlbumPhoto(id,path){if(!confirm('确定删除这张照片吗？'))return;const {error}=await db.from('gallery_photos').delete().eq('id',id);if(error){alert('删除失败：'+error.message);return;}if(path)await db.storage.from('gallery').remove([path]);await renderAdmin();}

async function renderAdmin(){
  const {data:projects,error:pErr}=await db.from('projects').select('*').order('created_at',{ascending:false});
  $('items').innerHTML=pErr?`<p class="status">${escapeHtml(pErr.message)}</p>`:projects.length?projects.map(p=>`<div class="admin-row"><div class="admin-row-main">${p.image_url?`<img class="admin-thumb" src="${escapeHtml(p.image_url)}" alt="">`:''}<div><strong>${escapeHtml(p.title)}</strong><span>${escapeHtml(p.category||'Project')}</span><p>${escapeHtml(p.description||'')}</p>${p.content?'<small class="article-indicator">有文章内容 · 可点击编辑</small>':''}</div></div><div class="row-actions"><button class="btn" onclick='editProject(${p.id},${JSON.stringify(p.title)},${JSON.stringify(p.category||'')},${JSON.stringify(p.description||'')},${JSON.stringify(p.content||'')})'>编辑</button><button class="btn danger" onclick='deleteProject(${p.id},${JSON.stringify(p.image_path||'')})'>删除</button></div></div>`).join(''):'<p class="muted">暂无项目。</p>';
  const {data:albums,error:aErr}=await db.from('gallery_albums').select('*').order('created_at',{ascending:false});
  if(aErr){$('albumAdminItems').innerHTML=`<p class="status">${escapeHtml(aErr.message)}</p>`;return;}
  const {data:photos,error:fErr}=await db.from('gallery_photos').select('*').order('created_at',{ascending:true});
  if(fErr){$('albumAdminItems').innerHTML=`<p class="status">${escapeHtml(fErr.message)}</p>`;return;}
  const byAlbum={};(photos||[]).forEach(p=>(byAlbum[p.album_id]||=[]).push(p));
  $('albumAdminItems').innerHTML=albums?.length?albums.map(a=>{const list=byAlbum[a.id]||[];return `<div class="album-admin"><div class="album-admin-head"><div><h4>${escapeHtml(a.title)}</h4><p>${escapeHtml(a.description||'')} · ${list.length} 张照片</p></div><div class="row-actions"><button class="btn" onclick='selectAlbumForUpload(${JSON.stringify(a.id)})'>上传照片</button><button class="btn danger" onclick='deleteAlbum(${JSON.stringify(a.id)})'>删除相册</button></div></div><div class="admin-photo-grid">${list.length?list.map(p=>`<div class="admin-photo"><img src="${escapeHtml(publicUrl(p.image_path))}" alt=""><div><small>${escapeHtml(p.caption||'无说明')}</small><button class="btn danger" onclick='deleteAlbumPhoto(${JSON.stringify(p.id)},${JSON.stringify(p.image_path)})'>删除照片</button></div></div>`).join(''):'<p class="muted">这个相册还没有照片。</p>'}</div></div>`;}).join(''):'<p class="muted">暂无相册。</p>';
}
function selectAlbumForUpload(id){$('albumSelect').value=id;window.scrollTo({top:$('albumSelect').getBoundingClientRect().top+window.scrollY-120,behavior:'smooth'});}

if($('project-list')||$('gallery-list'))initPublic();
if($('login'))initAdmin();
