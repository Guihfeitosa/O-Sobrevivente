const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const levelDisplay = document.getElementById('levelDisplay');
const suppliesDisplay = document.getElementById('suppliesDisplay');
const hpBar = document.getElementById('hpBar');
const xpBar = document.getElementById('xpBar');

const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const levelUpScreen = document.getElementById('levelUpScreen');
const inventoryScreen = document.getElementById('inventoryScreen');

const finalScoreDisplay = document.getElementById('finalScore');
const finalLevelDisplay = document.getElementById('finalLevel');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const closeInventoryBtn = document.getElementById('closeInventoryBtn');
const upgradesContainer = document.getElementById('upgradesContainer');
const weaponsGrid = document.getElementById('weaponsGrid');
const equipBestBtn = document.getElementById('equipBestBtn');
const menuBtn = document.getElementById('menuBtn');
const shopScreen = document.getElementById('shopScreen');
const shopGrid = document.getElementById('shopGrid');
const openShopBtn = document.getElementById('openShopBtn');
const closeShopBtn = document.getElementById('closeShopBtn');
const totalKillsDisplay = document.getElementById('totalKillsDisplay');
const shopKills = document.getElementById('shopKills');
const statsGrid = document.getElementById('statsGrid');
const sortSelect = document.getElementById('sortSelect');
const itemsGrid = document.getElementById('itemsGrid');
const muteBtn = document.getElementById('muteBtn');
const speedBtn = document.getElementById('speedBtn');
const bossHud = document.getElementById('bossHud');
const bossHpBar = document.getElementById('bossHpBar');

// --- Audio System (Synthesized) ---
class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.enabled = true;
    }
    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) this.ctx.suspend();
        else this.ctx.resume();
        return this.enabled;
    }
    play(type) {
        if (!this.enabled || this.ctx.state === 'suspended') return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain); gain.connect(this.ctx.destination);
        
        let now = this.ctx.currentTime;
        if (type === 'shoot') {
            osc.type = 'square'; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(10, now + 0.1);
            gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(); osc.stop(now + 0.1);
        } else if (type === 'explosion') {
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now); osc.frequency.linearRampToValueAtTime(1, now + 0.5);
            gain.gain.setValueAtTime(0.3, now); gain.gain.linearRampToValueAtTime(0, now + 0.5);
            osc.start(); osc.stop(now + 0.5);
        } else if (type === 'hit') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(150, now);
            gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.05);
            osc.start(); osc.stop(now + 0.05);
        } else if (type === 'levelup') {
            osc.type = 'triangle'; 
            [440, 554, 659, 880].forEach((f, i) => {
                osc.frequency.setValueAtTime(f, now + i * 0.1);
            });
            gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0.1, now + 0.4);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(); osc.stop(now + 0.5);
        } else if (type === 'heal') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
            gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.3);
            osc.start(); osc.stop(now + 0.3);
        }
    }
}
const sounds = new SoundManager();

// --- Persistence & Shop Data ---
let totalKills = parseInt(localStorage.getItem('ms_total_kills')) || 0;
let savedMeta = JSON.parse(localStorage.getItem('ms_meta_upgrades')) || {};
let metaUpgrades = {
    hp: savedMeta.hp || 0,
    speed: savedMeta.speed || 0,
    luck: savedMeta.luck || 0,
    damage: savedMeta.damage || 0,
    xp: savedMeta.xp || 0,
    activeTitle: savedMeta.activeTitle || null
};

const TITLES = [
    { id: 'v_sangrento', name: 'Vigilante Sangrento', desc: '+15% Dano', req: 5000, bonus: { damage: 0.15 } },
    { id: 'e_supremo', name: 'Executor Supremo', desc: '+25% Dano, +10% Veloc.', req: 15000, bonus: { damage: 0.25, speed: 0.1 } },
    { id: 't_imortal', name: 'Titã Imortal', desc: '+30% Vida, +20% Defesa', req: 30000, bonus: { hp: 0.30, defense: 20 } },
    { id: 'a_caos', name: 'Arauto do Caos', desc: '+20% Crítico, +15% Dano', req: 50000, bonus: { crit: 20, damage: 0.15 } },
    { id: 'r_vivo', name: 'Relâmpago Vivo', desc: '+30% Velocidade', req: 75000, bonus: { speed: 0.30 } },
    { id: 'd_mundos', name: 'Devorador de Mundos', desc: '+50% Dano Boss', req: 100000, bonus: { bossDmg: 0.5 } },
    { id: 'g_supremo', name: 'Guardião Supremo', desc: '+25% Defesa, Regen +2', req: 150000, bonus: { defense: 25, regen: 2 } },
    { id: 'f_negro', name: 'Fantasma Negro', desc: '+30% Stealth, +15% Veloc.', req: 200000, bonus: { speed: 0.15, stealth: 0.3 } },
    { id: 'l_ascendida', name: 'Lenda Ascendida', desc: '+20% Todos Atrib.', req: 300000, bonus: { all: 0.20 } },
    { id: 'i_celestial', name: 'Imperador Celestial', desc: '+40% XP, +10% Sorte', req: 400000, bonus: { xp: 0.40, luck: 0.1 } },
    { id: 'm_guerra', name: 'Mestre da Guerra', desc: '-25% Cooldown, +15% Dano', req: 500000, bonus: { cd: 0.25, damage: 0.15 } },
    { id: 'p_absoluto', name: 'Predador Absoluto', desc: '+35% Crítico', req: 600000, bonus: { crit: 35 } },
    { id: 's_divina', name: 'Sentinela Divina', desc: 'Escudo Ativo, +25% Vida', req: 700000, bonus: { shield: true, hp: 0.25 } },
    { id: 'c_infernal', name: 'Conquistador Infernal', desc: 'Aura Flamejante, +20% Dano', req: 800000, bonus: { aura: true, damage: 0.20 } },
    { id: 'o_intocavel', name: 'O Intocável', desc: '+25% Evasão', req: 900000, bonus: { evasion: 25 } },
    { id: 'r_supremo', name: 'Rei Supremo', desc: '+30% Dano, +30% Def, +15% Vel', req: 1000000, bonus: { damage: 0.3, defense: 30, speed: 0.15 } },
    { id: 'c_final', name: 'Ceifador Final', desc: 'Lifesteal 15%, +20% Dano', req: 2000000, bonus: { lifesteal: 0.15, damage: 0.20 } },
    { id: 'd_absoluto', name: 'Deus Absoluto', desc: '+50% All Stats + Legendary', req: 5000000, bonus: { all: 0.50, legendary: true } }
];

const saveMeta = () => {
    try {
        localStorage.setItem('ms_total_kills', totalKills);
        localStorage.setItem('ms_meta_upgrades', JSON.stringify(metaUpgrades));
    } catch (e) { console.error("Erro ao salvar progresso:", e); }
};

const SHOP_ITEMS = [
    { id: 'hp', name: 'Resistência', desc: '+20 HP Base', cost: 500 },
    { id: 'speed', name: 'Agilidade', desc: '+5% Velocidade', cost: 1000 },
    { id: 'luck', name: 'Sorte Grande', desc: '+2% Sorte Base', cost: 1500 },
    { id: 'damage', name: 'Músculos', desc: '+10% Dano Base', cost: 2000 },
    { id: 'xp', name: 'Aprendizagem', desc: '+10% XP Global', cost: 2500 }
];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();



const keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false, " ": false };

