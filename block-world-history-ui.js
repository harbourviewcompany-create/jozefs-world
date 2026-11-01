(()=>{
'use strict';
const button=document.getElementById('bw-history-show'),list=document.getElementById('bw-history-list');
if(!button||!list)return;
const say=message=>{list.textContent=message};
button.addEventListener('click',async()=>{
const cloud=window.BlockWorldCloud;
if(!cloud?.versions){say('Cloud is still connecting. Try again shortly.');return}
button.disabled=true;say('Loading saved versions…');
try{
const versions=await cloud.versions();
list.replaceChildren();
if(!versions.length){say('No historical cloud saves yet. Build and save something first.');return}
for(const v of versions){
const item=document.createElement('div');item.style.cssText='padding:9px 0;border-bottom:1px solid #ffffff33';
const label=document.createElement('span');label.textContent=new Date(v.at).toLocaleString()+' · revision '+v.revision+' ';
const restore=document.createElement('button');restore.type='button';restore.textContent='RESTORE';restore.style.cssText='margin-left:8px;padding:7px';
restore.onclick=async()=>{
if(!confirm('Replace the current Block World with this older save? The current version is kept in cloud history.'))return;
restore.disabled=true;say('Restoring historical world…');
try{await cloud.restoreVersion(v.id);say('World restored successfully.');}
catch(e){say('Restore not completed: '+e.message)}
finally{restore.disabled=false}
};
item.append(label,restore);list.append(item);
}
}catch(e){say('Could not load backups: '+e.message)}
finally{button.disabled=false}
});
})();