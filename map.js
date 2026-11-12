(() => {
  const { levels, getUnlockedLevel, getClearedLevel } = window.BottleBlitzLevels;
  const unlocked = getUnlockedLevel();
  const cleared = getClearedLevel();
  const grid = document.getElementById('level-grid');
  document.getElementById('progress-label').textContent = cleared === levels.length ? 'All levels cleared!' : `${unlocked} / ${levels.length} unlocked`;
  document.getElementById('progress-fill').style.width = `${unlocked / levels.length * 100}%`;
  const continueLink = document.getElementById('continue');
  continueLink.href = `game.html?level=${unlocked}`;
  continueLink.textContent = `${cleared === levels.length ? 'Replay' : 'Play'} Level ${String(unlocked).padStart(2, '0')} ↗`;

  for (const level of levels) {
    const playable = level.id <= unlocked;
    const card = document.createElement(playable ? 'a' : 'div');
    card.className = `card ${playable ? 'playable' : 'locked'} ${level.gun === 'twin' ? 'twin' : ''}`;
    if (playable) card.href = `game.html?level=${level.id}`;
    else card.setAttribute('aria-label', `Level ${level.id}, ${level.name}, locked`);
    const normalCount = level.layout.filter(type => type === 'normal').length;
    const reinforcedCount = level.layout.length - normalCount;
    const preview = [level.layout[0], level.layout[Math.floor(level.layout.length / 2)], level.layout[level.layout.length - 1]];
    card.innerHTML = `
      <div class="card-top"><span class="number">${String(level.id).padStart(2, '0')}</span><span class="state">${playable ? (level.id <= cleared ? 'Cleared ✓' : 'Play now ↗') : 'Locked'}</span></div>
      <div class="card-art" aria-hidden="true"><img class="gun" src="assets/gun-${level.gun}.png" alt="">${preview.map((type, i) => `<img class="bottle b${i + 1}" src="assets/bottle-${type}.png" alt="">`).join('')}</div>
      <h2>${level.name}</h2><p>${level.description}</p>
      <div class="stats"><span><b>${level.layout.length}</b> bottles</span><span><b>${level.shots}</b> shots</span>${reinforcedCount ? `<span><b>${reinforcedCount}</b> reinforced</span>` : ''}${level.gun === 'twin' ? '<span><b>2</b> bullets / shot</span>' : ''}</div>`;
    grid.appendChild(card);
  }
})();