window.addEventListener('keydown', (e) => {
    if (e.key === " ") e.preventDefault(); 
    
    if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true;
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
    if (e.key === " ") keys[" "] = true;

    if (e.key.toLowerCase() === 'i') {
        if (game.state === 'PLAY') game.openInventory();
        else if (game.state === 'INVENTORY') game.closeInventory();
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false;
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    if (e.key === " ") {
        keys[" "] = false;
        if (game.state === 'PLAY') game.buildBarricade();
    }
});

let screenShake = 0;
const camera = { x: 0, y: 0 };

const UPGRADES = [
    { id: 'cadencia', name: 'Tiro Rápido', desc: '+Velocidade de Tiro' },
    { id: 'penetracao', name: 'Munição Perfurante', desc: 'Atravessa +1 Inimigo' },
    { id: 'velocidade', name: 'Botas Leves', desc: '+Velocidade de Movimento' },
    { id: 'sorte', name: 'Trevo de 4 Folhas', desc: '+Chance de Itens' },
    { id: 'ima', name: 'Magnetismo', desc: '+Alcance de Coleta' },
    { id: 'xpgain', name: 'Mente Focada', desc: '+20% Ganho de XP' },
    { id: 'damage', name: 'Força Bruta', desc: '+20% Dano Total' }
];

const WEAPON_TYPES = ['Pistol', 'Shotgun', 'Minigun', 'RPG'];
const BASE_DAMAGE = { 'Pistol': 10, 'Shotgun': 18, 'Minigun': 25, 'RPG': 60, 'Plasma': 150, 'Acelerador': 1000, 'Mjolnir': 5000 };

const RARITIES = [
    { name: 'Comum', mult: 1, class: 'rarity-comum', color: '#ecf0f1', level: 0, xpBonus: 1.0 },
    { name: 'Rara', mult: 1.5, class: 'rarity-rara', color: '#3498db', level: 1, xpBonus: 1.1 },
    { name: 'Épica', mult: 2.2, class: 'rarity-epica', color: '#9b59b6', level: 2, xpBonus: 1.25 },
    { name: 'Lendária', mult: 3.5, class: 'rarity-lendaria', color: '#f1c40f', level: 3, xpBonus: 1.5 },
    { name: 'Mítica', mult: 5, class: 'rarity-mitica', color: '#e74c3c', level: 4, xpBonus: 2.0 },
    { name: 'Secreta', mult: 15, class: 'rarity-secreta', color: '#00ffcc', level: 5, xpBonus: 3.0 },
    { name: 'PURO PODER', mult: 50, class: 'rarity-puro-poder', color: '#ffffff', level: 6, xpBonus: 5.0 },
    { name: 'Semi-Deus', mult: 200, class: 'rarity-semi-deus', color: '#00d2ff', level: 7, xpBonus: 10.0 },
    { name: 'ABSOLUTE', mult: 10000, class: 'rarity-absolute', color: '#ff0000', level: 8, xpBonus: 100.0 }
];

function generateRandomWeapon(luck = 0) {
    const rSecret = Math.random();
    const secretChance = 0.001 + (luck * 0.001); 
    if (rSecret < secretChance) {
        return {
            id: Math.random().toString(36).substr(2, 9),
            name: `Canhão de Plasma`,
            type: 'Plasma',
            rarity: RARITIES[5],
            damage: BASE_DAMAGE['Plasma'] * RARITIES[5].mult,
            fireRateMod: 0.1
        };
    }

    const r = Math.random();
    let rarityIdx = 0;
    if (r > 0.5) rarityIdx = 1;
    if (r > 0.8) rarityIdx = 2;
    if (r > 0.95) rarityIdx = 3;
    if (r > 0.99) rarityIdx = 4;
    
    // Laser is only from Mega Boss
    const type = WEAPON_TYPES[Math.floor(Math.random() * WEAPON_TYPES.length)];
    const rarity = RARITIES[rarityIdx];

    return {
        id: Math.random().toString(36).substr(2, 9),
        name: `${type} ${rarity.name}`,
        type: type,
        rarity: rarity,
        damage: BASE_DAMAGE[type] * rarity.mult,
        fireRateMod: type === 'Minigun' ? 0.3 : (type === 'RPG' ? 2.5 : (type === 'Shotgun' ? 1.5 : 1))
    };
}

// --- Sub-Systems ---
class ParticleSystem {
    constructor() { this.particles = []; this.blood = []; }
    spawn(x, y, color, amount, speedMultiplier = 1) {
        for (let i = 0; i < amount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 * speedMultiplier;
            this.particles.push({
                x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                life: 1, decay: Math.random() * 0.02 + 0.02, color, size: Math.random() * 3 + 2
            });
        }
    }
    addBlood(x, y) {
        for(let i=0; i<2; i++) this.blood.push({ x: x + (Math.random()-0.5)*20, y: y + (Math.random()-0.5)*20, size: Math.random()*8+4, life: 1 });
    }
    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i]; p.x += p.vx; p.y += p.vy; p.life -= p.decay;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
        for (let i = this.blood.length - 1; i >= 0; i--) {
            let b = this.blood[i]; b.life -= 0.001;
            if (b.life <= 0) this.blood.splice(i, 1);
        }
    }
    draw(ctx) {
        ctx.save();
        for (let b of this.blood) {
            ctx.globalAlpha = Math.max(0, b.life * 0.4);
            ctx.fillStyle = '#8a0303'; ctx.beginPath(); ctx.arc(b.x - camera.x, b.y - camera.y, b.size, 0, Math.PI*2); ctx.fill();
        }
        for (let p of this.particles) {
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color; ctx.shadowBlur = 10; ctx.shadowColor = p.color;
            ctx.beginPath(); ctx.arc(p.x - camera.x, p.y - camera.y, p.size, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}

class Drop {
    constructor(x, y, type, value = 2) {
        this.x = x; this.y = y; this.type = type; this.radius = value >= 10 ? 14 : 10;
        this.value = value;
        this.animTime = Math.random() * 10;
        // type: 'xp', 'supply', 'health', 'ammo', 'weapon'
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x - camera.x, this.y - camera.y);
        const bob = Math.sin(game.frames * 0.1 + this.animTime) * 3;
        ctx.translate(0, bob);
        
        if (this.type === 'xp') {
            ctx.fillStyle = '#3498db'; ctx.shadowBlur = 15; ctx.shadowColor = '#3498db';
            ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
        } else if (this.type === 'supply') {
            ctx.fillStyle = '#8e44ad'; ctx.shadowBlur = 15; ctx.shadowColor = '#8e44ad';
            ctx.fillRect(-6, -6, 12, 12);
            ctx.fillStyle = '#f39c12'; ctx.fillRect(-4, -4, 8, 8);
        } else if (this.type === 'health') {
            ctx.fillStyle = '#fff'; ctx.shadowBlur = 15; ctx.shadowColor = '#e74c3c';
            ctx.fillRect(-6, -6, 12, 12);
            ctx.fillStyle = '#e74c3c'; ctx.fillRect(-2, -4, 4, 8); ctx.fillRect(-4, -2, 8, 4);
        } else if (this.type === 'ammo') {
            ctx.fillStyle = '#f1c40f'; ctx.shadowBlur = 15; ctx.shadowColor = '#f1c40f';
            ctx.fillRect(-4, -8, 8, 16);
        } else if (this.type === 'weapon') {
            // Glowing Weapon Crate
            ctx.fillStyle = '#111'; ctx.shadowBlur = 20; ctx.shadowColor = '#00ffff';
            ctx.fillRect(-8, -8, 16, 16);
            ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2; ctx.strokeRect(-8, -8, 16, 16);
            ctx.fillStyle = '#00ffff'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
        } else if (this.type === 'special_item') {
            ctx.fillStyle = '#000'; ctx.shadowBlur = 25; ctx.shadowColor = '#00d2ff';
            ctx.beginPath();
            ctx.moveTo(0, -10); ctx.lineTo(10, 10); ctx.lineTo(-10, 10); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#00d2ff'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#00d2ff'; ctx.beginPath(); ctx.arc(0, 2, 3, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
    }
}

class Barricade {
    constructor(x, y) { 
        this.x = x; this.y = y; this.radius = 20; 
        this.level = 1; this.hp = 100; this.maxHp = 100; 
    }
    get upgradeCost() { return this.level * 2; }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x - camera.x, this.y - camera.y);
        ctx.fillStyle = this.level > 2 ? '#444' : '#8B4513'; ctx.fillRect(-20, -10, 40, 20);
        ctx.fillStyle = this.level > 2 ? '#666' : '#A0522D'; ctx.fillRect(-20, -15, 5, 30); ctx.fillRect(15, -15, 5, 30);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "Press Start 2P"'; ctx.textAlign = 'center'; ctx.fillText('Lv'+this.level, 0, -20);
        if (this.hp < this.maxHp * 0.5) { ctx.strokeStyle = '#000'; ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(10, 5); ctx.stroke(); }
        ctx.restore();
    }
}

class FireArea {
    constructor(x, y) { this.x = x; this.y = y; this.radius = 60; this.life = 300; }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x - camera.x, this.y - camera.y);
        ctx.globalAlpha = Math.min(1, this.life / 30);
        ctx.fillStyle = 'rgba(255, 69, 0, 0.4)'; ctx.shadowBlur = 20; ctx.shadowColor = '#ff4500';
        ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(255, 215, 0, 0.6)'; ctx.beginPath(); ctx.arc(0, 0, this.radius * 0.6 + Math.random()*10, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
}

