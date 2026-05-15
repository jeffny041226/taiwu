"use client";

import Image from "next/image";
import { useState, useCallback, useEffect, useRef, use } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { LoadingOverlay } from "@/components/game/LoadingOverlay";
import { calcRoundResult, getEffectiveStat, type CricketBattleState } from "@/lib/battle-calc";

type Action = "heavy_strike" | "feint" | "block" | "chirp";

/** AI 随机动作 */
function aiAction(): Action {
  const r = Math.random();
  if (r < 0.30) return "heavy_strike";
  if (r < 0.55) return "block";
  if (r < 0.80) return "feint";
  return "chirp";
}

interface Cricket {
  id: number;
  name: string;
  title: string;
  tier: string;
  maxHp: number;
  hp: number;
  maxStamina: number;
  stamina: number;
  spirit: number;
  attack: number;
  defense: number;
  speed: number;
  trait: string;
}

/** 训练模式玩家蛐蛐 (3只) */
const TRAIN_PLAYER_TEAM: Cricket[] = [
  { id: 1,  name: "赤牙将军", tier: "legendary", maxHp: 130, hp: 130, maxStamina: 120, stamina: 120, spirit: 120, attack: 25, defense: 20, speed: 20, title: "铁齿铜牙", trait: "fierce"    },
  { id: 2,  name: "紫翅飞将", tier: "epic",     maxHp: 120, hp: 120, maxStamina: 110, stamina: 110, spirit: 110, attack: 23, defense: 7,  speed: 22, title: "紫翼天翔", trait: "swift"     },
  { id: 3,  name: "褐背小将", tier: "common",   maxHp: 100, hp: 100, maxStamina: 100, stamina: 100, spirit: 100, attack: 15, defense: 18, speed: 12, title: "褐甲护体", trait: "steadfast" },
];

/** 训练模式 AI 对手蛐蛐 (3只) */
const TRAIN_AI_TEAM: Cricket[] = [
  { id: 101, name: "铁翅元帅", tier: "rare",   maxHp: 110, hp: 110, maxStamina: 105, stamina: 105, spirit: 105, attack: 17, defense: 22, speed: 12, title: "铁翼横空", trait: "steadfast" },
  { id: 102, name: "金须战将", tier: "rare",   maxHp: 110, hp: 110, maxStamina: 105, stamina: 105, spirit: 105, attack: 15, defense: 20, speed: 16, title: "金须飘然", trait: "resonant"  },
  { id: 103, name: "黄翅太保", tier: "common", maxHp: 110, hp: 110, maxStamina: 105, stamina: 105, spirit: 105, attack: 12, defense: 18, speed: 14, title: "黄翅遮天", trait: "resonant"  },
];

function HPBar({ current, max }: { current: number; max: number }) {
  const pct = Math.max((current / max) * 100, 0);
  const isLow = pct < 30;
  return (
    <div className="flex items-center gap-2">
      <div className="w-[280px] h-3 rounded-md" style={{ backgroundColor: "#5a2218" }}>
        <div className="h-full rounded-md transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: isLow ? "#c57030" : "#a05040", animation: isLow ? "breath 0.75s ease-in-out infinite" : undefined }} />
      </div>
      <span className="text-[11px] text-[var(--color-text-primary)] w-12 text-right font-[family-name:var(--font-noto-serif)]">{current}/{max}</span>
    </div>
  );
}

function StaminaBar({ current, max }: { current: number; max: number }) {
  const pct = Math.max((current / max) * 100, 0);
  return (
    <div className="flex items-center gap-2">
      <div className="w-[280px] h-2 rounded-md" style={{ backgroundColor: "#3a5068" }}>
        <div className="h-full rounded-md transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: "#5a7890" }} />
      </div>
      <span className="text-[8px] text-[#8aa0b0] w-12 text-right font-[family-name:var(--font-noto-serif)]">{current}/{max}</span>
    </div>
  );
}

/** 品质对应颜色 */
const TIER_COLORS: Record<string, string> = { common: "#a0a0a0", rare: "#4a90d9", epic: "#8b5cf6", legendary: "#c5a059" };

