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

// 캔버스 크기
const W = canvas.width;
const H = canvas.height;

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
const GOLD_CHANCE_INCREMENT = 0.05;
const GOLD_CHANCE_MAX = 0.5;
const GOLD_TRAIT_REWARD = 3;
const GOLD_TRAIT_BORDER = '#ffd700';

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

const rowColors = ['#e63946', '#f4a261', '#2a9d8f', '#264653', '#e76f51'];

const BRICK_TYPE = {
  NORMAL: 'normal',
  ARMOR: 'armor',
  INDESTRUCTIBLE: 'indestructible',
  HARDENED: 'hardened',
  BOSS: 'boss'
};

const SPECIAL_COLORS = {
  [BRICK_TYPE.ARMOR]: '#7fb3ff',
  [BRICK_TYPE.INDESTRUCTIBLE]: '#3a3a3a',
  [BRICK_TYPE.HARDENED]: '#7c3aed'
};

function createBall(x, y, dx, dy) {
  return { x, y, r: stats.ballRadius, dx, dy, color: '#222' };
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
      color: '#b51b00',
      type: BRICK_TYPE.BOSS,
      dx: Math.cos(angle) * BOSS_SPEED,
      dy: Math.sin(angle) * BOSS_SPEED
    });
    return;
  }

  const baseHp = getBlockHp();

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
        color: rowColors[r % rowColors.length],
        type: BRICK_TYPE.NORMAL
      });
    }
  }

  const specialCount = 8 * (currentStage - 1);
  const specialTypes = [
    BRICK_TYPE.ARMOR,
    BRICK_TYPE.INDESTRUCTIBLE,
    BRICK_TYPE.HARDENED
  ];

  const indices = bricks.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  for (let i = 0; i < specialCount && i < indices.length; i++) {
    const type = specialTypes[Math.floor(Math.random() * specialTypes.length)];
    const b = bricks[indices[i]];
    b.type = type;
    b.color = SPECIAL_COLORS[type];
    if (type === BRICK_TYPE.ARMOR) {
      // 갑옷: HP 5 고정 (1 데미지씩만 들어가므로 5번 맞으면 깨짐)
      b.hp = 5;
      b.maxHp = 5;
    } else if (type === BRICK_TYPE.HARDENED) {
      b.hp = baseHp * 2;
      b.maxHp = baseHp * 2;
    } else if (type === BRICK_TYPE.INDESTRUCTIBLE) {
      b.hp = Infinity;
      b.maxHp = Infinity;
    }
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
  score = 0;
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

function drawBricks() {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const b of bricks) {
    if (!b.alive) continue;
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = b.trait === 'gold' ? GOLD_TRAIT_BORDER : '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const text = b.type === BRICK_TYPE.INDESTRUCTIBLE ? '∞' : String(b.hp);
    ctx.font = b.type === BRICK_TYPE.BOSS ? 'bold 32px sans-serif' : 'bold 16px sans-serif';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 3;
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
        score += dmg;
        if (b.hp <= 0) {
          b.alive = false;
          if (b.type !== BRICK_TYPE.BOSS) {
            gold += b.trait === 'gold' ? GOLD_TRAIT_REWARD : 1;
            updateStatsDisplay();
          }
        }
        updateScoreDisplay();
      }

      if (minOverlap === overlapLeft) {
        ball.x = b.x - ball.r;
        ball.dx = -Math.abs(ball.dx);
      } else if (minOverlap === overlapRight) {
        ball.x = b.x + b.w + ball.r;
        ball.dx = Math.abs(ball.dx);
      } else if (minOverlap === overlapTop) {
        ball.y = b.y - ball.r;
        ball.dy = -Math.abs(ball.dy);
      } else {
        ball.y = b.y + b.h + ball.r;
        ball.dy = Math.abs(ball.dy);
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

  if (ball.x - ball.r < 0 || ball.x + ball.r > W) {
    ball.dx = -ball.dx;
  }
  if (ball.y - ball.r < 0) {
    ball.dy = -ball.dy;
  }
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
  } else {
    // 패배: 게임 오버 오버레이 표시. 실제 리셋은 재시작 버튼 클릭 시 수행
    gameState = 'gameover';
    gameoverOverlay.classList.remove('hidden');
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
  if (kind === 'shield') return 50;
  return 10 + 30 * shopState[kind + 'Buys'];
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

restartBtn.addEventListener('click', () => {
  if (gameState !== 'won') return;
  returnToStart();
});

gameoverRestartBtn.addEventListener('click', () => {
  if (gameState !== 'gameover') return;
  returnToStart();
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
    score += b.hp;
    b.alive = false;
    if (b.type !== BRICK_TYPE.BOSS) {
      gold += b.trait === 'gold' ? GOLD_TRAIT_REWARD : 1;
    }
  }
  updateScoreDisplay();
  updateStatsDisplay();
  gameOver(true);
});

resetGame();
draw();