class Projectile {
    constructor(x, y, targetX, targetY, speed, damage, pierce, type = 'Pistol') {
        this.x = x; this.y = y; this.speed = speed; this.damage = damage;
        this.radius = type === 'RPG' ? 8 : 4; 
        this.active = true; this.pierce = pierce; this.hitEnemies = new Set();
        this.type = type;
        
        const angle = Math.atan2(targetY - y, targetX - x);
        this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
        this.trail = [];
    }
    update() {
        this.trail.push({x: this.x, y: this.y});
        if(this.trail.length > 6) this.trail.shift();
        this.x += this.vx; this.y += this.vy;
        if (Math.hypot(this.x - camera.x - canvas.width/2, this.y - camera.y - canvas.height/2) > 2000) this.active = false;
    }
    draw(ctx) {
        if (this.type === 'Plasma' || this.type === 'Acelerador' || this.type === 'Mjolnir' || this.type === 'Laser') {
            ctx.save();
            let blur = 10, color = '#00ffcc', width = 6, inner = 2;
            if (this.type === 'Acelerador') { blur = 40; color = '#e056fd'; width = 25; inner = 10; }
            if (this.type === 'Mjolnir') { blur = 60; color = '#00d2ff'; width = 40; inner = 15; }
            if (this.type === 'Laser') { blur = 80; color = '#ff0000'; width = 50; inner = 20; }
            
            ctx.shadowBlur = blur; 
            ctx.shadowColor = color;
            ctx.strokeStyle = color; 
            ctx.lineWidth = width; ctx.lineCap = 'round';
            ctx.beginPath(); 
            // Fill the gap caused by high speed by drawing back to the previous position
            ctx.moveTo(this.x - camera.x - this.vx, this.y - camera.y - this.vy);
            
            let endX = this.x - camera.x;
            let endY = this.y - camera.y;
            
            if (this.type === 'Mjolnir' || this.type === 'Laser') {
                endX += this.vx * 0.5 + (Math.random()-0.5)*30;
                endY += this.vy * 0.5 + (Math.random()-0.5)*30;
            }
            ctx.lineTo(endX, endY);
            ctx.stroke();
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = inner; ctx.stroke();
            ctx.restore();
            return;
        }

        ctx.save();  
        ctx.shadowBlur = 15; 
        ctx.shadowColor = this.type === 'RPG' ? '#e74c3c' : '#00ffff'; 
        ctx.fillStyle = '#ffffff';
        if (this.trail.length > 0) {
            ctx.beginPath(); ctx.moveTo(this.trail[0].x - camera.x, this.trail[0].y - camera.y);
            for(let i=1; i<this.trail.length; i++) ctx.lineTo(this.trail[i].x - camera.x, this.trail[i].y - camera.y);
            ctx.strokeStyle = this.type === 'RPG' ? 'rgba(231, 76, 60, 0.6)' : 'rgba(0, 255, 255, 0.6)'; 
            ctx.lineWidth = this.radius; ctx.lineCap = 'round'; ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(this.x - camera.x, this.y - camera.y, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

// --- Entities ---
class Player {
    constructor(x, y) {
        this.x = x; this.y = y; this.radius = 16;
        
        // Apply Meta Upgrades
        this.maxHp = 100 + (metaUpgrades.hp * 20);
        this.hp = this.maxHp;
        this.speed = 4 + (metaUpgrades.speed * 0.2);
        this.luck = 0.05 + (metaUpgrades.luck * 0.02);
        this.damageMultiplier = 1.0 + (metaUpgrades.damage * 0.1);
        this.xpMultiplier = 1.0 + (metaUpgrades.xp * 0.1);
        
        this.facingLeft = false; this.animTime = 0;
        
        // Upgrades tracking
        this.upgradesPicked = { cadencia: 0, penetracao: 0, velocidade: 0, sorte: 0, ima: 0, xpgain: 0, damage: 0 };
        
        // Stats
        this.baseShootRate = 25; this.shootRate = 25; this.shootCooldown = 0;
        this.pierce = 0; 
        this.magnetRadius = 30; 
        // this.xpMultiplier initialized above with meta

        // Weapons Inventory
        const defaultWeapon = { id: 'w1', name: 'Pistol Comum', type: 'Pistol', rarity: RARITIES[0], damage: BASE_DAMAGE['Pistol'], fireRateMod: 1 };
        this.weapons = [defaultWeapon];
        this.equippedIndex = 0;

        this.molotovCooldown = 600; this.molotovTimer = 0;
        this.doubleShotTimer = 0; this.muzzleTimer = 0;

        // Title Stats
        this.defense = 0; this.critChance = 0; this.evasion = 0; this.lifesteal = 0; this.regen = 0;
        this.bossDmgBonus = 0; this.cooldownRed = 0; this.stealth = 0;
        this.hasShield = false; this.hasAura = false; this.hasLegendary = false;
        this.shieldActive = false; this.shieldCooldown = 0;

        this.applyTitleBonus();

        // Special Items
        this.items = []; // { name, type, count }
        this.statMultiplier = 1.0;
    }

    addSpecialItem(name) {
        let item = this.items.find(i => i.name === name);
        if (item) {
            item.count++;
        } else {
            this.items.push({ name: name, count: 1 });
        }

        // Logic for Composto Super transformation
        let semi = this.items.find(i => i.name === 'Composto Super');
        if (semi && semi.count >= 5) {
            semi.count -= 5;
            if (semi.count <= 0) this.items.splice(this.items.indexOf(semi), 1);
            
            let div = this.items.find(i => i.name === 'Composto Definitivo');
            if (div) div.count++;
            else this.items.push({ name: 'Composto Definitivo', count: 1 });
        }

        this.updateMultipliers();
        // Heal to full on power up
        this.hp = this.getStat(this.maxHp);
    }

    updateMultipliers() {
        this.statMultiplier = 1.0;
        if (this.items.find(i => i.name === 'Composto Super')) this.statMultiplier = 10.0;
        if (this.items.find(i => i.name === 'Composto Definitivo')) this.statMultiplier = 1000.0;
    }

    applyTitleBonus() {
        if (!metaUpgrades.activeTitle) return;
        const title = TITLES.find(t => t.id === metaUpgrades.activeTitle);
        if (!title) return;
        const b = title.bonus;
        if (b.damage) this.damageMultiplier += b.damage;
        if (b.speed) this.speed += b.speed * 4;
        if (b.hp) { this.maxHp *= (1 + b.hp); this.hp = this.maxHp; }
        if (b.defense) this.defense += b.defense;
        if (b.crit) this.critChance += b.crit;
        if (b.bossDmg) this.bossDmgBonus += b.bossDmg;
        if (b.regen) this.regen += b.regen;
        if (b.xp) this.xpMultiplier += b.xp;
        if (b.luck) this.luck += b.luck; // Added missing individual luck bonus
        if (b.cd) this.cooldownRed += b.cd;
        if (b.stealth) this.stealth += b.stealth;
        if (b.shield) this.hasShield = true;
        if (b.aura) this.hasAura = true;
        if (b.evasion) this.evasion += b.evasion;
        if (b.lifesteal) this.lifesteal += b.lifesteal;
        if (b.legendary) this.hasLegendary = true;
        if (b.all) {
            this.damageMultiplier += b.all;
            this.speed += b.all * 4;
            this.maxHp *= (1 + b.all); this.hp = this.maxHp;
            this.luck += b.all * 0.1;
        }
    }

    getStat(val, isSpeed = false) {
        if (isSpeed) {
            // Speed cap for playability: Super (2x), Definitivo (4x)
            if (this.statMultiplier === 1000) return val * 4;
            if (this.statMultiplier === 10) return val * 2;
            return val;
        }
        return val * this.statMultiplier;
    }

    getEquipped() { return this.weapons[this.equippedIndex]; }

    update() {
        let dx = 0; let dy = 0;
        if (keys.w || keys.ArrowUp) dy -= 1;
        if (keys.s || keys.ArrowDown) dy += 1;
        if (keys.a || keys.ArrowLeft) dx -= 1;
        if (keys.d || keys.ArrowRight) dx += 1;

        if (dx !== 0 || dy !== 0) {
            const mag = Math.sqrt(dx * dx + dy * dy);
            this.x += (dx / mag) * this.speed;
            this.y += (dy / mag) * this.speed;
            this.animTime += 0.25;
            this.facingLeft = dx < 0;
        }

        if (this.shootCooldown > 0) this.shootCooldown--;
        if (this.molotovTimer > 0) this.molotovTimer--;
        if (this.muzzleTimer > 0) this.muzzleTimer--;
        if (this.doubleShotTimer > 0) this.doubleShotTimer--;
        
        // Title: Regen
        if (this.regen > 0 && game.frames % 60 === 0) {
            this.hp = Math.min(this.getStat(this.maxHp), this.hp + this.regen);
        }

        // Title: Shield logic
        if (this.hasShield) {
            if (this.shieldCooldown > 0) this.shieldCooldown--;
            if (this.hp < this.getStat(this.maxHp) * 0.25 && this.shieldCooldown <= 0) {
                this.shieldActive = true; this.shieldTimer = 300; this.shieldCooldown = 3600;
                sounds.play('levelup');
            }
            if (this.shieldActive) {
                this.shieldTimer--;
                if (this.shieldTimer <= 0) this.shieldActive = false;
            }
        }

        // Title: Fire Aura
        if (this.hasAura && game.frames % 40 === 0) {
            game.fires.push(new FireArea(this.x, this.y, 80));
        }
    }

    draw(ctx) {
        ctx.save(); ctx.translate(this.x - camera.x, this.y - camera.y);
        ctx.translate(0, -Math.abs(Math.sin(this.animTime)) * 4);
        if (this.facingLeft) ctx.scale(-1, 1);

        ctx.shadowBlur = 20; ctx.shadowColor = this.doubleShotTimer > 0 ? 'rgba(241, 196, 15, 0.6)' : 'rgba(0, 255, 255, 0.4)';
        
        ctx.fillStyle = '#2c3e50'; ctx.beginPath(); ctx.moveTo(-12, -8); ctx.lineTo(8, -8); ctx.lineTo(16, 16); ctx.lineTo(-16, 16); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#1a252f'; ctx.beginPath(); ctx.arc(0, -10, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(3, -10, 10, 0, Math.PI * 2); ctx.fill();
        
        // Draw Magnet field faintly
        if (this.magnetRadius > 30) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(0, 255, 255, 0.05)';
            ctx.beginPath(); ctx.arc(0, 0, this.magnetRadius, 0, Math.PI*2); ctx.fill();
        }

        ctx.fillStyle = this.doubleShotTimer > 0 ? '#f1c40f' : '#00ffff'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(7, -12, 3, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; 
        
        // Draw Title Above Head
        if (metaUpgrades.activeTitle) {
            const title = TITLES.find(t => t.id === metaUpgrades.activeTitle);
            if (title) {
                ctx.save();
                if (this.facingLeft) ctx.scale(-1, 1); // Unflip text if facing left
                ctx.fillStyle = '#e67e22'; ctx.font = 'bold 14px Courier New';
                ctx.textAlign = 'center'; ctx.shadowBlur = 5; ctx.shadowColor = '#000';
                ctx.fillText(`[${title.name}]`, 0, -42);
                ctx.restore();
            }
        }
        
        const wpn = this.getEquipped();
        if (wpn.type === 'Pistol') {
            ctx.fillStyle = '#7f8c8d'; ctx.fillRect(5, -2, 18, 6); ctx.fillStyle = '#000'; ctx.fillRect(23, -1, 6, 4);
        } else if (wpn.type === 'Shotgun') {
            ctx.fillStyle = '#34495e'; ctx.fillRect(5, -4, 22, 8); ctx.fillStyle = '#000'; ctx.fillRect(27, -4, 4, 8);
        } else if (wpn.type === 'Minigun') {
            ctx.fillStyle = '#555'; ctx.fillRect(5, -6, 25, 12); ctx.fillStyle = '#222'; ctx.fillRect(30, -5, 8, 10);
        } else if (wpn.type === 'RPG') {
            ctx.fillStyle = '#27ae60'; ctx.fillRect(0, -5, 35, 10); ctx.fillStyle = '#e74c3c'; ctx.fillRect(35, -4, 8, 8);
        } else if (wpn.type === 'Plasma') {
            ctx.fillStyle = '#ecf0f1'; ctx.fillRect(5, -4, 25, 8); ctx.fillStyle = '#00ffcc'; ctx.fillRect(10, -2, 15, 4);
        } else if (wpn.type === 'Acelerador') {
            ctx.fillStyle = '#fff'; ctx.fillRect(2, -6, 30, 12); ctx.fillStyle = '#e056fd'; ctx.fillRect(8, -4, 20, 8);
        } else if (wpn.type === 'Mjolnir') {
            ctx.fillStyle = '#8B4513'; ctx.fillRect(5, -2, 20, 4);
            ctx.fillStyle = '#bdc3c7'; ctx.fillRect(20, -10, 15, 20);
            ctx.fillStyle = '#00d2ff'; ctx.fillRect(25, -5, 5, 10);
        }
        
        if (this.muzzleTimer > 0) {
            ctx.fillStyle = this.doubleShotTimer > 0 ? '#f1c40f' : '#00ffff';
            ctx.shadowBlur = 20; ctx.shadowColor = ctx.fillStyle;
            ctx.beginPath(); ctx.arc(35, 1, 6 + Math.random()*6, 0, Math.PI*2); ctx.fill();
        }

        // Title: Draw Shield
        if (this.shieldActive) {
            ctx.restore(); ctx.save(); ctx.translate(this.x - camera.x, this.y - camera.y);
            ctx.strokeStyle = '#00d2ff'; ctx.lineWidth = 4; ctx.beginPath();
            ctx.arc(0, 0, this.radius + 15 + Math.sin(game.frames*0.1)*5, 0, Math.PI*2); ctx.stroke();
            ctx.fillStyle = 'rgba(0, 210, 255, 0.2)'; ctx.fill();
        }

        // Title: Draw Legendary Effect
        if (this.hasLegendary) {
            ctx.restore(); ctx.save(); ctx.translate(this.x - camera.x, this.y - camera.y);
            ctx.shadowBlur = 20; ctx.shadowColor = '#f1c40f';
            ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, this.radius + 20, 0, Math.PI*2); ctx.stroke();
        }

        ctx.restore();
    }
}

class Enemy {
    constructor(x, y, type, hpMult = 1) {
        this.x = x; this.y = y; this.type = type; this.facingLeft = false; this.animTime = 0; this.burnTimer = 0;
        if (type === 'zombie') { this.radius = 16; this.speed = 1.6; this.maxHp = 12 * hpMult; }
        else if (type === 'cultist') { this.radius = 18; this.speed = 1.2; this.maxHp = 25 * hpMult; }
        else if (type === 'brute') { this.radius = 28; this.speed = 0.8; this.maxHp = 100 * hpMult; }
        else if (type === 'fast') { this.radius = 12; this.speed = 2.8; this.maxHp = 4 * hpMult; }
        else if (type === 'boss') { this.radius = 48; this.speed = 1.1; this.maxHp = 80000 * hpMult; }
        this.hp = this.maxHp;
    }
    update(targetX, targetY, speedMultiplier, barricades) {
        let tx = targetX, ty = targetY; 
        let speed = this.speed * speedMultiplier;
        
        // Title: Stealth (Enemies move slower when far away)
        if (game.player.stealth > 0) {
            const dist = Math.hypot(this.x - targetX, this.y - targetY);
            if (dist > 250) speed *= (1 - game.player.stealth);
        }

        // Nightmare speed boost at 10k kills
        if (game.kills >= 10000) speed *= 1.5;
        
        let attackingBarricade = null;
        for (let b of barricades) {
            if (Math.hypot(this.x - b.x, this.y - b.y) < this.radius + b.radius + 10) { attackingBarricade = b; break; }
        }
        if (attackingBarricade) {
            speed = 0; if (game.frames % 30 === 0) attackingBarricade.hp -= 10;
        }

        const angle = Math.atan2(ty - this.y, tx - this.x);
        this.x += Math.cos(angle) * speed; this.y += Math.sin(angle) * speed;
        if (Math.cos(angle) < 0) this.facingLeft = true; else this.facingLeft = false;
        this.animTime += 0.15 * speedMultiplier;

        if (this.burnTimer > 0) { this.burnTimer--; if(game.frames % 30 === 0) this.hp -= 5; }
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x - camera.x, this.y - camera.y);
        ctx.translate(0, -Math.abs(Math.sin(this.animTime)) * 4);
        if (this.facingLeft) ctx.scale(-1, 1);
        if (this.burnTimer > 0) { ctx.shadowBlur = 10; ctx.shadowColor = '#ff4500'; }

        if (this.type === 'zombie') {
            ctx.fillStyle = this.burnTimer > 0 ? '#b03a2e' : '#795548'; ctx.fillRect(-12, -8, 24, 22);
            ctx.fillStyle = '#4CAF50'; ctx.beginPath(); ctx.arc(0, -12, 12, 0, Math.PI*2); ctx.fill();
            ctx.fillRect(0, -4, 20, 6); ctx.fillStyle = '#000'; ctx.fillRect(4, -16, 4, 4);
        } else if (this.type === 'cultist') {
            ctx.fillStyle = this.burnTimer > 0 ? '#78281f' : '#4a235a'; ctx.beginPath(); ctx.moveTo(-15, 18); ctx.lineTo(0, -15); ctx.lineTo(15, 18); ctx.fill();
            ctx.fillStyle = '#ff3333'; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(4, -4, 3, 0, Math.PI*2); ctx.fill();
        } else if (this.type === 'brute') {
            ctx.fillStyle = this.burnTimer > 0 ? '#641e16' : '#2c3e50'; ctx.beginPath(); ctx.moveTo(-25, 20); ctx.lineTo(-30, -15); ctx.lineTo(0, -30); ctx.lineTo(30, -15); ctx.lineTo(25, 20); ctx.fill();
            ctx.fillStyle = '#bdc3c7'; ctx.beginPath(); ctx.arc(5, -28, 10, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#7f8c8d'; ctx.fillRect(10, -10, 25, 12);
            ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-15, -5); ctx.lineTo(-5, 10); ctx.stroke();
        } else if (this.type === 'fast') {
            ctx.fillStyle = this.burnTimer > 0 ? '#f1948a' : '#c0392b'; ctx.beginPath(); ctx.moveTo(-8, 12); ctx.lineTo(16, 0); ctx.lineTo(-8, -12); ctx.fill();
            ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(6, -2, 2, 0, Math.PI*2); ctx.fill();
        } else if (this.type === 'boss') {
            ctx.fillStyle = this.burnTimer > 0 ? '#fff' : '#000';
            ctx.beginPath(); ctx.arc(0, -10, 45, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath(); ctx.moveTo(-35, -35); ctx.lineTo(-45, -70); ctx.lineTo(-15, -50); ctx.fill();
            ctx.beginPath(); ctx.moveTo(35, -35); ctx.lineTo(45, -70); ctx.lineTo(15, -50); ctx.fill();
            ctx.fillStyle = '#ff0000'; ctx.shadowBlur = 30; ctx.shadowColor = '#ff0000';
            ctx.beginPath(); ctx.arc(-15, -20, 10, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(15, -20, 10, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
        }
        ctx.restore();
    }
}

// --- Main Engine ---
class GameEngine {
    constructor() { 
        this.particleSystem = new ParticleSystem(); this.state = 'MENU'; 
        this.bossesSpawned = 0; this.healsPerformed = 0; 
        this.timeScale = 1; this.megaBossSpawned = false;
    }

    reset() {
        this.player = new Player(0, 0);
        this.enemies = []; this.projectiles = []; this.drops = []; this.barricades = []; this.fires = [];
        this.kills = 0; this.frames = 0; this.enemySpeedMultiplier = 1; this.spawnRate = 90;
        this.level = 1; this.xp = 0; this.maxXp = 10; this.supplies = 0; this.bossesSpawned = 0; this.healsPerformed = 0;
        this.state = 'PLAY'; screenShake = 0; this.timeScale = 1; this.megaBossSpawned = false;
        this.updateHUD();
        this.updateSpeedBtn();
        startScreen.classList.add('hidden'); gameOverScreen.classList.add('hidden'); levelUpScreen.classList.add('hidden'); inventoryScreen.classList.add('hidden'); shopScreen.classList.add('hidden');
        startScreen.style.display = 'none'; gameOverScreen.style.display = 'none';
        if (sounds.ctx.state === 'suspended') sounds.ctx.resume();
    }

    toggleSpeed() {
        if (this.timeScale === 1) this.timeScale = 2;
        else if (this.timeScale === 2) this.timeScale = 3;
        else this.timeScale = 1;
        this.updateSpeedBtn();
    }

    updateSpeedBtn() {
        speedBtn.innerText = `⚡ ${this.timeScale}x`;
        speedBtn.style.color = this.timeScale > 1 ? '#f1c40f' : '#fff';
    }

    updateHUD() {
        scoreDisplay.innerText = `Kills: ${this.kills}`;
        levelDisplay.innerText = `Lvl: ${this.level}`;
        suppliesDisplay.innerText = `Madeira: ${this.supplies}`;
        hpBar.style.width = `${Math.max(0, (this.player.hp / this.player.maxHp) * 100)}%`;
        xpBar.style.width = `${Math.min(100, (this.xp / this.maxXp) * 100)}%`;
    }

    spawnEnemy() {
        const angle = Math.random() * Math.PI * 2; const dist = Math.max(canvas.width, canvas.height) / 2 + 100;
        const x = this.player.x + Math.cos(angle) * dist; const y = this.player.y + Math.sin(angle) * dist;
        const rand = Math.random(); let type = 'zombie';
        if (this.kills > 20 && rand < 0.25) type = 'cultist';
        if (this.kills > 50 && rand > 0.8) type = 'fast';
        if (this.kills > 100 && rand < 0.08) type = 'brute';
        
        let hpMult = 1 + (this.level - 1) * 0.12;
        if (this.kills >= 10000) hpMult *= 30; // Nightmare mode (30x)
        else if (this.kills >= 6000) hpMult *= 4; // Hardcore mode (4x)

        this.enemies.push(new Enemy(x, y, type, hpMult));
    }

    buildBarricade() {
        for (let b of this.barricades) {
            if (Math.hypot(this.player.x - b.x, this.player.y - b.y) < this.player.radius + b.radius + 30) {
                if (this.supplies >= b.upgradeCost) {
                    this.supplies -= b.upgradeCost;
                    b.level++; b.maxHp += 100; b.hp = b.maxHp;
                    this.updateHUD(); this.particleSystem.spawn(b.x, b.y, '#f1c40f', 15, 1.5);
                }
                return;
            }
        }
        if (this.supplies >= 1) {
            this.supplies--;
            this.barricades.push(new Barricade(this.player.x, this.player.y));
            this.updateHUD();
        }
    }

    openInventory() {
        this.state = 'INVENTORY';
        inventoryScreen.classList.remove('hidden');
        this.renderStats();
        this.renderInventory();
        this.renderItems();
    }

    renderItems() {
        itemsGrid.innerHTML = '';
        this.player.items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'weapon-card';
            div.style.minWidth = '140px';
            const isDivino = item.name.includes('Definitivo');
            div.style.borderColor = isDivino ? '#00d2ff' : '#f1c40f';
            div.style.boxShadow = isDivino ? '0 0 20px #00d2ff' : '0 0 10px #f1c40f';
            
            const isActive = (isDivino && this.player.statMultiplier === 1000) || (!isDivino && this.player.statMultiplier === 10);
            const itemRarityColor = isDivino ? '#00d2ff' : '#f1c40f';
            const itemRarityName = isDivino ? 'DEFINITIVO' : 'SUPER';

            div.innerHTML = `<h4 style="font-size:10px; color:${div.style.borderColor}; margin-bottom:5px;">${item.name}</h4>
                             <p style="font-size:8px; font-weight:bold; color:${itemRarityColor}; background:rgba(0,0,0,0.3); padding:2px 5px; border-radius:3px; display:inline-block; margin-bottom:5px;">${itemRarityName}</p>
                             <p style="font-size:8px; margin:5px 0;">Quantidade: ${item.count}</p>
                             <p style="font-size:9px; color:${isActive ? '#2ecc71' : '#555'}; font-weight:bold;">
                                ${isActive ? '● ATIVO' : '○ RESERVA'}
                             </p>`;
            itemsGrid.appendChild(div);
        });
    }

    renderStats() {
        statsGrid.innerHTML = '';
        const s = this.player;
        const wpn = s.getEquipped();
        const totalXpMult = s.xpMultiplier * (wpn ? wpn.rarity.xpBonus : 1);
        
        const stats = [
            `Vida: ${Math.floor(s.hp)}/${s.getStat(s.maxHp)}`,
            `Dano: ${(s.getStat(s.damageMultiplier) * 100).toFixed(0)}%`,
            `Sorte: ${(s.getStat(s.luck) * 100).toFixed(1)}%`,
            `XP Total: ${(totalXpMult * 100).toFixed(0)}%`,
            `Veloc.: ${s.getStat(s.speed).toFixed(1)}`,
            `Defesa: ${s.defense}%`,
            `Crítico: ${s.critChance}%`,
            `Tiro: ${this.player.upgradesPicked.cadencia}/5`
        ];
        if (metaUpgrades.activeTitle) {
            const titleName = TITLES.find(t => t.id === metaUpgrades.activeTitle).name;
            const titleSpan = document.createElement('div');
            titleSpan.style.gridColumn = 'span 2';
            titleSpan.style.color = '#e67e22';
            titleSpan.style.textAlign = 'center';
            titleSpan.style.marginTop = '5px';
            titleSpan.style.borderTop = '1px solid #444';
            titleSpan.innerText = `[${titleName}]`;
            statsGrid.appendChild(titleSpan);
        }
        stats.forEach(st => {
            const span = document.createElement('span');
            span.innerText = `• ${st}`;
            statsGrid.appendChild(span);
        });
    }

    renderInventory() {
        weaponsGrid.innerHTML = '';
        const sortBy = sortSelect.value;
        
        const sortedWeapons = [...this.player.weapons].sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'damage') return b.damage - a.damage;
            if (sortBy === 'rarity') {
                // Primary: Rarity Level, Secondary: Damage
                if (b.rarity.level !== a.rarity.level) return b.rarity.level - a.rarity.level;
                return b.damage - a.damage;
            }
            return 0;
        });
        
        sortedWeapons.forEach((wpn) => {
            const idx = this.player.weapons.indexOf(wpn);
            let div = document.createElement('div');
            div.className = `weapon-card ${idx === this.player.equippedIndex ? 'equipped' : ''}`;
            
            let warning = "";
            if (wpn.type === 'Laser' && this.player.statMultiplier < 1000) {
                warning = `<p style="color:#ff3333; font-size:10px; margin-top:5px; font-weight:bold;">⚠️ REQUER COMPOSTO DEFINITIVO</p>`;
            }

            div.innerHTML = `<h3 style="color:${wpn.rarity.color}; text-shadow: 0 0 5px ${wpn.rarity.color}; margin-bottom:5px;">${wpn.name}</h3>
                             <p style="font-size:9px; font-weight:bold; color:${wpn.rarity.color}; background:rgba(0,0,0,0.3); padding:2px 5px; border-radius:3px; display:inline-block; margin-bottom:5px;">${wpn.rarity.name.toUpperCase()}</p>
                             <p>Dano: ${wpn.damage.toFixed(1)}</p>
                             <p style="color:#2ecc71; font-size:10px;">XP Bônus: ${wpn.rarity.xpBonus}x</p>
                             ${warning}`;
            div.onclick = () => {
                this.player.equippedIndex = idx;
                this.renderInventory();
                this.renderStats();
            };
            weaponsGrid.appendChild(div);
        });
    }

