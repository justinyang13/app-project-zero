export type CharChoice = 'real' | 'classic';

export interface GameFlags {
  bot: boolean;
  debug: boolean;
  section: number | null;
  mute: boolean;
  char: CharChoice;
}

export function parseFlags(search?: string): GameFlags {
  const urlParams = new URLSearchParams(search ?? window.location.search);

  const charRaw = urlParams.get('char');
  const char: CharChoice = charRaw === 'classic' ? 'classic' : 'real';

  return {
    bot: urlParams.get('bot') === '1',
    debug: urlParams.get('debug') === '1',
    section: urlParams.get('section') ? parseInt(urlParams.get('section')!, 10) : null,
    mute: urlParams.get('mute') === '1',
    char,
  };
}
