// Optional checkpoint and cooperative revision protocol. No automatic storage writes.
// The host must provide an existing backup-before-write persistence adapter.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.JozefSimulationCheckpoint = api;
})(typeof globalThis !== 'undefined' ? globalThis : undefined, function () {
  'use strict';
  const VERSION = 1;
  function validate(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        value.version !== VERSION || !Number.isSafeInteger(value.revision) || value.revision < 0 ||
        !Number.isFinite(value.minute) || typeof value.worldId !== 'string' ||
        value.worldId.length < 1 || value.worldId.length > 128 ||
        !Array.isArray(value.citizens) || value.citizens.length > 10000 ||
        !value.resources || typeof value.resources !== 'object' || Array.isArray(value.resources)) return false;
    return value.citizens.every(c => c && typeof c === 'object' && !Array.isArray(c)) &&
      Object.entries(value.resources).every(([k,v]) => /^[a-z][a-z0-9_-]{0,39}$/i.test(k) && Number.isFinite(v) && v >= 0);
  }
  function snapshot(worldId, revision, minute, citizens, resources) {
    // JSON round trip rejects non-serializable structures and detaches source references.
    const value = JSON.parse(JSON.stringify({ version: VERSION, worldId, revision, minute, citizens, resources }));
    if (!validate(value)) throw new TypeError('Invalid simulation checkpoint');
    return value;
  }
  function reconcile(local, incoming) {
    if (!validate(local) || !validate(incoming)) return { status: 'invalid', checkpoint: local };
    if (local.worldId !== incoming.worldId) return { status: 'different-world', checkpoint: local };
    if (incoming.revision <= local.revision) return { status: 'stale', checkpoint: local };
    // Never silently overwrite: the host must first preserve a recoverable backup
    // and verify authority / membership before accepting a remote revision.
    return { status: 'requires-backup-and-authorization', checkpoint: local, candidate: incoming };
  }
  async function persist(checkpoint, adapter) {
    if (!validate(checkpoint)) throw new TypeError('Invalid simulation checkpoint');
    if (!adapter || typeof adapter.backup !== 'function' || typeof adapter.write !== 'function')
      throw new TypeError('Backup-first adapter required');
    const copy = JSON.parse(JSON.stringify(checkpoint));
    const backedUp = await adapter.backup(copy.worldId);
    if (backedUp !== true) throw new Error('Checkpoint backup not confirmed');
    await adapter.write(copy);
    return true;
  }
  return Object.freeze({ VERSION, validate, snapshot, reconcile, persist });
});
