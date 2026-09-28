import { Camera } from "@babylonjs/core/Cameras/camera";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { Animal, Campfire, Player, ResourceNode } from "./models";
import { InputManager } from "./input";
import { AnimalType, Gender, Inventory, RECIPES, RESOURCE_META, ResourceType, SavePayload, WEAPONS, WeaponId, initialInventory, initialStats } from "./state";
import { CraftingSystem, SaveSystem, SurvivalSystem } from "./systems";

export interface GameHandle { scene: Scene; dispose(): void; }

type UI = {
  root: HTMLDivElement; menu: HTMLDivElement; stats: HTMLDivElement; health: HTMLDivElement; hunger: HTMLDivElement; thirst: HTMLDivElement; healthValue: HTMLSpanElement; hungerValue: HTMLSpanElement; thirstValue: HTMLSpanElement; day: HTMLSpanElement; time: HTMLSpanElement; weapon: HTMLSpanElement; ammo: HTMLSpanElement; prompt: HTMLDivElement; toast: HTMLDivElement; side: HTMLDivElement; hotbar: HTMLDivElement;
};

const WORLD_W = 1500;
const WORLD_H = 1040;
const islandTextureUrl = "/manus-storage/island-texture_b2255931.png";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "") {
  const node = document.createElement(tag); if (className) node.className = className; return node;
}
function labelForItem(key: string) {
  const labels: Record<string, string> = { wood: "Madeira", stone: "Pedra", vine: "Cipó", dryGrass: "Mato seco", fruit: "Fruta", rawMeat: "Carne crua", cookedMeat: "Carne assada", leather: "Couro", wolfTooth: "Dente de lobo", arrows: "Flechas", club: "Porrete", knife: "Faca", spear: "Lança", bow: "Arco", campfire: "Fogueiras" }; return labels[key] ?? key;
}
function itemIcon(key: string) {
  const icons: Record<string, string> = { wood: "🪵", stone: "◆", vine: "〰", dryGrass: "✦", fruit: "●", rawMeat: "🥩", cookedMeat: "🍖", leather: "▰", wolfTooth: "◇", arrows: "➶", club: "🪵", knife: "🔪", spear: "🗡️", bow: "🏹", campfire: "🔥" }; return icons[key] ?? "•";
}

