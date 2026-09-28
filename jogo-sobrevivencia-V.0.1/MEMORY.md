# Memory

- The original brief requests Phaser 3, but this Manus game-dev environment requires Babylon.js inside a WebDev React host. The gameplay model is kept framework-agnostic and the visual result remains a 2D top-down browser game.
- WebDev static projects must keep large media out of `client/public` and use `/manus-storage/...` URLs.
- Babylon uses an XY plane with an orthographic FreeCamera; gameplay coordinates are deliberately 2D and z is used only for draw ordering.
- React 19 StrictMode can mount effects twice; `GameCanvas.tsx` guards engine creation and disposes the scene/input listeners.
- `?demo` is the deterministic screenshot path and starts the game immediately.
