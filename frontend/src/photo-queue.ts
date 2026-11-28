// Photo downloads of the panel wait their turn here, so a long plant list
// opens a few requests at a time instead of one per card, and a photo whose
// page was left before its turn is never requested.
export const PHOTO_CONCURRENCY = 4;

interface Job { start: () => void; drop: () => void }

function abortError(): DOMException {
  return new DOMException("The photo request was cancelled.", "AbortError");
}

export class PhotoQueue {
  private _running = 0;
  private _waiting: Job[] = [];

  constructor(private readonly _limit = PHOTO_CONCURRENCY) {}

  get running(): number { return this._running; }
  get waiting(): number { return this._waiting.length; }

  // Runs `task` once a slot is free, at once when one is. `first` puts it
  // before the photos already waiting, for the photo the page is about.
  // An abort before the turn drops the task and rejects with an AbortError.
  // A running task passes `signal` on to its fetch; its abort frees the slot
  // at once, without waiting for the request to wind down.
  run<T>(task: () => Promise<T>, signal: AbortSignal, first = false): Promise<T> {
    if (signal.aborted) return Promise.reject(abortError());
    return new Promise<T>((resolve, reject) => {
      const job: Job = {
        start: () => {
          signal.removeEventListener("abort", job.drop);
          this._running++;
          let freed = false;
          const free = () => {
            if (freed) return;
            freed = true; signal.removeEventListener("abort", free); this._running--;
            // Once the code that freed the slot is done, so a page that cancels
            // several photos at once drops the waiting ones before one starts.
            queueMicrotask(() => this._next());
          };
          signal.addEventListener("abort", free, { once: true });
          let settled: Promise<T>;
          try { settled = task(); } catch (error) { settled = Promise.reject(error); }
          void settled.then(resolve, reject).finally(free);
        },
        drop: () => {
          const index = this._waiting.indexOf(job);
          if (index >= 0) this._waiting.splice(index, 1);
          reject(abortError());
        },
      };
      if (this._running < this._limit) { job.start(); return; }
      signal.addEventListener("abort", job.drop, { once: true });
      if (first) this._waiting.unshift(job); else this._waiting.push(job);
    });
  }

  private _next(): void {
    while (this._running < this._limit && this._waiting.length) this._waiting.shift()!.start();
  }
}

// One queue for the whole panel: the plant list, the plant page and the
// retired plants share the limit.
export const photoQueue = new PhotoQueue();
