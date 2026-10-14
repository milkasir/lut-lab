const test=require('node:test'),assert=require('node:assert/strict');
const T=require('../js/library-tools.js'),G=require('../js/github-publisher.js');
// An in-memory Git database. These tests perform no network requests.
function mock(initial,options={}){const prefix='/repos/demo/lut-lab',folder=options.root?options.root+'/':'',requests=[],blobs=new Map(),trees=new Map(),commits=new Map();let count=0,head;const hash=()=> (++count).toString(16).padStart(40,'0'),makeBlob=bytes=>{const id=hash();blobs.set(id,bytes);return id;};function advance(catalog,extra={}){const previous=head,files=new Map(previous?trees.get(commits.get(previous).tree):[]);files.set(folder+'assets/catalog.js',makeBlob(new TextEncoder().encode(T.serializeCatalog(catalog.luts,catalog.images))));for(const [name,data]of Object.entries(extra))files.set(name,makeBlob(new TextEncoder().encode(data)));const tree=hash();trees.set(tree,files);head=hash();commits.set(head,{tree,parents:previous?[previous]:[]});}advance(initial,{'LICENSE':'keep','js/app.js':'keep'});const response=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});const api={requests,advance,get head(){return head;},get files(){return trees.get(commits.get(head).tree);},get catalog(){return T.parseCatalog(new TextDecoder().decode(blobs.get(api.files.get(folder+'assets/catalog.js'))));},blobs};api.fetch=async(url,r={})=>{assert.ok(url.startsWith('https://api.github.com/'));const u=new URL(url),p=decodeURIComponent(u.pathname),method=r.method||'GET',body=r.body?JSON.parse(r.body):undefined;requests.push({p,method,body,headers:r.headers});if(options.reject)return response({},options.reject);if(p===prefix)return response({default_branch:'main',permissions:{push:true}});if(method==='GET'&&p===prefix+'/git/ref/heads/main')return response({object:{sha:head}});if(method==='GET'&&p.startsWith(prefix+'/git/commits/'))return response({tree:{sha:commits.get(p.split('/').pop()).tree}});if(method==='GET'&&p.startsWith(prefix+'/contents/')){const id=u.searchParams.get('ref'),sha=trees.get(commits.get(id).tree).get(p.slice((prefix+'/contents/').length));return response({type:'file',sha,encoding:'base64',content:G.toBase64(blobs.get(sha))});}if(method==='POST'&&p===prefix+'/git/blobs')return response({sha:makeBlob(G.fromBase64(body.content))},201);if(method==='POST'&&p===prefix+'/git/trees'){const files=new Map(trees.get(body.base_tree));for(const e of body.tree){if(e.sha===null)files.delete(e.path);else files.set(e.path,e.content!==undefined?makeBlob(new TextEncoder().encode(e.content)):e.sha);}const sha=hash();trees.set(sha,files);return response({sha},201);}if(method==='POST'&&p===prefix+'/git/commits'){const sha=hash();commits.set(sha,{tree:body.tree,parents:body.parents});return response({sha},201);}if(method==='PATCH'){assert.equal(body.force,false);options.beforePatch?.(api);if(options.protected||commits.get(body.sha).parents[0]!==head)return response({},422);head=body.sha;if(options.losePatchResponse)throw new Error('response lost');return response({});}throw new Error(method+' '+p);};return api;}
const original={luts:[{id:'one',name:'Original',path:'assets/luts/one.cube',base:'STD',category:'Film'}],images:[{id:'photo',name:'Photo',path:'assets/images/photo.jpg',base:'STD'}]},clone=x=>JSON.parse(JSON.stringify(x));
function client(m,root=''){return new G.Publisher({repo:'https://github.com/demo/lut-lab',token:'unit-test-placeholder',root,fetchImpl:m.fetch});}
test('parses catalog JSON without executing source, including bracket text in names',()=>{const data=clone(original);data.luts[0].name='Text ]; " [ end';const source=T.serializeCatalog(data.luts,data.images)+'\nglobalThis.shouldNotExecute = true;';assert.deepEqual(T.parseCatalog(source),data);assert.equal(globalThis.shouldNotExecute,undefined);assert.throws(()=>T.parseCatalog('window.LUT_CATALOG = call();'));assert.throws(()=>T.parseCatalog(T.serializeCatalog([{id:'bad',name:'Bad',path:'../file'}],[])));});
test('three-way merge preserves concurrent additions and independent field edits',()=>{const base=clone(original),local=clone(base),remote=clone(base);local.luts[0].name='Renamed';remote.luts[0].category='Remote Category';remote.images.push({id:'other',name:'Other',path:'assets/images/other.jpg'});local.luts.push({id:'new',name:'New',path:'assets/luts/new.cube'});const result=T.mergeCatalog(base,local,remote);assert.equal(result.luts[0].name,'Renamed');assert.equal(result.luts[0].category,'Remote Category');assert.equal(result.images.length,2);assert.equal(result.luts.length,2);});
test('three-way merge blocks same-field and delete-vs-edit conflicts',()=>{const local=clone(original),remote=clone(original);local.luts[0].name='Local';remote.luts[0].name='Remote';assert.throws(()=>T.mergeCatalog(original,local,remote),/同时修改/);local.luts=[];assert.throws(()=>T.mergeCatalog(original,local,remote),/同时修改/);});
test('one commit updates assets and catalog while preserving all other tree files',async()=>{const m=mock(original),c=client(m);await c.connect();const local=clone(original),bytes=new Uint8Array([0,1,128,255]);local.luts.push({id:'new',name:'New LUT',path:'assets/luts/new.cube'});local.images.push({id:'new-photo',name:'New Photo',path:'assets/images/new.png'});const result=await c.publish(local,[{name:'assets/luts/new.cube',data:bytes},{name:'assets/images/new.png',data:bytes}]);assert.equal(m.head,result.sha);assert.equal(m.catalog.luts.length,2);assert.equal(m.catalog.images.length,2);assert.ok(m.files.has('LICENSE'));assert.ok(m.files.has('js/app.js'));assert.deepEqual(m.blobs.get(m.files.get('assets/images/new.png')),bytes);assert.equal(m.requests.filter(r=>r.method==='PATCH').length,1);assert.ok(m.requests.every(r=>r.headers.Authorization==='Bearer unit-test-placeholder'));assert.ok(m.requests.filter(r=>r.body).every(r=>!JSON.stringify(r.body).includes('unit-test-placeholder')));});
test('publishes under docs and never replaces unrelated files',async()=>{const m=mock(original,{root:'docs'}),c=client(m,'docs');await c.connect();const local=clone(original);local.luts[0].name='Changed';await c.publish(local,[]);assert.ok(m.files.has('docs/assets/catalog.js'));assert.ok(!m.files.has('assets/catalog.js'));assert.ok(m.files.has('LICENSE'));});
test('concurrent push is merged and retried without forcing branch history',async()=>{let advanced=false;const remote=clone(original);remote.images.push({id:'concurrent',name:'Concurrent',path:'assets/images/concurrent.png'});const m=mock(original,{beforePatch(api){if(!advanced){advanced=true;api.advance(remote);}}}),c=client(m);await c.connect();const local=clone(original);local.luts[0].name='Local';await c.publish(local,[]);assert.equal(m.catalog.images.length,2);assert.equal(m.catalog.luts[0].name,'Local');assert.equal(m.requests.filter(r=>r.method==='PATCH').length,2);});
test('protected branch does not change and a lost response is checked before reporting failure',async()=>{const m=mock(original,{protected:true}),c=client(m);await c.connect();const before=m.head;await assert.rejects(()=>c.publish(clone(original),[]));assert.equal(m.head,before);const uncertain=mock(original,{losePatchResponse:true}),u=client(uncertain);await u.connect();const result=await u.publish(clone(original),[]);assert.equal(result.sha,uncertain.head);});
test('connection errors, token disposal and destination validation occur before mutations',async()=>{assert.throws(()=>G.repository('https://example.com/demo/lut-lab'));assert.throws(()=>G.siteRoot('../outside'));const bad=mock(original,{reject:401});await assert.rejects(()=>client(bad).connect(),/过期/);const m=mock(original),c=client(m);await c.connect();await assert.rejects(()=>c.api('/repos/demo/lut-lab-other'),/目标/);const count=m.requests.length;c.disconnect();await assert.rejects(()=>c.api('/repos/demo/lut-lab'),/断开/);assert.equal(m.requests.length,count);assert.ok(!JSON.stringify(c).includes('unit-test-placeholder'));});
test('deletion removes the asset and thumbnail in the same commit as the catalog',async()=>{
  const data=clone(original);data.images[0].thumb='assets/images/photo-thumb.jpg';data.images.push({id:'keep',name:'Keep',path:'assets/images/keep.png'});
  const m=mock(data);m.advance(data,{'assets/luts/one.cube':'LUT','assets/images/photo.jpg':'photo','assets/images/photo-thumb.jpg':'thumb','assets/images/keep.png':'keep'});
  const c=client(m);await c.connect();const local=clone(data);local.luts=[];local.images=local.images.filter(x=>x.id!=='photo');const result=await c.publish(local,[]);
  assert.equal(result.deleted,3);for(const path of ['assets/luts/one.cube','assets/images/photo.jpg','assets/images/photo-thumb.jpg'])assert.equal(m.files.has(path),false);
  assert.ok(m.files.has('assets/images/keep.png'));assert.ok(m.files.has('js/app.js'));assert.equal(m.catalog.images.length,1);assert.equal(m.catalog.luts.length,0);
});
test('deletion preserves shared files and concurrent new entries',async()=>{
  const data=clone(original);data.images.push({id:'shared',name:'Shared',path:'assets/images/photo.jpg'});
  const local=clone(data);local.images=local.images.filter(x=>x.id!=='photo');assert.deepEqual(G.removedAssets(data,local),[]);
  const m=mock(data),c=client(m);await c.connect();const remote=clone(data);remote.images.push({id:'new',name:'New',path:'assets/images/new.png'});m.advance(remote,{'assets/images/photo.jpg':'shared','assets/images/new.png':'new'});
  await c.publish(local,[]);assert.equal(m.catalog.images.length,2);assert.ok(m.files.has('assets/images/photo.jpg'));assert.ok(m.files.has('assets/images/new.png'));
});
function rejection(status,message,headers={}){
  return {ok:false,status,json:async()=>({message}),headers:{get:name=>headers[name]??null}};
}
test('readable repository can reject asset writes and be reconnected without losing pending assets',async()=>{
  const m=mock(original);let readonly=true;
  const c=new G.Publisher({repo:'demo/lut-lab',token:'unit-test-placeholder',fetchImpl:(url,request)=>{
    if(readonly&&request.method==='POST')return Promise.resolve(rejection(403,'Resource not accessible by personal access token'));
    return m.fetch(url,request);
  }});
  await c.connect();const before=m.head,local=clone(original),files=[{name:'assets/luts/new.cube',data:new Uint8Array([1,2,3])}];
  local.luts.push({id:'new',name:'New',path:files[0].name});
  await assert.rejects(()=>c.publish(local,files),error=>{
    assert.equal(error.status,403);assert.equal(error.uncertain,undefined);
    assert.match(error.message,/Contents.*Read and write/);assert.match(error.message,/上传素材/);assert.match(error.message,/Resource not accessible/);return true;
  });
  assert.equal(m.head,before);assert.deepEqual(c.baseline,original);
  c.disconnect();readonly=false;
  const connected=new G.Publisher({repo:'demo/lut-lab',token:'updated-test-placeholder',fetchImpl:m.fetch});
  await connected.connect();await connected.publish(local,files);assert.equal(m.catalog.luts.length,2);
});
test('rate limiting uses retry delay instead of telling the user to change permissions',async()=>{
  for(const [status,message,headers,seconds] of [
    [403,'API rate limit exceeded',{'x-ratelimit-remaining':'0','x-ratelimit-reset':String(Math.ceil(Date.now()/1000)+120)},120],
    [403,'You have exceeded a secondary rate limit',{'retry-after':'90'},90],
    [429,'Too many requests',{},60]
  ]){
    const c=new G.Publisher({repo:'demo/lut-lab',token:'unit-test-placeholder',fetchImpl:async()=>rejection(status,message,headers)});
    await assert.rejects(()=>c.api(c.prefix+'/git/blobs','POST',{}),error=>{
      assert.equal(error.kind,'rate-limit');assert.match(error.message,/访问频率受限/);assert.doesNotMatch(error.message,/Contents/);
      if(status===429||headers['retry-after'])assert.match(error.message,new RegExp(seconds+' 秒'));
      return true;
    });
  }
});
test('failed writes report their publishing stage and preserve the GitHub reason',async()=>{
  for(const [path,method,step] of [
    ['/git/blobs','POST','上传素材'],['/git/trees','POST','保存素材清单'],['/git/commits','POST','创建提交'],['/git/refs/heads/main','PATCH','更新发布分支']
  ]){
    const c=new G.Publisher({repo:'demo/lut-lab',token:'unit-test-placeholder',fetchImpl:async()=>rejection(403,'Resource not accessible by personal access token')});
    await assert.rejects(()=>c.api(c.prefix+path,method,{}),error=>error.message.includes(step)&&error.message.includes('HTTP 403')&&error.message.includes('Resource not accessible'));
  }
});
test('branch rule rejections are not retried as concurrent updates',async()=>{
  const m=mock(original),c=new G.Publisher({repo:'demo/lut-lab',token:'unit-test-placeholder',fetchImpl:(url,request)=>{
    if(request.method==='PATCH'){m.requests.push({method:'PATCH'});return Promise.resolve(rejection(422,'Repository rule violations found. Changes must be made through a pull request.'));}
    return m.fetch(url,request);
  }});
  await c.connect();const before=m.head;
  await assert.rejects(()=>c.publish(clone(original),[]),error=>error.kind==='rules'&&error.message.includes('分支规则'));
  assert.equal(m.head,before);assert.equal(m.requests.filter(r=>r.method==='PATCH').length,1);
});
test('error diagnostics redact tokens and tolerate unavailable JSON and response headers',async()=>{
  const token='unit-test-placeholder',c=new G.Publisher({repo:'demo/lut-lab',token,fetchImpl:async()=>rejection(403,token+' github_pat_fake123 ghp_fake456')});
  await assert.rejects(()=>c.api(c.prefix+'/git/blobs','POST',{}),error=>{
    assert.doesNotMatch(error.message,/unit-test-placeholder|github_pat_fake123|ghp_fake456/);assert.match(error.message,/已隐藏令牌/);return true;
  });
  const broken=new G.Publisher({repo:'demo/lut-lab',token,fetchImpl:async()=>({ok:false,status:403,json:async()=>{throw new Error('not JSON')}})});
  await assert.rejects(()=>broken.api(broken.prefix+'/git/blobs','POST',{}),/Contents.*Read and write/);
});
test('a server error after applying the branch update is verified before reporting failure',async()=>{
  const m=mock(original),c=new G.Publisher({repo:'demo/lut-lab',token:'unit-test-placeholder',fetchImpl:async(url,request)=>{
    const result=await m.fetch(url,request);
    return request.method==='PATCH'?rejection(500,'Internal Server Error'):result;
  }});
  await c.connect();const result=await c.publish(clone(original),[]);assert.equal(result.sha,m.head);
});

