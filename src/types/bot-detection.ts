/**
 * Statistics collected during bot detection analysis.
 */
export interface BotDetectionStats {
  mouseMovements: number;
  typingEvents: number;
  focusEvents: number;
  timeSpent: number;
}

/**
 * Result of bot detection analysis combining behavioral analysis and honeypot detection.
 */
export interface BotDetectionResult {
  /** Combined score from all detection methods (0-100+) */
  score: number;
  /** Human-readable reasons for the score */
  reasons: string[];
  /** True if score >= 50 or honeypot was triggered */
  isBot: boolean;
  /** Detailed statistics from behavioral analysis */
  stats: BotDetectionStats;
  /** True if honeypot field was filled */
  honeypotTriggered: boolean;
}

/**
 * Props for custom button components used in BotProtectedForm.
 */
export interface ButtonComponentProps {
  type: 'submit';
  disabled: boolean;
  className?: string;
  children: React.ReactNode;
}