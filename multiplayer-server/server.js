import express from 'express';
import helmet from 'helmet';
import {ExpressPeerServer} from 'peer';
const app=express();
app.disable('x-powered-by');
app.set('trust proxy',1);
app.use(helmet({contentSecurityPolicy:false,crossOriginEmbedderPolicy:false}));
app.get('/health',(_req,res)=>res.json({ok:true,service:'jozefs-world-signalling'}));
// Cloudflare Realtime TURN: only temporary ICE credentials reach the browser.
// Configure TURN_KEY_ID and TURN_KEY_API_TOKEN in Render environment (never GitHub).
const allowedOrigin='https://harbourviewcompany-create.github.io';
const attempts=new Map();
app.options('/api/ice',(req,res)=>{
 if(req.get('origin')!==allowedOrigin)return res.sendStatus(403);
 res.set('Access-Control-Allow-Origin',allowedOrigin);
 res.set('Access-Control-Allow-Methods','GET, OPTIONS');
 res.set('Access-Control-Allow-Headers','Content-Type');
 return res.sendStatus(204);
});
app.get('/api/ice',async(req,res)=>{
 res.set('Cache-Control','no-store');
 if(req.get('origin')!==allowedOrigin)return res.status(403).json({error:'origin_not_allowed'});
 res.set('Access-Control-Allow-Origin',allowedOrigin);
 const now=Date.now(),ip=req.ip||'unknown';
 if(attempts.size>2000)for(const [key,value] of attempts)if(value.reset<now)attempts.delete(key);
 const state=attempts.get(ip)||{count:0,reset:now+60000};
 if(state.reset<now){state.count=0;state.reset=now+60000;}
 state.count++;attempts.set(ip,state);
 if(state.count>12)return res.status(429).json({error:'rate_limited'});
 const id=process.env.TURN_KEY_ID,token=process.env.TURN_KEY_API_TOKEN;
 if(!id||!token)return res.status(503).json({error:'turn_not_configured'});
 try{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),8000);
  let response;
  try{
   response=await fetch('https://rtc.live.cloudflare.com/v1/turn/keys/'+encodeURIComponent(id)+'/credentials/generate-ice-servers',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({ttl:21600}),signal:controller.signal
   });
  }finally{clearTimeout(timeout);}
  if(!response.ok)return res.status(502).json({error:'turn_provider_unavailable'});
  const data=await response.json();
  if(!Array.isArray(data.iceServers)||!data.iceServers.length)return res.status(502).json({error:'invalid_turn_response'});
  res.json({iceServers:data.iceServers,expiresIn:21600});
 }catch(_){res.status(502).json({error:'turn_provider_unavailable'});}
});
const port=Number(process.env.PORT||3000);
const server=app.listen(port,'0.0.0.0',()=>console.log('Signalling listening on '+port));
const peer=ExpressPeerServer(server,{path:'/',proxied:true,allow_discovery:false,alive_timeout:60000,key:'peerjs'});
app.use('/peerjs',peer);
