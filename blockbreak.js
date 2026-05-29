'use strict';

// ─── DOM ──────────────────────────────────────────────────────────────────────
const dom = {
  canvas:     document.getElementById('gameCanvas'),
  canvasWrap: document.querySelector('.canvas-wrap'),
  stage:    document.getElementById('stage'),
  timer:    document.getElementById('timer'),
  score:    document.getElementById('score'),
  message:  document.getElementById('message'),
  statDamage:     document.getElementById('stat-damage'),
  statRadius:     document.getElementById('stat-radius'),
  statSpeed:      document.getElementById('stat-speed'),
  statGoldMult:   document.getElementById('stat-goldmult'),
  statPaddle:     document.getElementById('stat-paddle'),
  statGold:       document.getElementById('stat-gold'),
  statGoldChance: document.getElementById('stat-goldchance'),

  storyOverlay:    document.getElementById('storyOverlay'),
  storyCloseBtn:   document.getElementById('storyCloseBtn'),
  mainOverlay:     document.getElementById('mainOverlay'),
  preGameOverlay:  document.getElementById('preGameOverlay'),
  settingsOverlay: document.getElementById('settingsOverlay'),
  confirmOverlay:  document.getElementById('confirmOverlay'),
  rewardOverlay:   document.getElementById('rewardOverlay'),
  shopOverlay:     document.getElementById('shopOverlay'),
  confirmRewardBtn: document.getElementById('confirmRewardBtn'),
  winOverlay:      document.getElementById('winOverlay'),
  gameoverOverlay: document.getElementById('gameoverOverlay'),

  clearMessage:    document.getElementById('clear-message'),
  winScore:        document.getElementById('win-score'),
  shopGold:        document.getElementById('shop-gold'),
  priceDamage:     document.getElementById('price-damage'),
  pricePaddle:     document.getElementById('price-paddle'),
  priceGoldChance: document.getElementById('price-goldchance'),
  priceShield:     document.getElementById('price-shield'),

  confirmBtn:         document.getElementById('confirmBtn'),
  nextStageBtn:       document.getElementById('nextStageBtn'),
  buyDamage:          document.getElementById('buy-damage'),
  buyPaddle:          document.getElementById('buy-paddle'),
  buyGoldChance:      document.getElementById('buy-goldchance'),
  buyShield:          document.getElementById('buy-shield'),
  restartBtn:         document.getElementById('restartBtn'),
  gameoverRestartBtn: document.getElementById('gameoverRestartBtn'),
  winMainBtn:         document.getElementById('winMainBtn'),
  gameoverMainBtn:    document.getElementById('gameoverMainBtn'),
  newGameBtn:         document.getElementById('newGameBtn'),
  openRulesBtn:       document.getElementById('openRulesBtn'),
  closeRulesBtn:      document.getElementById('closeRulesBtn'),
  rulesOverlay:       document.getElementById('rulesOverlay'),
  openSettingsBtn:    document.getElementById('openSettingsBtn'),
  startGameBtn:       document.getElementById('startGameBtn'),
  closeSettingsBtn:   document.getElementById('closeSettingsBtn'),
  testWinBtn:         document.getElementById('testWinBtn'),
  bgmAudio:           document.getElementById('bgmAudio'),
  sfxPaddle:          document.getElementById('sfxPaddle'),
  sfxBrickHit:        document.getElementById('sfxBrickHit'),
  sfxBrickDestroy:    document.getElementById('sfxBrickDestroy'),
  sfxWin:             document.getElementById('sfxWin'),
  sfxFinalWin:        document.getElementById('sfxFinalWin'),
  sfxGameover:        document.getElementById('sfxGameover'),
  sfxClick:           document.getElementById('sfxClick'),
  legendArmor:        document.getElementById('legend-armor'),
  legendIndestructible: document.getElementById('legend-indestructible'),
  legendHardened:     document.getElementById('legend-hardened'),
  rewardCards:        Array.from(document.querySelectorAll('.reward-card')),
  pickedItems:        document.getElementById('picked-items'),
  customColorGroup:   document.getElementById('customColorGroup'),
};

const ctx = dom.canvas.getContext('2d');

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const W = 800, H = 500;
const MAX_STAGE = 5;

const BOSS = {
  SPEED:          2,
  TIME_LIMIT_SEC: 180,
  W:              (600 / 8) * 2,
  H:              200 / 6,
  HP:             1000,
  HIT_COOLDOWN_MS: 100,
  TURN_INTERVAL_MS: 500,  // 방향 전환 간격 (ms)
  TURN_ANGLE_DEG:   10,   // 방향 전환 최대 각도 (±도)
};

const BLOOM = {
  size:    30,  // 글로우가 공 바깥으로 번지는 거리 (px)
  opacity: 0.1, // 글로우 중심부 불투명도 (0~1)
};

const PADDLE_SPIN = {
  FACTOR:           0.05,
  MAX_ANGLE:        Math.PI / 4,
  HISTORY_WINDOW_MS: 100,
};

const GOLD = {
  TILE_PER_BUY: 2,
  TRAIT_REWARD: 5,
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
  default: { ball: '#ffe042', brick: '#545454', armor: '#606e80', indestructible: '#805252', hardened: '#63537f', boss: '#000000', paddle: '#ffe042' },
  pastel:  { ball: '#b7fea9', brick: '#125200', armor: '#15529e', indestructible: '#4f4f4f', hardened: '#513b5e', boss: '#00393d', paddle: '#966c4f' },
  neon:    { ball: '#e1ff00', brick: '#0400ff', armor: '#1ac6ff', indestructible: '#5c5c5c', hardened: '#bf29ff', boss: '#004c94', paddle: '#e1ff00' },
  custom:  { ball: '#ffe042', brick: '#545454', armor: '#606e80', indestructible: '#805252', hardened: '#63537f', boss: '#000000', paddle: '#ffe042' },
};

