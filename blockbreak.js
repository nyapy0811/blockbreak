// 벽돌깨기
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const testWinBtn = document.getElementById('testWinBtn');
const stageEl = document.getElementById('stage');
const scoreEl = document.getElementById('score');
const messageEl = document.getElementById('message');
const statDamageEl = document.getElementById('stat-damage');
const statRadiusEl = document.getElementById('stat-radius');
const statPaddleEl = document.getElementById('stat-paddle');
const statShieldEl = document.getElementById('stat-shield');
const statGoldEl = document.getElementById('stat-gold');

// 오버레이 / 상점 DOM
const confirmOverlay = document.getElementById('confirmOverlay');
const confirmBtn = document.getElementById('confirmBtn');
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
const mainStartBtn = document.getElementById('mainStartBtn');
const winMainBtn = document.getElementById('winMainBtn');
const gameoverMainBtn = document.getElementById('gameoverMainBtn');
const legendArmorEl = document.getElementById('legend-armor');
const legendIndestructibleEl = document.getElementById('legend-indestructible');
const legendHardenedEl = document.getElementById('legend-hardened');
const bgmAudio = document.getElementById('bgmAudio');

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

const shopState = {
  damageBuys: 0,
  radiusBuys: 0,
  paddleBuys: 0,
  goldchanceBuys: 0
};

const stats = {
  ballDamage: 1,
  ballRadius: 8,
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
  y: H - 20
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
  return { x, y, r: stats.ballRadius, dx, dy, color: settings.ballColor };
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
      dy: Math.sin(angle) * BOSS_SPEED
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
  const speed = Math.sqrt(32);
  const angle = (Math.random() * 120 - 60) * Math.PI / 180;
  const dx = Math.sin(angle) * speed;
  const dy = -Math.cos(angle) * speed;
  const r = stats.ballRadius;
  balls = [createBall(paddle.x + paddle.w / 2, paddle.y - r, dx, dy)];
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
  statShieldEl.textContent = hasShield ? 'O' : 'X';
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

function collideBricks(ball) {
  for (const b of bricks) {
    if (!b.alive) continue;
    if (
      ball.x + ball.r > b.x &&
      ball.x - ball.r < b.x + b.w &&
      ball.y + ball.r > b.y &&
      ball.y - ball.r < b.y + b.h
    ) {
      const overlapLeft = (ball.x + ball.r) - b.x;
      const overlapRight = (b.x + b.w) - (ball.x - ball.r);
      const overlapTop = (ball.y + ball.r) - b.y;
      const overlapBottom = (b.y + b.h) - (ball.y - ball.r);
      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

      if (b.type !== BRICK_TYPE.INDESTRUCTIBLE) {
        let dmg = b.type === BRICK_TYPE.ARMOR ? 1 : stats.ballDamage;
        dmg = Math.min(dmg, b.hp);
        b.hp -= dmg;
        if (b.hp <= 0) {
          b.alive = false;
          score += currentStage;
          if (b.type !== BRICK_TYPE.BOSS) {
            gold += b.trait === 'gold' ? GOLD_TRAIT_REWARD : 1;
            updateStatsDisplay();
            playSfx(b.trait === 'gold' ? 'goldBrick' : 'brickDestroy');
          } else {
            playSfx('brickDestroy');
          }
          updateScoreDisplay();
        } else {
          playSfx('brickHit');
        }
      } else {
        playSfx('brickHit');
      }

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

      return;
    }
  }
}

function allBricksCleared() {
  return bricks.every(b => !b.alive || b.type === BRICK_TYPE.INDESTRUCTIBLE);
}

function updateBall(ball) {
  ball.x += ball.dx;
  ball.y += ball.dy;

  if (ball.x - ball.r < 0) { ball.x = ball.r;     ball.dx =  Math.abs(ball.dx); }
  if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.dx = -Math.abs(ball.dx); }
  if (ball.y - ball.r < 0) { ball.y = ball.r;     ball.dy =  Math.abs(ball.dy); }
  if (
    ball.y + ball.r >= paddle.y &&
    ball.y + ball.r <= paddle.y + paddle.h &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.w &&
    ball.dy > 0
  ) {
    const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
    const angle = (Math.random() * 120 - 60) * Math.PI / 180;
    ball.dx = Math.sin(angle) * speed;
    ball.dy = -Math.cos(angle) * speed;
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
  for (const ball of balls) {
    updateBall(ball);
  }
  if (currentStage === MAX_STAGE) {
    updateBoss();
  }
  if (hasShield && balls.length === 1 && balls[0].y - balls[0].r > H) {
    balls[0].y = H - balls[0].r;
    balls[0].dy = -Math.abs(balls[0].dy);
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
  balls = balls.filter(ball => ball.y - ball.r <= H);

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
  stats.goldChance = 0;
  paddle.w = 100;
  shopState.damageBuys = 0;
  shopState.radiusBuys = 0;
  shopState.paddleBuys = 0;
  shopState.goldchanceBuys = 0;
  bossStartTime = null;
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
      messageEl.textContent = `스테이지 ${currentStage} 클리어!`;
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

function openShop() {
  gameState = 'shop';
  confirmOverlay.classList.add('hidden');
  shopOverlay.classList.remove('hidden');
  updateShopUI();
}

function closeShopToNextStage() {
  shopOverlay.classList.add('hidden');
  resetGame();
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

function returnToStart() {
  winOverlay.classList.add('hidden');
  gameoverOverlay.classList.add('hidden');
  fullReset();
  resetGame();
  draw();
}

function returnToMain() {
  winOverlay.classList.add('hidden');
  gameoverOverlay.classList.add('hidden');
  confirmOverlay.classList.add('hidden');
  shopOverlay.classList.add('hidden');
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

mainStartBtn.addEventListener('click', () => {
  if (gameState !== 'main') return;
  mainOverlay.classList.add('hidden');
  fullReset();
  resetGame();
  draw();
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

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  paddle.x = mouseX - paddle.w / 2;
  if (paddle.x < 0) paddle.x = 0;
  if (paddle.x + paddle.w > W) paddle.x = W - paddle.w;
});

startBtn.addEventListener('click', startGame);

testWinBtn.addEventListener('click', () => {
  if (!running) return;
  for (const b of bricks) {
    if (!b.alive) continue;
    if (b.type === BRICK_TYPE.INDESTRUCTIBLE) continue;
    b.alive = false;
    score += currentStage;
    if (b.type !== BRICK_TYPE.BOSS) {
      gold += b.trait === 'gold' ? GOLD_TRAIT_REWARD : 1;
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
