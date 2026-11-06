/**
 * Behavioral bot detection thresholds
 */

/** Pointer moves kept for the stats */
export const MAX_POINTER_MOVES = 50;

/** Pointer moves that count as a person using a mouse */
export const MIN_POINTER_MOVES = 5;

/** Focus events a form with two or more fields needs */
export const MIN_FOCUS_EVENTS = 2;

/** Form controls that count as fields (the honeypot sits outside them) */
export const FIELD_SELECTOR =
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select';
