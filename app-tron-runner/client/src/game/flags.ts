export interface GameFlags {
  bot: boolean;
  debug: boolean;
  section: number | null;
  mute: boolean;
}

export function parseFlags(): GameFlags {
  const urlParams = new URLSearchParams(window.location.search);
  
  return {
    bot: urlParams.get('bot') === '1',
    debug: urlParams.get('debug') === '1',
    section: urlParams.get('section') ? parseInt(urlParams.get('section')!, 10) : null,
    mute: urlParams.get('mute') === '1'
  };
}