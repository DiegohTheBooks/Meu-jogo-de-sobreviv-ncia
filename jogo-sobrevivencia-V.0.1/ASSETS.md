# Assets

## V0.2 policy

The game must not depend on Manus storage, signed URLs, external asset hosts or backend services.

The current Phaser migration uses procedural graphics for runtime entities so the game is self-contained.

## Future repository-owned assets

When final art is introduced, keep it under:

```
client/public/assets/
├── characters/
├── animals/
├── environment/
├── items/
├── effects/
└── audio/
```

Gameplay code should reference repository-local paths only.

## Rule

An asset is considered valid for the project only when the game can run after cloning the repository without credentials, Manus storage, a server-side asset proxy or an online account.