function buildUI(save: SaveSystem): UI {
  const root = el("div"); root.id = "game-ui";
  const stats = el("div", "hud-card stats-card"); stats.innerHTML = `<div class="game-title">Ilha Selvagem · sobrevivência</div><div class="stat-row"><span class="stat-icon">♥</span><span class="stat-label">Vida</span><span class="stat-bar"><i class="stat-fill health"></i></span><span class="stat-number health-value">100</span></div><div class="stat-row"><span class="stat-icon">◒</span><span class="stat-label">Fome</span><span class="stat-bar"><i class="stat-fill hunger"></i></span><span class="stat-number hunger-value">78</span></div><div class="stat-row"><span class="stat-icon">◈</span><span class="stat-label">Sede</span><span class="stat-bar"><i class="stat-fill thirst"></i></span><span class="stat-number thirst-value">82</span></div>`;
  const dayCard = el("div", "hud-card day-card"); dayCard.innerHTML = `<div class="day-kicker">dia de sobrevivência</div><div class="day-value">DIA <span class="day-number">1</span></div><div class="day-time">manhã · <span class="clock-value">06:40</span></div>`;
  const top = el("div", "hud-top"); top.append(stats, dayCard); root.append(top);
  const prompt = el("div", "prompt"); root.append(prompt);
  const toast = el("div", "toast"); root.append(toast);
  const hotbar = el("div", "hotbar"); root.append(hotbar);
  const side = el("div", "hud-card side-panel"); root.append(side);
  const overlay = el("div", "overlay"); overlay.id = "start-menu";
  overlay.innerHTML = `<div class="menu-wrap"><div class="menu-copy"><div class="eyebrow">um pequeno mundo · uma grande travessia</div><div class="menu-rule"></div><h1 class="menu-title">ILHA<br>SELVAGEM</h1><p class="menu-sub">Explore uma ilha esquecida, reúna o que a mata oferece e transforme cada recurso em mais um dia de vida.</p><div class="character-picker"><button type="button" class="character-card selected" data-gender="male"><img src="/manus-storage/survivor-male_d79e7c3a.png"><div class="character-name">Aruan</div><p class="character-note">sobrevivente · equilibrado</p></button><button type="button" class="character-card" data-gender="female"><img src="/manus-storage/survivor-female_fe189cce.png"><div class="character-name">Iara</div><p class="character-note">sobrevivente · equilibrada</p></button></div><button type="button" class="primary-btn start-button">Começar expedição →</button><button type="button" class="continue-btn continue-button" ${save.hasSave() ? "" : "style=\"display:none\""}>Continuar último abrigo</button></div><div class="menu-art"><div class="art-caption">registro de campo / 01</div><div class="art-mark"></div><img class="animal-strip" src="/manus-storage/animal-kit_a0ac9a36.png" alt="Fauna da ilha"></div></div>`;
  root.append(overlay); document.body.append(root);
  return { root, menu: overlay, stats, health: stats.querySelector(".health") as HTMLDivElement, hunger: stats.querySelector(".hunger") as HTMLDivElement, thirst: stats.querySelector(".thirst") as HTMLDivElement, healthValue: stats.querySelector(".health-value") as HTMLSpanElement, hungerValue: stats.querySelector(".hunger-value") as HTMLSpanElement, thirstValue: stats.querySelector(".thirst-value") as HTMLSpanElement, day: dayCard.querySelector(".day-number") as HTMLSpanElement, time: dayCard.querySelector(".clock-value") as HTMLSpanElement, weapon: el("span"), ammo: el("span"), prompt, toast, side, hotbar };
}

function mat(scene: Scene, name: string, color: string, emissive = false) { const value = new StandardMaterial(name, scene); value.diffuseColor = Color3.FromHexString(color); value.specularColor = Color3.Black(); value.backFaceCulling = false; if (emissive) value.emissiveColor = Color3.FromHexString(color); return value; }

class GameWorld {
  private readonly input: InputManager;
  private readonly save: SaveSystem;
  private readonly crafting = new CraftingSystem();
  private readonly ui: UI;
  private readonly camera: FreeCamera;
  private readonly ground: Mesh;
  private readonly scene: Scene;
  private player: Player | null = null;
  private resources: ResourceNode[] = [];
  private animals: Animal[] = [];
  private campfires: Campfire[] = [];
  private inventory: Inventory = initialInventory();
  private survival = new SurvivalSystem();
  private started = false;
  private paused = false;
  private gender: Gender = "male";
  private elapsed = 0;
  private day = 1;
  private lastAttack = 0;
  private saveTimer = 0;
  private toastTimer = 0;
  private demo = false;
  private demoStep = 0;
  private demoTimer = 0;
  private disposed = false;

  constructor(scene: Scene, engine: Engine, canvas: HTMLCanvasElement) {
    this.scene = scene; this.input = new InputManager(canvas); this.save = new SaveSystem(); this.ui = buildUI(this.save); this.demo = new URLSearchParams(window.location.search).has("demo");
    this.camera = new FreeCamera("island-camera", new Vector3(0, 0, 32), scene); this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA; this.camera.minZ = .1; this.camera.maxZ = 100; this.camera.setTarget(Vector3.Zero()); scene.activeCamera = this.camera;
    new HemisphericLight("sun", new Vector3(0, 0, -1), scene).intensity = .82;
    const sea = MeshBuilder.CreateDisc("ocean", { radius: 2200, tessellation: 64 }, scene); sea.scaling.y = .72; sea.position.z = -.3; sea.material = mat(scene, "ocean-mat", "#0d4650", true);
    const shore = MeshBuilder.CreateDisc("shore", { radius: 1540, tessellation: 64 }, scene); shore.scaling.y = .7; shore.position.z = -.1; shore.material = mat(scene, "shore-mat", "#c9a76e");
    this.ground = MeshBuilder.CreateDisc("island-ground", { radius: 1500, tessellation: 64 }, scene); this.ground.scaling.y = .7; this.ground.position.z = 0; const groundMat = new StandardMaterial("island-texture-mat", scene); const groundTexture = new Texture(islandTextureUrl, scene, true, false); groundMat.diffuseTexture = groundTexture; groundMat.diffuseColor = Color3.White(); groundMat.specularColor = Color3.Black(); groundMat.backFaceCulling = false; groundTexture.uScale = 2.1; groundTexture.vScale = 1.6; this.ground.material = groundMat;
    this.addEnvironmentalAccents();
    this.bindMenu();
    scene.onBeforeRenderObservable.add(() => this.update(Math.min(engine.getDeltaTime() / 1000, .05)));
    this.layoutCamera(engine);
    if (this.demo) window.setTimeout(() => this.start("male", false), 120);
  }

