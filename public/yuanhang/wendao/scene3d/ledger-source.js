import {adaptSnapshot} from './contract.js';

// Reads source-owned ledger rows. Does not create events or derive actions from prose.
// Call once to prime, then update while foreground/live. Resume the bridge explicitly.
export function createLedgerSceneSource(bridge, {now = () => Date.now(), adapt = adaptSnapshot, includeDetails = false} = {}) {
  let observedAt = null, known = new Set(), sequence = 0;
  const mapped = Object.freeze({study: 'read', rest: 'rest'});
  function update({ledger = [], snapshot = {}, live = false} = {}) {
    const at = now(), previous = observedAt;
    bridge.setSnapshot(snapshot);
    const rows = Array.isArray(ledger) ? ledger : [];
    const groups = new Map();
    for (const row of rows) {
      if (!row || typeof row.id !== 'string' || !(row.id.startsWith('life:v4:') || includeDetails && row.kind==='detail') || !Number.isFinite(row.at)) continue;
      const group = groups.get(row.id) || []; group.push(row); groups.set(row.id, group);
    }
    const fresh = [...groups].filter(([id]) => !known.has(id));
    known = new Set(groups.keys());
    observedAt = Number.isFinite(at) ? at : null;
    const result = reason => ({accepted: false, reason, sourceEventId: null});
    if (!Number.isFinite(at) || at < 0 || previous !== null && at < previous) {
      bridge.suspend(); return result('clock-hold');
    }
    if (previous === null || !live) {bridge.suspend();return result('baseline-only');}
    const facts = adapt(snapshot);
    if (!facts.canMove || facts.sleeping || facts.clockHold || snapshot.world?.busy) {
      bridge.suspend(); return result('state-blocked');
    }
    // Only a newly observed event within the current foreground interval is eligible.
    // Pick the latest event BEFORE mapping: a later unsupported event must not revive an old read.
    const candidates = fresh.filter(([, group]) => group.some(row => row.at >= previous && row.at <= at && at - row.at < 60000));
    candidates.sort((a, b) => Math.max(...b[1].map(r=>r.at)) - Math.max(...a[1].map(r=>r.at)) || a[0].localeCompare(b[0]));
    if (!candidates.length) return result('no-fresh-event');
    const [id, group] = candidates[0], row = group[0];
    if (group.some(other => other.at !== row.at || other.kind !== row.kind || other.bodyState !== row.bodyState)) return result('conflicting-source');
    const projection=snapshot.state?.schedule;
    const activity = row.status==='unresolved'?null:row.kind==='detail'?
      (projection?.valid&&projection.eventId===row.id&&projection.kind==='rest'?'rest':null):Object.hasOwn(mapped, row.kind) ? mapped[row.kind] : null;
    // A healthy current snapshot cannot turn a sick historical event into a standing action.
    if (!activity || row.bodyState !== 'normal') return result('unsupported-event');
    const submission = bridge.submit({id, sequence: sequence++, source: 'autonomy', activity,
      requestedAt: row.at, expiresAt: row.at + 60000});
    return {...submission, sourceEventId: id};
  }
  return {update};
}
