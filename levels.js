(() => {
  const levels = [
    {
      id: 1, name: 'First Spin', description: 'Learn the rhythm with four easy targets.',
      layout: ['normal', 'normal', 'normal', 'normal'],
      shots: 6, gun: 'single', gunSpeed: 0.66, orbitSpeed: -0.36,
      startGunAngle: -0.35, startOrbitAngle: 0.25
    },
    {
      id: 2, name: 'Fast Glass', description: 'One more bottle and a quicker orbit.',
      layout: ['normal', 'normal', 'normal', 'normal', 'normal'],
      shots: 7, gun: 'single', gunSpeed: 0.78, orbitSpeed: -0.54,
      startGunAngle: -0.42, startOrbitAngle: 0.19
    },
    {
      id: 3, name: 'Tough Glass', description: 'Blue bottles need two well-timed hits.',
      layout: ['normal', 'reinforced', 'normal', 'reinforced'],
      shots: 8, gun: 'single', gunSpeed: 0.77, orbitSpeed: -0.47,
      startGunAngle: -0.35, startOrbitAngle: 0.25
    },
    {
      id: 4, name: 'Reverse Run', description: 'The gun and targets swap their spin.',
      layout: ['normal', 'reinforced', 'normal', 'reinforced', 'normal', 'reinforced'],
      shots: 11, gun: 'single', gunSpeed: -0.82, orbitSpeed: 0.50,
      startGunAngle: 0.40, startOrbitAngle: -0.18
    },
    {
      id: 5, name: 'Twin Strike', description: 'Pair up your aim and break two bottles with one shot.',
      layout: ['normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal'],
      angles: [-11, 11, 79, 101, 169, 191, 259, 281],
      shots: 6, gun: 'twin', spreadDegrees: 11, gunSpeed: 0.92, orbitSpeed: -0.56,
      startGunAngle: -0.29, startOrbitAngle: 0.12
    },
    {
      id: 6, name: 'Final Spin', description: 'Twin fire meets reinforced pairs in the fastest orbit.',
      layout: ['normal', 'reinforced', 'normal', 'reinforced', 'normal', 'reinforced', 'normal', 'reinforced'],
      angles: [-11, 11, 79, 101, 169, 191, 259, 281],
      shots: 10, gun: 'twin', spreadDegrees: 11, gunSpeed: -1.02, orbitSpeed: 0.65,
      startGunAngle: 0.31, startOrbitAngle: -0.23
    }
  ];
  const storageKey = 'bottle-blitz-unlocked-level';
  const clearedKey = 'bottle-blitz-cleared-level';
  let memoryUnlocked = 1;
  let memoryCleared = 0;

  function getUnlockedLevel() {
    try {
      const saved = Number.parseInt(localStorage.getItem(storageKey), 10);
      if (Number.isFinite(saved)) memoryUnlocked = Math.max(memoryUnlocked, saved);
    } catch (_) { /* Browser storage can be disabled. */ }
    return Math.min(levels.length, Math.max(1, memoryUnlocked));
  }

  function unlock(levelId) {
    const next = Math.min(levels.length, Math.max(getUnlockedLevel(), levelId));
    memoryUnlocked = next;
    try { localStorage.setItem(storageKey, String(next)); } catch (_) { /* Keep this page playable. */ }
    return next;
  }

  function getClearedLevel() {
    try {
      const saved = Number.parseInt(localStorage.getItem(clearedKey), 10);
      if (Number.isFinite(saved)) memoryCleared = Math.max(memoryCleared, saved);
    } catch (_) { /* Browser storage can be disabled. */ }
    return Math.min(levels.length, Math.max(memoryCleared, getUnlockedLevel() - 1));
  }

  function complete(levelId) {
    memoryCleared = Math.min(levels.length, Math.max(getClearedLevel(), levelId));
    try { localStorage.setItem(clearedKey, String(memoryCleared)); } catch (_) { /* Keep this page playable. */ }
    unlock(levelId + 1);
  }

  window.BottleBlitzLevels = { levels, getUnlockedLevel, getClearedLevel, complete };
})();