  private addEnvironmentalAccents() {
    const trail = MeshBuilder.CreateLineSystem("shoreline", { lines: Array.from({ length: 22 }, (_, i) => { const a = (i / 22) * Math.PI * 2; const r = 1470; return [new Vector3(Math.cos(a) * r, Math.sin(a) * r * .7, .08), new Vector3(Math.cos(a + .025) * (r - 25), Math.sin(a + .025) * (r - 25) * .7, .08)]; }) }, this.scene); trail.color = Color3.FromHexString("#e1c47e");
  }

  private bindMenu() {
    let selected: Gender = "male";
    this.ui.menu.querySelectorAll<HTMLButtonElement>("[data-gender]").forEach((button) => button.addEventListener("click", () => { selected = button.dataset.gender as Gender; this.ui.menu.querySelectorAll(".character-card").forEach((card) => card.classList.toggle("selected", card === button)); }));
    this.ui.menu.querySelector<HTMLButtonElement>(".start-button")?.addEventListener("click", () => this.start(selected, false));
    this.ui.menu.querySelector<HTMLButtonElement>(".continue-button")?.addEventListener("click", () => { const payload = this.save.load(); this.start(payload?.gender ?? selected, true); });
  }

  private start(gender: Gender, resume: boolean) {
    this.gender = gender; this.started = true; this.paused = false; this.ui.menu.remove();
    const payload = resume ? this.save.load() : null;
    this.inventory = SaveSystem.safeInventory(payload?.inventory); this.survival = new SurvivalSystem(payload?.stats ?? initialStats()); this.day = payload ? Math.max(1, Math.floor((payload.x + payload.y + 2000) % 5) + 1) : 1;
    this.player = new Player(this.scene, gender, payload?.x ?? 0, payload?.y ?? 0); this.player.weapon = payload?.weapon ?? (this.inventory.club ? "club" : "club");
    this.spawnWorld(payload);
    this.showToast(resume ? "Seu abrigo foi encontrado. Continue a jornada." : "A ilha observa. Comece reunindo madeira, pedra e cipó.");
  }

  private spawnWorld(payload?: SavePayload | null) {
    const resourceSeeds: Array<[ResourceType, number, number]> = [
      ["wood", -260, -120], ["wood", -520, -300], ["wood", 220, -360], ["wood", 510, 220], ["wood", -680, 360], ["wood", 720, -420],
      ["stone", -130, 250], ["stone", 340, 320], ["stone", -760, -40], ["stone", 740, 90], ["stone", 100, 560],
      ["vine", 100, -130], ["vine", -430, 80], ["vine", 390, -120], ["vine", -820, -280], ["vine", 650, 440],
      ["dryGrass", -40, 370], ["dryGrass", 460, -30], ["dryGrass", -620, 200], ["dryGrass", 860, 260],
      ["fruit", 280, -520], ["fruit", -330, -470], ["fruit", 560, 390], ["fruit", -860, 300],
    ];
    this.resources = resourceSeeds.map(([type, x, y]) => new ResourceNode(this.scene, type, x, y));
    this.animals = [new Animal(this.scene, "rabbit", 190, 60), new Animal(this.scene, "boar", -250, 160), new Animal(this.scene, "wolf", 340, -170)];
    (payload?.campfires ?? []).forEach((fire) => this.campfires.push(new Campfire(this.scene, fire.x, fire.y)));
    this.renderHotbar(); this.renderSidePanel();
  }

