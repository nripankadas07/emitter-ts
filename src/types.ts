/**
 * Type primitives for the typed event emitter.
 *
 * The library is parameterised by an `EventMap` — a record from event-name
 * keys to their payload types. Handlers, unsubscribe functions, and emitter
 * options are all generic over that map so callers get full inference.
 */

/**
 * A handler invoked with the typed payload for its event.
 *
 * Handlers may return `void` (sync) or `Promise<void>` (async). Sync
 * handlers complete during `emit`; async handlers are awaited only by
 * `emitAsync` (sync `emit` does NOT await pending promises).
 */
export type Handler<Payload> = (payload: Payload) => void | Promise<void>;

/**
 * The unsubscribe function returned by `on` / `once`.
 *
 * Calling it is equivalent to `emitter.off(event, handler)` and is
 * idempotent — subsequent calls are no-ops.
 */
export type Unsubscribe = () => void;

/** Soft error callback for listener-thrown errors during `emit`. */
export type ErrorCallback<EventMap> = (
  error: unknown,
  eventName: keyof EventMap & string,
) => void;

/**
 * Options controlling emitter behaviour.
 *
 * - `maxListeners` — per-event soft cap. Defaults to `Infinity`. Adding
 *   listeners beyond the cap throws `ListenerLimitError`. Set to a finite
 *   number to catch listener leaks early in development.
 * - `onError` — if provided, listener-thrown errors are routed here instead
 *   of being collected into an `AggregateListenerError`. Useful for
 *   logging-only setups where one bad handler should not halt the emit.
 */
export interface EmitterOptions<EventMap> {
  readonly maxListeners?: number;
  readonly onError?: ErrorCallback<EventMap>;
}

/**
 * An internal listener entry. `once` listeners record the original handler
 * separately so `off(event, originalHandler)` removes the wrapped version.
 */
export interface ListenerEntry<Payload> {
  readonly handler: Handler<Payload>;
  readonly original: Handler<Payload>;
  readonly once: boolean;
}
