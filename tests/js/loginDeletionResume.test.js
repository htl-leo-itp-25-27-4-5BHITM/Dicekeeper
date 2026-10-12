import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LoginView from '../../src/main/resources/META-INF/resources/app/views/LoginView.js';

function response(status, body) {
  return new Response(body == null ? null : JSON.stringify(body), {
    status,
    headers: body == null ? {} : { 'Content-Type': 'application/json' }
  });
}

describe('login deletion recovery', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    sessionStorage.clear();
    window.location.hash = '#/login?kc=1';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders a deletion-resume action and invokes the subject-scoped endpoint', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(409, {
        code: 'ACCOUNT_DELETION_PENDING',
        message: 'provider details must be ignored',
        retryable: true
      }))
      .mockResolvedValueOnce(response(409, {
        code: 'ACCOUNT_DELETION_PENDING',
        message: 'still ignored',
        retryable: true
      }));
    vi.stubGlobal('fetch', fetchMock);

    await LoginView();
    const button = document.getElementById('loginBtn');
    await vi.waitFor(() => expect(button.textContent).toContain('Löschung fortsetzen'));
    expect(document.body.textContent).not.toContain('provider details');

    button.click();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1][0]).toBe('/api/account');
    expect(fetchMock.mock.calls[1][1]).toEqual({ method: 'DELETE' });
  });

  it('keeps ordinary authenticated synchronization unchanged', async () => {
    const player = { id: 42, email: 'user@example.test', username: 'user', name: 'User' };
    vi.stubGlobal('fetch', vi.fn(async () => response(200, player)));
    window.location.hash = '#/login?kc=1&next=%2Fcampaigns';

    await LoginView();
    await vi.waitFor(() => expect(JSON.parse(sessionStorage.getItem('player'))).toEqual(player));
    expect(window.location.hash).toBe('#/campaigns');
  });
});