/** 待战区卡片 (横向排列) */
function BenchCard({ cricket, status, flipped }: { cricket: Cricket; status: "waiting" | "fighting" | "defeated"; flipped?: boolean }) {
  const tierColor = TIER_COLORS[cricket.tier] || "#a0a0a0";
  const isDefeated = status === "defeated";
  const isFighting = status === "fighting";
  return (
    <div className="relative flex flex-col items-center justify-center w-[100px] h-[100px] rounded-lg transition-all duration-500 overflow-hidden">
      {/* 衬底图 */}
      <Image src="/assets/ui/arena/bench-disc.png" alt="" fill unoptimized className={`object-cover opacity-30 ${flipped ? "rotate-180" : ""}`} />
      {/* 内容 */}
      <div className="relative z-10 flex flex-col items-center gap-0.5">
        {/* 圆盘 */}
        <div className="relative w-14 h-14 flex items-center justify-center">
          {isFighting ? (
            <span className="text-[var(--color-gold)] text-[14px] font-bold font-[family-name:var(--font-noto-serif)]">出战</span>
          ) : isDefeated ? (
            <span className="text-red-400/70 text-[14px] font-bold font-[family-name:var(--font-noto-serif)]">战败</span>
          ) : (
            <Image src={getCricketImage(cricket)} alt={cricket.name} width={48} height={48} unoptimized className="object-contain" style={flipped ? { transform: 'rotate(180deg)' } : undefined} />
          )}
        </div>
        {/* 名称 */}
        <span className={`text-[9px] leading-tight font-bold text-center font-[family-name:var(--font-noto-serif)] ${isDefeated ? "text-red-400/70" : isFighting ? "text-[var(--color-gold)]" : ""}`}
          style={{ color: !isDefeated && !isFighting ? tierColor : undefined }}>
          {cricket.name}
        </span>
        <span className="text-[7px] text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)]">
          {isDefeated ? "败阵" : isFighting ? "战斗中" : `攻${cricket.attack}`}
        </span>
      </div>
    </div>
  );
}

/** 信息条 (紧凑版) */
function InfoBar({ label, name, title, tier, hp, maxHp, stamina, maxStamina, spirit, side }: {
  label: string; name: string; title: string; tier: string;
  hp: number; maxHp: number; stamina: number; maxStamina: number; spirit: number;
  side: "left" | "right";
}) {
  const tierColor = TIER_COLORS[tier] || "#a0a0a0";
  const hpPct = Math.max((hp / maxHp) * 100, 0);
  const stPct = Math.max((stamina / maxStamina) * 100, 0);
  const hpLow = hpPct < 30;
  return (
    <div className="flex items-center gap-2.5 px-4 py-1.5">
      {/* 头像 */}
      <div className="w-8 h-8 rounded-full border border-[var(--color-gold)]/30 bg-[var(--color-bg-base)] flex items-center justify-center text-[10px] text-[var(--color-gold)] flex-shrink-0 font-[family-name:var(--font-noto-serif)]">
        {label}
      </div>
      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[12px] font-bold text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)]">{name}</span>
          <span className="text-[9px] text-[var(--color-text-secondary)] font-[family-name:var(--font-ma-shan)]">{title}</span>
          <span className="text-[8px] px-1.5 py-[1px] rounded" style={{ color: tierColor, backgroundColor: `${tierColor}18` }}>{tier === "common" ? "普通" : tier === "rare" ? "稀有" : tier === "epic" ? "史诗" : "传说"}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] text-[var(--color-text-muted)] w-3.5 font-[family-name:var(--font-noto-serif)]">HP</span>
            <div className="w-[100px] h-2 rounded-sm" style={{ backgroundColor: "#5a2218" }}>
              <div className="h-full rounded-sm transition-all duration-500" style={{ width: `${hpPct}%`, backgroundColor: hpLow ? "#c57030" : "#a05040", animation: hpLow ? "breath 0.75s ease-in-out infinite" : undefined }} />
            </div>
            <span className="text-[8px] text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)]">{hp}/{maxHp}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-[var(--color-text-muted)] w-2.5 font-[family-name:var(--font-noto-serif)]">ST</span>
            <div className="w-[60px] h-1.5 rounded-sm" style={{ backgroundColor: "#3a5068" }}>
              <div className="h-full rounded-sm transition-all duration-500" style={{ width: `${stPct}%`, backgroundColor: "#5a7890" }} />
            </div>
            <span className="text-[7px] text-[#8aa0b0] font-[family-name:var(--font-noto-serif)]">{stamina}/{maxStamina}</span>
          </div>
          <span className="text-[8px] text-[var(--color-gold-dim)] font-[family-name:var(--font-noto-serif)]">气{spirit}</span>
        </div>
      </div>
    </div>
  );
}

