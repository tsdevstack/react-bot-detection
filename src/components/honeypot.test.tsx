'use client';

import { describe, it, expect, rs, afterEach } from '@rstest/core';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { Honeypot, DEFAULT_HONEYPOT_FIELDS } from './honeypot';

afterEach(() => {
  cleanup();
});

describe('Honeypot', () => {
  describe('rendering', () => {
    it('should render without crashing', () => {
      const onBotDetected = rs.fn();
      const { container } = render(<Honeypot onBotDetected={onBotDetected} />);
      expect(container.firstChild).not.toBeNull();
    });

    it('should render hidden fields', () => {
      const onBotDetected = rs.fn();
      render(<Honeypot onBotDetected={onBotDetected} />);

      const hiddenWrapper = document.querySelector('[aria-hidden="true"]');
      expect(hiddenWrapper).not.toBeNull();
    });

    it('should position fields off-screen', () => {
      const onBotDetected = rs.fn();
      render(<Honeypot onBotDetected={onBotDetected} />);

      const hiddenWrapper = document.querySelector(
        '[aria-hidden="true"]',
      ) as HTMLElement;
      expect(hiddenWrapper.style.position).toBe('absolute');
      expect(hiddenWrapper.style.left).toBe('-9999px');
    });

    it('should render all default honeypot fields', () => {
      const onBotDetected = rs.fn();
      render(<Honeypot onBotDetected={onBotDetected} />);

      for (const fieldName of DEFAULT_HONEYPOT_FIELDS) {
        expect(document.querySelector(`[name="${fieldName}"]`)).not.toBeNull();
      }
    });
  });

  describe('bot detection', () => {
    it('should not call onBotDetected when fields are empty', () => {
      const onBotDetected = rs.fn();
      render(<Honeypot onBotDetected={onBotDetected} />);

      expect(onBotDetected).not.toHaveBeenCalled();
    });

    it('should call onBotDetected when any field is filled', async () => {
      const onBotDetected = rs.fn();
      render(<Honeypot onBotDetected={onBotDetected} />);

      const websiteField = document.querySelector(
        '[name="hp_website_url"]',
      ) as HTMLInputElement;

      await act(async () => {
        fireEvent.change(websiteField, { target: { value: 'spam-value' } });
      });

      expect(onBotDetected).toHaveBeenCalledTimes(1);
    });

    it('should trigger on first field filled', async () => {
      const onBotDetected = rs.fn();
      render(<Honeypot onBotDetected={onBotDetected} />);

      const contactField = document.querySelector(
        '[name="hp_contact_info"]',
      ) as HTMLInputElement;

      await act(async () => {
        fireEvent.change(contactField, { target: { value: 'bot@spam.com' } });
      });

      expect(onBotDetected).toHaveBeenCalledTimes(1);
    });

    it('should only trigger once even if multiple fields filled', async () => {
      const onBotDetected = rs.fn();
      render(<Honeypot onBotDetected={onBotDetected} />);

      const websiteField = document.querySelector(
        '[name="hp_website_url"]',
      ) as HTMLInputElement;
      const faxField = document.querySelector(
        '[name="hp_fax_number"]',
      ) as HTMLInputElement;

      await act(async () => {
        fireEvent.change(websiteField, { target: { value: 'spam1' } });
        fireEvent.change(faxField, { target: { value: 'spam2' } });
      });

      expect(onBotDetected).toHaveBeenCalledTimes(1);
    });

    it('should not trigger on whitespace-only input', async () => {
      const onBotDetected = rs.fn();
      render(<Honeypot onBotDetected={onBotDetected} />);

      const websiteField = document.querySelector(
        '[name="hp_website_url"]',
      ) as HTMLInputElement;

      await act(async () => {
        fireEvent.change(websiteField, { target: { value: '   ' } });
      });

      expect(onBotDetected).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have aria-hidden attribute on wrapper', () => {
      const onBotDetected = rs.fn();
      render(<Honeypot onBotDetected={onBotDetected} />);

      const hiddenWrapper = document.querySelector('[aria-hidden="true"]');
      expect(hiddenWrapper).not.toBeNull();
    });

    it('should have tabindex -1 on fields', () => {
      const onBotDetected = rs.fn();
      render(<Honeypot onBotDetected={onBotDetected} />);

      const field = document.querySelector(
        '[name="hp_contact_info"]',
      ) as HTMLInputElement;
      expect(field.tabIndex).toBe(-1);
    });

    it('should have autocomplete new-password on fields to prevent autofill', () => {
      const onBotDetected = rs.fn();
      render(<Honeypot onBotDetected={onBotDetected} />);

      const field = document.querySelector(
        '[name="hp_contact_info"]',
      ) as HTMLInputElement;
      expect(field.getAttribute('autocomplete')).toBe('new-password');
    });

    it('should have password manager ignore attributes', () => {
      const onBotDetected = rs.fn();
      render(<Honeypot onBotDetected={onBotDetected} />);

      const field = document.querySelector(
        '[name="hp_contact_info"]',
      ) as HTMLInputElement;
      expect(field.getAttribute('data-lpignore')).toBe('true');
      expect(field.getAttribute('data-1p-ignore')).toBe('true');
    });
  });

  describe('custom field names', () => {
    it('should use custom field names', () => {
      const onBotDetected = rs.fn();
      render(
        <Honeypot
          onBotDetected={onBotDetected}
          fieldNames={['custom_trap', 'fake_phone']}
        />,
      );

      expect(document.querySelector('[name="custom_trap"]')).not.toBeNull();
      expect(document.querySelector('[name="fake_phone"]')).not.toBeNull();
      // Default fields should not exist
      expect(document.querySelector('[name="email_confirm"]')).toBeNull();
    });

    it('should trigger detection on custom fields', async () => {
      const onBotDetected = rs.fn();
      render(
        <Honeypot onBotDetected={onBotDetected} fieldNames={['my_honeypot']} />,
      );

      const customField = document.querySelector(
        '[name="my_honeypot"]',
      ) as HTMLInputElement;

      await act(async () => {
        fireEvent.change(customField, { target: { value: 'bot-filled' } });
      });

      expect(onBotDetected).toHaveBeenCalled();
    });
  });
});
