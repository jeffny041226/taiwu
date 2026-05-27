/**
 * 音频管理器 — Howler.js 封装
 *
 * BGM 静音策略：mute(true) 比 stop()/unload() 更可靠地压制 Howler.js 播放。
 * 因为 Howler 内部可能因 AudioContext 恢复、loop 重建等边缘情况继续出声。
 */
import { Howl, Howler } from "howler";
import { ASSETS } from "@/config/assets";

type BgmKey = "home" | "market" | "battle" | "victory";
type SfxKey =
  | "heavyHit" | "feint" | "block" | "chirp"
  | "damageTaken" | "cricketDefeat"
  | "roundWin" | "roundLose" | "gameWin" | "gameLose"
  | "buttonClick"
  | "gachaOpen" | "gachaReveal" | "gachaLegendary"
  | "roomJoin" | "ready" | "countdown" | "uiPanel"
  | "cricketAmbient";

class AudioManager {
  private bgmEnabled = true;
  private sfxEnabled = true;
  private bgmVolume = 0.4;
  private sfxVolume = 0.6;
  private currentBgm: Howl | null = null;
  private currentBgmKey: BgmKey | null = null;
  private lastBgmKey: BgmKey | null = null;
  private cache = new Map<string, Howl>();

  private saveState(): void {
    try { localStorage.setItem("audio_bgm", String(this.bgmEnabled)); } catch {}
    try { localStorage.setItem("audio_sfx", String(this.sfxEnabled)); } catch {}
  }

  public loadState(): void {
    try {
      const bgm = localStorage.getItem("audio_bgm");
      if (bgm !== null) this.bgmEnabled = bgm === "true";
      const sfx = localStorage.getItem("audio_sfx");
      if (sfx !== null) this.sfxEnabled = sfx === "true";
    } catch {}
  }

