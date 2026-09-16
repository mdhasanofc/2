const SUPABASE_URL='https://adfiezsjxmhybjhghvws.supabase.co';
const SUPABASE_KEY='sb_publishable_ybfoZqj2972Of9WX0TSW0g_Y07Z_IyD';
const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=(s)=>document.querySelector(s), $$=(s)=>[...document.querySelectorAll(s)];
let currentUser=null,cameras=[],favorites=new Set(),activeFilter='all',currentCamera=null,pendingAuthMode='signup';

const authModal=$('#authModal'),playerModal=$('#playerModal'),ageModal=$('#ageModal');
function openModal(m){if(m)m.classList.add('show')}
function closeModal(m){if(m)m.classList.remove('show')}
function setMsg(id,text,type=''){const el=$(id);if(!el)return;el.textContent=text;el.className='msg '+type}
function setAuthTab(mode){
  $$('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===mode));
  $('#signupForm').classList.toggle('hidden',mode!=='signup');
  $('#loginForm').classList.toggle('hidden',mode!=='login');
  $('#authTitle').textContent=mode==='signup'?'Create your 18+ account':'Welcome back';
  $('#authSub').textContent=mode==='signup'?'Sign up with email, confirm age eligibility, then verify your inbox.':'Log in with your verified account.';
  setMsg('#signupMsg','');setMsg('#loginMsg','');
}
function showAuth(mode='signup'){
  pendingAuthMode=mode;
  if(!localStorage.getItem('livelens_age_ok')){openModal(ageModal);return;}
  setAuthTab(mode);openModal(authModal);
}

async function loadProfile(){
  if(!currentUser)return;
  const {data}=await supabaseClient.from('profiles').select('full_name,age_confirmed').eq('id',currentUser.id).single();
  const name=data?.full_name||currentUser.user_metadata?.full_name||'Member';
  $('#profileName').textContent=name;
  $('#profileEmail').textContent=currentUser.email||'';
  $('#navName').textContent=name.split(' ')[0];
  $('#verifyState').textContent=data?.age_confirmed?'18+ confirmed • Secure account session active.':'Secure account session active.';
}

async function loadFavorites(){
  favorites.clear();if(!currentUser)return;
  const {data,error}=await supabaseClient.from('favorites').select('camera_id').eq('user_id',currentUser.id);
  if(!error)(data||[]).forEach(r=>favorites.add(String(r.camera_id)));
  $('#savedCount').textContent=favorites.size;
}

async function loadCameras(){
  if(!currentUser){cameras=[];renderCameras();return;}
  const {data,error}=await supabaseClient.from('live_cameras').select('id,title,performer_name,location,category,stream_type,stream_url,thumbnail_url,sort_order,is_verified,is_live,is_featured,viewer_count').eq('is_active',true).order('sort_order');
  if(error){$('#camGrid').innerHTML='<div class="empty">Could not load creator channels. Please try again.</div>';return;}
  cameras=data||[];renderCameras();
}

function renderCameras(){
  if(!currentUser){$('#camGrid').innerHTML='<div class="empty">Create an account or log in to view creator channels.</div>';return;}
  const q=$('#search').value.trim().toLowerCase();
  const list=cameras.filter(c=>{
    const text=((c.performer_name||c.title||'')+' '+(c.location||'')).toLowerCase();
    const matches=!q||text.includes(q);
    const filter=activeFilter==='all'||(activeFilter==='favorites'&&favorites.has(String(c.id)));
    return matches&&filter;
  });
  $('#camGrid').innerHTML=list.length?list.map(c=>{
    const live=Boolean(c.is_live&&c.stream_url);
    return `<article class="card"><div class="thumb"><img src="${c.thumbnail_url||''}" alt="${c.performer_name||c.title}" loading="lazy"><span class="${live?'live':'offline'} badge">${live?'<i></i> LIVE':'OFFLINE'}</span><button class="fav ${favorites.has(String(c.id))?'active':''}" data-fav="${c.id}" aria-label="Save creator">${favorites.has(String(c.id))?'♥':'♡'}</button></div><div class="card-body"><h3>${c.performer_name||c.title}</h3>${c.is_verified?'<span class="verified">✓ Verified creator</span>':''}<p>${c.location||'Creator profile'}</p><button class="btn primary full" data-watch="${c.id}">${live?'Watch live':'View channel'}</button></div></article>`;
  }).join(''):'<div class="empty">No creator channels found.</div>';
  $$('[data-watch]').forEach(b=>b.onclick=()=>openCamera(b.dataset.watch));
  $$('[data-fav]').forEach(b=>b.onclick=()=>toggleFavorite(b.dataset.fav));
}

function openCamera(id){
  if(!currentUser)return showAuth('login');
  const cam=cameras.find(c=>String(c.id)===String(id));if(!cam)return;
  currentCamera=cam;
  $('#playerTitle').textContent=cam.performer_name||cam.title;
  $('#playerLocation').textContent=cam.location||'Verified creator channel';
  if(!(cam.is_live&&cam.stream_url)){alert('This creator is currently offline.');return;}
  $('#playerFrame').src=cam.stream_type==='youtube'?`https://www.youtube-nocookie.com/embed/${cam.stream_url}?autoplay=1&mute=1&rel=0`:cam.stream_url;
  openModal(playerModal);
}

async function toggleFavorite(id){
  if(!currentUser)return showAuth('login');
  if(favorites.has(String(id))){
    await supabaseClient.from('favorites').delete().eq('user_id',currentUser.id).eq('camera_id',id);
    favorites.delete(String(id));
  }else{
    const {error}=await supabaseClient.from('favorites').insert({user_id:currentUser.id,camera_id:Number(id)});
    if(!error)favorites.add(String(id));
  }
  $('#savedCount').textContent=favorites.size;renderCameras();
}

async function refreshAuthUI(){
  const {data:{user}}=await supabaseClient.auth.getUser();currentUser=user||null;
  const signed=!!currentUser;
  $('#guestActions').classList.toggle('hidden',signed);
  $('#userActions').classList.toggle('hidden',!signed);
  $('#accountSection').classList.toggle('hidden',!signed);
  $('#startBtn').textContent=signed?'Open creator channels':'Create 18+ account';
  $('#browseBtn').textContent=signed?'Browse creators':'Log in to browse';
  $('#authNotice').className='status '+(signed?'ok':'warn');
  $('#authNotice').textContent=signed?'Secure account session active.':'18+ confirmation and email verification are required.';
  if(signed){await loadProfile();await loadFavorites();await loadCameras();}
  else{favorites.clear();cameras=[];renderCameras();}
}

$('#signupForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const name=$('#signupName').value.trim(),email=$('#signupEmail').value.trim(),password=$('#signupPassword').value;
  if(!$('#signupAge').checked)return setMsg('#signupMsg','You must confirm that you meet the age requirement.','error');
  setMsg('#signupMsg','Creating account...');
  const redirect=location.origin+location.pathname;
  const {data,error}=await supabaseClient.auth.signUp({email,password,options:{data:{full_name:name,age_confirmed:true},emailRedirectTo:redirect}});
  if(error)return setMsg('#signupMsg',error.message,'error');
  localStorage.setItem('livelens_age_ok','1');
  if(data.session){
    setMsg('#signupMsg','Account created and signed in.','success');
    setTimeout(async()=>{closeModal(authModal);await refreshAuthUI();},450);
  }else{
    setMsg('#signupMsg','Account created. Check your email and click the verification link, then log in.','success');
  }
});

