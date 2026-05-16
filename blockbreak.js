// 벽돌깨기
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const testWinBtn = document.getElementById('testWinBtn');
const stageEl = document.getElementById('stage');
const scoreEl = document.getElementById('score');
const messageEl = document.getElementById('message');
const statDamageEl = document.getElementById('stat-damage');
const statRadiusEl = document.getElementById('stat-radius');
const statPaddleEl = document.getElementById('stat-paddle');
const statGoldEl = document.getElementById('stat-gold');

// 오버레이 / 상점 DOM
const confirmOverlay = document.getElementById('confirmOverlay');
const confirmBtn = document.getElementById('confirmBtn');
const clearMessageEl = document.getElementById('clear-message');
const shopOverlay = document.getElementById('shopOverlay');
const shopGoldEl = document.getElementById('shop-gold');
const priceDamageEl = document.getElementById('price-damage');
const priceRadiusEl = document.getElementById('price-radius');
const pricePaddleEl = document.getElementById('price-paddle');
const priceShieldEl = document.getElementById('price-shield');
const buyDamageBtn = document.getElementById('buy-damage');
const buyRadiusBtn = document.getElementById('buy-radius');
const buyPaddleBtn = document.getElementById('buy-paddle');
const buyGoldChanceBtn = document.getElementById('buy-goldchance');
const buyShieldBtn = document.getElementById('buy-shield');
const priceGoldChanceEl = document.getElementById('price-goldchance');
const statGoldChanceEl = document.getElementById('stat-goldchance');
const nextStageBtn = document.getElementById('nextStageBtn');
const winOverlay = document.getElementById('winOverlay');
const winScoreEl = document.getElementById('win-score');
const restartBtn = document.getElementById('restartBtn');
const gameoverOverlay = document.getElementById('gameoverOverlay');
const gameoverRestartBtn = document.getElementById('gameoverRestartBtn');
const mainOverlay = document.getElementById('mainOverlay');
const newGameBtn = document.getElementById('newGameBtn');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const preGameOverlay = document.getElementById('preGameOverlay');
const startGameBtn = document.getElementById('startGameBtn');
const settingsOverlay = document.getElementById('settingsOverlay');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const winMainBtn = document.getElementById('winMainBtn');
const gameoverMainBtn = document.getElementById('gameoverMainBtn');
const legendArmorEl = document.getElementById('legend-armor');
const legendIndestructibleEl = document.getElementById('legend-indestructible');
const legendHardenedEl = document.getElementById('legend-hardened');
const bgmAudio = document.getElementById('bgmAudio');
const rewardCards = Array.from(document.querySelectorAll('.reward-card'));

// 논리 캔버스 크기 (좌표계 기준)
const W = 800;
const H = 500;
// HiDPI 백버퍼 보정
const dpr = window.devicePixelRatio || 1;
canvas.width = W * dpr;
canvas.height = H * dpr;
canvas.style.width = W + 'px';
canvas.style.height = H + 'px';
ctx.scale(dpr, dpr);

// 게임 상태
let balls = [];
let bricks = [];
let score = 0;
let gold = 0;
let hasShield = false;
let running = false;
let animationId = null;
// 'ready' | 'playing' | 'cleared' | 'shop' | 'won' | 'gameover'
let gameState = 'ready';

// 보스 스테이지 타이머
let bossStartTime = null;
const BOSS_SPEED = 4;
const BOSS_TIME_LIMIT_SEC = 200;
const BOSS_W = 180;
const BOSS_H = 90;
const BOSS_HP = 150;
const BOSS_HIT_COOLDOWN_MS = 100;

// 패드 반사 보정: 충돌 전 100ms 평균 패드 속도(px/frame 환산)에 비례한 회전
const PADDLE_SPIN_FACTOR = 0.05;          // rad / (px/frame)
const PADDLE_SPIN_MAX_ANGLE = Math.PI / 4; // 보정 상한 ±45°
const PADDLE_HISTORY_WINDOW_MS = 100;     // 평균 속도 산출 구간

// 공 속도: 스테이지 기반 (1스테이지 3, 매 스테이지 +1) — resetGame()에서 stats.ballSpeed에 계산값 대입
function stageBallSpeed() {
  return 2 + currentStage;
}

// 아이템 효과 (수동/패시브 패시브 플래그/멀티플라이어)
const effects = {
  indestructiblePierce: false,  // 파괴불가 블록 관통
  splashRatio: 0,               // 인접 블록 50% 스플래시 (값 0.5 등)
  bouncyHitsPerSpawn: 0,        // N회 블록 충돌마다 작은 튀는 공 1개 (0이면 비활성)
  sniperInterval: 0,            // 초 단위 저격 공 발사 주기 (0이면 비활성)
  firstWallPierce: false,       // 처음 벽 충돌 전까지 블록 관통
  goldMult: 1,                  // 골드 획득 배수
  ballSpeedMult: 1              // 공 속도 배수 (쾌속 아이템 적용)
};
const effectsState = {
  bouncyHitCount: 0,
  lastSniperSpawnTime: 0
};


const shopState = {
  damageBuys: 0,
  radiusBuys: 0,
  paddleBuys: 0,
  goldchanceBuys: 0
};

const stats = {
  ballDamage: 1,
  ballRadius: 8,
  ballSpeed: 3,   // 스테이지 1 기본값. resetGame()에서 매 스테이지마다 재계산
  goldChance: 0
};

// 황금 특성 관련
const GOLD_CHANCE_INCREMENT = 0.10;
const GOLD_CHANCE_MAX = 1.0;
const GOLD_TRAIT_REWARD = 3;
const GOLD_TRAIT_BORDER = '#ffd700';

