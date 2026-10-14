const test=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const tools=require('../js/library-tools.js');
test('ZIP preserves UTF-8 names, exact binary content, and valid CRC-32',async()=>{
  assert.equal(tools.crc32(new TextEncoder().encode('123456789')),0xcbf43926);
  const binary=new Uint8Array([0,1,2,128,255]),blob=await tools.zip([{name:'assets/test.cube',data:binary},{name:'更新步骤.txt',data:'更新库'}]),bytes=new Uint8Array(await blob.arrayBuffer()),view=new DataView(bytes.buffer);let offset=0;const contents=new Map();
  while(view.getUint32(offset,true)===0x04034b50){assert.equal(view.getUint16(offset+6,true),0x0800);assert.equal(view.getUint16(offset+8,true),0);const size=view.getUint32(offset+18,true),length=view.getUint16(offset+26,true),start=offset+30+length,name=new TextDecoder().decode(bytes.slice(offset+30,start)),data=bytes.slice(start,start+size);assert.equal(tools.crc32(data),view.getUint32(offset+14,true));contents.set(name,data);offset=start+size;}
  assert.deepEqual(contents.get('assets/test.cube'),binary);assert.equal(new TextDecoder().decode(contents.get('更新步骤.txt')),'更新库');assert.equal(view.getUint32(offset,true),0x02014b50);assert.equal(view.getUint32(bytes.length-22,true),0x06054b50);assert.equal(view.getUint16(bytes.length-12,true),2);
});
test('catalog serialization preserves existing and newly added metadata safely',()=>{const luts=[{id:'one',name:'</script><script>throw 1</script>',base:'FLOG2',declaredBase:'VLOG',inputVerified:true}],images=[{id:'image',path:'assets/images/example.png'}],source=tools.serializeCatalog(luts,images),context={window:{}};vm.runInNewContext(source,context);assert.equal(context.window.LUT_CATALOG[0].name,luts[0].name);assert.equal(context.window.LUT_CATALOG[0].inputVerified,true);assert.equal(context.window.IMAGE_CATALOG[0].path,images[0].path);assert.ok(!source.includes('</script>'));});
test('ZIP rejects traversal and absolute paths',async()=>{for(const name of ['../outside','/absolute','assets\\wrong'])await assert.rejects(()=>tools.zip([{name,data:'text'}]));});

test('editable descriptions round-trip as text and merge with concurrent uploads',()=>{
  const base={luts:[{id:'one',name:'One',path:'assets/luts/one.cube',base:'MONO',description:'旧简介'}],images:[{id:'photo',name:'Photo',path:'assets/images/photo.jpg'}]},local=structuredClone(base),remote=structuredClone(base);
  local.luts[0].description='冷调\n"蓝晒" <script>window.executed=true</script>';
  remote.luts.push({id:'two',name:'Two',path:'assets/luts/two.cube',base:'STD',description:'新上传'});remote.luts[0].category='徕卡单色';
  const merged=tools.mergeCatalog(base,local,remote),source=tools.serializeCatalog(merged.luts,merged.images),result=tools.parseCatalog(source);
  assert.equal(result.luts[0].description,local.luts[0].description);assert.equal(result.luts[0].category,'徕卡单色');assert.equal(result.luts[0].base,'MONO');assert.equal(result.luts.length,2);assert.ok(!source.includes('<script>'));
  const context={window:{}};vm.runInNewContext(source,context);assert.equal(context.window.executed,undefined);
});
test('concurrent description edits require review instead of overwriting either author',()=>{
  const base={luts:[{id:'one',name:'One',path:'assets/luts/one.cube',description:'原简介'}],images:[]},local=structuredClone(base),remote=structuredClone(base);
  local.luts[0].description='本地简介';remote.luts[0].description='远端简介';assert.throws(()=>tools.mergeCatalog(base,local,remote),/description.*同时修改/);
});

