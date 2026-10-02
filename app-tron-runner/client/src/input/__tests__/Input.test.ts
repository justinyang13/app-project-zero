import { describe, it, expect } from 'vitest';
import { InputBuffer } from '../InputBuffer.js';

describe('InputBuffer', () => {
  it('should add actions and retrieve them', () => {
    const buffer = new InputBuffer();
    
    // Add an action
    buffer.add('left');
    
    // Should have one action
    const actions = buffer.get();
    expect(actions.length).toBe(1);
    expect(actions[0]).toBe('left');
  });

  it('should limit to max actions', () => {
    const buffer = new InputBuffer();
    
    // Add more than max actions
    buffer.add('left');
    buffer.add('right');
    buffer.add('jump'); // This should push out the oldest
    
    // Should only have 2 actions
    const actions = buffer.get();
    expect(actions.length).toBe(2);
  });

  it('should not add duplicate actions', () => {
    const buffer = new InputBuffer();
    
    // Add same action twice
    buffer.add('left');
    buffer.add('left');
    
    // Should only have one action
    const actions = buffer.get();
    expect(actions.length).toBe(1);
    expect(actions[0]).toBe('left');
  });

  it('should expire old actions', () => {
    const buffer = new InputBuffer();
    
    // Add an action with a very old timestamp (simulate expired)
    const oldTimestamp = performance.now() - 200; // 200ms ago (past expiration)
    buffer['actions'].push({
      type: 'right',
      timestamp: oldTimestamp
    });
    
    // Should have no actions after expiration check
    const actions = buffer.get();
    expect(actions.length).toBe(0);
  });
});