export const SPORTS = ['football','hockey','basketball','baseball','wrestling'] as const;
export type Sport = (typeof SPORTS)[number];
export type Aim = 0|1|2;
export interface Result { made: boolean; explanation: string; }
export const ROUNDS = 5;
export const SAVE_KEY = 'jozefs-world-multisport-v1';
export const CHRONICLE_KEY = 'jozefs-world-chronicle-v1';
export const MAX_SCORE = 5;

export function clamp(value: number,min: number,max: number): number {
  return Math.max(min,Math.min(max,value));
}
// Predictable, teachable rules. Goalie is actually positioned on screen.
export function resolveAttempt(sport: Sport, aim: Aim, goalie: Aim, timing: number, challengeAnswer=0): Result {
  switch (sport) {
    case 'football':
    case 'hockey': {
      const made = aim!==goalie;
      return {made,explanation:made?'TOP CORNER! WHAT A FINISH.':'WHAT A SAVE! FIND ANOTHER CORNER.'};
    }
    case 'basketball':
    case 'baseball': {
      const made = Math.abs(timing-.5)<=(sport==='basketball'?.135:.17);
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
export function recordHighlight(storage:Pick<Storage,'getItem'|'setItem'>,sport:Sport,points:number):void {
  try{
    const original=JSON.parse(storage.getItem(CHRONICLE_KEY)||'null') as Record<string,unknown>|null;
    const events=Array.isArray(original?.events)?original.events.filter(x=>x&&typeof x==='object').slice(0,39):[];
    const type=sport==='football'?'arena':'multisport';
    const words:Record<Sport,string>={football:'FOOTBALL',hockey:'HOCKEY',baseball:'BASEBALL',basketball:'BASKETBALL',wrestling:'WRESTLING'};
    events.unshift({type,title:'PRIME TIME / '+words[sport]+' NIGHT.',story:'Jozef completed a Prime Arena '+sport+' challenge with '+Math.round(clamp(points,0,5))+' out of 5. A new moment for the club.',at:Date.now()});
    storage.setItem(CHRONICLE_KEY,JSON.stringify({events,seen:original?.seen||null}));
  }catch{/* maintain gameplay if storage is blocked */}
}
