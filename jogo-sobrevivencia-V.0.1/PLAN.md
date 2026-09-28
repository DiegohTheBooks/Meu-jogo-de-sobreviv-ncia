# Game Plan: Ilha Selvagem — Survival 2D

## Risk Tasks

### 1. Babylon 2D camera and world composition
- **Why isolated:** The requested Phaser-style top-down island must run inside Babylon's React canvas without losing the feeling of a larger world.
- **Approach:** Use a dedicated orthographic FreeCamera over an XY plane, a generated island texture on a scaled disc, smooth follow, deterministic spawn points, and a `?demo` autopilot.
- **Verify:** The map extends beyond the viewport; camera follows movement smoothly; ocean, beach, forest, resource clusters and animals remain readable while panning.

### 2. Sprite-like character and animal feedback
- **Why isolated:** 2D character readability, directional movement and damage transitions can fail when composed from Babylon meshes and image planes.
- **Approach:** Use generated transparent survivor art on a billboard-like plane, procedural silhouettes for wildlife, explicit attack/damage/death states, and short emissive hit flashes.
- **Verify:** Male/female selection changes the player visual; movement has visible bobbing; attacks create impact feedback; animals have distinct flee/chase/aggressive behavior.

### 3. Survival loop state transitions
- **Why isolated:** Collection, crafting, combat, cooking and stat decay all touch shared inventory state.
- **Approach:** Keep state in plain TypeScript models and focused systems, use data-driven recipes/weapons, and emit one-line toast feedback for every important action.
- **Verify:** Resources enter inventory, recipes consume only coherent ingredients, weapons equip, raw meat becomes cooked near a fire, eating changes hunger/health, and local save/load preserves progress.

## Main Build

A full-screen playable browser slice of the requested survival loop: character choice menu, exploration of an island larger than the viewport, resources (wood, stone, vine, dry grass, fruit), three animal types (rabbit, boar, wolf), four weapons, arrows, campfire placement, cooking, eating, hunger/thirst/health, inventory/crafting overlays, local save, and a deterministic demo mode.

- **Assets:** Generated visual target, island ground texture, male and female survivor sprites, and wildlife kit stored under `/manus-storage/` and documented in `ASSETS.md`.
- **Verify:**
  - WASD movement and smooth camera follow work without runtime errors.
  - HUD bars are readable and remain inside the viewport.
  - Resource interaction prompt appears near collectible nodes and collection feedback is visible.
  - Crafting and inventory panels open and close without blocking the render loop.
  - Rabbit flees, boar chases after provocation, and wolf detects/chases at longer range.
  - Combat displays attack flash, damage numbers and target health changes.
  - Campfire glows, animates and cooks meat; raw and cooked food produce visibly different stat changes.
  - `?demo` starts deterministically and demonstrates movement, collection, combat and HUD state for screenshots.
  - Local save is written and reload can restore the latest snapshot.
  - No visual glitches, missing textures, or browser console errors during capture.
  - Presentation proof: WebDev screenshots of `/` and `/?demo` after implementation.
