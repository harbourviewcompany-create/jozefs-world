/* Daddy + Jozef co-op networking.
   Single public PeerJS broker so both phones always meet on the same server.
   TURN relays help cellular / different-network connections. */
window.BLOCK_WORLD_NETWORK={
 peerServer:{
  host:'0.peerjs.com',
  port:443,
  path:'/',
  secure:true
 },
 iceServers:[
  {urls:'stun:stun.l.google.com:19302'},
  {urls:'stun:stun1.l.google.com:19302'},
  {urls:'stun:stun2.l.google.com:19302'},
  {urls:'turn:openrelay.metered.ca:80',username:'openrelayproject',credential:'openrelayproject'},
  {urls:'turn:openrelay.metered.ca:443',username:'openrelayproject',credential:'openrelayproject'},
  {urls:'turn:openrelay.metered.ca:443?transport=tcp',username:'openrelayproject',credential:'openrelayproject'},
  {urls:'turns:openrelay.metered.ca:443',username:'openrelayproject',credential:'openrelayproject'}
 ]
};
