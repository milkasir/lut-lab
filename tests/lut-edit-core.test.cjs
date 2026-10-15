const test=require('node:test'),assert=require('node:assert/strict'),C=require('../js/lut-core'),E=require('../js/lut-edit-core');
const near=(a,b,t=2e-6)=>a.forEach((x,i)=>assert.ok(Math.abs(x-b[i])<t,`${x} != ${b[i]}`));
const random=(()=>{let s=517;return()=>{s=(s*1664525+1013904223)>>>0;return s/2**32;};})();
test('neutral project is identity, baking is red-fastest, and camera CUBE round-trips 35937 rows',()=>{
 const p=E.project(),fn=E.compile(p);for(let i=0;i<100;i++){const rgb=[random(),random(),random()];near(fn(rgb),rgb);}
 const lut=E.bake(p,{mode:'panasonic'}),text=E.cube(lut),parsed=C.parseCube(text);assert.equal(parsed.base,'STD');assert.equal(parsed.size3D,33);assert.equal(parsed.size1D,0);assert.equal(text.trim().split('\n').length,35943);near(Array.from(parsed.threeD.slice(3,6)),[1/32,0,0]);near(Array.from(parsed.threeD.slice(33*3,33*3+3)),[0,1/32,0]);near(Array.from(parsed.threeD.slice(33*33*3,33*33*3+3)),[0,0,1/32]);assert.ok(parsed.min>=0&&parsed.max<=1);
});
test('pane copy includes strength, exposure, input preparation, pre-LUT and main LUT exactly once',()=>{
 const identity=E.bake(E.project()),main={...identity,threeD:Float32Array.from(identity.threeD,(v,i)=>i%3===0?Math.sqrt(v):v*.8)},pre={...identity,threeD:Float32Array.from(identity.threeD,v=>v*.9)};
 const options={strength:.43,exposure:.7,adapt:'flog2',interpolation:'trilinear'},p=E.project({source:{base:'STD',lut:E.pack(main),pre:E.pack(pre),options}}),fn=E.compile(p);
 for(let i=0;i<100;i++){const v=[random(),random(),random()];near(fn(v),C.transform(v,main,options,pre).map(x=>C.clamp(x)));}
 const restored=E.validate(JSON.parse(JSON.stringify(p)));near(E.compile(restored)([.2,.4,.8]),fn([.2,.4,.8]));
});
test('primary gain, matrix and monochrome have predictable independent results',()=>{
 const p=E.project();p.grade.mixer=[[0,1,0],[0,0,1],[1,0,0]];near(E.compile(p)([.1,.3,.7]),[.3,.7,.1]);
 p.grade.mixer=E.defaults().mixer;p.grade.primaries.gain=[2,1,.5];near(E.compile(p)([.1,.3,.7]),[.2,.3,.35]);
 p.grade=E.defaults();p.grade.monochrome=100;p.grade.monoWeights=[1,0,0];near(E.compile(p)([.1,.3,.7]),[.1,.1,.1]);
});
test('exposure is linear-light, amount zero retains the underlying look',()=>{
 const p=E.project();p.grade.exposure=1;const value=E.compile(p)([.1,.2,.3]);near(value,[.1,.2,.3].map(x=>C.encodeSRGB(C.linearize(x)*2)));p.grade.amount=0;near(E.compile(p)([.1,.2,.3]),[.1,.2,.3]);
});
test('known gamut/log conversions round-trip and agree with existing forward encoding',()=>{
 for(let i=0;i<50;i++){const rgb=[random()*.6+.1,random()*.6+.1,random()*.6+.1];for(const base of ['VLOG','FLOG2']){const encoded=E.convert(rgb,'STD',base);near(E.convert(encoded,base,'STD'),rgb,1e-5);near(encoded,C.transform(rgb,null,{adapt:base==='VLOG'?'vlog':'flog2'}),1e-6);}}
 assert.throws(()=>E.convert([.1,.2,.3],'STD','CNED2'),/没有通用转换/);
});
test('F-Log2 Panasonic export bakes a real V-Log bridge and declares VLOG',()=>{
 const p=E.project({inputBase:'FLOG2'}),native=E.bake(p),camera=E.bake(p,{mode:'panasonic'});assert.equal(native.base,'FLOG2');assert.equal(camera.base,'VLOG');const fn=E.compile(p);
 for(const [r,g,b]of [[0,0,0],[16,16,16],[8,12,20],[25,28,31]]){const input=[r/32,g/32,b/32],i=(b*33*33+g*33+r)*3;near(Array.from(camera.threeD.slice(i,i+3)),fn(E.convert(input,'VLOG','FLOG2')),2e-6);}
 assert.throws(()=>E.bake(E.project({inputBase:'UNKNOWN'}),{mode:'panasonic'}),/确认/);assert.throws(()=>E.bake(p,{size:65,mode:'panasonic'}),/33/);
});
test('PORT input survives project storage and Panasonic export without inventing an sRGB conversion',()=>{
 const source=E.bake(E.project({inputBase:'PORT'}),{mode:'panasonic'});
 source.threeD=Float32Array.from(source.threeD,(v,i)=>i%3===0?v*.8:v);
 const p=E.project({inputBase:'PORT',source:{base:'PORT',lut:E.pack(source),pre:null,options:{strength:1,adapt:'direct',exposure:0,interpolation:'tetrahedral'}}});
 const restored=E.validate(JSON.parse(JSON.stringify(p)));
 assert.equal(restored.inputBase,'PORT');assert.equal(restored.source.lut.base,'PORT');
 const exported=C.parseCube(E.cube(E.bake(restored,{mode:'panasonic'})));
 assert.equal(exported.base,'PORT');assert.equal(exported.size3D,33);
 near(Array.from(exported.threeD),Array.from(source.threeD));
 assert.throws(()=>E.convert([.1,.2,.3],'STD','PORT'),/没有通用转换/);
});
test('new log foundation retains scene values for negative exposure before display clipping',()=>{
 const p=E.project({inputBase:'VLOG'}),white=E.convert([2,2,2].map(C.encodeSRGB),'STD','VLOG');p.grade.exposure=-2;const value=E.compile(p)(white);near(value,[.5,.5,.5].map(C.encodeSRGB),1e-5);
});
test('shape-preserving curves are bounded and monotone, arbitrary curve shapes remain finite',()=>{
 const table=E.curveTable([[0,0],[.2,.05],[.5,.65],[1,1]]);for(let i=1;i<table.length;i++)assert.ok(table[i]>=table[i-1]&&table[i]>=0&&table[i]<=1);assert.equal(table[0],0);assert.equal(table[1024],1);
 const p=E.project();p.curves.r=[[0,1],[.3,.2],[.7,.8],[1,0]];const fn=E.compile(p);for(let i=0;i<100;i++)assert.ok(fn([random(),random(),random()]).every(x=>Number.isFinite(x)&&x>=0&&x<=1));
});
test('HSL, wheels and extreme grades stay finite across cube corners and grayscale',()=>{
 const p=E.project();Object.assign(p.grade,{temperature:100,tint:-100,contrast:100,gamma:.2,highlights:-100,shadows:100,whites:-100,blacks:100,saturation:100,vibrance:100,hue:-180,fade:100,balance:100});p.grade.hsl=p.grade.hsl.map((_,i)=>({h:i%2?45:-45,s:100,l:i%2?100:-100}));p.grade.wheels=[{h:30,s:100,l:100},{h:160,s:100,l:-100},{h:270,s:100,l:100}];const fn=E.compile(p);for(const x of [0,.001,.18,.5,.999,1])for(const v of [[x,x,x],[1,x,0],[x,0,1]])assert.ok(fn(v).every(k=>Number.isFinite(k)&&k>=0&&k<=1));
});
test('invalid projects, incomplete LUTs, corrupt curves and unsafe camera filenames are rejected',()=>{
 let p=E.project();p.grade.exposure=NaN;assert.throws(()=>E.validate(p));p=E.project();p.curves.master=[[0,0],[.5,.5],[.5,.7],[1,1]];assert.throws(()=>E.validate(p));p=E.project();p.grade.monoWeights=[0,0,0];assert.throws(()=>E.validate(p));p=E.project();p.source.lut={size1D:0,size3D:33,threeD:[1,2,3],domainMin:[0,0,0],domainMax:[1,1,1]};assert.throws(()=>E.validate(p));
 for(const file of ['../foo','我的LUT','123456789','LUT.cube','A B',''])assert.throws(()=>E.cameraFilename(file));assert.equal(E.cameraFilename('abc123'),'ABC123.cube');
});
