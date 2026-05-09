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
    { name: 'Semi-Deus', mult: 200, class: 'rarity-semi-deus', color: '#00d2ff', level: 7, xpBonus: 10.0 }
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
        if (this.type === 'Plasma' || this.type === 'Acelerador' || this.type === 'Mjolnir') {
            ctx.save();
            let blur = 10, color = '#00ffcc', width = 6, inner = 2;
            if (this.type === 'Acelerador') { blur = 40; color = '#e056fd'; width = 25; inner = 10; }
            if (this.type === 'Mjolnir') { blur = 60; color = '#00d2ff'; width = 40; inner = 15; }
            
            ctx.shadowBlur = blur; 
            ctx.shadowColor = color;
            ctx.strokeStyle = color; 
            ctx.lineWidth = width; ctx.lineCap = 'round';
            ctx.beginPath(); 
            ctx.moveTo(this.x - camera.x - this.vx*2, this.y - camera.y - this.vy*2);
            ctx.lineTo(this.x - camera.x + this.vx*2, this.y - camera.y + this.vy*2);
            if (this.type === 'Mjolnir') {
                ctx.lineTo(this.x - camera.x + this.vx*3 + (Math.random()-0.5)*30, this.y - camera.y + this.vy*3 + (Math.random()-0.5)*30);
            }
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
        this.x = x; this.y = y; this.radius = 16; this.speed = 4; this.hp = 100; this.maxHp = 100;
        this.facingLeft = false; this.animTime = 0;
        
        // Stats
        this.baseShootRate = 25; this.shootRate = 25; this.shootCooldown = 0;
        this.pierce = 0; this.luck = 0.05; 
        this.magnetRadius = 30; // Magnet skill base radius
        this.xpMultiplier = 1;
        this.damageMultiplier = 1.0;

        // Weapons Inventory
        const defaultWeapon = { id: 'w1', name: 'Pistol Comum', type: 'Pistol', rarity: RARITIES[0], damage: BASE_DAMAGE['Pistol'], fireRateMod: 1 };
        this.weapons = [defaultWeapon];
        this.equippedIndex = 0;

        // Skills
        this.molotovCooldown = 600; this.molotovTimer = 0;
        this.doubleShotTimer = 0; this.muzzleTimer = 0;
    }

    getEquipped() { return this.weapons[this.equippedIndex]; }

    update() {
        let dx = 0; let dy = 0;
        if (keys.w || keys.ArrowUp) dy -= 1;
        if (keys.s || keys.ArrowDown) dy += 1;
        if (keys.a || keys.ArrowLeft) dx -= 1;
        if (keys.d || keys.ArrowRight) dx += 1;

        if (dx !== 0 && dy !== 0) { const length = Math.sqrt(dx * dx + dy * dy); dx /= length; dy /= length; }

        this.x += dx * this.speed; this.y += dy * this.speed;
        if (dx < 0) this.facingLeft = true; if (dx > 0) this.facingLeft = false;
        this.animTime += (dx !== 0 || dy !== 0) ? 0.25 : 0.05;

        if (this.shootCooldown > 0) this.shootCooldown--;
        if (this.molotovTimer > 0) this.molotovTimer--;
        if (this.muzzleTimer > 0) this.muzzleTimer--;
        if (this.doubleShotTimer > 0) this.doubleShotTimer--;
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
        ctx.restore();
    }
}

