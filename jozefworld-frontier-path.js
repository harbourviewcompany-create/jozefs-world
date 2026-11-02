/* Pure deterministic A* navigation. No world state mutation. */
export function findFrontierPath(start,goal,terrain,buildings={},width=48,height=48){
const inside=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<width&&y<height;
if(!inside(start.x,start.y)||!inside(goal.x,goal.y))return [];
const key=(x,y)=>x+','+y,origin=key(start.x,start.y),destination=key(goal.x,goal.y);
if(origin===destination)return[{x:start.x,y:start.y}];
if(terrain(goal.x,goal.y)==='water')return [];
const heap=[];function push(v){heap.push(v);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].f<=v.f)break;heap[i]=heap[p];i=p}heap[i]=v}
function pop(){const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(true){const a=i*2+1,b=a+1;if(a>=heap.length)break;const j=b<heap.length&&heap[b].f<heap[a].f?b:a;if(heap[j].f>=last.f)break;heap[i]=heap[j];i=j}heap[i]=last}return first}
const heuristic=(x,y)=>.55*(Math.abs(x-goal.x)+Math.abs(y-goal.y));
const best=new Map([[origin,0]]),previous=new Map();push({x:start.x,y:start.y,g:0,f:heuristic(start.x,start.y)});
let visited=0;while(heap.length&&visited++<width*height){const cur=pop(),k=key(cur.x,cur.y);if(cur.g>best.get(k)+1e-8)continue;if(k===destination){const path=[];let node=k;while(node){const [x,y]=node.split(',').map(Number);path.push({x,y});node=previous.get(node)}return path.reverse()}
for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=cur.x+dx,y=cur.y+dy,nk=key(x,y);if(!inside(x,y)||terrain(x,y)==='water')continue;if(nk!==destination&&nk!==origin&&buildings[nk]&&buildings[nk]!=='road')continue;
const type=terrain(x,y),step=buildings[nk]==='road'?.55:type==='forest'?1.35:type==='hill'?1.5:1;const g=cur.g+step;
if(g<(best.get(nk)??Infinity)){best.set(nk,g);previous.set(nk,k);push({x,y,g,f:g+heuristic(x,y)})}}}
return [];
}
