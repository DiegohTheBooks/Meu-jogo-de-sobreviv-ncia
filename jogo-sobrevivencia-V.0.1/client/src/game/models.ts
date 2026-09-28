import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { Scene } from "@babylonjs/core/scene";
import { AnimalType, Gender, ResourceType, WEAPONS, WeaponId } from "./state";

const survivorUrls: Record<Gender, string> = {
  male: "/manus-storage/survivor-male_d79e7c3a.png",
  female: "/manus-storage/survivor-female_fe189cce.png",
};

function material(scene: Scene, name: string, color: string, emissive = false) {
  const value = new StandardMaterial(name, scene);
  value.diffuseColor = Color3.FromHexString(color);
  value.specularColor = Color3.Black();
  if (emissive) value.emissiveColor = Color3.FromHexString(color);
  return value;
}

export class Player {
  readonly root = new TransformNode("player-root", this.scene);
  readonly mesh: Mesh;
  readonly shadow: Mesh;
  gender: Gender;
  weapon: WeaponId = "club";
  speed = 300;
  health = 100;
  private bob = 0;
  private hitTimer = 0;

  constructor(private readonly scene: Scene, gender: Gender, x: number, y: number) {
    this.gender = gender;
    this.shadow = MeshBuilder.CreateDisc("player-shadow", { radius: 44, tessellation: 32 }, scene);
    this.shadow.parent = this.root; this.shadow.position.z = .05; this.shadow.scaling.y = .42; this.shadow.material = material(scene, "player-shadow-mat", "#05151a");
    this.mesh = MeshBuilder.CreatePlane("player-sprite", { width: 94, height: 108 }, scene);
    this.mesh.parent = this.root; this.mesh.position.z = 2; this.mesh.scaling.y = -1; this.mesh.material = this.spriteMaterial(gender);
    this.root.position.set(x, y, 0);
  }

  private spriteMaterial(gender: Gender) {
    const value = new StandardMaterial(`player-${gender}-mat`, this.scene);
    const texture = new Texture(survivorUrls[gender], this.scene, true, false);
    texture.hasAlpha = true; value.diffuseTexture = texture; value.useAlphaFromDiffuseTexture = true; value.backFaceCulling = false; value.specularColor = Color3.Black();
    return value;
  }

  setGender(gender: Gender) {
    this.gender = gender;
    this.mesh.material?.dispose();
    this.mesh.material = this.spriteMaterial(gender);
  }
  get position() { return this.root.position; }
  updateMovement(dx: number, dy: number, dt: number) {
    const length = Math.hypot(dx, dy);
    if (length > 0) {
      this.root.position.x += (dx / length) * this.speed * dt;
      this.root.position.y += (dy / length) * this.speed * dt;
      this.bob += dt * 12;
      this.mesh.position.y = Math.sin(this.bob) * 3;
      this.mesh.scaling.x = dx < 0 ? -1 : 1;
    } else {
      this.mesh.position.y *= .82;
    }
    if (this.hitTimer > 0) { this.hitTimer -= dt; this.mesh.visibility = Math.sin(this.hitTimer * 34) > -.1 ? 1 : .28; } else this.mesh.visibility = 1;
  }
  flashHit() { this.hitTimer = .32; }
  dispose() { this.root.dispose(false, true); }
}

export class ResourceNode {
  readonly root: TransformNode;
  readonly mesh: Mesh;
  readonly ring: Mesh;
  collected = false;
  private respawnTimer = 0;
  constructor(private readonly scene: Scene, readonly type: ResourceType, x: number, y: number) {
    this.root = new TransformNode(`resource-${type}`, scene); this.root.position.set(x, y, 0);
    this.ring = MeshBuilder.CreateTorus(`resource-ring-${type}`, { diameter: 64, thickness: 3, tessellation: 24 }, scene); this.ring.parent = this.root; this.ring.position.z = .2; this.ring.rotation.x = Math.PI / 2; this.ring.material = material(scene, "resource-ring-mat", "#ead27f", true); this.ring.visibility = .75;
    const colors: Record<ResourceType, string> = { wood: "#5c3b28", stone: "#77837f", vine: "#4c8c5a", dryGrass: "#c5a755", fruit: "#c7585b" };
    this.mesh = type === "wood" ? MeshBuilder.CreateCylinder("tree", { diameter: 56, height: 18, tessellation: 9 }, scene) : MeshBuilder.CreateDisc(`resource-${type}-mesh`, { radius: type === "stone" ? 26 : 22, tessellation: 9 }, scene);
    this.mesh.parent = this.root; this.mesh.position.z = 1; this.mesh.material = material(scene, `resource-${type}-mat`, colors[type]);
    if (type === "wood") {
      this.mesh.scaling.y = 1.3;
      const canopy = MeshBuilder.CreateDisc("tree-crown", { radius: 55, tessellation: 12 }, scene); canopy.parent = this.root; canopy.position.set(-5, 18, .1); canopy.material = material(scene, "tree-crown-mat", "#285d46", true);
      const canopy2 = MeshBuilder.CreateDisc("tree-crown-2", { radius: 45, tessellation: 12 }, scene); canopy2.parent = this.root; canopy2.position.set(22, 0, .12); canopy2.material = material(scene, "tree-crown-2-mat", "#3f8051", true);
    }
  }
  get position() { return this.root.position; }
  collect() { if (this.collected) return false; this.collected = true; this.root.setEnabled(false); this.respawnTimer = 28; return true; }
  update(dt: number) { if (this.collected && this.respawnTimer > 0) { this.respawnTimer -= dt; if (this.respawnTimer <= 0) { this.collected = false; this.root.setEnabled(true); } } if (!this.collected) this.ring.rotation.z += dt * 1.4; }
  dispose() { this.root.dispose(false, true); }
}

