document.addEventListener('DOMContentLoaded',()=>{
  const button=document.querySelector('.menu-toggle');
  const menu=document.querySelector('.menu');
  if(button&&menu){
    button.addEventListener('click',()=>{
      const open=menu.classList.toggle('is-open');
      button.setAttribute('aria-expanded',open?'true':'false');
      button.textContent=open?'✕':'☰';
    });
    menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
      menu.classList.remove('is-open');
      button.setAttribute('aria-expanded','false');
      button.textContent='☰';
    }));
  }
});