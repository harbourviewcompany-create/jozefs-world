/* Workplace activities shown in 3D; no resource mutation in explorer mode. */
export const WORKPLACE_ACTIVITY=Object.freeze({
 farm:{label:'Farm',action:'Inspect crops',detail:'Farmers tend the fields. Food production is calculated when you advance a year in Frontier.'},
 mill:{label:'Lumber mill',action:'Inspect lumber',detail:'Carpenters prepare timber. Wood production is calculated when you advance a year in Frontier.'},
 quarry:{label:'Quarry',action:'Inspect stone',detail:'Masons work the stone. Stone production is calculated when you advance a year in Frontier.'},
 market:{label:'Market',action:'Visit market',detail:'Merchants trade with residents. Coins are calculated when you advance a year in Frontier.'},
 stadium:{label:'Stadium',action:'Visit stadium',detail:'Residents gather for sports and events.'},
 home:{label:'House',action:'Visit home',detail:'A home gives citizens somewhere to live.'}
});
export function describeWorkplace(type){return WORKPLACE_ACTIVITY[type]||{label:'Building',action:'Inspect',detail:'Explore this building.'}}
