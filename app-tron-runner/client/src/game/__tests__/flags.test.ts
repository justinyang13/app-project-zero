import { describe, it, expect } from 'vitest';
import { parseFlags } from '../flags';

describe('flags', () => {
  it('defaults: no bot/debug/section/mute, char=real', () => {
    const f = parseFlags('');
    expect(f.bot).toBe(false);
    expect(f.debug).toBe(false);
    expect(f.section).toBeNull();
    expect(f.mute).toBe(false);
    expect(f.char).toBe('real');
  });

  it('parses bot/debug/section/mute', () => {
    const f = parseFlags('?bot=1&debug=1&section=3&mute=1');
    expect(f.bot).toBe(true);
    expect(f.debug).toBe(true);
    expect(f.section).toBe(3);
    expect(f.mute).toBe(true);
  });

  it('char=classic is honoured', () => {
    expect(parseFlags('?char=classic').char).toBe('classic');
  });

  it('char=real is explicit and unknown values fall back to real', () => {
    expect(parseFlags('?char=real').char).toBe('real');
    expect(parseFlags('?char=bogus').char).toBe('real');
  });

  it('section=0 is kept (not treated as missing)', () => {
    expect(parseFlags('?section=0').section).toBe(0);
  });
});
