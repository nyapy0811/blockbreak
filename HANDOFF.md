# 벽돌깨기 프로젝트 - 인수인계 문서

> 이 문서는 다른 Claude 세션이 작업을 이어받을 수 있도록 작성되었습니다. 새 세션에서는 이 파일과 `blockbreak.html`, `blockbreak.css`, `blockbreak.js` 를 함께 읽으면 전체 컨텍스트를 파악할 수 있습니다.

## 1. 프로젝트 개요

- **과제**: 대학 웹 프로그래밍 팀 프로젝트 (HTML Canvas + 자바스크립트 벽돌깨기 응용)
- **제출**: 2026-06-08, **발표**: 2026-06-09 ~ 06-15
- **작업 폴더**: `C:\Users\jangh\OneDrive\바탕 화면\웹프로그래밍 벽돌꺠기 게임`
- **언어**: 한국어로 소통
- **평가 비중**: 디자인 20% / 기본 기능 40% / 추가 기능 30% / 발표·보고서 10%
- **주의**: 인터넷 소스를 그대로 복붙하면 0점 → 독창성 필수

## 2. 파일 구조

```
웹프로그래밍 벽돌꺠기 게임/
├── blockbreak.html   # 캔버스(800×500) + canvas-wrap 안에 오버레이 2개(확인/상점), 우측 스탯 패널
├── blockbreak.css    # 레이아웃, 컨트롤, 오버레이(absolute), 상점 모달 스타일
├── blockbreak.js     # 전체 게임 로직 + 상태머신 + 상점 (단일 파일)
├── CLAUDE.md         # 작업 가이드라인 (Think Before / Simplicity / Surgical / Goal-Driven)
└── HANDOFF.md        # 이 문서
```

## 3. 확정된 게임 규칙

### 3.1 게임 구조
- **5스테이지**: 1~4 일반, 5 보스 (보스는 Phase 6에서 구현 예정)
- **일반 블록 HP** = `2^스테이지 - 1` (S1=1, S2=3, S3=7, S4=15)
- **격자**: 4행 × 8열 = 32블록 (블록 60×30, 간격 0, 가운데 정렬)
- **기본 능력치**: 공 데미지 1, 공 반지름 8, 패드 가로 100

### 3.2 특수 블록 (3종, 배타적, 균등 무작위)
- **개수** = `8 × (스테이지 - 1)` (S1=0, S2=8, S3=16, S4=24, 보스=N/A)
- **일반 블록 색상은 통일** (`NORMAL_BRICK_COLOR = '#e63946'`)
- **① 갑옷** (연파랑 `#7fb3ff`): 공 데미지와 무관하게 항상 1만 받음, **HP 5 고정** (스테이지 무관)
- **② 파괴 불가** (진회색 `#3a3a3a`, "∞" 표시): 튕김만, 클리어 조건 제외. **맨 아래 행(인덱스 마지막 행)에서만 생성** — 8개 초과 시 다른 특수로 재할당
- **③ 강화** (보라 `#7c3aed`): HP × 2 (baseHp 기준)
- 3종 색상/설명은 캔버스 아래 `.legend` 패널에 표시됨
- (이전 버전의 "공 복제(금색)" 블록은 제거됨)

### 3.3 멀티볼
- **마지막 공까지 떨어졌을 때만** 게임 오버
- 떨어진 공은 배열에서 제거

### 3.4 패드 반사
- 수직 기준 **±60° 무작위 각도** (입사각 무관, 매번 새로 결정)
- 속도(magnitude)는 보존

### 3.5 골드 / 포인트
- **블록 1개 파괴당 골드 +1** (즉시 누적, 보스/파괴불가 제외)
- **황금 특성 블록 파괴 시 +3** (특성은 § 3.10 참고)
- **점수(score)**: 블록 파괴 시 `+currentStage` (HP·데미지 무관). 보스 파괴 시 +5
- **점수는 스테이지마다 초기화되지 않고 누적** — 게임 오버(전체 리셋) 시에만 0으로 리셋
- 스테이지 종료 메시지: `"스테이지 N 클리어!"`

