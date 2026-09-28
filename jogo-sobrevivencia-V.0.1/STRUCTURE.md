# Structure

## Host
- `client/src/App.tsx` — sole route renders the game canvas.
- `client/src/components/GameCanvas.tsx` — lifecycle-safe React/Babylon bridge.
- `client/src/index.css` — HUD, menu, overlay, typography and responsive styling.

## Gameplay modules
- `client/src/game/scene.ts` — scene composition, camera, world loop, DOM HUD, menu and input wiring.
- `client/src/game/state.ts` — typed inventory, survival state, recipes, weapon data and save payloads.
- `client/src/game/input.ts` — semantic keyboard input and cleanup.
- `client/src/game/models.ts` — `Player`, `ResourceNode`, `Animal`, and `Campfire` own their Babylon meshes and local behavior.
- `client/src/game/systems.ts` — `CraftingSystem`, `SurvivalSystem`, and `SaveSystem` own rules independent of React.

## Rendering contract
Babylon owns the canvas, scene graph, orthographic camera, lights, materials and render loop. React only mounts the canvas. The DOM HUD is created and destroyed by the game scene so gameplay remains framework-agnostic.

## Asset hints
- Generated island texture: tile/stretch on the top-down island disc.
- Generated survivor male/female PNGs: alpha-enabled player plane and character selection cards.
- Generated animal kit: field-guide visual in the start menu; runtime wildlife uses lightweight procedural silhouettes for distinct AI and low object count.
- Generated reference: start-menu scenic backdrop and art-direction anchor.

## Expansion seams
Add new `ResourceType`, recipes, `WeaponId`, animal behavior modes, campfire upgrades and biomes without changing React. Save payload is versioned and already includes world structures.