// 색상 프리셋 (메인 화면 환경 설정) — 모든 블록 종류에 적용
const COLOR_PRESETS = {
  default: {
    ball: '#222222', brick: '#e63946',
    armor: '#7fb3ff', indestructible: '#3a3a3a', hardened: '#7c3aed', boss: '#b51b00'
  },
  pastel: {
    ball: '#6b9bd1', brick: '#ffb3ba',
    armor: '#b8d8ff', indestructible: '#9a9a9a', hardened: '#d4b3e8', boss: '#ff8b94'
  },
  neon: {
    ball: '#00ffff', brick: '#ff00ff',
    armor: '#00bfff', indestructible: '#1a1a1a', hardened: '#b300ff', boss: '#ff0066'
  }
};
// 배경 프리셋 (CSS background 값, placeholder — 이미지 자산 들어오면 url(...)로 교체)
const BACKGROUND_PRESETS = {
  default: '#ffffff',
  space:   'linear-gradient(180deg, #0a0a2e 0%, #1a1a3e 100%)',
  forest:  'linear-gradient(180deg, #2d5016 0%, #4a7c2a 100%)'
};

const settings = {
  ballColor:           COLOR_PRESETS.default.ball,
  brickColor:          COLOR_PRESETS.default.brick,
  armorColor:          COLOR_PRESETS.default.armor,
  indestructibleColor: COLOR_PRESETS.default.indestructible,
  hardenedColor:       COLOR_PRESETS.default.hardened,
  bossColor:           COLOR_PRESETS.default.boss,
  backgroundTheme:     'default',
  bgmEnabled:          true,
  sfxEnabled:          true
};

let currentStage = 1;
const MAX_STAGE = 5;
function getBlockHp() {
  return (2 ** currentStage) - 1;
}

const paddle = {
  w: 100,
  h: 12,
  x: (W - 100) / 2,
  y: H - 20,
  history: [],          // {t, v} 속도 샘플 (최근 PADDLE_HISTORY_WINDOW_MS 구간)
  dx: 0,                // history 평균 속도 (px/frame@60 환산)
  lastFrameX: (W - 100) / 2,
  lastFrameTime: 0
};

const brick = {
  rows: 4,
  cols: 8,
  w: 60,
  h: 30,
  padding: 0,
  offsetTop: 50,
  offsetLeft: 160
};

const BRICK_TYPE = {
  NORMAL: 'normal',
  ARMOR: 'armor',
  INDESTRUCTIBLE: 'indestructible',
  HARDENED: 'hardened',
  BOSS: 'boss'
};

function createBall(x, y, dx, dy) {
  const ball = { x, y, r: stats.ballRadius, dx, dy, color: settings.ballColor };
  if (effects.firstWallPierce) ball.pierce = true;
  return ball;
}

// 작은 튀는 공: 5회 바운스 후 소멸
function spawnBouncyBall(x, y) {
  const speed = stats.ballSpeed;
  const angle = Math.random() * 2 * Math.PI;
  const ball = {
    x, y,
    r: stats.ballRadius * 0.6,
    dx: Math.cos(angle) * speed,
    dy: Math.sin(angle) * speed,
    color: settings.ballColor,
    bouncesLeft: 5
  };
  balls.push(ball);
}

// 추적 공: 가장 가까운 블록을 향해 이동, 첫 충돌 시 소멸
// 메인 공에서 가장 가까운 블록 방향으로 직선 발사하는 1회용 소형 공 (저격)
// 속도는 메인 공의 2배
function spawnSniperBall() {
  const mainBall = balls.find(isMainBall);
  if (!mainBall) return;
  const target = findNearestBrick(mainBall);
  if (!target) return;
  const tx = target.x + target.w / 2;
  const ty = target.y + target.h / 2;
  const ddx = tx - mainBall.x;
  const ddy = ty - mainBall.y;
  const dist = Math.sqrt(ddx * ddx + ddy * ddy);
  if (dist <= 0) return;
  const speed = stats.ballSpeed * 2;
  const ball = {
    x: mainBall.x,
    y: mainBall.y,
    r: stats.ballRadius * 0.6,
    dx: ddx / dist * speed,
    dy: ddy / dist * speed,
    color: settings.ballColor,
    vanishOnHit: true
  };
  balls.push(ball);
}

function findNearestBrick(ball) {
  let best = null, bestD = Infinity;
  for (const b of bricks) {
    if (!b.alive) continue;
    if (b.type === BRICK_TYPE.INDESTRUCTIBLE && !effects.indestructiblePierce) continue;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const dx = cx - ball.x;
    const dy = cy - ball.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = b; }
  }
  return best;
}

// 보조 공(추적/튀는 소형)이 아닌 "메인 공" 여부 — 특수 능력은 메인 공에만 적용
function isMainBall(ball) {
  return ball.bouncesLeft === undefined && !ball.vanishOnHit;
}