### 3.6 상점 (Phase 4 완료)
- 영구 적용, 누적 구매 가능, 구매마다 가격 상승 (보호막 제외)
- 항목 순서: 공 데미지 / 공 크기 / 패드 크기 / **황금 확률** / 보호막
- **가격 공식** (확정):
  - 공 데미지 / 공 크기 / 패드 크기 / 황금 확률: `5 + 5 × 구매횟수` (5 → 10 → 15 → 20 → ...)
  - 황금 확률은 상한 도달 시 가격 자리에 "최대" 표기
  - 보호막: **20 고정**, 보유 중이면 비활성
- **업그레이드 증가량**:
  - 공 데미지: +1 / 구매
  - 공 크기 (반지름): +2 / 구매
  - 패드 가로: +20 / 구매
  - 황금 확률: +10% / 구매 (상한 100%, 최대 10회 구매)

### 3.7 보호막 (Phase 5 완료)
- **소모성 1회용**
- **활성 공이 1개일 때만 작동** — 마지막 공이 떨어지기 직전에 한 번 막아줌
- 멀티볼 상태에서는 비활성 (`balls.length === 1` 조건으로 자동 처리)
- 우측 패널에 O / X로 표시
- 동작: 공 `y = H - r`로 위치 보정 + `dy` 부호 반전 (속도 그대로 위로)
- 발동 시 `#message`에 "보호막 발동!" 표시 후 1.5초 뒤 자동 제거

### 3.8 보스 (Phase 6 완료, 스테이지 5)
- **HP 150**, 단일 블록 (BRICK_TYPE.BOSS)
- **공과 같은 매커니즘으로 튕김**: 초기 각도 0~360° 무작위, 속도 4 px/frame
- **활동 영역**: 상단 50% (`y ∈ [0, H/2 - h]`), 4벽(상/좌/우 + 중간 가로선) 반사
- **크기**: 180×90 (BOSS_W, BOSS_H)
- 색상: `#b51b00` (진한 빨강), HP 텍스트 32px
- 특수 블록 공식 미적용 (일반 데미지 적용)
- **점수**: 골드 변환 X. 시간 기반 — 시작 시점부터 200초 안에 깨야 함. 점수 = `(200 - 소요초) × 100`. 200초 초과 시 게임 오버.
- **클리어 시**: 골드/스테이지 변경 없이 Winner 오버레이 표시 → "재시작" 버튼 → 게임 오버처럼 전체 초기화

### 3.9 패배 처리 (전체 리셋)
게임 오버 시 다음 항목 모두 초기화:
- 스테이지 → 1
- **점수(score) → 0**
- 골드 → 0
- 보호막 → 없음
- 공 데미지 → 1
- 공 크기 → 8
- 패드 가로 → 100
- 황금 확률 → 0%
- **상점 구매 횟수 → 0** (모든 항목, 가격이 다시 5G부터 시작)

### 3.10 타일 특성 (Trait)
- **개념**: 블록 type과 직교하는 추가 속성. 블록당 최대 1개 (현재는 황금 1종만 존재)
- **부여 방식**: `initBricks` 마지막 단계에서 블록별 독립적으로 `Math.random() < stats.goldChance` 굴림
- **적용 대상**: 일반 블록 + 갑옷 + 강화 (파괴 불가/보스 제외 — 보상 발동 불가)
- **시각**: 기본 검정 1px 외곽 테두리는 그대로 두고, **안쪽에 금색 1px (`#ffd700`) 추가** (이중 테두리)
- **보상**: 황금 블록 파괴 시 골드 +3 (일반은 +1)
- 상수: `GOLD_CHANCE_INCREMENT = 0.10`, `GOLD_CHANCE_MAX = 1.0`, `GOLD_TRAIT_REWARD = 3`, `GOLD_TRAIT_BORDER = '#ffd700'`

