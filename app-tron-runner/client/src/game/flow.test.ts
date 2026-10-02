import { describe, expect, it } from 'vitest';
import {
  canDo,
  initialFlow,
  transition,
  type FlowAction,
  type FlowState,
} from './flow';

const act = (s: FlowState, a: FlowAction): FlowState => transition(s, a);

describe('flow state machine', () => {
  it('starts on the title screen with no effects', () => {
    expect(initialFlow.state).toBe('title');
    expect(initialFlow.retries).toBe(0);
    expect(initialFlow.resetRun).toBe(false);
    expect(initialFlow.startCountdown).toBe(false);
  });

  it('title -> countdown -> playing on Enter then countdown done', () => {
    let s = act(initialFlow, { type: 'start' });
    expect(s.state).toBe('countdown');
    expect(s.resetRun).toBe(true);
    expect(s.startCountdown).toBe(true);
    expect(s.hideHud).toBe(true);

    s = act(s, { type: 'countdownDone' });
    expect(s.state).toBe('playing');
    expect(s.showHud).toBe(true);
    expect(s.hideHud).toBe(false);
    expect(s.startCountdown).toBe(false);
  });

  it('playing <-> paused via pause/resume', () => {
    let s = act(initialFlow, { type: 'start' });
    s = act(s, { type: 'countdownDone' });
    expect(s.state).toBe('playing');

    s = act(s, { type: 'pause' });
    expect(s.state).toBe('paused');
    expect(s.resetRun).toBe(false);

    s = act(s, { type: 'resume' });
    expect(s.state).toBe('playing');
    expect(s.showHud).toBe(true);
  });

  it('playing -> gameover on hit, hides HUD', () => {
    let s = act(initialFlow, { type: 'start' });
    s = act(s, { type: 'countdownDone' });
    s = act(s, { type: 'hit' });
    expect(s.state).toBe('gameover');
    expect(s.hideHud).toBe(true);
  });

  it('playing -> victory on finish, hides HUD', () => {
    let s = act(initialFlow, { type: 'start' });
    s = act(s, { type: 'countdownDone' });
    s = act(s, { type: 'finish' });
    expect(s.state).toBe('victory');
    expect(s.hideHud).toBe(true);
  });

  it('gameover/victory -> countdown on R (restart)', () => {
    let s = act(initialFlow, { type: 'start' });
    s = act(s, { type: 'countdownDone' });
    s = act(s, { type: 'hit' });
    expect(s.state).toBe('gameover');

    s = act(s, { type: 'restart' });
    expect(s.state).toBe('countdown');
    expect(s.resetRun).toBe(true);
    expect(s.startCountdown).toBe(true);
    expect(s.retries).toBe(1);

    // victory path
    let v = act(initialFlow, { type: 'start' });
    v = act(v, { type: 'countdownDone' });
    v = act(v, { type: 'finish' });
    v = act(v, { type: 'restart' });
    expect(v.state).toBe('countdown');
    expect(v.retries).toBe(1);
  });

  it('R on pause also restarts into countdown', () => {
    let s = act(initialFlow, { type: 'start' });
    s = act(s, { type: 'countdownDone' });
    s = act(s, { type: 'pause' });
    s = act(s, { type: 'restart' });
    expect(s.state).toBe('countdown');
    expect(s.resetRun).toBe(true);
  });

  it('ignores illegal actions and clears stale effects', () => {
    // hit on title is illegal
    const s = act(initialFlow, { type: 'hit' });
    expect(s.state).toBe('title');
    expect(s.resetRun).toBe(false);
    expect(s.startCountdown).toBe(false);

    // resume on title is illegal
    const t = act(initialFlow, { type: 'resume' });
    expect(t.state).toBe('title');

    // start during countdown is illegal (no double countdown)
    let c = act(initialFlow, { type: 'start' });
    const c2 = act(c, { type: 'start' });
    expect(c2.state).toBe('countdown');
    expect(c2.startCountdown).toBe(false); // effect cleared, not re-triggered

    // pause during countdown is illegal
    const c3 = act(c, { type: 'pause' });
    expect(c3.state).toBe('countdown');

    // restart on title is illegal
    const t2 = act(initialFlow, { type: 'restart' });
    expect(t2.state).toBe('title');
    expect(t2.retries).toBe(0);
  });

  it('canDo reflects the legal action table', () => {
    expect(canDo('title', 'start')).toBe(true);
    expect(canDo('title', 'restart')).toBe(false);
    expect(canDo('countdown', 'pause')).toBe(false);
    expect(canDo('playing', 'pause')).toBe(true);
    expect(canDo('playing', 'hit')).toBe(true);
    expect(canDo('playing', 'finish')).toBe(true);
    expect(canDo('paused', 'resume')).toBe(true);
    expect(canDo('paused', 'restart')).toBe(true);
    expect(canDo('paused', 'hit')).toBe(false);
    expect(canDo('gameover', 'restart')).toBe(true);
    expect(canDo('gameover', 'pause')).toBe(false);
    expect(canDo('victory', 'restart')).toBe(true);
  });

  it('5 retries leave no leaked state (effects clean, counters consistent)', () => {
    let s = initialFlow;
    for (let i = 0; i < 5; i++) {
      s = act(s, { type: 'start' });
      s = act(s, { type: 'countdownDone' });
      s = act(s, { type: 'hit' });
      s = act(s, { type: 'restart' });
      expect(s.state).toBe('countdown');
      expect(s.retries).toBe(i + 1);
      // after a restart the only pending effect is the countdown start
      expect(s.startCountdown).toBe(true);
      expect(s.hideHud).toBe(true);
      expect(s.showHud).toBe(false);
      expect(s.resetRun).toBe(true);

      // finish the countdown: all effects must be clean (no leaks)
      s = act(s, { type: 'countdownDone' });
      expect(s.state).toBe('playing');
      expect(s.resetRun).toBe(false);
      expect(s.startCountdown).toBe(false);
      expect(s.hideHud).toBe(false);
      expect(s.showHud).toBe(true);
    }
    // final state is a clean playing state with 5 recorded retries
    expect(s.state).toBe('playing');
    expect(s.retries).toBe(5);
    expect(s.resetRun).toBe(false);
    expect(s.startCountdown).toBe(false);
  });

  it('is deterministic: identical action sequences give identical states', () => {
    const seq: FlowAction[] = [
      { type: 'start' },
      { type: 'countdownDone' },
      { type: 'pause' },
      { type: 'resume' },
      { type: 'finish' },
      { type: 'restart' },
      { type: 'countdownDone' },
      { type: 'hit' },
    ];
    const run = (s: FlowState): FlowState => seq.reduce((acc, a) => transition(acc, a), s);
    expect(run(initialFlow)).toEqual(run(initialFlow));
  });
});
