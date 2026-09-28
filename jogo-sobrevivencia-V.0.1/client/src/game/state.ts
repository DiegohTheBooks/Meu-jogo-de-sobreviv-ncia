export type Gender = "male" | "female";
export type ResourceType = "wood" | "stone" | "vine" | "dryGrass" | "fruit";
export type AnimalType = "rabbit" | "boar" | "wolf";
export type WeaponId = "club" | "knife" | "spear" | "bow";

export type Inventory = Record<string, number>;

export interface SurvivalStats { health: number; hunger: number; thirst: number; }
export interface CampfireSave { x: number; y: number; lit: boolean; }
export interface SavePayload {
  version: 1;
  gender: Gender;
  x: number;
  y: number;
  inventory: Inventory;
  stats: SurvivalStats;
  weapon: WeaponId;
  campfires: CampfireSave[];
}

export interface Recipe { id: string; name: string; icon: string; ingredients: Inventory; output: Inventory; description: string; }
export interface WeaponConfig { id: WeaponId; label: string; icon: string; damage: number; range: number; cooldown: number; description: string; }

export const RESOURCE_META: Record<ResourceType, { label: string; icon: string; color: string; amount: number }> = {
  wood: { label: "Madeira", icon: "🪵", color: "#c58d55", amount: 3 },
  stone: { label: "Pedra", icon: "◆", color: "#9aa8a1", amount: 2 },
  vine: { label: "Cipó", icon: "〰", color: "#75b46e", amount: 2 },
  dryGrass: { label: "Mato seco", icon: "✦", color: "#d6b661", amount: 2 },
  fruit: { label: "Fruta", icon: "●", color: "#d57562", amount: 2 },
};

export const WEAPONS: Record<WeaponId, WeaponConfig> = {
  club: { id: "club", label: "Porrete", icon: "🪵", damage: 18, range: 135, cooldown: .55, description: "curto alcance · dano moderado" },
  knife: { id: "knife", label: "Faca", icon: "🔪", damage: 13, range: 100, cooldown: .28, description: "rápida · alcance curto" },
  spear: { id: "spear", label: "Lança", icon: "🗡️", damage: 34, range: 185, cooldown: .85, description: "longo alcance · dano alto" },
  bow: { id: "bow", label: "Arco", icon: "🏹", damage: 24, range: 520, cooldown: 1.05, description: "distância · consome flechas" },
};

export const RECIPES: Recipe[] = [
  { id: "club", name: "Porrete", icon: "🪵", ingredients: { wood: 3, vine: 1 }, output: { club: 1 }, description: "um primeiro instrumento de defesa" },
  { id: "knife", name: "Faca", icon: "🔪", ingredients: { wood: 2, stone: 2, vine: 1 }, output: { knife: 1 }, description: "rápida e precisa" },
  { id: "spear", name: "Lança", icon: "🗡️", ingredients: { wood: 5, stone: 2, vine: 2 }, output: { spear: 1 }, description: "alcance para enfrentar predadores" },
  { id: "bow", name: "Arco", icon: "🏹", ingredients: { wood: 4, vine: 3 }, output: { bow: 1 }, description: "mantenha distância" },
  { id: "arrows", name: "Flechas x5", icon: "➶", ingredients: { wood: 2, stone: 1, vine: 1 }, output: { arrows: 5 }, description: "munição para o arco" },
  { id: "campfire", name: "Fogueira", icon: "🔥", ingredients: { wood: 5, dryGrass: 3, stone: 2 }, output: { campfire: 1 }, description: "cozinhe carne e encontre abrigo" },
];

export function initialInventory(): Inventory {
  return { wood: 2, stone: 1, vine: 2, dryGrass: 2, fruit: 2, rawMeat: 0, cookedMeat: 0, leather: 0, wolfTooth: 0, arrows: 0, club: 0, knife: 0, spear: 0, bow: 0, campfire: 0 };
}

export function initialStats(): SurvivalStats { return { health: 100, hunger: 78, thirst: 82 }; }

export function cloneInventory(value: Inventory): Inventory { return { ...initialInventory(), ...value }; }
