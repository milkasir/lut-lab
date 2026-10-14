/* Public images are decoded and re-encoded; source bytes never enter the publisher. */
(function(root){
  'use strict';
  const ascii=(b,start,end)=>String.fromCharCode(...b.subarray(start,end));
  function metadata(bytes){
    const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes),tags=new Set();
    if(b[0]===255&&b[1]===216){
      let p=2;
      while(p+4<=b.length){if(b[p++]!==255)break;while(b[p]===255)p++;const marker=b[p++];if(marker===218||marker===217)break;if(marker===1||(marker>=208&&marker<=215))continue;const n=(b[p]<<8)|b[p+1];if(n<2||p+n>b.length)break;
        if(marker===225){const header=ascii(b,p+2,Math.min(p+n,p+45));tags.add(header.startsWith('Exif')?'EXIF / GPS':header.includes('xmp')?'XMP':'APP1 附加信息');}
        if(marker===237)tags.add('IPTC');if(marker===254)tags.add('注释');p+=n;
      }
    }else if(ascii(b,1,4)==='PNG'){
      const v=new DataView(b.buffer,b.byteOffset,b.byteLength);let p=8;
      while(p+12<=b.length){const n=v.getUint32(p),kind=ascii(b,p+4,p+8);if(n>b.length-p-12)break;if(kind==='eXIf')tags.add('EXIF / GPS');if(['tEXt','zTXt','iTXt'].includes(kind))tags.add('文本 / XMP');p+=n+12;}
    }else if(ascii(b,0,4)==='RIFF'&&ascii(b,8,12)==='WEBP'){
      const v=new DataView(b.buffer,b.byteOffset,b.byteLength);let p=12;
      while(p+8<=b.length){const kind=ascii(b,p,p+4),n=v.getUint32(p+4,true);if(n>b.length-p-8)break;if(kind==='EXIF')tags.add('EXIF / GPS');if(kind==='XMP ')tags.add('XMP');p+=8+n+(n%2);}
    }
    return [...tags];
  }
  async function sanitize(file){
    const source=new Uint8Array(await file.arrayBuffer()),found=metadata(source),url=URL.createObjectURL(file);
    try{
      const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('图片无法解码'));img.src=url;});
      if(image.naturalWidth*image.naturalHeight>60_000_000)throw new Error('图片超过 6000 万像素');
      const scale=Math.min(1,3200/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
      const ctx=canvas.getContext('2d');if(!ctx)throw new Error('无法清理图片');ctx.drawImage(image,0,0,canvas.width,canvas.height);
      const jpeg=/\.jpe?g$/i.test(file.name),type=jpeg?'image/jpeg':'image/png',ext=jpeg?'jpg':'png',blob=await new Promise(resolve=>canvas.toBlob(resolve,type,.94));if(!blob)throw new Error('图片清理失败');
      const bytes=new Uint8Array(await blob.arrayBuffer());if(metadata(bytes).length)throw new Error('清理后仍检测到附加信息，图片未加入待发布列表');
      const small=document.createElement('canvas'),s=Math.min(1,300/canvas.width,180/canvas.height);small.width=Math.max(1,Math.round(canvas.width*s));small.height=Math.max(1,Math.round(canvas.height*s));const t=small.getContext('2d');t.fillStyle='#20261f';t.fillRect(0,0,small.width,small.height);t.drawImage(canvas,0,0,small.width,small.height);const thumb=await new Promise(resolve=>small.toBlob(resolve,'image/jpeg',.85));if(!thumb)throw new Error('缩略图生成失败');
      return {bytes,ext,width:canvas.width,height:canvas.height,thumb:new Uint8Array(await thumb.arrayBuffer()),preview:small.toDataURL('image/jpeg',.85),removed:found};
    }finally{URL.revokeObjectURL(url);}
  }
  const api={metadata,sanitize};root.LUTImagePrivacy=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:self);