    closeInventory() {
        this.state = 'PLAY';
        inventoryScreen.classList.add('hidden');
    }

    equipBestWeapon() {
        let bestIdx = 0;
        let bestScore = -1;
        for (let i = 0; i < this.player.weapons.length; i++) {
            let wpn = this.player.weapons[i];
            let score = wpn.damage / wpn.fireRateMod;
            if (wpn.type === 'Shotgun') score *= 3;
            if (wpn.type === 'RPG') score *= 3;
            if (wpn.type === 'Plasma') score *= 10;
            if (wpn.type === 'Acelerador') score *= 50;
            if (wpn.type === 'Mjolnir') score *= 500;
            
            if (score > bestScore) {
                bestScore = score;
                bestIdx = i;
            }
        }
        this.player.equippedIndex = bestIdx;
        if (this.state === 'INVENTORY') {
            this.renderInventory();
            this.renderStats();
        }
    }

    fuseAllWeapons() {
        let changed = true;
        while(changed) {
            changed = false;
            let counts = {};
            
            for(let i=0; i<this.player.weapons.length; i++) {
                let w = this.player.weapons[i];
                let key = w.type + "_" + w.rarity.level;
                if(!counts[key]) counts[key] = [];
                counts[key].push(i);
            }
            
            for(let key in counts) {
                if(counts[key].length >= 3) {
                    let type = key.split('_')[0];
                    let rLevel = parseInt(key.split('_')[1]);
                    
                    if (rLevel < RARITIES.length - 1) { 
                        let toRemove = counts[key].slice(0, 3);
                        let equippedRemoved = toRemove.includes(this.player.equippedIndex);
                        
                        toRemove.sort((a,b)=>b-a);
                        for(let idx of toRemove) {
                            this.player.weapons.splice(idx, 1);
                            if (this.player.equippedIndex > idx) this.player.equippedIndex--;
                        }
                        
                        let newType = type;
                        if (type === 'Plasma' && rLevel === 5) newType = 'Acelerador';
                        if (type === 'Acelerador' && rLevel === 6) newType = 'Mjolnir';

                        const newRarity = RARITIES[rLevel + 1];
                        const fusedWeapon = {
                            id: Math.random().toString(36).substr(2, 9),
                            name: `${newType} ${newRarity.name}`,
                            type: newType,
                            rarity: newRarity,
                            damage: BASE_DAMAGE[newType] * newRarity.mult,
                            fireRateMod: newType === 'Minigun' ? 0.3 : (newType === 'RPG' ? 2.5 : (newType === 'Shotgun' ? 1.5 : (newType === 'Plasma' ? 0.1 : (newType === 'Acelerador' ? 0.05 : (newType === 'Mjolnir' ? 0.05 : 1)))))
                        };
                        
                        this.player.weapons.push(fusedWeapon);
                        if (equippedRemoved || this.player.equippedIndex >= this.player.weapons.length) {
                            this.player.equippedIndex = this.player.weapons.length - 1;
                        }
                        
                        changed = true;
                        break;
                    }
                }
            }
        }
        this.equipBestWeapon();
        if (this.state === 'INVENTORY') {
            this.renderInventory();
            this.renderStats();
        }
    }

