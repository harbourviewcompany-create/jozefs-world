/* Jozef's World private co-op signalling + ICE.
   Signalling: dedicated PeerServer.
   ICE: Google STUN + open public TURN so cellular/CGNAT phones can connect. */
window.BLOCK_WORLD_NETWORK={
 peerServer:{
  host:'jozefs-world-signalling-3vtw.onrender.com',
  port:443,
  path:'/peerjs/',
  secure:true
 },
 iceServers:[
  {urls:'stun:stun.l.google.com:19302'},
  {urls:'stun:stun1.l.google.com:19302'},
  {urls:'turn:openrelay.metered.ca:80',username:'openrelayproject',credential:'openrelayproject'},
  {urls:'turn:openrelay.metered.ca:443',username:'openrelayproject',credential:'openrelayproject'},
  {urls:'turn:openrelay.metered.ca:443?transport=tcp',username:'openrelayproject',credential:'openrelayproject'},
  {urls:'turn:openrelay.metered.ca:80?transport=tcp',username:'openrelayproject',credential:'openrelayproject'}
 ]
};
