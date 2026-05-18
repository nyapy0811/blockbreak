// ─── 공 능력 아이템 풀 ───────────────────────────────────────────────────────
// 항목 형식: { id, name, desc, apply }
//   id    : 고유 식별자 (중복 방지용, 영문)
//   name  : 상점에 표시되는 이름
//   desc  : 상점에 표시되는 설명
//   apply : 아이템 선택 시 실행되는 함수 (stats/effects/paddle 직접 수정)
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
//   paddle.w                  — 패드 너비
// ─────────────────────────────────────────────────────────────────────────────

const ITEM_POOL = [
  {
    id: 'bouncy_small',
    name: '소형 공',
    desc: '3회 충돌(벽·패드·블록)마다 5회 튕기는 소형 공 1개 생성',
    apply: () => { effects.bouncyHitsPerSpawn = 3; }
  },
  {
    id: 'bigger_stronger',
    name: '강화 공',
    desc: '공 크기 +50%, 데미지 +100%',
    apply: () => { stats.ballRadius *= 1.5; stats.ballDamage *= 2; }
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
    desc: '공 속도 +100%, 골드 +200%',
    apply: () => { effects.ballSpeedMult *= 2; effects.goldMult += 2; }
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
    desc: '패드 크기 -50%, 골드 +150%',
    apply: () => { paddle.w *= 0.5; effects.goldMult += 1.5; }
  },
  {
    id: 'rapid_fire',
    name: '연사',
    desc: '1초마다 메인 공 위치에서 가장 가까운 블록 방향으로 직선 발사 (데미지 0.2배, 충돌 시 소멸)',
    apply: () => { effects.rapidFireInterval = 1; }
  },
];
