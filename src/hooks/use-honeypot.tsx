'use client';

import React, { useState, useCallback } from 'react';
import { Honeypot } from '../components/honeypot';

export interface UseHoneypotReturn {
  /** Whether a bot has been detected via honeypot */
  isBotDetected: boolean;
  /** Score contribution from honeypot (50 if triggered) */
  botScore: number;
  /** Callback to mark bot as detected */
  handleBotDetected: () => void;
  /** Reset detection state */
  resetDetection: () => void;
  /** Pre-configured Honeypot component */
  HoneypotComponent: () => React.ReactElement;
}

/**
 * Hook for honeypot-based bot detection.
 *
 * Provides a hidden form field that bots typically fill out,
 * allowing detection of automated submissions.
 *
 * @example
 * ```tsx
 * const { HoneypotComponent, isBotDetected } = useHoneypot();
 *
 * return (
 *   <form>
 *     <HoneypotComponent />
 *     {isBotDetected && <p>Bot detected!</p>}
 *   </form>
 * );
 * ```
 */
export function useHoneypot(): UseHoneypotReturn {
  const [isBotDetected, setIsBotDetected] = useState<boolean>(false);
  const [botScore, setBotScore] = useState<number>(0);

  const handleBotDetected = useCallback(() => {
    setIsBotDetected(true);
    setBotScore((prev) => prev + 50); // High penalty for honeypot
  }, []);

  const resetDetection = useCallback(() => {
    setIsBotDetected(false);
    setBotScore(0);
  }, []);

  const HoneypotComponent = useCallback(
    () => <Honeypot onBotDetected={handleBotDetected} />,
    [handleBotDetected]
  );

  return {
    isBotDetected,
    botScore,
    handleBotDetected,
    resetDetection,
    HoneypotComponent,
  };
}