import { cloneInventory, Inventory, initialInventory, initialStats, RECIPES, Recipe, SavePayload, SurvivalStats, WeaponId } from "./state";

export class SurvivalSystem {
  readonly stats: SurvivalStats;
  private lowTick = 0;
  constructor(stats = initialStats()) { this.stats = { ...stats }; }
  update(dt: number) {
    this.stats.hunger = Math.max(0, this.stats.hunger - dt * .17);
    this.stats.thirst = Math.max(0, this.stats.thirst - dt * .24);
    if (this.stats.hunger < 8 || this.stats.thirst < 8) {
      this.lowTick += dt;
      if (this.lowTick > 2) { this.stats.health = Math.max(0, this.stats.health - dt * 1.4); this.lowTick = 0; }
    } else this.lowTick = 0;
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
    const recipe = RECIPES.find((item) => item.id === recipeId);
    if (!recipe || !this.canCraft(recipe, inventory)) return null;
    for (const [key, amount] of Object.entries(recipe.ingredients)) inventory[key] = (inventory[key] ?? 0) - amount;
    for (const [key, amount] of Object.entries(recipe.output)) inventory[key] = (inventory[key] ?? 0) + amount;
    return recipe;
  }
}

const DB_NAME = "meu-game-sobrevivencia";
const STORE_NAME = "saves";
const SAVE_ID = "main";
const LEGACY_KEY = "ilha-selvagem-save-v1";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class SaveSystem {
  private async withStore<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const request = work(tx.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => reject(tx.error);
    });
  }

  async save(payload: SavePayload) {
    try { await this.withStore("readwrite", store => store.put(payload, SAVE_ID)); }
    catch { /* The game remains playable if persistence is unavailable. */ }
  }

  async load(): Promise<SavePayload | null> {
    try {
      const value = await this.withStore<SavePayload | undefined>("readonly", store => store.get(SAVE_ID));
      if (value) return { ...value, inventory: cloneInventory(value.inventory), version: value.version ?? 2 } as SavePayload;
      return this.migrateLegacySave();
    } catch { return null; }
  }

  async hasSave() { return Boolean(await this.load()); }

  async clear() {
    try { await this.withStore("readwrite", store => store.delete(SAVE_ID)); } catch { /* noop */ }
  }

  private migrateLegacySave(): SavePayload | null {
    try {
      const raw = localStorage.getItem(LEGACY_KEY);
      if (!raw) return null;
      const old = JSON.parse(raw) as Omit<SavePayload, "version"> & { version?: number };
      return {
        version: 2,
        gender: old.gender,
        x: old.x,
        y: old.y,
        inventory: cloneInventory(old.inventory),
        stats: { ...initialStats(), ...old.stats },
        weapon: old.weapon,
        campfires: old.campfires ?? [],
      };
    } catch { return null; }
  }

  static safeInventory(value?: Inventory) { return cloneInventory(value ?? initialInventory()); }
}

export function formatIngredients(ingredients: Inventory) { return Object.entries(ingredients).map(([key, amount]) => `${key} ${amount}`).join(" · "); }
export function weaponOwned(inventory: Inventory, id: WeaponId) { return (inventory[id] ?? 0) > 0; }