export class Animal {
  readonly root: TransformNode;
  readonly body: Mesh;
  readonly shadow: Mesh;
  health: number;
  dead = false;
  provoked = false;
  private flashTimer = 0;
  private phase = Math.random() * 8;
  private wanderAngle = Math.random() * Math.PI * 2;
  constructor(private readonly scene: Scene, readonly type: AnimalType, x: number, y: number) {
    this.root = new TransformNode(`animal-${type}`, scene); this.root.position.set(x, y, 0);
    this.shadow = MeshBuilder.CreateDisc(`${type}-shadow`, { radius: type === "wolf" ? 34 : 29, tessellation: 24 }, scene); this.shadow.parent = this.root; this.shadow.position.z = .08; this.shadow.scaling.y = .44; this.shadow.material = material(scene, `${type}-shadow-mat`, "#08191d");
    const colors: Record<AnimalType, string> = { rabbit: "#e9d2ae", boar: "#614438", wolf: "#76828a" };
    this.body = MeshBuilder.CreateDisc(`${type}-body`, { radius: type === "wolf" ? 36 : type === "boar" ? 40 : 27, tessellation: 14 }, scene); this.body.parent = this.root; this.body.position.z = 1; this.body.material = material(scene, `${type}-body-mat`, colors[type]);
    const ear = MeshBuilder.CreateDisc(`${type}-ear`, { radius: type === "rabbit" ? 13 : 9, tessellation: 8 }, scene); ear.parent = this.root; ear.position.set(-18, 18, 1.1); ear.material = material(scene, `${type}-ear-mat`, colors[type]);
    const eye = MeshBuilder.CreateDisc(`${type}-eye`, { radius: 4, tessellation: 8 }, scene); eye.parent = this.root; eye.position.set(12, 13, 2); eye.material = material(scene, `${type}-eye-mat`, "#132227", true);
    this.health = type === "rabbit" ? 32 : type === "boar" ? 82 : 125;
  }
  get position() { return this.root.position; }
  get maxHealth() { return this.type === "rabbit" ? 32 : this.type === "boar" ? 82 : 125; }
  get detectionRange() { return this.type === "rabbit" ? 190 : this.type === "boar" ? 205 : 500; }
  get speed() { return this.type === "rabbit" ? 170 : this.type === "boar" ? 122 : 150; }
  get attackDamage() { return this.type === "boar" ? 8 : 13; }
  update(dt: number, player: Vector3, onAttack: () => void) {
    if (this.dead) return;
    this.phase += dt;
    const dx = player.x - this.position.x; const dy = player.y - this.position.y; const dist = Math.hypot(dx, dy);
    let moveX = Math.cos(this.wanderAngle + Math.sin(this.phase * .7) * .35) * .25; let moveY = Math.sin(this.wanderAngle + Math.sin(this.phase * .7) * .35) * .25;
    if (this.type === "rabbit" && dist < 240) { moveX = -dx / Math.max(dist, 1); moveY = -dy / Math.max(dist, 1); }
    if (this.type !== "rabbit" && (this.provoked || dist < this.detectionRange)) { moveX = dx / Math.max(dist, 1); moveY = dy / Math.max(dist, 1); if (dist < 58) onAttack(); }
    const length = Math.hypot(moveX, moveY); if (length > .1) { this.position.x += (moveX / length) * this.speed * dt; this.position.y += (moveY / length) * this.speed * dt; this.body.rotation.z = Math.sin(this.phase * 7) * .06; }
    if (this.flashTimer > 0) { this.flashTimer -= dt; this.body.visibility = Math.sin(this.flashTimer * 36) > -.1 ? 1 : .3; } else this.body.visibility = 1;
  }
  takeDamage(amount: number) { this.health -= amount; this.provoked = true; this.flashTimer = .28; if (this.health <= 0) { this.dead = true; this.root.setEnabled(false); } }
  dispose() { this.root.dispose(false, true); }
}

export class Campfire {
  readonly root: TransformNode;
  readonly flame: Mesh;
  readonly light: PointLight;
  lit = true;
  private phase = Math.random() * 10;
  constructor(private readonly scene: Scene, x: number, y: number) {
    this.root = new TransformNode("campfire-root", scene); this.root.position.set(x, y, 0);
    const ring = MeshBuilder.CreateTorus("campfire-stones", { diameter: 92, thickness: 13, tessellation: 12 }, scene); ring.parent = this.root; ring.position.z = .5; ring.rotation.x = Math.PI / 2; ring.material = material(scene, "campfire-stones-mat", "#71665a");
    this.flame = MeshBuilder.CreateDisc("campfire-flame", { radius: 30, tessellation: 10 }, scene); this.flame.parent = this.root; this.flame.position.z = 3; this.flame.material = material(scene, "campfire-flame-mat", "#ef9a45", true);
    this.light = new PointLight("campfire-light", new Vector3(x, y, -10), scene); this.light.diffuse = Color3.FromHexString("#e5a45a"); this.light.specular = Color3.FromHexString("#e5a45a"); this.light.intensity = .9; this.light.range = 430;
  }
  get position() { return this.root.position; }
  update(dt: number) { this.phase += dt * 8; this.flame.scaling.x = .8 + Math.sin(this.phase) * .12; this.flame.scaling.y = 1 + Math.cos(this.phase * .8) * .18; this.flame.position.y = 4 + Math.sin(this.phase * 1.4) * 3; this.light.intensity = .75 + Math.sin(this.phase * .7) * .14; }
  dispose() { this.light.dispose(); this.root.dispose(false, true); }
}
