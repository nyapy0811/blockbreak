'use strict';

// ─── DOM ──────────────────────────────────────────────────────────────────────
const dom = {
  canvas:   document.getElementById('gameCanvas'),
  stage:    document.getElementById('stage'),
  score:    document.getElementById('score'),
  message:  document.getElementById('message'),
  statDamage:     document.getElementById('stat-damage'),
  statRadius:     document.getElementById('stat-radius'),
  statPaddle:     document.getElementById('stat-paddle'),
  statGold:       document.getElementById('stat-gold'),
  statGoldChance: document.getElementById('stat-goldchance'),

  mainOverlay:     document.getElementById('mainOverlay'),
  preGameOverlay:  document.getElementById('preGameOverlay'),
  settingsOverlay: document.getElementById('settingsOverlay'),
  confirmOverlay:  document.getElementById('confirmOverlay'),
  shopOverlay:     document.getElementById('shopOverlay'),
  winOverlay:      document.getElementById('winOverlay'),
  gameoverOverlay: document.getElementById('gameoverOverlay'),

  clearMessage:    document.getElementById('clear-message'),
  winScore:        document.getElementById('win-score'),
  shopGold:        document.getElementById('shop-gold'),
  priceDamage:     document.getElementById('price-damage'),
  priceRadius:     document.getElementById('price-radius'),
  pricePaddle:     document.getElementById('price-paddle'),
  priceGoldChance: document.getElementById('price-goldchance'),
  priceShield:     document.getElementById('price-shield'),

  confirmBtn:         document.getElementById('confirmBtn'),
  nextStageBtn:       document.getElementById('nextStageBtn'),
  buyDamage:          document.getElementById('buy-damage'),
  buyRadius:          document.getElementById('buy-radius'),
  buyPaddle:          document.getElementById('buy-paddle'),
  buyGoldChance:      document.getElementById('buy-goldchance'),
  buyShield:          document.getElementById('buy-shield'),
  restartBtn:         document.getElementById('restartBtn'),
  gameoverRestartBtn: document.getElementById('gameoverRestartBtn'),
  winMainBtn:         document.getElementById('winMainBtn'),
  gameoverMainBtn:    document.getElementById('gameoverMainBtn'),
  newGameBtn:         document.getElementById('newGameBtn'),
  openSettingsBtn:    document.getElementById('openSettingsBtn'),
  startGameBtn:       document.getElementById('startGameBtn'),
  closeSettingsBtn:   document.getElementById('closeSettingsBtn'),
  testWinBtn:         document.getElementById('testWinBtn'),
  bgmAudio:           document.getElementById('bgmAudio'),
  legendArmor:        document.getElementById('legend-armor'),
  legendIndestructible: document.getElementById('legend-indestructible'),
  legendHardened:     document.getElementById('legend-hardened'),
  rewardCards:        Array.from(document.querySelectorAll('.reward-card')),
};

const ctx = dom.canvas.getContext('2d');

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const W = 800, H = 500;
const MAX_STAGE = 5;

const BOSS = {
  SPEED:          4,
  TIME_LIMIT_SEC: 200,
  W:              (600 / 8) * 2,
  H:              200 / 6,
  HP:             150,
  HIT_COOLDOWN_MS: 100,
};

const PADDLE_SPIN = {
  FACTOR:           0.05,
  MAX_ANGLE:        Math.PI / 4,
  HISTORY_WINDOW_MS: 100,
};

const GOLD = {
  CHANCE_INCREMENT: 0.10,
  CHANCE_MAX:       1.0,
  TRAIT_REWARD:     3,
  TRAIT_BORDER:     '#ffd700',
};

const BRICK_TYPE = {
  NORMAL:        'normal',
  ARMOR:         'armor',
  INDESTRUCTIBLE:'indestructible',
  HARDENED:      'hardened',
  BOSS:          'boss',
};

const STAGE_LAYOUTS = { 1: [3, 5], 2: [4, 6], 3: [5, 7], 4: [6, 8] };

const COLOR_PRESETS = {
  default: { ball: '#222222', brick: '#e63946', armor: '#7fb3ff', indestructible: '#3a3a3a', hardened: '#7c3aed', boss: '#b51b00' },
  pastel:  { ball: '#6b9bd1', brick: '#ffb3ba', armor: '#b8d8ff', indestructible: '#9a9a9a', hardened: '#d4b3e8', boss: '#ff8b94' },
  neon:    { ball: '#00ffff', brick: '#ff00ff', armor: '#00bfff', indestructible: '#1a1a1a', hardened: '#b300ff', boss: '#ff0066' },
};

const BACKGROUND_PRESETS = {
  default: '#ffffff',
  space:   'linear-gradient(180deg, #0a0a2e 0%, #1a1a3e 100%)',
  forest:  'linear-gradient(180deg, #2d5016 0%, #4a7c2a 100%)',
};

// ─── STATE ────────────────────────────────────────────────────────────────────
let balls = [];
let bricks = [];
let score = 0;
let gold = 0;
let hasShield = false;
let running = false;
let animationId = null;
// 'main'|'settings'|'preGame'|'ready'|'playing'|'cleared'|'shop'|'won'|'gameover'
let gameState = 'ready';
let currentStage = 1;
let bossStartTime = null;

