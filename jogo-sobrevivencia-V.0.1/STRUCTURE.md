# Structure — V0.2 foundation

## Host
- `client/src/App.tsx` — mounts the game.
- `client/src/components/GameCanvas.tsx` — lifecycle-safe React/Phaser bridge.
- `client/src/index.css` — HUD, menus, inventory and responsive presentation.

## Game
- `client/src/game/scene.ts` — Phaser 3 world, player, animals, resources, campfires, camera and interaction loop.
- `client/src/game/state.ts` — typed gameplay data, recipes, weapons and versioned save payload.
- `client/src/game/systems.ts` — survival, crafting and IndexedDB persistence.

## Engine
The game now uses **Phaser 3.90.0**. React is only the host shell; gameplay is owned by Phaser.

There is no Babylon.js dependency and no Manus runtime/storage dependency in the application stack.

## Persistence
Saves use IndexedDB database `meu-game-sobrevivencia`, store `saves`, record `main`.

The save layer is versioned and can migrate the old `ilha-selvagem-save-v1` localStorage snapshot once. New saves are written to IndexedDB.

## Current V0.2 migration state
- Phaser 3 gameplay scene: migrated.
- localStorage primary save: replaced by IndexedDB.
- Manus Vite runtime/storage proxy: removed.
- Manus-hosted image paths: no longer required by the game.
- Runtime art: temporarily procedural, so the project is self-contained while independent assets are organized.

## Next seams
1. Move final art/audio into repository-owned `public/assets`.
2. Split the large Phaser scene into entities/systems as the gameplay stabilizes.
3. Persist more world state (resource timers, animal state) after the core migration is validated.
4. Add real sprite sheets, animation states, audio and richer biome composition.
