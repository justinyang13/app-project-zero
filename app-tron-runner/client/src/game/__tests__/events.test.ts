import { describe, it, expect } from 'vitest';
import {
  createPopupQueue, pushPopup, stepPopups, clearPopups, MAX_POPUPS,
} from '../events';

describe('popup event queue', () => {
  it('pushes and keeps order', () => {
    const q = createPopupQueue();
    pushPopup(q, 'A');
    pushPopup(q, 'B', 'good');
    expect(q.events.map((e) => e.text)).toEqual(['A', 'B']);
    expect(q.events[1].kind).toBe('good');
    expect(q.events[0].id).toBe(0);
    expect(q.events[1].id).toBe(1);
  });

  it('caps at MAX_POPUPS, dropping the oldest', () => {
    const q = createPopupQueue();
    for (let i = 0; i < MAX_POPUPS + 3; i++) pushPopup(q, `P${i}`);
    expect(q.events.length).toBe(MAX_POPUPS);
    expect(q.events[0].text).toBe('P3');
    expect(q.events[MAX_POPUPS - 1].text).toBe('P6');
  });

  it('ages events and expires them', () => {
    const q = createPopupQueue();
    pushPopup(q, 'short', 'score', 0.5);
    pushPopup(q, 'long', 'score', 2);
    expect(stepPopups(q, 0.3)).toBe(0);
    expect(q.events.length).toBe(2);
    expect(stepPopups(q, 0.3)).toBe(1);
    expect(q.events.length).toBe(1);
    expect(q.events[0].text).toBe('long');
    expect(q.events[0].t).toBeCloseTo(0.6);
  });

  it('clearPopups empties the queue', () => {
    const q = createPopupQueue();
    pushPopup(q, 'A');
    clearPopups(q);
    expect(q.events.length).toBe(0);
  });
});