## 4. 구현 진행 상황

| Phase | 내용 | 상태 |
|---|---|---|
| 1 | 인프라 리팩토링 (공 배열, 블록 HP, 점수 표시) | ✅ |
| 2 | 스테이지 진행 시스템 (1~4, 클리어/패배 처리) | ✅ |
| 3 | 4종 특수 블록 + 격자 조정 + 패드 각도 무작위 + 테두리 | ✅ |
| 3.5 | **충돌 버그 수정** — 옆면 충돌 시 통과하던 문제 (4면 겹침 깊이 기반 판정) | ✅ |
| 4 | **상점 UI 및 구매 로직** (가격/구매/오버레이/상태머신) | ✅ |
| 5 | **보호막 실제 동작** (1회용, 멀티볼 시 비활성, dy 반전) | ✅ |
| 6 | **보스 스테이지 (스테이지 5)** — 시간 기반 점수, Winner 오버레이, 재시작 버튼 | ✅ |
| — | 환경 설정 (배경/음악/외형 등 PDF 필수) | ⏸️ 나중에 |
| — | 추가 상점 아이템 | ⏸️ 나중에 |

## 5. 코드 구조 (`blockbreak.js`)

### 5.1 주요 전역 상태
- `balls`: 활성 공 배열 (`{x, y, r, dx, dy, color}`)
- `bricks`: 블록 배열 (`{x, y, w, h, hp, maxHp, alive, color, type, trait, [dx, dy(보스만)]}`)
- `score`: 현재 스테이지 누적 데미지(점수)
- `gold`: 누적 골드 (게임 오버 시 0)
- `hasShield`: 보호막 보유 여부
- `currentStage`: 1~5
- `stats`: `{ballDamage, ballRadius, goldChance}` — 상점 업그레이드 대상
- `paddle`: `{x, y, w, h}` — `w`도 업그레이드 대상
- `running`, `animationId`: 게임 루프 제어
- `gameState`: `'ready' | 'playing' | 'cleared' | 'shop' | 'won'`
- `shopState`: `{damageBuys, radiusBuys, paddleBuys, goldchanceBuys}` — 가격 계산용 누적 카운트
- **`bossStartTime`**: 보스 스테이지 시작 시각 (ms, performance.now()), 다른 스테이지에서는 null

### 5.1.1 보스 상수
- `MAX_STAGE = 5`, `BOSS_W = 180`, `BOSS_H = 90`, `BOSS_HP = 150`, `BOSS_SPEED = 4`, `BOSS_TIME_LIMIT_SEC = 200`

### 5.2 상수
- `MAX_STAGE = 5`
- `BRICK_TYPE`: `{NORMAL, ARMOR, INDESTRUCTIBLE, HARDENED, BOSS}`
- `SPECIAL_COLORS`: 특수 블록 타입별 색상 (보스는 별도, `#b51b00` 직접 지정)
- `rowColors`: 일반 블록 행별 색상 (5색)

### 5.3 상태 전이
```
페이지 로드 → ready
ready --(시작 버튼)--> playing
playing --(공 다 떨어짐 / 보스 200초 초과)--> gameover (Game Over 오버레이 표시)
playing --(스테이지 1~4 모든 블록 깸)--> cleared (확인 오버레이 표시)
playing --(스테이지 5 보스 처치)--> won (Winner 오버레이 표시)
cleared --(확인 버튼)--> shop (상점 오버레이 표시)
shop --(다음 스테이지 버튼)--> ready (새 스테이지 셋업, 게임 시작 X)
won --(재시작 버튼)--> ready (전체 리셋, 스테이지 1로)
gameover --(재시작 버튼)--> ready (전체 리셋, 스테이지 1로)
ready --(시작 버튼)--> playing  (반복)
```