    triggerLevelUp() {
        this.state = 'LEVELUP'; levelUpScreen.classList.remove('hidden'); upgradesContainer.innerHTML = '';
        
        // Filter out cadencia if it reached max level 5
        let availableUpgrades = UPGRADES.filter(upg => {
            if (upg.id === 'cadencia' && this.player.upgradesPicked.cadencia >= 5) return false;
            return true;
        });

        let shuffled = availableUpgrades.sort(() => 0.5 - Math.random()).slice(0, 3);
        shuffled.forEach(upg => {
            let div = document.createElement('div'); div.className = 'upgrade-card';
            let currentLv = this.player.upgradesPicked[upg.id] || 0;
            div.innerHTML = `<h3>${upg.name}</h3><p>${upg.desc}</p><p style="color:#f1c40f; margin-top:5px;">Nv. ${currentLv}</p>`;
            div.onclick = () => this.applyUpgrade(upg.id);
            upgradesContainer.appendChild(div);
        });
    }

    applyUpgrade(id) {
        this.player.upgradesPicked[id] = (this.player.upgradesPicked[id] || 0) + 1;
        
        if (id === 'cadencia') this.player.shootRate = Math.max(5, this.player.shootRate - 4);
        else if (id === 'penetracao') this.player.pierce += 1;
        else if (id === 'velocidade') this.player.speed += 0.5;
        else if (id === 'sorte') this.player.luck += 0.05;
        else if (id === 'ima') this.player.magnetRadius += 40;
        else if (id === 'xpgain') this.player.xpMultiplier += 0.2;
        else if (id === 'damage') this.player.damageMultiplier += 0.2;
        
        this.level++; 
        this.xp -= this.maxXp; 
        if (this.xp < 0) this.xp = 0;
        this.maxXp = this.maxXp + 20 + (this.level * 5); // Linear scaling
        
        this.updateHUD(); levelUpScreen.classList.add('hidden'); this.state = 'PLAY';
        sounds.play('levelup');
    }

