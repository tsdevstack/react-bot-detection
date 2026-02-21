'use client';

import React, { useRef, useCallback } from 'react';

/**
 * Default honeypot field names - attractive to bots but NOT to browser autofill.
 *
 * We use prefixed names that:
 * 1. Look like real fields to bots scanning for input names
 * 2. Don't match browser autofill heuristics (email, phone, url, address patterns)
 *
 * The prefix "hp_" makes them unique enough to avoid autofill while
 * the suffixes still look like fields bots want to fill.
 */
export const DEFAULT_HONEYPOT_FIELDS = [
  'hp_contact_info',
  'hp_website_url',
  'hp_fax_number',
  'hp_company_name',
] as const;

export interface HoneypotProps {
  /** Callback when bot is detected (any honeypot field was filled) */
  onBotDetected: () => void;
  /** Custom field names (defaults to email_confirm, website, url, phone_number) */
  fieldNames?: string[];
}

/**
 * Hidden honeypot fields that bots typically fill out.
 *
 * These fields are invisible to humans but visible to bots
 * that parse the DOM looking for form fields to fill.
 *
 * @example
 * ```tsx
 * <Honeypot onBotDetected={() => setIsBot(true)} />
 * ```
 */
export function Honeypot({
  onBotDetected,
  fieldNames = DEFAULT_HONEYPOT_FIELDS as unknown as string[],
}: HoneypotProps): React.ReactElement {
  const hasTriggered = useRef(false);

  const handleFieldChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Trigger detection if any field gets a non-empty value
      if (e.target.value.trim() !== '' && !hasTriggered.current) {
        hasTriggered.current = true;
        onBotDetected();
      }
    },
    [onBotDetected]
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: '-9999px',
        opacity: 0,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      {fieldNames.map((fieldName) => (
        <input
          key={fieldName}
          type="text"
          name={fieldName}
          onChange={handleFieldChange}
          tabIndex={-1}
          // "new-password" is more reliably ignored by autofill than "off"
          autoComplete="new-password"
          aria-hidden="true"
          // Additional anti-autofill: data attribute signals to password managers
          data-lpignore="true"
          data-1p-ignore="true"
        />
      ))}
    </div>
  );
}