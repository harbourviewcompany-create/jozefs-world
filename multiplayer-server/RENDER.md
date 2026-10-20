# Deploy on Render without Railway
1. Open https://dashboard.render.com/select-repo?type=blueprint and authorize harbourviewcompany-create/jozefs-world.
2. Deploy the root render.yaml Blueprint. It creates a free Node signalling service.
3. Confirm https://<your-service>.onrender.com/health returns {"ok":true,...}.
4. Set window.BLOCK_WORLD_NETWORK.peerServer = {host:"<your-service>.onrender.com",port:443,path:"/peerjs/",secure:true} in a script before block-world-coop.js.
5. Verify both phones connect. Render free sleeps after 15 minutes idle and can take roughly one minute to wake.
6. This is **signalling only**. TURN relay must be provided separately with expiring ICE credentials. Do not publish static TURN passwords.