const settings = {
  ballColor:           COLOR_PRESETS.default.ball,
  brickColor:          COLOR_PRESETS.default.brick,
  armorColor:          COLOR_PRESETS.default.armor,
  indestructibleColor: COLOR_PRESETS.default.indestructible,
  hardenedColor:       COLOR_PRESETS.default.hardened,
  bossColor:           COLOR_PRESETS.default.boss,
  backgroundTheme:     'default',
  bgmEnabled:          true,
  sfxEnabled:          true,
};

const stats = {
  ballDamage: 1,
  ballRadius: 8,
  ballSpeed:  3,
  goldChance: 0,
};

const paddle = {
  w: 100, h: 12,
  x: (W - 100) / 2,
  y: H - 20,
  history: [],
  dx: 0,
  lastFrameX: (W - 100) / 2,
  lastFrameTime: 0,
};

const brickGrid = {
  rows: 4, cols: 8,
  w: 75,   h: 50,
  padding: 0,
  offsetTop: 50, offsetLeft: 100,
};

const effects = {
  indestructiblePierce: false,
  splashRatio:          0,
  bouncyHitsPerSpawn:   0,
  sniperInterval:       0,
  firstWallPierce:      false,
  goldMult:             1,
  ballSpeedMult:        1,
};

const effectsState = {
  bouncyHitCount:       0,
  lastSniperSpawnTime:  0,
};

const shopState = {
  damageBuys:     0,
  radiusBuys:     0,
  paddleBuys:     0,
  goldchanceBuys: 0,
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');

function stageBallSpeed() { return 2 + currentStage; }
function getBlockHp()     { return (2 ** currentStage) - 1; }
function isMainBall(ball) { return ball.bouncesLeft === undefined && !ball.vanishOnHit; }

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ─── BALL FACTORY ─────────────────────────────────────────────────────────────
function createBall(x, y, dx, dy) {
  const ball = { x, y, r: stats.ballRadius, dx, dy, color: settings.ballColor };
  if (effects.firstWallPierce) ball.pierce = true;
  return ball;
}

function spawnBouncyBall(x, y) {
  const angle = Math.random() * 2 * Math.PI;
  const speed = stats.ballSpeed;
  balls.push({
    x, y,
    r: stats.ballRadius * 0.6,
    dx: Math.cos(angle) * speed,
    dy: Math.sin(angle) * speed,
    color: settings.ballColor,
    bouncesLeft: 5,
  });
}

function spawnSniperBall() {
  const mainBall = balls.find(isMainBall);
  if (!mainBall) return;
  const target = findNearestBrick(mainBall);
  if (!target) return;
  const ddx = (target.x + target.w / 2) - mainBall.x;
  const ddy = (target.y + target.h / 2) - mainBall.y;
  const dist = Math.hypot(ddx, ddy);
  if (dist <= 0) return;
  const speed = stats.ballSpeed * 2;
  balls.push({
    x: mainBall.x, y: mainBall.y,
    r: stats.ballRadius * 0.6,
    dx: ddx / dist * speed,
    dy: ddy / dist * speed,
    color: settings.ballColor,
    vanishOnHit: true,
  });
}

function findNearestBrick(ball) {
  let best = null, bestD = Infinity;
  for (const b of bricks) {
    if (!b.alive) continue;
    if (b.type === BRICK_TYPE.INDESTRUCTIBLE && !effects.indestructiblePierce) continue;
    const dx = (b.x + b.w / 2) - ball.x;
    const dy = (b.y + b.h / 2) - ball.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = b; }
  }
  return best;
}

function findNeighbors(b) {
  return bricks.filter(o => {
    if (o === b || !o.alive) return false;
    const dx = Math.abs(o.x - b.x);
    const dy = Math.abs(o.y - b.y);
    return (dy < 1 && dx > 0 && dx < b.w * 1.5) ||
           (dx < 1 && dy > 0 && dy < b.h * 1.5);
  });
}

function incrementBouncyHitCount(ball) {
  if (!isMainBall(ball) || effects.bouncyHitsPerSpawn <= 0) return;
  effectsState.bouncyHitCount++;
  if (effectsState.bouncyHitCount % effects.bouncyHitsPerSpawn === 0) {
    spawnBouncyBall(ball.x, ball.y);
  }
}

// ─── BRICKS ───────────────────────────────────────────────────────────────────
function applyBrickType(b, type, baseHp) {
  b.type = type;
  if (type === BRICK_TYPE.ARMOR) {
    b.color = settings.armorColor;
    b.hp = b.maxHp = 5;
  } else if (type === BRICK_TYPE.HARDENED) {
    b.color = settings.hardenedColor;
    b.hp = b.maxHp = baseHp * 2;
  } else if (type === BRICK_TYPE.INDESTRUCTIBLE) {
    b.color = settings.indestructibleColor;
    b.hp = b.maxHp = Infinity;
  }
}

