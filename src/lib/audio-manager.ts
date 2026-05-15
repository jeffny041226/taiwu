/**
 * 音频管理器 — Howler.js 封装
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
  private cache = new Map<string, Howl>();

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

  /** 播放背景音乐 */
  playBgm(key: BgmKey, fadeIn = 2000): void {
    if (!this.bgmEnabled || typeof window === "undefined") return;
    if (this.currentBgmKey === key && this.currentBgm?.playing()) return;

    // 停止当前 BGM
    if (this.currentBgm) {
      this.currentBgm.fade(this.currentBgm.volume(), 0, 800);
      setTimeout(() => this.currentBgm?.stop(), 800);
    }

    const src = ASSETS.audio.bgm[key];
    const howl = this.getHowl(src, { loop: true, volume: 0 });
    howl.play();
    howl.fade(0, this.bgmVolume, fadeIn);
    this.currentBgm = howl;
    this.currentBgmKey = key;
  }

  /** 停止背景音乐 */
  stopBgm(fadeOut = 1000): void {
    if (this.currentBgm) {
      this.currentBgm.fade(this.currentBgm.volume(), 0, fadeOut);
      setTimeout(() => {
        this.currentBgm?.stop();
        this.currentBgm = null;
        this.currentBgmKey = null;
      }, fadeOut);
    }
  }

  /** 播放音效 */
  playSfx(key: SfxKey): void {
    if (!this.sfxEnabled || typeof window === "undefined") return;

    const src = ASSETS.audio.sfx[key];
    if (!src) return;

    const howl = this.getHowl(src, { volume: this.sfxVolume });
    howl.seek(0);
    howl.play();
  }

  /** 预加载音频 */
  preload(key: BgmKey | SfxKey): void {
    const src = ASSETS.audio.bgm[key as BgmKey] || ASSETS.audio.sfx[key as SfxKey];
    if (src) this.getHowl(src);
  }

  setBgmVolume(v: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, v));
    if (this.currentBgm) this.currentBgm.volume(this.bgmVolume);
  }
  setSfxVolume(v: number): void { this.sfxVolume = Math.max(0, Math.min(1, v)); }

  enableBgm(): void { this.bgmEnabled = true; }
  disableBgm(): void { this.bgmEnabled = false; this.stopBgm(); }
  enableSfx(): void { this.sfxEnabled = true; }
  disableSfx(): void { this.sfxEnabled = false; }
  isBgmEnabled(): boolean { return this.bgmEnabled; }
  isSfxEnabled(): boolean { return this.sfxEnabled; }

  toggleBgm(): boolean {
    this.bgmEnabled ? this.disableBgm() : this.enableBgm();
    return this.bgmEnabled;
  }
  toggleSfx(): boolean {
    this.sfxEnabled ? this.disableSfx() : this.enableSfx();
    return this.sfxEnabled;
  }

  /** 释放所有缓存 */
  dispose(): void {
    this.stopBgm(0);
    this.cache.forEach((h) => h.unload());
    this.cache.clear();
  }
}

export const audioManager = new AudioManager();
