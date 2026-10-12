export const SPORTS = ['football','hockey','basketball','baseball','wrestling'] as const;
export type Sport = (typeof SPORTS)[number];
export type Aim = 0|1|2;
export interface Result { made: boolean; explanation: string; }
export const ROUNDS = 5;
export const SAVE_KEY = 'jozefs-world-multisport-v1';
export const CHRONICLE_KEY = 'jozefs-world-chronicle-v1';
export const MAX_SCORE = 5;
export type Challenge = 'rookie'|'pro'|'legend';
export function attemptPhase(elapsed:number,challenge:Challenge='rookie'):{timing:number;keeper:Aim;goalieX:number} {
  const speed=challenge==='legend'?1.5:challenge==='pro'?1.2:1;
  const goalieX=480+Math.sin(elapsed*speed/610)*138;
  return {goalieX,keeper:(goalieX<432?0:goalieX>528?2:1) as Aim,timing:.5+Math.sin(elapsed*speed/430)*.44};
}
export function timingWindow(sport:Sport,challenge:Challenge='rookie'):number {
  return (sport==='basketball'?.135:.17)*(challenge==='legend'?.65:challenge==='pro'?.82:1);
}

export function clamp(value: number,min: number,max: number): number {
  return Math.max(min,Math.min(max,value));
}
// Predictable, teachable rules. Goalie is actually positioned on screen.
export function resolveAttempt(sport: Sport, aim: Aim, goalie: Aim, timing: number, challengeAnswer=0,challenge:Challenge='rookie'): Result {
  switch (sport) {
    case 'football':
    case 'hockey': {
      const made = aim!==goalie;
      return {made,explanation:made?'TOP CORNER! WHAT A FINISH.':'WHAT A SAVE! FIND ANOTHER CORNER.'};
    }
    case 'basketball':
    case 'baseball': {
      const made = Math.abs(timing-.5)<=timingWindow(sport,challenge);
      return {made,explanation:made?(sport==='basketball'?'NOTHING BUT NET!':'THAT BALL IS GOING, GOING, GONE!'):
        (sport==='basketball'?'OFF THE RIM! TRY THE SWEET SPOT.':'JUST OUTSIDE THE SWEET SPOT. NEXT PITCH!')};
    }
    case 'wrestling': {
      const made=aim===challengeAnswer;
      return {made,explanation:made?'THE CROWD IS ON ITS FEET!':'THE CROWD WANTS A DIFFERENT MOMENT.'};
    }
  }
}
export interface SportRecord { played:number; best:number; careerWins?:number; }
export type Records = Record<'hockey'|'baseball'|'basketball'|'wrestling',SportRecord>;
const KEYS = ['hockey','baseball','basketball','wrestling'] as const;
function safeInt(x:unknown,max:number) {
  return typeof x==='number'&&Number.isSafeInteger(x)&&x>=0 ?Math.min(x,max):0;
}
export function readRecords(storage: Pick<Storage,'getItem'>): Records {
  let data:Record<string,unknown>={};
  try {
    const parsed=JSON.parse(storage.getItem(SAVE_KEY)||'null');
    if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))data=parsed as Record<string,unknown>;
  }catch{/* private storage or corrupted data */}
  const result={} as Records;
  for(const key of KEYS){
    const old=(data[key]&&typeof data[key]==='object'&&!Array.isArray(data[key])?data[key]:{}) as Record<string,unknown>;
    result[key]={played:safeInt(old.played,999999),best:safeInt(old.best,MAX_SCORE)};
    if(key==='wrestling')result[key].careerWins=Math.min(safeInt(old.careerWins,999999),result[key].played);
  }
  return result;
}
export function saveGame(storage:Pick<Storage,'getItem'|'setItem'>,sport:Sport,points:number): Records {
  const records=readRecords(storage);
  if(sport==='football')return records; // Football is already tracked by the Arena engine.
  const key=sport;
  const entry=records[key];
  const achieved=Math.round(clamp(points,0,MAX_SCORE));
  entry.played=Math.min(999999,entry.played+1);
  entry.best=Math.max(entry.best,achieved);
  if(key==='wrestling'&&achieved>=3)entry.careerWins=Math.min(999999,(entry.careerWins||0)+1);
  try{storage.setItem(SAVE_KEY,JSON.stringify(records));}catch{/* session-only */}
  return records;
}
export function awardClubProgress(storage:Pick<Storage,'getItem'|'setItem'>,sport:Sport|'street',points:number):number {
  if(!Number.isSafeInteger(points)||points<0||points>(sport==='street'?1000000:5)||(sport==='street'&&points<20))return 0;
  const key='jozefs-world-player-v1';
  try{
    const parsed=JSON.parse(storage.getItem(key)||'{}');
    const profile:Record<string,unknown>=parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};
    const now=new Date();const day=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
    const daily:Record<string,unknown>=profile.day===day&&profile.daily&&typeof profile.daily==='object'&&!Array.isArray(profile.daily)?profile.daily as Record<string,unknown>:{};
    const action=sport==='street'?'street':sport==='football'?'prime':'multisport';
    const count=safeInt(daily[action],999999);const cap=action==='street'?2:action==='prime'?3:4;
    const xp=count<cap?(sport==='street'?40:sport==='football'?35:20):0;
    profile.day=day;daily[action]=Math.min(999999,count+1);profile.daily=daily;
    profile.xp=Math.min(1e8,safeInt(profile.xp,1e8)+xp);
    if(sport==='street'){
      profile.streetRuns=safeInt(profile.streetRuns,999999)+1;
      profile.streetBest=Math.max(safeInt(profile.streetBest,1000000),points);
    }else if(sport!=='football'){
      profile.multisportGames=Math.min(999999,safeInt(profile.multisportGames,999999)+1);
      const existing=Array.isArray(profile.multiSports)?profile.multiSports.filter(x=>KEYS.includes(x as typeof KEYS[number])):[];
      profile.multiSports=[...new Set([...existing,sport])];
    }
    storage.setItem(key,JSON.stringify(profile));return xp;
  }catch{return 0}
}
export function recordHighlight(storage:Pick<Storage,'getItem'|'setItem'>,sport:Sport|'street',points:number):void {
  try{
    const original=JSON.parse(storage.getItem(CHRONICLE_KEY)||'null') as Record<string,unknown>|null;
    const events=Array.isArray(original?.events)?original.events.filter(x=>x&&typeof x==='object').slice(0,39):[];
    const type=sport==='street'?'street':sport==='football'?'arena':'multisport';
    const words:Record<Sport|'street',string>={football:'FOOTBALL',hockey:'HOCKEY',baseball:'BASEBALL',basketball:'BASKETBALL',wrestling:'WRESTLING',street:'STREET'};
    const score=sport==='street'?Math.round(clamp(points,0,1000000))+' points':Math.round(clamp(points,0,5))+' out of 5';
    events.unshift({type,title:'PRIME TIME / '+words[sport]+' NIGHT.',story:'Jozef completed a Prime Arena '+sport+' challenge with '+score+'. A new moment for the club.',at:Date.now()});
    storage.setItem(CHRONICLE_KEY,JSON.stringify({events,seen:original?.seen||null}));
  }catch{/* maintain gameplay if storage is blocked */}
}
