import { describe, expect, it } from 'vitest';

import { sanitizeRedirectPath } from '../../src/main/resources/META-INF/resources/app/services/auth.js';

describe('static client module smoke test', () => {
  it('imports an ES module and sanitizes an application route', () => {
    expect(sanitizeRedirectPath('/campaign/42/play')).toBe('/campaign/42/play');
  });
});