const BACKGROUND_PRESETS = {
  default: '#2b2b2b',
  space:   'linear-gradient(180deg, #0a0a2e 0%, #1a1a3e 100%)',
  forest:  '#112405',
  custom:  '#2b2b2b',
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
let stageStartTime = null;
let lastTickSecond = 0;
let lastLoopTs = 0;

const settings = {
  ballColor:           COLOR_PRESETS.default.ball,
  brickColor:          COLOR_PRESETS.default.brick,
  armorColor:          COLOR_PRESETS.default.armor,
  indestructibleColor: COLOR_PRESETS.default.indestructible,
  hardenedColor:       COLOR_PRESETS.default.hardened,
  bossColor:           COLOR_PRESETS.default.boss,
  paddleColor:         COLOR_PRESETS.default.paddle,
  backgroundTheme:     'default',
  bgmEnabled:          true,
  bgmVolume:           0.3,
  sfxEnabled:          true,
  sfxVolume:           0.5,
};

const stats = {
  ballDamage: 1,
  ballRadius: 8,
  ballSpeed:  3,
  goldTileCount: 0,
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
  indestructiblePierce:        false,
  indestructiblePierceBonus:   0,     // 파괴불가 관통 후 첫 충돌 데미지 배율 추가
  splashRatio:                 0,
  splashMoore:                 false, // true = 8방향 스플래시
  bouncyHitsPerSpawn:          0,
  bouncyBallBounces:           0,     // 소형 에너지 추가 충돌 횟수
  sniperInterval:              0,
  sniperDamageMult:            1,     // 저격 공 데미지 배율
  rapidFireInterval:           0,
  rapidFireDamageMult:         0.2,   // 연사 공 데미지 배율
  cloneBallInterval:           0,
  firstWallPierce:             false,
  firstWallPierceDamage:       false, // MAX 레벨: 관통 중 데미지 적용
  launchAngleMult:             1,     // 발사 각도 배율
  launchAngleReduction:        0,     // 발사 각도 감소 (도)
  goldMult:                    1,
  ballSpeedMult:               1,
  pierceOnDestroy:             false,
  pierceOnDestroySplashRatio:  0,     // 정화 관통 시 스플래시 비율
};

const effectsState = {
  bouncyHitCount:       0,
  lastSniperSpawnTime:   0,
  lastRapidFireSpawnTime: 0,
  lastCloneBallSpawnTime: 0,
};

const shopState = {
  damageBuys:     0,
  paddleBuys:     0,
  goldchanceBuys: 0,
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');

function complementaryColor(hex) {
  const r = 255 - parseInt(hex.slice(1, 3), 16);
  const g = 255 - parseInt(hex.slice(3, 5), 16);
  const b = 255 - parseInt(hex.slice(5, 7), 16);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

function blendToWhite(hex, ratio) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const t = 1 - ratio;
  const rr = Math.round(r + (255 - r) * t);
  const gg = Math.round(g + (255 - g) * t);
  const bb = Math.round(b + (255 - b) * t);
  return `#${rr.toString(16).padStart(2,'0')}${gg.toString(16).padStart(2,'0')}${bb.toString(16).padStart(2,'0')}`;
}

function stageBallSpeed() {
  const speeds = [0, 4, 4.5, 5, 5.5, 6];
  return speeds[currentStage] ?? 6;
}
function getBlockHp()     { return [1, 5, 15, 40][currentStage - 1] ?? 1; }
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
    bouncesLeft: 5 + effects.bouncyBallBounces,
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
    damageMult: effects.sniperDamageMult,
  });
}

