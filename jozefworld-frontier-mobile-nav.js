/* Compact mobile navigation; preserves gameplay and world state. */
(()=>{'use strict';
const tabs=[['build','Build','.game > .panel'],['explore','Explore','#expedition'],['council','Council','#strategy'],['project','Projects','#community-project'],['research','Research','#research-panel'],['people','People','#people-panel']];
const nav=document.getElementById('frontier-mobile-nav');if(!nav)return;
const panels=tabs.map(([id,label,selector])=>({id,label,element:document.querySelector(selector)})).filter(t=>t.element);
const setTab=id=>{if(!panels.some(t=>t.id===id))id='build';for(const tab of panels){const selected=tab.id===id;tab.element.classList.toggle('frontier-mobile-active',selected);const button=nav.querySelector('[data-tab="'+tab.id+'"]');if(button){button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1}}};
nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Frontier game sections');
for(const tab of panels){const button=document.createElement('button');button.type='button';button.textContent=tab.label;button.dataset.tab=tab.id;button.setAttribute('role','tab');button.onclick=()=>setTab(tab.id);nav.append(button)}
setTab('build');
})();
