/**
 * Lightweight pub/sub bus for multi-chart crosshair synchronization.
 *
 * Charts sharing the same `group` id broadcast their hovered candle timestamp;
 * subscriber charts draw a ghost vertical crosshair at their nearest bar.
 * The store lives at module scope (SSR-safe: no window access, no persistence).
 */

export interface CrosshairSyncEvent {
  /** Hovered candle timestamp, or null when the cursor leaves the source chart */
  time: number | null;
  /** Identity of the emitting chart — subscribers skip their own events */
  sourceId: string;
}

type Listener = (event: CrosshairSyncEvent) => void;

const groups = new Map<string, Set<Listener>>();

export function subscribeCrosshairSync(
  group: string,
  listener: Listener
): () => void {
  let listeners = groups.get(group);
  if (!listeners) {
    listeners = new Set();
    groups.set(group, listeners);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) groups.delete(group);
  };
}

export function publishCrosshairSync(group: string, event: CrosshairSyncEvent): void {
  const listeners = groups.get(group);
  if (!listeners) return;
  for (const listener of listeners) {
    listener(event);
  }
}