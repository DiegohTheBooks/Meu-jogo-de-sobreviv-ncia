import { cloneInventory, Inventory, initialInventory, initialStats, RECIPES, Recipe, SavePayload, SurvivalStats, WeaponId } from "./state";

export class SurvivalSystem {
  readonly stats: SurvivalStats;
  private lowTick = 0;
  constructor(stats = initialStats()) { this.stats = { ...stats }; }
  update(dt: number) {
    this.stats.hunger = Math.max(0, this.stats.hunger - dt * .17);
    this.stats.thirst = Math.max(0, this.stats.thirst - dt * .24);
    if (this.stats.hunger < 8 || this.stats.thirst < 8) { this.lowTick += dt; if (this.lowTick > 2) { this.stats.health = Math.max(0, this.stats.health - dt * 1.4); this.lowTick = 0; } } else this.lowTick = 0;
  }
  eat(kind: "rawMeat" | "cookedMeat" | "fruit", inventory: Inventory) {
    if ((inventory[kind] ?? 0) <= 0) return false;
    inventory[kind] -= 1;
    if (kind === "fruit") { this.stats.hunger = Math.min(100, this.stats.hunger + 18); this.stats.thirst = Math.min(100, this.stats.thirst + 4); }
    if (kind === "rawMeat") { this.stats.hunger = Math.min(100, this.stats.hunger + 24); this.stats.health = Math.min(100, this.stats.health + 2); }
    if (kind === "cookedMeat") { this.stats.hunger = Math.min(100, this.stats.hunger + 45); this.stats.health = Math.min(100, this.stats.health + 16); }
    return true;
  }
}

export class CraftingSystem {
  canCraft(recipe: Recipe, inventory: Inventory) { return Object.entries(recipe.ingredients).every(([key, amount]) => (inventory[key] ?? 0) >= amount); }
  craft(recipeId: string, inventory: Inventory) {
    const recipe = RECIPES.find((item) => item.id === recipeId); if (!recipe || !this.canCraft(recipe, inventory)) return null;
    for (const [key, amount] of Object.entries(recipe.ingredients)) inventory[key] = (inventory[key] ?? 0) - amount;
    for (const [key, amount] of Object.entries(recipe.output)) inventory[key] = (inventory[key] ?? 0) + amount;
    return recipe;
  }
}

const SAVE_KEY = "ilha-selvagem-save-v1";
export class SaveSystem {
  save(payload: SavePayload) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(payload)); } catch { /* private mode fallback: game remains playable */ }
  }
  load(): SavePayload | null {
    try { const value = localStorage.getItem(SAVE_KEY); return value ? JSON.parse(value) as SavePayload : null; } catch { return null; }
  }
  hasSave() { return Boolean(this.load()); }
  clear() { try { localStorage.removeItem(SAVE_KEY); } catch { /* noop */ } }
  static safeInventory(value?: Inventory) { return cloneInventory(value ?? initialInventory()); }
}

export function formatIngredients(ingredients: Inventory) { return Object.entries(ingredients).map(([key, amount]) => `${key} ${amount}`).join(" · "); }
export function weaponOwned(inventory: Inventory, id: WeaponId) { return (inventory[id] ?? 0) > 0; }