// 튀는 소형 공 스폰 카운터 증가 (메인 공의 충돌만 카운트)
function incrementBouncyHitCount(ball) {
  if (!isMainBall(ball)) return;
  if (effects.bouncyHitsPerSpawn <= 0) return;
  effectsState.bouncyHitCount++;
  if (effectsState.bouncyHitCount % effects.bouncyHitsPerSpawn === 0) {
    spawnBouncyBall(ball.x, ball.y);
  }
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

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function applyBrickType(b, type, baseHp) {
  b.type = type;
  if (type === BRICK_TYPE.ARMOR) {
    b.color = settings.armorColor;
    b.hp = 5;
    b.maxHp = 5;
  } else if (type === BRICK_TYPE.HARDENED) {
    b.color = settings.hardenedColor;
    b.hp = baseHp * 2;
    b.maxHp = baseHp * 2;
  } else if (type === BRICK_TYPE.INDESTRUCTIBLE) {
    b.color = settings.indestructibleColor;
    b.hp = Infinity;
    b.maxHp = Infinity;
  }
}

function initBricks() {
  bricks = [];

  if (currentStage === MAX_STAGE) {
    const angle = Math.random() * 2 * Math.PI;
    bricks.push({
      x: (W - BOSS_W) / 2,
      y: 50,
      w: BOSS_W,
      h: BOSS_H,
      hp: BOSS_HP,
      maxHp: BOSS_HP,
      alive: true,
      color: settings.bossColor,
      type: BRICK_TYPE.BOSS,
      dx: Math.cos(angle) * BOSS_SPEED,
      dy: Math.sin(angle) * BOSS_SPEED,
      lastHitTime: 0
    });
    return;
  }

  const baseHp = getBlockHp();

  // 1) 모든 슬롯을 일반(통일 색)으로 생성
  for (let r = 0; r < brick.rows; r++) {
    for (let c = 0; c < brick.cols; c++) {
      bricks.push({
        x: brick.offsetLeft + c * (brick.w + brick.padding),
        y: brick.offsetTop + r * (brick.h + brick.padding),
        w: brick.w,
        h: brick.h,
        hp: baseHp,
        maxHp: baseHp,
        alive: true,
        color: settings.brickColor,
        type: BRICK_TYPE.NORMAL
      });
    }
  }

  // 2) 특수 타입 결정 (균등 무작위, 3종)
  const specialCount = 8 * (currentStage - 1);
  const allTypes = [BRICK_TYPE.ARMOR, BRICK_TYPE.INDESTRUCTIBLE, BRICK_TYPE.HARDENED];
  const typeRolls = [];
  for (let i = 0; i < specialCount; i++) {
    typeRolls.push(allTypes[Math.floor(Math.random() * 3)]);
  }

  // 3) 파괴 불가는 맨 아래 행(brick.cols개)만 가능 — 넘치면 다른 특수로 재할당
  const bottomCapacity = brick.cols;
  let indestructibleCount = typeRolls.filter(t => t === BRICK_TYPE.INDESTRUCTIBLE).length;
  const otherTypes = typeRolls.filter(t => t !== BRICK_TYPE.INDESTRUCTIBLE);
  if (indestructibleCount > bottomCapacity) {
    const overflow = indestructibleCount - bottomCapacity;
    indestructibleCount = bottomCapacity;
    const altTypes = [BRICK_TYPE.ARMOR, BRICK_TYPE.HARDENED];
    for (let i = 0; i < overflow; i++) {
      otherTypes.push(altTypes[Math.floor(Math.random() * 2)]);
    }
  }

  // 4) 인덱스 풀: 맨 아래 행 / 그 외
  const bottomIndices = [];
  const otherIndices = [];
  for (let r = 0; r < brick.rows; r++) {
    for (let c = 0; c < brick.cols; c++) {
      const idx = r * brick.cols + c;
      if (r === brick.rows - 1) bottomIndices.push(idx);
      else otherIndices.push(idx);
    }
  }
  shuffleInPlace(bottomIndices);
  shuffleInPlace(otherIndices);

  // 5) 파괴 불가 배치
  for (let i = 0; i < indestructibleCount; i++) {
    applyBrickType(bricks[bottomIndices[i]], BRICK_TYPE.INDESTRUCTIBLE, baseHp);
  }

  // 6) 나머지 특수 배치 (맨 아래 미사용 슬롯 포함)
  const remaining = otherIndices.slice();
  for (let i = indestructibleCount; i < bottomIndices.length; i++) {
    remaining.push(bottomIndices[i]);
  }
  shuffleInPlace(remaining);
  for (let i = 0; i < otherTypes.length && i < remaining.length; i++) {
    applyBrickType(bricks[remaining[i]], otherTypes[i], baseHp);
  }

  // 황금 특성 부여 (파괴 불가 / 보스 제외, 블록별 독립 확률)
  for (const b of bricks) {
    b.trait = null;
    if (b.type === BRICK_TYPE.INDESTRUCTIBLE) continue;
    if (b.type === BRICK_TYPE.BOSS) continue;
    if (Math.random() < stats.goldChance) {
      b.trait = 'gold';
    }
  }
}

function resetGame() {
  paddle.x = (W - paddle.w) / 2;
  paddle.history = [];
  paddle.dx = 0;
  paddle.lastFrameX = paddle.x;
  paddle.lastFrameTime = 0;
  // 스테이지 기반 공 속도 재계산 (쾌속 아이템 배수 반영)
  stats.ballSpeed = stageBallSpeed() * effects.ballSpeedMult;
  const speed = stats.ballSpeed;
  const angle = (Math.random() * 60 - 30) * Math.PI / 180;
  const dx = Math.sin(angle) * speed;
  const dy = -Math.cos(angle) * speed;
  const r = stats.ballRadius;
  balls = [createBall(paddle.x + paddle.w / 2, paddle.y - r, dx, dy)];
  effectsState.lastSniperSpawnTime = 0; // 새 스테이지 타이머 리셋
  bossStartTime = null;
  initBricks();
  messageEl.textContent = '';
  updateScoreDisplay();
  updateStageDisplay();
  updateStatsDisplay();
  gameState = 'ready';
}

function updateScoreDisplay() {
  if (currentStage === MAX_STAGE && bossStartTime !== null) {
    const elapsed = (performance.now() - bossStartTime) / 1000;
    const projected = Math.max(0, Math.floor((BOSS_TIME_LIMIT_SEC - elapsed) * 100));
    scoreEl.textContent = `점수: ${projected}`;
  } else {
    scoreEl.textContent = `점수: ${score}`;
  }
}

function updateStageDisplay() {
  if (currentStage === MAX_STAGE && bossStartTime !== null) {
    const elapsed = (performance.now() - bossStartTime) / 1000;
    const remaining = Math.max(0, Math.ceil(BOSS_TIME_LIMIT_SEC - elapsed));
    stageEl.textContent = `스테이지: ${currentStage} (남은 시간: ${remaining}초)`;
  } else {
    stageEl.textContent = `스테이지: ${currentStage}`;
  }
}

function updateStatsDisplay() {
  statDamageEl.textContent = stats.ballDamage;
  statRadiusEl.textContent = stats.ballRadius;
  statPaddleEl.textContent = paddle.w;
  statGoldChanceEl.textContent = Math.round(stats.goldChance * 100) + '%';
  statGoldEl.textContent = gold;
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

function drawBorder(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, 2);           // top
  ctx.fillRect(x, y + h - 2, w, 2);   // bottom
  ctx.fillRect(x, y, 2, h);           // left
  ctx.fillRect(x + w - 2, y, 2, h);   // right
}

function drawBricks() {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const b of bricks) {
    if (!b.alive) continue;
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    // 기본 외곽 테두리 (검정 2px)
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    // 황금 특성: 검정 2px 안쪽에 2px 추가
    if (b.trait === 'gold') {
      ctx.strokeStyle = GOLD_TRAIT_BORDER;
      ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
    }
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const text = b.type === BRICK_TYPE.INDESTRUCTIBLE ? '∞' : String(b.hp);
    ctx.font = b.type === BRICK_TYPE.BOSS ? 'bold 32px sans-serif' : 'bold 16px sans-serif';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.textRendering = 'geometricPrecision';
    ctx.strokeText(text, cx, cy);
    ctx.fillStyle = '#fff';
    ctx.fillText(text, cx, cy);
  }
}

