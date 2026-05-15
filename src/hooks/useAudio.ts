"use client";

import { useEffect, useState, useCallback } from "react";
import { audioManager } from "@/lib/audio-manager";

type BgmKey = "home" | "market" | "battle" | "victory";

export function useAudio() {
  const [bgmOn, setBgmOn] = useState(true);
  const [sfxOn, setSfxOn] = useState(true);

  useEffect(() => {
    setBgmOn(audioManager.isBgmEnabled());
    setSfxOn(audioManager.isSfxEnabled());
  }, []);

  const playBgm = useCallback((key: BgmKey) => {
    audioManager.playBgm(key);
  }, []);

  const stopBgm = useCallback(() => {
    audioManager.stopBgm();
  }, []);

  const playSfx = useCallback((key: Parameters<typeof audioManager.playSfx>[0]) => {
    audioManager.playSfx(key);
  }, []);

  const toggleBgm = useCallback(() => {
    const on = audioManager.toggleBgm();
    setBgmOn(on);
  }, []);

  const toggleSfx = useCallback(() => {
    const on = audioManager.toggleSfx();
    setSfxOn(on);
  }, []);

  return { bgmOn, sfxOn, playBgm, stopBgm, playSfx, toggleBgm, toggleSfx };
}