    openShop() {
        this.state = 'SHOP'; shopScreen.classList.remove('hidden');
        this.renderShop();
    }

    closeShop() {
        this.state = 'MENU'; shopScreen.classList.add('hidden');
        this.updateMenuHUD();
    }

    openTitle() {
        this.state = 'TITLE';
        document.getElementById('titleScreen').classList.remove('hidden');
        document.getElementById('titleKills').innerText = `Abates Totais: ${totalKills}`;
        this.renderTitles();
    }
    closeTitle() {
        this.state = 'SHOP';
        document.getElementById('titleScreen').classList.add('hidden');
    }
    renderTitles() {
        const grid = document.getElementById('titleGrid');
        grid.innerHTML = '';
        TITLES.forEach(t => {
            const div = document.createElement('div');
            const unlocked = totalKills >= t.req;
            const active = metaUpgrades.activeTitle === t.id;
            div.className = 'upgrade-card';
            div.style.padding = '10px';
            div.style.border = '1px solid ' + (unlocked ? (active ? '#2ecc71' : '#e67e22') : '#444');
            div.style.background = unlocked ? 'rgba(230, 126, 34, 0.1)' : 'rgba(0,0,0,0.5)';
            div.style.opacity = unlocked ? '1' : '0.5';
            div.style.cursor = unlocked ? 'pointer' : 'default';
            
            div.innerHTML = `<h4 style="color:${unlocked ? '#e67e22' : '#888'}; font-size:10px;">${t.name}</h4>
                             <p style="font-size:8px; color:#ccc; margin:5px 0;">${t.desc}</p>
                             <p style="font-size:7px; color:${unlocked ? '#2ecc71' : '#e74c3c'};">
                                ${unlocked ? (active ? '● EQUIPADO' : 'Clique para Equipar') : 'Requer: ' + t.req + ' kills'}
                             </p>`;
            if (unlocked) {
                div.onclick = () => {
                    metaUpgrades.activeTitle = t.id;
                    saveMeta();
                    this.renderTitles();
                    sounds.play('heal');
                };
            }
            grid.appendChild(div);
        });
    }

    goToMenu() {
        this.state = 'MENU';
        gameOverScreen.style.display = 'none';
        gameOverScreen.classList.add('hidden');
        startScreen.style.display = 'flex';
        startScreen.classList.remove('hidden');
        this.updateMenuHUD();
    }

    updateMenuHUD() {
        totalKillsDisplay.innerText = `Abates Totais: ${totalKills}`;
        shopKills.innerText = `Abates Disponíveis: ${totalKills}`;
    }

    renderShop() {
        shopGrid.innerHTML = '';
        this.updateMenuHUD();
        SHOP_ITEMS.forEach(item => {
            const level = metaUpgrades[item.id];
            const currentCost = item.cost * (level + 1);
            const div = document.createElement('div');
            div.className = 'upgrade-card';
            div.style.width = '100%';
            div.innerHTML = `
                <h3 style="font-size:12px;">${item.name} (Nv. ${level})</h3>
                <p style="font-size:10px;">${item.desc}</p>
                <button class="primary-btn" style="padding:10px; font-size:10px; width:100%; margin-top:10px;" 
                    ${totalKills < currentCost ? 'disabled' : ''}>
                    Comprar: ${currentCost}
                </button>
            `;
            const btn = div.querySelector('button');
            btn.onclick = () => {
                if (totalKills >= currentCost) {
                    totalKills -= currentCost;
                    metaUpgrades[item.id]++;
                    saveMeta();
                    this.renderShop();
                    sounds.play('heal');
                }
            };
            shopGrid.appendChild(div);
        });
    }