// 블록에 데미지를 적용 (파괴 시 점수·골드 처리). 파괴되면 true 반환.
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
      const baseGold = b.trait === 'gold' ? GOLD_TRAIT_REWARD : 1;
      gold += Math.floor(baseGold * effects.goldMult);
      updateStatsDisplay();
    }
    updateScoreDisplay();
    return true;
  }
  return false;
}

function collideBricks(ball) {
  for (const b of bricks) {
    if (!b.alive) continue;
    // 아이템: 파괴불가 블록 관통 (메인 공만)
    if (effects.indestructiblePierce && isMainBall(ball) && b.type === BRICK_TYPE.INDESTRUCTIBLE) continue;
    if (!(ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w &&
          ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h)) continue;

    // 돌격 관통: 데미지·튕김·소리 없이 통과
    if (ball.pierce) continue;

    // 데미지 처리
    if (b.type === BRICK_TYPE.INDESTRUCTIBLE) {
      playSfx('brickHit');
      // 파괴불가 블록에 튕겨도 스플래시 데미지는 인접 블록에 적용 (메인 공만)
      if (isMainBall(ball) && effects.splashRatio > 0) {
        const splashDmg = Math.floor(stats.ballDamage * effects.splashRatio);
        for (const n of findNeighbors(b)) {
          // 갑옷 블록은 스플래시 1 데미지 보장
          const d = n.type === BRICK_TYPE.ARMOR ? 1 : splashDmg;
          if (d > 0) dealDamageToBlock(n, d);
        }
      }
    } else {
      const isBoss = b.type === BRICK_TYPE.BOSS;
      let onCooldown = false;
      if (isBoss) {
        const now = performance.now();
        if (now - b.lastHitTime < BOSS_HIT_COOLDOWN_MS) onCooldown = true;
        else b.lastHitTime = now;
      }
      if (onCooldown) {
        playSfx('brickHit');
      } else {
        const primaryDmg = b.type === BRICK_TYPE.ARMOR ? 1 : stats.ballDamage;
        const destroyed = dealDamageToBlock(b, primaryDmg);
        if (destroyed) {
          playSfx(!isBoss && b.trait === 'gold' ? 'goldBrick' : 'brickDestroy');
        } else {
          playSfx('brickHit');
        }
        // 아이템: 스플래시 (메인 공만, 갑옷은 1 데미지 보장)
        if (isMainBall(ball) && effects.splashRatio > 0) {
          const splashDmg = Math.floor(primaryDmg * effects.splashRatio);
          for (const n of findNeighbors(b)) {
            const d = n.type === BRICK_TYPE.ARMOR ? 1 : splashDmg;
            if (d > 0) dealDamageToBlock(n, d);
          }
        }
      }
    }

    // 추적 공: 첫 충돌로 소멸
    if (ball.vanishOnHit) {
      ball.dead = true;
      return;
    }

    // 위치 보정 + 튕김 (4면 + 보스 벽 회피 분기)
    const overlapLeft = (ball.x + ball.r) - b.x;
    const overlapRight = (b.x + b.w) - (ball.x - ball.r);
    const overlapTop = (ball.y + ball.r) - b.y;
    const overlapBottom = (b.y + b.h) - (ball.y - ball.r);
    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
    if (minOverlap === overlapLeft) {
      const tx = b.x - ball.r;
      if (tx < ball.r) { ball.x = b.x + b.w + ball.r; ball.dx =  Math.abs(ball.dx); }
      else             { ball.x = tx;                  ball.dx = -Math.abs(ball.dx); }
    } else if (minOverlap === overlapRight) {
      const tx = b.x + b.w + ball.r;
      if (tx > W - ball.r) { ball.x = b.x - ball.r; ball.dx = -Math.abs(ball.dx); }
      else                 { ball.x = tx;            ball.dx =  Math.abs(ball.dx); }
    } else if (minOverlap === overlapTop) {
      const ty = b.y - ball.r;
      if (ty < ball.r) { ball.y = b.y + b.h + ball.r; ball.dy =  Math.abs(ball.dy); }
      else             { ball.y = ty;                   ball.dy = -Math.abs(ball.dy); }
    } else {
      const ty = b.y + b.h + ball.r;
      if (ty > H - ball.r) { ball.y = b.y - ball.r; ball.dy = -Math.abs(ball.dy); }
      else                 { ball.y = ty;            ball.dy =  Math.abs(ball.dy); }
    }

    // 작은 공 바운스 카운트
    if (ball.bouncesLeft !== undefined) {
      ball.bouncesLeft--;
      if (ball.bouncesLeft <= 0) ball.dead = true;
    }
    // 튀는 소형 공 스폰 카운터 (블록 충돌도 카운트, 메인 공만)
    incrementBouncyHitCount(ball);

    return;
  }
}