function initBricks() {
  bricks = [];
  if (currentStage === MAX_STAGE) { initBossStage(); return; }

  const [rows, cols] = STAGE_LAYOUTS[currentStage] || STAGE_LAYOUTS[4];
  brickGrid.rows = rows; brickGrid.cols = cols;
  brickGrid.w = 600 / cols; brickGrid.h = 200 / rows;

  const baseHp = getBlockHp();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      bricks.push({
        x: brickGrid.offsetLeft + c * brickGrid.w,
        y: brickGrid.offsetTop  + r * brickGrid.h,
        w: brickGrid.w, h: brickGrid.h,
        hp: baseHp, maxHp: baseHp,
        alive: true,
        color: settings.brickColor,
        type:  BRICK_TYPE.NORMAL,
      });
    }
  }

  placeSpecialBricks(baseHp, rows, cols);

  for (const b of bricks) {
    b.trait = null;
    if (b.type === BRICK_TYPE.INDESTRUCTIBLE || b.type === BRICK_TYPE.BOSS) continue;
    if (Math.random() < stats.goldChance) b.trait = 'gold';
  }
}

function initBossStage() {
  const angle  = Math.random() * 2 * Math.PI;
  const bossX  = (W - BOSS.W) / 2;
  const bossY  = 50;
  const indestW = 600 / 8;
  bricks.push({
    x: bossX, y: bossY,
    w: BOSS.W, h: BOSS.H,
    hp: BOSS.HP, maxHp: BOSS.HP,
    alive: true,
    color: settings.bossColor,
    type:  BRICK_TYPE.BOSS,
    dx: Math.cos(angle) * BOSS.SPEED,
    dy: Math.sin(angle) * BOSS.SPEED,
    lastHitTime: 0,
    formationH: BOSS.H * 2,
  });
  for (let i = 0; i < 2; i++) {
    bricks.push({
      x: bossX + i * indestW, y: bossY + BOSS.H,
      w: indestW, h: BOSS.H,
      hp: Infinity, maxHp: Infinity,
      alive: true,
      color: settings.indestructibleColor,
      type:  BRICK_TYPE.INDESTRUCTIBLE,
      bossAttached: true,
      bossOffsetX: i * indestW,
      bossOffsetY: BOSS.H,
    });
  }
}

function placeSpecialBricks(baseHp, rows, cols) {
  const allTypes   = [BRICK_TYPE.ARMOR, BRICK_TYPE.INDESTRUCTIBLE, BRICK_TYPE.HARDENED];
  const typeRolls  = Array.from({ length: 8 * (currentStage - 1) }, () => allTypes[Math.floor(Math.random() * 3)]);

  let indestructibleCount = typeRolls.filter(t => t === BRICK_TYPE.INDESTRUCTIBLE).length;
  const otherTypes        = typeRolls.filter(t => t !== BRICK_TYPE.INDESTRUCTIBLE);
  if (indestructibleCount > cols) {
    const overflow = indestructibleCount - cols;
    indestructibleCount = cols;
    const alt = [BRICK_TYPE.ARMOR, BRICK_TYPE.HARDENED];
    for (let i = 0; i < overflow; i++) otherTypes.push(alt[Math.floor(Math.random() * 2)]);
  }

  const bottomIndices = [], otherIndices = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      (r === rows - 1 ? bottomIndices : otherIndices).push(r * cols + c);
    }
  }
  shuffleInPlace(bottomIndices);
  shuffleInPlace(otherIndices);

  for (let i = 0; i < indestructibleCount; i++) {
    applyBrickType(bricks[bottomIndices[i]], BRICK_TYPE.INDESTRUCTIBLE, baseHp);
  }

  const remaining = [...otherIndices, ...bottomIndices.slice(indestructibleCount)];
  shuffleInPlace(remaining);
  for (let i = 0; i < otherTypes.length && i < remaining.length; i++) {
    applyBrickType(bricks[remaining[i]], otherTypes[i], baseHp);
  }
}

// ─── DAMAGE ───────────────────────────────────────────────────────────────────
function dealDamageToBlock(b, dmg) {
  if (!b.alive || b.type === BRICK_TYPE.INDESTRUCTIBLE) return false;
  if (b.type === BRICK_TYPE.ARMOR) dmg = Math.min(dmg, 1);
  dmg = Math.min(dmg, b.hp);
  if (dmg <= 0) return false;
  b.hp -= dmg;
  if (b.hp <= 0) {
    b.alive = false;
    score += currentStage;
    if (b.type !== BRICK_TYPE.BOSS) {
      const baseGold = b.trait === 'gold' ? GOLD.TRAIT_REWARD : 1;
      gold += Math.floor(baseGold * effects.goldMult);
      updateStatsDisplay();
    }
    updateScoreDisplay();
    return true;
  }
  return false;
}

function applySplash(b, ball) {
  if (!isMainBall(ball) || effects.splashRatio <= 0) return;
  const splashDmg = Math.floor(stats.ballDamage * effects.splashRatio);
  for (const n of findNeighbors(b)) {
    const d = n.type === BRICK_TYPE.ARMOR ? 1 : splashDmg;
    if (d > 0) dealDamageToBlock(n, d);
  }
}

