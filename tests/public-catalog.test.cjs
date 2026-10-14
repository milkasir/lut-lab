const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
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
test('updates use site-scoped notifications and visible-page checks without token data',()=>{
  const listeners=new Map(),docListeners=new Map(),writes=[],channels=[];let tick,closed=false,refreshes=0;
  const context={URL,Date,JSON,LUTLibraryTools:T,location:{href:'https://example.com/docs/manage.html',origin:'https://example.com'},document:{visibilityState:'visible',addEventListener:(name,fn)=>docListeners.set(name,fn),removeEventListener:name=>docListeners.delete(name)},localStorage:{setItem:(name,value)=>writes.push({name,value})},addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name),setInterval:fn=>{tick=fn;return 1},clearInterval:()=>{closed=true},BroadcastChannel:class{constructor(){channels.push(this)}postMessage(value){this.message=value}close(){this.closed=true}}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/public-catalog.js'),'utf8'),context);
  const stop=context.LUTPublicCatalog.observe(()=>refreshes++);
  context.LUTPublicCatalog.announce('https://other.example/docs/');assert.equal(writes.length,0);
  context.LUTPublicCatalog.announce('https://example.com/docs/');assert.equal(writes.length,1);
  const message=JSON.parse(writes[0].value);assert.deepEqual(Object.keys(message).sort(),['at','site','type']);assert.equal(message.site,'https://example.com/docs/');
  channels[0].onmessage({data:{...message,site:'https://example.com/other/'}});assert.equal(refreshes,0);
  channels[0].onmessage({data:message});assert.equal(refreshes,1);
  listeners.get('storage')({key:writes[0].name,newValue:writes[0].value});listeners.get('focus')();tick();assert.equal(refreshes,4);
  context.document.visibilityState='hidden';tick();assert.equal(refreshes,4);
  stop();assert.equal(closed,true);assert.equal(channels[0].closed,true);assert.equal(listeners.size,0);assert.equal(docListeners.size,0);
});