    fireWeapon(tx, ty) {
        const wpn = this.player.getEquipped();
        
        // Restriction for Absolute Laser
        if (wpn.type === 'Laser' && this.player.statMultiplier < 1000) {
            // Cannot use without Composto Definitivo
            return;
        }

        const baseSpd = 16;
        let finalDamage = this.player.getStat(wpn.damage * this.player.damageMultiplier);
        
        // Title: Crit Chance
        let isCrit = false;
        if (Math.random() < this.player.critChance / 100) {
            finalDamage *= 2.5; isCrit = true;
        }

        // Title: Boss Dmg
        const targetIsBoss = this.enemies.some(e => e.type === 'boss' && Math.hypot(e.x - tx, e.y - ty) < 200);
        if (targetIsBoss) finalDamage *= (1 + this.player.bossDmgBonus);
        
        if (wpn.type === 'Pistol') {
            this.projectiles.push(new Projectile(this.player.x, this.player.y, tx, ty, baseSpd, finalDamage, this.player.pierce, wpn.type));
        } 
        else if (wpn.type === 'Shotgun') {
            for(let i=-2; i<=2; i++) {
                const angle = Math.atan2(ty - this.player.y, tx - this.player.x) + (i * 0.15);
                this.projectiles.push(new Projectile(this.player.x, this.player.y, this.player.x + Math.cos(angle), this.player.y + Math.sin(angle), baseSpd*0.9, finalDamage, this.player.pierce, wpn.type));
            }
        }
        else if (wpn.type === 'Minigun') {
            const angle = Math.atan2(ty - this.player.y, tx - this.player.x) + (Math.random() - 0.5)*0.2;
            this.projectiles.push(new Projectile(this.player.x, this.player.y, this.player.x + Math.cos(angle), this.player.y + Math.sin(angle), baseSpd*1.2, finalDamage, this.player.pierce, wpn.type));
        }
        else if (wpn.type === 'RPG') {
            this.projectiles.push(new Projectile(this.player.x, this.player.y, tx, ty, baseSpd*0.6, finalDamage, 0, wpn.type));
        }
        else if (wpn.type === 'Plasma') {
            this.projectiles.push(new Projectile(this.player.x, this.player.y, tx, ty, baseSpd*2.5, finalDamage, this.player.pierce + 100, wpn.type));
        }
        else if (wpn.type === 'Acelerador') {
            this.projectiles.push(new Projectile(this.player.x, this.player.y, tx, ty, baseSpd*4, finalDamage, Infinity, wpn.type));
        }
        else if (wpn.type === 'Mjolnir') {
            this.projectiles.push(new Projectile(this.player.x, this.player.y, tx, ty, baseSpd*6, finalDamage, Infinity, wpn.type));
            screenShake = 5;
        }
        else if (wpn.type === 'Laser') {
            for(let i=0; i<3; i++) {
                this.projectiles.push(new Projectile(this.player.x, this.player.y, tx + (Math.random()-0.5)*50, ty + (Math.random()-0.5)*50, baseSpd*10, finalDamage, Infinity, wpn.type));
            }
            screenShake = 10;
            if(this.frames % 10 === 0) sounds.play('explosion');
        }

        // Apply Ammo Box effect
        if (this.player.doubleShotTimer > 0 && wpn.type !== 'Shotgun') {
            const angle = Math.atan2(ty - this.player.y, tx - this.player.x) + 0.2;
            this.projectiles.push(new Projectile(this.player.x, this.player.y, this.player.x + Math.cos(angle), this.player.y + Math.sin(angle), baseSpd, finalDamage, this.player.pierce, wpn.type));
        }

        this.player.shootCooldown = this.player.shootRate * wpn.fireRateMod * (1 - this.player.cooldownRed);
        this.player.muzzleTimer = 5;
        sounds.play('shoot');
        if (isCrit) screenShake += 2;
    }

    update() {
        if (this.state !== 'PLAY') return;
        this.frames++;

        camera.x = this.player.x - canvas.width / 2; camera.y = this.player.y - canvas.height / 2;

        if (this.frames % 1800 === 0) { this.spawnRate = Math.max(15, this.spawnRate - 8); this.enemySpeedMultiplier += 0.15; }
        if (this.frames % this.spawnRate === 0) this.spawnEnemy();

        this.player.update();
        // Adjust speed for stat mult with speed-specific flag
        this.player.speed = this.player.getStat(4 + (metaUpgrades.speed * 0.2), true);
        
        if (this.kills > 0 && Math.floor(this.kills / 3000) > this.bossesSpawned) {
            this.bossesSpawned++;
            const angle = Math.random() * Math.PI * 2; const dist = Math.max(canvas.width, canvas.height) / 2 + 100;
            const x = this.player.x + Math.cos(angle) * dist; const y = this.player.y + Math.sin(angle) * dist;
            
            // New Scaling: 20k, 40k, 80k...
            let hpMult = Math.pow(2, this.bossesSpawned - 1);
            let boss = new Enemy(x, y, 'boss', hpMult);
            boss.maxHp = 20000 * hpMult; boss.hp = boss.maxHp;
            this.enemies.push(boss);
            screenShake = 30;
        }

        // Mega Boss at 20k kills
        if (this.kills >= 20000 && !this.megaBossSpawned) {
            this.megaBossSpawned = true;
            const x = this.player.x + 500; const y = this.player.y;
            let mega = new Enemy(x, y, 'boss', 100);
            mega.name = "MEGA BOSS: O SOBERANO";
            mega.maxHp = 50000000; // 50 Million HP
            mega.hp = mega.maxHp;
            mega.isMega = true;
            this.enemies.push(mega);
            screenShake = 50;
        }

        // Boss HUD Update
        const activeBoss = this.enemies.find(e => e.type === 'boss');
        if (activeBoss) {
            bossHud.style.display = 'flex';
            bossHpBar.style.width = `${(activeBoss.hp / activeBoss.maxHp) * 100}%`;
        } else {
            bossHud.style.display = 'none';
        }

        // Heal every 200 kills
        if (this.kills > 0 && Math.floor(this.kills / 200) > this.healsPerformed) {
            this.healsPerformed++;
            this.player.hp = this.player.getStat(this.player.maxHp);
            this.updateHUD();
            this.particleSystem.spawn(this.player.x, this.player.y, '#2ecc71', 30, 2); // Green particles for heal
            sounds.play('heal');
        }

        // Auto Shoot
        if (this.player.shootCooldown <= 0 && this.enemies.length > 0) {
            let closest = null; let minDist = Infinity;
            for (let e of this.enemies) {
                const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
                if (dist < minDist) { minDist = dist; closest = e; }
            }
            if (closest) this.fireWeapon(closest.x, closest.y);
        }

        // Molotov
        if (this.player.molotovTimer <= 0 && this.enemies.length > 0) {
            let closest = null; let minDist = Infinity;
            for (let e of this.enemies) {
                const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
                if (dist < minDist) { minDist = dist; closest = e; }
            }
            if (closest) { this.fires.push(new FireArea(closest.x, closest.y)); this.player.molotovTimer = this.player.molotovCooldown; }
        }

        for (let i = this.fires.length - 1; i >= 0; i--) {
            let f = this.fires[i]; f.life--;
            if (f.life <= 0) this.fires.splice(i, 1);
            else { for (let e of this.enemies) { if (Math.hypot(e.x - f.x, e.y - f.y) < f.radius) e.burnTimer = 30; } }
        }

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let p = this.projectiles[i]; p.update();
            if (!p.active) { this.projectiles.splice(i, 1); continue; }

            for (let j = this.enemies.length - 1; j >= 0; j--) {
                let e = this.enemies[j];
                if (p.hitEnemies.has(e)) continue;

                if (Math.hypot(p.x - e.x, p.y - e.y) < p.radius + e.radius) {
                    e.hp -= p.damage; p.hitEnemies.add(e);
                    this.particleSystem.spawn(p.x, p.y, p.type === 'RPG' ? '#e74c3c' : '#00ffff', 5, 1);
                    
                    if (p.type === 'RPG') {
                        // Explosion Area Damage
                        this.fires.push(new FireArea(p.x, p.y)); 
                        for(let e2 of this.enemies) {
                            if (Math.hypot(e2.x - p.x, e2.y - p.y) < 80) e2.hp -= p.damage;
                        }
                        p.active = false;
                        screenShake = 8;
                        sounds.play('explosion');
                    } else {
                        if (p.hitEnemies.size > p.pierce) p.active = false;
                    }
                    
                    if (e.hp <= 0 && this.enemies.includes(e)) {
                        // Drops
                        let xpVal = 2;
                        if (e.type === 'cultist') xpVal = 5;
                        if (e.type === 'brute') xpVal = 15;
                        if (e.type === 'boss') xpVal = 500;
                        
                        if (this.kills >= 10000) xpVal *= 10; // Nightmare XP (10x)
                        else if (this.kills >= 6000) xpVal *= 3; // Hardcore XP

                        this.drops.push(new Drop(e.x, e.y, 'xp', xpVal));
                        
                        // Boss item drop
                        if (e.type === 'boss' && Math.random() < 0.1) {
                            this.drops.push(new Drop(e.x - 10, e.y, 'special_item', 0));
                        }
                        
                        // Absolute Laser drop from Mega Boss
                        if (e.isMega && Math.random() < 0.05) {
                            this.drops.push(new Drop(e.x + 10, e.y, 'absolute_weapon', 0));
                        }

                        const luckChance = this.player.getStat(this.player.luck);
                        if (Math.random() < luckChance) {
                            const r = Math.random();
                            let bonusMult = 1;
                            if (this.kills >= 10000) bonusMult = 10;
                            else if (this.kills >= 6000) bonusMult = 2;
                            
                            if (r < 0.3) this.drops.push(new Drop(e.x + 10, e.y, 'supply', 1 * bonusMult));
                            else if (r < 0.6) this.drops.push(new Drop(e.x + 10, e.y, 'health'));
                            else if (r < 0.9) this.drops.push(new Drop(e.x + 10, e.y, 'ammo'));
                            else this.drops.push(new Drop(e.x + 10, e.y, 'weapon')); // 10% chance out of luck chance
                        }

                        this.enemies.splice(j, 1);
                        this.kills += 1;
                        totalKills += 1;
                        if (this.kills % 5 === 0) saveMeta(); 

                        // Title: Lifesteal (Optimized)
                        if (this.player.lifesteal > 0 && this.frames % 2 === 0) {
                            const heal = Math.min(2, p.damage * 0.0005 * this.player.lifesteal);
                            this.player.hp = Math.min(this.player.getStat(this.player.maxHp), this.player.hp + heal);
                        }

                        this.particleSystem.addBlood(e.x, e.y); this.particleSystem.spawn(e.x, e.y, '#aa0000', 15, 1.5);
                        if (e.type === 'brute') { screenShake = 8; sounds.play('explosion'); }
                        else { sounds.play('hit'); }
                        this.updateHUD();
                    }
                    if(!p.active) break;
                }
            }
        }