// ─── COLLISION ────────────────────────────────────────────────────────────────
function reflectOffBlock(ball, b) {
  const overlapLeft   = (ball.x + ball.r) - b.x;
  const overlapRight  = (b.x + b.w) - (ball.x - ball.r);
  const overlapTop    = (ball.y + ball.r) - b.y;
  const overlapBottom = (b.y + b.h) - (ball.y - ball.r);
  const min = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

  if (min === overlapLeft) {
    const tx = b.x - ball.r;
    if (tx < ball.r) { ball.x = b.x + b.w + ball.r; ball.dx =  Math.abs(ball.dx); }
    else             { ball.x = tx;                  ball.dx = -Math.abs(ball.dx); }
  } else if (min === overlapRight) {
    const tx = b.x + b.w + ball.r;
    if (tx > W - ball.r) { ball.x = b.x - ball.r; ball.dx = -Math.abs(ball.dx); }
    else                 { ball.x = tx;             ball.dx =  Math.abs(ball.dx); }
  } else if (min === overlapTop) {
    const ty = b.y - ball.r;
    if (ty < ball.r) { ball.y = b.y + b.h + ball.r; ball.dy =  Math.abs(ball.dy); }
    else             { ball.y = ty;                   ball.dy = -Math.abs(ball.dy); }
  } else {
    const ty = b.y + b.h + ball.r;
    if (ty > H - ball.r) { ball.y = b.y - ball.r; ball.dy = -Math.abs(ball.dy); }
    else                 { ball.y = ty;             ball.dy =  Math.abs(ball.dy); }
  }
}

function collideBricks(ball) {
  for (const b of bricks) {
    if (!b.alive) continue;
    if (effects.indestructiblePierce && isMainBall(ball) && b.type === BRICK_TYPE.INDESTRUCTIBLE) continue;
    if (!(ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w &&
          ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h)) continue;
    if (ball.pierce) continue;

    if (b.type === BRICK_TYPE.INDESTRUCTIBLE) {
      playSfx('brickHit');
      applySplash(b, ball);
    } else {
      const isBoss = b.type === BRICK_TYPE.BOSS;
      let onCooldown = false;
      if (isBoss) {
        const now = performance.now();
        if (now - b.lastHitTime < BOSS.HIT_COOLDOWN_MS) onCooldown = true;
        else b.lastHitTime = now;
      }
      if (onCooldown) {
        playSfx('brickHit');
      } else {
        const primaryDmg = b.type === BRICK_TYPE.ARMOR ? 1 : stats.ballDamage;
        const destroyed  = dealDamageToBlock(b, primaryDmg);
        playSfx(!isBoss && b.trait === 'gold' && destroyed ? 'goldBrick'
                : destroyed ? 'brickDestroy' : 'brickHit');
        applySplash(b, ball);
      }
    }

    if (ball.vanishOnHit) { ball.dead = true; return; }

    reflectOffBlock(ball, b);

    if (ball.bouncesLeft !== undefined && --ball.bouncesLeft <= 0) ball.dead = true;
    incrementBouncyHitCount(ball);
    return;
  }
}

function allBricksCleared() {
  return bricks.every(b => !b.alive || b.type === BRICK_TYPE.INDESTRUCTIBLE);
}

// ─── PHYSICS ──────────────────────────────────────────────────────────────────
function updateBall(ball) {
  ball.x += ball.dx;
  ball.y += ball.dy;

  let wallHit = false;
  if (ball.x - ball.r < 0) { ball.x = ball.r;     ball.dx =  Math.abs(ball.dx); wallHit = true; }
  if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.dx = -Math.abs(ball.dx); wallHit = true; }
  if (ball.y - ball.r < 0) { ball.y = ball.r;     ball.dy =  Math.abs(ball.dy); wallHit = true; }
  if (wallHit) {
    if (ball.pierce) ball.pierce = false;
    if (ball.bouncesLeft !== undefined && --ball.bouncesLeft <= 0) ball.dead = true;
    incrementBouncyHitCount(ball);
  }

  if (ball.y + ball.r >= paddle.y &&
      ball.y + ball.r <= paddle.y + paddle.h &&
      ball.x >= paddle.x && ball.x <= paddle.x + paddle.w &&
      ball.dy > 0) {
    ball.dy = -ball.dy;

    let adj = Math.max(-PADDLE_SPIN.MAX_ANGLE, Math.min(PADDLE_SPIN.MAX_ANGLE, paddle.dx * PADDLE_SPIN.FACTOR));
    if (adj !== 0) {
      const cosA = Math.cos(adj), sinA = Math.sin(adj);
      ball.dx = ball.dx * cosA - ball.dy * sinA;
      ball.dy = ball.dx * sinA + ball.dy * cosA;
      if (ball.dy > 0) ball.dy = -ball.dy;
    }

    // 최대 각도 ±60° (수직 기준) 스냅
    const maxAngle        = Math.PI / 3;
    const angleFromVertical = Math.atan2(ball.dx, -ball.dy);
    if (Math.abs(angleFromVertical) > maxAngle) {
      const speed = Math.hypot(ball.dx, ball.dy);
      const sign  = Math.sign(angleFromVertical) || 1;
      ball.dx = Math.sin(maxAngle * sign) * speed;
      ball.dy = -Math.cos(maxAngle * sign) * speed;
    }

    if (ball.bouncesLeft !== undefined && --ball.bouncesLeft <= 0) ball.dead = true;
    incrementBouncyHitCount(ball);
    playSfx('paddle');
  }

  collideBricks(ball);
}

