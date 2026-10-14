const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {metadata}=require('../js/image-privacy.js');
test('detects EXIF and XMP JPEG segments before pixel data',()=>{
  const segment=(m,text)=>{const data=Buffer.from(text);return Buffer.concat([Buffer.from([255,m,(data.length+2)>>8,(data.length+2)&255]),data]);};
  const bytes=Buffer.concat([Buffer.from([255,216]),segment(225,'Exif\0\0GPS fixture'),segment(225,'http://ns.adobe.com/xap/1.0/\0xmp'),segment(237,'IPTC'),Buffer.from([255,218])]);
  assert.deepEqual(metadata(bytes),['EXIF / GPS','XMP','IPTC']);assert.deepEqual(metadata(Buffer.from([255,216,255,218])),[]);
});
test('detects PNG metadata chunks and WebP metadata blocks',()=>{
  function chunk(kind,text){const b=Buffer.from(text),header=Buffer.alloc(8);header.writeUInt32BE(b.length);header.write(kind,4);return Buffer.concat([header,b,Buffer.alloc(4)]);}
  const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('eXIf','GPS'),chunk('iTXt','XMP')]);assert.deepEqual(metadata(png),['EXIF / GPS','文本 / XMP']);
  const webp=Buffer.alloc(22);webp.write('RIFF');webp.write('WEBP',8);webp.write('EXIF',12);webp.writeUInt32LE(2,16);assert.deepEqual(metadata(webp),['EXIF / GPS']);
  assert.deepEqual(metadata(png.subarray(0,11)),[]);
});
test('all bundled public images are free of personal metadata chunks',()=>{
  const dir=path.join(__dirname,'../assets/images');for(const name of fs.readdirSync(dir).filter(n=>/\.(jpg|png)$/i.test(n)))assert.deepEqual(metadata(fs.readFileSync(path.join(dir,name))),[],name);
});
