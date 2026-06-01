"use client";

import { useEffect, useState, useCallback } from "react";
import { audioManager } from "@/lib/audio-manager";

type BgmKey = "home" | "market" | "battle" | "victory" | "defeat" | "room";

export function useAudio() {
  const [bgmOn, setBgmOn] = useState(true);
  const [sfxOn, setSfxOn] = useState(true);

  useEffect(() => {
    console.log("[useAudio] init, bgmEnabled:", audioManager.isBgmEnabled());
    setBgmOn(audioManager.isBgmEnabled());
    setSfxOn(audioManager.isSfxEnabled());
  }, []);

  const playBgm = useCallback((key: BgmKey) => {
    console.log("[useAudio] playBgm:", key);
    audioManager.playBgm(key);
  }, []);

  const stopBgm = useCallback(() => {
    console.log("[useAudio] stopBgm");
    audioManager.stopBgm();
  }, []);

  const playSfx = useCallback((key: Parameters<typeof audioManager.playSfx>[0]) => {
    audioManager.playSfx(key);
  }, []);

  const toggleBgm = useCallback(() => {
    console.log("[useAudio] toggleBgm called");
    const on = audioManager.toggleBgm();
    console.log("[useAudio] toggleBgm result:", on);
    setBgmOn(on);
  }, []);

  const toggleSfx = useCallback(() => {
    const on = audioManager.toggleSfx();
    setSfxOn(on);
  }, []);

  return { bgmOn, sfxOn, playBgm, stopBgm, playSfx, toggleBgm, toggleSfx };
}