function updateBoss() {
  let boss = null;
  for (const b of bricks) {
    if (b.type !== BRICK_TYPE.BOSS || !b.alive) continue;
    boss = b;
    b.x += b.dx; b.y += b.dy;
    const formH = b.formationH || b.h;
    if (b.x < 0)           { b.x = 0;           b.dx =  Math.abs(b.dx); }
    if (b.x + b.w > W)     { b.x = W - b.w;     b.dx = -Math.abs(b.dx); }
    if (b.y < 0)           { b.y = 0;            b.dy =  Math.abs(b.dy); }
    if (b.y + formH > H/2) { b.y = H/2 - formH; b.dy = -Math.abs(b.dy); }
  }
  if (boss) {
    for (const b of bricks) {
      if (b.bossAttached) { b.x = boss.x + b.bossOffsetX; b.y = boss.y + b.bossOffsetY; }
    }
  }
}

function updatePaddleHistory() {
  const now  = performance.now();
  const dtMs = paddle.lastFrameTime > 0 ? now - paddle.lastFrameTime : 0;
  if (dtMs > 0) {
    const v = (paddle.x - paddle.lastFrameX) * (1000 / 60) / dtMs;
    paddle.history.push({ t: now, v });
    while (paddle.history.length > 1 && now - paddle.history[0].t > PADDLE_SPIN.HISTORY_WINDOW_MS) {
      paddle.history.shift();
    }
  }
  paddle.lastFrameX    = paddle.x;
  paddle.lastFrameTime = now;
  let sum = 0;
  for (const s of paddle.history) sum += s.v;
  paddle.dx = paddle.history.length > 0 ? sum / paddle.history.length : 0;
}

function tickSniperSpawn() {
  if (effects.sniperInterval <= 0) return;
  if (!bricks.some(b => b.alive && b.type !== BRICK_TYPE.INDESTRUCTIBLE)) return;
  const now = performance.now();
  if (effectsState.lastSniperSpawnTime === 0) {
    effectsState.lastSniperSpawnTime = now;
  } else if (now - effectsState.lastSniperSpawnTime > effects.sniperInterval * 1000) {
    effectsState.lastSniperSpawnTime = now;
    spawnSniperBall();
  }
}

function update() {
  updatePaddleHistory();
  tickSniperSpawn();

  for (const ball of balls) updateBall(ball);
  if (currentStage === MAX_STAGE) updateBoss();

  if (hasShield) {
    const mainBall = balls.find(isMainBall);
    if (mainBall && mainBall.y - mainBall.r > H) {
      mainBall.y  = H - mainBall.r;
      mainBall.dy = -Math.abs(mainBall.dy);
      hasShield   = false;
      dom.message.textContent = '보호막 발동!';
      playSfx('shield');
      updateStatsDisplay();
      setTimeout(() => {
        if (dom.message.textContent === '보호막 발동!') dom.message.textContent = '';
      }, 1500);
    }
  }

  balls = balls.filter(b => !b.dead && b.y - b.r <= H);
  if (balls.length === 0) { gameOver(false); return; }

  if (currentStage === MAX_STAGE && bossStartTime !== null) {
    const elapsed = (performance.now() - bossStartTime) / 1000;
    if (elapsed >= BOSS.TIME_LIMIT_SEC) { gameOver(false); return; }
    updateStageDisplay();
    updateScoreDisplay();
  }

  if (allBricksCleared()) gameOver(true);
}

// ─── DRAW ─────────────────────────────────────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, W, H);
  drawBricks();
  drawBalls();
  drawPaddle();
  drawShield();
}

function drawBalls() {
  for (const ball of balls) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    ctx.closePath();
  }
}

function drawPaddle() {
  ctx.fillStyle = '#000';
  ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
}

function drawShield() {
  if (!hasShield) return;
  ctx.fillStyle = '#4caf50';
  ctx.fillRect(0, H - 4, W, 4);
}

function drawBricks() {
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  for (const b of bricks) {
    if (!b.alive) continue;
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = '#000';
    ctx.lineWidth   = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    if (b.trait === 'gold') {
      ctx.strokeStyle = GOLD.TRAIT_BORDER;
      ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
    }
    const cx   = b.x + b.w / 2, cy = b.y + b.h / 2;
    const text = b.type === BRICK_TYPE.INDESTRUCTIBLE ? '∞' : String(b.hp);
    ctx.font        = b.type === BRICK_TYPE.BOSS ? 'bold 32px sans-serif' : 'bold 16px sans-serif';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.strokeText(text, cx, cy);
    ctx.fillStyle = '#fff';
    ctx.fillText(text, cx, cy);
  }
}

// ─── DISPLAY UPDATES ──────────────────────────────────────────────────────────
function updateScoreDisplay() {
  if (currentStage === MAX_STAGE && bossStartTime !== null) {
    const elapsed = (performance.now() - bossStartTime) / 1000;
    dom.score.textContent = `점수: ${Math.max(0, Math.floor((BOSS.TIME_LIMIT_SEC - elapsed) * 100))}`;
  } else {
    dom.score.textContent = `점수: ${score}`;
  }
}

function updateStageDisplay() {
  if (currentStage === MAX_STAGE && bossStartTime !== null) {
    const elapsed   = (performance.now() - bossStartTime) / 1000;
    const remaining = Math.max(0, Math.ceil(BOSS.TIME_LIMIT_SEC - elapsed));
    dom.stage.textContent = `스테이지: ${currentStage} (남은 시간: ${remaining}초)`;
  } else {
    dom.stage.textContent = `스테이지: ${currentStage}`;
  }
}

