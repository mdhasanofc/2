(function(){
'use strict';
const app=document.getElementById('haw-booking-app');
if(!app)return;
const form=document.getElementById('haw-booking-form');
const steps=[...app.querySelectorAll('.haw-step')];
const nextBtn=document.getElementById('haw-next');
const backBtn=document.getElementById('haw-back');
const actions=document.getElementById('haw-actions');
const errorBox=document.getElementById('haw-error');
const progressBar=document.getElementById('haw-progress-bar');
const stepLabel=document.getElementById('haw-step-label');
const stepPercent=document.getElementById('haw-step-percent');
const liveSelection=document.getElementById('haw-live-selection');
const livePrice=document.getElementById('haw-live-price');
const timeInput=document.getElementById('haw-wifey-time');
const priorityInput=document.getElementById('haw-priority');
let current=1;
let submitting=false;
const config=window.HAWBooking||{};
const taskMap={};
(config.tasks||[]).forEach(t=>taskMap[t.slug]=t);

function fireEvent(name,data){
  window.dataLayer=window.dataLayer||[];
  window.dataLayer.push(Object.assign({event:name},data||{}));
  if(typeof window.fbq==='function'){
    if(name==='haw_booking_request') window.fbq('track','Lead',data||{});
    else window.fbq('trackCustom',name,data||{});
  }
}
function money(v){return '$'+Number(v||0).toFixed(0)}
function showError(msg){errorBox.textContent=msg;errorBox.hidden=false;errorBox.scrollIntoView({behavior:'smooth',block:'nearest'});}
function clearError(){errorBox.hidden=true;errorBox.textContent='';}
function setStep(n){
  current=n;
  steps.forEach(s=>s.classList.toggle('is-active',Number(s.dataset.step)===n));
  const visibleStep=Math.min(n,8);
  const pct=n>=9?100:Math.round((visibleStep/8)*100);
  progressBar.style.width=pct+'%';
  stepLabel.textContent=n>=9?'Complete':'Step '+visibleStep+' of 8';
  stepPercent.textContent=pct+'%';
  backBtn.hidden=n<=1||n>=8;
  actions.hidden=n>=8;
  if(n===7){renderReview();nextBtn.textContent='Send my Wifey request 💗';}
  else if(n===1)nextBtn.textContent='Choose my Wifey time →';
  else nextBtn.textContent='Continue →';
  clearError();
  fireEvent('haw_form_step',{step:n});
  app.scrollIntoView({behavior:'smooth',block:'start'});
}
function selectedTasks(){return [...form.querySelectorAll('input[name="tasks[]"]:checked')].map(i=>i.value)}
function field(name){const el=form.elements[name];return el?String(el.value||'').trim():''}
app.querySelectorAll('.haw-time-card').forEach(card=>{
  card.addEventListener('click',()=>{
    app.querySelectorAll('.haw-time-card').forEach(c=>{c.classList.remove('is-selected');c.setAttribute('aria-checked','false')});
    card.classList.add('is-selected');card.setAttribute('aria-checked','true');
    timeInput.value=card.dataset.hours;
    liveSelection.textContent=card.dataset.hours+' Hour Wifey';
    livePrice.textContent=money(card.dataset.price)+' · no payment today';
    clearError();
  });
});
function updateTaskSummary(){
  const selected=selectedTasks();
  const other=document.querySelector('input[name="tasks[]"][value="other"]');
  document.getElementById('haw-other-wrap').hidden=!(other&&other.checked);
  document.getElementById('haw-list-summary').querySelector('strong').textContent=selected.length+' task'+(selected.length===1?'':'s')+' selected';
}
form.querySelectorAll('input[name="tasks[]"]').forEach(el=>el.addEventListener('change',updateTaskSummary));
function buildPriority(){
  const list=document.getElementById('haw-priority-list');
  list.innerHTML='';
  selectedTasks().forEach(slug=>{
    const t=taskMap[slug]||{slug,label:slug,icon:'✓'};
    const label=document.createElement('label');
    label.className='haw-priority-card';
    label.innerHTML='<input type="radio" name="priority_choice" value="'+escapeHtml(slug)+'"><span class="haw-priority-icon">'+escapeHtml(t.icon||'✓')+'</span><span><strong>'+escapeHtml(t.label)+'</strong><small>Make this my #1 priority</small></span><span class="haw-radio-dot"></span>';
    label.querySelector('input').addEventListener('change',e=>{priorityInput.value=e.target.value;});
    list.appendChild(label);
  });
}
function escapeHtml(str){return String(str??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function validateStep(){
  clearError();
  if(current===1&&!timeInput.value){showError('Choose how much Wifey Time you need to continue.');return false;}
  if(current===2&&selectedTasks().length===0){showError('Choose at least one task for your Wifey To-Do List.');return false;}
  if(current===3&&!priorityInput.value){showError('Choose your #1 priority so your Wifey knows where to start.');return false;}
  if(current===4&&!form.querySelector('input[name="frequency"]:checked')){showError('Choose how often you would like your Wifey.');return false;}
  if(current===5){if(!form.querySelector('input[name="preferred_day"]:checked')||!form.querySelector('input[name="preferred_time"]:checked')){showError('Choose your preferred day and time.');return false;}}
  if(current===6){
    const required=['customer_name','mobile','email','suburb'];
    if(required.some(n=>!field(n))){showError('Please complete your name, mobile, email and suburb.');return false;}
    const email=field('email');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){showError('Please enter a valid email address.');return false;}
  }
  return true;
}
function frequencyLabel(v){return({'weekly':'Weekly','fortnightly':'Fortnightly','every-4-weeks':'Every 4 Weeks','one-off':'One-Off'})[v]||v}
function taskLabels(){return selectedTasks().map(s=>(taskMap[s]&&taskMap[s].label)||s)}
function priorityLabel(){const s=priorityInput.value;return(taskMap[s]&&taskMap[s].label)||s}
function renderReview(){
  const hours=timeInput.value;
  const price=(config.prices||{})[hours]||0;
  const freq=form.querySelector('input[name="frequency"]:checked')?.value||'';
  const day=form.querySelector('input[name="preferred_day"]:checked')?.value||'';
  const time=form.querySelector('input[name="preferred_time"]:checked')?.value||'';
  const tasks=taskLabels();
  const blocks=[['Wifey Time',hours+' Hour Wifey'],['Frequency',frequencyLabel(freq)],['Preferred visit',day+' · '+time],['#1 Priority',priorityLabel()],['Your Wifey To-Do List',tasks.join(' · '),'full'],['Your home',field('customer_name')+' · '+field('suburb')+(field('address')?' · '+field('address'):''),'full']];
  document.getElementById('haw-review').innerHTML=blocks.map(b=>'<div class="haw-review-item '+(b[2]==='full'?'haw-review-item--full':'')+'"><small>'+escapeHtml(b[0])+'</small><strong>'+escapeHtml(b[1])+'</strong></div>').join('');
  document.getElementById('haw-review-time').textContent=hours+' hours';
  document.getElementById('haw-review-price').textContent=money(price);
}
async function submit(){
  if(submitting)return;
  submitting=true;nextBtn.disabled=true;setStep(8);
  const data=new FormData(form);
  try{
    const res=await fetch(config.ajaxUrl||window.ajaxurl,{method:'POST',credentials:'same-origin',body:data});
    const json=await res.json();
    if(!res.ok||!json.success)throw new Error(json?.data?.message||'Something went wrong. Please try again.');
    document.getElementById('haw-reference').textContent=json.data.reference;
    document.getElementById('haw-success-summary').textContent=json.data.summary;
    fireEvent('haw_booking_request',{value:Number(json.data.price||0),currency:'AUD',reference:json.data.reference,hours:Number(timeInput.value)});
    setTimeout(()=>setStep(9),450);
  }catch(err){submitting=false;nextBtn.disabled=false;setStep(7);showError(err.message||'Something went wrong. Please try again.');}
}
nextBtn.addEventListener('click',()=>{
  if(!validateStep())return;
  if(current===2){buildPriority();priorityInput.value='';}
  if(current===7){submit();return;}
  if(current<7)setStep(current+1);
});
backBtn.addEventListener('click',()=>{if(current>1)setStep(current-1)});
document.getElementById('haw-start-over').addEventListener('click',()=>{
  form.reset();timeInput.value='';priorityInput.value='';submitting=false;nextBtn.disabled=false;
  app.querySelectorAll('.haw-time-card').forEach(c=>{c.classList.remove('is-selected');c.setAttribute('aria-checked','false')});
  liveSelection.textContent='Choose a time';livePrice.textContent='No payment today';updateTaskSummary();setStep(1);
});
setStep(1);
})();