$('#loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const email=$('#loginEmail').value.trim(),password=$('#loginPassword').value;
  setMsg('#loginMsg','Signing in...');
  const {error}=await supabaseClient.auth.signInWithPassword({email,password});
  if(error)return setMsg('#loginMsg',error.message,'error');
  localStorage.setItem('livelens_age_ok','1');
  setMsg('#loginMsg','Login successful.','success');
  setTimeout(async()=>{closeModal(authModal);await refreshAuthUI();$('#cams').scrollIntoView({behavior:'smooth'});},350);
});

$('#resetBtn').onclick=async()=>{
  const email=$('#loginEmail').value.trim();
  if(!email)return setMsg('#loginMsg','Enter your email first.','error');
  const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
  setMsg('#loginMsg',error?error.message:'Password reset email sent.',error?'error':'success');
};
$('#logoutBtn').onclick=async()=>{await supabaseClient.auth.signOut();await refreshAuthUI();window.scrollTo({top:0,behavior:'smooth'});};
$('#startBtn').onclick=()=>currentUser?$('#cams').scrollIntoView({behavior:'smooth'}):showAuth('signup');
$('#browseBtn').onclick=()=>currentUser?$('#cams').scrollIntoView({behavior:'smooth'}):showAuth('login');
$('#previewPlay').onclick=()=>currentUser?$('#cams').scrollIntoView({behavior:'smooth'}):showAuth('signup');
$('#accountBtn').onclick=()=>$('#accountSection').scrollIntoView({behavior:'smooth'});
$('#search').addEventListener('input',renderCameras);
$('#reportBtn').onclick=()=>{if(currentCamera)alert(`Report noted for ${currentCamera.performer_name||currentCamera.title}.`);};
$('#ageAccept').onclick=()=>{localStorage.setItem('livelens_age_ok','1');closeModal(ageModal);setAuthTab(pendingAuthMode);openModal(authModal);};
$('#ageExit').onclick=()=>{location.href='https://www.google.com';};
$$('[data-auth]').forEach(b=>b.onclick=()=>showAuth(b.dataset.auth));
$$('[data-tab]').forEach(b=>b.onclick=()=>setAuthTab(b.dataset.tab));
$$('[data-close="auth"]').forEach(b=>b.onclick=()=>closeModal(authModal));
$$('[data-close="player"]').forEach(b=>b.onclick=()=>{closeModal(playerModal);$('#playerFrame').src='';});
$$('.filter').forEach(b=>b.onclick=()=>{activeFilter=b.dataset.filter;$$('.filter').forEach(x=>x.classList.toggle('active',x===b));renderCameras();});
[authModal,playerModal].forEach(m=>m.addEventListener('click',e=>{if(e.target===m){closeModal(m);if(m===playerModal)$('#playerFrame').src='';}}));
supabaseClient.auth.onAuthStateChange(()=>setTimeout(refreshAuthUI,0));
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
if(!localStorage.getItem('livelens_age_ok')){pendingAuthMode='signup';openModal(ageModal);}
refreshAuthUI();