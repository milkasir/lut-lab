'use strict';
(function () {
  const workerURL = new URL('lut-worker.js', document.currentScript.src);
  const fragment = `#version 300 es
  precision highp float;
  precision highp sampler3D;
  in vec2 uv;
  out vec4 outColor;
  uniform sampler2D imageTex, main1, pre1;
  uniform sampler3D main3, pre3;
  uniform int mn1, mn3, pn1, pn3, interp, adapt;
  uniform vec3 mlo1, mhi1, mlo3, mhi3, plo1, phi1, plo3, phi3;
  uniform float strength, exposure;
  vec3 read3(sampler3D tex, ivec3 p) { return texelFetch(tex,p,0).rgb; }
  vec3 cube(sampler3D tex, vec3 rgb, int n, vec3 lo, vec3 hi) {
    if(n==0) return rgb;
    vec3 p=clamp((rgb-lo)/(hi-lo),0.0,1.0)*float(n-1);
    ivec3 a=min(ivec3(floor(p)),ivec3(n-2)); vec3 f=p-vec3(a);
    vec3 c0=read3(tex,a), c7=read3(tex,a+ivec3(1));
    if(interp==1) {
      vec3 c00=mix(c0,read3(tex,a+ivec3(1,0,0)),f.x);
      vec3 c10=mix(read3(tex,a+ivec3(0,1,0)),read3(tex,a+ivec3(1,1,0)),f.x);
      vec3 c01=mix(read3(tex,a+ivec3(0,0,1)),read3(tex,a+ivec3(1,0,1)),f.x);
      vec3 c11=mix(read3(tex,a+ivec3(0,1,1)),c7,f.x);
      return mix(mix(c00,c10,f.y),mix(c01,c11,f.y),f.z);
    }
    ivec3 o1, o2; vec3 w;
    if(f.x>=f.y) {
      if(f.y>=f.z) { o1=ivec3(1,0,0);o2=ivec3(1,1,0);w=f.xyz; }
      else if(f.x>=f.z) { o1=ivec3(1,0,0);o2=ivec3(1,0,1);w=f.xzy; }
      else { o1=ivec3(0,0,1);o2=ivec3(1,0,1);w=f.zxy; }
    } else {
      if(f.x>=f.z) { o1=ivec3(0,1,0);o2=ivec3(1,1,0);w=f.yxz; }
      else if(f.y>=f.z) { o1=ivec3(0,1,0);o2=ivec3(0,1,1);w=f.yzx; }
      else { o1=ivec3(0,0,1);o2=ivec3(0,1,1);w=f.zyx; }
    }
    vec3 c1=read3(tex,a+o1),c2=read3(tex,a+o2);
    return c0+w.x*(c1-c0)+w.y*(c2-c1)+w.z*(c7-c2);
  }
  vec3 one(sampler2D tex, vec3 rgb, int n, vec3 lo, vec3 hi) {
    if(n==0) return rgb;
    vec3 p=clamp((rgb-lo)/(hi-lo),0.0,1.0)*float(n-1);
    ivec3 a=ivec3(floor(p)), b=min(a+ivec3(1),ivec3(n-1)); vec3 f=p-vec3(a);
    return vec3(mix(texelFetch(tex,ivec2(a.x,0),0).r,texelFetch(tex,ivec2(b.x,0),0).r,f.x),
      mix(texelFetch(tex,ivec2(a.y,0),0).g,texelFetch(tex,ivec2(b.y,0),0).g,f.y),
      mix(texelFetch(tex,ivec2(a.z,0),0).b,texelFetch(tex,ivec2(b.z,0),0).b,f.z));
  }
  vec3 linearize(vec3 x) { return mix(pow((x+0.055)/1.055,vec3(2.4)),x/12.92,lessThanEqual(x,vec3(0.04045))); }
  vec3 srgb(vec3 x) { return mix(1.055*pow(max(x,vec3(0)),vec3(1.0/2.4))-0.055,12.92*x,lessThanEqual(x,vec3(0.0031308))); }
  float vlog(float x) { return x<0.01?5.6*x+0.125:0.241514*log(x+0.00873)/log(10.0)+0.598206; }
  float flog(float x) { return x<0.000889?8.799461*x+0.092864:0.245281*log(5.555556*x+0.064829)/log(10.0)+0.384316; }
  void main() {
    vec4 source=texture(imageTex,uv);vec3 rgb=source.rgb;
    if(exposure!=0.0 || adapt!=0) {
      vec3 lin=linearize(rgb)*exp2(exposure);
      if(adapt==1) {
        mat3 fromV=mat3(1.806576,-0.170090,-0.025206,-0.695697,1.305955,-0.154468,-0.110879,-0.135865,1.179674);
        lin=max(inverse(fromV)*lin,vec3(0));rgb=vec3(vlog(lin.r),vlog(lin.g),vlog(lin.b));
      } else if(adapt==2) {
        mat3 toF=mat3(0.627404,0.069097,0.016391,0.329283,0.919540,0.088013,0.043313,0.011363,0.895596);
        lin=max(toF*lin,vec3(0));rgb=vec3(flog(lin.r),flog(lin.g),flog(lin.b));
      } else rgb=srgb(lin);
    }
    rgb=cube(pre3,one(pre1,rgb,pn1,plo1,phi1),pn3,plo3,phi3);
    rgb=cube(main3,one(main1,rgb,mn1,mlo1,mhi1),mn3,mlo3,mhi3);
    outColor=vec4(clamp(mix(source.rgb,rgb,strength),0.0,1.0),source.a);
  }`;
  class LUTRenderer {
    constructor() {
      this.canvas = document.createElement('canvas'); this.cache = new Map(); this.pending = new Map(); this.seq = 0;
      try {
        this.worker = new Worker(workerURL);
        this.worker.onmessage = ({data}) => { const p = this.pending.get(data.id); if (!p) return; this.pending.delete(data.id); data.error ? p.reject(new Error(data.error)) : p.resolve(data.result); };
        this.worker.onerror = () => { for (const p of this.pending.values()) p.reject(new Error('后台计算不可用')); this.pending.clear(); this.worker.terminate(); this.worker = null; };
      } catch (_) { this.worker = null; }
      try { this.initGL(); } catch (_) { this.gl = null; }
      this.canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.gl = null; this.cache.clear(); });
    }
    job(data) {
      return new Promise((resolve, reject) => { const id = ++this.seq; this.pending.set(id, {resolve,reject}); this.worker.postMessage({...data,id}); });
    }
    async parse(text, filename) { return this.worker ? this.job({type:'parse',text,filename}) : LUTCore.parseCube(text, filename); }
    initGL() {
      const gl = this.canvas.getContext('webgl2', {alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true,antialias:false});
      if (!gl) throw new Error('WebGL2 unavailable');
      const shader = (type, text) => { const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));return s; };
      const vs=shader(gl.VERTEX_SHADER, `#version 300 es\nin vec2 pos;out vec2 uv;void main(){gl_Position=vec4(pos,0,1);uv=vec2((pos.x+1.0)*0.5,(1.0-pos.y)*0.5);}`);
      const fs=shader(gl.FRAGMENT_SHADER,fragment), p=gl.createProgram();gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);
      if (!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(p);this.program=p;this.gl=gl;
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const loc=gl.getAttribLocation(p,'pos');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);gl.disable(gl.DITHER);
      this.imageTex=this.makeTexture(gl.TEXTURE_2D);this.dummy1=this.makeTexture(gl.TEXTURE_2D);this.dummy3=this.makeTexture(gl.TEXTURE_3D);
      gl.bindTexture(gl.TEXTURE_2D,this.dummy1);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,1,1,0,gl.RGBA,gl.FLOAT,new Float32Array([0,0,0,1]));
      gl.bindTexture(gl.TEXTURE_3D,this.dummy3);gl.texImage3D(gl.TEXTURE_3D,0,gl.RGBA32F,1,1,1,0,gl.RGBA,gl.FLOAT,new Float32Array([0,0,0,1]));
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);
    }
    makeTexture(target) { const gl=this.gl,t=gl.createTexture();gl.bindTexture(target,t);gl.texParameteri(target,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(target,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(target,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(target,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);if(target===gl.TEXTURE_3D) gl.texParameteri(target,gl.TEXTURE_WRAP_R,gl.CLAMP_TO_EDGE);return t; }
    textures(lut) {
      if (!lut) return {one:this.dummy1,three:this.dummy3};
      if (this.cache.has(lut)) { const value=this.cache.get(lut);this.cache.delete(lut);this.cache.set(lut,value);return value; }
      const gl=this.gl, rgba=arr=>{const r=new Float32Array(arr.length/3*4);for(let i=0,j=0;i<arr.length;i+=3,j+=4){r[j]=arr[i];r[j+1]=arr[i+1];r[j+2]=arr[i+2];r[j+3]=1;}return r;};
      const max=gl.getParameter(gl.MAX_TEXTURE_SIZE);
      if (lut.size1D>max || lut.size3D>gl.getParameter(gl.MAX_3D_TEXTURE_SIZE)) throw new Error('LUT 超过 GPU 纹理尺寸，使用 CPU');
      const t={one:this.dummy1,three:this.dummy3};
      if(lut.size1D){t.one=this.makeTexture(gl.TEXTURE_2D);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,lut.size1D,1,0,gl.RGBA,gl.FLOAT,rgba(lut.oneD));}
      if(lut.size3D){t.three=this.makeTexture(gl.TEXTURE_3D);gl.texImage3D(gl.TEXTURE_3D,0,gl.RGBA32F,lut.size3D,lut.size3D,lut.size3D,0,gl.RGBA,gl.FLOAT,rgba(lut.threeD));}
      this.cache.set(lut,t);
      if(this.cache.size>8){const oldest=this.cache.keys().next().value,old=this.cache.get(oldest);if(old.one!==this.dummy1)gl.deleteTexture(old.one);if(old.three!==this.dummy3)gl.deleteTexture(old.three);this.cache.delete(oldest);}
      return t;
    }
    renderGPU(source,lut,options,preLut) {
      const gl=this.gl,p=this.program;this.canvas.width=source.width;this.canvas.height=source.height;gl.viewport(0,0,source.width,source.height);gl.useProgram(p);
      const u=(name)=>gl.getUniformLocation(p,name), i=(name,v)=>gl.uniform1i(u(name),v), f=(name,v)=>gl.uniform1f(u(name),v), v=(name,x)=>gl.uniform3fv(u(name),x);
      const bind=(name,texture,target,unit)=>{gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(target,texture);i(name,unit);};
      const m=this.textures(lut),pre=this.textures(preLut);
      bind('imageTex',this.imageTex,gl.TEXTURE_2D,0);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
      bind('main1',m.one,gl.TEXTURE_2D,1);bind('main3',m.three,gl.TEXTURE_3D,2);bind('pre1',pre.one,gl.TEXTURE_2D,3);bind('pre3',pre.three,gl.TEXTURE_3D,4);
      const ranges=(prefix,l)=>{
        i(prefix+'n1',l?.size1D||0);i(prefix+'n3',l?.size3D||0);
        for(const stage of [1,3]){const range=l?.['range'+stage+'D'];v(prefix+'lo'+stage,range?[range[0],range[0],range[0]]:l?.domainMin||[0,0,0]);v(prefix+'hi'+stage,range?[range[1],range[1],range[1]]:l?.domainMax||[1,1,1]);}
      };
      ranges('m',lut);ranges('p',preLut);i('interp',options.interpolation==='trilinear'?1:0);i('adapt',options.adapt==='vlog'?1:options.adapt==='flog2'?2:0);f('strength',options.strength??1);f('exposure',options.exposure||0);
      gl.drawArrays(gl.TRIANGLES,0,6);
      if(gl.getError()!==gl.NO_ERROR) throw new Error('GPU 绘制失败');
      const output=document.createElement('canvas');output.width=source.width;output.height=source.height;output.getContext('2d').drawImage(this.canvas,0,0);return output;
    }
    async render(source,lut,options={},preLut=null) {
      if(this.gl){try{return this.renderGPU(source,lut,options,preLut);}catch(_){/* Per-render CPU fallback also handles very large 1D LUTs. */}}
      const ctx=source.getContext('2d',{willReadFrequently:true}),pixels=ctx.getImageData(0,0,source.width,source.height).data;
      let output;
      if(this.worker) output=await this.job({type:'render',pixels,lut,options,preLut});
      else {output=new Uint8ClampedArray(pixels.length);for(let offset=0;offset<pixels.length;offset+=65536){output.set(LUTCore.renderPixels(pixels.subarray(offset,offset+65536),lut,options,preLut),offset);await new Promise(resolve=>setTimeout(resolve,0));}}
      const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;canvas.getContext('2d').putImageData(new ImageData(output,source.width,source.height),0,0);return canvas;
    }
  }
  window.LUTRenderer=LUTRenderer;
})();
