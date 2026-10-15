'use strict';
(async function () {
  const $ = id => document.getElementById(id);
  const icon = LUTUI.icon;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let publicCatalog={luts:window.LUT_CATALOG,images:window.IMAGE_CATALOG},initialCatalogError=false;
  try{publicCatalog=await LUTPublicCatalog.load();}catch(_){initialCatalogError=true;}
  const engine = new LUTRenderer();
  const luts = publicCatalog.luts.map(x=>({...x})), images = publicCatalog.images.map(x=>({...x}));
  const parsed = new Map(), imageCache = new Map(), selected = new Set();
  let favorites = new Set(), activeImage = images[0].id, mode = 'grid', columns = 'auto', paneSeq = 0, toastTimer, zoomState, exporting = false;
  let panes = [], renderPending = 0, dragDepth = 0, lastImportMessages = [];
  try { favorites = new Set(JSON.parse(localStorage.getItem('lut-lab-favorites') || '[]')); } catch (_) {}
  const lutById = id => luts.find(x=>x.id===id), imageById = id => images.find(x=>x.id===id);
  const assetURL=(item,path=item.path)=>{if(item.uploaded||!item.sha256)return path;const url=new URL(path,location.href);url.searchParams.set('v',item.sha256);return url.href;};
  const baseNames = {STD:'标准 / sRGB',VLOG:'V-Log',FLOG2:'F-Log2',CNED2:'Cinelike D2',MONO:'MONO / 单色格调',UNKNOWN:'输入未声明'};
  const adaptNames = {direct:'直接输入',vlog:'sRGB → V-Log',flog2:'sRGB → F-Log2'};
  const newPane = (lutId='original',imageId=activeImage) => ({id:++paneSeq,lutId,imageId,strength:1,adapt:'auto',preId:'none',expected:'auto',exposure:0,split:50,version:0,canvas:null,source:null,timer:null});
  const resolveAdapt = p => p.adapt==='auto'?(lutById(p.lutId)?.base==='FLOG2'&&imageById(p.imageId)?.base==='STD'?'flog2':'direct'):p.adapt;
  const signature = p => JSON.stringify([p.lutId,p.imageId,p.strength,resolveAdapt(p),p.preId,p.exposure,$('interpolation').value]);
  const paneObserver = typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{for(const entry of entries){const p=panes.find(x=>x.id===Number(entry.target.dataset.pane));if(!p)continue;if(entry.isIntersecting)renderPane(p);else if(p.canvas||p.requestedSignature){++p.version;clearTimeout(p.timer);p.requestedSignature=null;p.canvas=null;p.source=null;p.renderSignature=null;entry.target.querySelectorAll('canvas').forEach(c=>{c.width=1;c.height=1;});const state=entry.target.querySelector('.stage-state');state.textContent='进入视野后载入预览';state.hidden=false;}}},{rootMargin:'500px'});
  function toast(message,error=false) { clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.toggle('error',error);$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,error?6500:3600); }
  function setRenderStatus(message='') { const status=$('renderStatus');status.textContent=message;status.hidden=!message; }
  function saveState() {
    try { localStorage.setItem('lut-lab-state',JSON.stringify({version:2,panes:panes.map(p=>({...recipePane(p)})),mode,columns,activeImage,imageMetadata:images.map(i=>({id:i.id,filename:i.filename,base:i.base})),interpolation:$('interpolation').value})); } catch (_) {}
  }
  function recipePane(p) { return {lutId:p.lutId,lutName:lutById(p.lutId)?.name||'原图',imageId:p.imageId,imageName:imageById(p.imageId)?.filename||'',strength:p.strength,adapt:p.adapt,preId:p.preId,preName:lutById(p.preId)?.name||'',expected:p.expected,exposure:p.exposure,split:p.split}; }
  function restoreState(state,report=false) {
    if(!state || !Array.isArray(state.panes)) throw new Error('方案缺少窗格配置');
    let missing=0;
    if(Array.isArray(state.imageMetadata))for(const data of state.imageMetadata){const image=imageById(data.id)||images.find(i=>i.filename===data.filename);if(image&&Object.hasOwn(baseNames,data.base))image.base=data.base;}
    panes=state.panes.map(x=>{
      let lut=lutById(x.lutId)||luts.find(l=>l.name===x.lutName),image=imageById(x.imageId)||images.find(i=>i.filename===x.imageName),pre=lutById(x.preId)||luts.find(l=>l.name===x.preName);
      if(!lut && x.lutId!=='original')missing++;if(!image)missing++;if(!pre && x.preId && x.preId!=='none')missing++;
      const p=newPane(lut?.id||'original',image?.id||images[0].id);
      p.strength=LUTCore.clamp(Number.isFinite(x.strength)?x.strength:1);p.adapt=['auto','direct','vlog','flog2'].includes(x.adapt)?x.adapt:'auto';if(state.version!==2&&lut?.inputVerified&&['direct','vlog'].includes(p.adapt))p.adapt='auto';p.exposure=LUTCore.clamp(Number.isFinite(x.exposure)?x.exposure:0,-3,3);p.preId=pre?.id||'none';p.expected=['auto','STD','VLOG','FLOG2','CNED2','MONO','UNKNOWN'].includes(x.expected)?x.expected:'auto';p.split=LUTCore.clamp(Number.isFinite(x.split)?x.split:50,0,100);return p;
    });
    mode=state.mode==='split'?'split':'grid';columns=['1','2','3','4','auto'].includes(String(state.columns))?String(state.columns):'auto';activeImage=imageById(state.activeImage)?.id||images[0].id;
    $('interpolation').value=state.interpolation==='trilinear'?'trilinear':'tetrahedral';
    if(report)toast(missing?`已载入方案；${missing} 项素材缺失，已使用原图或示例替代。请上传对应文件后重新载入。`:'已载入方案',!!missing);
  }
  function filteredLuts() { const q=$('lutSearch').value.trim().toLowerCase(),cat=$('categoryFilter').value,fav=$('favoritesFilter').getAttribute('aria-pressed')==='true';return luts.filter(l=>(!q||[l.name,l.cn,l.author,l.category,l.base,baseNames[l.base],l.description].join(' ').toLowerCase().includes(q))&&(!cat||l.category===cat)&&(!fav||favorites.has(l.id))); }
  function renderLibrary() {
    const list=filteredLuts();$('libraryCount').textContent=luts.length;$('selectedCount').textContent=`${selected.size} 已选`;
    $('selectVisible').checked=!!list.length&&list.every(l=>selected.has(l.id));$('selectVisible').indeterminate=list.some(l=>selected.has(l.id))&&!$('selectVisible').checked;
    $('lutList').innerHTML=list.length?list.map(l=>`<div class="lut-row ${selected.has(l.id)?'is-selected':''}"><input type="checkbox" data-select="${esc(l.id)}" ${selected.has(l.id)?'checked':''} aria-label="选择 ${esc(l.name)}"><button class="lut-name" data-detail="${esc(l.id)}" title="查看说明">${esc(l.name)}<span class="lut-sub ${l.base!=='STD'?'warn':''}">${esc(l.category)} · ${esc(baseNames[l.base]||l.base)}${l.ambiguous?' · 待核实':''}</span>${l.description?`<span class="lut-summary">${esc(l.description)}</span>`:''}</button><button class="favorite ${favorites.has(l.id)?'on':''}" data-favorite="${esc(l.id)}" aria-label="收藏 ${esc(l.name)}" aria-pressed="${favorites.has(l.id)}">${icon('star')}</button></div>`).join(''):'<p class="empty-list">没有找到匹配的 LUT。<br>试试其他关键词或取消筛选。</p>';
    $('compareSelected').disabled=!selected.size;
  }
  function refreshCategories() { const value=$('categoryFilter').value;$('categoryFilter').innerHTML='<option value="">全部风格</option>'+[...new Set(luts.map(l=>l.category))].map(c=>`<option>${esc(c)}</option>`).join('');$('categoryFilter').value=value; }
  function renderImages() {
    $('imageCount').textContent=String(images.length).padStart(2,'0');
    $('imageStrip').innerHTML=images.map(i=>`<div class="image-item ${i.id===activeImage?'active':''}" style="--thumb-ratio:${i.width&&i.height?i.width/i.height:1.5}"><button class="image-pick" data-image="${esc(i.id)}" aria-pressed="${i.id===activeImage}"><img src="${esc(assetURL(i,i.thumb||i.path))}" alt="${esc(i.name)}" loading="lazy"><span>${esc(i.name)}</span></button>${i.uploaded?`<button class="remove-image" data-remove-image="${esc(i.id)}" aria-label="移除 ${esc(i.name)}">${icon('close')}</button>`:''}</div>`).join('')+`<button class="image-add" id="stripUpload">${icon('plus')}<span>上传新图片</span></button>`;
    const i=imageById(activeImage);$('imageBase').value=i.base;$('selectedImageName').textContent=i.name;updateApplyState();
  }
  async function loadImage(id) {
    if(imageCache.has(id)){const p=imageCache.get(id);imageCache.delete(id);imageCache.set(id,p);return p;}
    const i=imageById(id);if(!i)throw new Error('图片已移除');
    const promise=new Promise((resolve,reject)=>{
      const img=new Image();img.onload=()=>{
        if(img.naturalWidth*img.naturalHeight>60_000_000){reject(new Error('图片超过 6000 万像素，请先缩小'));return;}
        const scale=Math.min(1,3200/Math.max(img.naturalWidth,img.naturalHeight));
        const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
        i.width=img.naturalWidth;i.height=img.naturalHeight;resolve(canvas);
      };img.onerror=()=>reject(new Error('图片无法解码，请使用 JPG / PNG / WebP / AVIF'));img.src=assetURL(i);
    });imageCache.set(id,promise);
    if(imageCache.size>6)imageCache.delete(imageCache.keys().next().value);
    try{return await promise;}catch(error){imageCache.delete(id);throw error;}
  }
  function resized(source,maxWidth=1600,maxHeight=1600) { const s=Math.min(1,maxWidth/source.width,maxHeight/source.height);const c=document.createElement('canvas');c.width=Math.max(1,Math.round(source.width*s));c.height=Math.max(1,Math.round(source.height*s));c.getContext('2d').drawImage(source,0,0,c.width,c.height);return c; }
  async function loadLut(id) {
    if(id==='original'||id==='none')return null;
    if(parsed.has(id))return parsed.get(id);
    const item=lutById(id);if(!item)throw new Error('LUT 已移除');
    const promise=(async()=>{
      let text=item.text;
      if(!text){const response=await fetch(assetURL(item));if(!response.ok)throw new Error(`LUT 加载失败 (${response.status})`);text=await response.text();}
      const result=await engine.parse(text,item.filename);item.grid=result.size3D||result.size1D;item.parseInfo=result;return result;
    })();parsed.set(id,promise);
    try{return await promise;}catch(error){parsed.delete(id);throw error;}
  }
  const lutOptions = (value,original=true) => (original?'<option value="original">原图 · 未应用 LUT</option>':'<option value="none">无前置 LUT</option>')+luts.map(l=>`<option value="${esc(l.id)}" ${l.id===value?'selected':''}>${esc(l.name)}${l.base!=='STD'?' ['+(baseNames[l.base]||l.base)+']':''}</option>`).join('');
  const imageOptions = value => images.map(i=>`<option value="${esc(i.id)}" ${i.id===value?'selected':''}>${esc(i.name)}</option>`).join('');
  function compatibility(p) {
    const item=lutById(p.lutId),image=imageById(p.imageId);if(!item)return {text:'原图 · 保留图片原始显示值',warn:false};
    const target=p.expected==='auto'?item.base:p.expected;
    const adapt=resolveAdapt(p);
    if(adapt==='flog2'&&item.inputVerified&&target==='FLOG2'&&image.base==='STD'&&p.preId==='none')return {text:`F-Log2 输入已确认 · ${p.adapt==='auto'?'自动 ':''}sRGB → F-Log2`,warn:false};
    if(adapt!=='direct')return {text:`前置编码：${adaptNames[adapt]}${image.base!=='STD'?' · 当前图片不是标准输入':''}`,warn:true};
    if(p.preId!=='none')return {text:`已应用前置 LUT · 请核对转换的输出基底${item.ambiguous?' · 来源待核实':''}`,warn:true};
    if(target==='UNKNOWN'||image.base==='UNKNOWN')return {text:'可读取 · 输入编码未确认，请核对图片与 LUT',warn:true};
    if(target==='MONO'&&image.base!=='MONO')return {text:'输入不匹配：此 LUT 需要 MONO 单色格调；请使用匹配单色原片',warn:true};
    if(target==='MONO')return {text:'MONO 输入标记匹配 · 编码标签不会转换图片数值',warn:false};
    if(target!==image.base)return {text:`输入不匹配：${baseNames[image.base]} → ${baseNames[target]||target}；可实验转换 / 前置 LUT`,warn:true};
    return {text:`输入标记匹配 · ${baseNames[target]}${p.expected!=='auto'?'（手动指定）':''}`,warn:false};
  }
  function renderPanes() {
    for(const p of panes)clearTimeout(p.timer);
    LUTPicker.close();paneObserver?.disconnect();const previous=new Map([...$('paneGrid').children].map(el=>[el.dataset.pane,el]));
    $('paneTotal').textContent=panes.length;$('columnCount').value=columns;
    $('gridMode').classList.toggle('active',mode==='grid');$('splitMode').classList.toggle('active',mode==='split');$('gridMode').setAttribute('aria-pressed',mode==='grid');$('splitMode').setAttribute('aria-pressed',mode==='split');
    const count=columns==='auto'?(panes.length<=1?1:panes.length<=4?2:3):Number(columns);$('paneGrid').style.gridTemplateColumns=`repeat(${count}, minmax(0, 1fr))`;
    const template=document.createElement('template');template.innerHTML=panes.map((p,index)=>{
      const isOriginal=p.lutId==='original',status=compatibility(p);
      return `<article class="pane ${isOriginal?'pane-original':''}" data-pane="${p.id}"><div class="pane-top"><span class="pane-number">${String(index+1).padStart(2,'0')}</span><select class="pane-lut" data-field="lutId" aria-label="窗格 ${index+1} 的 LUT">${lutOptions(p.lutId)}</select><button class="icon-btn" data-action="detail" title="LUT 信息" aria-label="查看此 LUT 信息">${icon('info')}</button><button class="icon-btn" data-action="remove" title="移除窗格" aria-label="移除窗格 ${index+1}">${icon('close')}</button></div><div class="stage ${mode==='split'&&!isOriginal?'split':''}" role="button" tabindex="0" aria-label="放大窗格 ${index+1}，${esc(lutById(p.lutId)?.name||'原图')}"><canvas class="source-canvas" aria-hidden="true"></canvas><canvas class="result-canvas" aria-label="LUT 效果"></canvas><span class="stage-badge original-badge">原图</span><span class="stage-badge effect-badge">${isOriginal?'ORIGINAL':'LUT'}</span><span class="divider"></span><input class="stage-split" type="range" min="0" max="100" value="${p.split}" data-field="split" aria-label="窗格 ${index+1} 分割位置"><div class="stage-state">正在计算颜色…</div></div><div class="pane-controls"><select class="pane-image" data-field="imageId" aria-label="窗格 ${index+1} 的图片">${imageOptions(p.imageId)}</select><label class="intensity">强度<input type="range" min="0" max="100" value="${Math.round(p.strength*100)}" data-field="strength" ${isOriginal?'disabled':''} aria-label="窗格 ${index+1} LUT 强度"><output>${Math.round(p.strength*100)}%</output></label><p class="pane-note ${status.warn?'warn':''}" ${status.warn?'':'hidden'}>${esc(status.text)}</p><button class="pane-edit secondary" data-action="edit">${icon('edit')}复制到编辑器</button><details class="input-details"><summary>输入与转换</summary><div class="input-options"><label>前置输入转换<select data-field="adapt" aria-label="窗格 ${index+1} 输入转换" ${isOriginal?'disabled':''}><option value="auto" ${p.adapt==='auto'?'selected':''}>自动匹配 · F-Log2 标准输入自动转换</option><option value="direct" ${p.adapt==='direct'?'selected':''}>直接输入 · 匹配原片用此项</option><option value="vlog" ${p.adapt==='vlog'?'selected':''}>sRGB → V-Log / V-Gamut（实验）</option><option value="flog2" ${p.adapt==='flog2'?'selected':''}>sRGB → F-Log2 / F-Gamut（实验）</option></select></label><label>再应用前置 LUT<select data-field="preId" aria-label="窗格 ${index+1} 前置 LUT" ${isOriginal?'disabled':''}>${lutOptions(p.preId,false)}</select></label><label>LUT 期望输入（只影响匹配提示）<select data-field="expected" aria-label="窗格 ${index+1} LUT 期望输入">${[['auto','自动 · 使用文件标记'],['STD','标准 / sRGB'],['VLOG','V-Log'],['FLOG2','F-Log2'],['CNED2','Cinelike D2'],['MONO','MONO / 单色格调'],['UNKNOWN','未知']].map(([v,t])=>`<option value="${v}" ${p.expected===v?'selected':''}>${t}</option>`).join('')}</select></label><label>标准输入曝光偏移（EV）<span class="exposure-control"><input type="range" min="-3" max="3" step="0.1" value="${p.exposure}" data-field="exposure" ${isOriginal?'disabled':''} aria-label="窗格 ${index+1} 曝光偏移"><output>${p.exposure.toFixed(1)}</output></span></label><p class="input-hint">实验编码不能还原 RAW / Log 动态范围。D2 请用匹配原片或经验证的前置 LUT。曝光以 sRGB 线性化计算，Log 原片建议保持 0 EV。</p></div></details></div></article>`;
    }).join('');
    const nodes=[...template.content.children].map(el=>previous.get(el.dataset.pane)||el);$('paneGrid').replaceChildren(...nodes);if(!panes.length){const empty=document.createElement('p');empty.className='workspace-empty';empty.textContent='点击「新增窗格」，或在素材库选择 LUT 开始对比。';$('paneGrid').append(empty);}
    for(const [index,p] of panes.entries()){
      const el=paneElement(p),original=p.lutId==='original';el.querySelector('.pane-number').textContent=String(index+1).padStart(2,'0');
      for(const field of ['lutId','imageId','adapt','preId','expected','exposure','split'])el.querySelector(`[data-field=${field}]`).value=p[field];
      el.querySelector('[data-field=strength]').value=Math.round(p.strength*100);el.querySelector('.intensity output').textContent=Math.round(p.strength*100)+'%';el.querySelector('.exposure-control output').textContent=p.exposure.toFixed(1);
      el.classList.toggle('pane-original',original);el.querySelector('.stage').classList.toggle('split',mode==='split'&&!original);el.querySelector('.effect-badge').textContent=original?'ORIGINAL':'LUT';for(const field of ['strength','adapt','preId','exposure'])el.querySelector(`[data-field=${field}]`).disabled=original;
      updatePaneAspect(p);updateSplit(p);updateStatus(p);
      if(p.renderSignature!==signature(p)||!p.canvas){const state=el.querySelector('.stage-state');state.hidden=false;state.textContent='进入视野后载入预览';p.canvas=null;p.requestedSignature=null;++p.version;}
      if(paneObserver)paneObserver.observe(el);else renderPane(p);
    }
    updateApplyState();LUTPicker.enhanceAll();if(!renderPending)setRenderStatus();saveState();
  }
  function updateApplyState(){const button=$('applyImage'),all=panes.length>0&&panes.every(p=>p.imageId===activeImage);button.classList.toggle('is-applied',all);button.querySelector('.ui-icon').outerHTML=icon(all?'check':'arrow');button.title=all?'所有窗格正在使用这张图片':'将选中图片应用到所有窗格';button.disabled=!panes.length;}
  function paneElement(p) { return $('paneGrid').querySelector(`[data-pane="${p.id}"]`); }
  function updatePaneAspect(p) {
    const stage=paneElement(p)?.querySelector('.stage'),image=imageById(p.imageId);
    if(!stage)return;
    if(image?.width>0&&image?.height>0)stage.style.setProperty('--image-ratio',image.width+' / '+image.height);
    else stage.style.removeProperty('--image-ratio');
  }
  function updateSplit(p) { const el=paneElement(p);if(!el)return;el.querySelector('.result-canvas').style.clipPath=mode==='split'&&p.lutId!=='original'?`inset(0 0 0 ${p.split}%)`:'none';el.querySelector('.divider').style.left=`${p.split}%`; }
  function updateStatus(p) { const el=paneElement(p);if(!el)return;const status=compatibility(p),note=el.querySelector('.pane-note');note.textContent=status.text;note.className='pane-note'+(status.warn?' warn':'');note.hidden=!status.warn; }
  async function renderPane(p) {
    const key=signature(p),el=paneElement(p);if(!el||(p.canvas&&p.renderSignature===key)||p.requestedSignature===key)return;
    p.requestedSignature=key;const version=++p.version;
    p.canvas=null;p.source=null;
    const state=el.querySelector('.stage-state');state.hidden=false;state.classList.remove('error');state.textContent='正在计算颜色…';renderPending++;setRenderStatus(`正在渲染 · ${renderPending} 项`);
    try {
      const snapshot={...p},[image,lut,pre]=await Promise.all([loadImage(snapshot.imageId),loadLut(snapshot.lutId),loadLut(snapshot.lutId==='original'?'none':snapshot.preId)]);
      const source=resized(image),options={strength:snapshot.strength,adapt:resolveAdapt(snapshot),exposure:snapshot.exposure,interpolation:$('interpolation').value};
      const result=snapshot.lutId==='original'?source:await engine.render(source,lut,options,pre);
      if(p.version!==version||!el.isConnected)return;
      updatePaneAspect(p);
      for(const [className,canvas] of [['.source-canvas',source],['.result-canvas',result]]){const target=el.querySelector(className);target.width=canvas.width;target.height=canvas.height;target.getContext('2d').drawImage(canvas,0,0);}
      p.canvas=result;p.source=source;p.renderSignature=key;state.hidden=true;updateStatus(p);updateSplit(p);
    } catch(error) { if(p.version===version&&el.isConnected){p.canvas=null;p.source=null;state.textContent=`无法显示：${error.message}`;state.classList.add('error');const note=el.querySelector('.pane-note');note.textContent='解析 / 载入失败 · 可换一款 LUT 或图片重试';note.className='pane-note error';note.hidden=false;} }
    finally{if(p.version===version)p.requestedSignature=null;renderPending--;setRenderStatus(renderPending?`正在渲染 · ${renderPending} 项`:'');}
  }
  function scheduleRender(p) { ++p.version;clearTimeout(p.timer);p.canvas=null;p.requestedSignature=null;const el=paneElement(p);if(el){updatePaneAspect(p);const state=el.querySelector('.stage-state');state.textContent='正在计算颜色…';state.classList.remove('error');state.hidden=false;}p.timer=setTimeout(()=>renderPane(p),70);saveState(); }
  function syncSelectors() { for(const p of panes){const el=paneElement(p);if(!el)continue;el.querySelector('[data-field=lutId]').innerHTML=lutOptions(p.lutId);el.querySelector('[data-field=preId]').innerHTML=lutOptions(p.preId,false);el.querySelector('[data-field=imageId]').innerHTML=imageOptions(p.imageId);}LUTPicker.syncAll(); }
  function addToWorkspace(ids) {
    panes=[newPane('original'),...ids.map(id=>newPane(id))];renderPanes();
    toast(`已加入 ${ids.length} 款 LUT 与原图，滚动查看全部窗格。`);
    $('workspace').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});
  }
  function safeURL(value) { try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch(_){return null;} }
  async function showDetails(id) {
    const item=lutById(id);if(!item){toast('此窗格显示未处理的原图');return;}
    $('detailName').textContent=item.name;$('detailContent').innerHTML='<p class="muted">正在检查 LUT…</p>';$('detailDialog').showModal();
    let info,error;try{info=await loadLut(id);}catch(e){error=e.message;}
    const types=info?`${info.size1D?info.size1D+' 点 1D':''}${info.size1D&&info.size3D?' + ':''}${info.size3D?info.size3D+'³ 3D':''}`:'无法读取';
    $('detailContent').innerHTML=`<div class="detail-meta"><span class="tag">${esc(item.category)}</span><span class="tag">${esc(types)}</span><span class="tag ${item.base!=='STD'?'warn':''}">${esc(baseNames[item.base]||item.base)}</span></div>${error?`<p class="input-hint">解析失败：${esc(error)}</p>`:''}<p>${esc(item.cn||item.name)}</p>${item.description?`<h3>简介</h3><p class="detail-description">${esc(item.description)}</p>`:''}<h3>输入匹配</h3><p>${esc(item.inputVerified&&item.base==='FLOG2'?'F-Log2 输入已由维护者实测确认。标准图片自动应用 sRGB → F-Log2 / F-Gamut 前置编码；F-Log2 原片直接输入。原始 CUBE 的 VLOG 注释保留，站点按已确认的元数据处理。':item.ambiguous?'文件名提示 FLog2，但 CUBE 标头写 VLOG。可实验两种编码，不能根据效果好看就认定原始输入。':item.base==='CNED2'?'此 LUT 需要 Cinelike D2 基底。文件可读取，标准 JPG 直接套用是输入不匹配；使用 D2 原片或经过验证的前置转换 LUT。':item.base==='MONO'?'此文件声明 MONO（单色照片格调）输入。请使用匹配的单色基底；把彩色图片的编码标签改成 MONO 不会转成黑白，也不能保证与相机内单色格调一致。':item.base==='STD'?'本包声明标准 STD 输入；标准 JPG 可用于风格比较，结果不保证等同相机内实时 LUT。':'请确认图片编码与 LUT 期望输入。未知编码不会自动猜测。')}</p><h3>记录与说明</h3><p>${esc(item.uncertainty||'未对自上传 LUT 的来源和色彩空间进行认证。')}</p>${info?`<h3>解析与范围</h3><p>输入 DOMAIN：${esc(info.domainMin.join(', '))} → ${esc(info.domainMax.join(', '))}<br>输出数值：${info.min.toFixed(4)} → ${info.max.toFixed(4)}<br>${esc(info.warnings.join('；')||'结构完整，浮点数据按原值读取。')}</p>`:''}${item.sources?.length?'<h3>整理包记录的来源</h3><div>'+item.sources.map(s=>{const url=safeURL(s.url);return url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a>`:'';}).join('')+'</div>':''}<div class="mini-actions"><button id="useDetailLut" class="secondary">放入一个窗格</button><button id="downloadDetailLut" class="quiet">下载原始 CUBE</button><button id="editDetailLut" class="secondary">在编辑器中微调</button>${item.uploaded?'<button id="removeDetailLut" class="quiet">移除此 LUT</button>':''}</div>`;
    $('useDetailLut').onclick=()=>{panes.push(newPane(item.id));renderPanes();$('detailDialog').close();};
    $('downloadDetailLut').onclick=()=>item.text?download(new Blob([item.text],{type:'text/plain'}),item.filename):downloadURL(assetURL(item),item.filename);
    $('editDetailLut').onclick=async()=>{try{const lut=await loadLut(item.id);$('detailDialog').close();await editor.open({project:item.editorProject||LUTEditCore.project({name:item.name+' · 微调',inputBase:item.base,source:{base:item.base,lut:LUTEditCore.pack(lut),pre:null,options:{strength:1,exposure:0,adapt:'direct',interpolation:$('interpolation').value}}}),saveId:item.edited?item.id:null,imageId:activeImage,sourceNote:'以原始 LUT 为起点；可在此修改曲线与调色参数。'});}catch(e){toast(e.message,true);}};
    if(item.uploaded)$('removeDetailLut').onclick=async()=>{if(item.edited)try{await editor.remove(id);}catch(_){return;}const index=luts.findIndex(l=>l.id===id);luts.splice(index,1);parsed.delete(id);selected.delete(id);favorites.delete(id);for(const p of panes){if(p.lutId===id)p.lutId='original';if(p.preId===id)p.preId='none';}refreshCategories();renderLibrary();renderPanes();$('detailDialog').close();};
  }
  async function importFiles(files) {
    const errors=[],success=[];let count=0;
    for(const file of files){
      try{
        if(/\.cube$/i.test(file.name)){
          if(file.size>70*1024*1024)throw new Error('LUT 超过 70 MB');
          const text=await file.text(),info=await engine.parse(text,file.name),id=`upload-lut-${Date.now()}-${count++}`;
          const item={id,name:file.name.replace(/\.cube$/i,''),filename:file.name,text,uploaded:true,category:'自上传 LUT',base:['STD','VLOG','FLOG2','CNED2','MONO'].includes(info.base)?info.base:'UNKNOWN',grid:info.size3D||info.size1D,parseInfo:info};
          luts.push(item);parsed.set(id,Promise.resolve(info));selected.add(id);success.push(file.name);
        } else if(/\.(jpe?g|png|webp|avif)$/i.test(file.name)){
          if(images.filter(i=>i.uploaded).length>=12)throw new Error('本次会话最多保留 12 张上传图片；请先移除不用的图片');
          if(file.size>40*1024*1024)throw new Error('图片超过 40 MB');
          const id=`upload-image-${Date.now()}-${count++}`,url=URL.createObjectURL(file),item={id,name:file.name,filename:file.name,path:url,base:'STD',uploaded:true};images.push(item);
          try{const canvas=await loadImage(id);item.thumb=resized(canvas,300,180).toDataURL('image/jpeg',.8);item.note=`${item.width} × ${item.height} · ${file.name} · 编码默认 sRGB，可手动更改`;activeImage=id;success.push(file.name);}catch(error){images.splice(images.indexOf(item),1);URL.revokeObjectURL(url);throw error;}
        } else throw new Error('支持 .cube、JPG、PNG、WebP、AVIF；其他格式请先转换');
      }catch(error){errors.push(`${file.name}：${error.message}`);}
    }
    refreshCategories();renderLibrary();renderImages();syncSelectors();
    if(errors.length){lastImportMessages=errors;$('detailName').textContent='文件导入结果';$('detailContent').innerHTML=`<p>${success.length} 个文件导入成功，${errors.length} 个未能导入。</p><h3>诊断信息</h3>${errors.map(e=>`<p class="input-hint">${esc(e)}</p>`).join('')}<p class="muted">缺失的数据不能可靠补全。请从原软件重新导出完整标准 CUBE，或将图片转换为浏览器支持的格式。</p>`;$('detailDialog').showModal();}
    else if(success.length)toast(`已导入 ${success.length} 个文件。图片可应用到窗格，LUT 已加入选择。`);
  }
  function downloadURL(url,name){const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();}
  function download(blob,name){const url=URL.createObjectURL(blob);downloadURL(url,name);setTimeout(()=>URL.revokeObjectURL(url),30000);}
  function fileStamp(){return new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);}
  function drawFit(ctx,canvas,x,y,w,h){const s=Math.min(w/canvas.width,h/canvas.height),cw=canvas.width*s,ch=canvas.height*s;ctx.drawImage(canvas,x+(w-cw)/2,y+(h-ch)/2,cw,ch);}
  async function openZoom(p){
    if(!p.canvas||!p.source){toast('图片正在渲染，请稍后再试');return;}
    zoomState={p,source:p.source,result:p.canvas};$('zoomTitle').textContent=lutById(p.lutId)?.name||'原图';$('zoomInfo').textContent=`${imageById(p.imageId)?.name} · ${Math.round(p.strength*100)}% · ${p.canvas.width} × ${p.canvas.height} 预览 · 拖动可平移`;
    $('zoomScale').value=100;$('zoomScaleValue').textContent='100%';$('zoomSplit').value=mode==='split'?p.split:0;$('zoomSplit').disabled=p.lutId==='original';$('zoomDialog').showModal();drawZoom();
  }
  function drawZoom(){if(!zoomState)return;const {source,result}=zoomState,c=$('zoomCanvas'),ctx=c.getContext('2d'),split=Number($('zoomSplit').value)/100;c.width=source.width;c.height=source.height;ctx.drawImage(source,0,0);ctx.save();ctx.beginPath();ctx.rect(c.width*split,0,c.width*(1-split),c.height);ctx.clip();ctx.drawImage(result,0,0);ctx.restore();if(split>0&&split<1){ctx.fillStyle='#fff';ctx.fillRect(c.width*split-1,0,2,c.height);}sizeZoom();}
  function sizeZoom(){if(!zoomState)return;const c=$('zoomCanvas'),v=$('zoomViewport'),scale=Number($('zoomScale').value)/100,fit=Math.min(v.clientWidth/c.width,v.clientHeight/c.height);c.style.width=`${Math.round(c.width*fit*scale)}px`;c.style.height=`${Math.round(c.height*fit*scale)}px`;}
  function exportImageIds(){return [...$('exportImages').querySelectorAll('input:checked')].map(x=>x.value);}
  function buildExportJobs(){
    const jobs=[],addOriginal=$('exportOriginal').checked;
    if($('exportSource').value==='panes'){
      const originals=new Set(panes.filter(p=>p.lutId==='original').map(p=>p.imageId));
      if(addOriginal)for(const id of [...new Set(panes.map(p=>p.imageId))])if(!originals.has(id))jobs.push(newPane('original',id));
      jobs.push(...panes.map(p=>({...p})));
    } else {
      const ids=exportImageIds();for(const imageId of ids){if(addOriginal)jobs.push(newPane('original',imageId));for(const id of selected)jobs.push(newPane(id,imageId));}
    }
    return jobs;
  }
  function exportDimensions(jobs){const width=Number($('exportWidth').value),cols=Math.min(Number($('exportColumns').value),Math.max(1,jobs.length)),gap=Math.round(width*.018),label=Math.round(width*.10),imageH=Math.round(width*2/3),header=Math.round(width*.14),footer=Math.round(width*.045),rows=Math.ceil(jobs.length/cols);return {width,cols,gap,label,imageH,header,footer,totalW:cols*width+(cols+1)*gap,totalH:header+rows*(imageH+label+gap)+gap+footer};}
  function estimateExport(){const selectedMode=$('exportSource').value==='selection';$('exportImagePicker').hidden=!selectedMode;const jobs=buildExportJobs(),d=exportDimensions(jobs);let problem='';if(!jobs.length)problem='请在素材库选择 LUT，并至少选择一张导出图片。';else if(selectedMode&&!selected.size)problem='请先在素材库选择 LUT。';else if(d.totalW*d.totalH>32_000_000||d.totalH>16000||d.totalW>16000)problem='尺寸超过 32 MP / 16000 px 限制；请降低每格宽度或减少图片 / LUT。';$('exportEstimate').textContent=problem||`${jobs.length} 格 · ${d.totalW} × ${d.totalH} px · ${Math.round(d.totalW*d.totalH/1e6*10)/10} MP`;$('exportSubmit').disabled=!!problem||exporting;return {jobs,d,problem};}
  function openExport(){
    $('exportImages').innerHTML=images.map(i=>`<label><input type="checkbox" value="${esc(i.id)}" ${i.id===activeImage?'checked':''}>${esc(i.name)}</label>`).join('');$('exportProgress').textContent='';estimateExport();$('exportDialog').showModal();
  }
  function fitText(ctx,text,x,y,width){text=String(text);if(ctx.measureText(text).width<=width){ctx.fillText(text,x,y);return;}while(text.length&&ctx.measureText(text+'…').width>width)text=text.slice(0,-1);ctx.fillText(text+'…',x,y);}
  async function exportSheet(quick=false){
    if(exporting)return;
    if(quick){$('exportSource').value=selected.size?'selection':'panes';$('exportImages').innerHTML=images.map(i=>`<label><input type="checkbox" value="${esc(i.id)}" ${i.id===activeImage?'checked':''}>${esc(i.name)}</label>`).join('');$('exportFormat').value='image/png';$('exportWidth').value='1000';$('exportColumns').value=String(Math.min(3,selected.size?selected.size+1:panes.length));$('exportOriginal').checked=true;$('exportDark').checked=true;}
    const {jobs,d,problem}=estimateExport();if(problem){toast(problem,true);return;}
    exporting=true;$('exportSubmit').disabled=true;$('quickExport').disabled=true;const exportControls=[...$('exportForm').querySelectorAll('input,select')];exportControls.forEach(el=>el.disabled=true);
    const canvas=document.createElement('canvas');canvas.width=d.totalW;canvas.height=d.totalH;const ctx=canvas.getContext('2d'),dark=$('exportDark').checked,bg=dark?'#161b17':'#f4f4ee',fg=dark?'#edf1e6':'#283225',muted=dark?'#b6bfab':'#65705e',font='"Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle=bg;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle=fg;ctx.font=`600 ${Math.round(d.width*.038)}px ${font}`;ctx.fillText('LUT LAB / 效果对比',d.gap,d.header*.4);ctx.fillStyle=muted;ctx.font=`${Math.round(d.width*.015)}px ${font}`;ctx.fillText(`sRGB 预览 · ${$('interpolation').value==='tetrahedral'?'四面体':'三线性'}插值 · ${new Date().toLocaleString('zh-CN')}`,d.gap,d.header*.7);
    try{
      for(let index=0;index<jobs.length;index++){
        const p=jobs[index],message=`正在生成 ${index+1} / ${jobs.length} 格…`;$('exportProgress').textContent=message;if(quick){setRenderStatus(message);}
        const [image,lut,pre]=await Promise.all([loadImage(p.imageId),loadLut(p.lutId),loadLut(p.lutId==='original'?'none':p.preId)]);
        const source=resized(image,d.width,d.imageH),options={strength:p.strength,adapt:resolveAdapt(p),exposure:p.exposure,interpolation:$('interpolation').value};
        const result=p.lutId==='original'?source:await engine.render(source,lut,options,pre),x=d.gap+(index%d.cols)*(d.width+d.gap),y=d.header+Math.floor(index/d.cols)*(d.imageH+d.label+d.gap);
        ctx.fillStyle=dark?'#222921':'#e7e8df';ctx.fillRect(x,y,d.width,d.imageH);drawFit(ctx,result,x,y,d.width,d.imageH);
        ctx.fillStyle=fg;ctx.font=`600 ${Math.round(d.width*.021)}px ${font}`;fitText(ctx,`${String(index+1).padStart(2,'0')}  ${lutById(p.lutId)?.name||'原图 / 未处理'}`,x,y+d.imageH+d.label*.31,d.width);
        ctx.fillStyle=muted;ctx.font=`${Math.round(d.width*.015)}px ${font}`;fitText(ctx,`${imageById(p.imageId)?.name} · ${Math.round(p.strength*100)}% · ${p.lutId==='original'?'原始显示':adaptNames[resolveAdapt(p)]}${p.preId!=='none'?' + 前置 '+lutById(p.preId)?.name:''}${p.exposure?' · EV '+p.exposure.toFixed(1):''}`,x,y+d.imageH+d.label*.57,d.width);
        const status=compatibility(p);ctx.fillStyle=status.warn?(dark?'#e6b884':'#8a4c0b'):muted;ctx.font=`${Math.round(d.width*.014)}px ${font}`;fitText(ctx,status.text,x,y+d.imageH+d.label*.83,d.width);
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      ctx.fillStyle=muted;ctx.font=`${Math.round(d.width*.013)}px ${font}`;ctx.fillText('实验转换不还原 RAW / Log 动态范围；输入匹配与来源提示见各格。',d.gap,canvas.height-d.footer*.35);
      const mime=$('exportFormat').value,blob=await new Promise(resolve=>canvas.toBlob(resolve,mime,.94));if(!blob)throw new Error('浏览器无法创建图片，请降低导出尺寸');
      download(blob,`LUT-LAB-compare-${fileStamp()}.${mime==='image/png'?'png':'jpg'}`);$('exportProgress').textContent=`已导出 ${jobs.length} 格 · ${d.totalW} × ${d.totalH} px`;toast(`对比图已生成并下载 · ${jobs.length} 格`);
    }catch(error){$('exportProgress').textContent=`导出失败：${error.message}`;toast(`导出失败：${error.message}`,true);}
    finally{exporting=false;exportControls.forEach(el=>el.disabled=false);$('quickExport').disabled=false;estimateExport();setRenderStatus();canvas.width=canvas.height=1;}
  }
  // Event delegation keeps focus stable while controls update.
  $('lutList').addEventListener('change',e=>{if(e.target.dataset.select){e.target.checked?selected.add(e.target.dataset.select):selected.delete(e.target.dataset.select);renderLibrary();}});
  $('lutList').addEventListener('click',e=>{const d=e.target.closest('[data-detail]'),f=e.target.closest('[data-favorite]');if(d)showDetails(d.dataset.detail);if(f){const id=f.dataset.favorite;favorites.has(id)?favorites.delete(id):favorites.add(id);try{localStorage.setItem('lut-lab-favorites',JSON.stringify([...favorites].filter(id=>!id.startsWith('upload-'))));}catch(_){}renderLibrary();}});
  $('lutSearch').oninput=renderLibrary;$('categoryFilter').onchange=renderLibrary;$('favoritesFilter').onclick=()=>{const b=$('favoritesFilter'),enabled=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',enabled);renderLibrary();};
  $('selectVisible').onchange=e=>{for(const l of filteredLuts())e.target.checked?selected.add(l.id):selected.delete(l.id);renderLibrary();};$('clearSelection').onclick=()=>{selected.clear();renderLibrary();};$('compareSelected').onclick=()=>{if(selected.size)addToWorkspace([...selected]);};
  $('imageStrip').addEventListener('load',e=>{if(e.target.tagName!=='IMG')return;const img=e.target;if(img.naturalWidth&&img.naturalHeight)img.closest('.image-item')?.style.setProperty('--thumb-ratio',img.naturalWidth/img.naturalHeight);},true);
  $('imageStrip').onclick=e=>{const pick=e.target.closest('[data-image]'),remove=e.target.closest('[data-remove-image]');if(pick){activeImage=pick.dataset.image;renderImages();saveState();}if(remove){const id=remove.dataset.removeImage,i=imageById(id);images.splice(images.indexOf(i),1);imageCache.delete(id);URL.revokeObjectURL(i.path);if(activeImage===id)activeImage=images[0].id;for(const p of panes)if(p.imageId===id)p.imageId=images[0].id;renderImages();renderPanes();}if(e.target.closest('#stripUpload'))$('imageInput').click();};
  $('imageBase').onchange=()=>{const keys=new Map(panes.map(p=>[p.id,signature(p)]));imageById(activeImage).base=$('imageBase').value;for(const p of panes){updateStatus(p);if(keys.get(p.id)!==signature(p))scheduleRender(p);}saveState();toast('编码标记已更改；这一步不改变图片的 RGB 数值。');};$('applyImage').onclick=()=>{for(const p of panes)p.imageId=activeImage;renderPanes();toast('已将「'+imageById(activeImage).name+'」应用到 '+panes.length+' 个窗格');};
  $('uploadLutButton').onclick=()=>$('lutInput').click();
  for(const id of ['imageInput','lutInput'])$(id).onchange=async e=>{const files=[...e.target.files];e.target.value='';await importFiles(files);};
  $('addPane').onclick=()=>{const p=newPane('original');panes.push(p);renderPanes();paneElement(p).scrollIntoView({block:'center',behavior:'auto'});};$('columnCount').onchange=()=>{columns=$('columnCount').value;const n=columns==='auto'?(panes.length<=1?1:panes.length<=4?2:3):Number(columns);$('paneGrid').style.gridTemplateColumns=`repeat(${n}, minmax(0, 1fr))`;saveState();};
  $('gridMode').onclick=()=>{mode='grid';renderPanes();};$('splitMode').onclick=()=>{mode='split';renderPanes();};$('interpolation').onchange=renderPanes;
  const updatePaneControl=(e)=>{
    const field=e.target.dataset.field,container=e.target.closest('[data-pane]');if(!field||!container)return;const p=panes.find(p=>p.id===Number(container.dataset.pane));if(!p)return;
    if(field==='split'){p.split=Number(e.target.value);updateSplit(p);saveState();return;}
    if(field==='strength'){p.strength=Number(e.target.value)/100;e.target.nextElementSibling.textContent=`${e.target.value}%`;scheduleRender(p);return;}
    if(field==='exposure'){p.exposure=Number(e.target.value);e.target.nextElementSibling.textContent=p.exposure.toFixed(1);scheduleRender(p);return;}
    if(e.type==='input')return;
    p[field]=e.target.value;
    if(field==='lutId'){p.adapt='auto';container.querySelector('[data-field=adapt]').value='auto';p.expected='auto';container.querySelector('[data-field=expected]').value='auto';const original=p.lutId==='original';container.classList.toggle('pane-original',original);for(const f of ['strength','adapt','preId','exposure'])container.querySelector(`[data-field=${f}]`).disabled=original;container.querySelector('.stage').classList.toggle('split',mode==='split'&&!original);container.querySelector('.effect-badge').textContent=original?'ORIGINAL':'LUT';container.querySelector('.stage').setAttribute('aria-label',`放大预览，${lutById(p.lutId)?.name||'原图'}`);}
    updateStatus(p);if(field==='imageId')updateApplyState();LUTPicker.syncAll();if(field!=='expected')scheduleRender(p);else saveState();
  };
  $('paneGrid').addEventListener('input',updatePaneControl);$('paneGrid').addEventListener('change',updatePaneControl);
  $('paneGrid').onclick=e=>{const el=e.target.closest('[data-pane]');if(!el)return;const p=panes.find(p=>p.id===Number(el.dataset.pane)),action=e.target.closest('[data-action]')?.dataset.action;if(action==='remove'){++p.version;clearTimeout(p.timer);panes=panes.filter(x=>x!==p);renderPanes();}else if(action==='detail')showDetails(p.lutId);else if(action==='edit')openPaneEditor(p);else if(e.target.closest('.stage')&&!e.target.matches('input'))openZoom(p);};
  $('paneGrid').addEventListener('keydown',e=>{if(e.target.classList.contains('stage')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();const p=panes.find(p=>p.id===Number(e.target.closest('[data-pane]').dataset.pane));openZoom(p);}});
  $('paneGrid').addEventListener('dblclick',e=>{if(e.target.classList.contains('stage-split')){const p=panes.find(p=>p.id===Number(e.target.closest('[data-pane]').dataset.pane));openZoom(p);}});
  $('helpButton').onclick=()=>$('helpDialog').showModal();$('exportButton').onclick=openExport;$('quickExport').onclick=()=>exportSheet(true);$('exportForm').onsubmit=e=>{e.preventDefault();exportSheet();};for(const id of ['exportSource','exportFormat','exportWidth','exportColumns','exportOriginal','exportDark','exportImages'])$(id).addEventListener('change',estimateExport);
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
  $('zoomSplit').oninput=drawZoom;$('zoomScale').oninput=()=>{$('zoomScaleValue').textContent=$('zoomScale').value+'%';sizeZoom();};let zoomDrag;
  $('zoomViewport').onpointerdown=e=>{if(e.pointerType!=='mouse'||e.button!==0)return;const v=$('zoomViewport');zoomDrag={x:e.clientX,y:e.clientY,left:v.scrollLeft,top:v.scrollTop};v.setPointerCapture(e.pointerId);v.style.cursor='grabbing';};$('zoomViewport').onpointermove=e=>{if(!zoomDrag)return;const v=$('zoomViewport');v.scrollLeft=zoomDrag.left+zoomDrag.x-e.clientX;v.scrollTop=zoomDrag.top+zoomDrag.y-e.clientY;};$('zoomViewport').onpointerup=$('zoomViewport').onpointercancel=()=>{zoomDrag=null;$('zoomViewport').style.cursor='grab';};$('zoomDialog').onclose=()=>{zoomState=null;};window.addEventListener('resize',sizeZoom);
  $('saveRecipe').onclick=()=>download(new Blob([JSON.stringify({format:'lut-lab-recipe',version:2,panes:panes.map(recipePane),mode,columns,activeImage,imageMetadata:images.map(i=>({id:i.id,filename:i.filename,base:i.base})),interpolation:$('interpolation').value},null,2)],{type:'application/json'}),`LUT-LAB-recipe-${fileStamp()}.json`);$('loadRecipe').onclick=()=>$('recipeInput').click();$('recipeInput').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>1_000_000)throw new Error('方案 JSON 超过 1 MB');const recipe=JSON.parse(await file.text());if(recipe.format!=='lut-lab-recipe'||![1,2].includes(recipe.version))throw new Error('不是受支持的 LUT LAB 方案');restoreState(recipe,true);renderImages();renderPanes();}catch(error){toast('载入失败：'+error.message,true);}};
  function defaults(){activeImage=images[0].id;mode='grid';columns='auto';$('interpolation').value='tetrahedral';const initial=[...new Set([...['lut-04','lut-17','lut-07'].filter(id=>lutById(id)),...luts.map(l=>l.id)])].slice(0,3);panes=[newPane('original'),...initial.map(id=>newPane(id))];}
  $('resetButton').onclick=()=>{defaults();renderImages();renderPanes();toast('工作台已重置为默认示例');};
  document.addEventListener('dragenter',e=>{if(e.dataTransfer?.types.includes('Files')){e.preventDefault();dragDepth++;$('dropOverlay').hidden=false;}});document.addEventListener('dragover',e=>{if(e.dataTransfer?.types.includes('Files')){e.preventDefault();e.dataTransfer.dropEffect='copy';}});document.addEventListener('dragleave',()=>{dragDepth=Math.max(0,dragDepth-1);if(!dragDepth)$('dropOverlay').hidden=true;});document.addEventListener('drop',async e=>{e.preventDefault();dragDepth=0;$('dropOverlay').hidden=true;if(e.dataTransfer?.files.length)await importFiles([...e.dataTransfer.files]);});window.addEventListener('blur',()=>{dragDepth=0;$('dropOverlay').hidden=true;});
  function editedRecord(record){const p=record.project;return {id:record.id,name:p.name,filename:(p.filename||'LUTLAB')+'.cube',text:record.text,uploaded:true,edited:true,editorProject:p,persisted:record.persisted!==false,category:'我的创作',base:p.inputBase,inputVerified:p.inputBase!=='UNKNOWN',grid:33,description:p.description,origin:'在 LUT LAB 编辑器中创建；源 LUT、输入转换和调色参数记录在本地工程中。'};}
  const editor=new LUTEditor({engine,getImages:()=>images,getLuts:()=>luts,getActiveImage:()=>activeImage,loadImage,loadLut,toast,onImageBaseChange:()=>{saveState();renderImages();for(const p of panes){updateStatus(p);scheduleRender(p);}},
    importImage:async file=>{const before=new Set(images.map(i=>i.id));await importFiles([file]);const item=images.find(i=>!before.has(i.id));if(!item)throw Error('图片未能导入，请检查格式与文件大小');return item;},
    onSaved:async record=>{const data=editedRecord(record),old=lutById(record.id);if(old)Object.assign(old,data);else luts.push(data);parsed.set(record.id,Promise.resolve(record.lut));for(const p of panes)if(p.lutId===record.id||p.preId===record.id){p.canvas=null;p.renderSignature=null;++p.version;}if(!panes.some(p=>p.lutId===record.id))panes.push(newPane(record.id,record.imageId));selected.add(record.id);refreshCategories();renderLibrary();syncSelectors();renderPanes();}
  });
  async function openPaneEditor(p){try{const item=lutById(p.lutId),image=imageById(p.imageId);if(item?.editorProject&&p.strength===1&&p.preId==='none'&&p.exposure===0&&resolveAdapt(p)==='direct'){const project=JSON.parse(JSON.stringify(item.editorProject));project.name+=' · 副本';await editor.open({project,imageId:p.imageId,sourceNote:'已复制此本地 LUT 的可编辑工程；保存会生成独立副本。'});return;}const original=p.lutId==='original',[lut,pre]=await Promise.all([loadLut(original?'original':p.lutId),loadLut(original?'none':p.preId)]);const options=original?{strength:1,exposure:0,adapt:'direct',interpolation:$('interpolation').value}:{strength:p.strength,exposure:p.exposure,adapt:resolveAdapt(p),interpolation:$('interpolation').value};await editor.open({project:LUTEditCore.project({name:(item?.name||'原图')+' · 微调',inputBase:image.base,source:{base:image.base,lut:LUTEditCore.pack(lut),pre:LUTEditCore.pack(pre),options}}),imageId:p.imageId,sourceNote:'已复制窗格完整颜色流程：'+(item?.name||'原图')+'；强度 '+Math.round(options.strength*100)+'%，曝光 '+options.exposure+' EV，前置编码 '+options.adapt+'。新 LUT 的输入基底取自该窗格图片。'});}catch(error){toast('编辑器未打开：'+error.message,true);}}
  $('newLutButton').onclick=()=>editor.new();
  const restoredEdits=await editor.restore();for(const record of restoredEdits){luts.push(editedRecord(record));parsed.set(record.id,Promise.resolve(record.lut));}
  defaults();try{const stored=localStorage.getItem('lut-lab-state');if(stored)restoreState(JSON.parse(stored));}catch(_){}
  refreshCategories();renderLibrary();renderImages();renderPanes();
  if(initialCatalogError)toast('公共素材库暂时无法刷新，已载入可用素材；请刷新页面重试。',true);
  if(location.protocol==='file:')toast('请用「启动本地预览.cmd」打开。直接双击 HTML 会被浏览器阻止读取内置 LUT。',true);
  window.addEventListener('beforeunload',()=>{for(const i of images)if(i.uploaded)URL.revokeObjectURL(i.path);});
  // Inspectable, read-only diagnostics for developers; user data never leaves the page.
  window.LUTLabDiagnostics=()=>({luts:luts.length,images:images.length,panes:panes.length,gpu:!!engine.gl,renderPending,errors:lastImportMessages.slice(),edited:luts.filter(l=>l.edited).length});
})();





