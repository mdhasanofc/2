const SUPABASE_URL='https://adfiezsjxmhybjhghvws.supabase.co';
const SUPABASE_KEY='sb_publishable_ybfoZqj2972Of9WX0TSW0g_Y07Z_IyD';
const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=(s)=>document.querySelector(s), $$=(s)=>[...document.querySelectorAll(s)];
const authModal=$('#authModal'),studioModal=$('#studioModal'),videoModal=$('#videoModal'),liveModal=$('#liveModal');
let currentUser=null,currentProfileName='Creator',videos=[],liveRooms=[];
let activeVideoBlobUrl=null;
let hostStream=null,hostRoom=null,hostChannel=null,hostPeers=new Map();
let viewerChannel=null,viewerPeer=null,viewerId=null;
const ICE_CONFIG={iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]};

function openModal(m){if(m)m.classList.add('show')}
function closeModal(m){if(m)m.classList.remove('show')}
function setMsg(sel,text,type=''){const el=$(sel);if(!el)return;el.textContent=text;el.className='msg '+type}
function safe(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function setAuthTab(mode){
  $$('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===mode));
  $('#signupForm').classList.toggle('hidden',mode!=='signup');
  $('#loginForm').classList.toggle('hidden',mode!=='login');
  $('#authTitle').textContent=mode==='signup'?'Create your account':'Welcome back';
  $('#authSub').textContent=mode==='signup'?'Sign up with email and verify your inbox.':'Log in with your account.';
  setMsg('#signupMsg','');setMsg('#loginMsg','');
}
function showAuth(mode='signup'){setAuthTab(mode);openModal(authModal)}

async function loadProfile(){
  if(!currentUser)return;
  const {data}=await supabaseClient.from('profiles').select('full_name').eq('id',currentUser.id).single();
  currentProfileName=data?.full_name||currentUser.user_metadata?.full_name||'Creator';
  $('#profileName').textContent=currentProfileName;
  $('#profileEmail').textContent=currentUser.email||'';
  $('#navName').textContent=currentProfileName.split(' ')[0]||'Creator';
}

function videoUrl(path){
  const encoded=String(path||'').split('/').map(encodeURIComponent).join('/');
  return `${SUPABASE_URL}/storage/v1/object/public/videos/${encoded}`;
}

async function loadVideos(){
  const {data,error}=await supabaseClient.from('videos').select('id,user_id,creator_name,title,description,storage_path,mime_type,size_bytes,created_at').eq('is_published',true).order('created_at',{ascending:false}).limit(30);
  if(error){$('#videoGrid').innerHTML='<div class="empty">Could not load videos.</div>';return;}
  videos=data||[];
  renderVideos();
  if(currentUser)$('#myVideoCount').textContent=videos.filter(v=>v.user_id===currentUser.id).length;
}

function renderVideos(){
  const el=$('#videoGrid');
  if(!videos.length){el.innerHTML='<div class="empty">No videos uploaded yet.</div>';return;}
  el.innerHTML=videos.map(v=>{
    const url=videoUrl(v.storage_path);
    return `<article class="card"><div class="thumb"><video src="${safe(url)}#t=0.1" preload="metadata" muted playsinline></video></div><div class="card-body"><div class="creator">${safe(v.creator_name)}</div><h3>${safe(v.title)}</h3><p>${safe((v.description||'').slice(0,140))}</p><button class="btn primary full" data-play-video="${safe(v.id)}">Watch video</button></div></article>`;
  }).join('');
  $$('[data-play-video]').forEach(b=>b.onclick=()=>openUploadedVideo(b.dataset.playVideo));
}

function resetVideoPlayer(){
  const player=$('#videoPlayer');
  if(!player)return;
  try{player.pause()}catch{}
  player.onerror=null;
  player.onloadedmetadata=null;
  player.oncanplay=null;
  player.removeAttribute('src');
  player.innerHTML='';
  player.dataset.fallbackTried='0';
  player.load();
  if(activeVideoBlobUrl){URL.revokeObjectURL(activeVideoBlobUrl);activeVideoBlobUrl=null;}
  setMsg('#videoStatus','');
}

function attachPlayerSource(v,src){
  const player=$('#videoPlayer');
  player.innerHTML='';
  const source=document.createElement('source');
  source.src=src;
  source.type=v.mime_type||'video/mp4';
  player.appendChild(source);
  player.load();
}

async function blobPlaybackFallback(v,publicUrl){
  const player=$('#videoPlayer');
  try{
    setMsg('#videoStatus','Direct playback failed. Retrying video…','');
    const response=await fetch(publicUrl,{cache:'no-store'});
    if(!response.ok)throw new Error(`Video server returned ${response.status}`);
    const blob=await response.blob();
    if(activeVideoBlobUrl)URL.revokeObjectURL(activeVideoBlobUrl);
    activeVideoBlobUrl=URL.createObjectURL(blob);
    attachPlayerSource(v,activeVideoBlobUrl);
    player.play().catch(()=>{});
  }catch(err){
    setMsg('#videoStatus',`${err.message||'Video could not be loaded.'} Use “Open original video” below.`,'error');
  }
}

function openUploadedVideo(id){
  const v=videos.find(x=>String(x.id)===String(id));
  if(!v)return;
  resetVideoPlayer();
  const publicUrl=videoUrl(v.storage_path);
  const player=$('#videoPlayer');
  $('#videoTitle').textContent=v.title;
  $('#videoCreator').textContent='By '+v.creator_name;
  $('#openOriginalVideo').href=publicUrl;
  setMsg('#videoStatus','Loading video…');
  player.onloadedmetadata=()=>setMsg('#videoStatus','Video ready.','success');
  player.oncanplay=()=>setMsg('#videoStatus','Video ready.','success');
  player.onerror=async()=>{
    if(player.dataset.fallbackTried==='1'){
      setMsg('#videoStatus','This browser cannot play this video. It may use an unsupported codec. Try “Open original video”.','error');
      return;
    }
    player.dataset.fallbackTried='1';
    await blobPlaybackFallback(v,publicUrl);
  };
  attachPlayerSource(v,publicUrl);
  openModal(videoModal);
  player.play().catch(()=>setMsg('#videoStatus','Video ready. Press Play to start.','success'));
}

async function loadLiveRooms(){
  const {data,error}=await supabaseClient.from('live_rooms').select('id,user_id,creator_name,title,is_live,started_at').eq('is_live',true).order('started_at',{ascending:false});
  if(error){$('#liveGrid').innerHTML='<div class="empty">Could not load live streams.</div>';return;}
  liveRooms=data||[];renderLiveRooms();
}
function renderLiveRooms(){
  const el=$('#liveGrid');
  if(!liveRooms.length){el.innerHTML='<div class="empty">No live streams right now. Be the first to go live.</div>';return;}
  el.innerHTML=liveRooms.map(r=>`<article class="card"><div class="thumb"><div style="text-align:center"><span class="live">● LIVE</span><div style="font-size:42px;margin-top:20px">◉</div></div></div><div class="card-body"><div class="creator">${safe(r.creator_name)}</div><h3>${safe(r.title)}</h3><p>Browser live stream</p><button class="btn livebtn full" data-watch-live="${safe(r.id)}">Watch live</button></div></article>`).join('');
  $$('[data-watch-live]').forEach(b=>b.onclick=()=>watchLive(b.dataset.watchLive));
}

async function refreshAuthUI(){
  const {data:{user}}=await supabaseClient.auth.getUser();currentUser=user||null;
  const signed=!!currentUser;
  $('#guestActions').classList.toggle('hidden',signed);
  $('#userActions').classList.toggle('hidden',!signed);
  $('#accountSection').classList.toggle('hidden',!signed);
  $('#startBtn').textContent=signed?'Open Creator Studio':'Create free account';
  $('#authNotice').className='status '+(signed?'ok':'warn');
  $('#authNotice').textContent=signed?'Creator tools are ready. Upload a video or go live.':'Sign in to upload videos or start a live stream.';
  if(signed)await loadProfile();
  await Promise.all([loadVideos(),loadLiveRooms()]);
}

async function uploadVideo(){
  if(!currentUser)return showAuth('login');
  const file=$('#videoFile').files?.[0],title=$('#uploadTitle').value.trim(),description=$('#uploadDescription').value.trim();
  if(!title)return setMsg('#uploadMsg','Enter a video title.','error');
  if(!file)return setMsg('#uploadMsg','Choose a video file.','error');
  if(file.size>50*1024*1024)return setMsg('#uploadMsg','Video is larger than 50 MB.','error');
  if(!['video/mp4','video/webm','video/quicktime','video/x-m4v'].includes(file.type))return setMsg('#uploadMsg','Unsupported video type. Use MP4, WebM or MOV.','error');
  const ext=(file.name.split('.').pop()||'mp4').replace(/[^a-z0-9]/gi,'').toLowerCase();
  const path=`${currentUser.id}/${crypto.randomUUID()}.${ext}`;
  $('#uploadBtn').disabled=true;$('#uploadProgress').classList.remove('hidden');$('#uploadProgress span').style.width='35%';setMsg('#uploadMsg','Uploading video…');
  const {error:upErr}=await supabaseClient.storage.from('videos').upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false});
  if(upErr){$('#uploadBtn').disabled=false;$('#uploadProgress').classList.add('hidden');return setMsg('#uploadMsg',upErr.message,'error');}
  $('#uploadProgress span').style.width='75%';
  const {error:dbErr}=await supabaseClient.from('videos').insert({user_id:currentUser.id,creator_name:currentProfileName,title,description,storage_path:path,mime_type:file.type,size_bytes:file.size,is_published:true});
  if(dbErr){await supabaseClient.storage.from('videos').remove([path]);$('#uploadBtn').disabled=false;$('#uploadProgress').classList.add('hidden');return setMsg('#uploadMsg',dbErr.message,'error');}
  $('#uploadProgress span').style.width='100%';setMsg('#uploadMsg','Video published successfully.','success');
  $('#uploadTitle').value='';$('#uploadDescription').value='';$('#videoFile').value='';
  setTimeout(()=>$('#uploadProgress').classList.add('hidden'),800);$('#uploadBtn').disabled=false;await loadVideos();
}

