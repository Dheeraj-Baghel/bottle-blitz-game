(() => {
  const canvas = document.getElementById('arena');
  const ctx = canvas.getContext('2d');
  const fireButton = document.getElementById('fire');
  const mobileFireButton = document.getElementById('fire-mobile');
  const retryButton = document.getElementById('retry');
  const resumeButton = document.getElementById('resume');
  const pauseButton = document.getElementById('pause');
  const helpButton = document.getElementById('help');
  const soundButton = document.getElementById('sound');
  const shotsEl = document.getElementById('shots-left');
  const miniShotsEl = document.getElementById('mini-shots');
  const bottlesEl = document.getElementById('bottles-left');
  const ammoEl = document.getElementById('ammo');
  const statusEl = document.getElementById('status');
  const overlay = document.getElementById('overlay');
  const result = document.getElementById('result');
  const resultTitle = document.getElementById('result-title');
  const resultMessage = document.getElementById('result-message');
  const resultGuide = document.getElementById('result-guide');
  const resultMapLink = document.getElementById('result-map');
  const nextLevelLink = document.getElementById('next-level');
  const requestedLevel = new URLSearchParams(window.location.search).get('level');
  const levelId = requestedLevel === null ? 1 : Number(requestedLevel);
  const level = window.BottleBlitzLevels.levels.find(item => item.id === levelId);
  if (!level || level.id > window.BottleBlitzLevels.getUnlockedLevel()) {
    window.location.replace('levels.html');
    return;
  }
  const reinforcedCount = level.layout.filter(type => type === 'reinforced').length;
  document.title = `Level ${String(level.id).padStart(2, '0')} — Bottle Blitz`;
  document.getElementById('level-pill').textContent = `Level ${String(level.id).padStart(2, '0')}`;
  document.getElementById('level-eyebrow').textContent = `LEVEL ${String(level.id).padStart(2, '0')} · ${level.name.toUpperCase()}`;
  document.getElementById('level-intro').textContent = `${level.description} Break all ${level.layout.length} bottles with ${level.shots} shots.`;
  document.getElementById('reinforced-key').hidden = reinforcedCount === 0;
  document.getElementById('gun-badge').hidden = level.gun !== 'twin';
  document.getElementById('arena-label').textContent = level.gun === 'twin' ? 'Twin gun active' : 'The orbit is moving';
  if (level.gun === 'twin') document.getElementById('hint').innerHTML = '<strong>Tip:</strong> aim between a pair of bottles. Each click fires two bullets while spending one shot.';
  document.getElementById('target-count').textContent = `✦ ${level.layout.length} TARGETS`;

  const images = {};
  for (const [key, path] of Object.entries({
    gun: `assets/gun-${level.gun}.png`,
    bottle: 'assets/bottle-normal.png',
    reinforced: 'assets/bottle-reinforced.png',
    bullet: 'assets/bullet-brass.png'
  })) {
    const image = new Image();
    image.src = path;
    images[key] = image;
  }

  const center = 360;
  const trackRadius = 254;
  const bottleCount = level.layout.length;
  const maxShots = level.shots;
  const gunSpeed = level.gunSpeed;
  const orbitSpeed = level.orbitSpeed;
  const shotSpread = (level.spreadDegrees || 0) * Math.PI / 180;
  const bulletSpeed = 750;
  let gunAngle, orbitAngle, shotsLeft, bottles, bullets, particles, bursts, state, lastTime, lastFireAt, spaceHeld;
  let audioContext;
  let soundMuted = false;
  try { soundMuted = localStorage.getItem('bottle-blitz-sound-muted') === '1'; } catch (_) { /* Sound stays available. */ }

  function updateSoundButton() {
    soundButton.textContent = soundMuted ? '♪' : '♫';
    soundButton.setAttribute('aria-label', soundMuted ? 'Unmute sound' : 'Mute sound');
    soundButton.title = soundMuted ? 'Unmute sound' : 'Mute sound';
    soundButton.classList.toggle('muted', soundMuted);
  }

  function tone(startFrequency, endFrequency, duration, volume, delay = 0, type = 'triangle') {
    if (soundMuted) return;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    try {
      if (!audioContext) audioContext = new AudioCtor();
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
      const start = audioContext.currentTime + delay;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(startFrequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + duration);
    } catch (_) { /* Gameplay still works if audio is unavailable. */ }
  }

  function playSound(kind) {
    if (kind === 'shot') tone(520, 160, .11, .055, 0, 'square');
    if (kind === 'crack') tone(700, 290, .14, .065);
    if (kind === 'break') { tone(880, 210, .19, .065); tone(1140, 350, .12, .025, .035); }
    if (kind === 'lose') tone(360, 100, .42, .075);
    if (kind === 'win') {
      tone(523, 523, .20, .05);
      tone(659, 659, .20, .05, .13);
      tone(784, 784, .30, .06, .26);
    }
  }

  function showPause() {
    if (state !== 'playing') return;
    state = 'paused';
    result.classList.toggle('loss', false);
    result.classList.toggle('final', false);
    document.getElementById('result-icon').textContent = 'Ⅱ';
    resultTitle.textContent = 'PAUSED';
    resultMessage.textContent = 'Your aim is on hold. Resume whenever you are ready.';
    resultGuide.hidden = true;
    resumeButton.hidden = false;
    resumeButton.textContent = 'Resume game ↗';
    retryButton.hidden = false;
    retryButton.textContent = 'Restart level ↻';
    nextLevelLink.hidden = true;
    resultMapLink.hidden = false;
    overlay.hidden = false;
    pauseButton.disabled = true;
    helpButton.disabled = true;
    resumeButton.focus();
  }

  function showHelp() {
    if (state !== 'playing') return;
    state = 'help';
    result.classList.toggle('loss', false);
    result.classList.toggle('final', false);
    document.getElementById('result-icon').textContent = '?';
    resultTitle.textContent = 'HOW TO PLAY';
    resultMessage.textContent = 'Time your shots as bottles move around the circle.';
    resultGuide.hidden = false;
    resumeButton.hidden = false;
    resumeButton.textContent = 'Start playing ↗';
    retryButton.hidden = true;
    nextLevelLink.hidden = true;
    resultMapLink.hidden = true;
    overlay.hidden = false;
    pauseButton.disabled = true;
    helpButton.disabled = true;
    resumeButton.focus();
  }

  function resume() {
    if (state !== 'paused' && state !== 'help') return;
    if (state === 'help') {
      try { localStorage.setItem('bottle-blitz-howto-seen', '1'); } catch (_) { /* Continue without storage. */ }
    }
    state = 'playing';
    overlay.hidden = true;
    pauseButton.disabled = false;
    helpButton.disabled = false;
    lastTime = performance.now();
  }

  function toggleSound() {
    soundMuted = !soundMuted;
    try { localStorage.setItem('bottle-blitz-sound-muted', soundMuted ? '1' : '0'); } catch (_) { /* Sound preference remains for this visit. */ }
    updateSoundButton();
    if (!soundMuted) tone(660, 880, .12, .035);
  }

  function reset() {
    gunAngle = level.startGunAngle;
    orbitAngle = level.startOrbitAngle;
    shotsLeft = maxShots;
    bottles = Array.from({ length: bottleCount }, (_, index) => ({
      angle: level.angles ? level.angles[index] * Math.PI / 180 : index * Math.PI * 2 / bottleCount,
      type: level.layout[index],
      hp: level.layout[index] === 'normal' ? 1 : 2
    }));
    bullets = [];
    particles = [];
    bursts = [];
    state = 'playing';
    lastTime = performance.now();
    lastFireAt = -Infinity;
    spaceHeld = false;
    overlay.hidden = true;
    resultGuide.hidden = true;
    resumeButton.hidden = true;
    retryButton.hidden = false;
    retryButton.textContent = 'Replay level ↻';
    resultMapLink.hidden = false;
    fireButton.disabled = false;
    mobileFireButton.disabled = false;
    pauseButton.disabled = false;
    helpButton.disabled = false;
    statusEl.innerHTML = level.gun === 'twin'
      ? '<b>Twin gun ready.</b> One shot sends two bullets.'
      : reinforcedCount ? '<b>Ready.</b> Blue bottles need two hits.' : '<b>Ready.</b> Time your first shot.';
    updateHud();
  }

  function updateHud() {
    shotsEl.textContent = shotsLeft;
    miniShotsEl.textContent = `${shotsLeft} shot${shotsLeft === 1 ? '' : 's'}`;
    const remaining = bottles.filter(bottle => bottle.hp > 0).length;
    bottlesEl.textContent = remaining;
    ammoEl.setAttribute('aria-label', `${shotsLeft} of ${maxShots} bullets remaining`);
    ammoEl.innerHTML = Array.from({ length: maxShots }, (_, index) =>
      `<img src="assets/bullet-brass.png" alt="" class="${index < shotsLeft ? '' : 'spent'}">`
    ).join('');
  }

  function fire() {
    if (state !== 'playing' || shotsLeft <= 0) return;
    const now = performance.now();
    if (now - lastFireAt < 280) return;
    lastFireAt = now;
    shotsLeft -= 1;
    const directions = level.gun === 'twin' ? [-shotSpread, shotSpread] : [0];
    for (const offset of directions) bullets.push({ angle: gunAngle + offset, radius: 162, alive: true });
    playSound('shot');
    statusEl.innerHTML = level.gun === 'twin'
      ? '<b>Twin blast!</b> Two bullets, one shot spent.'
      : '<b>Shot fired.</b> Follow the bullet to the track.';
    updateHud();
    if (shotsLeft === 0) {
      fireButton.disabled = true;
      mobileFireButton.disabled = true;
    }
  }

  function endRound(won) {
    if (state !== 'playing') return;
    state = won ? 'won' : 'lost';
    if (won) window.BottleBlitzLevels.complete(level.id);
    fireButton.disabled = true;
    mobileFireButton.disabled = true;
    pauseButton.disabled = true;
    helpButton.disabled = true;
    result.classList.toggle('loss', !won);
    const finalVictory = won && level.id === window.BottleBlitzLevels.levels.length;
    result.classList.toggle('final', finalVictory);
    resultTitle.textContent = finalVictory ? 'ALL LEVELS CLEAR!' : won ? 'LEVEL CLEAR!' : 'OUT OF SHOTS';
    resultMessage.textContent = won
      ? `You broke every bottle with ${maxShots - shotsLeft} shot${maxShots - shotsLeft === 1 ? '' : 's'}.${level.id < window.BottleBlitzLevels.levels.length ? ` Level ${String(level.id + 1).padStart(2, '0')} is now unlocked.` : ' You cleared the entire map!'}`
      : `${bottles.filter(bottle => bottle.hp > 0).length} bottle${bottles.filter(bottle => bottle.hp > 0).length === 1 ? '' : 's'} left on the track. Watch the gun and try again.`;
    nextLevelLink.hidden = !won || level.id === window.BottleBlitzLevels.levels.length;
    if (!nextLevelLink.hidden) nextLevelLink.href = `game.html?level=${level.id + 1}`;
    document.getElementById('result-icon').textContent = finalVictory ? '★' : won ? '✦' : '↻';
    resultGuide.hidden = true;
    resumeButton.hidden = true;
    retryButton.hidden = false;
    retryButton.textContent = 'Replay level ↻';
    resultMapLink.hidden = false;
    overlay.hidden = false;
    statusEl.innerHTML = won ? '<b>Level cleared.</b> Great timing!' : '<b>Round over.</b> Try again.';
    playSound(won ? 'win' : 'lose');
    if (finalVictory) {
      for (let i = 0; i < 90; i++) {
        particles.push({ x: 60 + Math.random() * 600, y: -Math.random() * 330, vx: -65 + Math.random() * 130, vy: 70 + Math.random() * 100, life: 2 + Math.random() * 2, color: ['#ffb64a', '#21e3cf', '#a8dfff', '#fff1bd'][i % 4], rotation: Math.random() * Math.PI, spin: -4 + Math.random() * 8, size: 4 + Math.random() * 5 });
      }
    }
    (nextLevelLink.hidden ? retryButton : nextLevelLink).focus();
  }

  function pointAt(angle, radius) {
    return { x: center + Math.sin(angle) * radius, y: center - Math.cos(angle) * radius };
  }

  function drawCrack(point) {
    ctx.save();
    ctx.strokeStyle = '#e7f7ff';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#9de9ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(point.x + 2, point.y - 40);
    ctx.lineTo(point.x - 9, point.y - 22);
    ctx.lineTo(point.x + 5, point.y - 9);
    ctx.lineTo(point.x - 6, point.y + 8);
    ctx.lineTo(point.x + 4, point.y + 29);
    ctx.moveTo(point.x + 5, point.y - 9);
    ctx.lineTo(point.x + 17, point.y - 18);
    ctx.moveTo(point.x - 6, point.y + 8);
    ctx.lineTo(point.x - 18, point.y + 18);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e7f7ff';
    ctx.beginPath();
    ctx.arc(point.x + 29, point.y - 59, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#123342';
    ctx.font = '900 16px DM Sans';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('1', point.x + 29, point.y - 58);
    ctx.restore();
  }

  function update(dt) {
    if (state === 'playing') {
      gunAngle += gunSpeed * dt;
      orbitAngle += orbitSpeed * dt;
      for (const bullet of bullets) {
        bullet.radius += bulletSpeed * dt;
        const point = pointAt(bullet.angle, bullet.radius);
        for (const bottle of bottles) {
          if (bottle.hp <= 0) continue;
          const target = pointAt(bottle.angle + orbitAngle, trackRadius);
          if (Math.hypot(point.x - target.x, point.y - target.y) < 39) {
            bottle.hp -= 1;
            bullet.alive = false;
            const broken = bottle.hp === 0;
            const color = bottle.type === 'reinforced' ? '#9cd9ff' : '#66e6bd';
            bursts.push({ x: target.x, y: target.y, life: .42, maxLife: .42, color });
            for (let i = 0; i < (broken ? 22 : 10); i++) {
              const direction = Math.random() * Math.PI * 2;
              const speed = 70 + Math.random() * 150;
              particles.push({ x: target.x, y: target.y, vx: Math.cos(direction) * speed, vy: Math.sin(direction) * speed, life: .55 + Math.random() * .35, color, rotation: Math.random() * Math.PI, spin: -7 + Math.random() * 14, size: 3 + Math.random() * 5 });
            }
            playSound(broken ? 'break' : 'crack');
            const left = bottles.filter(item => item.hp > 0).length;
            statusEl.innerHTML = broken
              ? `<b>Bottle broken!</b> ${left} bottle${left === 1 ? '' : 's'} remaining.`
              : '<b>Armor cracked!</b> Hit that blue bottle once more.';
            updateHud();
            if (left === 0) endRound(true);
            break;
          }
        }
        if (bullet.radius > 330) bullet.alive = false;
      }
      bullets = bullets.filter(bullet => bullet.alive);
      if (state === 'playing' && shotsLeft === 0 && bullets.length === 0) endRound(false);
    }
    if (state !== 'paused' && state !== 'help') {
      for (const particle of particles) {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vy += 180 * dt;
        particle.rotation += particle.spin * dt;
        particle.life -= dt;
      }
      for (const burst of bursts) burst.life -= dt;
      particles = particles.filter(particle => particle.life > 0);
      bursts = bursts.filter(burst => burst.life > 0);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, 720, 720);
    const bg = ctx.createRadialGradient(center, center, 50, center, center, 350);
    bg.addColorStop(0, '#173b41'); bg.addColorStop(.6, '#102b34'); bg.addColorStop(1, '#0a202a');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(center, center, 347, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(112, 187, 174, .23)'; ctx.lineWidth = 2;
    for (const radius of [114, 185, 254, 326]) { ctx.beginPath(); ctx.arc(center, center, radius, 0, Math.PI * 2); ctx.stroke(); }
    ctx.setLineDash([4, 13]); ctx.strokeStyle = 'rgba(104, 218, 193, .21)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(center, center, trackRadius, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < 24; i++) {
      const angle = i * Math.PI / 12;
      const a = pointAt(angle, 338), b = pointAt(angle, 346);
      ctx.strokeStyle = 'rgba(125, 190, 177, .38)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    if (level.gun === 'twin') {
      ctx.setLineDash([5, 9]);
      ctx.strokeStyle = 'rgba(43, 224, 207, .30)';
      ctx.lineWidth = 2;
      for (const offset of [-shotSpread, shotSpread]) {
        const start = pointAt(gunAngle + offset, 155);
        const end = pointAt(gunAngle + offset, trackRadius);
        ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    ctx.save(); ctx.translate(center, center); ctx.rotate(gunAngle);
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 9;
    if (images.gun.complete && images.gun.naturalWidth) ctx.drawImage(images.gun, -75, -183, 150, 225);
    ctx.restore();
    ctx.fillStyle = '#ffb54b'; ctx.beginPath(); ctx.arc(center, center, 10, 0, Math.PI * 2); ctx.fill();
    for (const bottle of bottles) {
      if (bottle.hp <= 0) continue;
      const point = pointAt(bottle.angle + orbitAngle, trackRadius);
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 7;
      const image = bottle.type === 'reinforced' ? images.reinforced : images.bottle;
      if (image.complete && image.naturalWidth) ctx.drawImage(image, point.x - 58, point.y - 87, 116, 174);
      ctx.restore();
      if (bottle.type === 'reinforced' && bottle.hp === 1) drawCrack(point);
    }
    for (const bullet of bullets) {
      const point = pointAt(bullet.angle, bullet.radius);
      ctx.save(); ctx.translate(point.x, point.y); ctx.rotate(bullet.angle);
      ctx.shadowColor = '#ffad43'; ctx.shadowBlur = 16;
      if (images.bullet.complete && images.bullet.naturalWidth) ctx.drawImage(images.bullet, -22, -34, 44, 68);
      ctx.restore();
    }
    for (const burst of bursts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, burst.life / burst.maxLife);
      ctx.strokeStyle = burst.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(burst.x, burst.y, 18 + (1 - burst.life / burst.maxLife) * 58, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    for (const particle of particles) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, particle.life * 1.8);
      ctx.fillStyle = particle.color;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * .65);
      ctx.restore();
    }
  }

  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, .05);
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  fireButton.addEventListener('click', fire);
  mobileFireButton.addEventListener('click', fire);
  canvas.addEventListener('pointerdown', fire);
  retryButton.addEventListener('click', reset);
  resumeButton.addEventListener('click', resume);
  pauseButton.addEventListener('click', showPause);
  helpButton.addEventListener('click', showHelp);
  soundButton.addEventListener('click', toggleSound);
  window.addEventListener('keydown', event => {
    if (event.code === 'Escape' || event.code === 'KeyP') {
      if (event.code === 'KeyP' && ['BUTTON', 'A', 'INPUT', 'TEXTAREA'].includes(event.target?.tagName)) return;
      event.preventDefault();
      if (state === 'playing') showPause();
      else if (state === 'paused' || state === 'help') resume();
      return;
    }
    if (event.code === 'Space') {
      if (['BUTTON', 'A', 'INPUT', 'TEXTAREA'].includes(event.target?.tagName)) return;
      event.preventDefault();
      if (event.repeat || spaceHeld) return;
      spaceHeld = true;
      fire();
    }
  });
  window.addEventListener('keyup', event => { if (event.code === 'Space') spaceHeld = false; });
  window.addEventListener('blur', () => { spaceHeld = false; });
  document.addEventListener('visibilitychange', () => { lastTime = performance.now(); });
  updateSoundButton();
  reset();
  try {
    if (level.id === 1 && window.BottleBlitzLevels.getUnlockedLevel() === 1 && localStorage.getItem('bottle-blitz-howto-seen') !== '1') showHelp();
  } catch (_) { /* The help button remains available. */ }
  requestAnimationFrame(loop);
})();