  private layoutCamera(engine: Engine) { const width = engine.getRenderWidth() / Math.max(engine.getRenderHeight(), 1); const height = 760; this.camera.orthoTop = height / 2; this.camera.orthoBottom = -height / 2; this.camera.orthoLeft = -height * width / 2; this.camera.orthoRight = height * width / 2; }

  private update(dt: number) {
    if (this.disposed || !this.started || !this.player) return;
    if (this.paused) { this.input.clearPressed(); return; }
    this.elapsed += dt; this.lastAttack -= dt; this.saveTimer += dt; this.demoTimer += dt;
    const movement = this.getMovement(); this.player.speed = this.demo ? 135 : 300; this.player.updateMovement(movement.x, movement.y, dt); this.player.position.x = Math.max(-1320, Math.min(1320, this.player.position.x)); this.player.position.y = Math.max(-905, Math.min(905, this.player.position.y));
    this.survival.update(dt); this.resources.forEach((resource) => resource.update(dt)); this.campfires.forEach((fire) => fire.update(dt)); this.animals.forEach((animal) => animal.update(dt, this.player!.position, () => this.takePlayerDamage(animal.attackDamage)));
    this.handleActions();
    const target = new Vector3(this.player.position.x, this.player.position.y, -32); this.camera.position.x += (target.x - this.camera.position.x) * Math.min(1, dt * 5.2); this.camera.position.y += (target.y - this.camera.position.y) * Math.min(1, dt * 5.2); this.camera.setTarget(new Vector3(this.camera.position.x, this.camera.position.y, 0));
    this.updateClock(); this.updatePrompt(); this.renderHud();
    if (this.saveTimer > 8) { this.saveTimer = 0; this.saveGame(); }
    if (this.survival.stats.health <= 0) this.showDeath();
  }

