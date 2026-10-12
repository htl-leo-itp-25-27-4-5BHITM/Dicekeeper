import { describe, expect, it, vi } from 'vitest';

import {
  parseAccountDeletionError,
  requestAccountDeletion,
  runAccountDeletionFlow
} from '../../src/main/resources/META-INF/resources/app/services/accountDeletion.js';

const jsonResponse = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' }
});

describe('account deletion error parsing', () => {
  it('maps known structured responses to fixed localized text', async () => {
    const result = await parseAccountDeletionError(jsonResponse(409, {
      code: 'ACCOUNT_DELETION_PENDING',
      message: '<script>provider controlled</script>',
      retryable: true
    }));

    expect(result.code).toBe('ACCOUNT_DELETION_PENDING');
    expect(result.retryable).toBe(true);
    expect(result.message).toBe('Der Account konnte noch nicht vollständig gelöscht werden. Bitte erneut versuchen.');
    expect(result.message).not.toContain('provider controlled');
  });

  it.each([
    ['malformed JSON', new Response('{oops', { status: 503, headers: { 'Content-Type': 'application/json' } })],
    ['plain text', new Response('upstream failure', { status: 503, headers: { 'Content-Type': 'text/plain' } })],
    ['HTML', new Response('<!DOCTYPE html><title>Cloudflare 502</title><pre>stack trace</pre>', {
      status: 502,
      headers: { 'Content-Type': 'text/html' }
    })],
    ['unknown code', jsonResponse(500, { code: 'PROVIDER_SECRET_ERROR', message: 'secret', retryable: false })]
  ])('uses a fixed generic message for %s', async (_label, response) => {
    const result = await parseAccountDeletionError(response);
    expect(result.message).toBe('Die Account-Löschung ist derzeit nicht verfügbar. Bitte später erneut versuchen.');
    expect(result.message).not.toMatch(/Cloudflare|DOCTYPE|stack trace|secret/i);
  });

  it('rejects an oversized JSON response before parsing it', async () => {
    const response = jsonResponse(500, {
      code: 'ACCOUNT_DELETION_FAILED',
      message: 'x'.repeat(5000),
      retryable: true
    });
    const result = await parseAccountDeletionError(response);
    expect(result.code).toBe('ACCOUNT_DELETION_UNAVAILABLE');
  });

  it('maps a network failure without exposing exception text', async () => {
    const result = await requestAccountDeletion(async () => {
      throw new Error('connect ECONNREFUSED internal-host');
    });
    expect(result.retryable).toBe(true);
    expect(result.message).not.toContain('ECONNREFUSED');
  });
});

describe('profile account deletion action', () => {
  const button = () => {
    const element = document.createElement('button');
    element.textContent = 'Account endgültig löschen';
    return element;
  };

  it('preserves confirmation and does not request deletion when cancelled', async () => {
    const fetchImpl = vi.fn();
    const result = await runAccountDeletionFlow({
      confirmFn: () => null,
      fetchImpl,
      button: button()
    });
    expect(result.cancelled).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('completes only after a 204 response', async () => {
    const complete = vi.fn();
    const result = await runAccountDeletionFlow({
      confirmFn: () => 'LÖSCHEN',
      fetchImpl: vi.fn(async () => new Response(null, { status: 204 })),
      button: button(),
      onComplete: complete
    });
    expect(result.ok).toBe(true);
    expect(complete).toHaveBeenCalledOnce();
  });

  it.each([409, 503])('restores the control for structured retryable HTTP %s', async status => {
    const control = button();
    const statusSpy = vi.fn();
    const result = await runAccountDeletionFlow({
      confirmFn: () => 'LÖSCHEN',
      fetchImpl: vi.fn(async () => jsonResponse(status, {
        code: status === 409 ? 'ACCOUNT_DELETION_PENDING' : 'ACCOUNT_DELETION_UNAVAILABLE',
        message: 'ignored',
        retryable: true
      })),
      button: control,
      onStatus: statusSpy
    });
    expect(result.retryable).toBe(true);
    expect(control.disabled).toBe(false);
    expect(control.textContent).toBe('Account endgültig löschen');
    expect(statusSpy.mock.calls[0][0]).not.toBe('ignored');
  });

  it.each([
    ['network failure', async () => { throw new Error('private endpoint'); }],
    ['proxy HTML', async () => new Response('<!DOCTYPE html><title>Cloudflare</title>', {
      status: 502,
      headers: { 'Content-Type': 'text/html' }
    })]
  ])('shows fixed retry guidance for %s', async (_label, fetchImpl) => {
    const control = button();
    const statusSpy = vi.fn();
    await runAccountDeletionFlow({
      confirmFn: () => 'LÖSCHEN',
      fetchImpl,
      button: control,
      onStatus: statusSpy
    });
    expect(control.disabled).toBe(false);
    expect(statusSpy.mock.calls[0][0]).not.toMatch(/DOCTYPE|Cloudflare|private endpoint/i);
  });
});