async function sendBroadcast(channel,event,payload){return channel.send({type:'broadcast',event,payload})}
async function startLive(){
  if(!currentUser)return showAuth('login');if(hostStream)return;
  const title=$('#liveTitle').value.trim()||`${currentProfileName} is live`;
  $('#goLiveBtn').disabled=true;setMsg('#liveMsg','Requesting camera and microphone…');
  try{
    hostStream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720}},audio:true});
    $('#hostPreview').srcObject=hostStream;
    const {data,error}=await supabaseClient.from('live_rooms').upsert({user_id:currentUser.id,creator_name:currentProfileName,title,is_live:true,started_at:new Date().toISOString(),ended_at:null,updated_at:new Date().toISOString()},{onConflict:'user_id'}).select().single();
    if(error)throw error;hostRoom=data;
    hostChannel=supabaseClient.channel(`live:${hostRoom.id}`);
    hostChannel.on('broadcast',{event:'viewer-ready'},async({payload})=>{
      const vid=payload.viewerId;if(!vid||hostPeers.has(vid))return;
      const pc=new RTCPeerConnection(ICE_CONFIG);hostPeers.set(vid,pc);hostStream.getTracks().forEach(t=>pc.addTrack(t,hostStream));
      pc.onicecandidate=e=>{if(e.candidate)sendBroadcast(hostChannel,'ice',{target:vid,from:'host',candidate:e.candidate.toJSON()})};
      pc.onconnectionstatechange=()=>{if(['failed','closed','disconnected'].includes(pc.connectionState)){pc.close();hostPeers.delete(vid)}};
      const offer=await pc.createOffer();await pc.setLocalDescription(offer);await sendBroadcast(hostChannel,'offer',{target:vid,sdp:pc.localDescription});
    }).on('broadcast',{event:'answer'},async({payload})=>{const pc=hostPeers.get(payload.viewerId);if(pc&&payload.sdp)await pc.setRemoteDescription(payload.sdp)}).on('broadcast',{event:'ice'},async({payload})=>{if(payload.target!=='host')return;const pc=hostPeers.get(payload.viewerId);if(pc&&payload.candidate)try{await pc.addIceCandidate(payload.candidate)}catch{}}).subscribe(status=>{if(status==='SUBSCRIBED'){setMsg('#liveMsg','You are LIVE now. Keep this tab open.','success');$('#goLiveBtn').classList.add('hidden');$('#stopLiveBtn').classList.remove('hidden');loadLiveRooms()}});
  }catch(err){if(hostStream){hostStream.getTracks().forEach(t=>t.stop());hostStream=null}$('#hostPreview').srcObject=null;setMsg('#liveMsg',err.message||'Could not start live stream.','error');$('#goLiveBtn').disabled=false;}
}
async function stopLive(){
  if(hostRoom&&currentUser)await supabaseClient.from('live_rooms').update({is_live:false,ended_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('user_id',currentUser.id);
  hostPeers.forEach(pc=>pc.close());hostPeers.clear();
  if(hostChannel){await supabaseClient.removeChannel(hostChannel);hostChannel=null}
  if(hostStream){hostStream.getTracks().forEach(t=>t.stop());hostStream=null}
  hostRoom=null;$('#hostPreview').srcObject=null;$('#goLiveBtn').classList.remove('hidden');$('#goLiveBtn').disabled=false;$('#stopLiveBtn').classList.add('hidden');setMsg('#liveMsg','Live stream ended.');await loadLiveRooms();
}
async function cleanupViewer(){if(viewerPeer){viewerPeer.close();viewerPeer=null}if(viewerChannel){await supabaseClient.removeChannel(viewerChannel);viewerChannel=null}$('#remoteVideo').srcObject=null;viewerId=null}
async function watchLive(roomId){
  const room=liveRooms.find(r=>String(r.id)===String(roomId));if(!room)return;
  await cleanupViewer();$('#watchLiveTitle').textContent=room.title;$('#watchLiveCreator').textContent='Live with '+room.creator_name;setMsg('#watchLiveMsg','Connecting to live stream…');openModal(liveModal);
  viewerId=crypto.randomUUID();viewerPeer=new RTCPeerConnection(ICE_CONFIG);
  viewerPeer.ontrack=e=>{$('#remoteVideo').srcObject=e.streams[0];setMsg('#watchLiveMsg','Connected.','success')};
  viewerPeer.onicecandidate=e=>{if(e.candidate)sendBroadcast(viewerChannel,'ice',{target:'host',viewerId,candidate:e.candidate.toJSON()})};
  viewerPeer.onconnectionstatechange=()=>{if(viewerPeer&&['failed','disconnected'].includes(viewerPeer.connectionState))setMsg('#watchLiveMsg','Connection interrupted. Refresh and try again.','error')};
  viewerChannel=supabaseClient.channel(`live:${roomId}`);
  viewerChannel.on('broadcast',{event:'offer'},async({payload})=>{if(payload.target!==viewerId||!payload.sdp)return;await viewerPeer.setRemoteDescription(payload.sdp);const answer=await viewerPeer.createAnswer();await viewerPeer.setLocalDescription(answer);await sendBroadcast(viewerChannel,'answer',{viewerId,sdp:viewerPeer.localDescription})}).on('broadcast',{event:'ice'},async({payload})=>{if(payload.target!==viewerId||!payload.candidate)return;try{await viewerPeer.addIceCandidate(payload.candidate)}catch{}}).subscribe(async status=>{if(status==='SUBSCRIBED')await sendBroadcast(viewerChannel,'viewer-ready',{viewerId})});
}

$('#signupForm').addEventListener('submit',async e=>{e.preventDefault();const name=$('#signupName').value.trim(),email=$('#signupEmail').value.trim(),password=$('#signupPassword').value;if(name.length<2)return setMsg('#signupMsg','Enter your name.','error');if(password.length<8)return setMsg('#signupMsg','Password must be at least 8 characters.','error');setMsg('#signupMsg','Creating account…');const {data,error}=await supabaseClient.auth.signUp({email,password,options:{data:{full_name:name},emailRedirectTo:location.origin+location.pathname}});if(error)return setMsg('#signupMsg',error.message,'error');if(data.session){setMsg('#signupMsg','Account created and signed in.','success');setTimeout(async()=>{closeModal(authModal);await refreshAuthUI()},400)}else setMsg('#signupMsg','Account created. Check your email, verify it, then log in.','success')});
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();setMsg('#loginMsg','Signing in…');const {error}=await supabaseClient.auth.signInWithPassword({email:$('#loginEmail').value.trim(),password:$('#loginPassword').value});if(error)return setMsg('#loginMsg',error.message,'error');setMsg('#loginMsg','Login successful.','success');setTimeout(async()=>{closeModal(authModal);await refreshAuthUI()},300)});
$('#resetBtn').onclick=async()=>{const email=$('#loginEmail').value.trim();if(!email)return setMsg('#loginMsg','Enter your email first.','error');const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});setMsg('#loginMsg',error?error.message:'Password reset email sent.',error?'error':'success')};
$('#logoutBtn').onclick=async()=>{await stopLive();await supabaseClient.auth.signOut();await refreshAuthUI()};
$('#startBtn').onclick=()=>currentUser?openModal(studioModal):showAuth('signup');
$('#browseBtn').onclick=()=>$('#videosSection').scrollIntoView({behavior:'smooth'});
$('#previewPlay').onclick=()=>currentUser?openModal(studioModal):showAuth('signup');
$('#studioBtn').onclick=()=>openModal(studioModal);
$('#accountBtn').onclick=()=>$('#accountSection').scrollIntoView({behavior:'smooth'});
$('#uploadBtn').onclick=uploadVideo;$('#goLiveBtn').onclick=startLive;$('#stopLiveBtn').onclick=stopLive;$('#refreshLive').onclick=loadLiveRooms;$('#refreshVideos').onclick=loadVideos;
$$('[data-auth]').forEach(b=>b.onclick=()=>showAuth(b.dataset.auth));
$$('[data-tab]').forEach(b=>b.onclick=()=>setAuthTab(b.dataset.tab));
$$('[data-close="auth"]').forEach(b=>b.onclick=()=>closeModal(authModal));
$$('[data-close="studio"]').forEach(b=>b.onclick=()=>closeModal(studioModal));
$$('[data-close="video"]').forEach(b=>b.onclick=()=>{closeModal(videoModal);resetVideoPlayer()});
$$('[data-close="live"]').forEach(b=>b.onclick=async()=>{closeModal(liveModal);await cleanupViewer()});
[authModal,studioModal,videoModal,liveModal].forEach(m=>m.addEventListener('click',async e=>{if(e.target!==m)return;closeModal(m);if(m===videoModal)resetVideoPlayer();if(m===liveModal)await cleanupViewer()}));
supabaseClient.auth.onAuthStateChange(()=>setTimeout(refreshAuthUI,0));
window.addEventListener('beforeunload',()=>{if(hostRoom&&currentUser)supabaseClient.from('live_rooms').update({is_live:false,ended_at:new Date().toISOString()}).eq('user_id',currentUser.id)});
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js?v=6').then(r=>r.update()).catch(()=>{}));
refreshAuthUI();setInterval(loadLiveRooms,15000);
