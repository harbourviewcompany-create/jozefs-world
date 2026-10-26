/* Read-only shared adventure journal. Uses authoritative game state; never writes guest saves. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),g=window.BlockWorld2D;
if(!g||!$('bw-adventure'))return;
const missions=[
 'Gather wood to prepare your first camp.',
 'Build a shelter together before exploring farther.',
 'Explore the world and discover new places.',
 'Search deeper for rare materials and diamonds.',
 'Unlock the portal and visit another realm.',
 'Adventure complete! Keep building your shared home.'
];
const goalNames={wood:'Wood gathered',build:'Blocks built',explore:'Exploration',diamond:'Diamonds',portal:'Portals'};
function update(){
 const panel=$('bw-adventure');if(!panel.open)return;
 const s=g.getState?.();if(!s)return;
 const stage=Math.min(5,Math.max(0,Number(s.questStage)||0));
 $('bw-adventure-mission').textContent=missions[stage];
 $('bw-adventure-progress').value=stage;
 const coop=window.BlockWorldConnectionDiagnostics?.();
 $('bw-adventure-team').textContent=coop?.channelOpen&&coop?.ready?'Dad and Jozef are playing together':coop?.role==='host'?'Waiting for Jozef to join':coop?.role==='guest'?'Reconnecting to Dad’s world':'Solo play — open PLAY TOGETHER to invite Jozef';
 const goals=Object.entries(s.goals||{}).filter(([key,value])=>key in goalNames&&Number.isFinite(value));
 $('bw-adventure-goals').textContent=goals.map(([key,value])=>goalNames[key]+': '+Math.max(0,Math.floor(value))).join(' · ');
 $('bw-adventure-regroup').disabled=!(coop?.channelOpen&&coop?.ready);
}
$('bw-adventure').addEventListener('toggle',update);
$('bw-adventure-regroup').addEventListener('click',()=>{
 const s=g.getState?.(),c=window.BlockWorldCoop;
 if(!s||!c?.connected?.()){g.setStatus?.('Connect both players before regrouping.');return;}
 if(c.role?.()==='guest'){g.setStatus?.('Ask Dad to use the regroup action.');return;}
 const success=g.regroup?.(0);
 g.setStatus?.(success?'Regrouped with Jozef.':'Move farther apart before regrouping.');
});
setInterval(update,1500);
})();