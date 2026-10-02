/**
 * Input buffer for edge-triggered actions
 * Implements SPEC §3 input layer with max 2 queued actions, each expiring after 0.15s
 */

export type Action = 'left' | 'right' | 'jump' | 'slide';

export class InputBuffer {
  private actions: { type: Action; timestamp: number }[] = [];
  private readonly maxActions = 2;
  private readonly expireTime = 0.15; // seconds

  /**
   * Add an action to the buffer
   */
  public add(action: Action): void {
    // Remove expired actions first
    this.expire();
    
    // If we already have this action, don't add it again
    if (this.actions.some(a => a.type === action)) {
      return;
    }
    
    // Add new action
    if (this.actions.length >= this.maxActions) {
      // Remove oldest action if at capacity
      this.actions.shift();
    }
    
    this.actions.push({
      type: action,
      timestamp: performance.now()
    });
  }

  /**
   * Get current actions and expire old ones
   */
  public get(): Action[] {
    this.expire();
    return this.actions.map(a => a.type);
  }

  /**
   * Remove all buffered actions (call after consuming them).
   */
  public clear(): void {
    this.actions = [];
  }

  /**
   * Remove expired actions
   */
  private expire(): void {
    const now = performance.now();
    this.actions = this.actions.filter(action => 
      (now - action.timestamp) < (this.expireTime * 1000)
    );
  }
}