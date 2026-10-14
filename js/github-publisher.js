/* GitHub is the only authenticated destination. Tokens are never persisted. */
(function(root){
  'use strict';
  const tools=root.LUTLibraryTools||(typeof require==='function'?require('./library-tools.js'):null),encoder=new TextEncoder(),decoder=new TextDecoder();
  const pathEncode=path=>path.split('/').map(encodeURIComponent).join('/');
  function repository(value){value=value.trim();if(/^https?:\/\//i.test(value)){const url=new URL(value);if(url.hostname!=='github.com')throw new Error('请输入 github.com 的仓库地址');value=url.pathname.replace(/^\/|\/$/g,'');}value=value.replace(/\.git$/i,'');if(!/^[a-z\d][a-z\d-]*\/[a-z\d_.-]+$/i.test(value))throw new Error('仓库格式：用户名/仓库名，或对应的 GitHub URL');const [owner,repo]=value.split('/');return {owner,repo};}
  function siteRoot(value=''){value=value.trim().replace(/^\/+|\/+$/g,'');if(value&&(value.includes('\\')||value.split('/').some(x=>!x||x==='.'||x==='..'||/[\x00-\x1f]/.test(x))))throw new Error('站点目录无效');return value;}
  function toBase64(bytes){let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(text);}
  function fromBase64(text){return Uint8Array.from(atob(text.replace(/\s/g,'')),c=>c.charCodeAt(0));}
  function sha(value){if(typeof value!=='string'||!/^[a-f\d]{40,64}$/i.test(value))throw new Error('GitHub 返回了无效的文件版本');return value;}
  function removedAssets(previous,current){
    const paths=catalog=>new Set([...catalog.luts,...catalog.images].flatMap(item=>[item.path,item.thumb].filter(Boolean))),kept=paths(current);
    return [...paths(previous)].filter(path=>!kept.has(path)&&/^assets\/(luts|images)\//.test(path)&&!path.includes('\\')&&!path.split('/').some(x=>x==='..'||x==='.'||!x));
  }
  class Publisher{
    #token;#fetch;
    constructor({repo,token,branch='',root:folder='',fetchImpl=globalThis.fetch.bind(globalThis)}){Object.assign(this,repository(repo));this.branch=branch.trim();this.root=siteRoot(folder);this.#token=token.trim();if(!this.#token)throw new Error('请输入只授权此仓库的 GitHub 令牌');this.#fetch=fetchImpl;this.prefix='/repos/'+encodeURIComponent(this.owner)+'/'+encodeURIComponent(this.repo);this.baseline=null;}
    disconnect(){this.#token='';this.baseline=null;}
    async api(path,method='GET',body){if(!this.#token)throw new Error('连接已断开，请重新授权');if(path!==this.prefix&&!path.startsWith(this.prefix+'/'))throw new Error('目标不是已连接的仓库');const headers={Accept:'application/vnd.github+json',Authorization:'Bearer '+this.#token,'X-GitHub-Api-Version':'2026-03-10'};if(body!==undefined)headers['Content-Type']='application/json';const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),method==='GET'?30000:120000);let response;try{response=await this.#fetch('https://api.github.com'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'error',cache:'no-store',signal:controller.signal});}catch(_){const error=new Error('无法确认 GitHub 请求结果，请检查网络或仓库后重试');error.uncertain=true;throw error;}finally{clearTimeout(timer);}let data;try{data=await response.json();}catch(_){data={};}if(!response.ok){const error=new Error(response.status===401?'令牌无效或已过期，请重新连接':response.status===403?'GitHub 拒绝此操作：请检查该仓库的 Contents 读写权限或访问频率':response.status===404?'找不到仓库、发布分支或站点文件：请确认地址并先上传完整站点':response.status===409||response.status===422?'仓库版本发生变化或分支规则阻止直接提交，请核对后重试':`GitHub 请求失败 (${response.status})`);error.status=response.status;throw error;}return data;}
    assetPath(path){return this.root?this.root+'/'+path:path;}
    async latest(){const ref=await this.api(this.prefix+'/git/ref/heads/'+pathEncode(this.branch)),head=sha(ref.object?.sha),commit=await this.api(this.prefix+'/git/commits/'+head),tree=sha(commit.tree?.sha),file=await this.api(this.prefix+'/contents/'+pathEncode(this.assetPath('assets/catalog.js'))+'?ref='+head);if(file.type!=='file')throw new Error('assets/catalog.js 不是文件');let bytes;if(file.encoding==='base64'&&typeof file.content==='string')bytes=fromBase64(file.content);else{const blob=await this.api(this.prefix+'/git/blobs/'+sha(file.sha));if(blob.encoding!=='base64')throw new Error('无法读取仓库素材清单');bytes=fromBase64(blob.content);}return {head,tree,catalog:tools.parseCatalog(decoder.decode(bytes))};}
    async connect(){const info=await this.api(this.prefix);if(info.permissions?.push===false)throw new Error('当前账号没有此仓库的写入权限');if(!this.branch)this.branch=info.default_branch;this.baseline=(await this.latest()).catalog;return {owner:this.owner,repo:this.repo,branch:this.branch,root:this.root,catalog:this.baseline};}
    async publish(local,files,onProgress=()=>{}){
      if(!this.baseline)throw new Error('请先连接仓库');if(!local.images.length)throw new Error('公共素材库至少保留一张示例图片');
      tools.parseCatalog(tools.serializeCatalog(local.luts,local.images));onProgress('读取最新素材清单…');tools.mergeCatalog(this.baseline,local,(await this.latest()).catalog);const uploaded=[];
      // Only immutable blobs are created until the final branch update succeeds.
      for(let i=0;i<files.length;i++){const file=files[i];if(!/^assets\/(luts|images)\//.test(file.name)||file.name.includes('\\')||file.name.split('/').some(x=>x==='..'||x==='.'||!x))throw new Error('新增素材路径无效');onProgress(`上传素材 ${i+1} / ${files.length}…`);const bytes=file.data instanceof Uint8Array?file.data:new Uint8Array(file.data),blob=await this.api(this.prefix+'/git/blobs','POST',{content:toBase64(bytes),encoding:'base64'});uploaded.push({path:this.assetPath(file.name),mode:'100644',type:'blob',sha:sha(blob.sha)});}
      for(let attempt=0;attempt<2;attempt++){
        const latest=await this.latest(),catalog=tools.mergeCatalog(this.baseline,local,latest.catalog),source=tools.serializeCatalog(catalog.luts,catalog.images);onProgress('提交图片、LUT 与清单…');
        const deletions=removedAssets(latest.catalog,catalog).map(path=>({path:this.assetPath(path),mode:'100644',type:'blob',sha:null}));
        const tree=await this.api(this.prefix+'/git/trees','POST',{base_tree:latest.tree,tree:[...uploaded,...deletions,{path:this.assetPath('assets/catalog.js'),mode:'100644',type:'blob',content:source}]});
        const commit=await this.api(this.prefix+'/git/commits','POST',{message:'Update LUT LAB public library',tree:sha(tree.sha),parents:[latest.head]});
        const result={sha:commit.sha,catalog,source,deleted:deletions.length,commitUrl:'https://github.com/'+encodeURIComponent(this.owner)+'/'+encodeURIComponent(this.repo)+'/commit/'+commit.sha};
        try{await this.api(this.prefix+'/git/refs/heads/'+pathEncode(this.branch),'PATCH',{sha:sha(commit.sha),force:false});this.baseline=catalog;return result;}catch(error){if(error.uncertain){try{if((await this.latest()).head===commit.sha){this.baseline=catalog;return result;}}catch(_){}}if(attempt===0&&[409,422].includes(error.status)){onProgress('仓库同时有更新，正在合并最新版本…');continue;}throw error;}
      }
    }
  }
  const api={Publisher,repository,siteRoot,toBase64,fromBase64,removedAssets};root.LUTGitHub=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:self);
