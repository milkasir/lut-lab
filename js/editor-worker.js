'use strict';
importScripts('lut-core.js','lut-edit-core.js?v=editor-1');
let source=null;
self.onmessage=({data})=>{try{
  if(data.type==='source'){source=LUTEditCore.compileSource(data.source);self.postMessage({id:data.id,result:true});return;}
  if(data.type==='bake'){if(!source)throw Error('源 LUT 尚未载入');const lut=LUTEditCore.bake(data.project,{size:data.size,mode:data.mode,source});self.postMessage({id:data.id,result:{lut,text:data.text?LUTEditCore.cube(lut):null}},[lut.threeD.buffer]);return;}
  throw Error('未知编辑任务');
}catch(error){self.postMessage({id:data.id,error:error.message});}};
