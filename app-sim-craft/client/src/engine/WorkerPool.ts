// A small, reused pool of Comlink-wrapped workers, per
// spec/01-tech-stack-architecture.md §5: spun up once and kept for the
// session (never spawned per-chunk), work dispatched to whichever
// pooled worker is free, queued otherwise.
import * as Comlink from "comlink";

interface PooledWorker<TApi> {
  worker: Worker;
  api: Comlink.Remote<TApi>;
  busy: boolean;
}

export class WorkerPool<TApi> {
  private readonly pool: PooledWorker<TApi>[] = [];
  private readonly queue: Array<(api: Comlink.Remote<TApi>) => void> = [];

  constructor(factory: () => Worker, size: number) {
    for (let i = 0; i < size; i++) {
      const worker = factory();
      this.pool.push({ worker, api: Comlink.wrap<TApi>(worker), busy: false });
    }
  }

  async run<T>(task: (api: Comlink.Remote<TApi>) => Promise<T>): Promise<T> {
    const entry = await this.acquire();
    try {
      return await task(entry.api);
    } finally {
      this.release(entry);
    }
  }

  private acquire(): Promise<PooledWorker<TApi>> {
    const free = this.pool.find((w) => !w.busy);
    if (free) {
      free.busy = true;
      return Promise.resolve(free);
    }
    return new Promise((resolve) => {
      this.queue.push((api) => {
        const entry = this.pool.find((w) => w.api === api)!;
        resolve(entry);
      });
    });
  }

  private release(entry: PooledWorker<TApi>): void {
    const next = this.queue.shift();
    if (next) {
      next(entry.api); // hand this worker straight to the next waiter, stays busy
    } else {
      entry.busy = false;
    }
  }

  dispose(): void {
    for (const entry of this.pool) entry.worker.terminate();
  }
}

export function defaultPoolSize(): number {
  const cores = navigator.hardwareConcurrency || 4;
  return Math.min(Math.max(cores - 1, 2), 6);
}