        // Drop Collection (Magnet affects this)
        for (let i = this.drops.length - 1; i >= 0; i--) {
            let d = this.drops[i];
            
            // Magnet logic (Smoother pull)
            let magRad = this.player.magnetRadius;
            if (this.kills >= 6000) magRad *= 2;
            if (Math.hypot(this.player.x - d.x, this.player.y - d.y) < magRad) {
                let angle = Math.atan2(this.player.y - d.y, this.player.x - d.x);
                let pull = 10;
                d.x += Math.cos(angle) * pull;
                d.y += Math.sin(angle) * pull;
            }

            if (Math.hypot(this.player.x - d.x, this.player.y - d.y) < this.player.radius + d.radius + 10) {
                if (d.type === 'xp') {
                    const equippedWpn = this.player.getEquipped();
                    const weaponXpMult = equippedWpn ? equippedWpn.rarity.xpBonus : 1;
                    const val = d.value || 2;
                    this.xp += val * this.player.xpMultiplier * weaponXpMult;
                    if (this.xp >= this.maxXp) this.triggerLevelUp();
                } else if (d.type === 'supply') { this.supplies++; } 
                else if (d.type === 'health') { this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20); } 
                else if (d.type === 'ammo') { this.player.doubleShotTimer = 600; }
                else if (d.type === 'weapon') {
                    this.player.weapons.push(generateRandomWeapon(this.player.getStat(this.player.luck)));
                    // Auto-equip if it's the second weapon
                    if (this.player.weapons.length === 2) this.player.equippedIndex = 1;
                } else if (d.type === 'special_item') {
                    this.player.addSpecialItem('Composto Super');
                    this.particleSystem.spawn(d.x, d.y, '#00d2ff', 40, 2);
                } else if (d.type === 'absolute_weapon') {
                    const laser = {
                        id: 'absolute_laser',
                        name: 'Laser Patriota',
                        type: 'Laser',
                        rarity: RARITIES.find(r => r.name === 'ABSOLUTE'),
                        damage: 5000 * 50, // 50x Mjolnir base
                        fireRateMod: 0.02
                    };
                    this.player.weapons.push(laser);
                    this.particleSystem.spawn(d.x, d.y, '#ff0000', 100, 3);
                }
                this.drops.splice(i, 1); this.updateHUD();
            }
        }

        for(let i=this.barricades.length-1; i>=0; i--){
            if (this.barricades[i].hp <= 0) {
                this.particleSystem.spawn(this.barricades[i].x, this.barricades[i].y, '#8B4513', 20, 2);
                this.barricades.splice(i, 1);
            }
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let e = this.enemies[i];
            e.update(this.player.x, this.player.y, this.enemySpeedMultiplier, this.barricades);
            if (Math.hypot(e.x - this.player.x, e.y - this.player.y) < e.radius * 0.8 + this.player.radius * 0.8) {
                // Title: Evasion
                if (Math.random() < this.player.evasion / 100) {
                    this.particleSystem.spawn(this.player.x, this.player.y, '#fff', 10, 1);
                    continue; 
                }

                // Title: Shield
                if (this.player.shieldActive) continue;

                // Title: Defense
                let dmg = 0.5 * (1 - this.player.defense / 100);
                this.player.hp -= dmg; this.updateHUD(); screenShake = 1;
                if (this.player.hp <= 0) this.gameOver();
            }
        }

        this.particleSystem.update();
        if (screenShake > 0) screenShake *= 0.85; if (screenShake < 0.5) screenShake = 0;
    }

    draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.save();
        if (screenShake > 0 && this.state === 'PLAY') {
            const dx = (Math.random() - 0.5) * screenShake * 2; const dy = (Math.random() - 0.5) * screenShake * 2;
            ctx.translate(dx, dy);
        }

        ctx.fillStyle = '#0d0d12'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const gridSize = 120; const startX = - (camera.x % gridSize); const startY = - (camera.y % gridSize);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'; ctx.lineWidth = 2; ctx.beginPath();
        for(let x = startX; x < canvas.width; x += gridSize) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
        for(let y = startY; y < canvas.height; y += gridSize) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
        ctx.stroke();

        if (this.state === 'PLAY' || this.state === 'GAMEOVER' || this.state === 'LEVELUP' || this.state === 'INVENTORY') {
            this.particleSystem.draw(ctx);
            for(let f of this.fires) f.draw(ctx);
            for(let b of this.barricades) b.draw(ctx);
            for(let d of this.drops) d.draw(ctx);
            for (let e of this.enemies) e.draw(ctx);
            this.player.draw(ctx);
            for (let p of this.projectiles) p.draw(ctx);
        }
        ctx.restore();

        if (this.level >= 5 && Math.floor(this.level / 5) % 2 !== 0) {
            let grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 50, canvas.width/2, canvas.height/2, 400);
            grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.98)');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
            let grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 200, canvas.width/2, canvas.height/2, canvas.width);
            grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.8)');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    gameOver() {
        this.state = 'GAMEOVER'; finalScoreDisplay.innerText = this.kills; finalLevelDisplay.innerText = this.level;
        gameOverScreen.style.display = 'flex';
        gameOverScreen.classList.remove('hidden'); screenShake = 15;
    }
}

const game = new GameEngine();
const fuseAllBtn = document.getElementById('fuseAllBtn');

startBtn.addEventListener('click', (e) => { e.target.blur(); game.reset(); });
restartBtn.addEventListener('click', (e) => { e.target.blur(); game.reset(); });
menuBtn.addEventListener('click', (e) => { e.target.blur(); game.goToMenu(); });
closeInventoryBtn.addEventListener('click', (e) => { e.target.blur(); game.closeInventory(); });
sortSelect.addEventListener('change', () => game.renderInventory());
fuseAllBtn.addEventListener('click', (e) => { e.target.blur(); game.fuseAllWeapons(); });
if(equipBestBtn) equipBestBtn.addEventListener('click', (e) => { e.target.blur(); game.equipBestWeapon(); });
openShopBtn.addEventListener('click', (e) => { e.target.blur(); game.openShop(); });
closeShopBtn.addEventListener('click', (e) => { e.target.blur(); game.closeShop(); });
document.getElementById('openTitleBtn').addEventListener('click', (e) => { e.target.blur(); game.openTitle(); });
document.getElementById('closeTitleBtn').addEventListener('click', (e) => { e.target.blur(); game.closeTitle(); });
muteBtn.addEventListener('click', (e) => {
    e.target.blur();
    let enabled = sounds.toggle();
    muteBtn.innerText = enabled ? "🔇 MUTE" : "🔊 UNMUTE";
});
speedBtn.addEventListener('click', (e) => { e.target.blur(); game.toggleSpeed(); });

game.updateMenuHUD();

function gameLoop() { 
    try {
        for(let i=0; i<game.timeScale; i++) {
            game.update(); 
        }
        game.draw(); 
        requestAnimationFrame(gameLoop); 
    } catch (e) {
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText(e.stack, 50, 50);
        console.error(e);
    }
}
requestAnimationFrame(gameLoop);