  /** 获取或创建 Howl 实例 (缓存) */
  private getHowl(src: string, options?: { loop?: boolean; volume?: number }): Howl {
    const key = `${src}-${options?.loop ?? false}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const howl = new Howl({
      src: [src],
      loop: options?.loop ?? false,
      volume: options?.volume ?? 1.0,
      preload: true,
    });
    this.cache.set(key, howl);
    return howl;
  }

  // ── BGM ──

  /** 播放背景音乐 */
  playBgm(key: BgmKey): void {
    console.log("[AudioMgr] playBgm:", key, "enabled:", this.bgmEnabled, "current:", this.currentBgmKey, "stopping:", this._stopping);
    if (!this.bgmEnabled || typeof window === "undefined" || this._stopping) return;

    // 用 currentBgmKey 判断，不依赖 playing()（AudioContext suspended 时 playing() 不准确）
    if (this.currentBgmKey === key) {
      console.log("[AudioMgr] playBgm skip (same key):", key);
      return;
    }

    // 停止并销毁所有现有 BGM
    this._muteAllBgm();
    this.currentBgm = null;
    this.currentBgmKey = null;

    this._pendingKey = key;

    if (Howler.ctx?.state !== "running") {
      console.log("[AudioMgr] AudioContext suspended, defer:", key);
      return;
    }

    this._startBgm(key);
  }

  private _pendingKey: BgmKey | null = null;
  /** 标记：stopBgm 是否正在执行中，防止 _resumePending 立即恢复 */
  private _stopping = false;

  /** 静音并销毁所有 BGM Howl（最可靠的停止方式） */
  private _muteAllBgm(): void {
    console.log("[AudioMgr] _muteAllBgm, cache size:", this.cache.size, "currentBgm:", this.currentBgmKey);

    // 标记正在停止，防止 _resumePending 在恢复 AudioContext 时重新播放
    this._stopping = true;

    // 全局静音（最可靠，直接操作 Howler 的全局音量），且不恢复
    // 只有 _startBgm 或 playSfx 显式播放时才恢复
    Howler.volume(0);

    const toDelete: string[] = [];
    for (const [cacheKey, howl] of this.cache.entries()) {
      if (cacheKey.endsWith("-true")) {
        console.log("[AudioMgr] stopping cached:", cacheKey, "playing:", howl.playing());
        try { howl.volume(0); } catch {}
        try { howl.mute(true); } catch {}
        try { howl.stop(); } catch {}
        try { howl.unload(); } catch {}
        toDelete.push(cacheKey);
      }
    }
    for (const key of toDelete) {
      this.cache.delete(key);
    }
    if (this.currentBgm) {
      console.log("[AudioMgr] stopping currentBgm:", this.currentBgmKey, "playing:", this.currentBgm.playing());
      try { this.currentBgm.volume(0); } catch {}
      try { this.currentBgm.mute(true); } catch {}
      try { this.currentBgm.stop(); } catch {}
      try { this.currentBgm.unload(); } catch {}
      this.currentBgm = null;
      this.currentBgmKey = null;
    }

    // 清除 pending key，防止 _resumePending 恢复 BGM
    this._pendingKey = null;

    // 注意：不恢复 Howler.volume(1)，保持全局静音防止延迟恢复
    // 只有 _startBgm/playSfx 显式播放时才恢复

    this._stopping = false;
  }

  /** 实际播放 */
  private _startBgm(key: BgmKey): void {
    console.log("[AudioMgr] _startBgm:", key, "enabled:", this.bgmEnabled, "stopping:", this._stopping);
    if (!this.bgmEnabled || this._stopping) return;

    // 恢复全局音量（_muteAllBgm 设置为 0 了）
    Howler.volume(1);

    const src = ASSETS.audio.bgm[key];
    const howl = this.getHowl(src, { loop: true, volume: this.bgmVolume });

    // 确保这个 Howl 没有被 mute/pause
    howl.mute(false);
    howl.volume(this.bgmVolume);

    if (Howler.ctx?.state !== "running") {
      console.log("[AudioMgr] _startBgm: ctx suspended, defer:", key);
      this._pendingKey = key;
      this.currentBgm = null;
      this.currentBgmKey = null;
      return;
    }

    howl.play();
    this.currentBgm = howl;
    this.currentBgmKey = key;
    this._pendingKey = null;
    console.log("[AudioMgr] _startBgm: playing now:", key, "howl.playing:", howl.playing());
  }

  /** Context 就绪后播放 pending BGM */
  _resumePending(): void {
    console.log("[AudioMgr] _resumePending, pendingKey:", this._pendingKey, "enabled:", this.bgmEnabled, "stopping:", this._stopping, "currentBgmKey:", this.currentBgmKey);
    // 如果正在停止 BGM，不恢复
    if (this._stopping) return;
    // 如果 BGM 已禁用或没有 pending key，不恢复
    if (!this.bgmEnabled || !this._pendingKey) return;
    // 如果已经有 BGM key（说明 BGM 已在播放或已被手动停止），不恢复
    if (this.currentBgmKey) return;
    this._startBgm(this._pendingKey);
  }

  /** 停止背景音乐 */
  stopBgm(): void {
    console.log("[AudioMgr] stopBgm called, pendingKey:", this._pendingKey, "currentBgmKey:", this.currentBgmKey);
    console.log("[AudioMgr] stopBgm - cache contents:", Array.from(this.cache.keys()).join(", "));
    // 清除 pending key，防止 _resumePending 恢复 BGM
    this._pendingKey = null;
    this._muteAllBgm();
    console.log("[AudioMgr] stopBgm - after _muteAllBgm, cache size:", this.cache.size);
    // currentBgm 已经在 _muteAllBgm 中被处理，这里只是确保清空引用
    this.currentBgm = null;
    this.currentBgmKey = null;
    console.log("[AudioMgr] stopBgm done");
  }

  // ── SFX ──

  /** 播放音效 */
  playSfx(key: SfxKey): void {
    if (!this.sfxEnabled || typeof window === "undefined") return;

    // 恢复全局音量（_muteAllBgm 设置为 0 了）
    Howler.volume(1);

    const src = ASSETS.audio.sfx[key];
    if (!src) return;

    const howl = this.getHowl(src, { volume: this.sfxVolume });
    howl.mute(false);
    howl.seek(0);
    howl.play();
  }

  // ── 预加载 / 音量 ──

  preload(key: BgmKey | SfxKey): void {
    const src = ASSETS.audio.bgm[key as BgmKey] || ASSETS.audio.sfx[key as SfxKey];
    if (src) this.getHowl(src);
  }

  setBgmVolume(v: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, v));
    if (this.currentBgm) this.currentBgm.volume(this.bgmVolume);
  }
  setSfxVolume(v: number): void { this.sfxVolume = Math.max(0, Math.min(1, v)); }

  // ── 开关 ──

  enableBgm(): void {
    console.log("[AudioMgr] enableBgm");
    this.bgmEnabled = true;
    this.saveState();
    if (this.lastBgmKey) this.playBgm(this.lastBgmKey);
  }

  disableBgm(): void {
    console.log("[AudioMgr] disableBgm, currentBgmKey:", this.currentBgmKey);
    this.bgmEnabled = false;
    this.saveState();
    this.lastBgmKey = this.currentBgmKey;
    this.stopBgm();
    console.log("[AudioMgr] disableBgm done, bgmEnabled:", this.bgmEnabled);
  }

  enableSfx(): void { this.sfxEnabled = true; this.saveState(); }
  disableSfx(): void { this.sfxEnabled = false; this.saveState(); }
  isBgmEnabled(): boolean { return this.bgmEnabled; }
  isSfxEnabled(): boolean { return this.sfxEnabled; }

  toggleBgm(): boolean {
    console.log("[AudioMgr] toggleBgm, current bgmEnabled:", this.bgmEnabled);
    this.bgmEnabled ? this.disableBgm() : this.enableBgm();
    console.log("[AudioMgr] toggleBgm result, new bgmEnabled:", this.bgmEnabled);
    return this.bgmEnabled;
  }
  toggleSfx(): boolean {
    this.sfxEnabled ? this.disableSfx() : this.enableSfx();
    return this.sfxEnabled;
  }

  // ── 释放 ──

  dispose(): void {
    this.stopBgm();
    this.cache.forEach((h) => h.unload());
    this.cache.clear();
  }
}

export const audioManager = new AudioManager();
audioManager.loadState();

// 首次用户交互：恢复 Context → 播放 pending BGM
let resumed = false;
function initAutoResume(): void {
  if (resumed || typeof window === "undefined") return;
  const handler = () => {
    if (resumed) return;
    resumed = true;
    console.log("[AudioMgr] initAutoResume fired, ctx.state:", Howler.ctx?.state);
    audioManager._resumePending();
    const ctx = Howler.ctx;
    if (ctx?.state === "suspended") {
      ctx.resume().then(() => {
        console.log("[AudioMgr] ctx resumed, calling _resumePending");
        audioManager._resumePending();
      }).catch(() => {});
    }
    document.removeEventListener("click", handler, true);
    document.removeEventListener("touchstart", handler, true);
  };
  document.addEventListener("click", handler, true);
  document.addEventListener("touchstart", handler, true);
}
initAutoResume();
