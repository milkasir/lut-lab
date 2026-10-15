/* Pixel-local grading and CUBE baking. Identical code in browser, worker and tests. */
(function(root){
  'use strict';
  const C=root.LUTCore||(typeof require==='function'?require('./lut-core.js'):null),clamp=C.clamp;
  const BASES=['STD','VLOG','FLOG2','CNED2','MONO','UNKNOWN'];
  const HUES=[0,30,60,120,180,240,270,300];
  const V_TO_RGB=[[1.806576,-.695697,-.110879],[-.17009,1.305955,-.135865],[-.025206,-.154468,1.179674]];
  const RGB_TO_F=[[.627404,.329283,.043313],[.069097,.91954,.011363],[.016391,.088013,.895596]];
  const mul=(m,v)=>m.map(r=>r.reduce((a,k,i)=>a+k*v[i],0));
  function inverse(m){const [[a,b,c],[d,e,f],[g,h,i]]=m,k=a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);return [[e*i-f*h,c*h-b*i,b*f-c*e],[f*g-d*i,a*i-c*g,c*d-a*f],[d*h-e*g,b*g-a*h,a*e-b*d]].map(r=>r.map(v=>v/k));}
  const RGB_TO_V=inverse(V_TO_RGB),F_TO_RGB=inverse(RGB_TO_F);
  const decodeV=x=>x<.181? (x-.125)/5.6:10**((x-.598206)/.241514)-.00873;
  const decodeF=x=>x<.100686685?(x-.092864)/8.799461:(10**((x-.384316)/.245281)-.064829)/5.555556;
  function convert(rgb,from,to){
    if(from===to||to==='UNKNOWN')return rgb.slice();
    if(!['STD','VLOG','FLOG2'].includes(from)||!['STD','VLOG','FLOG2'].includes(to))throw Error('这两种基底没有通用转换；请保持源基底或使用已验证的前置 LUT。');
    let linear=from==='STD'?rgb.map(C.linearize):from==='VLOG'?mul(V_TO_RGB,rgb.map(decodeV)):mul(F_TO_RGB,rgb.map(decodeF));
    if(to==='STD')return linear.map(C.encodeSRGB);
    linear=mul(to==='VLOG'?RGB_TO_V:RGB_TO_F,linear);
    return linear.map(v=>(to==='VLOG'?C.encodeVLog:C.encodeFLog2)(Math.max(0,v)));
  }
  const clone=x=>JSON.parse(JSON.stringify(x));
  function defaults(){return {exposure:0,temperature:0,tint:0,brightness:0,contrast:0,pivot:.5,highlights:0,shadows:0,whites:0,blacks:0,gamma:1,fade:0,saturation:0,vibrance:0,hue:0,monochrome:0,monoWeights:[.2126,.7152,.0722],inputBlack:0,inputWhite:1,outputBlack:0,outputWhite:1,amount:100,primaries:{lift:[0,0,0],gamma:[1,1,1],gain:[1,1,1],offset:[0,0,0]},mixer:[[1,0,0],[0,1,0],[0,0,1]],hsl:HUES.map(()=>({h:0,s:0,l:0})),balance:0,wheels:['shadows','midtones','highlights'].map(()=>({h:0,s:0,l:0}))};}
  function curves(){return Object.fromEntries(['master','r','g','b'].map(k=>[k,[[0,0],[1,1]]]));}
  function project({name='我的新 LUT',inputBase='STD',source=null}={}){return {format:'lut-lab-editor',version:1,name,description:'',filename:'LUT00001',inputBase,grade:defaults(),curves:curves(),source:source||{base:['VLOG','FLOG2'].includes(inputBase)?'STD':inputBase,lut:null,pre:null,options:{strength:1,adapt:'direct',exposure:0,interpolation:'tetrahedral'}}};}
  function finite(v,min,max,name){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('无效参数：'+name);return v;}
  function array(v,n,min,max,name){if(!v||v.length!==n)throw Error('参数长度无效：'+name);return Array.from(v,x=>finite(x,min,max,name));}
  function pack(lut){if(!lut)return null;return {title:lut.title||'',base:lut.base||'UNKNOWN',size1D:lut.size1D||0,size3D:lut.size3D||0,oneD:lut.oneD?Array.from(lut.oneD):null,threeD:lut.threeD?Array.from(lut.threeD):null,domainMin:Array.from(lut.domainMin||[0,0,0]),domainMax:Array.from(lut.domainMax||[1,1,1]),range1D:lut.range1D?Array.from(lut.range1D):undefined,range3D:lut.range3D?Array.from(lut.range3D):undefined};}
  function unpack(lut){
    if(lut==null)return null;if(typeof lut!=='object')throw Error('源 LUT 无效');
    const n1=finite(lut.size1D||0,0,65536,'1D 网格'),n3=finite(lut.size3D||0,0,129,'3D 网格');
    if(!Number.isInteger(n1)||!Number.isInteger(n3)||n1===1||n3===1||(!n1&&!n3))throw Error('源 LUT 网格无效');
    const lo=array(lut.domainMin,3,-1e6,1e6,'DOMAIN_MIN'),hi=array(lut.domainMax,3,-1e6,1e6,'DOMAIN_MAX');if(hi.some((x,i)=>x<=lo[i]))throw Error('源 LUT DOMAIN 无效');
    const range=v=>{if(v==null)return undefined;const a=array(v,2,-1e6,1e6,'输入范围');if(a[1]<=a[0])throw Error('输入范围无效');return a;};
    return {title:String(lut.title||'').slice(0,200),base:BASES.includes(lut.base)?lut.base:'UNKNOWN',size1D:n1,size3D:n3,oneD:n1?new Float32Array(array(lut.oneD,n1*3,-1e6,1e6,'1D 数据')):null,threeD:n3?new Float32Array(array(lut.threeD,n3**3*3,-1e6,1e6,'3D 数据')):null,domainMin:lo,domainMax:hi,range1D:range(lut.range1D),range3D:range(lut.range3D)};
  }
  const RANGES={exposure:[-4,4],temperature:[-100,100],tint:[-100,100],brightness:[-100,100],contrast:[-100,100],pivot:[.1,.9],highlights:[-100,100],shadows:[-100,100],whites:[-100,100],blacks:[-100,100],gamma:[.2,3],fade:[0,100],saturation:[-100,100],vibrance:[-100,100],hue:[-180,180],monochrome:[0,100],inputBlack:[0,.49],inputWhite:[.51,1],outputBlack:[0,.49],outputWhite:[.51,1],amount:[0,100],balance:[-100,100]};
  function settings(p){
    if(!p||p.format!=='lut-lab-editor'||p.version!==1)throw Error('不是受支持的 LUT 编辑工程');if(!BASES.includes(p.inputBase))throw Error('输入基底无效');
    const g=p.grade,d=defaults();if(!g||typeof g!=='object')throw Error('缺少调色参数');for(const [k,[min,max]]of Object.entries(RANGES))d[k]=finite(g[k],min,max,k);
    d.monoWeights=array(g.monoWeights,3,0,2,'黑白混合');if(d.monoWeights.every(x=>x===0))throw Error('黑白混合权重不能全为 0');
    for(const k of ['lift','gamma','gain','offset'])d.primaries[k]=array(g.primaries?.[k],3,k==='gamma'?.2:k==='gain'?0:-1,k==='gamma'?3:k==='gain'?3:1,'一级调色 '+k);
    if(!Array.isArray(g.mixer)||g.mixer.length!==3)throw Error('通道混合矩阵无效');d.mixer=g.mixer.map(r=>array(r,3,-2,2,'通道混合'));
    if(!Array.isArray(g.hsl)||g.hsl.length!==8||!Array.isArray(g.wheels)||g.wheels.length!==3)throw Error('分区调色参数无效');
    d.hsl=g.hsl.map(v=>({h:finite(v.h,-45,45,'HSL 色相'),s:finite(v.s,-100,100,'HSL 饱和'),l:finite(v.l,-100,100,'HSL 明度')}));d.wheels=g.wheels.map(v=>({h:finite(v.h,0,360,'调色色相'),s:finite(v.s,0,100,'调色浓度'),l:finite(v.l,-100,100,'调色明度')}));
    const cv={};for(const k of ['master','r','g','b']){const points=p.curves?.[k];if(!Array.isArray(points)||points.length<2||points.length>16)throw Error('曲线需要 2–16 个控制点');cv[k]=points.map(v=>array(v,2,0,1,'曲线点'));if(cv[k][0][0]!==0||cv[k].at(-1)[0]!==1||cv[k].some((v,i)=>i&&v[0]-cv[k][i-1][0]<.001))throw Error('曲线横坐标必须从 0 到 1 且递增');}
    return {format:p.format,version:1,name:String(p.name||'未命名 LUT').slice(0,80),description:String(p.description||'').slice(0,200),filename:String(p.filename||'LUT00001').slice(0,32),inputBase:p.inputBase,grade:d,curves:cv};
  }
  function validate(p){const value=settings(p),s=p.source;if(!s||!BASES.includes(s.base))throw Error('源输入基底无效');const o=s.options||{};if(!['direct','vlog','flog2'].includes(o.adapt))throw Error('源转换无效');if(!['tetrahedral','trilinear'].includes(o.interpolation))throw Error('源插值无效');return {...value,source:{base:s.base,lut:pack(unpack(s.lut)),pre:pack(unpack(s.pre)),options:{strength:finite(o.strength,0,1,'源强度'),exposure:finite(o.exposure,-3,3,'源曝光'),adapt:o.adapt,interpolation:o.interpolation}}};}
  function compileSource(source){return {...source,lut:unpack(source.lut),pre:unpack(source.pre)};}
  function curveTable(points){
    // Shape-preserving cubic Hermite interpolation; endpoints are never extrapolated.
    const n=points.length,h=[],delta=[],m=Array(n).fill(0);for(let i=0;i<n-1;i++){h[i]=points[i+1][0]-points[i][0];delta[i]=(points[i+1][1]-points[i][1])/h[i];}
    if(n===2)m[0]=m[1]=delta[0];else{m[0]=((2*h[0]+h[1])*delta[0]-h[0]*delta[1])/(h[0]+h[1]);m[n-1]=((2*h[n-2]+h[n-3])*delta[n-2]-h[n-2]*delta[n-3])/(h[n-2]+h[n-3]);for(let i=1;i<n-1;i++){if(delta[i-1]*delta[i]<=0)m[i]=0;else{const w1=2*h[i]+h[i-1],w2=h[i]+2*h[i-1];m[i]=(w1+w2)/(w1/delta[i-1]+w2/delta[i]);}}for(const i of [0,n-1]){const d=i?delta[n-2]:delta[0];if(m[i]*d<0)m[i]=0;else if(Math.abs(m[i])>Math.abs(3*d))m[i]=3*d;}}
    const table=new Float32Array(1025);let j=0;for(let k=0;k<=1024;k++){const x=k/1024;while(j<n-2&&x>points[j+1][0])j++;const t=(x-points[j][0])/h[j],t2=t*t,t3=t2*t;table[k]=clamp((2*t3-3*t2+1)*points[j][1]+(t3-2*t2+t)*h[j]*m[j]+(-2*t3+3*t2)*points[j+1][1]+(t3-t2)*h[j]*m[j+1]);}return table;
  }
  const curve=(table,x)=>{const v=clamp(x)*1024,i=Math.min(1023,Math.floor(v)),f=v-i;return table[i]+(table[i+1]-table[i])*f;};
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
  const luma=v=>v[0]*.2126+v[1]*.7152+v[2]*.0722;
  function rgbToHsl(rgb){const max=Math.max(...rgb),min=Math.min(...rgb),d=max-min,l=(max+min)/2;let h=0,s=0;if(d){s=d/(1-Math.abs(2*l-1));h=max===rgb[0]?((rgb[1]-rgb[2])/d)%6:max===rgb[1]?(rgb[2]-rgb[0])/d+2:(rgb[0]-rgb[1])/d+4;h=(h*60+360)%360;}return [h,s,l];}
  function hslToRgb([h,s,l]){h=((h%360)+360)%360;const a=s*Math.min(l,1-l);return [0,8,4].map(n=>{const k=(n+h/30)%12;return l-a*Math.max(-1,Math.min(k-3,9-k,1));});}
  function compile(p,source){
    const s=settings(p),g=s.grade,cv=Object.fromEntries(Object.entries(s.curves).map(([k,v])=>[k,curveTable(v)])),src=source||compileSource(validate(p).source);
    if(s.inputBase!==src.base&&src.base!=='UNKNOWN')convert([.3,.4,.5],s.inputBase,src.base);
    const gains=[Math.exp(g.temperature*.003),Math.exp(-g.tint*.003),Math.exp(-g.temperature*.003)],gainNorm=luma(gains);
    const wheelColors=g.wheels.map(v=>{const c=hslToRgb([v.h,1,.5]),y=luma(c);return c.map(k=>(k-y)*v.s/100*.28);});
    return rgb=>{
      const input=s.inputBase===src.base||src.base==='UNKNOWN'?rgb:convert(rgb,s.inputBase,src.base);
      const transformed=C.transform(input,src.lut,src.options,src.pre),origin=transformed.map(x=>clamp(x));let v=(!src.lut&&!src.pre?transformed:origin).slice();
      if(g.exposure||g.temperature||g.tint)v=v.map((x,i)=>C.encodeSRGB(C.linearize(x)*2**g.exposure*gains[i]/gainNorm));
      const y=clamp(luma(v)),ws=1-smooth(.05,.65,y),wh=smooth(.35,.95,y),offset=g.brightness*.002+g.shadows*.0025*ws+g.highlights*.0025*wh+g.blacks*.002*(1-y)**3+g.whites*.002*y**3;
      v=v.map((x,i)=>{let t=(x-g.inputBlack)/(g.inputWhite-g.inputBlack);t=g.pivot+(t-g.pivot)*2**(g.contrast/65)+offset;t=clamp(t+g.primaries.lift[i]*(1-t)+g.primaries.offset[i]);t=t**(1/(g.gamma*g.primaries.gamma[i]))*g.primaries.gain[i];t=t*(1-g.fade*.0025)+g.fade*.001;return g.outputBlack+(g.outputWhite-g.outputBlack)*t;});
      v=v.map((x,i)=>curve(cv[['r','g','b'][i]],curve(cv.master,x)));v=mul(g.mixer,v).map(x=>clamp(x));
      let [h,sat,l]=rgbToHsl(v),dh=0,ds=0,dl=0,total=0;
      for(let i=0;i<8;i++){const distance=Math.abs(((h-HUES[i]+540)%360)-180),weight=Math.max(0,1-distance/45)**2;total+=weight;dh+=g.hsl[i].h*weight;ds+=g.hsl[i].s*weight;dl+=g.hsl[i].l*weight;}
      const normal=Math.max(1,total);h+=g.hue+dh/normal;sat=clamp(sat*Math.max(0,1+g.saturation/100+ds/normal/100)*(1+g.vibrance/100*(1-sat)));l=clamp(l+dl/normal*.005);v=hslToRgb([h,sat,l]);
      const wl=clamp(luma(v)),balance=g.balance*.0015,w0=1-smooth(.08+balance,.65+balance,wl),w2=smooth(.35+balance,.92+balance,wl),w1=Math.max(0,1-w0-w2);
      v=v.map((x,c)=>x+[w0,w1,w2].reduce((sum,w,i)=>sum+w*(wheelColors[i][c]+g.wheels[i].l*.002),0));
      const sum=g.monoWeights.reduce((a,b)=>a+b,0),gray=v.reduce((a,k,i)=>a+k*g.monoWeights[i]/sum,0);v=v.map(x=>x+(gray-x)*g.monochrome/100);
      return v.map((x,i)=>clamp(origin[i]+(x-origin[i])*g.amount/100));
    };
  }
  function exportProfile(p,mode='generic'){
    let base=p.inputBase;if(mode==='panasonic'){if(base==='UNKNOWN')throw Error('请先确认 LUT 输入基底，未知编码不能导出到机身。');if(base==='FLOG2')base='VLOG';if(!['STD','VLOG','CNED2','MONO'].includes(base))throw Error('该输入基底不受此松下导出配置支持。');}
    return {base,adapt:base===p.inputBase?null:{from:base,to:p.inputBase},note:p.inputBase==='FLOG2'&&mode==='panasonic'?'已将 V-Log / V-Gamut → F-Log2 / F-Gamut 转换烘焙进 LUT；机身使用 V-Log。':''};
  }
  function bake(p,{size=33,mode='generic',source}={}){
    if(![17,33,65].includes(size)||mode==='panasonic'&&size!==33)throw Error('松下导出必须为 33³ 网格');
    const profile=exportProfile(p,mode),fn=compile(p,source),data=new Float32Array(size**3*3);let index=0;
    for(let b=0;b<size;b++)for(let g=0;g<size;g++)for(let r=0;r<size;r++){let input=[r/(size-1),g/(size-1),b/(size-1)];if(profile.adapt)input=convert(input,profile.adapt.from,profile.adapt.to);const value=fn(input);for(let c=0;c<3;c++){if(!Number.isFinite(value[c]))throw Error('调色结果包含非有限数');data[index++]=clamp(value[c]);}}
    return {title:p.name,base:profile.base,size1D:0,size3D:size,oneD:null,threeD:data,domainMin:[0,0,0],domainMax:[1,1,1],min:0,max:1,warnings:[]};
  }
  function cube(lut){if(lut.size1D||lut.size3D!==33||lut.threeD.length!==33**3*3)throw Error('保存与导出需要完整 33³ LUT');const title=String(lut.title).replace(/[\r\n\x00-\x1f"\\]/g,' ').slice(0,80);const rows=[`TITLE "${title}"`,`#LUMIXPHOTOSTYLE ${lut.base}`,'# LUT LAB - full-range 33-grid 3D LUT','LUT_3D_SIZE 33','DOMAIN_MIN 0.0 0.0 0.0','DOMAIN_MAX 1.0 1.0 1.0'];for(let i=0;i<lut.threeD.length;i+=3)rows.push([0,1,2].map(c=>{const n=lut.threeD[i+c];if(!Number.isFinite(n)||n<0||n>1)throw Error('导出输出必须为 0–1 有限数');return n.toFixed(7);}).join(' '));return rows.join('\n')+'\n';}
  function cameraFilename(name){if(!/^[A-Za-z0-9]{1,8}$/.test(name))throw Error('机身文件名请用 1–8 位英文字母或数字，不含扩展名。');return name.toUpperCase()+'.cube';}
  const api={BASES,HUES,RANGES,defaults,curves,project,settings,validate,pack,unpack,compileSource,curveTable,convert,compile,bake,cube,exportProfile,cameraFilename};root.LUTEditCore=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:self);
