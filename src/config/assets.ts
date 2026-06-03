/**
 * 素材配置清单
 * 所有素材通过此文件引用，代码中不硬编码路径。
 * 替换素材时:
 *   1. 直接替换 public/assets/ 下的同名文件 (推荐)
 *   2. 或修改此文件的路径映射
 */
export const ASSETS = {
  backgrounds: {
    home:     "/assets/backgrounds/bg-home.webp?v=3",
    market:   "/assets/backgrounds/bg-market.webp?v=2",
    backpack: "/assets/backgrounds/bg-backpack.webp?v=2",
    battle:   "/assets/backgrounds/bg-battle.webp?v=2",
    room:     "/assets/backgrounds/bg-room.webp?v=3",
    matchmake:    "/assets/backgrounds/bg-matchmake.webp",
    handbook:     "/assets/backgrounds/bg-handbook.webp",
    defense:      "/assets/backgrounds/bg-defense.webp",
    roomCreate:   "/assets/backgrounds/bg-room-create.webp",
    ladder:   "/assets/backgrounds/bg-ladder.webp",
    top100:   "/assets/backgrounds/bg-top100.webp",
    top100Title: "/assets/backgrounds/bg-top100-title.webp",
  },

  ui: {
    arena: {
      circle:    "/assets/ui/arena/arena-circle.png?v=2",
      ring:      "/assets/ui/arena/arena-ring.png",
      dou:       "/assets/ui/arena/arena-dou.png",
      benchDisc: "/assets/ui/arena/bench-disc.png",
      topGold:   "/assets/ui/arena/arena-top-gold.png",
    },
    bars: {
      hpBg:        "/assets/ui/bars/hp-bar-bg.png",
      hpFill:      "/assets/ui/bars/hp-bar-fill.png",
      hpFillLow:   "/assets/ui/bars/hp-bar-fill-low.png",
      staminaBg:   "/assets/ui/bars/stamina-bar-bg.png",
      staminaFill: "/assets/ui/bars/stamina-bar-fill.png",
    },
    buttons: {
      primary:  "/assets/ui/buttons/btn-primary-bg.png",
      actionBg: "/assets/ui/buttons/btn-action-bg.png",
      heavy:    "/assets/ui/buttons/btn-action-heavy.png",
      feint:    "/assets/ui/buttons/btn-action-feint.png",
      block:    "/assets/ui/buttons/btn-action-block.png",
      chirp:    "/assets/ui/buttons/btn-action-chirp.png",
      gacha:    "/assets/ui/buttons/btn-gacha-bg.png",
    },
    frames: {
      golden:       "/assets/ui/frames/frame-golden.png",
      cardBackpack: "/assets/ui/frames/card-bg-backpack.png",
      cardRoom:     "/assets/ui/frames/card-bg-room.png",
      roomCode:     "/assets/ui/frames/room-code-bg.png",
      displayPlate: "/assets/ui/frames/display-plate.png",
    },
    badges: {
      common:    "/assets/ui/badges/badge-common.png",
      rare:      "/assets/ui/badges/badge-rare.png",
      epic:      "/assets/ui/badges/badge-epic.png",
      legendary: "/assets/ui/badges/badge-legendary.png",
    },
    numbers: {
      1: "/assets/ui/numbers/num-1.png",
      2: "/assets/ui/numbers/num-2.png",
      3: "/assets/ui/numbers/num-3.png",
    },
    icons: {
      backpack:      "",  // 文案类图标，使用"囊"字
      avatarDefault: "/assets/ui/icons/icon-avatar-default.png",
      versus:        "/assets/ui/icons/icon-versus.png",
      release:       "/assets/ui/icons/icon-release.png",
      backArrow:     "/assets/ui/icons/icon-back-arrow.png",
      toggleOn:      "/assets/ui/icons/icon-toggle-on.png",
      toggleOff:     "/assets/ui/icons/icon-toggle-off.png",
      copy:          "/assets/ui/icons/icon-copy.png",
    },
    particles: {
      maple: "/assets/ui/particles/particle-maple.png",
    },
    misc: {
      cageClosed: "/assets/ui/misc/cage-closed.png",
      marqueeBg:  "/assets/ui/misc/marquee-bg.png",
      logoText:   "/assets/ui/misc/logo-text.png",
      modalBg:    "/assets/ui/misc/modal-bg.png",
    },
  },

  animations: {
    logoBreath:      "/assets/animations/logo-breathing.json",
    cricketChirp:    "/assets/animations/cricket-chirp.json",
    spiritWave:      "/assets/animations/spirit-wave.json",
    battleIntro:     "/assets/animations/battle-intro.json",
    damageFloat:     "/assets/animations/damage-float.json",
    cricketDefeat:   "/assets/animations/cricket-defeated.json",
    gachaOpen:       "/assets/animations/gacha-open.json",
    gachaCommon:     "/assets/animations/gacha-reveal-common.json",
    gachaRare:       "/assets/animations/gacha-reveal-rare.json",
    gachaEpic:       "/assets/animations/gacha-reveal-epic.json",
    gachaLegendary:  "/assets/animations/gacha-reveal-legendary.json",
    roundWin:        "/assets/animations/round-win.json",
    gameOver:        "/assets/animations/game-over.json",
    hpPulse:         "/assets/animations/hp-low-pulse.json",
    goldenPulse:     "/assets/animations/golden-pulse.json",
    loading:         "/assets/animations/loading-spinner.json",
    transition:      "/assets/animations/transition-page.json",
  },

  audio: {
    bgm: {
      home:    "/assets/audio/bgm/bgm-home.mp3",
      market:  "/assets/audio/bgm/bgm-market.mp3",
      battle:  "/assets/audio/bgm/bgm-battle.mp3",
      victory: "/assets/audio/bgm/bgm-victory.mp3",
      defeat:  "/assets/audio/bgm/bgm-defeat.mp3",
      room:    "/assets/audio/bgm/bgm-room.mp3",
    },
    sfx: {
      heavyHit:       "/assets/audio/sfx/sfx-heavy-hit.mp3",
      feint:          "/assets/audio/sfx/sfx-feint.mp3",
      block:          "/assets/audio/sfx/sfx-block.mp3",
      chirp:          "/assets/audio/sfx/sfx-chirp.mp3",
      damageTaken:    "/assets/audio/sfx/sfx-damage-taken.mp3",
      cricketDefeat:  "/assets/audio/sfx/sfx-cricket-defeat.mp3",
      roundWin:       "/assets/audio/sfx/sfx-round-win.mp3",
      roundLose:      "/assets/audio/sfx/sfx-round-lose.mp3",
      gameWin:        "/assets/audio/sfx/sfx-game-win.mp3",
      gameLose:       "/assets/audio/sfx/sfx-game-lose.mp3",
      buttonClick:    "/assets/audio/sfx/sfx-button-click.mp3",
      gachaOpen:      "/assets/audio/sfx/sfx-gacha-open.mp3",
      gachaReveal:    "/assets/audio/sfx/sfx-gacha-reveal.mp3",
      gachaLegendary: "/assets/audio/sfx/sfx-gacha-legendary.mp3",
      roomJoin:       "",   // 选蛐蛐页面禁用
      ready:          "",   // 选蛐蛐页面禁用
      countdown:      "",   // 选蛐蛐页面禁用
      uiPanel:        "/assets/audio/sfx/sfx-ui-panel.mp3",
      cricketAmbient: "/assets/audio/sfx/sfx-cricket-chirp.mp3",
    },
  },

  fonts: {
    notoSerifSC: "Noto Serif SC",
    maShanZheng: "Ma Shan Zheng",
  },
} as const;
