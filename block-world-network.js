/* Set peerServer.host to the deployed HTTPS signalling hostname (no https://).
   GitHub Pages is public: never place permanent TURN passwords in this file.
   Leave peerServer null until the dedicated endpoint is live. */
window.BLOCK_WORLD_NETWORK={
 peerServer:null,
 iceServers:[
  {urls:'stun:stun.l.google.com:19302'},
  {urls:'stun:stun1.l.google.com:19302'}
 ]
};