function updateStatsDisplay() {
  dom.statDamage.textContent     = stats.ballDamage;
  dom.statRadius.textContent     = stats.ballRadius;
  dom.statPaddle.textContent     = paddle.w;
  dom.statGoldChance.textContent = Math.round(stats.goldChance * 100) + '%';
  dom.statGold.textContent       = gold;
}

// ─── GAME FLOW ────────────────────────────────────────────────────────────────
function resetGame() {
  paddle.x = (W - paddle.w) / 2;
  paddle.history = []; paddle.dx = 0;
  paddle.lastFrameX = paddle.x; paddle.lastFrameTime = 0;
  stats.ballSpeed = stageBallSpeed() * effects.ballSpeedMult;
  const speed = stats.ballSpeed;
  const angle = (Math.random() * 60 - 30) * Math.PI / 180;
  balls = [createBall(
    paddle.x + paddle.w / 2, paddle.y - stats.ballRadius,
    Math.sin(angle) * speed, -Math.cos(angle) * speed
  )];
  effectsState.lastSniperSpawnTime = 0;
  bossStartTime = null;
  initBricks();
  dom.message.textContent = '';
  updateScoreDisplay(); updateStageDisplay(); updateStatsDisplay();
  gameState = 'ready';
}

function fullReset() {
  currentStage = 1; score = 0; gold = 0; hasShield = false;
  stats.ballDamage = 1; stats.ballRadius = 8; stats.ballSpeed = 3; stats.goldChance = 0;
  paddle.w = 100;
  shopState.damageBuys = 0; shopState.radiusBuys = 0;
  shopState.paddleBuys = 0; shopState.goldchanceBuys = 0;
  bossStartTime = null;
  Object.assign(effects, {
    indestructiblePierce: false, splashRatio: 0,
    bouncyHitsPerSpawn: 0,       sniperInterval: 0,
    firstWallPierce: false,      goldMult: 1, ballSpeedMult: 1,
  });
  effectsState.bouncyHitCount = 0; effectsState.lastSniperSpawnTime = 0;
  pickedItemIds.clear();
}

function startGame() {
  if (gameState !== 'ready') return;
  gameState = 'playing';
  if (currentStage === MAX_STAGE) bossStartTime = performance.now();
  running = true;
  animationId = requestAnimationFrame(loop);
}

function loop() {
  if (!running) return;
  update(); draw();
  if (running) animationId = requestAnimationFrame(loop);
}

function gameOver(won) {
  running = false;
  cancelAnimationFrame(animationId);
  if (won) {
    if (currentStage === MAX_STAGE) {
      const elapsed = (performance.now() - bossStartTime) / 1000;
      dom.winScore.textContent = Math.max(0, Math.floor((BOSS.TIME_LIMIT_SEC - elapsed) * 100));
      gameState = 'won';
      show(dom.winOverlay);
    } else {
      dom.clearMessage.textContent = `스테이지 ${currentStage} 클리어!`;
      dom.message.textContent = '';
      currentStage++;
      gameState = 'cleared';
      show(dom.confirmOverlay);
    }
    playSfx('win');
  } else {
    gameState = 'gameover';
    show(dom.gameoverOverlay);
    playSfx('gameover');
  }
  updateStageDisplay();
  updateStatsDisplay();
}

function returnToStart() {
  hide(dom.winOverlay); hide(dom.gameoverOverlay);
  fullReset(); resetGame();
  gameState = 'preGame';
  show(dom.preGameOverlay);
  draw();
}

function returnToMain() {
  [dom.winOverlay, dom.gameoverOverlay, dom.confirmOverlay,
   dom.shopOverlay, dom.preGameOverlay, dom.settingsOverlay].forEach(hide);
  fullReset(); resetGame();
  gameState = 'main';
  show(dom.mainOverlay);
  draw();
}

// ─── SHOP ─────────────────────────────────────────────────────────────────────
function priceFor(kind) {
  if (kind === 'shield') return 20;
  return 5 + 5 * shopState[kind + 'Buys'];
}

function updateShopUI() {
  const maxed = stats.goldChance >= GOLD.CHANCE_MAX;
  dom.shopGold.textContent        = gold;
  dom.priceDamage.textContent     = priceFor('damage');
  dom.priceRadius.textContent     = priceFor('radius');
  dom.pricePaddle.textContent     = priceFor('paddle');
  dom.priceGoldChance.textContent = maxed ? '최대' : priceFor('goldchance');
  dom.priceShield.textContent     = hasShield ? '보유중' : priceFor('shield');
  dom.buyDamage.disabled    = gold < priceFor('damage');
  dom.buyRadius.disabled    = gold < priceFor('radius');
  dom.buyPaddle.disabled    = gold < priceFor('paddle');
  dom.buyGoldChance.disabled = maxed || gold < priceFor('goldchance');
  dom.buyShield.disabled    = hasShield || gold < priceFor('shield');
}