- 시작 버튼은 `ready` 상태에서만 동작 (다른 상태에서 누르면 무시)
- 테스트 "승리 처리" 버튼은 `running` 상태에서만 동작 — 스테이지 5에서 누르면 보스 클리어 → Winner 흐름

### 5.4 주요 함수
- `getBlockHp()` → `2^currentStage - 1` (스테이지 1~4용)
- `initBricks()` — 스테이지 5면 보스 단일 객체만 생성. 그 외 흐름: (1) 32칸 일반 블록 통일 색상으로 생성 → (2) 특수 타입 균등 무작위 굴림 → (3) 파괴 불가 cap (맨 아래 행 8칸, 초과분은 갑옷/강화로 재할당) → (4) 인덱스 풀(맨 아래 / 그 외) 셔플 → (5) 파괴 불가 배치 → (6) 나머지 특수 배치 (맨 아래 미사용 슬롯 포함) → (7) 황금 특성 굴림
- `createBall(x, y, dx, dy)`
- `collideBricks(ball)` — 4면 겹침 깊이 기반 충돌 판정, 타입별 처리(갑옷=dmg 1, 파괴불가=튕김만, 강화/보스=일반 데미지). **블록 파괴 순간 `score += currentStage`** 가산 + 보스가 아니면 `gold += (b.trait==='gold' ? 3 : 1)` + 패널 갱신. 충돌 후 블록 밖으로 위치 보정. `b.w/b.h` 사용. **보스-벽 끼임 방지**: 각 방향 분기에서 보정 좌표가 벽 밖이 될 경우 반대쪽으로 밀어내도록 분기 추가.
- `shuffleInPlace(arr)` — Fisher-Yates 셔플 헬퍼
- `applyBrickType(b, type, baseHp)` — 특수 타입 적용 헬퍼(색상/HP 설정)
- `allBricksCleared()` — 파괴 불가 제외 판정 (보스 alive=false면 true)
- `updateBall(ball)` — 위치/벽/패드/블록 충돌. **벽 충돌 시 위치 클램프** (`ball.x = ball.r` / `W - ball.r` / `ball.y = ball.r`) + `Math.abs`로 방향 명시 설정 → 끼임/오실레이션 방지
- `updateBoss()` — 보스 좌우/상하 이동, 4벽(상/좌/우 + H/2 가로선) 반사
- `drawBricks()` — 블록 채움 → **검정 2px 외곽 테두리** → 황금 트레이트면 **안쪽에 금색 2px 추가** → HP 텍스트 (외곽 stroke 1.5px + 흰색 fill). 텍스트 선명도 보강: `ctx.lineJoin = 'round'`, `ctx.textRendering = 'geometricPrecision'`. 보스는 32px 폰트, 일반은 16px
- `gameOver(won)`:
  - 일반 클리어(스테이지 1~4): `currentStage++` + `gameState='cleared'` + 확인 오버레이 (골드는 collideBricks에서 이미 누적됨)
  - 보스 클리어(스테이지 5): 시간 기반 finalScore 계산 + `gameState='won'` + Winner 오버레이 (골드/스테이지 변경 X)
  - 패배: `fullReset()` + `resetGame()` + 메시지 (순서 중요)
- `fullReset()` — 스탯/골드/보호막/상점 카운트/bossStartTime 전부 초기값으로 (currentStage=1)
- `resetGame()` — 현재 `currentStage` 기준 스테이지 셋업, 공 시작 위치/각도 무작위, `gameState='ready'`
- `startGame()` — `gameState`가 'ready'일 때만 게임 루프 시작. 스테이지 5면 `bossStartTime = performance.now()` 기록
- `priceFor(kind)` — 'damage'/'radius'/'paddle'/'goldchance': `5 + 5*구매횟수`, 'shield': 20
- `buy(kind)` — 골드 차감 + 스탯 증가 + 가격 카운트 증가
- `openShop()`, `closeShopToNextStage()` — 오버레이 표시/숨김
- `updateShopUI()` — 가격 표시 + 골드 부족 시 버튼 비활성
- `updateScoreDisplay()`/`updateStageDisplay()` — 보스 스테이지 + bossStartTime 설정 시 시간 기반 표시로 분기

