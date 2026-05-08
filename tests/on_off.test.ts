import { Emitter } from '../src/index';

type Events = {
  ping: number;
  greet: string;
}

describe('Emitter.on / off', () => {
  test('on_subscribe_handler_is_invoked_with_typed_payload', () => {
    const emitter = new Emitter<Events>();
    const seen: number[] = [];
    emitter.on('ping', (n) => {
      seen.push(n);
    });
    emitter.emit('ping', 42);
    expect(seen).toEqual([42]);
  });

  test('on_returns_unsubscribe_that_removes_only_that_handler', () => {
    const emitter = new Emitter<Events>();
    const seenA: number[] = [];
    const seenB: number[] = [];
    const unsubA = emitter.on('ping', (n) => { seenA.push(n); });
    emitter.on('ping', (n) => { seenB.push(n); });
    unsubA();
    emitter.emit('ping', 1);
    expect(seenA).toEqual([]);
    expect(seenB).toEqual([1]);
  });

  test('on_multiple_handlers_run_in_registration_order', () => {
    const emitter = new Emitter<Events>();
    const order: string[] = [];
    emitter.on('greet', () => { order.push('a'); });
    emitter.on('greet', () => { order.push('b'); });
    emitter.on('greet', () => { order.push('c'); });
    emitter.emit('greet', 'x');
    expect(order).toEqual(['a', 'b', 'c']);
  });

  test('off_with_handler_removes_only_that_handler_and_returns_true', () => {
    const emitter = new Emitter<Events>();
    const handler = (_: number): void => undefined;
    emitter.on('ping', handler);
    emitter.on('ping', () => undefined);
    expect(emitter.off('ping', handler)).toBe(true);
    expect(emitter.listenerCount('ping')).toBe(1);
  });

  test('off_with_unregistered_handler_returns_false', () => {
    const emitter = new Emitter<Events>();
    const handler = (_: number): void => undefined;
    emitter.on('ping', () => undefined);
    expect(emitter.off('ping', handler)).toBe(false);
  });

  test('off_without_handler_removes_all_for_event_and_returns_true', () => {
    const emitter = new Emitter<Events>();
    emitter.on('ping', () => undefined);
    emitter.on('ping', () => undefined);
    expect(emitter.off('ping')).toBe(true);
    expect(emitter.listenerCount('ping')).toBe(0);
  });

  test('off_for_event_with_no_listeners_returns_false', () => {
    const emitter = new Emitter<Events>();
    expect(emitter.off('ping')).toBe(false);
    expect(emitter.off('ping', () => undefined)).toBe(false);
  });

  test('off_unsubscribe_function_is_idempotent', () => {
    const emitter = new Emitter<Events>();
    const unsub = emitter.on('ping', () => undefined);
    unsub();
    unsub();
    expect(emitter.listenerCount('ping')).toBe(0);
  });

  test('on_invalid_handler_throws_with_INVALID_HANDLER_code', () => {
    const emitter = new Emitter<Events>();
    expect(() => emitter.on('ping', 'nope' as unknown as (n: number) => void)).toThrow(
      /Handler for event "ping" must be a function/,
    );
  });

  test('off_removes_event_entry_when_last_listener_removed', () => {
    const emitter = new Emitter<Events>();
    const handler = (): void => undefined;
    emitter.on('ping', handler);
    emitter.off('ping', handler);
    expect(emitter.eventNames()).toEqual([]);
  });
});
