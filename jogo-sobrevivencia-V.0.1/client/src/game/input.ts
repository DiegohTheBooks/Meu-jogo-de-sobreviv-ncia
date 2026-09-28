export class InputManager {
  private down = new Set<string>();
  private pressed = new Set<string>();
  private readonly onKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (![" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) event.preventDefault();
    if (!this.down.has(key)) this.pressed.add(key);
    this.down.add(key);
  };
  private readonly onKeyUp = (event: KeyboardEvent) => this.down.delete(event.key.toLowerCase());

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("keyup", this.onKeyUp);
    canvas.addEventListener("contextmenu", this.blockContext);
  }

  private blockContext = (event: Event) => event.preventDefault();
  isDown(...keys: string[]) { return keys.some((key) => this.down.has(key.toLowerCase())); }
  consume(key: string) { const normalized = key.toLowerCase(); const result = this.pressed.has(normalized); this.pressed.delete(normalized); return result; }
  clearPressed() { this.pressed.clear(); }
  dispose() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.canvas.removeEventListener("contextmenu", this.blockContext);
  }
}
