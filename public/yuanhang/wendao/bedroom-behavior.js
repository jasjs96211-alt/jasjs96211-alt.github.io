/* vNext technical slice. Not loaded by the production shell.
 * Only consumes facts; never owns health, study time, location, CG unlocks or storage.
 */
(function (root) {
  'use strict';
  const VERSION = 1;
  const clamp = x => Math.max(0, Math.min(1, x));
  const copy = x => JSON.parse(JSON.stringify(x));
  const finite = x => Number.isFinite(x) && x >= 0;
  const freeze = x => { Object.values(x).forEach(v => { if (v && typeof v === 'object') freeze(v); }); return Object.freeze(x); };
  const hash = n => { n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return (n ^ (n >>> 16)) >>> 0; };
  const phases = [
    ['read', 'bed_read_note', 'read_hold', 40000, '卧榻翻看医札', '她倚枕看着手中的医札。'],
    ['turn', 'bed_read_note', 'page_turn', 1400, '卧榻翻看医札', '指尖正缓缓掀过一页。'],
    ['read_after', 'bed_read_note', 'read_hold', 28000, '卧榻翻看医札', '她读着刚翻到的这一页。'],
    ['put_book', 'bed_read_note', 'book_put_down', 3200, '收起医札', '她正将医札放向榻侧。'],
    ['rest', 'bed_rest_medicine', 'rest_pillow', 28000, '歇息', '书已留在榻侧，她靠着软枕休息。'],
    ['take_bowl', 'bed_rest_medicine', 'bowl_take', 3000, '歇息与用药', '她伸手扶住药盏，慢慢端起。'],
    ['sip', 'bed_rest_medicine', 'bowl_sip', 3500, '歇息与用药', '她正轻抿盏中的药。'],
    ['return_bowl', 'bed_rest_medicine', 'bowl_return', 3000, '放回药盏', '她将药盏慢慢放回榻边。'],
    ['warm', 'bed_warm_recover', 'recover_breathe', 50000, '榻边温养', '药盏已放回，她仍倚枕缓缓调息。'],
    ['nap_enter', 'bed_light_nap', 'nap_enter', 3000, '静养小憩', '她慢慢合上眼，准备小憩。'],
    ['nap', 'bed_light_nap', 'nap_loop', 80000, '静养小憩', '她安静地睡着，书和药盏都在榻侧。'],
    ['wake', 'bed_light_nap', 'wake_slow', 4000, '缓缓醒来', '小憩之后，她缓缓睁开眼。'],
    ['take_book', 'bed_read_note', 'book_take', 3000, '取来医札', '她正将榻侧的医札取到手中。']
  ].map(([id, actionId, clip, duration, title, text]) => freeze({ id, actionId, clip, duration, title, text }));
  const byId = Object.fromEntries(phases.map((p, i) => [p.id, i]));
  const reading = ['read_hold', 'page_turn', 'book_put_down', 'book_take'];
  const medicine = ['bowl_take', 'bowl_sip', 'bowl_return'];
  const napping = ['nap_enter', 'nap_loop', 'wake_slow'];
  const REQUIRED_CLIPS = Object.freeze([...new Set(['recline_breathe', 'blink', 'gaze', 'weak_smile', 'severe_rest', ...phases.map(p => p.clip)])]);

  function create({ manifest = {}, allowPlaceholder = false, seed = 37, snapshot = null } = {}) {
    // A caller must explicitly enable technical assets. Empty/missing/failed assets fail closed.
    const assetClass = manifest.status === 'approved' ? 'approved' : allowPlaceholder && manifest.status === 'placeholder' ? 'placeholder' : 'missing';
    const ready = clip => assetClass !== 'missing' && manifest.clips?.[clip]?.decoded === true && manifest.clips[clip].status === assetClass;
    const all = clips => clips.every(ready);
    const canRead = all(reading), canMedicate = all(medicine), canNap = all(napping);
    const validSaved = snapshot?.version === VERSION && snapshot.assetVersion === manifest.version &&
      Object.hasOwn(byId, snapshot.phase) && finite(snapshot.elapsed) && snapshot.elapsed < phases[byId[snapshot.phase]].duration &&
      Number.isSafeInteger(snapshot.revision) && snapshot.revision >= 0 && finite(snapshot.lastAt) &&
      finite(snapshot.lastGreet) && finite(snapshot.lastClick) && Number.isSafeInteger(snapshot.page) && snapshot.page >= 1 &&
      Number.isSafeInteger(snapshot.cycle) && snapshot.cycle >= 0;
    let index = validSaved ? byId[snapshot.phase] : canRead ? 0 : 4;
    let elapsed = validSaved ? snapshot.elapsed : 0;
    let revision = validSaved ? snapshot.revision : 0;
    let page = validSaved ? snapshot.page : 1, cycle = validSaved ? snapshot.cycle : 0;
    let lastAt = validSaved ? snapshot.lastAt : null;
    let lastGreet = validSaved ? snapshot.lastGreet : 0, lastClick = validSaved ? snapshot.lastClick : 0;
    let present = false, lastFocus = null, reaction = null, previousMode = null;
    let latest = null, visualTime = 0, lastResponse = 0, wasHidden = false;

    function setPhase(i) { index = i; elapsed = 0; revision++; }
    function next() {
      if (index === 1) page++; // Page text changes only after the turn finishes.
      let target = (index + 1) % phases.length;
      if (target === 5 && !canMedicate) target = 8;
      if (target === 8 && !ready('recover_breathe')) target = 9;
      if (target === 9 && !canNap) { target = canRead ? 12 : 4; cycle++; }
      if (target === 12 && !canRead) target = 4;
      if (target === 0) cycle++;
      setPhase(target);
    }

    function tick({ at, state = {}, world = {}, focus = {}, completedSessionIds = [], sisterSleeping = false, hidden = false, reducedMotion = false, intent = null } = {}) {
      if (!finite(at)) throw new TypeError('A non-negative finite authoritative timestamp is required');
      const backward = lastAt !== null && at < lastAt;
      const disputed = backward || state.vitals?.clockDispute === true;
      const gap = lastAt === null ? 0 : at - lastAt;
      // Never replay unobserved minutes after a suspended tab. No wall time enters the study ledger.
      let delta = !hidden && !wasHidden && !disputed && gap <= 10000 ? gap : 0;
      if (lastAt === null || at >= lastAt) lastAt = at;
      const severe = state.vitals?.acuteInjury === true || state.portrait?.state === 'injured';
      const weak = severe || state.vitals?.seriousInjury === true || state.portrait?.state === 'ill';
      const atBed = world.sister === 'bedroom';
      const isPresent = atBed && world.player === 'bedroom' && world.together === true && !hidden;
      if (!present) delta = 0;
      if (isPresent && !wasHidden && !disputed && gap <= 10000) visualTime += gap;
      wasHidden = hidden;
      const mode = !atBed ? 'absent' : disputed ? 'clock_hold' : severe ? 'severe' : sisterSleeping ? 'sleep' : 'routine';
      if (previousMode !== null && mode !== previousMode) {
        // Health/location/sleep always override art. Do not invent a sitting/walking transition.
        setPhase(previousMode === 'sleep' && mode === 'routine' && canNap ? 11 : canRead && previousMode === 'absent' && mode === 'routine' ? 0 : 4);
        reaction = null; delta = 0;
      }
      previousMode = mode;
      if (mode !== 'routine' || !isPresent) delta = 0;
      if (!ready('recline_breathe') || !ready(phases[index].clip) ||
          (index <= 3 || index === 12) && !canRead || index >= 5 && index <= 7 && !canMedicate || index >= 9 && index <= 11 && !canNap) {
        if (index !== 4 || elapsed !== 0) setPhase(4);
        delta = 0;
      }
      if (mode === 'routine') {
        elapsed += delta;
        while (elapsed >= phases[index].duration) {
          const remainder = elapsed - phases[index].duration;
          next(); elapsed = remainder;
        }
      }
      const sleeping = mode === 'sleep' || mode === 'routine' && [9, 10, 11].includes(index);
      const entry = isPresent && !present;
      present = isPresent;
      let cue = null;
      const canReact = isPresent && !disputed && !sleeping && all(['gaze', 'blink']);
      const safeReaction = () => severe ? 'eyes_only' : weak ? 'weak_acknowledge' : 'soft_smile';
      if (canReact && entry && (lastGreet === 0 || at - lastGreet >= 30000)) { lastGreet = at; cue = 'entry'; }
      if (canReact && intent === 'look' && (lastClick === 0 || at - lastClick >= 10000)) { lastClick = at; cue = 'touch'; }
      // Model intentions are limited to gaze/smile. They cannot name a new action, place or state.
      if (canReact && ['eyes_to_player', 'soft_smile'].includes(intent) && (lastClick === 0 || at - lastClick >= 10000)) { lastClick = at; cue = 'ai_intent'; }
      const f = { id: typeof focus.id === 'string' ? focus.id : null, running: focus.running === true };
      if (canReact && lastFocus) {
        if (f.id && f.id !== lastFocus.id && f.running) cue = 'focus_start';
        else if (f.id && f.id === lastFocus.id && f.running !== lastFocus.running) cue = f.running ? 'focus_resume' : 'focus_pause';
        else if (!f.id && lastFocus.id && completedSessionIds.includes(lastFocus.id)) cue = 'focus_complete';
      }
      lastFocus = f;
      if (cue && (lastResponse === 0 || at - lastResponse >= 8000) && ![1, 3, 5, 6, 7, 12].includes(index)) {
        lastResponse = at; reaction = { cue, kind: safeReaction(), at, until: at + (weak ? 2400 : 1800) };
      }
      if (reaction && (at >= reaction.until || !canReact)) reaction = null;
      const p = phases[index], progress = clamp(elapsed / p.duration);
      let actionId = p.actionId, clip = p.clip, title = p.title, text = p.text, phase = p.id;
      const props = { book: canRead ? 'bedside' : 'absent', bowl: canMedicate ? 'bedside' : 'absent', page };
      if (mode === 'routine') {
        if (index <= 2) props.book = 'held';
        else if (index === 3) props.book = 'placing';
        else if (index === 12) props.book = 'taking';
        if (index === 5) props.bowl = 'taking';
        else if (index === 6) props.bowl = 'held';
        else if (index === 7) props.bowl = 'placing';
        if (!canRead && index === 4) text = '她靠着软枕安静歇息。';
        if (!canMedicate && index === 8) { title = '倚枕调息'; text = '她留在榻上，缓缓调息。'; }
        if (index === 10 && (!canRead || !canMedicate)) text = '她安静地睡着，不打扰她。';
      } else {
        phase = mode; actionId = mode === 'severe' ? 'bed_heavy_injury' : mode === 'sleep' ? 'bed_light_nap' : 'bed_hold';
        clip = mode === 'severe' ? 'severe_rest' : mode === 'sleep' ? 'nap_loop' : 'rest_pillow';
        title = { severe: '重伤卧床', sleep: '静养小憩', absent: '姐姐不在寝居', clock_hold: '等候核对时间' }[mode];
        text = { severe: '她仍在疗养，不勉强起身。', sleep: '她正在休息，不打扰她。', absent: '人物地点以现有世界状态为准。', clock_hold: '时间尚未核对，动作暂不推进。' }[mode];
      }
      const available = mode !== 'absent' && ready(clip) && ready('recline_breathe');
      if (mode === 'absent') { props.book = 'absent'; props.bowl = 'absent'; }
      if (!available && mode !== 'absent') { actionId = 'bed_asset_wait'; phase = 'asset_wait'; title = '寝居素材待补齐'; text = '当前没有通过校验的动作素材。'; clip = null; reaction = null; props.book = 'absent'; props.bowl = 'absent'; }
      const animTime = visualTime;
      // Deterministic, irregular blink windows. Micro motion remains local and is not persisted as fact.
      const block = Math.floor(animTime / 5000), blinkAt = 400 + hash(block + seed) % 4000;
      const blinkT = animTime % 5000 - blinkAt;
      const eyes = sleeping ? 0 : reducedMotion || disputed ? .55 : blinkT >= 0 && blinkT < (weak ? 320 : 200) ? 0 : severe ? .3 : .8;
      const motion = {
        eyes, gaze: reaction ? 'player' : props.book === 'held' ? 'book' : 'down',
        smile: !!reaction && reaction.kind !== 'eyes_only' && ready('weak_smile'),
        breath: reducedMotion || disputed || hidden ? 0 : Math.sin(animTime / (weak ? 1200 : 900)) * (severe ? .15 : weak ? .35 : .6),
        progress: reducedMotion ? (progress >= .5 ? 1 : 0) : progress
      };
      latest = freeze({ version: VERSION, revision, actionId, phase, clip, title, text, props,
        location: world.sister || null, anchor: atBed ? 'bed' : null, pose: !atBed ? null : severe || sleeping ? 'lying' : 'reclined',
        following: world.following === true, visible: isPresent && available, status: available ? assetClass : 'unavailable',
        sleeping, severe, weak, reaction: reaction ? { cue: reaction.cue, kind: reaction.kind } : null, motion,
        focus: { ...f, remaining: finite(focus.remaining) ? focus.remaining : null },
        recoveryCGAllowed: state.recoveryCGAllowed === true, needsTimeReview: disputed, resumedAfterGap: gap > 10000 });
      return latest;
    }
    function serialize() { return copy({ version: VERSION, assetVersion: manifest.version || null, phase: phases[index].id, elapsed, revision, lastAt: lastAt ?? 0, lastGreet, lastClick, page, cycle }); }
    function forAI() {
      if (!latest) return null;
      return copy({ source: 'validated-bedroom-presentation', implementation: 'technical-slice-not-production',
        location: latest.location, following: latest.following, actionId: latest.actionId, phase: latest.phase,
        description: latest.text, props: latest.props, pose: latest.pose, sleeping: latest.sleeping,
        assetStatus: latest.status, claimVisibleAction: latest.visible,
        instruction: 'These are read-only scene facts. Never alter health, location, study duration or CG permissions. Missing assets are not performed actions.' });
    }
    return Object.freeze({ tick, serialize, forAI });
  }
  root.WendaoBedroom = Object.freeze({ VERSION, REQUIRED_CLIPS, PHASES: Object.freeze(phases), create });
})(typeof window !== 'undefined' ? window : globalThis);
