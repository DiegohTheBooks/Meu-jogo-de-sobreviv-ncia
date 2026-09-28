# Memory

- V0.1 was created in a Manus WebDev environment with Babylon.js, but the project is now being made independent.
- V0.2 uses Phaser 3.90.0 as the game engine and React only as the host shell.
- Runtime assets are intentionally procedural during the migration so the game does not depend on `/manus-storage` or Manus infrastructure.
- Saves now use IndexedDB. The save layer can migrate the old `ilha-selvagem-save-v1` localStorage snapshot once.
- The gameplay goal remains a single-player local survival game: explore, collect, craft, hunt, cook and survive.