class Enemy {
    constructor(x, y, type, hpMult = 1) {
        this.x = x; this.y = y; this.type = type; this.facingLeft = false; this.animTime = 0; this.burnTimer = 0;
        if (type === 'zombie') { this.radius = 16; this.speed = 1.6; this.hp = 12 * hpMult; }
        else if (type === 'cultist') { this.radius = 18; this.speed = 1.2; this.hp = 25 * hpMult; }
        else if (type === 'brute') { this.radius = 28; this.speed = 0.8; this.hp = 100 * hpMult; }
        else if (type === 'fast') { this.radius = 12; this.speed = 2.8; this.hp = 4 * hpMult; }
        else if (type === 'boss') { this.radius = 65; this.speed = 1.3; this.hp = 150000 * hpMult; }
    }
    update(targetX, targetY, speedMultiplier, barricades) {
        let tx = targetX, ty = targetY; let speed = this.speed * speedMultiplier;
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
    constructor() { this.particleSystem = new ParticleSystem(); this.state = 'MENU'; this.bossesSpawned = 0; this.healsPerformed = 0; }

    reset() {
        this.player = new Player(0, 0);
        this.enemies = []; this.projectiles = []; this.drops = []; this.barricades = []; this.fires = [];
        this.kills = 0; this.frames = 0; this.enemySpeedMultiplier = 1; this.spawnRate = 90;
        this.level = 1; this.xp = 0; this.maxXp = 10; this.supplies = 0; this.bossesSpawned = 0; this.healsPerformed = 0;
        this.state = 'PLAY'; screenShake = 0;
        this.updateHUD();
        startScreen.classList.add('hidden'); gameOverScreen.classList.add('hidden'); levelUpScreen.classList.add('hidden'); inventoryScreen.classList.add('hidden');
        startScreen.style.display = 'none'; gameOverScreen.style.display = 'none';
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
        
        const hpMult = 1 + (this.level - 1) * 0.15;
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
        weaponsGrid.innerHTML = '';
        
        this.player.weapons.forEach((wpn, idx) => {
            let div = document.createElement('div');
            div.className = `weapon-card ${idx === this.player.equippedIndex ? 'equipped' : ''}`;
            div.innerHTML = `<h3 class="${wpn.rarity.class}">${wpn.name}</h3>
                             <p>Dano: ${wpn.damage.toFixed(1)}</p>
                             <p style="color:#2ecc71; font-size:12px;">XP Bônus: ${wpn.rarity.xpBonus}x</p>`;
            div.onclick = () => {
                this.player.equippedIndex = idx;
                this.openInventory();
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
        if (this.state === 'INVENTORY') this.openInventory();
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
    }

    triggerLevelUp() {
        this.state = 'LEVELUP'; levelUpScreen.classList.remove('hidden'); upgradesContainer.innerHTML = '';
        let shuffled = UPGRADES.sort(() => 0.5 - Math.random()).slice(0, 3);
        shuffled.forEach(upg => {
            let div = document.createElement('div'); div.className = 'upgrade-card';
            div.innerHTML = `<h3>${upg.name}</h3><p>${upg.desc}</p>`;
            div.onclick = () => this.applyUpgrade(upg.id);
            upgradesContainer.appendChild(div);
        });
    }

    applyUpgrade(id) {
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
    }

    fireWeapon(tx, ty) {
        const wpn = this.player.getEquipped();
        const baseSpd = 16;
        const finalDamage = wpn.damage * this.player.damageMultiplier;
        
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

        // Apply Ammo Box effect
        if (this.player.doubleShotTimer > 0 && wpn.type !== 'Shotgun') {
            const angle = Math.atan2(ty - this.player.y, tx - this.player.x) + 0.2;
            this.projectiles.push(new Projectile(this.player.x, this.player.y, this.player.x + Math.cos(angle), this.player.y + Math.sin(angle), baseSpd, finalDamage, this.player.pierce, wpn.type));
        }

        this.player.shootCooldown = this.player.shootRate * wpn.fireRateMod;
        this.player.muzzleTimer = 5;
    }

    update() {
        if (this.state !== 'PLAY') return;
        this.frames++;

        camera.x = this.player.x - canvas.width / 2; camera.y = this.player.y - canvas.height / 2;

        if (this.frames % 1800 === 0) { this.spawnRate = Math.max(15, this.spawnRate - 8); this.enemySpeedMultiplier += 0.15; }
        if (this.frames % this.spawnRate === 0) this.spawnEnemy();

        this.player.update();
        
        if (this.kills > 0 && Math.floor(this.kills / 3000) > this.bossesSpawned) {
            this.bossesSpawned++;
            const angle = Math.random() * Math.PI * 2; const dist = Math.max(canvas.width, canvas.height) / 2 + 100;
            const x = this.player.x + Math.cos(angle) * dist; const y = this.player.y + Math.sin(angle) * dist;
            const hpMult = 1 + (this.level - 1) * 0.15;
            this.enemies.push(new Enemy(x, y, 'boss', hpMult));
            screenShake = 30;
        }

        // Heal every 200 kills
        if (this.kills > 0 && Math.floor(this.kills / 200) > this.healsPerformed) {
            this.healsPerformed++;
            this.player.hp = this.player.maxHp;
            this.updateHUD();
            this.particleSystem.spawn(this.player.x, this.player.y, '#2ecc71', 30, 2); // Green particles for heal
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
                    } else {
                        if (p.hitEnemies.size > p.pierce) p.active = false;
                    }
                    
                    if (e.hp <= 0 && this.enemies.includes(e)) {
                        // Drops
                        let xpVal = 2;
                        if (e.type === 'cultist') xpVal = 5;
                        if (e.type === 'brute') xpVal = 15;
                        if (e.type === 'boss') xpVal = 500;
                        
                        this.drops.push(new Drop(e.x, e.y, 'xp', xpVal));
                        if (Math.random() < this.player.luck) {
                            const r = Math.random();
                            if (r < 0.3) this.drops.push(new Drop(e.x + 10, e.y, 'supply'));
                            else if (r < 0.6) this.drops.push(new Drop(e.x + 10, e.y, 'health'));
                            else if (r < 0.9) this.drops.push(new Drop(e.x + 10, e.y, 'ammo'));
                            else this.drops.push(new Drop(e.x + 10, e.y, 'weapon')); // 10% chance out of luck chance
                        }

                        this.enemies.splice(this.enemies.indexOf(e), 1);
                        this.kills += 1;
                        this.particleSystem.addBlood(e.x, e.y); this.particleSystem.spawn(e.x, e.y, '#aa0000', 15, 1.5);
                        if (e.type === 'brute') screenShake = 8;
                        this.updateHUD();
                    }
                    if(!p.active) break;
                }
            }
        }

        // Drop Collection (Magnet affects this)
        for (let i = this.drops.length - 1; i >= 0; i--) {
            let d = this.drops[i];
            
            // Magnet logic
            if (Math.hypot(this.player.x - d.x, this.player.y - d.y) < this.player.magnetRadius) {
                let angle = Math.atan2(this.player.y - d.y, this.player.x - d.x);
                d.x += Math.cos(angle) * 8;
                d.y += Math.sin(angle) * 8;
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
                    this.player.weapons.push(generateRandomWeapon(this.player.luck));
                    // Auto-equip if it's the second weapon
                    if (this.player.weapons.length === 2) this.player.equippedIndex = 1;
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
                this.player.hp -= 0.5; this.updateHUD(); screenShake = 1;
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
closeInventoryBtn.addEventListener('click', (e) => { e.target.blur(); game.closeInventory(); });
fuseAllBtn.addEventListener('click', (e) => { e.target.blur(); game.fuseAllWeapons(); });
if(equipBestBtn) equipBestBtn.addEventListener('click', (e) => { e.target.blur(); game.equipBestWeapon(); });

function gameLoop() { 
    try {
        game.update(); 
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
