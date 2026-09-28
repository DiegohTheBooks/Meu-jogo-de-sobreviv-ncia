import Phaser from "phaser";
import {
  AnimalType, Gender, Inventory, RECIPES, RESOURCE_META, ResourceType,
  SavePayload, WEAPONS, WeaponId, initialInventory, initialStats
} from "./state";
import { CraftingSystem, SaveSystem, SurvivalSystem } from "./systems";

const WORLD_W = 1800;
const WORLD_H = 1200;
const PLAYER_SPEED = 260;

type ResourceEntity = {
  id: string;
  type: ResourceType;
  x: number;
  y: number;
  object: Phaser.GameObjects.Container;
  collected: boolean;
  respawn: number;
};

type AnimalEntity = {
  id: string;
  type: AnimalType;
  x: number;
  y: number;
  object: Phaser.GameObjects.Container;
  health: number;
  dead: boolean;
  provoked: boolean;
  attackTimer: number;
  phase: number;
  angle: number;
};

type FireEntity = {
  x: number;
  y: number;
  object: Phaser.GameObjects.Container;
  phase: number;
};

type UI = {
  root: HTMLDivElement;
  menu: HTMLDivElement;
  health: HTMLElement;
  hunger: HTMLElement;
  thirst: HTMLElement;
  healthValue: HTMLElement;
  hungerValue: HTMLElement;
  thirstValue: HTMLElement;
  day: HTMLElement;
  time: HTMLElement;
  prompt: HTMLDivElement;
  toast: HTMLDivElement;
  side: HTMLDivElement;
  hotbar: HTMLDivElement;
};

