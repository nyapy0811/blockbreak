// ─── 특수 능력 풀 ────────────────────────────────────────────────────────────
// 항목 형식: { id, name, desc, apply }
//   id    : 고유 식별자 (중복 방지용, 영문)
//   name  : 상점에 표시되는 이름
//   desc  : 상점에 표시되는 설명
//   apply : 특수 능력 선택 시 실행되는 함수 (stats/effects/paddle 직접 수정)
//
// 사용 가능한 변수:
//   stats.ballDamage    — 공 데미지
//   stats.ballRadius    — 공 크기
//   effects.ballSpeedMult     — 공 속도 배수
//   effects.goldMult          — 골드 획득 배수
//   effects.bouncyHitsPerSpawn — N회 충돌마다 소형 공 생성 (0=비활성)
//   effects.sniperInterval    — 저격 공 발사 주기(초) (0=비활성)
//   effects.rapidFireInterval — 연사 공 발사 주기(초) (0=비활성, 데미지 0.2배 고정)
//   effects.splashRatio       — 인접 블록 스플래시 비율 (0=비활성)
//   effects.indestructiblePierce — 파괴불가 블록 관통 여부
//   effects.firstWallPierce   — 첫 벽 충돌 전까지 블록 관통 여부
//   effects.cloneBallInterval — N초마다 메인 공 복제 (0=비활성)
//   paddle.w                  — 패드 너비
// ─────────────────────────────────────────────────────────────────────────────

const ITEM_POOL = [
  {
    id: "bouncy_small",
    name: "행복은 나눌수록 커져요",
    desc: "3회 충돌마다 소형 에너지 1개 생성 (5회 충돌 소멸)",
    apply: () => {
      effects.bouncyHitsPerSpawn = 3;
    },
  },
  {
    id: "bigger_stronger",
    name: "더 큰 행복!",
    desc: "에너지 크기 +50%, 데미지 +100%",
    apply: () => {
      stats.ballRadius *= 1.5;
      stats.ballDamage *= 2;
    },
  },
  {
    id: "indest_pierce",
    name: "피할수 없으면 즐겨라",
    desc: "파괴 불가 스트레스 관통",
    apply: () => {
      effects.indestructiblePierce = true;
    },
  },
  {
    id: "splash",
    name: "행복을 퍼트리자",
    desc: "충돌 시 인접 스트레스에 50% 스플래시 데미지",
    apply: () => {
      effects.splashRatio = 0.5;
    },
  },
  {
    id: "sniper",
    name: "고통의 원인 제거",
    desc: "3초마다 가장 가까운 스트레스에 소형 에너지 발사 (속도 +100%, 1회 충돌 소멸)",
    apply: () => {
      effects.sniperInterval = 3;
    },
  },
  {
    id: "speed_gold",
    name: "일단 달려!",
    desc: "에너지 속도 +50%, 행복 조각 획득 +200%",
    apply: () => {
      effects.ballSpeedMult *= 1.5;
      effects.goldMult += 2;
    },
  },
  {
    id: "pierce_start",
    name: "행복은 멈추지 않아	",
    desc: "첫 벽 충돌 전까지 스트레스 통과",
    apply: () => {
      effects.firstWallPierce = true;
    },
  },
  {
    id: "small_paddle",
    name: "중요한건 꺽이지 않는 마음",
    desc: "의지 크기 -50%, 행복 조각 획득 +150%",
    apply: () => {
      paddle.w *= 0.5;
      effects.goldMult += 1.5;
    },
  },
  {
    id: "rapid_fire",
    name: "행복 흩뿌리기",
    desc: "1초마다 가장 가까운 스트레스에 소형 에너지 발사 (데미지 -80%, 1회 충돌 소멸)",
    apply: () => {
      effects.rapidFireInterval = 1;
    },
  },
  {
    id: "clone_ball",
    name: "점점더 행복해져요",
    desc: "30초마다 행복 에너지를 1개 추가 복제",
    apply: () => {
      effects.cloneBallInterval = 30;
    },
  },
  {
    id: "pierce",
    name: "행복은 멈추지 않아",
    desc: "에너지가 스트레스랑 충돌 시 스트레스가 정화되면 에너지가 튕기지 않음",
    apply: () => {
      effects.pierceOnDestroy = true;
    },
  },
];
