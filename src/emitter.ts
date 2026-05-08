/**
 * The typed event emitter.
 *
 * `Emitter<EventMap>` is parameterised by an `EventMap` — a record from
 * event-name keys to their payload types. All public methods are inferred
 * from that map: passing the wrong payload to `emit`, registering a handler
 * with the wrong signature, or referring to an unknown event name are all
 * compile-time errors.
 *
 * Snapshot semantics: `emit` and `emitAsync` iterate over a snapshot of the
 * listener array taken before dispatch. Listeners added during dispatch are
 * NOT invoked for the in-flight event; listeners removed during dispatch
 * (including via `off` from inside another handler, or via the unsubscribe
 * function returned by `on`/`once`) are still invoked if they preceded the
 * removal point in the original array — except `once` listeners which are
 * always invoked at most one time.
 */

import {
  AggregateListenerError,
  EmitterError,
  ListenerLimitError,
} from './errors';
import type {
  EmitterOptions,
  ErrorCallback,
  Handler,
  ListenerEntry,
  Unsubscribe,
} from './types';

const DEFAULT_MAX_LISTENERS = Number.POSITIVE_INFINITY;

type EventName<EventMap> = keyof EventMap & string;

/** Strict typed event emitter. */
export class Emitter<EventMap extends Record<string, unknown>> {
  private readonly listeners: Map<
    EventName<EventMap>,
    Array<ListenerEntry<unknown>>
  > = new Map();

  private readonly maxListeners: number;

  private readonly onError: ErrorCallback<EventMap> | undefined;

  public constructor(options: EmitterOptions<EventMap> = {}) {
    const max = options.maxListeners ?? DEFAULT_MAX_LISTENERS;
    if (typeof max !== 'number' || Number.isNaN(max) || max < 0) {
      throw new EmitterError(
        'INVALID_MAX_LISTENERS',
        `maxListeners must be a non-negative number; got ${String(max)}.`,
      );
    }
    this.maxListeners = max;
    this.onError = options.onError;
  }

  /** Register a handler for `event`. Returns an unsubscribe function. */
  public on<K extends EventName<EventMap>>(
    event: K,
    handler: Handler<EventMap[K]>,
  ): Unsubscribe {
    return this.add(event, handler, handler, false);
  }

  /** Register a one-shot handler for `event`. Removed after first call. */
  public once<K extends EventName<EventMap>>(
    event: K,
    handler: Handler<EventMap[K]>,
  ): Unsubscribe {
    const wrapped: Handler<EventMap[K]> = (payload) => handler(payload);
    return this.add(event, wrapped, handler, true);
  }

  /**
   * Remove a listener.
   *
   * - `off(event, handler)` removes only that handler (the one passed to
   *   `on`/`once`); returns `true` if a match was found.
   * - `off(event)` removes all listeners for `event`; returns `true` if any
   *   listeners were removed.
   */
  public off<K extends EventName<EventMap>>(
    event: K,
    handler?: Handler<EventMap[K]>,
  ): boolean {
    const list = this.listeners.get(event);
    if (list === undefined) {
      return false;
    }
    if (handler === undefined) {
      this.listeners.delete(event);
      return list.length > 0;
    }
    const index = list.findIndex((entry) => entry.original === handler);
    if (index === -1) {
      return false;
    }
    list.splice(index, 1);
    if (list.length === 0) {
      this.listeners.delete(event);
    }
    return true;
  }

  /**
   * Emit an event synchronously.
   *
   * All sync listeners run before this method returns. If listeners throw,
   * remaining listeners still run, then the collected errors are routed to
   * `onError` if configured, or thrown as `AggregateListenerError`.
   *
   * Async handlers (returning a promise) are invoked but NOT awaited; if
   * any returned promise rejects, the rejection is also collected and
   * surfaced via `onError` / `AggregateListenerError`. Use `emitAsync` to
   * await async handlers.
   */
  public emit<K extends EventName<EventMap>>(
    event: K,
    payload: EventMap[K],
  ): void {
    const snapshot = this.snapshot(event);
    if (snapshot.length === 0) {
      return;
    }
    const errors: unknown[] = [];
    for (const entry of snapshot) {
      const result = this.invokeSync(entry, payload, errors);
      if (result !== undefined) {
        result.catch((err: unknown) => this.routeError(event, err));
      }
    }
    this.flushErrors(event, errors);
  }

