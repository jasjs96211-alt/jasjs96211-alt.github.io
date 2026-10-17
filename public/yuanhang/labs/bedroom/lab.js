/* Code-native wireframe only. No art assets, persistence, AI or real study timer. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id), B = window.WendaoBedroom;
  const manifest = { version: 'wireframe-1', status: 'placeholder', clips: Object.fromEntries(B.REQUIRED_CLIPS.map(id => [id, { status: 'placeholder', decoded: true }])) };
  let director = B.create({ manifest, allowPlaceholder: true }), intent = null;
  let focus = { id: null, running: false, remaining: 1500 }, completed = [], nextId = 0;
  $('missing').onchange = () => { director = B.create({ manifest: $('missing').checked ? {} : manifest, allowPlaceholder: true }); };
  $('look').onclick = () => { intent = 'look'; };
  $('start').onclick = () => { if (!focus.id) focus = { id: 'fixture-' + ++nextId, running: true, remaining: 1500 }; };
  $('pause').onclick = () => { focus.running = false; };
  $('resume').onclick = () => { if (focus.id) focus.running = true; };
  $('complete').onclick = () => { if (focus.id) completed.push(focus.id); focus = { id: null, running: false, remaining: 0 }; };
  $('reset').onclick = () => { focus = { id: null, running: false, remaining: 1500 }; };
  const canvas = $('stage'), c = canvas.getContext('2d');
  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  const heldBook = [610, 346], sideBook = [355, 425], sideBowl = [850, 440], heldBowl = [722, 313];
  const line = (points, color = '#b1cbb7', width = 3) => { c.beginPath(); points.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.strokeStyle = color; c.lineWidth = width; c.stroke(); };
  const ellipse = (x, y, rx, ry, fill, stroke = '#789d8f') => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(); };
  function propPoint(kind, p) {
    const t = p.motion.progress, state = p.props[kind];
    const side = kind === 'book' ? sideBook : sideBowl, held = kind === 'book' ? heldBook : heldBowl;
    return state === 'taking' ? mix(side, held, t) : state === 'placing' ? mix(held, side, t) : state === 'held' ? held : side;
  }
  function render(p) {
    c.clearRect(0, 0, 1100, 720); c.fillStyle = '#182f30'; c.fillRect(0, 0, 1100, 720);
    // Perspective stage guides, not final scene art. Back wall, bed, actor, front rail.
    line([[0, 410], [1100, 410]], '#355854', 2);
    for (let x = -700; x < 1800; x += 170) line([[550, 180], [x, 720]], '#264441', 1);
    c.fillStyle = '#233f3b'; c.fillRect(660, 110, 300, 280);
    for (let x = 680; x < 960; x += 60) line([[x, 110], [x, 390]], '#3f6156');
    line([[180, 410], [780, 340], [975, 490], [310, 580], [180, 410]], '#6c8f7b', 4);
    ellipse(745, 289, 100, 44, '#3b5147');
    c.font = '18px system-ui'; c.fillStyle = '#d0c393'; c.fillText('技术骨架 · 非温知遥美术', 35, 45);
    if (p.visible) {
      const b = p.motion.breath * 8, lying = p.pose === 'lying';
      const head = lying ? [751, 284] : [716, 241];
      const shoulder = lying ? [647, 317 + b] : [646, 308 + b];
      const hip = [500, 410], knee = [370, 433];
      line([head, shoulder, hip, knee, [300, 473]], '#9fb6a4', 15);
      ellipse(...head, 44, 48, '#30514a');
      const gaze = p.motion.gaze === 'player' ? 1 : -4;
      for (const x of [-16, 16]) {
        ellipse(head[0] + x, head[1] - 5, 10, Math.max(1, p.motion.eyes * 8), '#122c2c');
        if (p.motion.eyes > .1) ellipse(head[0] + x + gaze, head[1] - 4, 3, 4, '#e0e0bf');
      }
      line([[head[0] - 10, head[1] + 23], [head[0], head[1] + (p.motion.smile ? 28 : 23)], [head[0] + 10, head[1] + 23]], '#c3d4b7', 2);
      let hand = [565, 388];
      if (!['absent', 'bedside'].includes(p.props.book)) hand = propPoint('book', p);
      if (!['absent', 'bedside'].includes(p.props.bowl)) hand = propPoint('bowl', p);
      line([shoulder, [shoulder[0] - 25, 353 + b], [hand[0] - 35, hand[1] + 12]], '#c5cfb0', 8);
      line([[shoulder[0] + 16, shoulder[1] + 16], [hand[0] + 40, hand[1] + 25], [hand[0] + 25, hand[1] + 6]], '#b1c3a6', 7);
      if (p.props.book !== 'absent') {
        const [x, y] = propPoint('book', p);
        c.fillStyle = '#c6bd94'; c.fillRect(x - 45, y - 25, 90, 50); line([[x, y - 25], [x, y + 25]], '#4c5846', 2);
        if (p.phase === 'turn') { const angle = Math.PI * p.motion.progress; line([[x, y - 25], [x + 43 * Math.cos(angle), y - 25 - 28 * Math.sin(angle)], [x + 43 * Math.cos(angle), y + 25 - 28 * Math.sin(angle)], [x, y + 25]], '#f2e4b3', 3); }
        c.fillStyle = '#38453a'; c.font = '15px monospace'; c.fillText(String(p.props.page), x + 10, y + 8);
      }
      if (p.props.bowl !== 'absent') {
        const [x, y] = propPoint('bowl', p); ellipse(x, y + 7, 29, 20, '#87a5a0'); ellipse(x, y, 30, 9, '#59493b');
      }
      // Separate foreground occluder crosses lower body, not eyes/hands.
      line([[300, 560], [975, 470]], '#55796a', 14);
      if (p.reaction) { c.font = '18px system-ui'; c.fillStyle = '#d4d5b4'; c.fillText(p.reaction.cue + ' / ' + p.reaction.kind, 40, 675); }
    } else { c.font = '26px serif'; c.fillStyle = '#c8c7a5'; c.fillText(p.title, 300, 320); }
    $('phase').textContent = p.actionId + ' / ' + p.phase + ' / ' + (p.clip || '无可用 clip');
    $('title').textContent = p.title; $('description').textContent = p.text;
    $('snapshot').textContent = JSON.stringify(director.forAI(), null, 2);
  }
  let lastPaint = -Infinity;
  function frame(now, schedule = true) {
    if (now - lastPaint >= 1000 / 30) {
      lastPaint = now;
      const health = $('health').value;
      const p = director.tick({ at: Date.now(), world: { sister: 'bedroom', player: $('away').checked ? 'study' : 'bedroom', together: !$('away').checked, following: false },
        state: { portrait: { state: health === 'healthy' ? 'normal' : 'ill' }, vitals: { acuteInjury: health === 'severe', seriousInjury: health !== 'healthy' }, recoveryCGAllowed: health !== 'healthy' },
        focus, completedSessionIds: completed, sisterSleeping: $('sleep').checked, hidden: document.hidden,
        reducedMotion: $('reduced').checked || matchMedia('(prefers-reduced-motion: reduce)').matches, intent });
      intent = null; render(p);
    }
    if (schedule) requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => { lastPaint = -Infinity; frame(performance.now(), false); });
  requestAnimationFrame(frame);
})();
