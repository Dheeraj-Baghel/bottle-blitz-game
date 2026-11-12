# Bottle Blitz — playable prototype

Open `index.html` in a browser and select **Choose a level**. The first level is unlocked. Clearing a level unlocks the next one and saves completion in the same browser.

## Controls

- Click or tap **Fire**.
- Click or tap the arena.
- Press **Space** when the page itself is focused.
- Press **P** or **Escape** to pause or resume. The arena buttons also open help and toggle sound.

## Checkpoints complete

- **1:** rotating gun and bottles, visible bullet, hit detection, bottle break effect.
- **2:** finite shot limit, win and loss screens, restart.
- **3:** normal and reinforced bottles, visible crack after the first armored hit, two-hit break rule.
- **4:** six-level map, separate level layouts and speeds, saved unlocks, and next-level flow.
- **5:** twin gun in Levels 05–06; each click fires two bullets while spending one shot. Paired bottle layouts reward hitting both bullets.
- **6:** pause and resume, first-play instructions, optional sound with saved mute preference, stronger bottle-hit effects, and a final victory scene. Progress remains saved in the browser, and the Fire control works on mobile.

Levels 01–02 use normal bottles. Reinforced bottles start in Level 03. The twin gun unlocks in Level 05.

Level definitions live in `levels.js`. Each level sets its target order, shots, gun, rotation speeds, and starting angles. Twin levels also set paired target angles and shot spread.