### 5.5 DOM 참조
- 컨트롤: `#startBtn`, `#testWinBtn`, `#stage`, `#score`, `#message`
- 우측 스탯 패널: `#stat-damage`, `#stat-radius`, `#stat-paddle`, `#stat-shield`, `#stat-gold`
- 확인 오버레이: `#confirmOverlay`, `#confirmBtn`
- 상점 오버레이: `#shopOverlay`, `#shop-gold`, `#price-{damage,radius,paddle,goldchance,shield}`, `#buy-{damage,radius,paddle,goldchance,shield}`, `#nextStageBtn`
- 우측 패널 황금 확률: `#stat-goldchance`
- Winner 오버레이: `#winOverlay`, `#win-score`, `#restartBtn`
- **Game Over 오버레이**: `#gameoverOverlay`, `#gameoverRestartBtn`
- 특수 블록 범례: `.legend` (캔버스 아래)

### 5.6 HTML/CSS 구조
- 캔버스가 `.canvas-wrap` (position: relative, 800×500)에 감싸짐
- 오버레이 두 개는 `position: absolute; inset: 0;` 로 캔버스 위에 겹쳐 표시
- `.hidden` 클래스로 표시/숨김 토글

### 5.7 테스트 모드
- "승리 처리" 버튼 (`#testWinBtn`) — 게임 진행 중 누르면 즉시 스테이지 클리어 처리 → 확인 오버레이 → 상점 흐름 검증용
- 살아있는 비-파괴불가 블록들에 대해: `alive=false` + **`score += currentStage`** + 보스가 아니면 `gold += (trait==='gold' ? 3 : 1)` → `gameOver(true)` 호출
- 점수·골드 누적은 실제 플레이와 동일
- 파괴 불가 블록은 건드리지 않음

## 6. 사용자 선호사항 (CLAUDE.md 기반)

이전 세션들에서 사용자가 일관되게 적용한 작업 방식:

1. **Think Before Coding** — 가정 명시, 모호하면 질문, 대안 제시
2. **Simplicity First** — 최소 코드, 요청하지 않은 기능 금지, 추측 추상화 금지
3. **Surgical Changes** — 요청 범위만 수정, 인접 코드 "개선" 금지, 기존 스타일 유지
4. **Goal-Driven Execution** — 검증 가능한 성공 기준 명시, 단계별 계획 → 검증 루프

새 작업 시작 전에 다음을 확인:
- 모호한 부분이 있으면 진행 전에 질문
- 큰 변경은 단계별 계획을 먼저 제안하고 확인받기
- 검증 포인트(체크리스트)를 명시해서 사용자가 직접 확인 가능하게

## 7. PDF 평가 요구사항 체크리스트

| 항목 | 상태 |
|---|---|
| HTML Canvas + JS 벽돌깨기 | ✅ |
| 게임 시작 버튼 | ✅ |
| 마우스로 패드 조작 | ✅ |
| 스코어 계산 및 표시 | ✅ |
| 재밌는 시나리오 (특수 블록 등) | ✅ (특수 4종 + 상점 + 보스 예정) |
| 3단계 이상 난이도 | ✅ (5단계 + 보스) |
| **상점 시스템 (추가 기능)** | ✅ (Phase 4) |
| 환경 설정 2가지 이상 (배경/음악/외형 등) | ⏸️ **반드시 추가 필요** |
| 발표 자료 + 보고서 | ⏸️ 별도 작업 |
| 기여도 % 명시 | ⏸️ 별도 작업 |

## 8. 다음 작업 시작 시 권장 절차

