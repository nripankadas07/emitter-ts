/**
 * Error hierarchy for the typed event emitter.
 *
 * All errors inherit from `EmitterError`. `ListenerLimitError` is raised
 * when adding a listener would exceed the configured `maxListeners` cap.
 * `AggregateListenerError` collects errors thrown by individual listeners
 * during a single `emit` / `emitAsync` invocation.
 */

/** Discriminator codes for programmatic error handling. */
export type EmitterErrorCode =
  | 'INVALID_EVENT_NAME'
  | 'INVALID_HANDLER'
  | 'INVALID_MAX_LISTENERS'
  | 'LISTENER_LIMIT'
  | 'LISTENER_FAILED';

/** Base class for every emitter error. */
export class EmitterError extends Error {
  public readonly code: EmitterErrorCode;

  public constructor(code: EmitterErrorCode, message: string) {
    super(message);
    this.name = 'EmitterError';
    this.code = code;
    Object.setPrototypeOf(this, EmitterError.prototype);
  }
}

/** Raised by `on` / `once` when adding would exceed `maxListeners`. */
export class ListenerLimitError extends EmitterError {
  public readonly eventName: string;
  public readonly limit: number;

  public constructor(eventName: string, limit: number) {
    super(
      'LISTENER_LIMIT',
      `Event "${eventName}" already has ${limit} listeners (the configured maxListeners). Refusing to add more.`,
    );
    this.name = 'ListenerLimitError';
    this.eventName = eventName;
    this.limit = limit;
    Object.setPrototypeOf(this, ListenerLimitError.prototype);
  }
}

/**
 * Thrown by `emit` / `emitAsync` when one or more listeners threw. The
 * `errors` array preserves order: the first entry is the first listener
 * that threw, in registration order.
 */
export class AggregateListenerError extends EmitterError {
  public readonly eventName: string;
  public readonly errors: readonly unknown[];

  public constructor(eventName: string, errors: readonly unknown[]) {
    super(
      'LISTENER_FAILED',
      `${errors.length} listener(s) for event "${eventName}" threw during dispatch.`,
    );
    this.name = 'AggregateListenerError';
    this.eventName = eventName;
    this.errors = errors;
    Object.setPrototypeOf(this, AggregateListenerError.prototype);
  }
}
