const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/theme.js'),'utf8');
function page({saved,light=true,blocked=false}={}){
  const root={dataset:{},style:{}},meta={},button={setAttribute(k,v){this[k]=v;},addEventListener(k,fn){this[k]=fn;}},handlers={},media={matches:light,addEventListener(k,fn){this[k]=fn;}},writes=[];let mounted=false;
  const context={document:{documentElement:root,querySelector:()=>meta,getElementById:()=>mounted?button:null,addEventListener(k,fn){handlers[k]=fn;}},matchMedia:()=>media,localStorage:{getItem(){if(blocked)throw Error('Unavailable');return saved;},setItem(k,v){if(blocked)throw Error('Unavailable');writes.push([k,v]);}},window:{}};
  vm.runInNewContext(source,context);return {root,meta,button,writes,media,mount(){mounted=true;handlers.DOMContentLoaded();}};
}
test('saved appearance is applied before controls mount and survives system preference differences',()=>{
  const p=page({saved:'dark',light:true});assert.equal(p.root.dataset.theme,'dark');assert.equal(p.meta.content,'#161b19');p.mount();assert.equal(p.button['aria-label'],'切换到浅色模式');p.button.click();assert.equal(p.root.dataset.theme,'light');assert.equal(p.button['aria-label'],'切换到深色模式');assert.deepEqual(p.writes,[['lut-lab-theme','light']]);
});
test('system appearance follows changes until the user chooses a theme',()=>{
  const p=page({light:true});assert.equal(p.root.dataset.theme,'light');p.mount();p.media.change({matches:false});assert.equal(p.root.dataset.theme,'dark');p.button.click();assert.equal(p.root.dataset.theme,'light');p.media.change({matches:false});assert.equal(p.root.dataset.theme,'light');
});
test('blocked storage and invalid saved preferences still allow theme switching',()=>{
  for(const config of [{blocked:true,light:true},{saved:'unexpected',light:true}]){const p=page(config);assert.equal(p.root.dataset.theme,'light');p.mount();assert.doesNotThrow(()=>p.button.click());assert.equal(p.root.dataset.theme,'dark');}
});