1. 이 문서를 다 읽기
2. `blockbreak.js` 전체를 한 번 훑어 현재 구조 파악 (특히 상태머신과 상점 함수)
3. 사용자에게 다음 중 어떤 작업을 진행할지 확인:
   - **Phase 5 (보호막 실제 동작)** — 가장 자연스러운 다음 단계
   - Phase 6 (보스 스테이지)
   - 환경 설정 (PDF 필수 사항)
   - 상점 업그레이드 증가량 조정 (현재 가정값: damage +1, radius +2, paddle +20)

### 8.1 Phase 5 시작 전 결정 필요 사항
- 보호막 발동 시각화 (사라지는 애니메이션? 메시지 표시?)
- 보호막이 막아주는 시점: 공이 바닥에 닿기 직전? 닿은 직후 위치에서 다시 위로 발사?
- 발사 각도: 패드 위로 ±60° 무작위? 아니면 단순히 dy 반전?

### 8.2 환경 설정 (PDF 필수) 결정 사항
- 어떤 2가지 옵션을 노출할지: 배경색/배경 이미지/배경 음악/공 색/벽돌 색 등
- 노출 위치: 메인 화면에 별도 영역? 시작 전 모달?

## 9. 미해결 / 추후 결정 사항

- **환경 설정** (PDF 필수, 2가지 이상): 옵션 종류 미정
- **업그레이드 증가량**: 현재 가정값(damage +1, radius +2, paddle +20)이지만 사용자 확정 X
- **상점 가격**: 시작 10 / 증가 +30 / 보호막 50 — 현재 확정, 사용자가 "추후 조정 가능"이라 언급
- **추가 상점 아이템**: 사용자가 "추가될 수도 있어"라고 언급 — 열어둔 상태

## 10. 최근 세션 변경 이력

### 2026-05-11 세션 (이 문서 마지막 업데이트)
- **충돌 버그 수정**: 공이 블록 옆면을 통과하던 문제 해결. `collideBricks`를 4면 겹침 깊이 기반으로 재작성, 충돌 후 블록 밖으로 위치 보정 추가.
- **Phase 4 완료**: 상점 시스템 구현
  - HTML: `.canvas-wrap` 추가, 확인/상점 오버레이 2개 추가, 우측 패널은 그대로 유지
  - CSS: `.overlay` (absolute, inset:0, flex center), `.shop-modal` 등 추가
  - JS: `gameState` 상태머신, `shopState` 누적 구매, `priceFor`/`buy`/`updateShopUI`/`openShop`/`closeShopToNextStage` 함수, 이벤트 리스너 추가
  - 흐름: 클리어 → 확인 버튼 → 상점 → 다음 스테이지(셋업만) → 시작 버튼(게임 시작)
  - 패배 시 `shopState` 카운트도 0으로 리셋 (가격이 다시 10G부터 시작)