  private getMovement() {
    if (this.demo) { const path = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: .2 }, { x: 0, y: -1 }]; if (this.demoTimer > 3.5) { this.demoTimer = 0; this.demoStep = (this.demoStep + 1) % path.length; } return path[this.demoStep]; }
    return { x: (this.input.isDown("d", "arrowright") ? 1 : 0) - (this.input.isDown("a", "arrowleft") ? 1 : 0), y: (this.input.isDown("s", "arrowdown") ? 1 : 0) - (this.input.isDown("w", "arrowup") ? 1 : 0) };
  }

  private handleActions() {
    if (this.input.consume("e")) this.collectNearest();
    if (this.input.consume(" ")) this.attack();
    if (this.input.consume("f")) this.eat();
    if (this.input.consume("g")) this.placeCampfire();
    if (this.input.consume("q")) this.cook();
    if (this.input.consume("i")) this.openInventory();
    if (this.input.consume("c")) this.openCrafting();
    (["1", "2", "3", "4"] as const).forEach((key, index) => { if (this.input.consume(key)) { const ids: WeaponId[] = ["club", "knife", "spear", "bow"]; const id = ids[index]; if ((this.inventory[id] ?? 0) > 0) { this.player!.weapon = id; this.showToast(`${WEAPONS[id].label} equipada.`); } else this.showToast(`Fabrique a ${WEAPONS[id].label.toLowerCase()} primeiro.`); } });
    if (this.demo && this.demoTimer > 1.8) { this.collectNearest(); if (this.lastAttack <= 0) this.attack(); }
  }

  private nearestResource() { if (!this.player) return null; return this.resources.filter((item) => !item.collected).map((item) => ({ item, distance: Vector3.Distance(this.player!.position, item.position) })).sort((a, b) => a.distance - b.distance)[0] ?? null; }
  private nearestAnimal() { if (!this.player) return null; return this.animals.filter((item) => !item.dead).map((item) => ({ item, distance: Vector3.Distance(this.player!.position, item.position) })).sort((a, b) => a.distance - b.distance)[0] ?? null; }
  private nearestFire() { if (!this.player) return null; return this.campfires.map((item) => ({ item, distance: Vector3.Distance(this.player!.position, item.position) })).sort((a, b) => a.distance - b.distance)[0] ?? null; }

  private collectNearest() { const nearest = this.nearestResource(); if (!nearest || nearest.distance > 140) { this.showToast("Aproxime-se de um recurso marcado para coletar."); return; } const { item } = nearest; if (!item.collect()) return; const meta = RESOURCE_META[item.type]; this.inventory[item.type] = (this.inventory[item.type] ?? 0) + meta.amount; this.showToast(`${meta.icon} +${meta.amount} ${meta.label.toLowerCase()}`); this.renderSidePanel(); }
  private attack() {
    if (!this.player || this.lastAttack > 0) return; const weapon = WEAPONS[this.player.weapon]; if (this.player.weapon === "bow") { if ((this.inventory.arrows ?? 0) <= 0) { this.showToast("Sem flechas. Fabrique munição no menu de crafting."); return; } this.inventory.arrows -= 1; }
    this.lastAttack = weapon.cooldown; const nearest = this.nearestAnimal(); if (!nearest || nearest.distance > weapon.range) { this.showToast(`${weapon.label}: nenhum alvo no alcance.`); return; }
    nearest.item.takeDamage(weapon.damage); this.player.flashHit(); this.createImpact(nearest.item.position, weapon.id); this.showToast(`${weapon.icon} ${weapon.label} atingiu ${this.animalName(nearest.item.type)} · -${weapon.damage}`);
    if (nearest.item.dead) { const reward: Inventory = nearest.item.type === "rabbit" ? { rawMeat: 2 } : nearest.item.type === "boar" ? { rawMeat: 3, leather: 2 } : { rawMeat: 4, wolfTooth: 1 }; Object.entries(reward).forEach(([key, amount]) => this.inventory[key] = (this.inventory[key] ?? 0) + amount); this.showToast(`Caça concluída · +${reward.rawMeat} carne${nearest.item.type === "boar" ? " · +2 couro" : nearest.item.type === "wolf" ? " · +1 dente" : ""}`); this.renderSidePanel(); }
  }
  private createImpact(position: Vector3, weapon: WeaponId) { const impact = MeshBuilder.CreateDisc("impact", { radius: weapon === "bow" ? 22 : 30, tessellation: 16 }, this.scene); impact.position.set(position.x, position.y, 4); impact.material = mat(this.scene, "impact-mat", "#f1d27d", true); const start = performance.now(); const animate = () => { if (!impact.isDisposed()) { const progress = (performance.now() - start) / 180; impact.scaling.setAll(1 + progress * 1.8); impact.visibility = Math.max(0, 1 - progress); if (progress < 1) requestAnimationFrame(animate); else impact.dispose(); } }; animate(); }
  private takePlayerDamage(amount: number) { if (!this.player) return; if (this.demo) { this.player.flashHit(); return; } this.survival.stats.health = Math.max(0, this.survival.stats.health - amount); this.player.flashHit(); this.showToast(`Impacto recebido · -${amount} vida`); }
  private animalName(type: AnimalType) { return type === "rabbit" ? "coelho" : type === "boar" ? "javali" : "lobo"; }

  private placeCampfire() { if ((this.inventory.campfire ?? 0) <= 0) { this.showToast("Fabrique uma fogueira no menu C primeiro."); return; } if (!this.player) return; const x = this.player.position.x + 86; const y = this.player.position.y + 30; this.inventory.campfire -= 1; this.campfires.push(new Campfire(this.scene, x, y)); this.showToast("🔥 Fogueira acesa. Pressione Q perto dela para cozinhar."); this.renderSidePanel(); }
  private cook() { const fire = this.nearestFire(); if (!fire || fire.distance > 170) { this.showToast("Aproxime-se de uma fogueira para cozinhar."); return; } const amount = Math.min(2, this.inventory.rawMeat ?? 0); if (!amount) { this.showToast("Você não tem carne crua."); return; } this.inventory.rawMeat -= amount; this.inventory.cookedMeat = (this.inventory.cookedMeat ?? 0) + amount; this.showToast(`🔥 ${amount} carne${amount > 1 ? "s" : ""} assada${amount > 1 ? "s" : ""}. Mais nutritiva.`); this.renderSidePanel(); }
  private eat() { const kind = (this.inventory.cookedMeat ?? 0) > 0 ? "cookedMeat" : (this.inventory.fruit ?? 0) > 0 ? "fruit" : "rawMeat"; if (this.survival.eat(kind, this.inventory)) { const label = kind === "cookedMeat" ? "carne assada" : kind === "rawMeat" ? "carne crua" : "fruta"; this.showToast(`Você comeu ${label}. Fome e vida recuperadas.`); this.renderSidePanel(); } else this.showToast("Nada comestível no inventário."); }

  private openInventory() { this.openPanel("INVENTÁRIO", `<div class="inventory-grid">${Object.entries(this.inventory).filter(([, amount]) => amount > 0).map(([key, amount]) => `<div class="inventory-line"><span>${itemIcon(key)} ${labelForItem(key)}</span><span>${amount}</span></div>`).join("") || `<p style="color:#afc0b0;font-size:12px">Seu inventário está vazio.</p>`}</div><p style="color:#9fb2a2;font-size:11px;margin-top:16px">F para comer · C para fabricar · G para colocar uma fogueira</p>`); }
  private openCrafting() { const render = () => { this.openPanel("CRAFTING", `<p style="color:#aebdad;font-size:11px;margin:0 0 12px">Recursos encontrados na ilha viram ferramentas para ir mais longe.</p><div>${RECIPES.map((recipe) => `<div class="recipe"><div><strong>${recipe.icon} ${recipe.name}</strong><small>${recipe.description}<br>${Object.entries(recipe.ingredients).map(([key, amount]) => `${itemIcon(key)} ${amount} ${labelForItem(key)}`).join(" · ")}</small></div><button data-recipe="${recipe.id}" ${this.crafting.canCraft(recipe, this.inventory) ? "" : "disabled"}>Fabricar</button></div>`).join("")}</div>`); this.ui.root.querySelectorAll<HTMLButtonElement>("[data-recipe]").forEach((button) => button.addEventListener("click", () => { const recipe = this.crafting.craft(button.dataset.recipe ?? "", this.inventory); if (recipe) { this.showToast(`${recipe.icon} ${recipe.name} fabricado.`); this.renderSidePanel(); render(); } })); }; render(); }
  private openPanel(title: string, body: string) { this.paused = true; const panel = el("div", "panel-overlay"); panel.innerHTML = `<div class="modal"><div class="modal-head"><div class="modal-title">${title}</div><button type="button" class="close-btn">×</button></div>${body}</div>`; panel.querySelector(".close-btn")?.addEventListener("click", () => { panel.remove(); this.paused = false; }); this.ui.root.append(panel); }

  private updatePrompt() { const resource = this.nearestResource(); const fire = this.nearestFire(); const animal = this.nearestAnimal(); if (resource && resource.distance < 150) { const meta = RESOURCE_META[resource.item.type]; this.ui.prompt.textContent = `E · coletar ${meta.icon} ${meta.label}`; this.ui.prompt.classList.add("show"); } else if (fire && fire.distance < 175) { this.ui.prompt.textContent = "Q · cozinhar carne"; this.ui.prompt.classList.add("show"); } else if (animal && animal.distance < 210 && !animal.item.dead) { this.ui.prompt.textContent = `ESPAÇO · atacar ${this.animalName(animal.item.type)}`; this.ui.prompt.classList.add("show"); } else { this.ui.prompt.classList.remove("show"); } }
  private renderHud() { const s = this.survival.stats; this.ui.health.style.width = `${s.health}%`; this.ui.hunger.style.width = `${s.hunger}%`; this.ui.thirst.style.width = `${s.thirst}%`; this.ui.healthValue.textContent = `${Math.ceil(s.health)}`; this.ui.hungerValue.textContent = `${Math.ceil(s.hunger)}`; this.ui.thirstValue.textContent = `${Math.ceil(s.thirst)}`; if (this.player) { const config = WEAPONS[this.player.weapon]; this.ui.weapon.textContent = `${config.icon} ${config.label}`; this.ui.ammo.textContent = this.player.weapon === "bow" ? `${this.inventory.arrows ?? 0} flechas` : config.description; } }
  private renderHotbar() { this.ui.hotbar.innerHTML = `<div class="hotbar-hint">1—4 equipar</div>${(["club", "knife", "spear", "bow"] as WeaponId[]).map((id, index) => { const owned = (this.inventory[id] ?? 0) > 0; const active = this.player?.weapon === id; return `<div class="slot ${active ? "active" : ""}" style="opacity:${owned ? 1 : .42}"><span class="slot-key">${index + 1}</span><span class="slot-icon">${WEAPONS[id].icon}</span><span class="slot-name">${WEAPONS[id].label}</span></div>`; }).join("")}`; }
  private renderSidePanel() { const important = ["wood", "stone", "vine", "fruit", "rawMeat", "cookedMeat", "arrows"]; this.ui.side.innerHTML = `<div class="panel-kicker">mochila · <span>${this.player ? (this.player.weapon ? WEAPONS[this.player.weapon].label : "mãos") : ""}</span></div>${important.map((key) => `<div class="inventory-line"><span>${itemIcon(key)} ${labelForItem(key)}</span><span>${this.inventory[key] ?? 0}</span></div>`).join("")}<div class="inventory-line" style="border:0;padding-top:9px;color:#f0d98e"><span>☷ I / C</span><span>abrir</span></div>`; this.renderHotbar(); }
  private updateClock() { const phase = this.elapsed % 120; const totalMinutes = 400 + phase * 8; const hours = Math.floor(totalMinutes / 60) % 24; const minutes = Math.floor(totalMinutes % 60); this.ui.day.textContent = `${this.day}`; this.ui.time.textContent = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`; }
  private showToast(message: string) { this.ui.toast.textContent = message; this.ui.toast.classList.add("show"); this.toastTimer = 2.4; window.setTimeout(() => { this.toastTimer -= 2.4; if (this.toastTimer <= 0) this.ui.toast.classList.remove("show"); }, 2400); }
  private saveGame() { if (!this.player) return; const payload: SavePayload = { version: 1, gender: this.gender, x: this.player.position.x, y: this.player.position.y, inventory: { ...this.inventory }, stats: { ...this.survival.stats }, weapon: this.player.weapon, campfires: this.campfires.map((fire) => ({ x: fire.position.x, y: fire.position.y, lit: true })) }; this.save.save(payload); }
  private showDeath() { this.paused = true; const overlay = el("div", "overlay death"); overlay.innerHTML = `<div class="menu-copy" style="position:relative;z-index:1;text-align:center"><div class="eyebrow">a ilha venceu esta vez</div><h1 class="menu-title">A NOITE<br>CHEGOU</h1><p class="menu-sub" style="margin-left:auto;margin-right:auto">Sua fogueira e seu inventário foram preservados no último abrigo.</p><button class="primary-btn" type="button">Tentar novamente</button></div>`; overlay.querySelector("button")?.addEventListener("click", () => window.location.reload()); this.ui.root.append(overlay); this.saveGame(); }
  dispose() { this.disposed = true; this.saveGame(); this.input.dispose(); this.player?.dispose(); this.resources.forEach((item) => item.dispose()); this.animals.forEach((item) => item.dispose()); this.campfires.forEach((item) => item.dispose()); this.ui.root.remove(); }
}

export async function createGameScene(engine: Engine, canvas: HTMLCanvasElement): Promise<GameHandle> {
  const scene = new Scene(engine); scene.clearColor = new Color4(.025, .09, .105, 1); const world = new GameWorld(scene, engine, canvas); return { scene, dispose: () => { world.dispose(); scene.dispose(); } };
}
