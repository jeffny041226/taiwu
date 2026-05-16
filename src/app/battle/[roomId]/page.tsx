"use client";

import Image from "next/image";
import { useState, useCallback, useEffect, useRef, use } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { LoadingOverlay } from "@/components/game/LoadingOverlay";
import { calcRoundResult, type CricketBattleState } from "@/lib/battle-calc";
import { BLOCK_REDUCTION, AUTO_READY_DELAY } from "@/config/game";

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
const ACTION_COLORS: Record<Action, string> = { heavy_strike: "#8b3030", feint: "#6a3070", block: "#3050a0", chirp: "#307030" };

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
  const myUid = searchParams.get("uid") || "";
  const fromMatch = searchParams.get("from") === "match";

  const wsRef = useRef<WebSocket | null>(null);

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

  // ── 训练状态 ──
  const [aiTeam] = useState(TRAIN_AI_TEAM);
  const [playerTeam] = useState(TRAIN_PLAYER_TEAM);
  const [currentAiIdx, setCurrentAiIdx] = useState(0);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [trainRoundCount, setTrainRoundCount] = useState(0);
  const [trainGameOver, setTrainGameOver] = useState(false);
  const [trainWinner, setTrainWinner] = useState("");
  const [trainAttacking, setTrainAttacking] = useState(false);

  // ── 共享 UI 状态 ──
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

  // ── PVP: WS 消息处理 (使用回调 refs 避免 TSX 模板字面量解析问题) ──
  const stateRefs = useRef({
    myTeam: [] as Cricket[], enemyTeam: [] as Cricket[],
    myIdx: 0, enemyIdx: 0, myHp: 0, myStamina: 0, mySpirit: 0,
    enemyHp: 0, enemyStamina: 0, enemySpirit: 0,
    roundCount: 0, waitingForAction: false,
  });

  // 同步 refs 到 state
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

  const handlePvpMessage = useCallback((data: string) => {
    try {
      const msg = JSON.parse(data);
      const s = stateRefs.current;

      // 收到蛐蛐战斗数据
      if (msg.type === "battle:data") {
        const d = msg.payload as { myCrickets: Cricket[], enemyCrickets: Cricket[], myIdx: number, enemyIdx: number, myScore: number, enemyScore: number, battleMode?: string };
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
        return;
      }

      // 收到回合结算 (视角已由服务端转换)
      if (msg.type === "battle:roundResult") {
        const r = msg.payload as {
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
        setLastMyAction(r.myAction);
        setLastEnemyAction(r.enemyAction);
        setWaitingForAction(false);

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
          // myBlocked: 敌方格挡了我的攻击
          if (r.myBlocked) {
            const pct = Math.round(BLOCK_REDUCTION[r.myAction === "heavy_strike" ? "vs_heavy_strike" : "vs_feint"] * 100);
            addLog(enemyName + " 格挡，减免 " + pct + "% 伤害");
          }
          // enemyBlocked: 我方格挡了敌方攻击
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
          setTimeout(() => setShowDamage(null), 900);
        }, 400);

        setTimeout(() => {
          setMyOffset(0); setEnemyOffset(0);
          const angle = (Math.random() < 0.5 ? 1 : -1) * (20 + Math.random() * 70);
          setAxisAngle(Math.round(angle));
        }, 800);

        setRoundCount(c => c + 1);

        setTimeout(() => {
          setLastMyAction(null); setLastEnemyAction(null);
          setShowDamage(null);
          if (!r.myDefeated && !r.enemyDefeated) {
            setShowRoundEnd(true);
            setTimeout(() => {
              setShowRoundEnd(false);
              setWaitingForAction(true);
            }, 800);
          }
        }, 1200);
        return;
      }

      // 局间
      if (msg.type === "battle:roundWin") {
        setPvpPhase("roundEnd");
        setWaitingForAction(false);
        const r = msg.payload as { winner: string; myScore: number; enemyScore: number; defeatedCricket: { side: string; name: string; title: string } | null };
        const iWon = r.winner === "me";
        addLog((iWon ? "我方" : "对方") + "赢得本局！比分 " + r.myScore + ":" + r.enemyScore);
        if (r.defeatedCricket) addLog(r.defeatedCricket.name + " 战败");
        return;
      }

      // 终局
      if (msg.type === "battle:gameOver") {
        setPvpPhase("finished");
        const r = msg.payload as { winner: string; myScore: number; enemyScore: number; reason?: string };
        setPvpGameOver({ winner: r.winner, myScore: r.myScore, enemyScore: r.enemyScore });
        return;
      }

      // 败阵换蛐蛐
      if (msg.type === "battle:cricketChange") {
        const r = msg.payload as { myCricket: Cricket; enemyCricket: Cricket; myIdx: number; enemyIdx: number };
        setMyIdx(r.myIdx); setEnemyIdx(r.enemyIdx);
        setMyHp(r.myCricket.hp); setMyStamina(r.myCricket.stamina); setMySpirit(r.myCricket.spirit);
        setEnemyHp(r.enemyCricket.hp); setEnemyStamina(r.enemyCricket.stamina); setEnemySpirit(r.enemyCricket.spirit);
        addLog("换蛐蛐: 我方->" + r.myCricket.name + " 对方->" + r.enemyCricket.name);
        setPvpPhase("battling");
        setWaitingForAction(true);
        return;
      }

      if (msg.type === "room:error") addLog("错误: " + String(msg.payload.message));
    } catch {}
  }, [addLog]);

  // ── PVP: 连接 WS ──
  useEffect(() => {
    if (isPractice || !myUid) return;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const envHost = process.env.NEXT_PUBLIC_WS_HOST;
    const host = (envHost && envHost !== "localhost") ? envHost : window.location.hostname;
    const port = process.env.NEXT_PUBLIC_WS_PORT || "3001";
    const wsUrl = protocol + "://" + host + ":" + port + "/ws/battle";
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "room:join", payload: { roomId: roomId.toUpperCase(), uid: myUid, nickName: "玩家" } }));
    };
    ws.onmessage = (e) => handlePvpMessage(e.data);

    return () => { ws.close(); };
  }, [isPractice, myUid, roomId, handlePvpMessage]);

  // ── PVP: 发送动作 ──
  const sendAction = (action: Action) => {
    if (!waitingForAction || !wsRef.current) return;
    setWaitingForAction(false);
    wsRef.current.send(JSON.stringify({
      type: "battle:action",
      payload: { roomId: roomId.toUpperCase(), uid: myUid, action },
    }));
  };

  // 自动发送随机动作
  useEffect(() => {
    if (!isPractice && pvpPhase === "battling" && waitingForAction) {
      const actions: Action[] = ["heavy_strike", "feint", "block", "chirp"];
      const timer = setTimeout(() => sendAction(actions[Math.floor(Math.random() * 4)]), 1500);
      return () => clearTimeout(timer);
    }
  }, [isPractice, pvpPhase, waitingForAction, roundCount]);

  // 局间自动继续
  useEffect(() => {
    if (!isPractice && pvpPhase === "roundEnd") {
      const timer = setTimeout(() => sendNextRound(), AUTO_READY_DELAY);
      return () => clearTimeout(timer);
    }
  }, [isPractice, pvpPhase, roundCount]);

  // ── PVP: 局间下一局 ──
  const sendNextRound = () => {
    wsRef.current?.send(JSON.stringify({
      type: "battle:nextRound",
      payload: { roomId: roomId.toUpperCase(), uid: myUid },
    }));
  };

  // ── 训练模式执行回合 ──
  const ai = aiTeam[currentAiIdx];
  const player = playerTeam[currentPlayerIdx];
  const [trainAiHp, setTrainAiHp] = useState(ai.hp);
  const [trainAiStamina, setTrainAiStamina] = useState(ai.stamina);
  const [trainAiSpirit, setTrainAiSpirit] = useState(ai.spirit);
  const [trainPlayerHp, setTrainPlayerHp] = useState(player.hp);
  const [trainPlayerStamina, setTrainPlayerStamina] = useState(player.stamina);
  const [trainPlayerSpirit, setTrainPlayerSpirit] = useState(player.spirit);

  useEffect(() => { setTrainAiHp(ai.hp); setTrainAiStamina(ai.stamina); setTrainAiSpirit(ai.spirit); }, [ai]);
  useEffect(() => { setTrainPlayerHp(player.hp); setTrainPlayerStamina(player.stamina); setTrainPlayerSpirit(player.spirit); }, [player]);

  const executeRound = useCallback((pAction: Action) => {
    setTrainAttacking(true);
    const aAction = aiAction();

    const pState: CricketBattleState = { attack: player.attack, defense: player.defense, speed: player.speed, maxHp: player.maxHp, hp: trainPlayerHp, stamina: trainPlayerStamina, spirit: trainPlayerSpirit, trait: player.trait };
    const aState: CricketBattleState = { attack: ai.attack, defense: ai.defense, speed: ai.speed, maxHp: ai.maxHp, hp: trainAiHp, stamina: trainAiStamina, spirit: trainAiSpirit, trait: ai.trait };
    const result = calcRoundResult(pState, aState, pAction, aAction);

    setMyOffset(-55); setEnemyOffset(55);
    addLog("--- 第" + (trainRoundCount + 1) + "回合 ---");
    addLog(player.name + " -> " + ACTION_LABEL[pAction]);
    addLog(ai.name + " -> " + ACTION_LABEL[aAction]);

    setTimeout(() => {
      if (result.attackerResult.damage > 0) {
        setShowDamage({ dmg: -result.attackerResult.damage, target: "enemy" });
        setTrainAiHp(h => Math.max(0, h - result.attackerResult.damage));
        addLog(player.name + " 造成 " + result.attackerResult.damage + " 伤害" + (result.attackerResult.counterApplied > 1 ? " (克制x" + result.attackerResult.counterApplied + ")" : ""));
      }
      if (result.defenderResult.damage > 0) {
        setShowDamage({ dmg: -result.defenderResult.damage, target: "me" });
        setTrainPlayerHp(h => Math.max(0, h - result.defenderResult.damage));
        addLog(ai.name + " 造成 " + result.defenderResult.damage + " 伤害" + (result.defenderResult.counterApplied > 1 ? " (克制x" + result.defenderResult.counterApplied + ")" : ""));
      }
      if (result.attackerResult.isBlocked) {
        const pct = Math.round(BLOCK_REDUCTION[pAction === "heavy_strike" ? "vs_heavy_strike" : "vs_feint"] * 100);
        addLog(ai.name + " 格挡，减免 " + pct + "% 伤害");
      }
      if (result.defenderResult.isBlocked) {
        const pct = Math.round(BLOCK_REDUCTION[aAction === "heavy_strike" ? "vs_heavy_strike" : "vs_feint"] * 100);
        addLog(player.name + " 格挡，减免 " + pct + "% 伤害");
      }
      if (result.attackerResult.staminaDelta) addLog(player.name + " 耐力 " + (result.attackerResult.staminaDelta > 0 ? "+" : "") + result.attackerResult.staminaDelta);
      if (result.defenderResult.staminaDelta) addLog(ai.name + " 耐力 " + (result.defenderResult.staminaDelta > 0 ? "+" : "") + result.defenderResult.staminaDelta);
      if (result.attackerResult.spiritDelta) addLog(player.name + " 斗性 " + (result.attackerResult.spiritDelta > 0 ? "+" : "") + result.attackerResult.spiritDelta);
      if (result.defenderResult.spiritDelta) addLog(ai.name + " 斗性 " + (result.defenderResult.spiritDelta > 0 ? "+" : "") + result.defenderResult.spiritDelta);
      setTimeout(() => setShowDamage(null), 900);
    }, 400);

    setTimeout(() => {
      setMyOffset(0); setEnemyOffset(0);
      const a = (Math.random() < 0.5 ? 1 : -1) * (20 + Math.random() * 70);
      setAxisAngle(Math.round(a));
    }, 800);
    setTrainRoundCount(c => c + 1);
    setTimeout(() => { setLastMyAction(null); setLastEnemyAction(null); setShowDamage(null); setTrainAttacking(false); }, 1200);
  }, [player, ai, trainPlayerHp, trainAiHp, trainPlayerStamina, trainAiStamina, trainPlayerSpirit, trainAiSpirit, trainRoundCount]);

  useEffect(() => {
    if (trainGameOver || trainAttacking || !isPractice) return;
    const t = setTimeout(() => executeRound(["heavy_strike", "feint", "block", "chirp"][Math.floor(Math.random() * 4)] as Action), 1500);
    return () => clearTimeout(t);
  }, [trainGameOver, trainAttacking, trainRoundCount, executeRound, isPractice]);

  useEffect(() => {
    if (trainAiHp <= 0 && isPractice) {
      const next = currentAiIdx + 1;
      if (next >= aiTeam.length) { setTrainGameOver(true); setTrainWinner("你"); }
      else setCurrentAiIdx(next);
    }
  }, [trainAiHp, currentAiIdx, aiTeam, isPractice]);

  useEffect(() => {
    if (trainPlayerHp <= 0 && isPractice) {
      const next = currentPlayerIdx + 1;
      if (next >= playerTeam.length) { setTrainGameOver(true); setTrainWinner("AI"); }
      else setCurrentPlayerIdx(next);
    }
  }, [trainPlayerHp, currentPlayerIdx, playerTeam, isPractice]);

  // ── 当前蛐蛐 ──
  const myCricket = isPractice ? playerTeam[currentPlayerIdx] : myTeam[myIdx];
  const enemyCricket = isPractice ? aiTeam[currentAiIdx] : enemyTeam[enemyIdx];
  const currentMyHp = isPractice ? trainPlayerHp : myHp;
  const currentMyStamina = isPractice ? trainPlayerStamina : myStamina;
  const currentMySpirit = isPractice ? trainPlayerSpirit : mySpirit;
  const currentEnemyHp = isPractice ? trainAiHp : enemyHp;
  const currentEnemyStamina = isPractice ? trainAiStamina : enemyStamina;
  const currentEnemySpirit = isPractice ? trainAiSpirit : enemySpirit;
  const myTeamArr = isPractice ? playerTeam : myTeam;
  const enemyTeamArr = isPractice ? aiTeam : enemyTeam;
  const myCurrentIdx = isPractice ? currentPlayerIdx : myIdx;
  const enemyCurrentIdx = isPractice ? currentAiIdx : enemyIdx;
  const isGameOver = isPractice ? trainGameOver : pvpPhase === "finished";
  const winnerText = isPractice ? trainWinner : (pvpGameOver?.winner === "me" ? "你" : "对方");

  if (!myCricket && !isPractice) {
    return (
      <div className="relative w-full h-[100dvh] bg-[var(--color-bg-base)]">
        <TopBar title="对战" backHref="/" />
        <LoadingOverlay visible message="加载战斗数据..." />
      </div>
    );
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
        title={isPractice ? "训练模式" : "对战"}
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

      {/* PVP: 自动对战标识 */}
      {!isPractice && pvpPhase === "battling" && (
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
              {fromMatch ? (
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