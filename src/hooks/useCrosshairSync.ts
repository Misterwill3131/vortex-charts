import { useEffect, useId, useRef } from "react";
import { publishCrosshairSync, subscribeCrosshairSync } from "../engine/crosshair-sync";

export interface UseCrosshairSyncOptions {
  /** Shared group id — charts with the same group synchronize their crosshairs */
  group?: string;
  /** Local hovered candle timestamp (null when idle) — broadcast to the group */
  localTime: number | null;
  /** Receives the hovered timestamp of remote charts in the group */
  onRemoteTime: (time: number | null) => void;
}

/**
 * Wires a chart into a crosshair synchronization group.
 * Publishes the local hover timestamp and forwards remote events,
 * ignoring events emitted by this very chart (sourceId comparison).
 */
export function useCrosshairSync({ group, localTime, onRemoteTime }: UseCrosshairSyncOptions) {
  const sourceId = useId();

  // Keep the callback fresh without re-subscribing on every render
  const onRemoteRef = useRef(onRemoteTime);
  useEffect(() => {
    onRemoteRef.current = onRemoteTime;
  });

  // Publish local hover time to the group
  useEffect(() => {
    if (!group) return;
    publishCrosshairSync(group, { time: localTime, sourceId });
  }, [group, localTime, sourceId]);

  // Subscribe to remote hover times
  useEffect(() => {
    if (!group) return;
    return subscribeCrosshairSync(group, (event) => {
      if (event.sourceId !== sourceId) {
        onRemoteRef.current(event.time);
      }
    });
  }, [group, sourceId]);

  return { sourceId };
}