  /**
   * Emit an event asynchronously, awaiting every listener.
   *
   * Sync and async handlers are both supported; rejected promises and
   * thrown errors are aggregated. The returned promise settles after the
   * last listener resolves or rejects — listeners run in parallel.
   */
  public async emitAsync<K extends EventName<EventMap>>(
    event: K,
    payload: EventMap[K],
  ): Promise<void> {
    const snapshot = this.snapshot(event);
    if (snapshot.length === 0) {
      return;
    }
    const tasks = snapshot.map((entry) => this.invokeAsync(entry, payload));
    const settled = await Promise.allSettled(tasks);
    const errors = settled
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map((result) => result.reason);
    this.flushErrors(event, errors);
  }

  /** Number of listeners currently registered for `event`. */
  public listenerCount<K extends EventName<EventMap>>(event: K): number {
    return this.listeners.get(event)?.length ?? 0;
  }

  /** All event names with at least one listener (registration order). */
  public eventNames(): Array<EventName<EventMap>> {
    return Array.from(this.listeners.keys());
  }

  /** Remove every listener (or every listener for a single event). */
  public removeAllListeners<K extends EventName<EventMap>>(event?: K): void {
    if (event === undefined) {
      this.listeners.clear();
      return;
    }
    this.listeners.delete(event);
  }

  private add<K extends EventName<EventMap>>(
    event: K,
    handler: Handler<EventMap[K]>,
    original: Handler<EventMap[K]>,
    once: boolean,
  ): Unsubscribe {
    if (typeof handler !== 'function') {
      throw new EmitterError(
        'INVALID_HANDLER',
        `Handler for event "${event}" must be a function; got ${typeof handler}.`,
      );
    }
    const list = this.listeners.get(event) ?? [];
    if (list.length >= this.maxListeners) {
      throw new ListenerLimitError(event, this.maxListeners);
    }
    const entry: ListenerEntry<EventMap[K]> = { handler, original, once };
    list.push(entry as ListenerEntry<unknown>);
    this.listeners.set(event, list);
    return () => {
      this.off(event, original);
    };
  }

  private snapshot<K extends EventName<EventMap>>(
    event: K,
  ): Array<ListenerEntry<EventMap[K]>> {
    const list = this.listeners.get(event);
    if (list === undefined) {
      return [];
    }
    const copy = list.slice() as Array<ListenerEntry<EventMap[K]>>;
    if (copy.some((entry) => entry.once)) {
      this.removeOnceEntries(event, list);
    }
    return copy;
  }

  private removeOnceEntries<K extends EventName<EventMap>>(
    event: K,
    list: Array<ListenerEntry<unknown>>,
  ): void {
    const remaining = list.filter((entry) => !entry.once);
    if (remaining.length === 0) {
      this.listeners.delete(event);
      return;
    }
    this.listeners.set(event, remaining);
  }

  private invokeSync<K extends EventName<EventMap>>(
    entry: ListenerEntry<EventMap[K]>,
    payload: EventMap[K],
    errors: unknown[],
  ): Promise<void> | undefined {
    try {
      const result = entry.handler(payload);
      if (result instanceof Promise) {
        return result;
      }
      return undefined;
    } catch (err) {
      errors.push(err);
      return undefined;
    }
  }

  private async invokeAsync<K extends EventName<EventMap>>(
    entry: ListenerEntry<EventMap[K]>,
    payload: EventMap[K],
  ): Promise<void> {
    await entry.handler(payload);
  }

  private flushErrors<K extends EventName<EventMap>>(
    event: K,
    errors: readonly unknown[],
  ): void {
    if (errors.length === 0) {
      return;
    }
    if (this.onError !== undefined) {
      for (const err of errors) {
        this.onError(err, event);
      }
      return;
    }
    throw new AggregateListenerError(event, errors);
  }

  private routeError<K extends EventName<EventMap>>(
    event: K,
    err: unknown,
  ): void {
    if (this.onError !== undefined) {
      this.onError(err, event);
      return;
    }
    /* istanbul ignore next -- defensive: unhandled async rejection from sync emit when no onError configured */
    queueMicrotask(() => {
      throw new AggregateListenerError(event, [err]);
    });
  }
}