function spawnRapidFireBall() {
  const mainBall = balls.find(isMainBall);
  if (!mainBall) return;
  const target = findNearestBrick(mainBall);
  if (!target) return;
  const ddx = (target.x + target.w / 2) - mainBall.x;
  const ddy = (target.y + target.h / 2) - mainBall.y;
  const dist = Math.hypot(ddx, ddy);
  if (dist <= 0) return;
  const speed = stats.ballSpeed;
  balls.push({
    x: mainBall.x, y: mainBall.y,
    r: stats.ballRadius * 0.5,
    dx: ddx / dist * speed,
    dy: ddy / dist * speed,
    color: settings.ballColor,
    vanishOnHit: true,
    damageMult: effects.rapidFireDamageMult,
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

function findNeighbors(b, moore = false) {
  return bricks.filter(o => {
    if (o === b || !o.alive) return false;
    const dx = Math.abs(o.x - b.x);
    const dy = Math.abs(o.y - b.y);
    const cross = (dy < 1 && dx > 0 && dx < b.w * 1.5) ||
                  (dx < 1 && dy > 0 && dy < b.h * 1.5);
    if (cross) return true;
    if (moore) return dx > 0 && dx < b.w * 1.5 && dy > 0 && dy < b.h * 1.5;
    return false;
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
    b.hp = b.maxHp = 3;
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

  for (const b of bricks) b.trait = null;
  if (stats.goldTileCount > 0) {
    const eligible = bricks.filter(b => b.type !== BRICK_TYPE.INDESTRUCTIBLE && b.type !== BRICK_TYPE.BOSS);
    shuffleInPlace(eligible);
    const count = Math.min(stats.goldTileCount, eligible.length);
    for (let i = 0; i < count; i++) eligible[i].trait = 'gold';
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
    lastTurnTime: performance.now(),
    formationH: BOSS.H * 2,
  });
  bricks.push({
    x: bossX, y: bossY + BOSS.H,
    w: BOSS.W, h: BOSS.H,
    hp: Infinity, maxHp: Infinity,
    alive: true,
    color: settings.indestructibleColor,
    type:  BRICK_TYPE.INDESTRUCTIBLE,
    bossAttached: true,
    bossOffsetX: 0,
    bossOffsetY: BOSS.H,
  });
}

function placeSpecialBricks(baseHp, rows, cols) {
  const allTypes = [BRICK_TYPE.ARMOR, BRICK_TYPE.INDESTRUCTIBLE, BRICK_TYPE.HARDENED];
  const COUNT_PER_TYPE = [0, 0, 1, 3, 7]; // 스테이지별 종류당 특수 블록 수
  const countPerType = COUNT_PER_TYPE[currentStage] ?? 0;

  // 각 종류가 countPerType개씩 균등 배치
  const typeRolls = [];
  for (const t of allTypes) {
    for (let j = 0; j < countPerType; j++) typeRolls.push(t);
  }
  shuffleInPlace(typeRolls);

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
    if (b.type !== BRICK_TYPE.BOSS) {
      const baseGold = b.trait === 'gold' ? GOLD.TRAIT_REWARD : 2;
      gold += Math.ceil(baseGold * effects.goldMult);
      updateStatsDisplay();
    }
    updateScoreDisplay();
    return true;
  }
  return false;
}

function applySplash(b, ball) {
  if (!isMainBall(ball) || effects.splashRatio <= 0) return;
  const splashDmg = Math.ceil(stats.ballDamage * effects.splashRatio);
  for (const n of findNeighbors(b, effects.splashMoore)) {
    const d = n.type === BRICK_TYPE.ARMOR ? 1 : splashDmg;
    if (d > 0) dealDamageToBlock(n, d);
  }
}

// ─── COLLISION ────────────────────────────────────────────────────────────────
function reflectOffBlock(ball, b, prevX, prevY) {
  // 이전 위치 기준으로 진입 방향 판단
  const wasLeft   = prevX + ball.r <= b.x;
  const wasRight  = prevX - ball.r >= b.x + b.w;
  const wasTop    = prevY + ball.r <= b.y;
  const wasBottom = prevY - ball.r >= b.y + b.h;

  const horizEntry = (wasLeft || wasRight) && !(wasTop || wasBottom);
  const vertEntry  = (wasTop || wasBottom) && !(wasLeft || wasRight);

  if (horizEntry) {
    if (wasLeft) { ball.x = b.x - ball.r;       ball.dx = -Math.abs(ball.dx); }
    else         { ball.x = b.x + b.w + ball.r; ball.dx =  Math.abs(ball.dx); }
  } else if (vertEntry) {
    if (wasTop)  { ball.y = b.y - ball.r;       ball.dy = -Math.abs(ball.dy); }
    else         { ball.y = b.y + b.h + ball.r; ball.dy =  Math.abs(ball.dy); }
  } else {
    // 코너 진입 또는 이미 겹쳐있는 경우: 최소 겹침으로 판단
    const overlapLeft   = (ball.x + ball.r) - b.x;
    const overlapRight  = (b.x + b.w) - (ball.x - ball.r);
    const overlapTop    = (ball.y + ball.r) - b.y;
    const overlapBottom = (b.y + b.h) - (ball.y - ball.r);
    const min = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

    if (min === overlapLeft)       { ball.x = b.x - ball.r;       ball.dx = -Math.abs(ball.dx); }
    else if (min === overlapRight) { ball.x = b.x + b.w + ball.r; ball.dx =  Math.abs(ball.dx); }
    else if (min === overlapTop)   { ball.y = b.y - ball.r;       ball.dy = -Math.abs(ball.dy); }
    else                           { ball.y = b.y + b.h + ball.r; ball.dy =  Math.abs(ball.dy); }
  }
}

function collideBricks(ball, prevX, prevY) {
  for (const b of bricks) {
    if (!b.alive) continue;
    if (effects.indestructiblePierce && isMainBall(ball) && b.type === BRICK_TYPE.INDESTRUCTIBLE) {
      // 관통 중 보너스 부여
      if (effects.indestructiblePierceBonus > 0 &&
          ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w &&
          ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
        ball.nextHitBonus = effects.indestructiblePierceBonus;
      }
      continue;
    }
    if (!(ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w &&
          ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h)) continue;
    if (ball.pierce && !effects.firstWallPierceDamage) continue;

    let destroyed = false;
    if (b.type === BRICK_TYPE.INDESTRUCTIBLE) {
      playSfx('brickHit');
      applySplash(b, ball);
    } else {
      const isBoss = b.type === BRICK_TYPE.BOSS;
      let onCooldown = false;
      if (isBoss) {
        if (ball.bossHitPending) onCooldown = true;
        else ball.bossHitPending = true;
      }
      if (onCooldown) {
        playSfx('brickHit');
      } else {
        const bonusMult = 1 + (ball.nextHitBonus ?? 0);
        ball.nextHitBonus = 0;
        const bossPenalty = (isBoss && !isMainBall(ball)) ? 0.5 : 1;
        const primaryDmg = b.type === BRICK_TYPE.ARMOR ? 1 : Math.ceil(stats.ballDamage * (ball.damageMult ?? 1) * bonusMult * bossPenalty);
        destroyed = dealDamageToBlock(b, primaryDmg);
        playSfx(!isBoss && b.trait === 'gold' && destroyed ? 'goldBrick'
                : destroyed ? 'brickDestroy' : 'brickHit');
        applySplash(b, ball);
        // pierceOnDestroy 스플래시
        if (effects.pierceOnDestroySplashRatio > 0 && destroyed && effects.pierceOnDestroy && isMainBall(ball)) {
          const pierceSplashDmg = Math.ceil(stats.ballDamage * effects.pierceOnDestroySplashRatio);
          for (const n of findNeighbors(b)) {
            dealDamageToBlock(n, n.type === BRICK_TYPE.ARMOR ? 1 : pierceSplashDmg);
          }
        }
      }
    }

    if (ball.vanishOnHit) { ball.dead = true; return; }

    if (!ball.pierce && !(effects.pierceOnDestroy && destroyed && isMainBall(ball))) {
      reflectOffBlock(ball, b, prevX, prevY);
    }

    if (ball.bouncesLeft !== undefined && --ball.bouncesLeft <= 0) ball.dead = true;
    incrementBouncyHitCount(ball);
    return;
  }
}

function allBricksCleared() {
  return bricks.every(b => !b.alive || b.type === BRICK_TYPE.INDESTRUCTIBLE);
}

// ─── PHYSICS ──────────────────────────────────────────────────────────────────
function updateBall(ball, dt) {
  const prevX = ball.x;
  const prevY = ball.y;
  ball.x += ball.dx * dt;
  ball.y += ball.dy * dt;

  let wallHit = false;
  if (ball.x - ball.r < 0) { ball.x = ball.r; ball.dx = Math.abs(ball.dx); wallHit = true; }
  if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.dx = -Math.abs(ball.dx); wallHit = true; }
  if (ball.y - ball.r < 0) { ball.y = ball.r; ball.dy = Math.abs(ball.dy); wallHit = true; }
  if (wallHit) {
    playSfx('wall');
    ball.bossHitPending = false;
    if (ball.vanishOnHit) { ball.dead = true; return; }
    if (ball.pierce) ball.pierce = false;
    if (ball.bouncesLeft !== undefined && --ball.bouncesLeft <= 0) ball.dead = true;
    incrementBouncyHitCount(ball);
  }

  // 패드 충돌
  // 1단계: 상단 스윕 검사 (터널링 방지)
  const prevBottom = prevY + ball.r;
  const currBottom = ball.y + ball.r;
  let paddleHit = false;
  if (ball.dy > 0 && prevBottom <= paddle.y && currBottom >= paddle.y) {
    const t = (paddle.y - prevBottom) / ball.dy;
    const hitX = prevX + t * ball.dx;
    if (hitX + ball.r >= paddle.x && hitX - ball.r <= paddle.x + paddle.w) {
      ball.x = hitX;
      ball.y = paddle.y - ball.r;
      ball.dy = -ball.dy;
      paddleHit = true;
    }
  }
  // 2단계: 겹침 보정 (측면 등 상단 스윕으로 잡히지 않은 경우)
  if (!paddleHit && ball.dy > 0) {
    const bLeft = ball.x - ball.r, bRight = ball.x + ball.r;
    const bTop  = ball.y - ball.r, bBottom = ball.y + ball.r;
    if (bRight >= paddle.x && bLeft <= paddle.x + paddle.w &&
        bBottom >= paddle.y && bTop <= paddle.y + paddle.h) {
      ball.y = paddle.y - ball.r;
      ball.dy = -Math.abs(ball.dy);
      paddleHit = true;
    }
  }
  if (paddleHit) {
    let adj = Math.max(-PADDLE_SPIN.MAX_ANGLE, Math.min(PADDLE_SPIN.MAX_ANGLE, paddle.dx * PADDLE_SPIN.FACTOR));
    if (adj !== 0) {
      const cosA = Math.cos(adj), sinA = Math.sin(adj);
      const ndx = ball.dx * cosA - ball.dy * sinA;
      const ndy = ball.dx * sinA + ball.dy * cosA;
      ball.dx = ndx;
      ball.dy = ndy;
      if (ball.dy > 0) ball.dy = -ball.dy;
    }

    // 최대 각도 ±60° (수직 기준) 스냅
    const maxAngle = Math.PI / 3;
    const angleFromVertical = Math.atan2(ball.dx, -ball.dy);
    if (Math.abs(angleFromVertical) > maxAngle) {
      const speed = Math.hypot(ball.dx, ball.dy);
      const sign = Math.sign(angleFromVertical) || 1;
      ball.dx = Math.sin(maxAngle * sign) * speed;
      ball.dy = -Math.cos(maxAngle * sign) * speed;
    }

    ball.bossHitPending = false;
    if (ball.bouncesLeft !== undefined && --ball.bouncesLeft <= 0) ball.dead = true;
    incrementBouncyHitCount(ball);
    playSfx('paddle');
  }

  collideBricks(ball, prevX, prevY);
}

function updateBoss(dt) {
    let boss = null;
    for (const b of bricks) {
      if (b.type !== BRICK_TYPE.BOSS || !b.alive) continue;
      boss = b;
      const now = performance.now();
      if (now - b.lastTurnTime >= BOSS.TURN_INTERVAL_MS) {
        const turnAngle = (Math.random() * BOSS.TURN_ANGLE_DEG * 2 - BOSS.TURN_ANGLE_DEG) * Math.PI / 180;
        const cos = Math.cos(turnAngle), sin = Math.sin(turnAngle);
        const ndx = b.dx * cos - b.dy * sin;
        const ndy = b.dx * sin + b.dy * cos;
        b.dx = ndx; b.dy = ndy;
        b.lastTurnTime = now;
      }
      b.x += b.dx * dt; b.y += b.dy * dt;
      const formH = b.formationH || b.h;
      const bndL = W * 0.1, bndR = W * 0.9;
      const bndT = H * 0.1, bndB = H * 0.7;
      if (b.x < bndL) { b.x = bndL; b.dx = Math.abs(b.dx); }
      if (b.x + b.w > bndR) { b.x = bndR - b.w; b.dx = -Math.abs(b.dx); }
      if (b.y < bndT) { b.y = bndT; b.dy = Math.abs(b.dy); }
      if (b.y + formH > bndB) { b.y = bndB - formH; b.dy = -Math.abs(b.dy); }
    }
    if (boss) {
      for (const b of bricks) {
        if (b.bossAttached) { b.x = boss.x + b.bossOffsetX; b.y = boss.y + b.bossOffsetY; }
      }
    }
  }

  function updatePaddleHistory() {
    const now = performance.now();
    const dtMs = paddle.lastFrameTime > 0 ? now - paddle.lastFrameTime : 0;
    if (dtMs > 0) {
      const v = (paddle.x - paddle.lastFrameX) * (1000 / 60) / dtMs;
      paddle.history.push({ t: now, v });
      while (paddle.history.length > 1 && now - paddle.history[0].t > PADDLE_SPIN.HISTORY_WINDOW_MS) {
        paddle.history.shift();
      }
    }
    paddle.lastFrameX = paddle.x;
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

  function tickRapidFire() {
    if (effects.rapidFireInterval <= 0) return;
    if (!bricks.some(b => b.alive && b.type !== BRICK_TYPE.INDESTRUCTIBLE)) return;
    const now = performance.now();
    if (effectsState.lastRapidFireSpawnTime === 0) {
      effectsState.lastRapidFireSpawnTime = now;
    } else if (now - effectsState.lastRapidFireSpawnTime > effects.rapidFireInterval * 1000) {
      effectsState.lastRapidFireSpawnTime = now;
      spawnRapidFireBall();
    }
  }

  function tickCloneBall() {
    if (effects.cloneBallInterval <= 0) return;
    const now = performance.now();
    if (effectsState.lastCloneBallSpawnTime === 0) {
      effectsState.lastCloneBallSpawnTime = now;
    } else if (now - effectsState.lastCloneBallSpawnTime >= effects.cloneBallInterval * 1000) {
      effectsState.lastCloneBallSpawnTime = now;
      const mainBall = balls.find(isMainBall);
      if (mainBall) balls.push(createBall(mainBall.x, mainBall.y, -mainBall.dx, mainBall.dy));
    }
  }

  function update(dt) {
    updatePaddleHistory();
    tickSniperSpawn();
    tickRapidFire();
    tickCloneBall();

    for (const ball of balls) updateBall(ball, dt);
    if (currentStage === MAX_STAGE) updateBoss(dt);

    if (hasShield) {
      const mainBall = balls.find(isMainBall);
      if (mainBall && balls.filter(isMainBall).length === 1 && mainBall.y - mainBall.r > H) {
        mainBall.y = H - mainBall.r;
        mainBall.dy = -Math.abs(mainBall.dy);
        mainBall.bossHitPending = false;
        hasShield = false;
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

    // 초당 -10점 감산
    if (stageStartTime !== null) {
      const elapsed = (performance.now() - stageStartTime) / 1000;
      const elapsedTenth = Math.floor(elapsed * 10);
      if (elapsedTenth > lastTickSecond) {
        score -= 1 * (elapsedTenth - lastTickSecond);
        lastTickSecond = elapsedTenth;
        updateScoreDisplay();
      }
      updateTimerDisplay();

      // 0점 이하 게임오버
      if (score <= 0) { gameOver(false); return; }

      // 보스 타임아웃 게임오버
      if (currentStage === MAX_STAGE && elapsed >= BOSS.TIME_LIMIT_SEC) {
        gameOver(false); return;
      }
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
    const alphaHex = Math.round(BLOOM.opacity * 255).toString(16).padStart(2, '0');
    // 코어를 먼저 그림 (벽돌 위에 표시)
    for (const ball of balls) {
      ctx.fillStyle = ball.color;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.closePath();
    }
    // 글로우: destination-over로 벽돌 뒤에만 표시
    ctx.globalCompositeOperation = 'destination-over';
    for (const ball of balls) {
      const grad = ctx.createRadialGradient(
        ball.x, ball.y, 0,
        ball.x, ball.y, ball.r + BLOOM.size
      );
      grad.addColorStop(0,                               ball.color + alphaHex);
      grad.addColorStop(ball.r / (ball.r + BLOOM.size), ball.color + alphaHex);
      grad.addColorStop(1,                               ball.color + '00');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r + BLOOM.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.closePath();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawPaddle() {
    ctx.fillStyle = settings.paddleColor;
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
  }

  function drawShield() {
    if (!hasShield) return;
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(0, H - 4, W, 4);
  }

  function brickBaseColor(b) {
    switch (b.type) {
      case BRICK_TYPE.ARMOR:          return settings.armorColor;
      case BRICK_TYPE.INDESTRUCTIBLE: return settings.indestructibleColor;
      case BRICK_TYPE.HARDENED:       return settings.hardenedColor;
      case BRICK_TYPE.BOSS:           return settings.bossColor;
      default:                        return settings.brickColor;
    }
  }

  function drawBricks() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const b of bricks) {
      if (!b.alive) continue;
      const hpRatio = isFinite(b.hp) && b.maxHp > 0 ? b.hp / b.maxHp : 1;
      const displayColor = blendToWhite(brickBaseColor(b), hpRatio);
      ctx.fillStyle = displayColor;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = complementaryColor(displayColor);
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      if (b.trait === 'gold') {
        ctx.strokeStyle = GOLD.TRAIT_BORDER;
        ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
      }
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      const text = b.type === BRICK_TYPE.INDESTRUCTIBLE ? '∞' : String(b.hp);
      ctx.font = b.type === BRICK_TYPE.BOSS ? 'bold 32px sans-serif' : 'bold 16px sans-serif';
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.strokeText(text, cx, cy);
      ctx.fillStyle = '#fff';
      ctx.fillText(text, cx, cy);
    }
  }

  // ─── DISPLAY UPDATES ──────────────────────────────────────────────────────────
  function formatTime(sec) {
    const s = Math.abs(Math.floor(sec));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function updateScoreDisplay() {
    dom.score.textContent = `점수: ${score}`;
  }

  function updateStageDisplay() {
    dom.stage.textContent = `스테이지: ${currentStage}`;
  }

  function updateTimerDisplay() {
    if (currentStage !== MAX_STAGE || stageStartTime === null) {
      hide(dom.timer);
      return;
    }
    const remaining = BOSS.TIME_LIMIT_SEC - (performance.now() - stageStartTime) / 1000;
    dom.timer.textContent = `⏱ ${formatTime(Math.max(0, remaining))}`;
    show(dom.timer);
  }

  function updateStatsDisplay() {
    dom.statDamage.textContent = stats.ballDamage;
    dom.statRadius.textContent = stats.ballRadius;
    dom.statSpeed.textContent = stats.ballSpeed.toFixed(1);
    dom.statGoldMult.textContent = `×${effects.goldMult % 1 === 0 ? effects.goldMult : effects.goldMult.toFixed(1)}`;
    dom.statPaddle.textContent = paddle.w;
    dom.statGoldChance.textContent = stats.goldTileCount;
    dom.statGold.textContent = gold;
  }

  // ─── GAME FLOW ────────────────────────────────────────────────────────────────
  function resetGame() {
    paddle.x = (W - paddle.w) / 2;
    paddle.history = []; paddle.dx = 0;
    paddle.lastFrameX = paddle.x; paddle.lastFrameTime = 0;
    stats.ballSpeed = stageBallSpeed() * effects.ballSpeedMult;
    const speed = stats.ballSpeed;
    const baseAngle = Math.max(0, 15 - effects.launchAngleReduction) * effects.launchAngleMult;
    const angleDeg = (baseAngle + Math.random() * 15) * (Math.random() < 0.5 ? 1 : -1);
    const angle = angleDeg * Math.PI / 180;
    balls = [createBall(
      paddle.x + paddle.w / 2, paddle.y - stats.ballRadius,
      Math.sin(angle) * speed, -Math.cos(angle) * speed
    )];
    effectsState.lastSniperSpawnTime = 0;
    effectsState.lastRapidFireSpawnTime = 0;
    effectsState.lastCloneBallSpawnTime = 0;
    stageStartTime = null;
    lastTickSecond = 0;
    initBricks();
    dom.message.textContent = '';
    hide(dom.timer);
    dom.timer.textContent = '';
    updateScoreDisplay(); updateStageDisplay(); updateStatsDisplay();
    gameState = 'ready';
  }

  function fullReset() {
    currentStage = 1; score = 0; gold = 0; hasShield = false;
    stats.ballDamage = 1; stats.ballRadius = 8; stats.ballSpeed = 3; stats.goldTileCount = 0;
    paddle.w = 100;
    shopState.damageBuys = 0;
    shopState.paddleBuys = 0; shopState.goldchanceBuys = 0;
    stageStartTime = null; lastTickSecond = 0;
    Object.assign(effects, {
      indestructiblePierce: false, indestructiblePierceBonus: 0,
      splashRatio: 0, splashMoore: false,
      bouncyHitsPerSpawn: 0, bouncyBallBounces: 0,
      sniperInterval: 0, sniperDamageMult: 1,
      rapidFireInterval: 0, rapidFireDamageMult: 0.2,
      cloneBallInterval: 0, firstWallPierce: false, firstWallPierceDamage: false,
      launchAngleMult: 1, launchAngleReduction: 0, goldMult: 1, ballSpeedMult: 1,
      pierceOnDestroy: false, pierceOnDestroySplashRatio: 0,
    });
    effectsState.bouncyHitCount = 0; effectsState.lastSniperSpawnTime = 0; effectsState.lastRapidFireSpawnTime = 0; effectsState.lastCloneBallSpawnTime = 0;
    stageStartTime = null; lastTickSecond = 0;
    pickedItemIds.clear();
    for (const k in upgradeLevels) delete upgradeLevels[k];
    updatePickedItemsDisplay();
  }

  function startGame() {
    if (gameState !== 'ready') return;
    gameState = 'playing';
    stageStartTime = performance.now();
    lastTickSecond = 0;
    score += currentStage === MAX_STAGE ? 5000 : 1000;
    running = true;
    lastLoopTs = 0;
    animationId = requestAnimationFrame(loop);
  }

  function loop(ts) {
    if (!running) return;
    const dt = lastLoopTs > 0 ? Math.min((ts - lastLoopTs) / (1000 / 60), 3) : 1;
    lastLoopTs = ts;
    update(dt); draw();
    if (running) animationId = requestAnimationFrame(loop);
  }

  function gameOver(won) {
    running = false;
    cancelAnimationFrame(animationId);
    if (won) {
      if (currentStage === MAX_STAGE) {
        dom.winScore.textContent = score;
        gameState = 'won';
        show(dom.winOverlay);
        playSfx('finalWin');
      } else {
        dom.clearMessage.textContent = `스테이지 ${currentStage} 클리어!`;
        dom.message.textContent = '';
        currentStage++;
        gameState = 'cleared';
        show(dom.confirmOverlay);
        playSfx('win');
      }
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
    dom.rewardOverlay, dom.shopOverlay, dom.preGameOverlay, dom.settingsOverlay].forEach(hide);
    fullReset(); resetGame();
    gameState = 'main';
    show(dom.mainOverlay);
    draw();
  }

  // ─── SHOP ─────────────────────────────────────────────────────────────────────
  function priceFor(kind) {
    if (kind === 'shield') return 20;
    if (kind === 'goldchance') return 5 + 5 * shopState.goldchanceBuys;
    return 5 + 5 * shopState[kind + 'Buys'];
  }

  function updateShopUI() {
    dom.shopGold.textContent = gold;
    dom.priceDamage.textContent = priceFor('damage');
    dom.pricePaddle.textContent = priceFor('paddle');
    dom.priceGoldChance.textContent = priceFor('goldchance');
    dom.priceShield.textContent = hasShield ? '보유중' : priceFor('shield');
    dom.buyDamage.disabled = gold < priceFor('damage');
    dom.buyPaddle.disabled = gold < priceFor('paddle');
    dom.buyGoldChance.disabled = gold < priceFor('goldchance');
    dom.buyShield.disabled = hasShield || gold < priceFor('shield');
    updateItemUpgradesUI();
  }

  function buy(kind) {
    if (kind === 'shield' && hasShield) return;
    const price = priceFor(kind);
    if (gold < price) return;
    gold -= price;
    if (kind === 'shield') {
      hasShield = true;
    } else if (kind === 'goldchance') {
      shopState.goldchanceBuys++;
      stats.goldTileCount += GOLD.TILE_PER_BUY;
    } else {
      shopState[kind + 'Buys']++;
      if (kind === 'damage') stats.ballDamage += 1;
      else if (kind === 'paddle') paddle.w += 20;
    }
    updateStatsDisplay();
    updateShopUI();
  }

  // ─── ITEMS ────────────────────────────────────────────────────────────────────
  // ITEM_POOL은 items.js에서 정의됨

  let currentRewards = [];
  let selectedRewardIdx = null;
  const pickedItemIds = new Set();
  const upgradeLevels = {};

  function rollRandomRewards() {
    const available = ITEM_POOL.filter(i => !pickedItemIds.has(i.id));
    const shuffled = available.slice();
    shuffleInPlace(shuffled);
    const result = shuffled.slice(0, 3);
    while (result.length < 3) result.push({ id: `__empty_${result.length}`, name: '?', desc: '(없음)' });
    return result;
  }

  function setupShopRewards() {
    currentRewards = rollRandomRewards();
    selectedRewardIdx = null;
    dom.confirmRewardBtn.disabled = true;
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
    dom.confirmRewardBtn.disabled = false;
  }

  function commitSelectedReward() {
    if (selectedRewardIdx === null) return;
    const item = currentRewards[selectedRewardIdx];
    if (!item || typeof item.apply !== 'function') return;
    item.apply();
    pickedItemIds.add(item.id);
    selectedRewardIdx = null;
    updateStatsDisplay();
    updatePickedItemsDisplay();
  }

  function updatePickedItemsDisplay() {
    dom.pickedItems.innerHTML = '';
    for (const id of pickedItemIds) {
      const item = ITEM_POOL.find(i => i.id === id);
      if (!item) continue;
      const div = document.createElement('div');
      div.className = 'picked-item-row';
      const level = upgradeLevels[id] ?? 0;
      const upg = ITEM_UPGRADES[id];
      const maxLevel = upg ? upg.levels.length : 0;
      const levelBadge = maxLevel > 0
        ? (level >= maxLevel ? ' <span class="lv-badge lv-max">MAX</span>' : level > 0 ? ` <span class="lv-badge">Lv.${level}</span>` : '')
        : '';
      let desc = item.desc;
      if (level > 0 && upg) {
        const upgLines = upg.levels.slice(0, level).map(l => l.desc);
        // 동일 문구 합산
        const counts = {};
        for (const d of upgLines) counts[d] = (counts[d] || 0) + 1;
        const summary = Object.entries(counts).map(([d, n]) => n > 1 ? `${d} ×${n}` : d).join(', ');
        desc += ` / ${summary}`;
      }
      div.innerHTML = `<span class="picked-item-name">${item.name}${levelBadge}</span><span class="picked-item-desc">${desc}</span>`;
      dom.pickedItems.appendChild(div);
    }
  }

  function updateItemUpgradesUI() {
    const section = document.getElementById('itemUpgradeSection');
    const header  = document.getElementById('itemUpgradeHeader');
    section.innerHTML = '';
    let hasAny = false;
    for (const id of pickedItemIds) {
      const upg = ITEM_UPGRADES[id];
      if (!upg) continue;
      hasAny = true;
      const level = upgradeLevels[id] ?? 0;
      const maxLevel = upg.levels.length;
      const isMax = level >= maxLevel;
      const itemName = ITEM_POOL.find(i => i.id === id)?.name ?? id;
      const div = document.createElement('div');
      div.className = 'shop-item';
      if (isMax) {
        div.innerHTML = `<span>${itemName} <small>Lv.MAX</small></span>`;
        const btn = document.createElement('button');
        btn.className = 'buy-btn';
        btn.disabled = true;
        btn.textContent = 'MAX';
        div.appendChild(btn);
      } else {
        const { cost, desc } = upg.levels[level];
        const nextLabel = level + 2 > maxLevel ? 'MAX' : `Lv.${level + 2}`;
        div.innerHTML = `<span>${itemName} <small>Lv.${level + 1} → ${nextLabel}</small>: ${desc}</span>`;
        const btn = document.createElement('button');
        btn.className = 'buy-btn';
        btn.dataset.upgradeId = id;
        btn.disabled = gold < cost;
        btn.textContent = `${cost} G`;
        div.appendChild(btn);
      }
      section.appendChild(div);
    }
    header.classList.toggle('hidden', !hasAny);
  }

  function buyItemUpgrade(id) {
    const upg = ITEM_UPGRADES[id];
    if (!upg) return;
    const level = upgradeLevels[id] ?? 0;
    if (level >= upg.levels.length) return;
    const { cost, apply } = upg.levels[level];
    if (gold < cost) return;
    gold -= cost;
    apply();
    upgradeLevels[id] = level + 1;
    updateStatsDisplay();
    updateShopUI();
    updatePickedItemsDisplay();
  }

  function openShop() {
    gameState = 'shop';
    hide(dom.confirmOverlay);
    hide(dom.shopOverlay);
    show(dom.rewardOverlay);
    setupShopRewards();
    updateShopUI();
  }

  function confirmRewardAndShowUpgrades() {
    if (selectedRewardIdx === null) return;
    commitSelectedReward();
    hide(dom.rewardOverlay);
    show(dom.shopOverlay);
    updateShopUI();
  }

  function closeShopToNextStage() {
    hide(dom.shopOverlay);
    resetGame();
    gameState = 'preGame';
    show(dom.preGameOverlay);
    draw();
  }

  // ─── AUDIO ────────────────────────────────────────────────────────────────────
  function tryPlayBgm() {
    if (!settings.bgmEnabled || !dom.bgmAudio) return;
    dom.bgmAudio.volume = settings.bgmVolume;
    const p = dom.bgmAudio.play();
    if (p?.catch) p.catch(() => { });
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

  // .wav 파일이 있는 SFX 타입 → dom 오디오 요소로 재생
  // 없는 타입 → Web Audio API 오실레이터 폴백
  const SFX_AUDIO_MAP = {
    paddle:       () => dom.sfxPaddle,
    brickHit:     () => dom.sfxBrickHit,
    brickDestroy: () => dom.sfxBrickDestroy,
    wall:         () => dom.sfxBrickHit,
    win:          () => dom.sfxWin,
    finalWin:     () => dom.sfxFinalWin,
    gameover:     () => dom.sfxGameover,
    click:        () => dom.sfxClick,
  };

  function playSfxAudioEl(el) {
    if (!el) return;
    el.volume = settings.sfxVolume;
    el.currentTime = 0;
    const p = el.play();
    if (p?.catch) p.catch(() => { });
  }

  function playSfx(type) {
    if (!settings.sfxEnabled) return;

    // .wav 기반 SFX
    const getEl = SFX_AUDIO_MAP[type];
    if (getEl) { playSfxAudioEl(getEl()); return; }

    // 오실레이터 폴백 (goldBrick, win, gameover, shield 등)
    const ac = getAudioCtx();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain).connect(ac.destination);
    let dur = 0.05;
    switch (type) {
      case 'goldBrick':
        osc.type = 'sine'; osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15);
        gain.gain.setValueAtTime(0.25, now); dur = 0.15; break;
      case 'shield':
        osc.type = 'square'; osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.18, now); dur = 0.2; break;
      default: return;
    }
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.start(now); osc.stop(now + dur + 0.02);
  }

  // ─── SETTINGS UI ──────────────────────────────────────────────────────────────
  function updateLegendColors() {
    dom.legendArmor.style.background = settings.armorColor;
    dom.legendIndestructible.style.background = settings.indestructibleColor;
    dom.legendHardened.style.background = settings.hardenedColor;
  }

  function applyBackground() {
    dom.canvas.style.background = BACKGROUND_PRESETS[settings.backgroundTheme];
  }

  function syncColorPickers() {
    document.getElementById('cp-ball').value           = settings.ballColor;
    document.getElementById('cp-brick').value          = settings.brickColor;
    document.getElementById('cp-armor').value          = settings.armorColor;
    document.getElementById('cp-indestructible').value = settings.indestructibleColor;
    document.getElementById('cp-hardened').value       = settings.hardenedColor;
    document.getElementById('cp-boss').value           = settings.bossColor;
    document.getElementById('cp-paddle').value         = settings.paddleColor;
    const bg = BACKGROUND_PRESETS[settings.backgroundTheme] ?? '#2b2b2b';
    document.getElementById('cp-bg').value = bg.startsWith('#') ? bg : '#2b2b2b';
  }

  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = COLOR_PRESETS[btn.dataset.preset];
      const bg = btn.dataset.bg;
      if (!p || !BACKGROUND_PRESETS[bg]) return;
      document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      Object.assign(settings, {
        ballColor: p.ball, brickColor: p.brick, armorColor: p.armor,
        indestructibleColor: p.indestructible, hardenedColor: p.hardened, bossColor: p.boss,
        paddleColor: p.paddle,
      });
      settings.backgroundTheme = bg;
      updateLegendColors();
      applyBackground();
      dom.customColorGroup.style.display = btn.dataset.preset === 'custom' ? '' : 'none';
      if (btn.dataset.preset === 'custom') syncColorPickers();
    });
  });

  [
    ['cp-ball',           'ballColor',           'ball'],
    ['cp-brick',          'brickColor',          'brick'],
    ['cp-armor',          'armorColor',          'armor'],
    ['cp-indestructible', 'indestructibleColor', 'indestructible'],
    ['cp-hardened',       'hardenedColor',       'hardened'],
    ['cp-boss',           'bossColor',           'boss'],
    ['cp-paddle',         'paddleColor',         'paddle'],
  ].forEach(([id, settingKey, presetKey]) => {
    document.getElementById(id).addEventListener('input', e => {
      settings[settingKey] = e.target.value;
      COLOR_PRESETS.custom[presetKey] = e.target.value;
      if (['armorColor', 'indestructibleColor', 'hardenedColor'].includes(settingKey)) updateLegendColors();
      draw();
    });
  });
  document.getElementById('cp-bg').addEventListener('input', e => {
    BACKGROUND_PRESETS.custom = e.target.value;
    settings.backgroundTheme = 'custom';
    applyBackground();
  });

  document.querySelectorAll('.bgm-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.bgm-toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      settings.bgmEnabled = btn.dataset.bgm === 'on';
      settings.bgmEnabled ? tryPlayBgm() : pauseBgm();
    });
  });

  document.getElementById('bgmVolume').addEventListener('input', e => {
    settings.bgmVolume = (e.target.value / 100) * 0.6;
    document.getElementById('bgmVolumeLabel').textContent = `${e.target.value}%`;
    if (dom.bgmAudio) dom.bgmAudio.volume = settings.bgmVolume;
  });

  document.getElementById('sfxVolume').addEventListener('input', e => {
    settings.sfxVolume = e.target.value / 100;
    document.getElementById('sfxVolumeLabel').textContent = `${e.target.value}%`;
  });

  document.querySelectorAll('.sfx-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sfx-toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      settings.sfxEnabled = btn.dataset.sfx === 'on';
    });
  });

  // ─── EVENT LISTENERS ──────────────────────────────────────────────────────────
  dom.confirmBtn.addEventListener('click', () => { if (gameState === 'cleared') { playSfx('click'); openShop(); } });
  dom.confirmRewardBtn.addEventListener('click', () => { playSfx('click'); confirmRewardAndShowUpgrades(); });

  document.getElementById('itemUpgradeSection').addEventListener('click', e => {
    const btn = e.target.closest('[data-upgrade-id]');
    if (!btn || btn.disabled) return;
    playSfx('click');
    buyItemUpgrade(btn.dataset.upgradeId);
  });
  dom.nextStageBtn.addEventListener('click', () => { if (gameState === 'shop') { playSfx('click'); closeShopToNextStage(); } });

  dom.buyDamage.addEventListener('click', () => { playSfx('click'); buy('damage'); });
  dom.buyPaddle.addEventListener('click', () => { playSfx('click'); buy('paddle'); });
  dom.buyGoldChance.addEventListener('click', () => { playSfx('click'); buy('goldchance'); });
  dom.buyShield.addEventListener('click', () => { playSfx('click'); buy('shield'); });

  dom.rewardCards.forEach((card, i) => card.addEventListener('click', () => { playSfx('click'); pickReward(i); }));

  dom.restartBtn.addEventListener('click', () => { if (gameState === 'won') { playSfx('click'); returnToStart(); } });
  dom.gameoverRestartBtn.addEventListener('click', () => { if (gameState === 'gameover') { playSfx('click'); returnToStart(); } });
  dom.winMainBtn.addEventListener('click', () => { if (gameState === 'won') { playSfx('click'); returnToMain(); } });
  dom.gameoverMainBtn.addEventListener('click', () => { if (gameState === 'gameover') { playSfx('click'); returnToMain(); } });

  dom.storyCloseBtn.addEventListener('click', () => {
    playSfx('click');
    hide(dom.storyOverlay);
    show(dom.mainOverlay);
  });

  dom.newGameBtn.addEventListener('click', () => {
    if (gameState !== 'main') return;
    playSfx('click');
    fullReset(); resetGame(); draw();
    hide(dom.mainOverlay); show(dom.preGameOverlay);
    gameState = 'preGame';
  });

  dom.openRulesBtn.addEventListener('click', () => {
    if (gameState !== 'main') return;
    playSfx('click');
    hide(dom.mainOverlay); show(dom.rulesOverlay);
  });
  dom.closeRulesBtn.addEventListener('click', () => {
    playSfx('click');
    hide(dom.rulesOverlay); show(dom.mainOverlay);
  });

  dom.openSettingsBtn.addEventListener('click', () => {
    if (gameState !== 'main') return;
    playSfx('click');
    hide(dom.mainOverlay); show(dom.settingsOverlay);
    const isCustom = settings.backgroundTheme === 'custom';
    dom.customColorGroup.style.display = isCustom ? '' : 'none';
    if (isCustom) syncColorPickers();
    gameState = 'settings';
  });

  dom.closeSettingsBtn.addEventListener('click', () => {
    if (gameState !== 'settings') return;
    playSfx('click');
    hide(dom.settingsOverlay); show(dom.mainOverlay);
    gameState = 'main';
  });

  dom.startGameBtn.addEventListener('click', () => {
    if (gameState !== 'preGame') return;
    playSfx('click');
    hide(dom.preGameOverlay);
    gameState = 'ready';
    startGame();
  });

  // 화면 첫 인터랙션 시 BGM 시작 (브라우저 자동재생 정책 우회)
  document.addEventListener('click', tryPlayBgm, { once: true });

  function clientXToPaddleX(clientX) {
    const rect = dom.canvas.getBoundingClientRect();
    const scale = rect.width / W;
    return Math.max(0, Math.min((clientX - rect.left) / scale - paddle.w / 2, W - paddle.w));
  }

  document.addEventListener('mousemove', e => {
    paddle.x = clientXToPaddleX(e.clientX);
  });


  dom.testWinBtn.addEventListener('click', () => {
    if (!running) return;
    for (const b of bricks) {
      if (!b.alive || b.type === BRICK_TYPE.INDESTRUCTIBLE) continue;
      b.alive = false;
      if (b.type !== BRICK_TYPE.BOSS) {
        gold += Math.ceil((b.trait === 'gold' ? GOLD.TRAIT_REWARD : 2) * effects.goldMult);
      }
    }
    updateScoreDisplay(); updateStatsDisplay();
    gameOver(true);
  });

  // ─── CANVAS RESIZE ────────────────────────────────────────────────────────────
  function resizeCanvasWrap() {
    const PAD   = 20 * 2;   // body padding left+right
    const PANEL = 200 * 2;  // legend + shop-panel
    const GAP   = 16 * 2;   // two grid gaps
    const availW       = window.innerWidth  - PAD - PANEL - GAP;
    const heightBasedW = (window.innerHeight - 20 - 20) * 1.6; // 상단 패딩 20 + 하단 여유 20
    dom.canvasWrap.style.width = Math.max(0, Math.min(availW, heightBasedW)) + 'px';
  }
  resizeCanvasWrap();
  window.addEventListener('resize', resizeCanvasWrap);

  // ─── INIT ─────────────────────────────────────────────────────────────────────
  const dpr = window.devicePixelRatio || 1;
  dom.canvas.width = W * dpr;
  dom.canvas.height = H * dpr;
  ctx.scale(dpr, dpr);


  resetGame();
  applyBackground();
  draw();
  gameState = 'main';
