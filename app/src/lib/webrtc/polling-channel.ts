/**
 * PollingChannel — a drop-in replacement for Supabase RealtimeChannel.
 * Uses HTTP polling against /api/live-sessions/[id]/signals.
 *
 * Implements the subset of RealtimeChannel used by VoiceEngine:
 *   channel.on("broadcast", { event }, handler)
 *   channel.send({ type: "broadcast", event, payload })
 *   channel.subscribe(callback)
 *   channel.unsubscribe()
 */

type BroadcastHandler = (msg: { payload: unknown }) => void;

interface ChannelHandler {
  type: string;
  event: string;
  handler: BroadcastHandler;
}

export class PollingChannel {
  private sessionId: string;
  private handlers: ChannelHandler[] = [];
  private lastPolledAt: string | null = null;
  private pollIntervalId: ReturnType<typeof setInterval> | null = null;
  private subscribed = false;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  on(type: string, filter: { event: string } | string, handler: BroadcastHandler): this {
    const event = typeof filter === "string" ? filter : filter.event;
    this.handlers.push({ type, event, handler });
    return this;
  }

  async send(payload: { type: string; event: string; payload: unknown; to_user_id?: string }): Promise<void> {
    try {
      await fetch(`/api/live-sessions/${this.sessionId}/signals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: payload.event,
          payload: payload.payload,
          to_user_id: payload.to_user_id ?? null,
        }),
      });
    } catch {
      // Ignore send errors silently
    }
  }

  subscribe(callback?: (status: string) => void): this {
    this.subscribed = true;
    callback?.("SUBSCRIBED");
    this.startPolling();
    return this;
  }

  unsubscribe(): this {
    this.subscribed = false;
    this.stopPolling();
    return this;
  }

  private startPolling() {
    this.lastPolledAt = new Date().toISOString();
    this.pollIntervalId = setInterval(() => this.poll(), 800);
  }

  private stopPolling() {
    if (this.pollIntervalId !== null) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }

  private async poll() {
    if (!this.subscribed) return;
    try {
      const url = `/api/live-sessions/${this.sessionId}/signals${this.lastPolledAt ? `?after=${encodeURIComponent(this.lastPolledAt)}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const signals: Array<{ id: string; event: string; payload: unknown; createdAt: string }> = await res.json();
      if (signals.length === 0) return;

      this.lastPolledAt = signals[signals.length - 1].createdAt;

      for (const signal of signals) {
        const matching = this.handlers.filter(
          (h) => h.type === "broadcast" && h.event === signal.event
        );
        for (const { handler } of matching) {
          handler({ payload: signal.payload });
        }
      }
    } catch {
      // Ignore polling errors silently
    }
  }

  // Presence stubs (not used but required by VoiceEngine interface checks)
  presenceState(): Record<string, unknown[]> { return {}; }
  track(_: unknown): Promise<void> { return Promise.resolve(); }
}