function allBricksCleared() {
  return bricks.every(b => !b.alive || b.type === BRICK_TYPE.INDESTRUCTIBLE);
}

function updateBall(ball) {
  ball.x += ball.dx;
  ball.y += ball.dy;

  let wallHit = false;
  if (ball.x - ball.r < 0) { ball.x = ball.r;     ball.dx =  Math.abs(ball.dx); wallHit = true; }
  if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.dx = -Math.abs(ball.dx); wallHit = true; }
  if (ball.y - ball.r < 0) { ball.y = ball.r;     ball.dy =  Math.abs(ball.dy); wallHit = true; }
  if (wallHit) {
    if (ball.pierce) ball.pierce = false;
    if (ball.bouncesLeft !== undefined) {
      ball.bouncesLeft--;
      if (ball.bouncesLeft <= 0) ball.dead = true;
    }
    incrementBouncyHitCount(ball);
  }
  if (
    ball.y + ball.r >= paddle.y &&
    ball.y + ball.r <= paddle.y + paddle.h &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.w &&
    ball.dy > 0
  ) {
    // 기본: 입사각 = 반사각 (수평 반사)
    ball.dy = -ball.dy;
    // 보정: 패드 속도에 비례한 회전, 상한 ±PADDLE_SPIN_MAX_ANGLE
    let adj = paddle.dx * PADDLE_SPIN_FACTOR;
    if (adj > PADDLE_SPIN_MAX_ANGLE) adj = PADDLE_SPIN_MAX_ANGLE;
    else if (adj < -PADDLE_SPIN_MAX_ANGLE) adj = -PADDLE_SPIN_MAX_ANGLE;
    if (adj !== 0) {
      const cosA = Math.cos(adj);
      const sinA = Math.sin(adj);
      const ndx = ball.dx * cosA - ball.dy * sinA;
      const ndy = ball.dx * sinA + ball.dy * cosA;
      ball.dx = ndx;
      ball.dy = ndy;
      // 안전: 회전 후에도 공이 위로 향하게 유지
      if (ball.dy > 0) ball.dy = -ball.dy;
    }
    // 최대 각도 ±60° (수직 기준) — 너무 수평이면 ±60°로 스냅
    {
      const maxAngle = Math.PI / 3;
      const angleFromVertical = Math.atan2(ball.dx, -ball.dy);
      if (Math.abs(angleFromVertical) > maxAngle) {
        const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
        const sign = Math.sign(angleFromVertical) || 1;
        ball.dx = Math.sin(maxAngle * sign) * speed;
        ball.dy = -Math.cos(maxAngle * sign) * speed;
      }
    }
    if (ball.bouncesLeft !== undefined) {
      ball.bouncesLeft--;
      if (ball.bouncesLeft <= 0) ball.dead = true;
    }
    incrementBouncyHitCount(ball);
    playSfx('paddle');
  }

  collideBricks(ball);
}

function updateBoss() {
  for (const b of bricks) {
    if (b.type !== BRICK_TYPE.BOSS || !b.alive) continue;
    b.x += b.dx;
    b.y += b.dy;
    if (b.x < 0) { b.x = 0; b.dx = Math.abs(b.dx); }
    if (b.x + b.w > W) { b.x = W - b.w; b.dx = -Math.abs(b.dx); }
    if (b.y < 0) { b.y = 0; b.dy = Math.abs(b.dy); }
    if (b.y + b.h > H / 2) { b.y = H / 2 - b.h; b.dy = -Math.abs(b.dy); }
  }
}