- **테스트 "승리 처리" 버튼 점수 정상화**: 기존엔 `alive=false`만 설정해서 클리어 시 골드 0이었음 → 살아있는 비-파괴불가 블록의 남은 HP를 score에 가산하도록 수정. 풀로 깬 경우와 동일한 골드 누적.
- **Phase 5 완료 (보호막 실제 동작)**: `update()` 내 `balls.length === 1 && balls[0].y - balls[0].r > H && hasShield` 조건으로 발동. 공 위치를 `y = H - r`로 보정 + `dy` 부호 반전, `hasShield = false` 처리. `#message`에 "보호막 발동!" 표시 후 setTimeout으로 1.5초 후 자동 제거 (다른 메시지로 덮어쓰여진 경우 보존). 멀티볼 상태(`balls.length > 1`)에서는 조건 미달로 자동 비활성.
- **Phase 6 완료 (보스 스테이지)**:
  - `MAX_STAGE = 4 → 5`로 변경, `BRICK_TYPE.BOSS` 추가
  - 보스 상수: `BOSS_W = 180, BOSS_H = 90, BOSS_HP = 150, BOSS_SPEED = 4, BOSS_TIME_LIMIT_SEC = 200`
  - `initBricks()`에 `currentStage === MAX_STAGE` 분기 추가 → 보스 단일 객체 생성 (격자/특수 블록 X)
  - 일반 블록 객체에도 `w, h` 필드 추가, `drawBricks`/`collideBricks`가 `brick.w/brick.h` 대신 `b.w/b.h` 사용
  - 새 함수 `updateBoss()`: 4벽(상/좌/우 + 중간 가로선 H/2) 반사
  - `update()`에서 보스 스테이지 시 `updateBoss()` 호출 + 200초 타임아웃 체크 + 시간 기반 점수/스테이지 디스플레이 갱신
  - `gameOver(won)`에 보스 클리어 분기 추가: 골드/스테이지 변경 X, 시간 기반 finalScore = `(200 - 소요초) × 100` 계산 후 Winner 오버레이 표시
  - 새 상태 `'won'` 추가, `restartBtn` 클릭 → `fullReset()` + `resetGame()`로 게임 오버처럼 초기화
  - `gameOver(false)` 메시지 순서 수정: `fullReset → resetGame → "게임 오버"` 순서로 변경해서 메시지가 즉시 지워지던 버그 해결
  - 공 시작 위치/각도 변경 (모든 스테이지 적용): 패드 위 중앙, 수직 기준 ±60° 무작위 (위쪽)
  - 새 HTML: `#winOverlay` (Winner 오버레이) + `#restartBtn`
  - 새 CSS: `.win-modal` (큰 Winner! 타이틀, 점수 표시, 재시작 버튼)
  - 보스 스테이지 디스플레이: `#stage`에 "남은 시간: N초" 추가, `#score`에 시간 기반 예상 점수 표시
  - 보스 색: `#b51b00`, HP 텍스트 32px (다른 블록은 16px 유지)
- **Game Over 오버레이 도입 + 갑옷 HP 5 + 범례**:
  - `gameOver(false)`이 더 이상 자동 리셋하지 않음 → `gameState='gameover'` + `#gameoverOverlay` 표시. 재시작 버튼 클릭 시 `returnToStart()` (양 오버레이 hide → `fullReset()` → `resetGame()` → `draw()`)
  - Winner / Game Over 두 재시작 버튼이 공통 `returnToStart()` 호출, 각자 상태 체크
  - 갑옷 블록(ARMOR): `initBricks`에 분기 추가, `b.hp = 5` 고정 (baseHp 무관)
  - HTML: `#gameoverOverlay` + `.legend` (캔버스 아래 4종 색상/설명 표시)
  - CSS: `.gameover-modal` (빨간 "Game Over" 타이틀), `.legend`, `.legend-row`, `.legend-color`

## 11. 다음 단계

핵심 게임플레이는 모두 완성. 남은 작업:

### 11.1 환경 설정 (PDF 평가 필수, 우선순위 ⭐⭐⭐)
PDF 평가에서 "환경 설정 2가지 이상" 필요. 결정 필요:
- 어떤 옵션 노출할지 (예시: 배경색/배경 이미지/배경 음악/공 색/벽돌 색/난이도 보정 등)
- UI 위치: 시작 전 모달? 별도 영역? 우측 패널 확장?

### 11.2 발표 자료 + 보고서
- 별도 작업, 코드 외 산출물
- 기여도 % 명시 필요

### 11.3 (선택) 추가 폴리싱
- 상점 업그레이드 증가량 조정 (현재 가정값: damage +1, radius +2, paddle +20)
- 보스 스테이지 시각 효과 (예: HP가 낮아지면 색 변경, 공격 패턴 등)
- 보호막 발동 시 시각 효과 강화

---

마지막 업데이트: Phase 6 완료 (보스 스테이지) (2026-05-11)
