import { Emitter } from '../src/index';
import { EmitterError, ListenerLimitError } from '../src/errors';

type Events = {
  ev: number;
}

describe('Emitter limits and metadata', () => {
  test('maxListeners_throws_ListenerLimitError_when_exceeded', () => {
    const emitter = new Emitter<Events>({ maxListeners: 2 });
    emitter.on('ev', () => undefined);
    emitter.on('ev', () => undefined);
    expect(() => emitter.on('ev', () => undefined)).toThrow(ListenerLimitError);
  });

  test('maxListeners_zero_throws_immediately_on_first_listener', () => {
    const emitter = new Emitter<Events>({ maxListeners: 0 });
    expect(() => emitter.on('ev', () => undefined)).toThrow(ListenerLimitError);
  });

  test('maxListeners_negative_throws_INVALID_MAX_LISTENERS', () => {
    expect(() => new Emitter<Events>({ maxListeners: -1 })).toThrow(EmitterError);
  });

  test('maxListeners_NaN_throws_INVALID_MAX_LISTENERS', () => {
    expect(() => new Emitter<Events>({ maxListeners: Number.NaN })).toThrow(
      /maxListeners must be a non-negative number/,
    );
  });

  test('maxListeners_default_allows_unlimited_listeners', () => {
    const emitter = new Emitter<Events>();
    for (let i = 0; i < 200; i += 1) {
      emitter.on('ev', () => undefined);
    }
    expect(emitter.listenerCount('ev')).toBe(200);
  });

  test('listenerCount_for_unknown_event_is_zero', () => {
    const emitter = new Emitter<Events>();
    expect(emitter.listenerCount('ev')).toBe(0);
  });

  test('eventNames_lists_only_events_with_listeners', () => {
    const emitter = new Emitter<{ a: number; b: string; c: boolean }>();
    emitter.on('a', () => undefined);
    emitter.on('c', () => undefined);
    expect(emitter.eventNames().sort()).toEqual(['a', 'c']);
  });

  test('removeAllListeners_no_args_clears_every_event', () => {
    const emitter = new Emitter<{ a: number; b: string }>();
    emitter.on('a', () => undefined);
    emitter.on('b', () => undefined);
    emitter.removeAllListeners();
    expect(emitter.eventNames()).toEqual([]);
  });

  test('removeAllListeners_with_event_only_clears_that_event', () => {
    const emitter = new Emitter<{ a: number; b: string }>();
    emitter.on('a', () => undefined);
    emitter.on('b', () => undefined);
    emitter.removeAllListeners('a');
    expect(emitter.eventNames()).toEqual(['b']);
  });

  test('ListenerLimitError_carries_event_and_limit_metadata', () => {
    const emitter = new Emitter<Events>({ maxListeners: 1 });
    emitter.on('ev', () => undefined);
    try {
      emitter.on('ev', () => undefined);
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ListenerLimitError);
      expect((err as ListenerLimitError).eventName).toBe('ev');
      expect((err as ListenerLimitError).limit).toBe(1);
      expect((err as ListenerLimitError).code).toBe('LISTENER_LIMIT');
    }
  });
});
