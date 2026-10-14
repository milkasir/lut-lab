/* Public catalog reads never use the repository token or execute downloaded source. */
(function(root){
  'use strict';
  const tools=root.LUTLibraryTools||(typeof require==='function'?require('./library-tools.js'):null);
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
  const api={load};root.LUTPublicCatalog=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:self);

