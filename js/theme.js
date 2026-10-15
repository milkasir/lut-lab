/* Apply the saved appearance before CSS paints. No catalog or image updates. */
(function () {
  'use strict';
  const root=document.documentElement,preference=matchMedia('(prefers-color-scheme: light)');
  let saved;try{saved=localStorage.getItem('lut-lab-theme');}catch(_){}
  let explicit=saved==='light'||saved==='dark';
  const paths={
    edit:'<path d="m16 3 5 5M4 20l4-1L21 6l-5-5L3 14l-1 8Z"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    star:'<path d="m12 3 2.78 5.63 6.22.9-4.5 4.39 1.06 6.2L12 17.2l-5.56 2.92 1.06-6.2L3 9.53l6.22-.9Z"/>',
    chevron:'<path d="m6 9 6 6 6-6"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
    upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/>',
    download:'<path d="M12 3v13m-5-5 5 5 5-5M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    check:'<path d="m5 12 4 4L19 6"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
    moon:'<path d="M20.9 13.3A9 9 0 0 1 10.7 3.1 9 9 0 1 0 20.9 13.3Z"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.7 1.2c-.9 1.1-2.2 1.3-2.2 3M12 17h.01"/>',
    reset:'<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
    folder:'<path d="M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/>',
    save:'<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2Z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/>'
  };
  const icon=name=>`<svg class="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]||paths.info}</svg>`;
  function apply(theme){
    root.dataset.theme=theme;root.style.colorScheme=theme;
    const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=theme==='light'?'#f6f7f3':'#161b19';
    const button=document.getElementById('themeToggle');if(button){const next=theme==='dark'?'浅色':'深色';button.innerHTML=icon(theme==='dark'?'sun':'moon')+`<span>${next}模式</span>`;button.setAttribute('aria-label','切换到'+next+'模式');button.title='切换到'+next+'模式';}
  }
  apply(explicit?saved:(preference.matches?'light':'dark'));
  preference.addEventListener('change',e=>{if(!explicit)apply(e.matches?'light':'dark');});
  document.addEventListener('DOMContentLoaded',()=>{apply(root.dataset.theme);document.getElementById('themeToggle')?.addEventListener('click',()=>{explicit=true;const theme=root.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('lut-lab-theme',theme);}catch(_){}apply(theme);});});
  window.LUTUI={icon};
})();