function buy(kind) {
  if (kind === 'shield' && hasShield) return;
  if (kind === 'goldchance' && stats.goldChance >= GOLD.CHANCE_MAX) return;
  const price = priceFor(kind);
  if (gold < price) return;
  gold -= price;
  if (kind === 'shield') {
    hasShield = true;
  } else if (kind === 'goldchance') {
    shopState.goldchanceBuys++;
    stats.goldChance = Math.min(GOLD.CHANCE_MAX, stats.goldChance + GOLD.CHANCE_INCREMENT);
  } else {
    shopState[kind + 'Buys']++;
    if (kind === 'damage')      stats.ballDamage += 1;
    else if (kind === 'radius') stats.ballRadius += 2;
    else if (kind === 'paddle') paddle.w          += 20;
  }
  updateStatsDisplay();
  updateShopUI();
}

// ─── ITEMS ────────────────────────────────────────────────────────────────────
const ITEM_POOL = [
  { id: 'bouncy_small',    name: '튀는 소형 공', desc: '3회 충돌(벽·패드·블록)마다 5회 튕기는 소형 공 1개 생성',
    apply: () => { effects.bouncyHitsPerSpawn = 3; } },
  { id: 'bigger_stronger', name: '강화 공',       desc: '공 크기 +30%, 데미지 +100%',
    apply: () => { stats.ballRadius *= 1.3; stats.ballDamage *= 2; } },
  { id: 'indest_pierce',   name: '파괴자',        desc: '파괴 불가 블록 관통',
    apply: () => { effects.indestructiblePierce = true; } },
  { id: 'splash',          name: '폭발',          desc: '주변 블록 50% 스플래시 데미지',
    apply: () => { effects.splashRatio = 0.5; } },
  { id: 'sniper',          name: '저격',          desc: '5초마다 메인 공 위치에서 가장 가까운 블록 방향으로 직선 발사, 메인 공 2배 속도 (충돌 시 소멸)',
    apply: () => { effects.sniperInterval = 5; } },
  { id: 'speed_gold',      name: '쾌속',          desc: '공 속도 +100%, 골드 +50%',
    apply: () => { effects.ballSpeedMult *= 2; effects.goldMult += 0.5; } },
  { id: 'pierce_start',    name: '돌격',          desc: '벽에 처음 부딪히기 전까지 블록 통과 (데미지 없음)',
    apply: () => { effects.firstWallPierce = true; } },
  { id: 'small_paddle',    name: '도전',          desc: '패드 크기 -50%, 골드 +100%',
    apply: () => { paddle.w *= 0.5; effects.goldMult += 1; } },
];

let currentRewards    = [];
let selectedRewardIdx = null;
const pickedItemIds   = new Set();

function rollRandomRewards() {
  const available = ITEM_POOL.filter(i => !pickedItemIds.has(i.id));
  const shuffled  = available.slice();
  shuffleInPlace(shuffled);
  const result = shuffled.slice(0, 3);
  while (result.length < 3) result.push({ id: `__empty_${result.length}`, name: '?', desc: '(없음)' });
  return result;
}

function setupShopRewards() {
  currentRewards    = rollRandomRewards();
  selectedRewardIdx = null;
  for (let i = 0; i < 3; i++) {
    const card = dom.rewardCards[i];
    const item = currentRewards[i];
    card.querySelector('.reward-name').textContent = item.name;
    card.querySelector('.reward-desc').textContent = item.desc;
    card.classList.remove('picked');
    card.disabled = typeof item.apply !== 'function';
  }
}

function pickReward(idx) {
  const item = currentRewards[idx];
  if (!item || typeof item.apply !== 'function') return;
  selectedRewardIdx = idx;
  dom.rewardCards.forEach((card, i) => card.classList.toggle('picked', i === idx));
}

function commitSelectedReward() {
  if (selectedRewardIdx === null) return;
  const item = currentRewards[selectedRewardIdx];
  if (!item || typeof item.apply !== 'function') return;
  item.apply();
  pickedItemIds.add(item.id);
  selectedRewardIdx = null;
  updateStatsDisplay();
}

function openShop() {
  gameState = 'shop';
  hide(dom.confirmOverlay);
  show(dom.shopOverlay);
  setupShopRewards();
  updateShopUI();
}

function closeShopToNextStage() {
  commitSelectedReward();
  hide(dom.shopOverlay);
  resetGame();
  gameState = 'preGame';
  show(dom.preGameOverlay);
  draw();
}

// ─── AUDIO ────────────────────────────────────────────────────────────────────
function tryPlayBgm() {
  if (!settings.bgmEnabled || !dom.bgmAudio) return;
  const p = dom.bgmAudio.play();
  if (p?.catch) p.catch(() => {});
}

function pauseBgm() { if (dom.bgmAudio) dom.bgmAudio.pause(); }

let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (Ctor) audioCtx = new Ctor();
  }
  return audioCtx;
}

function playSfx(type) {
  if (!settings.sfxEnabled) return;
  const ac = getAudioCtx();
  if (!ac) return;
  const now  = ac.currentTime;
  const osc  = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain).connect(ac.destination);
  let dur = 0.05;
  switch (type) {
    case 'paddle':
      osc.type = 'sine';     osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.18, now); dur = 0.05; break;
    case 'brickHit':
      osc.type = 'square';   osc.frequency.setValueAtTime(220, now);
      gain.gain.setValueAtTime(0.12, now); dur = 0.04; break;
    case 'brickDestroy':
      osc.type = 'square';   osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(160, now + 0.1);
      gain.gain.setValueAtTime(0.22, now); dur = 0.1; break;
    case 'goldBrick':
      osc.type = 'sine';     osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15);
      gain.gain.setValueAtTime(0.25, now); dur = 0.15; break;
    case 'win':
      osc.type = 'triangle'; osc.frequency.setValueAtTime(523, now);
      osc.frequency.setValueAtTime(659, now + 0.1);
      osc.frequency.setValueAtTime(784, now + 0.2);
      gain.gain.setValueAtTime(0.22, now); dur = 0.4; break;
    case 'gameover':
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.5);
      gain.gain.setValueAtTime(0.25, now); dur = 0.5; break;
    case 'shield':
      osc.type = 'square';   osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.18, now); dur = 0.2; break;
    default: return;
  }
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  osc.start(now); osc.stop(now + dur + 0.02);
}

