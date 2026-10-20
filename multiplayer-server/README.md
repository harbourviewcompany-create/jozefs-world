# Dedicated multiplayer signalling
Deploy this folder as a Node service with Railway root directory `/multiplayer-server`.
Health endpoint: `/health`. PeerJS endpoint: `/peerjs`.
Set the client `BLOCK_WORLD_NETWORK.peerServer` host to the public Railway hostname, path `/peerjs/`, port 443.
This service only handles signalling; WebRTC data is end-to-end encrypted by the browser.
**TURN is not included.** Use a managed TURN provider with short-lived credentials returned from an authenticated endpoint. Do not put permanent TURN secrets in the static site.
