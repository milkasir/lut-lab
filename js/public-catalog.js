/* Public catalog reads never use the repository token or execute downloaded source. */
(function(root){
  'use strict';
  const tools=root.LUTLibraryTools||(typeof require==='function'?require('./library-tools.js'):null),key='lut-lab-public-catalog-update';
  let serial=0;
  const siteURL=href=>new URL('./',href).href;
  async function load({href=root.location?.href,fetchImpl=root.fetch.bind(root),now=Date.now(),timeout=10000}={}){
    const url=new URL('assets/catalog.js',siteURL(href));
    url.searchParams.set('v',now+'-'+(++serial));
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
    try{
      const response=await fetchImpl(url.href,{cache:'no-store',credentials:'omit',signal:controller.signal});
      if(!response.ok)throw new Error('公共素材清单读取失败 ('+response.status+')');
      const catalog=tools.parseCatalog(await response.text());
      if(!catalog.images.length)throw new Error('公共素材库至少需要一张图片');
      return catalog;
    }finally{clearTimeout(timer);}
  }
  function announce(site){
    try{
      const target=new URL(site,root.location.href);
      if(target.origin!==root.location.origin)return;
      const message={type:key,site:siteURL(target.href),at:Date.now()};
      try{root.localStorage.setItem(key,JSON.stringify(message));}catch(_){}
      if(root.BroadcastChannel){const channel=new root.BroadcastChannel(key);channel.postMessage(message);channel.close();}
    }catch(_){}
  }
  function observe(refresh,{interval=15000}={}){
    const site=siteURL(root.location.href),visible=()=>root.document.visibilityState!=='hidden';
    const check=()=>{if(visible())refresh();};
    const receive=message=>{if(message?.type===key&&message.site===site)check();};
    const storage=event=>{if(event.key===key)try{receive(JSON.parse(event.newValue));}catch(_){}};
    let channel;try{if(root.BroadcastChannel){channel=new root.BroadcastChannel(key);channel.onmessage=event=>receive(event.data);}}catch(_){}
    root.addEventListener('storage',storage);root.addEventListener('focus',check);root.document.addEventListener('visibilitychange',check);
    const timer=setInterval(check,interval);
    return ()=>{clearInterval(timer);channel?.close();root.removeEventListener('storage',storage);root.removeEventListener('focus',check);root.document.removeEventListener('visibilitychange',check);};
  }
  const api={load,announce,observe};root.LUTPublicCatalog=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:self);
