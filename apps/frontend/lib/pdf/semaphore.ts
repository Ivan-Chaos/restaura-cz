/**
 * A ceiling on how many documents render at once.
 *
 * Each render costs a browser context, a page, and the memory to lay out an A4
 * document — bounded per render, unbounded in aggregate. A dashboard that opens
 * two dialogs and retypes a sticker count is a burst of preview requests, and
 * without a gate every one of them would launch a page. Queuing instead means a
 * busy moment is slower, which is recoverable, rather than out of memory, which
 * is not.
 *
 * FIFO on purpose: the owner who asked first should not be starved by the one
 * who asked last.
 */

export interface Semaphore {
  /** Resolves when a slot is free. Call the returned function to give it back. */
  acquire(): Promise<() => void>;
}

export function createSemaphore(limit: number): Semaphore {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error(`Semaphore limit must be a positive integer, got ${limit}.`);
  }

  let active = 0;
  const waiting: (() => void)[] = [];

  function release(): void {
    active -= 1;
    const next = waiting.shift();
    if (next) next();
  }

  return {
    async acquire() {
      if (active < limit) {
        active += 1;
        return once(release);
      }

      await new Promise<void>((resolve) => {
        waiting.push(() => {
          active += 1;
          resolve();
        });
      });

      return once(release);
    },
  };
}

/**
 * A release that can be called twice without corrupting the count — which
 * matters because callers release in a `finally` and may also release on an
 * early return.
 */
function once(fn: () => void): () => void {
  let called = false;
  return () => {
    if (called) return;
    called = true;
    fn();
  };
}

function readLimit(): number {
  const raw = process.env.PDF_MAX_CONCURRENT_RENDERS;
  if (raw === undefined || raw.trim() === "") return 2;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(
      `PDF_MAX_CONCURRENT_RENDERS must be a positive integer, got "${raw}".`,
    );
  }
  return parsed;
}

/** The one gate every render passes through. */
export const renderSemaphore = createSemaphore(readLimit());