function update() {
  // 매 프레임의 순간 속도(px/frame@60 등가)를 기록 → 100ms 윈도우 평균
  const now = performance.now();
  const dtMs = paddle.lastFrameTime > 0 ? now - paddle.lastFrameTime : 0;
  if (dtMs > 0) {
    const v = (paddle.x - paddle.lastFrameX) * (1000 / 60) / dtMs;
    paddle.history.push({ t: now, v });
    while (paddle.history.length > 1 && now - paddle.history[0].t > PADDLE_HISTORY_WINDOW_MS) {
      paddle.history.shift();
    }
  }
  paddle.lastFrameX = paddle.x;
  paddle.lastFrameTime = now;
  let sum = 0;
  for (const s of paddle.history) sum += s.v;
  paddle.dx = paddle.history.length > 0 ? sum / paddle.history.length : 0;

  // 아이템: 추적 공 주기 스폰
  if (effects.sniperInterval > 0 && bricks.some(b => b.alive && b.type !== BRICK_TYPE.INDESTRUCTIBLE)) {
    const now = performance.now();
    if (effectsState.lastSniperSpawnTime === 0) {
      effectsState.lastSniperSpawnTime = now;
    } else if (now - effectsState.lastSniperSpawnTime > effects.sniperInterval * 1000) {
      effectsState.lastSniperSpawnTime = now;
      spawnSniperBall();
    }
  }

  for (const ball of balls) {
    updateBall(ball);
  }
  if (currentStage === MAX_STAGE) {
    updateBoss();
  }
  // 보호막: 메인 공만 튕겨냄 (보조 공이 있어도 활성). 보조 공은 떨어지면 그냥 제거.
  if (hasShield) {
    const mainBall = balls.find(isMainBall);
    if (mainBall && mainBall.y - mainBall.r > H) {
      mainBall.y = H - mainBall.r;
      mainBall.dy = -Math.abs(mainBall.dy);
      hasShield = false;
      messageEl.textContent = '보호막 발동!';
      playSfx('shield');
      updateStatsDisplay();
      setTimeout(() => {
        if (messageEl.textContent === '보호막 발동!') {
          messageEl.textContent = '';
        }
      }, 1500);
    }
  }
  // 떨어진 공 + 아이템 효과로 소멸된 공 제거
  balls = balls.filter(ball => !ball.dead && ball.y - ball.r <= H);

  if (balls.length === 0) {
    gameOver(false);
    return;
  }
  if (currentStage === MAX_STAGE && bossStartTime !== null) {
    const elapsed = (performance.now() - bossStartTime) / 1000;
    if (elapsed >= BOSS_TIME_LIMIT_SEC) {
      gameOver(false);
      return;
    }
    updateStageDisplay();
    updateScoreDisplay();
  }
  if (allBricksCleared()) {
    gameOver(true);
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawBricks();
  drawBalls();
  drawPaddle();
  drawShield();
}

function loop() {
  if (!running) return;
  update();
  draw();
  if (running) {
    animationId = requestAnimationFrame(loop);
  }
}

function fullReset() {
  currentStage = 1;
  score = 0;
  gold = 0;
  hasShield = false;
  stats.ballDamage = 1;
  stats.ballRadius = 8;
  stats.ballSpeed = 3;
  stats.goldChance = 0;
  paddle.w = 100;
  shopState.damageBuys = 0;
  shopState.radiusBuys = 0;
  shopState.paddleBuys = 0;
  shopState.goldchanceBuys = 0;
  bossStartTime = null;
  // 아이템 효과 초기화
  effects.indestructiblePierce = false;
  effects.splashRatio = 0;
  effects.bouncyHitsPerSpawn = 0;
  effects.sniperInterval = 0;
  effects.firstWallPierce = false;
  effects.goldMult = 1;
  effects.ballSpeedMult = 1;
  effectsState.bouncyHitCount = 0;
  effectsState.lastSniperSpawnTime = 0;
  pickedItemIds.clear();
}

function gameOver(won) {
  running = false;
  cancelAnimationFrame(animationId);
  if (won) {
    if (currentStage === MAX_STAGE) {
      const elapsed = (performance.now() - bossStartTime) / 1000;
      const finalScore = Math.max(0, Math.floor((BOSS_TIME_LIMIT_SEC - elapsed) * 100));
      winScoreEl.textContent = finalScore;
      gameState = 'won';
      winOverlay.classList.remove('hidden');
    } else {
      clearMessageEl.textContent = `스테이지 ${currentStage} 클리어!`;
      messageEl.textContent = '';
      currentStage++;
      gameState = 'cleared';
      confirmOverlay.classList.remove('hidden');
    }
    playSfx('win');
  } else {
    // 패배: 게임 오버 오버레이 표시. 실제 리셋은 재시작 버튼 클릭 시 수행
    gameState = 'gameover';
    gameoverOverlay.classList.remove('hidden');
    playSfx('gameover');
  }
  updateStageDisplay();
  updateStatsDisplay();
}

function startGame() {
  if (gameState !== 'ready') return;
  gameState = 'playing';
  if (currentStage === MAX_STAGE) {
    bossStartTime = performance.now();
  }
  running = true;
  animationId = requestAnimationFrame(loop);
}

function priceFor(kind) {
  if (kind === 'shield') return 20;
  return 5 + 5 * shopState[kind + 'Buys'];
}

function updateShopUI() {
  const goldChanceMaxed = stats.goldChance >= GOLD_CHANCE_MAX;
  shopGoldEl.textContent = gold;
  priceDamageEl.textContent = priceFor('damage');
  priceRadiusEl.textContent = priceFor('radius');
  pricePaddleEl.textContent = priceFor('paddle');
  priceGoldChanceEl.textContent = goldChanceMaxed ? '최대' : priceFor('goldchance');
  priceShieldEl.textContent = hasShield ? '보유중' : priceFor('shield');
  buyDamageBtn.disabled = gold < priceFor('damage');
  buyRadiusBtn.disabled = gold < priceFor('radius');
  buyPaddleBtn.disabled = gold < priceFor('paddle');
  buyGoldChanceBtn.disabled = goldChanceMaxed || gold < priceFor('goldchance');
  buyShieldBtn.disabled = hasShield || gold < priceFor('shield');
}

function buy(kind) {
  const price = priceFor(kind);
  if (gold < price) return;
  if (kind === 'shield') {
    if (hasShield) return;
    gold -= price;
    hasShield = true;
  } else if (kind === 'goldchance') {
    if (stats.goldChance >= GOLD_CHANCE_MAX) return;
    gold -= price;
    shopState.goldchanceBuys++;
    stats.goldChance = Math.min(GOLD_CHANCE_MAX, stats.goldChance + GOLD_CHANCE_INCREMENT);
  } else {
    gold -= price;
    shopState[kind + 'Buys']++;
    if (kind === 'damage') stats.ballDamage += 1;
    else if (kind === 'radius') stats.ballRadius += 2;
    else if (kind === 'paddle') paddle.w += 20;
  }
  updateStatsDisplay();
  updateShopUI();
}

// 무작위 아이템 풀
// 항목 형식: { id: string, name: string, desc: string, apply: () => void }
const ITEM_POOL = [
  {
    id: 'bouncy_small',
    name: '튀는 소형 공',
    desc: '3회 충돌(벽·패드·블록)마다 5회 튕기는 소형 공 1개 생성',
    apply: () => { effects.bouncyHitsPerSpawn = 3; }
  },
  {
    id: 'bigger_stronger',
    name: '강화 공',
    desc: '공 크기 +30%, 데미지 +100%',
    apply: () => {
      stats.ballRadius *= 1.3;
      stats.ballDamage *= 2;
    }
  },
  {
    id: 'indest_pierce',
    name: '파괴자',
    desc: '파괴 불가 블록 관통',
    apply: () => { effects.indestructiblePierce = true; }
  },
  {
    id: 'splash',
    name: '폭발',
    desc: '주변 블록 50% 스플래시 데미지',
    apply: () => { effects.splashRatio = 0.5; }
  },
  {
    id: 'sniper',
    name: '저격',
    desc: '5초마다 메인 공 위치에서 가장 가까운 블록 방향으로 직선 발사, 메인 공 2배 속도 (충돌 시 소멸)',
    apply: () => { effects.sniperInterval = 5; }
  },
  {
    id: 'speed_gold',
    name: '쾌속',
    desc: '공 속도 +100%, 골드 +50%',
    apply: () => {
      effects.ballSpeedMult *= 2;
      effects.goldMult += 0.5;
    }
  },
  {
    id: 'pierce_start',
    name: '돌격',
    desc: '벽에 처음 부딪히기 전까지 블록 통과 (데미지 없음)',
    apply: () => { effects.firstWallPierce = true; }
  },
  {
    id: 'small_paddle',
    name: '도전',
    desc: '패드 크기 -50%, 골드 +100%',
    apply: () => {
      paddle.w *= 0.5;
      effects.goldMult += 1;
    }
  }
];

let currentRewards = [];
let selectedRewardIdx = null;
const pickedItemIds = new Set();

function rollRandomRewards() {
  // 이미 고른 아이템은 풀에서 제외
  const available = ITEM_POOL.filter(i => !pickedItemIds.has(i.id));
  const shuffled = available.slice();
  shuffleInPlace(shuffled);
  const result = shuffled.slice(0, 3);
  // 사용 가능한 아이템이 3개 미만이면 나머지는 빈 슬롯 placeholder
  while (result.length < 3) {
    result.push({ id: `__empty_${result.length}`, name: '?', desc: '(없음)' });
  }
  return result;
}

function setupShopRewards() {
  currentRewards = rollRandomRewards();
  selectedRewardIdx = null;
  for (let i = 0; i < 3; i++) {
    const card = rewardCards[i];
    const item = currentRewards[i];
    card.querySelector('.reward-name').textContent = item.name;
    card.querySelector('.reward-desc').textContent = item.desc;
    card.classList.remove('picked');
    // 빈 슬롯(placeholder)만 클릭 불가
    card.disabled = (typeof item.apply !== 'function');
  }
}

// 카드 클릭은 선택만 표시 (다른 카드 다시 클릭하면 선택 변경 가능)
// 실제 효과는 "다음 스테이지" 클릭 시 closeShopToNextStage()에서 확정 적용
function pickReward(idx) {
  if (idx < 0 || idx >= currentRewards.length) return;
  const item = currentRewards[idx];
  if (typeof item.apply !== 'function') return; // placeholder
  selectedRewardIdx = idx;
  for (let i = 0; i < 3; i++) {
    rewardCards[i].classList.toggle('picked', i === idx);
  }
}

// 다음 스테이지 진입 시점에 선택된 아이템 효과 적용
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
  confirmOverlay.classList.add('hidden');
  shopOverlay.classList.remove('hidden');
  setupShopRewards();
  updateShopUI();
}