const labels: Record<string, string> = {
  wood: "Madeira", stone: "Pedra", vine: "Cipó", dryGrass: "Mato seco",
  fruit: "Fruta", rawMeat: "Carne crua", cookedMeat: "Carne assada",
  leather: "Couro", wolfTooth: "Dente de lobo", arrows: "Flechas",
  club: "Porrete", knife: "Faca", spear: "Lança", bow: "Arco", campfire: "Fogueiras",
};
const icons: Record<string, string> = {
  wood: "🪵", stone: "◆", vine: "〰", dryGrass: "✦", fruit: "●",
  rawMeat: "🥩", cookedMeat: "🍖", leather: "▰", wolfTooth: "◇",
  arrows: "➶", club: "🪵", knife: "🔪", spear: "🗡️", bow: "🏹", campfire: "🔥",
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function buildUI(save: SaveSystem): UI {
  const root = el("div"); root.id = "game-ui";
  const top = el("div", "hud-top");
  const stats = el("div", "hud-card stats-card");
  stats.innerHTML = `<div class="game-title">Ilha Selvagem · sobrevivência</div>
    <div class="stat-row"><span class="stat-icon">♥</span><span class="stat-label">Vida</span><span class="stat-bar"><i class="stat-fill health"></i></span><span class="stat-number health-value">100</span></div>
    <div class="stat-row"><span class="stat-icon">◒</span><span class="stat-label">Fome</span><span class="stat-bar"><i class="stat-fill hunger"></i></span><span class="stat-number hunger-value">78</span></div>
    <div class="stat-row"><span class="stat-icon">◈</span><span class="stat-label">Sede</span><span class="stat-bar"><i class="stat-fill thirst"></i></span><span class="stat-number thirst-value">82</span></div>`;
  const day = el("div", "hud-card day-card");
  day.innerHTML = `<div class="day-kicker">dia de sobrevivência</div><div class="day-value">DIA <span class="day-number">1</span></div><div class="day-time">manhã · <span class="clock-value">06:40</span></div>`;
  top.append(stats, day); root.append(top);

  const prompt = el("div", "prompt"); root.append(prompt);
  const toast = el("div", "toast"); root.append(toast);
  const hotbar = el("div", "hotbar"); root.append(hotbar);
  const side = el("div", "hud-card side-panel"); root.append(side);

  const menu = el("div", "overlay"); menu.id = "start-menu";
  menu.innerHTML = `<div class="menu-wrap">
    <div class="menu-copy">
      <div class="eyebrow">um pequeno mundo · uma grande travessia</div><div class="menu-rule"></div>
      <h1 class="menu-title">ILHA<br>SELVAGEM</h1>
      <p class="menu-sub">Explore uma ilha esquecida, reúna o que a mata oferece e transforme cada recurso em mais um dia de vida.</p>
      <div class="character-picker">
        <button type="button" class="character-card selected" data-gender="male"><div class="character-symbol">🧭</div><div class="character-name">Aruan</div><p class="character-note">sobrevivente · equilibrado</p></button>
        <button type="button" class="character-card" data-gender="female"><div class="character-symbol">🌿</div><div class="character-name">Iara</div><p class="character-note">sobrevivente · equilibrada</p></button>
      </div>
      <button type="button" class="primary-btn start-button">Começar expedição →</button>
      <button type="button" class="continue-btn continue-button" style="display:none">Continuar último abrigo</button>
    </div>
    <div class="menu-art"><div class="art-caption">PHASER 3 · FUNDAÇÃO INDEPENDENTE</div><div class="art-mark">◈</div><div class="animal-strip">🐇　🐗　🐺</div></div>
  </div>`;
  root.append(menu);
  document.body.append(root);

  save.hasSave().then(has => {
    const button = menu.querySelector<HTMLButtonElement>(".continue-button");
    if (button) button.style.display = has ? "" : "none";
  });

  return {
    root, menu,
    health: stats.querySelector(".health")!, hunger: stats.querySelector(".hunger")!,
    thirst: stats.querySelector(".thirst")!, healthValue: stats.querySelector(".health-value")!,
    hungerValue: stats.querySelector(".hunger-value")!, thirstValue: stats.querySelector(".thirst-value")!,
    day: day.querySelector(".day-number")!, time: day.querySelector(".clock-value")!,
    prompt, toast, side, hotbar
  };
}

export class SurvivalScene extends Phaser.Scene {
  private readonly save = new SaveSystem();
  private readonly crafting = new CraftingSystem();
  private readonly survival = new SurvivalSystem();
  private readonly inventory: Inventory = initialInventory();
  private ui!: UI;
  private player!: Phaser.GameObjects.Container;
  private playerGender: Gender = "male";
  private weapon: WeaponId = "club";
  private resources: ResourceEntity[] = [];
  private animals: AnimalEntity[] = [];
  private fires: FireEntity[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private started = false;
  private paused = false;
  private elapsed = 0;
  private day = 1;
  private attackCooldown = 0;
  private saveTimer = 0;
  private toastTimer = 0;
  private selectedGender: Gender = "male";
  private deadShown = false;

  constructor() { super("SurvivalScene"); }

  create() {
    this.createWorld();
    this.ui = buildUI(this.save);
    this.bindMenu();
    this.createKeyboard();
    this.renderSidePanel();
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setZoom(Math.min(this.scale.width / 1050, this.scale.height / 720));
    this.cameras.main.setBackgroundColor("#0a4a52");
    this.cameras.main.fadeIn(500);
  }

  private createWorld() {
    const bg = this.add.graphics();
    bg.fillStyle(0x0b4a54, 1).fillRect(0, 0, WORLD_W, WORLD_H);
    bg.fillStyle(0xc5a66d, 1).fillEllipse(WORLD_W / 2, WORLD_H / 2, 1700, 1080);
    bg.fillStyle(0x6e9565, 1).fillEllipse(WORLD_W / 2, WORLD_H / 2, 1580, 980);
    bg.lineStyle(10, 0xe1c47e, .55).strokeEllipse(WORLD_W / 2, WORLD_H / 2, 1680, 1060);
    bg.setDepth(-1000);

    const accents = this.add.graphics().setDepth(-900);
    for (let i = 0; i < 70; i++) {
      const x = 160 + ((i * 283) % 1480);
      const y = 130 + ((i * 191) % 940);
      accents.fillStyle(i % 3 === 0 ? 0x3f754c : 0x547f50, .18);
      accents.fillCircle(x, y, 18 + (i % 5) * 5);
    }

    const positions = [
      [270,250],[430,830],[690,300],[1060,220],[1370,360],[1510,720],[1180,930],[500,520]
    ];
    positions.forEach(([x,y],i) => this.createResource(`tree-${i}`,"wood",x,y));
    const stones = [[340,420],[800,180],[1260,540],[930,850],[1490,500],[620,980]];
    stones.forEach(([x,y],i)=>this.createResource(`stone-${i}`,"stone",x,y));
    const vines = [[540,330],[990,420],[1300,800],[760,690],[260,700]];
    vines.forEach(([x,y],i)=>this.createResource(`vine-${i}`,"vine",x,y));
    const grass = [[370,640],[720,500],[1110,650],[1420,250],[1230,1000]];
    grass.forEach(([x,y],i)=>this.createResource(`grass-${i}`,"dryGrass",x,y));
    const fruit = [[470,260],[880,340],[1280,680],[580,770],[1090,1030]];
    fruit.forEach(([x,y],i)=>this.createResource(`fruit-${i}`,"fruit",x,y));

    this.createAnimal("rabbit", 390, 520, 0);
    this.createAnimal("rabbit", 1180, 350, 1);
    this.createAnimal("rabbit", 1330, 890, 2);
    this.createAnimal("boar", 680, 820, 3);
    this.createAnimal("boar", 1320, 540, 4);
    this.createAnimal("wolf", 1480, 860, 5);
    this.createAnimal("wolf", 1050, 180, 6);
  }

  private createPlayer(x = 900, y = 600) {
    const c = this.add.container(x,y).setDepth(500);
    const shadow = this.add.ellipse(0,22,58,20,0x082027,.35);
    const body = this.add.rectangle(0,0,34,48,this.playerGender === "male" ? 0x355c75 : 0x6e4c72);
    const head = this.add.circle(0,-30,16,0xd8ad86);
    const hair = this.add.arc(0,-37,16,200,340,false,0x322a28);
    const direction = this.add.triangle(0,0,0,0,14,6,0,12,0xf1d58a);
    c.add([shadow, body, head, hair, direction]);
    c.setSize(48,62);
    this.player = c;
  }

  private createResource(id: string, type: ResourceType, x: number, y: number) {
    const c = this.add.container(x,y);
    const ring = this.add.circle(0,0,30,0xe9d27f,.12).setStrokeStyle(2,0xe9d27f,.45);
    const g = this.add.graphics();
    if (type === "wood") {
      g.fillStyle(0x5c3b28,1).fillRect(-9,-5,18,36);
      g.fillStyle(0x2c6748,1).fillCircle(-14,-20,27).fillCircle(14,-22,29).fillCircle(0,-35,25);
    } else if (type === "stone") {
      g.fillStyle(0x77837f,1).fillCircle(0,5,25).lineStyle(2,0xa9b3ad,.7).strokeCircle(0,5,25);
    } else if (type === "vine") {
      g.lineStyle(7,0x4c8c5a,1); g.beginPath(); g.moveTo(-18,18); g.lineTo(-5,-12); g.lineTo(18,10); g.strokePath();
      g.fillStyle(0x6fae65,1).fillCircle(-8,-8,7).fillCircle(8,4,7);
    } else if (type === "dryGrass") {
      g.lineStyle(5,0xc5a755,1); for(let i=-2;i<=2;i++) { g.moveTo(i*5,18); g.lineTo(i*7,-18); } g.strokePath();
    } else {
      g.fillStyle(0x315f43,1).fillCircle(0,5,22); g.fillStyle(0xd57562,1).fillCircle(0,-2,10);
    }
    c.add([ring,g]).setDepth(y);
    this.resources.push({id,type,x,y,object:c,collected:false,respawn:0});
  }

  private createAnimal(type: AnimalType, x: number, y: number, index: number) {
    const c = this.add.container(x,y).setDepth(y);
    const color = type === "rabbit" ? 0xe2cdb0 : type === "boar" ? 0x64483a : 0x7c878b;
    const shadow = this.add.ellipse(0,18,type === "wolf" ? 66 : 54,18,0x07181d,.35);
    const body = this.add.ellipse(0,0,type === "wolf" ? 66 : type === "boar" ? 72 : 48,type === "wolf" ? 42 : 48,color);
    const head = this.add.circle(type === "rabbit" ? 17 : 26,-5,type === "rabbit" ? 14 : 17,color);
    const ear1 = this.add.triangle(-12,-25,0,0,14,0,5,22,color);
    const ear2 = this.add.triangle(2,-25,0,0,14,0,5,22,color);
    const eye = this.add.circle(34,-9,3,0x172225);
    c.add([shadow,body,head,ear1,ear2,eye]);
    const health = type === "rabbit" ? 32 : type === "boar" ? 82 : 125;
    this.animals.push({id:`${type}-${index}`,type,x,y,object:c,health,dead:false,provoked:false,attackTimer:0,phase:index,angle:index});
  }

  private createCampfire(x:number,y:number) {
    const c=this.add.container(x,y).setDepth(y);
    const stones=this.add.graphics().fillStyle(0x71665a,1);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;stones.fillCircle(Math.cos(a)*30,Math.sin(a)*16,9);}
    const glow=this.add.circle(0,0,72,0xf0a04d,.10);
    const flame=this.add.triangle(0,-20,0,0,24,48,-24,48,0xef9a45,1);
    const inner=this.add.triangle(0,-8,0,0,12,30,-12,30,0xf5d16b,1);
    c.add([glow,stones,flame,inner]);
    this.fires.push({x,y,object:c,phase:Math.random()*8});
  }

  private bindMenu() {
    this.ui.menu.querySelectorAll<HTMLButtonElement>("[data-gender]").forEach(button => {
      button.addEventListener("click", () => {
        this.selectedGender = button.dataset.gender as Gender;
        this.ui.menu.querySelectorAll(".character-card").forEach(card => card.classList.toggle("selected", card === button));
      });
    });
    this.ui.menu.querySelector<HTMLButtonElement>(".start-button")?.addEventListener("click", () => void this.startNew(this.selectedGender));
    this.ui.menu.querySelector<HTMLButtonElement>(".continue-button")?.addEventListener("click", () => void this.continueSave());
  }

  private createKeyboard() {
    const kb=this.input.keyboard!;
    this.keys = {
      w:kb.addKey("W"), a:kb.addKey("A"), s:kb.addKey("S"), d:kb.addKey("D"),
      up:kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP), down:kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      left:kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT), right:kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      space:kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE), e:kb.addKey("E"), f:kb.addKey("F"),
      g:kb.addKey("G"), q:kb.addKey("Q"), i:kb.addKey("I"), c:kb.addKey("C"),
      one:kb.addKey(Phaser.Input.Keyboard.KeyCodes.ONE), two:kb.addKey(Phaser.Input.Keyboard.KeyCodes.TWO), three:kb.addKey(Phaser.Input.Keyboard.KeyCodes.THREE), four:kb.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
    };
  }

  private async startNew(gender: Gender) {
    this.playerGender = gender; this.weapon = "club";
    Object.assign(this.inventory, initialInventory());
    Object.assign(this.survival.stats, initialStats());
    this.elapsed=0; this.day=1;
    this.clearDynamicWorld(); this.createPlayer(); this.started=true; this.paused=false; this.ui.menu.style.display="none";
    this.showToast("A ilha está viva. Explore e encontre recursos.");
    this.saveGame();
  }

  private async continueSave() {
    const data=await this.save.load();
    if(!data){this.showToast("Nenhum abrigo encontrado.");return;}
    this.playerGender=data.gender; this.weapon=data.weapon;
    Object.assign(this.inventory, SaveSystem.safeInventory(data.inventory));
    Object.assign(this.survival.stats, {...initialStats(),...data.stats});
    this.elapsed=data.elapsed ?? 0; this.day=data.day ?? 1;
    this.clearDynamicWorld(); this.createPlayer(data.x,data.y);
    data.campfires?.forEach(f=>this.createCampfire(f.x,f.y));
    this.started=true; this.paused=false; this.ui.menu.style.display="none";
    this.showToast("Abrigo restaurado pelo IndexedDB.");
  }

  private clearDynamicWorld() {
    this.player?.destroy();
    this.fires.forEach(f=>f.object.destroy(true)); this.fires=[];
    this.resources.forEach(r=>r.object.destroy(true)); this.resources=[];
    this.animals.forEach(a=>a.object.destroy(true)); this.animals=[];
    this.createWorld();
  }

  update(_: number, deltaMs: number) {
    if(!this.started || this.paused || this.deadShown) return;
    const dt=Math.min(deltaMs/1000,.05);
    this.elapsed+=dt; this.saveTimer+=dt; this.attackCooldown=Math.max(0,this.attackCooldown-dt);
    this.survival.update(dt);
    this.updatePlayer(dt);
    this.updateResources(dt);
    this.updateAnimals(dt);
    this.updateFires(dt);
    this.handleActions();
    this.updateCamera();
    this.renderHud();
    if(this.saveTimer>=8){this.saveTimer=0;void this.saveGame();}
    if(this.survival.stats.health<=0)this.showDeath();
  }

  private updatePlayer(dt:number){
    let dx=(this.keys.d.isDown||this.keys.right.isDown?1:0)-(this.keys.a.isDown||this.keys.left.isDown?1:0);
    let dy=(this.keys.s.isDown||this.keys.down.isDown?1:0)-(this.keys.w.isDown||this.keys.up.isDown?1:0);
    const len=Math.hypot(dx,dy); if(len){dx/=len;dy/=len;this.player.x=Phaser.Math.Clamp(this.player.x+dx*PLAYER_SPEED*dt,80,WORLD_W-80);this.player.y=Phaser.Math.Clamp(this.player.y+dy*PLAYER_SPEED*dt,80,WORLD_H-80);this.player.scaleX=dx<0?-1:1;}
    this.player.y+=0; this.player.setDepth(this.player.y+20);
  }

  private updateResources(dt:number){
    this.resources.forEach(r=>{
      if(r.collected){r.respawn-=dt;if(r.respawn<=0){r.collected=false;r.object.setVisible(true);}}
      if(!r.collected)r.object.list[0].rotation += dt*.8;
    });
  }

  private updateAnimals(dt:number){
    for(const a of this.animals){
      if(a.dead)continue;
      a.phase+=dt; a.attackTimer=Math.max(0,a.attackTimer-dt);
      const dx=this.player.x-a.x,dy=this.player.y-a.y,dist=Math.hypot(dx,dy)||1;
      let mx=Math.cos(a.angle+Math.sin(a.phase*.7)*.35)*.22,my=Math.sin(a.angle+Math.sin(a.phase*.7)*.35)*.22;
      if(a.type==="rabbit" && dist<240){mx=-dx/dist;my=-dy/dist;}
      if(a.type!=="rabbit" && (a.provoked||dist<(a.type==="wolf"?500:205))){mx=dx/dist;my=dy/dist;if(dist<58&&a.attackTimer<=0){a.attackTimer=1.15;this.takePlayerDamage(a.type==="boar"?8:13);}}
      const m=Math.hypot(mx,my)||1;a.x+=mx/m*(a.type==="rabbit"?170:a.type==="boar"?122:150)*dt;a.y+=my/m*(a.type==="rabbit"?170:a.type==="boar"?122:150)*dt;
      a.x=Phaser.Math.Clamp(a.x,90,WORLD_W-90);a.y=Phaser.Math.Clamp(a.y,90,WORLD_H-90);a.object.setPosition(a.x,a.y);a.object.setDepth(a.y);
      a.object.rotation=Math.sin(a.phase*7)*.035;
    }
  }

  private updateFires(dt:number){
    this.fires.forEach(f=>{f.phase+=dt*8;f.object.setDepth(f.y);const flame=f.object.list[2] as Phaser.GameObjects.Triangle;flame.scaleX=.9+Math.sin(f.phase)*.1;flame.scaleY=1+Math.cos(f.phase*.8)*.12;});
  }

  private handleActions(){
    if(Phaser.Input.Keyboard.JustDown(this.keys.e))this.collectNearest();
    if(Phaser.Input.Keyboard.JustDown(this.keys.space))this.attack();
    if(Phaser.Input.Keyboard.JustDown(this.keys.f))this.eat();
    if(Phaser.Input.Keyboard.JustDown(this.keys.g))this.placeCampfire();
    if(Phaser.Input.Keyboard.JustDown(this.keys.q))this.cook();
    if(Phaser.Input.Keyboard.JustDown(this.keys.i))this.openInventory();
    if(Phaser.Input.Keyboard.JustDown(this.keys.c))this.openCrafting();
    const slots:[string,WeaponId][]=[["one","club"],["two","knife"],["three","spear"],["four","bow"]];
    slots.forEach(([key,id])=>{if(Phaser.Input.Keyboard.JustDown(this.keys[key])){if((this.inventory[id]??0)>0){this.weapon=id;this.showToast(`${WEAPONS[id].label} equipada.`);}else this.showToast(`Fabrique a ${WEAPONS[id].label.toLowerCase()} primeiro.`);}});
  }

  private nearestResource(){return this.resources.filter(r=>!r.collected).map(r=>({r,d:Phaser.Math.Distance.Between(this.player.x,this.player.y,r.x,r.y)})).sort((a,b)=>a.d-b.d)[0]??null;}
  private nearestAnimal(){return this.animals.filter(a=>!a.dead).map(a=>({a,d:Phaser.Math.Distance.Between(this.player.x,this.player.y,a.x,a.y)})).sort((a,b)=>a.d-b.d)[0]??null;}
  private nearestFire(){return this.fires.map(f=>({f,d:Phaser.Math.Distance.Between(this.player.x,this.player.y,f.x,f.y)})).sort((a,b)=>a.d-b.d)[0]??null;}

  private collectNearest(){
    const n=this.nearestResource(); if(!n||n.d>110){this.showToast("Aproxime-se de um recurso.");return;}
    n.r.collected=true;n.r.respawn=28;n.r.object.setVisible(false);
    const meta=RESOURCE_META[n.r.type];this.inventory[n.r.type]=(this.inventory[n.r.type]??0)+meta.amount;
    this.showToast(`${meta.icon} +${meta.amount} ${meta.label.toLowerCase()}`);this.renderSidePanel();
  }

  private attack(){
    if(this.attackCooldown>0)return;
    const w=WEAPONS[this.weapon];
    if(this.weapon==="bow"){if((this.inventory.arrows??0)<=0){this.showToast("Sem flechas. Fabrique munição.");return;}this.inventory.arrows--;}
    this.attackCooldown=w.cooldown;
    const n=this.nearestAnimal(); if(!n||n.d>w.range){this.showToast(`${w.label}: nenhum alvo no alcance.`);return;}
    n.a.provoked=true;n.a.health-=w.damage;
    n.a.object.setTint?.(0xffffff);
    this.tweens.add({targets:n.a.object,alpha:.35,duration:80,yoyo:true,repeat:1});
    const impact=this.add.circle(n.a.x,n.a.y,18,0xf1d27d,.9).setDepth(1000);
    this.tweens.add({targets:impact,scale:2.3,alpha:0,duration:180,onComplete:()=>impact.destroy()});
    if(n.a.health<=0){n.a.dead=true;n.a.object.setVisible(false);const reward=n.a.type==="rabbit"?{rawMeat:2}:n.a.type==="boar"?{rawMeat:3,leather:2}:{rawMeat:4,wolfTooth:1};Object.entries(reward).forEach(([k,v])=>this.inventory[k]=(this.inventory[k]??0)+v);this.showToast(`Caça concluída · +${reward.rawMeat} carne${n.a.type==="boar"?" · +2 couro":n.a.type==="wolf"?" · +1 dente":""}`);this.renderSidePanel();}
    else this.showToast(`${w.icon} ${w.label} · -${w.damage} vida`);
  }

  private takePlayerDamage(amount:number){this.survival.stats.health=Math.max(0,this.survival.stats.health-amount);this.tweens.add({targets:this.player,alpha:.35,duration:80,yoyo:true,repeat:2});this.showToast(`Impacto recebido · -${amount} vida`);}
  private placeCampfire(){if((this.inventory.campfire??0)<=0){this.showToast("Fabrique uma fogueira no menu C.");return;}this.inventory.campfire--;this.createCampfire(this.player.x+70,this.player.y+25);this.showToast("🔥 Fogueira acesa. Q para cozinhar.");this.renderSidePanel();}
  private cook(){const n=this.nearestFire();if(!n||n.d>145){this.showToast("Aproxime-se de uma fogueira.");return;}const amount=Math.min(2,this.inventory.rawMeat??0);if(!amount){this.showToast("Você não tem carne crua.");return;}this.inventory.rawMeat-=amount;this.inventory.cookedMeat=(this.inventory.cookedMeat??0)+amount;this.showToast(`🔥 ${amount} carne assada. Mais nutritiva.`);this.renderSidePanel();}
  private eat(){const kind=(this.inventory.cookedMeat??0)>0?"cookedMeat":(this.inventory.fruit??0)>0?"fruit":"rawMeat";if(this.survival.eat(kind as "rawMeat"|"cookedMeat"|"fruit",this.inventory)){this.showToast(`Você comeu ${labels[kind].toLowerCase()}.`);this.renderSidePanel();}else this.showToast("Nada comestível no inventário.");}

  private updateCamera(){this.cameras.main.startFollow(this.player,true,.08,.08);}

  private renderHud(){
    const s=this.survival.stats;this.ui.health.style.width=`${s.health}%`;this.ui.hunger.style.width=`${s.hunger}%`;this.ui.thirst.style.width=`${s.thirst}%`;
    this.ui.healthValue.textContent=`${Math.ceil(s.health)}`;this.ui.hungerValue.textContent=`${Math.ceil(s.hunger)}`;this.ui.thirstValue.textContent=`${Math.ceil(s.thirst)}`;
    const total=400+(this.elapsed%120)*8,hours=Math.floor(total/60)%24,minutes=Math.floor(total%60);
    this.ui.day.textContent=`${this.day}`;this.ui.time.textContent=`${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}`;
    const r=this.nearestResource(),f=this.nearestFire(),a=this.nearestAnimal();
    if(r&&r.d<125){this.ui.prompt.textContent=`E · coletar ${RESOURCE_META[r.r.type].icon} ${RESOURCE_META[r.r.type].label}`;this.ui.prompt.classList.add("show");}
    else if(f&&f.d<150){this.ui.prompt.textContent="Q · cozinhar carne";this.ui.prompt.classList.add("show");}
    else if(a&&a.d<WEAPONS[this.weapon].range&&!a.a.dead){this.ui.prompt.textContent=`ESPAÇO · atacar ${a.a.type}`;this.ui.prompt.classList.add("show");}
    else this.ui.prompt.classList.remove("show");
  }

  private renderSidePanel(){
    const important=["wood","stone","vine","dryGrass","fruit","rawMeat","cookedMeat","leather","wolfTooth","arrows"];
    this.ui.side.innerHTML=`<div class="panel-kicker">mochila · <span>${WEAPONS[this.weapon].label}</span></div>${important.map(k=>`<div class="inventory-line"><span>${icons[k]} ${labels[k]}</span><span>${this.inventory[k]??0}</span></div>`).join("")}<div class="inventory-line" style="border:0;padding-top:9px;color:#f0d98e"><span>☷ I / C</span><span>abrir</span></div>`;
    this.ui.hotbar.innerHTML=`<div class="hotbar-hint">1—4 equipar</div>${(["club","knife","spear","bow"] as WeaponId[]).map((id,i)=>`<div class="slot ${this.weapon===id?"active":""}" style="opacity:${(this.inventory[id]??0)>0?1:.42}"><span class="slot-key">${i+1}</span><span class="slot-icon">${WEAPONS[id].icon}</span><span class="slot-name">${WEAPONS[id].label}</span></div>`).join("")}`;
  }

  private openPanel(title:string,body:string){
    this.paused=true;const panel=el("div","panel-overlay");panel.innerHTML=`<div class="modal"><div class="modal-head"><div class="modal-title">${title}</div><button type="button" class="close-btn">×</button></div>${body}</div>`;
    panel.querySelector(".close-btn")?.addEventListener("click",()=>{panel.remove();this.paused=false;});
    this.ui.root.append(panel);
  }

  private openInventory(){
    const body=`<div class="inventory-grid">${Object.entries(this.inventory).filter(([,v])=>v>0).map(([k,v])=>`<div class="inventory-line"><span>${icons[k]??"•"} ${labels[k]??k}</span><span>${v}</span></div>`).join("")||"<p>Inventário vazio.</p>"}</div><p style="color:#9fb2a2;font-size:11px;margin-top:16px">F para comer · C para fabricar · G para fogueira</p>`;
    this.openPanel("INVENTÁRIO",body);
  }

  private openCrafting(){
    const render=()=>{
      this.openPanel("CRAFTING",`<p style="color:#aebdad;font-size:11px;margin:0 0 12px">Recursos encontrados na ilha viram ferramentas para ir mais longe.</p><div>${RECIPES.map(r=>`<div class="recipe"><div><strong>${r.icon} ${r.name}</strong><small>${r.description}<br>${Object.entries(r.ingredients).map(([k,v])=>`${icons[k]??"•"} ${v} ${labels[k]??k}`).join(" · ")}</small></div><button data-recipe="${r.id}" ${this.crafting.canCraft(r,this.inventory)?"":"disabled"}>Fabricar</button></div>`).join("")}</div>`);
      this.ui.root.querySelectorAll<HTMLButtonElement>("[data-recipe]").forEach(b=>b.addEventListener("click",()=>{const r=this.crafting.craft(b.dataset.recipe??"",this.inventory);if(r){this.showToast(`${r.icon} ${r.name} fabricado.`);this.renderSidePanel();render();}}));
    };
    render();
  }

  private showToast(message:string){
    this.ui.toast.textContent=message;this.ui.toast.classList.add("show");this.toastTimer=2.4;
    window.setTimeout(()=>{this.toastTimer-=2.4;if(this.toastTimer<=0)this.ui.toast.classList.remove("show");},2400);
  }

  private async saveGame(){
    if(!this.started||!this.player)return;
    const payload:SavePayload={
      version:2,gender:this.playerGender,x:this.player.x,y:this.player.y,inventory:{...this.inventory},
      stats:{...this.survival.stats},weapon:this.weapon,
      campfires:this.fires.map(f=>({x:f.x,y:f.y,lit:true})),
      resources:this.resources.map(r=>({id:r.id,type:r.type,x:r.x,y:r.y,collected:r.collected,respawnAt:r.respawn})),
      elapsed:this.elapsed,day:this.day
    };
    await this.save.save(payload);
  }

  private showDeath(){
    if(this.deadShown)return;this.deadShown=true;this.paused=true;void this.saveGame();
    const overlay=el("div","overlay death");overlay.innerHTML=`<div class="menu-copy" style="position:relative;z-index:1;text-align:center"><div class="eyebrow">a ilha venceu esta vez</div><h1 class="menu-title">A NOITE<br>CHEGOU</h1><p class="menu-sub" style="margin-left:auto;margin-right:auto">Seu último abrigo foi preservado.</p><button class="primary-btn" type="button">Voltar ao início</button></div>`;
    overlay.querySelector("button")?.addEventListener("click",()=>window.location.reload());this.ui.root.append(overlay);
  }

  shutdown(){
    void this.saveGame();this.ui?.root.remove();
  }
}