// ─── SETTINGS UI ──────────────────────────────────────────────────────────────
function updateLegendColors() {
  dom.legendArmor.style.background         = settings.armorColor;
  dom.legendIndestructible.style.background = settings.indestructibleColor;
  dom.legendHardened.style.background      = settings.hardenedColor;
}

function applyBackground() {
  dom.canvas.style.background = BACKGROUND_PRESETS[settings.backgroundTheme];
}

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const p = COLOR_PRESETS[btn.dataset.preset];
    if (!p) return;
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    Object.assign(settings, {
      ballColor: p.ball, brickColor: p.brick, armorColor: p.armor,
      indestructibleColor: p.indestructible, hardenedColor: p.hardened, bossColor: p.boss,
    });
    updateLegendColors();
  });
});

document.querySelectorAll('.bg-preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!BACKGROUND_PRESETS[btn.dataset.bg]) return;
    document.querySelectorAll('.bg-preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    settings.backgroundTheme = btn.dataset.bg;
    applyBackground();
  });
});

document.querySelectorAll('.bgm-toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.bgm-toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    settings.bgmEnabled = btn.dataset.bgm === 'on';
    settings.bgmEnabled ? tryPlayBgm() : pauseBgm();
  });
});

document.querySelectorAll('.sfx-toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sfx-toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    settings.sfxEnabled = btn.dataset.sfx === 'on';
  });
});

// ─── EVENT LISTENERS ──────────────────────────────────────────────────────────
dom.confirmBtn.addEventListener('click', () => { if (gameState === 'cleared') openShop(); });
dom.nextStageBtn.addEventListener('click', () => { if (gameState === 'shop') closeShopToNextStage(); });

dom.buyDamage.addEventListener('click',    () => buy('damage'));
dom.buyRadius.addEventListener('click',    () => buy('radius'));
dom.buyPaddle.addEventListener('click',    () => buy('paddle'));
dom.buyGoldChance.addEventListener('click',() => buy('goldchance'));
dom.buyShield.addEventListener('click',    () => buy('shield'));

dom.rewardCards.forEach((card, i) => card.addEventListener('click', () => pickReward(i)));

dom.restartBtn.addEventListener('click',         () => { if (gameState === 'won')      returnToStart(); });
dom.gameoverRestartBtn.addEventListener('click', () => { if (gameState === 'gameover') returnToStart(); });
dom.winMainBtn.addEventListener('click',         () => { if (gameState === 'won')      returnToMain(); });
dom.gameoverMainBtn.addEventListener('click',    () => { if (gameState === 'gameover') returnToMain(); });

dom.newGameBtn.addEventListener('click', () => {
  if (gameState !== 'main') return;
  fullReset(); resetGame(); draw();
  hide(dom.mainOverlay); show(dom.preGameOverlay);
  gameState = 'preGame';
});

dom.openSettingsBtn.addEventListener('click', () => {
  if (gameState !== 'main') return;
  hide(dom.mainOverlay); show(dom.settingsOverlay);
  gameState = 'settings';
});

dom.closeSettingsBtn.addEventListener('click', () => {
  if (gameState !== 'settings') return;
  hide(dom.settingsOverlay); show(dom.mainOverlay);
  gameState = 'main';
});

dom.startGameBtn.addEventListener('click', () => {
  if (gameState !== 'preGame') return;
  hide(dom.preGameOverlay);
  gameState = 'ready';
  tryPlayBgm();
  startGame();
});

document.addEventListener('mousemove', e => {
  const rect = dom.canvas.getBoundingClientRect();
  paddle.x = Math.max(0, Math.min(e.clientX - rect.left - paddle.w / 2, W - paddle.w));
});

dom.testWinBtn.addEventListener('click', () => {
  if (!running) return;
  for (const b of bricks) {
    if (!b.alive || b.type === BRICK_TYPE.INDESTRUCTIBLE) continue;
    b.alive = false;
    score += currentStage;
    if (b.type !== BRICK_TYPE.BOSS) {
      gold += Math.floor((b.trait === 'gold' ? GOLD.TRAIT_REWARD : 1) * effects.goldMult);
    }
  }
  updateScoreDisplay(); updateStatsDisplay();
  gameOver(true);
});

// ─── INIT ─────────────────────────────────────────────────────────────────────
const dpr = window.devicePixelRatio || 1;
dom.canvas.width        = W * dpr;
dom.canvas.height       = H * dpr;
dom.canvas.style.width  = W + 'px';
dom.canvas.style.height = H + 'px';
ctx.scale(dpr, dpr);

resetGame();
applyBackground();
draw();
gameState = 'main';
