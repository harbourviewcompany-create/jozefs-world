/* Jozef's World private co-op signalling. TURN requires separately issued ephemeral credentials. */
window.BLOCK_WORLD_NETWORK={
 peerServer:{
  host:'jozefs-world-signalling-3vtw.onrender.com',
  port:443,
  path:'/peerjs/',
  secure:true
 },
 iceServers:[
  {urls:'stun:stun.l.google.com:19302'},
  {urls:'stun:stun1.l.google.com:19302'}
 ]
};
