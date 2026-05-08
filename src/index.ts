/**
 * emitter-ts — strict typed event emitter.
 *
 * Public surface::
 *
 *   import { Emitter } from 'emitter-ts';
 *   import { EmitterError, ListenerLimitError, AggregateListenerError } from 'emitter-ts';
 *   import type { Handler, Unsubscribe, EmitterOptions, ErrorCallback } from 'emitter-ts';
 *
 * The library is parameterised by an event-name → payload-type map; all
 * methods are inferred from that map.
 */

export { Emitter } from './emitter';
export {
  AggregateListenerError,
  EmitterError,
  ListenerLimitError,
} from './errors';
export type { EmitterErrorCode } from './errors';
export type {
  EmitterOptions,
  ErrorCallback,
  Handler,
  ListenerEntry,
  Unsubscribe,
} from './types';
