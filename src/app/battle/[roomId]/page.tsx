"use client";

import Image from "next/image";
import { useState, useCallback, useEffect, useRef, use } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { LoadingOverlay } from "@/components/game/LoadingOverlay";
import { calcRoundResult, type BattleCalcInput } from "@taiwu/shared/lib/battle-calc";
import { BLOCK_REDUCTION, AUTO_READY_DELAY, BATTLE_MODE, BATTLE_MODE_LABELS } from "@taiwu/shared/config/game";
import { useWebSocket } from "@/hooks/useWebSocket";
import { ensureAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { CricketTemplate } from "@taiwu/shared/types/cricket";

type Action = "heavy_strike" | "feint" | "block" | "chirp";

/** AI 随机动作 (训练模式用) */
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
  { id: 1,  name: "赤牙将军", tier: "legendary", maxHp: 130, hp: 130, maxStamina: 120, stamina: 120, spirit: 120, attack: 25, defense: 20, speed: 20, title: "铁齿铜牙", trait: "fierce" },
  { id: 2,  name: "紫翅飞将", tier: "epic",      maxHp: 120, hp: 120, maxStamina: 110, stamina: 110, spirit: 110, attack: 23, defense: 7,  speed: 22, title: "紫翼天翔", trait: "swift" },
  { id: 3,  name: "褐背小将", tier: "common",    maxHp: 100, hp: 100, maxStamina: 100, stamina: 100, spirit: 100, attack: 15, defense: 18, speed: 12, title: "褐甲护体", trait: "steadfast" },
];

/** 训练模式 AI 对手蛐蛐 (3只) */
const TRAIN_AI_TEAM: Cricket[] = [
  { id: 101, name: "铁翅元帅", tier: "rare",   maxHp: 110, hp: 110, maxStamina: 105, stamina: 105, spirit: 105, attack: 17, defense: 22, speed: 12, title: "铁翼横空", trait: "steadfast" },
  { id: 102, name: "金须战将", tier: "rare",   maxHp: 110, hp: 110, maxStamina: 105, stamina: 105, spirit: 105, attack: 15, defense: 20, speed: 16, title: "金须飘然", trait: "resonant" },
  { id: 103, name: "黄翅太保", tier: "common", maxHp: 110, hp: 110, maxStamina: 105, stamina: 105, spirit: 105, attack: 12, defense: 18, speed: 14, title: "黄翅遮天", trait: "resonant" },
];

const TIER_COLORS: Record<string, string> = { common: "#a0a0a0", rare: "#4a90d9", epic: "#8b5cf6", legendary: "#c5a059" };
const ACTION_LABEL: Record<Action, string> = { heavy_strike: "猛击", feint: "虚晃", block: "格挡", chirp: "鸣叫" };

function getCricketImage(cricket: Cricket): string {
  const idx = ((cricket.id - 1) % 6) + 1;
  return "/assets/crickets/cricket-" + String(idx).padStart(3, "0") + "-thumb.png";
}

function HPBar({ current, max }: { current: number; max: number }) {
  const pct = Math.max((current / max) * 100, 0);
  const isLow = pct < 30;
  const hpColor = isLow ? "#c57030" : "#a05040";
  const anim = isLow ? "breath 0.75s ease-in-out infinite" : undefined;
  return (
    <div className="flex items-center gap-2">
      <div className="w-[280px] h-3 rounded-md" style={{ backgroundColor: "#5a2218" }}>
        <div className="h-full rounded-md transition-all duration-500" style={{ width: pct + "%", backgroundColor: hpColor, animation: anim }} />
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
        <div className="h-full rounded-md transition-all duration-500" style={{ width: pct + "%", backgroundColor: "#5a7890" }} />
      </div>
      <span className="text-[8px] text-[#8aa0b0] w-12 text-right font-[family-name:var(--font-noto-serif)]">{current}/{max}</span>
    </div>
  );
}

function BenchCard({ cricket, status, flipped }: { cricket: Cricket; status: "waiting" | "fighting" | "defeated"; flipped?: boolean }) {
  const tierColor = TIER_COLORS[cricket.tier] || "#a0a0a0";
  const isDefeated = status === "defeated";
  const isFighting = status === "fighting";
  const statusText = isDefeated ? "战败" : isFighting ? "出战" : "攻" + cricket.attack;
  const statusColor = isDefeated ? "text-red-400/70" : isFighting ? "text-[var(--color-gold)]" : "";
  const nameColorStyle = !isDefeated && !isFighting ? tierColor : undefined;
  return (
    <div className="relative flex flex-col items-center justify-center w-[100px] h-[100px] rounded-lg transition-all duration-500 overflow-hidden">
      <Image src="/assets/ui/arena/bench-disc.png" alt="" fill unoptimized className={"object-cover opacity-30 " + (flipped ? "rotate-180" : "")} />
      <div className="relative z-10 flex flex-col items-center gap-0.5">
        <div className="relative w-14 h-14 flex items-center justify-center">
          {isFighting ? (
            <span className="text-[var(--color-gold)] text-[14px] font-bold font-[family-name:var(--font-noto-serif)]">出战</span>
          ) : isDefeated ? (
            <span className="text-red-400/70 text-[14px] font-bold font-[family-name:var(--font-noto-serif)]">战败</span>
          ) : (
            <Image src={getCricketImage(cricket)} alt={cricket.name} width={48} height={48} unoptimized className="object-contain" style={flipped ? { transform: "rotate(180deg)" } : undefined} />
          )}
        </div>
        <span className={"text-[9px] leading-tight font-bold text-center font-[family-name:var(--font-noto-serif)] " + statusColor} style={{ color: nameColorStyle }}>{cricket.name}</span>
        <span className="text-[7px] text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)]">{statusText}</span>
      </div>
    </div>
  );
}