function closeShopToNextStage() {
  // 상점에서 선택해둔 아이템 효과를 이 시점에 확정 적용
  commitSelectedReward();
  shopOverlay.classList.add('hidden');
  resetGame();
  // 새 스테이지도 메인 게임 시작과 동일하게 가운데 "시작" 버튼으로 진입
  gameState = 'preGame';
  preGameOverlay.classList.remove('hidden');
  draw();
}

confirmBtn.addEventListener('click', () => {
  if (gameState !== 'cleared') return;
  openShop();
});

nextStageBtn.addEventListener('click', () => {
  if (gameState !== 'shop') return;
  closeShopToNextStage();
});

buyDamageBtn.addEventListener('click', () => buy('damage'));
buyRadiusBtn.addEventListener('click', () => buy('radius'));
buyPaddleBtn.addEventListener('click', () => buy('paddle'));
buyGoldChanceBtn.addEventListener('click', () => buy('goldchance'));
buyShieldBtn.addEventListener('click', () => buy('shield'));

rewardCards.forEach((card, i) => {
  card.addEventListener('click', () => pickReward(i));
});

function returnToStart() {
  winOverlay.classList.add('hidden');
  gameoverOverlay.classList.add('hidden');
  fullReset();
  resetGame();
  // 재시작도 새 게임처럼 가운데 "시작" 버튼으로 진입
  gameState = 'preGame';
  preGameOverlay.classList.remove('hidden');
  draw();
}

function returnToMain() {
  winOverlay.classList.add('hidden');
  gameoverOverlay.classList.add('hidden');
  confirmOverlay.classList.add('hidden');
  shopOverlay.classList.add('hidden');
  preGameOverlay.classList.add('hidden');
  settingsOverlay.classList.add('hidden');
  fullReset();
  resetGame();
  gameState = 'main';
  mainOverlay.classList.remove('hidden');
  draw();
}

restartBtn.addEventListener('click', () => {
  if (gameState !== 'won') return;
  returnToStart();
});

gameoverRestartBtn.addEventListener('click', () => {
  if (gameState !== 'gameover') return;
  returnToStart();
});

