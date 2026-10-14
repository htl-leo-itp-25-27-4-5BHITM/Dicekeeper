import { describe, expect, it, vi } from 'vitest';

import {
  LIVE_STATUS_CONTENT,
  createHeadlessLiveStatus,
  createLiveStatus
} from '../../src/main/resources/META-INF/resources/app/components/liveStatus.js';

describe('accessible live status', () => {
  it('renders every state as visible live-region text without color-only meaning', () => {
    document.body.innerHTML = '<div id="status"></div>';
    const status = createLiveStatus('status');
    const element = document.getElementById('status');

    for (const [state, content] of Object.entries(LIVE_STATUS_CONTENT)) {
      status.setState(state);
      expect(element.dataset.state).toBe(state);
      expect(element.textContent).toContain(content.label);
      expect(element.getAttribute('role')).toBe('status');
      expect(element.getAttribute('aria-live')).toBe('polite');
    }
  });

  it('uses keyboard-operable buttons for recovery actions', () => {
    document.body.innerHTML = '<div id="status"></div>';
    const onReauthenticate = vi.fn();
    const onRetry = vi.fn();
    const status = createLiveStatus('status', { onReauthenticate, onRetry });

    status.setState('reauthenticating');
    const login = document.querySelector('[data-live-status-action="reauthenticate"]');
    expect(login.tagName).toBe('BUTTON');
    login.focus();
    login.click();
    expect(onReauthenticate).toHaveBeenCalledOnce();

    status.setState('unavailable');
    const retry = document.querySelector('[data-live-status-action="retry"]');
    expect(retry.tagName).toBe('BUTTON');
    retry.focus();
    retry.click();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('recovers without rendering anything when headless', () => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    const onReauthenticate = vi.fn();
    const onRetry = vi.fn();
    const status = createHeadlessLiveStatus({ onReauthenticate, onRetry, retryDelayMs: 1000 });

    status.setState('reauthenticating');
    expect(onReauthenticate).toHaveBeenCalledOnce();

    status.setState('unavailable');
    vi.advanceTimersByTime(1000);
    expect(onRetry).toHaveBeenCalledOnce();

    status.setState('unavailable');
    status.destroy();
    vi.advanceTimersByTime(1000);
    expect(onRetry).toHaveBeenCalledOnce();
    expect(document.body.innerHTML).toBe('');
    vi.useRealTimers();
  });
});