function InfoBar({ label, name, title, tier, hp, maxHp, stamina, maxStamina, spirit }: {
  label: string; name: string; title: string; tier: string;
  hp: number; maxHp: number; stamina: number; maxStamina: number; spirit: number;
}) {
  const tierColor = TIER_COLORS[tier] || "#a0a0a0";
  const hpPct = Math.max((hp / maxHp) * 100, 0);
  const stPct = Math.max((stamina / maxStamina) * 100, 0);
  const hpLow = hpPct < 30;
  const hpColor = hpLow ? "#c57030" : "#a05040";
  const hpAnim = hpLow ? "breath 0.75s ease-in-out infinite" : undefined;
  const tierLabel = tier === "common" ? "普通" : tier === "rare" ? "稀有" : tier === "epic" ? "史诗" : "传说";
  return (
    <div className="flex items-center gap-2.5 px-4 py-1.5">
      <div className="w-8 h-8 rounded-full border border-[var(--color-gold)]/30 bg-[var(--color-bg-base)] flex items-center justify-center text-[10px] text-[var(--color-gold)] flex-shrink-0 font-[family-name:var(--font-noto-serif)]">{label}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[12px] font-bold text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)]">{name}</span>
          <span className="text-[9px] text-[var(--color-text-secondary)] font-[family-name:var(--font-ma-shan)]">{title}</span>
          <span className="text-[8px] px-1.5 py-[1px] rounded" style={{ color: tierColor, backgroundColor: tierColor + "18" }}>{tierLabel}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] text-[var(--color-text-muted)] w-3.5 font-[family-name:var(--font-noto-serif)]">HP</span>
            <div className="w-[100px] h-2 rounded-sm" style={{ backgroundColor: "#5a2218" }}>
              <div className="h-full rounded-sm transition-all duration-500" style={{ width: hpPct + "%", backgroundColor: hpColor, animation: hpAnim }} />
            </div>
            <span className="text-[8px] text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)]">{hp}/{maxHp}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-[var(--color-text-muted)] w-2.5 font-[family-name:var(--font-noto-serif)]">ST</span>
            <div className="w-[60px] h-1.5 rounded-sm" style={{ backgroundColor: "#3a5068" }}>
              <div className="h-full rounded-sm transition-all duration-500" style={{ width: stPct + "%", backgroundColor: "#5a7890" }} />
            </div>
            <span className="text-[7px] text-[#8aa0b0] font-[family-name:var(--font-noto-serif)]">{stamina}/{maxStamina}</span>
          </div>
          <span className="text-[8px] text-[var(--color-gold-dim)] font-[family-name:var(--font-noto-serif)]">气{spirit}</span>
        </div>
      </div>
    </div>
  );
}