function getCricketImage(cricket: Cricket): string {
  const idx = ((cricket.id - 1) % 6) + 1;
  return `/assets/crickets/cricket-${String(idx).padStart(3, "0")}-thumb.png`;
}

export default function BattlePage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const searchParams = useSearchParams();
  const isPractice = searchParams.get("mode") === "practice";

  const [aiTeam] = useState(TRAIN_AI_TEAM);
  const [playerTeam] = useState(TRAIN_PLAYER_TEAM);
  const [currentAiIdx, setCurrentAiIdx] = useState(0);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [roundCount, setRoundCount] = useState(0);
  const [showDamage, setShowDamage] = useState<{ dmg: number; target: "player" | "ai" } | null>(null);
  const [lastAiAction, setLastAiAction] = useState<Action | null>(null);
  const [lastPlayerAction, setLastPlayerAction] = useState<Action | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState("");
  const [isAttacking, setIsAttacking] = useState(false);

  // 交锋偏移 (translateX)
  const [aiOffset, setAiOffset] = useState(0);
  const [playerOffset, setPlayerOffset] = useState(0);
  // 中轴线倾斜角度 (30°~90°, 双方始终在同一中轴线上)
  const [axisAngle, setAxisAngle] = useState(0);

  // 倍速 (1x / 2x)
  const [speed, setSpeed] = useState(1);
  const speedRef = useRef(1);
  const sp = (ms: number) => Math.round(ms / speedRef.current);

  const ai = aiTeam[currentAiIdx];
  const [aiHp, setAiHp] = useState(ai.hp);
  const [aiStamina, setAiStamina] = useState(ai.stamina);
  const [aiSpirit, setAiSpirit] = useState(ai.spirit);

  useEffect(() => {
    setAiHp(ai.hp);
    setAiStamina(ai.stamina);
    setAiSpirit(ai.spirit);
  }, [ai, currentAiIdx]);

  const player = playerTeam[currentPlayerIdx];
  const [playerHp, setPlayerHp] = useState(player.hp);
  const [playerStamina, setPlayerStamina] = useState(player.stamina);
  const [playerSpirit, setPlayerSpirit] = useState(player.spirit);

  useEffect(() => {
    setPlayerHp(player.hp);
    setPlayerStamina(player.stamina);
    setPlayerSpirit(player.spirit);
  }, [player]);

  /* ── 执行回合 ── */
  const executeRound = useCallback((pAction: Action) => {
    setIsAttacking(true);
    const aAction = aiAction();
    setLastAiAction(aAction);
    setLastPlayerAction(pAction);

    // 蛐蛐状态
    const pState: CricketBattleState = {
      attack: getEffectiveStat({ attack: player.attack, defense: player.defense, speed: player.speed, maxHp: player.maxHp, hp: playerHp, stamina: playerStamina, spirit: playerSpirit, trait: player.trait } as CricketBattleState, "attack"),
      defense: player.defense,
      speed: player.speed,
      maxHp: player.maxHp, hp: playerHp,
      stamina: playerStamina, spirit: playerSpirit,
      trait: player.trait,
    } as CricketBattleState;

    const aState: CricketBattleState = {
      attack: getEffectiveStat({ attack: ai.attack, defense: ai.defense, speed: ai.speed, maxHp: ai.maxHp, hp: aiHp, stamina: aiStamina, spirit: aiSpirit, trait: ai.trait } as CricketBattleState, "attack"),
      defense: ai.defense,
      speed: ai.speed,
      maxHp: ai.maxHp, hp: aiHp,
      stamina: aiStamina, spirit: aiSpirit,
      trait: ai.trait,
    } as CricketBattleState;

    const result = calcRoundResult(pState, aState, pAction, aAction);

    // 随机中轴线倾斜 30°~90° (退回时才应用)
    const angle = (Math.random() < 0.5 ? 1 : -1) * (20 + Math.random() * 70);
    const nextAngle = Math.round(angle);

    // 阶段1: 靠近 (0ms) — 水平冲刺, AI 向右冲, 玩家向左冲
    setAiOffset(55);
    setPlayerOffset(-55);

    // 阶段2: 交锋 — 显示伤害
    setTimeout(() => {
      if (result.attackerResult.damage > 0) {
        setShowDamage({ dmg: -result.attackerResult.damage, target: "ai" });
        setAiHp((h) => Math.max(0, h - result.attackerResult.damage));
        setTimeout(() => setShowDamage(null), sp(900));
      }
      if (result.defenderResult.damage > 0) {
        setShowDamage({ dmg: -result.defenderResult.damage, target: "player" });
        setPlayerHp((h) => Math.max(0, h - result.defenderResult.damage));
        setTimeout(() => setShowDamage(null), sp(900));
      }
      // 更新耐力和气势
      setAiStamina((s) => Math.max(0, aiStamina - aAction_cost(aAction) + (result.defenderResult.staminaDelta || 0)));
      setPlayerStamina((s) => Math.max(0, playerStamina - pAction_cost(pAction) + (result.attackerResult.staminaDelta || 0)));
      if (result.attackerResult.spiritDelta) setAiSpirit((s) => Math.max(0, aiSpirit + result.attackerResult.spiritDelta));
      if (result.defenderResult.spiritDelta) setPlayerSpirit((s) => Math.max(0, playerSpirit + result.defenderResult.spiritDelta));
    }, sp(400));

    // 阶段3: 退回+旋转 — 退回并旋转到新中轴线
    setTimeout(() => {
      setAiOffset(0);
      setPlayerOffset(0);
      setAxisAngle(nextAngle);
    }, sp(800));

    setRoundCount((c) => c + 1);

    // 阶段4: 解锁
    setTimeout(() => {
      setLastAiAction(null);
      setLastPlayerAction(null);
      setShowDamage(null);
      setIsAttacking(false);
    }, sp(1200));
  }, [player, ai, playerHp, aiHp, playerStamina, aiStamina, playerSpirit, aiSpirit]);

  /* ── 动作耐力消耗 ── */
  function aAction_cost(a: Action): number {
    if (a === "heavy_strike") return 12;
    if (a === "feint") return 8;
    if (a === "block") return 5;
    return 3; // chirp
  }
  function pAction_cost(a: Action): number {
    if (a === "heavy_strike") return 12;
    if (a === "feint") return 8;
    if (a === "block") return 5;
    return 3;
  }

  /* ── 自动战斗循环 ── */
  useEffect(() => {
    if (gameOver || isAttacking) return;
    const acts: Action[] = ["heavy_strike", "feint", "block", "chirp"];
    const t = setTimeout(() => {
      executeRound(acts[Math.floor(Math.random() * 4)]);
    }, sp(1500));
    return () => clearTimeout(t);
  }, [gameOver, isAttacking, roundCount, executeRound]);

  /* ── 检查 AI 败阵 ── */
  useEffect(() => {
    if (aiHp <= 0 && currentAiIdx < aiTeam.length) {
      const next = currentAiIdx + 1;
      if (next >= aiTeam.length) {
        setGameOver(true);
        setWinner("你");
      } else {
        const newCricket = aiTeam[next];
        setAiHp(newCricket.hp);
        setAiStamina(newCricket.stamina);
        setAiSpirit(newCricket.spirit);
        setCurrentAiIdx(next);
      }
    }
  }, [aiHp, currentAiIdx, aiTeam]);

  /* ── 检查玩家败阵 ── */
  useEffect(() => {
    if (playerHp <= 0 && currentPlayerIdx < playerTeam.length) {
      const next = currentPlayerIdx + 1;
      if (next >= playerTeam.length) {
        setGameOver(true);
        setWinner("AI");
      } else {
        const newCricket = playerTeam[next];
        setPlayerHp(newCricket.hp);
        setPlayerStamina(newCricket.stamina);
        setPlayerSpirit(newCricket.spirit);
        setCurrentPlayerIdx(next);
      }
    }
  }, [playerHp, currentPlayerIdx, playerTeam]);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden">
      {/* 背景图 */}
      <Image src="/assets/backgrounds/bg-battle.webp" alt="" fill unoptimized className="object-cover" priority />
      <div className="absolute inset-0 bg-[var(--color-bg-base)]/60" />
      <TopBar
        title={isPractice ? "训练模式" : "对战"}
        rightWide
        rightSlot={
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-[11px] text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)]">第{roundCount}回合</span>
            <button type="button" onClick={() => { const v = speed === 1 ? 2 : 1; setSpeed(v); speedRef.current = v; }}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-[family-name:var(--font-noto-serif)] border transition-all ${speed === 2 ? "text-[var(--color-gold)] border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10" : "text-[var(--color-text-muted)] border-white/5"}`}>
              {speed}x
            </button>
          </div>
        }
        backHref="/"
      />

      {/* ── AI 信息条 ── */}
      <div className="absolute top-[54px] left-0 right-0 z-10 border-b border-[var(--color-gold)]/8 bg-[var(--color-bg-base)]/90 backdrop-blur-sm">
        <InfoBar label="AI" name={ai.name} title={ai.title} tier={ai.tier}
          hp={aiHp} maxHp={ai.maxHp} stamina={aiStamina} maxStamina={ai.maxStamina} spirit={aiSpirit} side="left" />
      </div>

      {/* ── AI 待战区 (横向3卡) ── */}
      <div className="absolute top-[106px] left-0 right-0 z-10">
        <div className="flex justify-center gap-2 px-4">
          {aiTeam.map((c, i) => (
            <BenchCard key={c.id} cricket={c} status={i === currentAiIdx ? "fighting" : i < currentAiIdx ? "defeated" : "waiting"} flipped />
          ))}
        </div>
      </div>

      {/* ── 对战区 ── */}
      <div className="absolute top-[208px] bottom-[182px] left-0 right-0 z-5 flex items-center justify-center overflow-hidden">
        <div className="relative w-[450px] h-[450px] flex items-center justify-center">
          <Image src="/assets/ui/arena/arena-circle.png" alt="" width={450} height={450} unoptimized className="absolute" />

          <div className="absolute inset-0 transition-transform duration-[0.3s] ease-in-out"
            style={{ transform: `rotate(${axisAngle}deg)` }}>

            <div className="absolute left-[80px] top-1/2 transition-transform duration-[0.3s] ease-in-out"
              style={{ transform: `translateY(-50%) translateX(${aiOffset}px)` }}>
              <div className="flex flex-col items-center">
                <div className="relative flex flex-col items-center">
                  {/* 斗气条 */}
                  <div className="flex items-center gap-1 mb-0.5">
                    <div className="w-[44px] h-[5px] rounded-sm overflow-hidden" style={{ backgroundColor: "rgba(197,160,89,0.12)" }}>
                      <div className="h-full rounded-sm transition-all duration-500"
                        style={{ width: `${Math.min((aiSpirit / 200) * 100, 100)}%`, backgroundColor: aiSpirit >= 150 ? "#c5a059" : aiSpirit >= 100 ? "#8a7040" : "#5a4830" }} />
                    </div>
                    <span className="text-[8px] text-[var(--color-gold-dim)] leading-none font-[family-name:var(--font-noto-serif)]">{aiSpirit}</span>
                  </div>
                  {showDamage?.target === "ai" && (
                    <div className="absolute -top-5 text-[22px] font-bold font-[family-name:var(--font-noto-serif)] text-[#ffd700] animate-[float-up-fade_0.9s_ease-out_forwards]">{showDamage.dmg}</div>
                  )}
                </div>
                <div className="w-[75px] h-[65px] flex items-center justify-center"
                  style={{ animation: showDamage?.target === "ai" ? "shake 0.4s ease-out" : lastAiAction ? "shake 0.3s ease-out" : "idle-float 2.5s ease-in-out infinite" }}>
                  <Image src={getCricketImage(ai)} alt={ai.name} width={75} height={65} unoptimized
                    className={`object-contain transition-all duration-200 ${showDamage?.target === "ai" ? "brightness-150" : lastAiAction ? "brightness-110" : "opacity-90"}`}
                    style={{ transform: "rotate(90deg)" }} />
                </div>
              </div>
            </div>

            <div className="absolute right-[80px] top-1/2 transition-transform duration-[0.3s] ease-in-out"
              style={{ transform: `translateY(-50%) translateX(${playerOffset}px)` }}>
              <div className="flex flex-col items-center">
                <div className="relative flex flex-col items-center">
                  {/* 斗气条 */}
                  <div className="flex items-center gap-1 mb-0.5">
                    <div className="w-[44px] h-[5px] rounded-sm overflow-hidden" style={{ backgroundColor: "rgba(197,160,89,0.12)" }}>
                      <div className="h-full rounded-sm transition-all duration-500"
                        style={{ width: `${Math.min((playerSpirit / 200) * 100, 100)}%`, backgroundColor: playerSpirit >= 150 ? "#c5a059" : playerSpirit >= 100 ? "#8a7040" : "#5a4830" }} />
                    </div>
                    <span className="text-[8px] text-[var(--color-gold-dim)] leading-none font-[family-name:var(--font-noto-serif)]">{playerSpirit}</span>
                  </div>
                  {showDamage?.target === "player" && (
                    <div className="absolute -top-5 text-[22px] font-bold font-[family-name:var(--font-noto-serif)] text-[#e04040] animate-[float-up-fade_0.9s_ease-out_forwards]">{showDamage.dmg}</div>
                  )}
                </div>
                <div className="w-[75px] h-[65px] flex items-center justify-center"
                  style={{ animation: showDamage?.target === "player" ? "shake 0.4s ease-out" : lastPlayerAction ? "shake 0.3s ease-out" : "idle-float 2.5s ease-in-out infinite" }}>
                  <Image src={getCricketImage(player)} alt={player.name} width={75} height={65} unoptimized
                    className={`object-contain transition-all duration-200 ${showDamage?.target === "player" ? "brightness-150" : lastPlayerAction ? "brightness-110" : "opacity-90"}`}
                    style={{ transform: "rotate(-90deg)" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 玩家待战区 (横向3卡) ── */}
      <div className="absolute bottom-[80px] left-0 right-0 z-10">
        <div className="flex justify-center gap-2 px-4">
          {playerTeam.map((c, i) => (
            <BenchCard key={c.id} cricket={c} status={i === currentPlayerIdx ? "fighting" : i < currentPlayerIdx ? "defeated" : "waiting"} />
          ))}
        </div>
      </div>

      {/* ── 玩家信息条 ── */}
      <div className="absolute bottom-[34px] left-0 right-0 z-10 border-t border-[var(--color-gold)]/8 bg-[var(--color-bg-base)]/90 backdrop-blur-sm">
        <InfoBar label="我" name={player.name} title={player.title} tier={player.tier}
          hp={playerHp} maxHp={player.maxHp} stamina={playerStamina} maxStamina={player.maxStamina} spirit={playerSpirit} side="right" />
      </div>

      {/* ── 游戏结束 ── */}
      {gameOver && (
        <div className="absolute inset-0 z-50 bg-[var(--color-bg-base)]/85 backdrop-blur-sm flex items-center justify-center px-8">
          <div className="w-full max-w-[342px] rounded-2xl border border-[var(--color-gold)]/40 bg-[rgba(20,14,10,0.9)] flex flex-col gap-4 py-8 px-6">
            <div className="text-[56px] font-[family-name:var(--font-ma-shan)] text-[var(--color-gold)] animate-pulse text-center">
              {winner === "你" ? "胜" : "败"}
            </div>
            <p className="text-[22px] font-bold text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)] text-center">
              {winner === "你" ? "大获全胜！" : "铩羽而归"}
            </p>
            <div className="flex gap-3">
              <a href="/" className="flex-1 h-11 rounded-[10px] border border-[var(--color-gold)]/30 bg-gradient-to-b from-[rgba(30,22,16,0.85)] to-[rgba(20,14,10,0.9)] text-[18px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)] items-center justify-center flex hover:border-[var(--color-gold)]/70 transition-all active:scale-[0.98]">返回大厅</a>
              <a href={`/battle/${roomId}?mode=practice`} className="flex-1 h-11 rounded-[10px] border border-[var(--color-gold)]/30 bg-gradient-to-b from-[rgba(30,22,16,0.85)] to-[rgba(20,14,10,0.9)] text-[18px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)] items-center justify-center flex hover:border-[var(--color-gold)]/70 transition-all active:scale-[0.98]">再来一局</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
