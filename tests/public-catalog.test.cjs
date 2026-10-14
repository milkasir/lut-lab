const test=require('node:test'),assert=require('node:assert/strict');
const T=require('../js/library-tools.js'),P=require('../js/public-catalog.js');
const catalog={luts:[{id:'lut',name:'New LUT',path:'assets/luts/new.cube'}],images:[{id:'photo',name:'New Photo',path:'assets/images/new.jpg'}]};
test('every load bypasses stale HTTP caches and resolves the catalog inside the site directory',async()=>{
  const calls=[],fetchImpl=async(url,options)=>{calls.push({url,options});return {ok:true,text:async()=>T.serializeCatalog(catalog.luts,catalog.images)}};
  const first=await P.load({href:'https://example.com/docs/manage.html',fetchImpl,now:100});
  const second=await P.load({href:'https://example.com/docs/',fetchImpl,now:100});
  assert.deepEqual(first,catalog);assert.deepEqual(second,catalog);
  assert.equal(new URL(calls[0].url).pathname,'/docs/assets/catalog.js');assert.notEqual(calls[0].url,calls[1].url);
  for(const {options}of calls){assert.equal(options.cache,'no-store');assert.equal(options.credentials,'omit');assert.equal(options.headers,undefined);}
});
test('downloaded catalog text is parsed without executing scripts',async()=>{
  const result=await P.load({href:'https://example.com/',fetchImpl:async()=>({ok:true,text:async()=>T.serializeCatalog(catalog.luts,catalog.images)+';globalThis.catalogExecuted=true;'})});
  assert.deepEqual(result,catalog);assert.equal(globalThis.catalogExecuted,undefined);
});
test('HTTP errors, malformed catalogs and an empty image library are rejected',async()=>{
  for(const response of [{ok:false,status:503},{ok:true,text:async()=>'<html>Error</html>'},{ok:true,text:async()=>T.serializeCatalog([],[])}]){
    await assert.rejects(()=>P.load({href:'https://example.com/',fetchImpl:async()=>response}));
  }
});
test('timeout also covers a stalled response body',async()=>{
  await assert.rejects(()=>P.load({href:'https://example.com/',timeout:5,fetchImpl:async(url,{signal})=>({
    ok:true,text:()=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('body aborted')),{once:true}))
  })}),/body aborted/);
});