export default function BattlePage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const searchParams = useSearchParams();
  const isPractice = searchParams.get("mode") === "practice";
  const fromMatch = searchParams.get("from") === "match";

  // Auth init
  const [myUid, setMyUid] = useState("");
  const [token, setToken] = useState("");
  useEffect(() => {
    ensureAuth().then((auth) => {
      if (!auth) {
        window.location.href = "/auth";
        return;
      }
      setMyUid(auth.uid);
      setToken(auth.token);
    });
  }, []);

  // WS connection — practice mode (PVE) also connects via WS for server-side battle
  const wsReady = myUid && token && !!roomId;
  const { send, on, off, onEvent, offEvent } = useWebSocket(wsReady ? roomId : null, token);

  // ── PVP 状态 ──
  const [myTeam, setMyTeam] = useState<Cricket[]>([]);
  const [enemyTeam, setEnemyTeam] = useState<Cricket[]>([]);
  const [myIdx, setMyIdx] = useState(0);
  const [enemyIdx, setEnemyIdx] = useState(0);
  const [myHp, setMyHp] = useState(0);
  const [myStamina, setMyStamina] = useState(0);
  const [mySpirit, setMySpirit] = useState(0);
  const [enemyHp, setEnemyHp] = useState(0);
  const [enemyStamina, setEnemyStamina] = useState(0);
  const [enemySpirit, setEnemySpirit] = useState(0);
  const [roundCount, setRoundCount] = useState(0);
  const [waitingForAction, setWaitingForAction] = useState(false);
  const [pvpPhase, setPvpPhase] = useState<"loading" | "battling" | "roundEnd" | "finished">("loading");
  const [pvpGameOver, setPvpGameOver] = useState<{ winner: string; myScore: number; enemyScore: number } | null>(null);
  const [rematchLoading, setRematchLoading] = useState(false);
  const [showDamage, setShowDamage] = useState<{ dmg: number; target: "me" | "enemy" } | null>(null);
  const [lastMyAction, setLastMyAction] = useState<Action | null>(null);
  const [lastEnemyAction, setLastEnemyAction] = useState<Action | null>(null);
  const [showRoundEnd, setShowRoundEnd] = useState(false);
  const [myOffset, setMyOffset] = useState(0);
  const [enemyOffset, setEnemyOffset] = useState(0);
  const [axisAngle, setAxisAngle] = useState(0);
  const [battleLog, setBattleLog] = useState<{ text: string; id: number }[]>([]);
  const logIdRef = useRef(0);
  const addLog = useCallback((text: string) => {
    const id = logIdRef.current++;
    setBattleLog(prev => [...prev.slice(-30), { text, id }]);
  }, []);

  // ── PVP: stateRefs for accessing current state in WS handlers ──
  const stateRefs = useRef({
    myTeam: [] as Cricket[], enemyTeam: [] as Cricket[],
    myIdx: 0, enemyIdx: 0, myHp: 0, myStamina: 0, mySpirit: 0,
    enemyHp: 0, enemyStamina: 0, enemySpirit: 0,
    roundCount: 0, waitingForAction: false,
  });

  useEffect(() => {
    stateRefs.current.myTeam = myTeam;
    stateRefs.current.enemyTeam = enemyTeam;
    stateRefs.current.myIdx = myIdx;
    stateRefs.current.enemyIdx = enemyIdx;
    stateRefs.current.myHp = myHp;
    stateRefs.current.myStamina = myStamina;
    stateRefs.current.mySpirit = mySpirit;
    stateRefs.current.enemyHp = enemyHp;
    stateRefs.current.enemyStamina = enemyStamina;
    stateRefs.current.enemySpirit = enemySpirit;
    stateRefs.current.roundCount = roundCount;
    stateRefs.current.waitingForAction = waitingForAction;
  });

  // ── PVP: Register WS handlers via on/off ──
  useEffect(() => {
    if (!wsReady) return;
    console.log("[Battle] wsReady, sending room:join for roomId=" + roomId + " myUid=" + myUid);

    const handleBattleData = (payload: unknown) => {
      console.log("[Battle] 收到 battle:data!");
      setRematchLoading(false);
      setPvpGameOver(null);
      const d = payload as { myCrickets: Cricket[], enemyCrickets: Cricket[], myIdx: number, enemyIdx: number, myScore: number, enemyScore: number, battleMode?: string };
      setMyTeam(d.myCrickets);
      setEnemyTeam(d.enemyCrickets);
      setMyIdx(d.myIdx ?? 0);
      setEnemyIdx(d.enemyIdx ?? 0);
      if (d.myCrickets.length > 0) {
        const c = d.myCrickets[d.myIdx ?? 0];
        setMyHp(c.hp); setMyStamina(c.stamina); setMySpirit(c.spirit);
      }
      if (d.enemyCrickets.length > 0) {
        const c = d.enemyCrickets[d.enemyIdx ?? 0];
        setEnemyHp(c.hp); setEnemyStamina(c.stamina); setEnemySpirit(c.spirit);
      }
      setPvpPhase("battling");
      setWaitingForAction(true);
      addLog("战斗开始！");
    };

    const handleRoundResult = (payload: unknown) => {
      const r = payload as {
        myAction: Action; enemyAction: Action;
        myDamage: number; enemyDamage: number;
        myHp: number; myStamina: number; mySpirit: number;
        enemyHp: number; enemyStamina: number; enemySpirit: number;
        myBlocked: boolean; enemyBlocked: boolean;
        myCounter: number; enemyCounter: number;
        myStaminaDelta: number; mySpiritDelta: number;
        enemyStaminaDelta: number; enemySpiritDelta: number;
        myDefeated: boolean; enemyDefeated: boolean;
      };
      const s = stateRefs.current;
      setLastMyAction(r.myAction);
      setLastEnemyAction(r.enemyAction);
      setWaitingForAction(false);
      // 若本回合有阵亡，标记等待对方换蛐蛐而非继续出招
      if (r.myDefeated || r.enemyDefeated) {
        setPvpPhase("roundEnd");
      }

      const myName = s.myTeam[s.myIdx]?.name || "我方";
      const enemyName = s.enemyTeam[s.enemyIdx]?.name || "对方";
      addLog("--- 第" + (s.roundCount + 1) + "回合 ---");
      addLog(myName + " -> " + ACTION_LABEL[r.myAction]);
      addLog(enemyName + " -> " + ACTION_LABEL[r.enemyAction]);

      setMyOffset(-55);
      setEnemyOffset(55);

      setTimeout(() => {
        if (r.enemyDamage > 0) {
          setShowDamage({ dmg: -r.enemyDamage, target: "enemy" });
          addLog(myName + " 造成 " + r.enemyDamage + " 伤害" + (r.myCounter > 1 ? " (克制x" + r.myCounter + ")" : ""));
        }
        if (r.myDamage > 0) {
          setShowDamage({ dmg: -r.myDamage, target: "me" });
          addLog(enemyName + " 造成 " + r.myDamage + " 伤害" + (r.enemyCounter > 1 ? " (克制x" + r.enemyCounter + ")" : ""));
        }
        if (r.myBlocked) {
          const pct = Math.round(BLOCK_REDUCTION[r.myAction === "heavy_strike" ? "vs_heavy_strike" : "vs_feint"] * 100);
          addLog(enemyName + " 格挡，减免 " + pct + "% 伤害");
        }
        if (r.enemyBlocked) {
          const pct = Math.round(BLOCK_REDUCTION[r.enemyAction === "heavy_strike" ? "vs_heavy_strike" : "vs_feint"] * 100);
          addLog(myName + " 格挡，减免 " + pct + "% 伤害");
        }

        setMyHp(r.myHp); setMyStamina(r.myStamina); setMySpirit(r.mySpirit);
        setEnemyHp(r.enemyHp); setEnemyStamina(r.enemyStamina); setEnemySpirit(r.enemySpirit);
        if (r.myStaminaDelta) addLog(myName + " 耐力 " + (r.myStaminaDelta > 0 ? "+" : "") + r.myStaminaDelta);
        if (r.enemyStaminaDelta) addLog(enemyName + " 耐力 " + (r.enemyStaminaDelta > 0 ? "+" : "") + r.enemyStaminaDelta);
        if (r.mySpiritDelta) addLog(myName + " 斗性 " + (r.mySpiritDelta > 0 ? "+" : "") + r.mySpiritDelta);
        if (r.enemySpiritDelta) addLog(enemyName + " 斗性 " + (r.enemySpiritDelta > 0 ? "+" : "") + r.enemySpiritDelta);
        setTimeout(() => setShowDamage(null), 450);
      }, 200);

      setTimeout(() => {
        setMyOffset(0); setEnemyOffset(0);
        const angle = (Math.random() < 0.5 ? 1 : -1) * (20 + Math.random() * 70);
        setAxisAngle(Math.round(angle));
      }, 400);

      setRoundCount(c => c + 1);

      setTimeout(() => {
        setLastMyAction(null); setLastEnemyAction(null);
        setShowDamage(null);
        if (!r.myDefeated && !r.enemyDefeated) {
          setShowRoundEnd(true);
          setTimeout(() => {
            setShowRoundEnd(false);
            setWaitingForAction(true);
          }, 400);
        }
      }, 600);
    };

    const handleRoundWin = (payload: unknown) => {
      setPvpPhase("roundEnd");
      setWaitingForAction(false);
      const r = payload as { winner: string; myScore: number; enemyScore: number; defeatedCricket: { side: string; name: string; title: string } | null };
      const iWon = r.winner === "me";
      addLog((iWon ? "我方" : "对方") + "赢得本局！比分 " + r.myScore + ":" + r.enemyScore);
      if (r.defeatedCricket) addLog(r.defeatedCricket.name + " 战败");
    };

    const handleGameOver = (payload: unknown) => {
      setPvpPhase("finished");
      const r = payload as { winner: string; myScore: number; enemyScore: number; reason?: string };
      setPvpGameOver({ winner: r.winner, myScore: r.myScore, enemyScore: r.enemyScore });
    };

    const handleCricketChange = (payload: unknown) => {
      const r = payload as { myCricket: Cricket; enemyCricket: Cricket; myIdx: number; enemyIdx: number };
      setMyIdx(r.myIdx); setEnemyIdx(r.enemyIdx);
      setMyHp(r.myCricket.hp); setMyStamina(r.myCricket.stamina); setMySpirit(r.myCricket.spirit);
      setEnemyHp(r.enemyCricket.hp); setEnemyStamina(r.enemyCricket.stamina); setEnemySpirit(r.enemyCricket.spirit);
      addLog("换蛐蛐: 我方->" + r.myCricket.name + " 对方->" + r.enemyCricket.name);
      setPvpPhase("battling");
      setWaitingForAction(true);
    };

    const handleError = (payload: unknown) => {
      const p = payload as { message?: string };
      console.log("[Battle] 收到 room:error: " + p.message);
      addLog("错误: " + String(p.message));
    };

    // Send room:join on connect
    send("room:join", { roomId: roomId.toUpperCase(), uid: myUid, nickName: "玩家" });

    on("battle:data", handleBattleData);
    on("battle:roundResult", handleRoundResult);
    on("battle:roundWin", handleRoundWin);
    on("battle:gameOver", handleGameOver);
    on("battle:cricketChange", handleCricketChange);
    on("room:error", handleError);

    // WS 重连后自动重发 room:join，保持房间绑定
    const handleReconnect = () => {
      console.log("[Battle] WS reconnected, re-sending room:join for roomId=" + roomId);
      send("room:join", { roomId: roomId.toUpperCase(), uid: myUid, nickName: "玩家" });
    };
    onEvent("reconnect", handleReconnect);

    return () => {
      off("battle:data", handleBattleData);
      off("battle:roundResult", handleRoundResult);
      off("battle:roundWin", handleRoundWin);
      off("battle:gameOver", handleGameOver);
      off("battle:cricketChange", handleCricketChange);
      off("room:error", handleError);
      offEvent("reconnect", handleReconnect);
    };
  }, [wsReady, myUid, roomId]);

  // ── PVP: 发送动作 (使用 ref 避免闭包过期) ──
  const waitingRef = useRef(waitingForAction);
  waitingRef.current = waitingForAction;
  const sendAction = (action: Action) => {
    if (!waitingRef.current) return;
    setWaitingForAction(false);
    send("battle:action", { roomId: roomId.toUpperCase(), uid: myUid, action });
  };

  // 自动发送随机动作（PVE 由服务端自动出招，客户端不发送）
  useEffect(() => {
    if (isPractice) return;
    if (pvpPhase === "battling" && waitingForAction) {
      const actions: Action[] = ["heavy_strike", "feint", "block", "chirp"];
      const timer = setTimeout(() => sendAction(actions[Math.floor(Math.random() * 4)]), 750);
      return () => clearTimeout(timer);
    }
  }, [isPractice, pvpPhase, waitingForAction, roundCount]);

  // 局间自动继续（PVE 由服务端自动推进）
  useEffect(() => {
    if (isPractice) return;
    if (pvpPhase === "roundEnd") {
      const timer = setTimeout(() => sendNextRound(), Math.round(AUTO_READY_DELAY / 2));
      return () => clearTimeout(timer);
    }
  }, [isPractice, pvpPhase, roundCount]);

  // ── PVP: 局间下一局 ──
  const sendNextRound = () => {
    send("battle:nextRound", { roomId: roomId.toUpperCase(), uid: myUid });
  };

  // ── PVE: 再来一局 ──
  const handleRematch = () => {
    setRematchLoading(true);
    send("battle:rematch", { roomId: roomId.toUpperCase() });
  };

  // ── 训练模式状态 ──
  const [aiTeam] = useState(TRAIN_AI_TEAM);
  const [playerTeam, setPlayerTeam] = useState<Cricket[]>([]);
  const [currentAiIdx, setCurrentAiIdx] = useState(0);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [trainRoundCount, setTrainRoundCount] = useState(0);
  const [trainGameOver, setTrainGameOver] = useState(false);
  const [trainWinner, setTrainWinner] = useState("");
  const [trainAttacking, setTrainAttacking] = useState(false);

  // Load player team from backpack for practice mode
  useEffect(() => {
    if (!isPractice || !myUid) return;
    (async () => {
      try {
        const data = await api.getCrickets();
        const crickets = data.crickets;
        if (crickets.length >= 3) {
          // Take first 3 crickets from backpack
          const team = crickets.slice(0, 3).map(uc => {
            const t = uc.template as CricketTemplate;
            return {
              id: t.id,
              name: t.name,
              title: t.title,
              tier: t.tier,
              maxHp: t.hpBase,
              hp: t.hpBase,
              maxStamina: t.staminaBase,
              stamina: t.staminaBase,
              spirit: t.spiritBase,
              attack: t.attack,
              defense: t.defense,
              speed: t.speed,
              trait: t.trait,
            } as Cricket;
          });
          setPlayerTeam(team);
        } else {
          // Not enough crickets — fallback to hardcoded
          setPlayerTeam(TRAIN_PLAYER_TEAM);
        }
      } catch {
        setPlayerTeam(TRAIN_PLAYER_TEAM);
      }
    })();
  }, [isPractice, myUid]);

  const ai = aiTeam[currentAiIdx];
  const player = playerTeam.length > 0 ? playerTeam[currentPlayerIdx] : null;
  // Avoid crashes while team loads — use placeholder values, will reset once loaded
  const [trainAiHp, setTrainAiHp] = useState(ai?.hp ?? 0);
  const [trainAiStamina, setTrainAiStamina] = useState(ai?.stamina ?? 0);
  const [trainAiSpirit, setTrainAiSpirit] = useState(ai?.spirit ?? 0);
  const [trainPlayerHp, setTrainPlayerHp] = useState(player?.hp ?? 0);
  const [trainPlayerStamina, setTrainPlayerStamina] = useState(player?.stamina ?? 0);
  const [trainPlayerSpirit, setTrainPlayerSpirit] = useState(player?.spirit ?? 0);

  useEffect(() => { if (ai) { setTrainAiHp(ai.hp); setTrainAiStamina(ai.stamina); setTrainAiSpirit(ai.spirit); } }, [ai]);
  useEffect(() => { if (player) { setTrainPlayerHp(player.hp); setTrainPlayerStamina(player.stamina); setTrainPlayerSpirit(player.spirit); } }, [player]);

  // ── 训练模式：局部状态 ref ──
  const trainRef = useRef({ round: 0, running: false, over: false, p: null as Cricket | null, a: null as Cricket | null,
    pHp: 0, pSta: 0, pSpi: 0, aHp: 0, aSta: 0, aSpi: 0,
  });
  trainRef.current.p = player;
  trainRef.current.a = ai;
  trainRef.current.over = trainGameOver;
  trainRef.current.pHp = trainPlayerHp;
  trainRef.current.pSta = trainPlayerStamina;
  trainRef.current.pSpi = trainPlayerSpirit;
  trainRef.current.aHp = trainAiHp;
  trainRef.current.aSta = trainAiStamina;
  trainRef.current.aSpi = trainAiSpirit;

  // 单次训练回合
  const doTrainRound = useCallback(() => {
    const tr = trainRef.current;
    if (tr.over) return;
    console.log("[Train] doTrainRound called, round=" + tr.round + " running=" + tr.running + " hasP=" + !!tr.p + " hasA=" + !!tr.a + " pHp=" + tr.pHp + " aHp=" + tr.aHp);
    if (tr.running || !tr.p || !tr.a) { console.log("[Train] early return"); return; }
    // 防止索引越界时继续战斗
    if (tr.round >= 100) { tr.over = true; setTrainGameOver(true); setTrainWinner("你"); return; }
    tr.running = true;
    setTrainAttacking(true);
    const pAction = ["heavy_strike", "feint", "block", "chirp"][Math.floor(Math.random() * 4)] as Action;
    const aAction = aiAction();
    const p = tr.p;
    const a = tr.a;

    const pState: BattleCalcInput = { attack: p.attack, defense: p.defense, speed: p.speed, maxHp: p.maxHp, hp: tr.pHp, stamina: tr.pSta, spirit: tr.pSpi, trait: p.trait };
    const aState: BattleCalcInput = { attack: a.attack, defense: a.defense, speed: a.speed, maxHp: a.maxHp, hp: tr.aHp, stamina: tr.aSta, spirit: tr.aSpi, trait: a.trait };
    const result = calcRoundResult(pState, aState, pAction, aAction);

    const rnd = tr.round + 1;
    tr.round = rnd;
    setTrainRoundCount(rnd);
    setMyOffset(-55); setEnemyOffset(55);
    addLog("--- 第" + rnd + "回合 ---");
    addLog(p.name + " -> " + ACTION_LABEL[pAction]);
    addLog(a.name + " -> " + ACTION_LABEL[aAction]);

    const pDmg = result.defenderResult.damage;
    const aDmg = result.attackerResult.damage;
    setTimeout(() => {
      if (aDmg > 0) { setShowDamage({ dmg: -aDmg, target: "enemy" }); setTrainAiHp(h => Math.max(0, h - aDmg)); addLog(p.name + " 造成 " + aDmg + " 伤害" + (result.attackerResult.counterApplied > 1 ? " (克制x" + result.attackerResult.counterApplied + ")" : "")); }
      if (pDmg > 0) { setShowDamage({ dmg: -pDmg, target: "me" });   setTrainPlayerHp(h => Math.max(0, h - pDmg)); addLog(a.name + " 造成 " + pDmg + " 伤害" + (result.defenderResult.counterApplied > 1 ? " (克制x" + result.defenderResult.counterApplied + ")" : "")); }
      if (result.attackerResult.isBlocked) addLog(a.name + " 格挡，减免 " + Math.round(BLOCK_REDUCTION[pAction === "heavy_strike" ? "vs_heavy_strike" : "vs_feint"] * 100) + "% 伤害");
      if (result.defenderResult.isBlocked) addLog(p.name + " 格挡，减免 " + Math.round(BLOCK_REDUCTION[aAction === "heavy_strike" ? "vs_heavy_strike" : "vs_feint"] * 100) + "% 伤害");
      if (result.attackerResult.staminaDelta) addLog(p.name + " 耐力 " + (result.attackerResult.staminaDelta > 0 ? "+" : "") + result.attackerResult.staminaDelta);
      if (result.defenderResult.staminaDelta) addLog(a.name + " 耐力 " + (result.defenderResult.staminaDelta > 0 ? "+" : "") + result.defenderResult.staminaDelta);
      if (result.attackerResult.spiritDelta) addLog(p.name + " 斗性 " + (result.attackerResult.spiritDelta > 0 ? "+" : "") + result.attackerResult.spiritDelta);
      if (result.defenderResult.spiritDelta) addLog(a.name + " 斗性 " + (result.defenderResult.spiritDelta > 0 ? "+" : "") + result.defenderResult.spiritDelta);
      setTimeout(() => setShowDamage(null), 450);
    }, 200);
    setTimeout(() => { setMyOffset(0); setEnemyOffset(0); const ang = (Math.random() < 0.5 ? 1 : -1) * (20 + Math.random() * 70); setAxisAngle(Math.round(ang)); }, 400);
    setTimeout(() => { setLastMyAction(null); setLastEnemyAction(null); setShowDamage(null); tr.running = false; setTrainAttacking(false); }, 600);
  }, []);

  // 训练定时器 — 持续触发回合（仅在 WS 未连接时使用）
  useEffect(() => {
    if (wsReady) return;
    console.log("[Train] interval effect: isPractice=" + isPractice + " trainGameOver=" + trainGameOver + " pLen=" + playerTeam.length + " pIdx=" + currentPlayerIdx + " aIdx=" + currentAiIdx);
    if (!isPractice) return;
    // 队伍还没加载完
    if (playerTeam.length === 0) return;
    // 检查是否所有蛐蛐都已战败
    if (currentPlayerIdx >= playerTeam.length || currentAiIdx >= aiTeam.length) {
      console.log("[Train] index out of bounds, forcing game over");
      if (!trainGameOver) {
        setTrainGameOver(true);
        setTrainWinner(currentPlayerIdx < playerTeam.length ? "你" : "AI");
      }
      return;
    }
    if (trainGameOver) return;
    console.log("[Train] setting up interval");
    const id = setInterval(doTrainRound, 1500);
    return () => { console.log("[Train] clearing interval"); clearInterval(id); };
  }, [isPractice, trainGameOver, doTrainRound, currentPlayerIdx, currentAiIdx, playerTeam.length, aiTeam.length, wsReady]);

  useEffect(() => {
    if (wsReady || !isPractice || trainGameOver) return;
    if (trainAiHp <= 0 && playerTeam.length > 0) {
      const next = currentAiIdx + 1;
      if (next >= aiTeam.length) { setTrainGameOver(true); setTrainWinner("你"); }
      else setCurrentAiIdx(next);
    }
  }, [trainAiHp, currentAiIdx, aiTeam, isPractice, trainGameOver, playerTeam.length, wsReady]);

  useEffect(() => {
    if (wsReady || !isPractice || trainGameOver) return;
    if (trainPlayerHp <= 0 && playerTeam.length > 0) {
      const next = currentPlayerIdx + 1;
      if (next >= playerTeam.length) { setTrainGameOver(true); setTrainWinner("AI"); }
      else setCurrentPlayerIdx(next);
    }
  }, [trainPlayerHp, currentPlayerIdx, playerTeam, isPractice, trainGameOver, playerTeam.length, wsReady]);

  // ── 当前蛐蛐（WS 连接时使用 PVP 数据流）──
  const usePvpData = wsReady || !isPractice;
  const myCricket = usePvpData ? myTeam[myIdx] : playerTeam[currentPlayerIdx];
  const enemyCricket = usePvpData ? enemyTeam[enemyIdx] : aiTeam[currentAiIdx];
  const currentMyHp = usePvpData ? myHp : trainPlayerHp;
  const currentMyStamina = usePvpData ? myStamina : trainPlayerStamina;
  const currentMySpirit = usePvpData ? mySpirit : trainPlayerSpirit;
  const currentEnemyHp = usePvpData ? enemyHp : trainAiHp;
  const currentEnemyStamina = usePvpData ? enemyStamina : trainAiStamina;
  const currentEnemySpirit = usePvpData ? enemySpirit : trainAiSpirit;
  const myTeamArr = usePvpData ? myTeam : playerTeam;
  const enemyTeamArr = usePvpData ? enemyTeam : aiTeam;
  const myCurrentIdx = usePvpData ? myIdx : currentPlayerIdx;
  const enemyCurrentIdx = usePvpData ? enemyIdx : currentAiIdx;
  const isGameOver = usePvpData ? pvpPhase === "finished" : trainGameOver;
  const winnerText = usePvpData ? (pvpGameOver?.winner === "me" ? "你" : "对方") : trainWinner;

  if (!myCricket && !isGameOver) {
    if (isPractice && playerTeam.length === 0) {
      // Training mode — still loading player team from backpack
      return (
        <div className="relative w-full h-[100dvh] bg-[var(--color-bg-base)] flex items-center justify-center">
          <p className="text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)]">加载蛐蛐...</p>
        </div>
      );
    }
    if (!isPractice) {
    return (
      <div className="relative w-full h-[100dvh] bg-[var(--color-bg-base)]">
        <TopBar title="对战" backHref="/" />
        <LoadingOverlay visible message="加载战斗数据..." />
      </div>
    );
    }
  }

  const spiritColorMy = currentMySpirit >= 150 ? "#c5a059" : currentMySpirit >= 100 ? "#8a7040" : "#5a4830";
  const spiritColorEnemy = currentEnemySpirit >= 150 ? "#c5a059" : currentEnemySpirit >= 100 ? "#8a7040" : "#5a4830";
  const spiritPctMy = Math.min((currentMySpirit / 200) * 100, 100);
  const spiritPctEnemy = Math.min((currentEnemySpirit / 200) * 100, 100);

  const myCricketClass = showDamage?.target === "me" ? "brightness-150" : lastMyAction ? "brightness-110" : "opacity-90";
  const enemyCricketClass = showDamage?.target === "enemy" ? "brightness-150" : lastEnemyAction ? "brightness-110" : "opacity-90";
  const myAnimClass = showDamage?.target === "me" ? "shake 0.4s ease-out" : lastMyAction ? "shake 0.3s ease-out" : "idle-float 2.5s ease-in-out infinite";
  const enemyAnimClass = showDamage?.target === "enemy" ? "shake 0.4s ease-out" : lastEnemyAction ? "shake 0.3s ease-out" : "idle-float 2.5s ease-in-out infinite";

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden">
      <Image src="/assets/backgrounds/bg-battle.webp" alt="" fill unoptimized className="object-cover" priority />
      <div className="absolute inset-0 bg-[var(--color-bg-base)]/60" />
      <TopBar
        title={isPractice ? `训练(${BATTLE_MODE_LABELS[BATTLE_MODE]})` : `对战·${BATTLE_MODE_LABELS[BATTLE_MODE]}`}
        rightWide
        rightSlot={<span className="text-[11px] text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)]">第{(isPractice ? trainRoundCount : roundCount)}回合</span>}
        backHref="/"
      />

      {/* 对手信息 */}
      <div className="absolute top-[54px] left-0 right-0 z-10 border-b border-[var(--color-gold)]/8 bg-[var(--color-bg-base)]/90 backdrop-blur-sm">
        <InfoBar label="敌" name={enemyCricket?.name || "..."} title={enemyCricket?.title || ""} tier={enemyCricket?.tier || "common"}
          hp={currentEnemyHp} maxHp={enemyCricket?.maxHp || 100} stamina={currentEnemyStamina} maxStamina={enemyCricket?.maxStamina || 100} spirit={currentEnemySpirit} />
      </div>

      {/* 对手待战区 */}
      <div className="absolute top-[106px] left-0 right-0 z-10">
        <div className="flex justify-center gap-2 px-4">
          {enemyTeamArr.map((c: Cricket, i: number) => (
            <BenchCard key={c.id} cricket={c} status={i === enemyCurrentIdx ? "fighting" : i < enemyCurrentIdx ? "defeated" : "waiting"} flipped />
          ))}
        </div>
      </div>

      {/* 对战区 */}
      <div className="absolute top-[208px] bottom-[182px] left-0 right-0 z-5 flex items-center justify-center overflow-hidden">
        <div className="relative w-[450px] h-[450px] flex items-center justify-center">
          <Image src="/assets/ui/arena/arena-circle.png" alt="" width={450} height={450} unoptimized className="absolute" />
          <div className="absolute inset-0 transition-transform duration-[0.3s] ease-in-out" style={{ transform: "rotate(" + axisAngle + "deg)" }}>

            {/* 敌方蛐蛐 */}
            <div className="absolute left-[80px] top-1/2 transition-transform duration-[0.3s] ease-in-out" style={{ transform: "translateY(-50%) translateX(" + enemyOffset + "px)" }}>
              <div className="flex flex-col items-center">
                <div className="relative flex flex-col items-center">
                  <div className="flex items-center gap-1 mb-0.5">
                    <div className="w-[44px] h-[5px] rounded-sm overflow-hidden" style={{ backgroundColor: "rgba(197,160,89,0.12)" }}>
                      <div className="h-full rounded-sm transition-all duration-500" style={{ width: spiritPctEnemy + "%", backgroundColor: spiritColorEnemy }} />
                    </div>
                    <span className="text-[8px] text-[var(--color-gold-dim)] leading-none font-[family-name:var(--font-noto-serif)]">{currentEnemySpirit}</span>
                  </div>
                  {showDamage?.target === "enemy" && <div className="absolute -top-5 text-[22px] font-bold font-[family-name:var(--font-noto-serif)] text-[#ffd700] animate-[float-up-fade_0.9s_ease-out_forwards]">{showDamage.dmg}</div>}
                </div>
                <div className="w-[75px] h-[65px] flex items-center justify-center" style={{ animation: enemyAnimClass }}>
                  {enemyCricket && <Image src={getCricketImage(enemyCricket)} alt={enemyCricket.name} width={75} height={65} unoptimized className={"object-contain transition-all duration-200 " + enemyCricketClass} style={{ transform: "rotate(90deg)" }} />}
                </div>
              </div>
            </div>

            {/* 我方蛐蛐 */}
            <div className="absolute right-[80px] top-1/2 transition-transform duration-[0.3s] ease-in-out" style={{ transform: "translateY(-50%) translateX(" + myOffset + "px)" }}>
              <div className="flex flex-col items-center">
                <div className="relative flex flex-col items-center">
                  <div className="flex items-center gap-1 mb-0.5">
                    <div className="w-[44px] h-[5px] rounded-sm overflow-hidden" style={{ backgroundColor: "rgba(197,160,89,0.12)" }}>
                      <div className="h-full rounded-sm transition-all duration-500" style={{ width: spiritPctMy + "%", backgroundColor: spiritColorMy }} />
                    </div>
                    <span className="text-[8px] text-[var(--color-gold-dim)] leading-none font-[family-name:var(--font-noto-serif)]">{currentMySpirit}</span>
                  </div>
                  {showDamage?.target === "me" && <div className="absolute -top-5 text-[22px] font-bold font-[family-name:var(--font-noto-serif)] text-[#e04040] animate-[float-up-fade_0.9s_ease-out_forwards]">{showDamage.dmg}</div>}
                </div>
                <div className="w-[75px] h-[65px] flex items-center justify-center" style={{ animation: myAnimClass }}>
                  {myCricket && <Image src={getCricketImage(myCricket)} alt={myCricket.name} width={75} height={65} unoptimized className={"object-contain transition-all duration-200 " + myCricketClass} style={{ transform: "rotate(-90deg)" }} />}
                </div>
              </div>
            </div>
          </div>

          {/* 播报区 */}
          <div className="absolute bottom-0 left-0 right-0 z-20 h-[100px] px-3 py-1.5 overflow-hidden">
            <div className="h-full flex flex-col justify-end gap-[1px]">
              {battleLog.length === 0 ? (
                <p className="text-[10px] text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)] italic">战斗开始...</p>
              ) : (
                battleLog.slice(-7).map(logItem => (
                  <p key={logItem.id} className="text-[10px] leading-[14px] text-green-400/80 font-[family-name:var(--font-noto-serif)] truncate">{logItem.text}</p>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 自动对战标识 */}
      {pvpPhase === "battling" && (
        <div className="absolute bottom-[155px] left-0 right-0 z-10 flex justify-center">
          <div className="px-4 py-2 rounded-lg border border-[var(--color-gold)]/20 bg-[rgba(197,160,89,0.05)]">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-gold)] animate-pulse mr-2" />
            <span className="text-[13px] text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)]">
              {showRoundEnd ? "回合结束" : waitingForAction ? "即将出招..." : ""}
            </span>
          </div>
        </div>
      )}
      {!isPractice && pvpPhase === "roundEnd" && (
        <div className="absolute bottom-[155px] left-0 right-0 z-10 flex justify-center">
          <div className="px-4 py-2 rounded-lg border border-[var(--color-gold)]/20 bg-[rgba(197,160,89,0.05)]">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-gold)] animate-pulse mr-2" />
            <span className="text-[13px] text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)]">下一局准备中...</span>
          </div>
        </div>
      )}

      {/* 我方待战区 */}
      <div className="absolute bottom-[80px] left-0 right-0 z-10">
          <div className="flex justify-center gap-2 px-4">
            {myTeamArr.map((c: Cricket, i: number) => (
              <BenchCard key={c.id} cricket={c} status={i === myCurrentIdx ? "fighting" : i < myCurrentIdx ? "defeated" : "waiting"} />
            ))}
          </div>
        </div>

      {/* 我方信息条 */}
      <div className="absolute bottom-[34px] left-0 right-0 z-10 border-t border-[var(--color-gold)]/8 bg-[var(--color-bg-base)]/90 backdrop-blur-sm">
        <InfoBar label="我" name={myCricket?.name || "..."} title={myCricket?.title || ""} tier={myCricket?.tier || "common"}
          hp={currentMyHp} maxHp={myCricket?.maxHp || 100} stamina={currentMyStamina} maxStamina={myCricket?.maxStamina || 100} spirit={currentMySpirit} />
      </div>

      {/* 游戏结束 */}
      {isGameOver && (
        <div className="absolute inset-0 z-50 bg-[var(--color-bg-base)]/85 backdrop-blur-sm flex items-center justify-center px-8">
          <div className="w-full max-w-[342px] rounded-2xl border border-[var(--color-gold)]/40 bg-[rgba(20,14,10,0.9)] flex flex-col gap-4 py-8 px-6">
            <div className="text-[56px] font-[family-name:var(--font-ma-shan)] text-[var(--color-gold)] animate-pulse text-center">
              {winnerText === "你" ? "胜" : "败"}
            </div>
            <p className="text-[22px] font-bold text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)] text-center">
              {winnerText === "你" ? "大获全胜！" : "铩羽而归"}
            </p>
            <div className="flex gap-3">
              <a href="/" className="flex-1 h-11 rounded-[10px] border border-[var(--color-gold)]/30 bg-gradient-to-b from-[rgba(30,22,16,0.85)] to-[rgba(20,14,10,0.9)] text-[18px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)] items-center justify-center flex hover:border-[var(--color-gold)]/70 transition-all active:scale-[0.98]">返回大厅</a>
              {isPractice ? (
                <button type="button" onClick={handleRematch} disabled={rematchLoading}
                  className="flex-1 h-11 rounded-[10px] border border-[var(--color-gold)]/30 bg-gradient-to-b from-[rgba(30,22,16,0.85)] to-[rgba(20,14,10,0.9)] text-[18px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)] items-center justify-center flex hover:border-[var(--color-gold)]/70 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">{rematchLoading ? "重开中..." : "再来一局"}</button>
              ) : fromMatch ? (
                <a href="/matchmake" className="flex-1 h-11 rounded-[10px] border border-[var(--color-gold)]/30 bg-gradient-to-b from-[rgba(30,22,16,0.85)] to-[rgba(20,14,10,0.9)] text-[18px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)] items-center justify-center flex hover:border-[var(--color-gold)]/70 transition-all active:scale-[0.98]">再来一局</a>
              ) : (
                <a href={"/room/" + roomId + "?uid=" + myUid} className="flex-1 h-11 rounded-[10px] border border-[var(--color-gold)]/30 bg-gradient-to-b from-[rgba(30,22,16,0.85)] to-[rgba(20,14,10,0.9)] text-[18px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)] items-center justify-center flex hover:border-[var(--color-gold)]/70 transition-all active:scale-[0.98]">再来一局</a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}