// 메인: 새 게임 → 캔버스 가운데 시작 버튼만 표시 (preGame)
newGameBtn.addEventListener('click', () => {
  if (gameState !== 'main') return;
  fullReset();
  resetGame();
  draw();
  mainOverlay.classList.add('hidden');
  preGameOverlay.classList.remove('hidden');
  gameState = 'preGame';
});

// 메인: 설정 → 설정 오버레이
openSettingsBtn.addEventListener('click', () => {
  if (gameState !== 'main') return;
  mainOverlay.classList.add('hidden');
  settingsOverlay.classList.remove('hidden');
  gameState = 'settings';
});

// 설정: 닫기 → 메인 복귀
closeSettingsBtn.addEventListener('click', () => {
  if (gameState !== 'settings') return;
  settingsOverlay.classList.add('hidden');
  mainOverlay.classList.remove('hidden');
  gameState = 'main';
});

// preGame: 시작 → 실제 게임 시작
startGameBtn.addEventListener('click', () => {
  if (gameState !== 'preGame') return;
  preGameOverlay.classList.add('hidden');
  gameState = 'ready';
  tryPlayBgm();   // 첫 사용자 인터랙션이라 BGM 재생 시도 가능
  startGame();
});

function updateLegendColors() {
  legendArmorEl.style.background = settings.armorColor;
  legendIndestructibleEl.style.background = settings.indestructibleColor;
  legendHardenedEl.style.background = settings.hardenedColor;
}

function applyBackground() {
  canvas.style.background = BACKGROUND_PRESETS[settings.backgroundTheme];
}

// ============ 사운드 ============
function tryPlayBgm() {
  if (!settings.bgmEnabled || !bgmAudio) return;
  const p = bgmAudio.play();
  if (p && typeof p.catch === 'function') p.catch(() => {}); // autoplay/404 등 무시
}
function pauseBgm() {
  if (bgmAudio) bgmAudio.pause();
}

let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (Ctor) audioCtx = new Ctor();
  }
  return audioCtx;
}

// 효과음: Web Audio로 합성. type별로 파형/주파수/지속시간을 다르게.
function playSfx(type) {
  if (!settings.sfxEnabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain).connect(ctx.destination);
  let dur = 0.05;
  switch (type) {
    case 'paddle':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.18, now);
      dur = 0.05;
      break;
    case 'brickHit':
      osc.type = 'square';
      osc.frequency.setValueAtTime(220, now);
      gain.gain.setValueAtTime(0.12, now);
      dur = 0.04;
      break;
    case 'brickDestroy':
      osc.type = 'square';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(160, now + 0.1);
      gain.gain.setValueAtTime(0.22, now);
      dur = 0.1;
      break;
    case 'goldBrick':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15);
      gain.gain.setValueAtTime(0.25, now);
      dur = 0.15;
      break;
    case 'win':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523, now);            // C5
      osc.frequency.setValueAtTime(659, now + 0.1);      // E5
      osc.frequency.setValueAtTime(784, now + 0.2);      // G5
      gain.gain.setValueAtTime(0.22, now);
      dur = 0.4;
      break;
    case 'gameover':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.5);
      gain.gain.setValueAtTime(0.25, now);
      dur = 0.5;
      break;
    case 'shield':
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.18, now);
      dur = 0.2;
      break;
    default:
      return;
  }
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

// 색상 프리셋 선택 — 공/일반/특수/보스 색상 모두 갱신
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const preset = btn.dataset.preset;
    const p = COLOR_PRESETS[preset];
    if (!p) return;
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    settings.ballColor           = p.ball;
    settings.brickColor          = p.brick;
    settings.armorColor          = p.armor;
    settings.indestructibleColor = p.indestructible;
    settings.hardenedColor       = p.hardened;
    settings.bossColor           = p.boss;
    updateLegendColors();
  });
});

// 배경 프리셋 선택
document.querySelectorAll('.bg-preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const theme = btn.dataset.bg;
    if (!BACKGROUND_PRESETS[theme]) return;
    document.querySelectorAll('.bg-preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    settings.backgroundTheme = theme;
    applyBackground();
  });
});

// BGM 토글
document.querySelectorAll('.bgm-toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const v = btn.dataset.bgm; // 'on' | 'off'
    document.querySelectorAll('.bgm-toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    settings.bgmEnabled = (v === 'on');
    if (settings.bgmEnabled) tryPlayBgm();
    else pauseBgm();
  });
});

// 효과음 토글
document.querySelectorAll('.sfx-toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const v = btn.dataset.sfx;
    document.querySelectorAll('.sfx-toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    settings.sfxEnabled = (v === 'on');
  });
});

winMainBtn.addEventListener('click', () => {
  if (gameState !== 'won') return;
  returnToMain();
});

gameoverMainBtn.addEventListener('click', () => {
  if (gameState !== 'gameover') return;
  returnToMain();
});

// 마우스가 캔버스 밖이어도 패드가 따라가도록 document 전체에서 수신
document.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  paddle.x = mouseX - paddle.w / 2;
  if (paddle.x < 0) paddle.x = 0;
  if (paddle.x + paddle.w > W) paddle.x = W - paddle.w;
});

testWinBtn.addEventListener('click', () => {
  if (!running) return;
  for (const b of bricks) {
    if (!b.alive) continue;
    if (b.type === BRICK_TYPE.INDESTRUCTIBLE) continue;
    b.alive = false;
    score += currentStage;
    if (b.type !== BRICK_TYPE.BOSS) {
      gold += Math.floor((b.trait === 'gold' ? GOLD_TRAIT_REWARD : 1) * effects.goldMult);
    }
  }
  updateScoreDisplay();
  updateStatsDisplay();
  gameOver(true);
});

resetGame();
applyBackground();
draw();
gameState = 'main'; // 페이지 로드 시 메인 화면부터 (HTML의 mainOverlay 기본 표시)
