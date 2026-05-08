import { Emitter } from '../src/index';

type Events = {
  tick: number;
  ready: void;
}

describe('Emitter.once', () => {
  test('once_handler_runs_exactly_once_across_multiple_emits', () => {
    const emitter = new Emitter<Events>();
    let count = 0;
    emitter.once('tick', () => {
      count += 1;
    });
    emitter.emit('tick', 1);
    emitter.emit('tick', 2);
    emitter.emit('tick', 3);
    expect(count).toBe(1);
  });

  test('once_payload_is_the_first_emit_payload', () => {
    const emitter = new Emitter<Events>();
    const seen: number[] = [];
    emitter.once('tick', (n) => { seen.push(n); });
    emitter.emit('tick', 7);
    emitter.emit('tick', 8);
    expect(seen).toEqual([7]);
  });

  test('once_can_be_removed_via_off_with_original_handler_before_emit', () => {
    const emitter = new Emitter<Events>();
    const handler = (_: number): void => undefined;
    emitter.once('tick', handler);
    expect(emitter.off('tick', handler)).toBe(true);
    expect(emitter.listenerCount('tick')).toBe(0);
  });

  test('once_unsubscribe_function_removes_listener_before_emit', () => {
    const emitter = new Emitter<Events>();
    const unsub = emitter.once('tick', () => undefined);
    unsub();
    expect(emitter.listenerCount('tick')).toBe(0);
  });

  test('once_runs_alongside_on_handlers_in_registration_order', () => {
    const emitter = new Emitter<Events>();
    const order: string[] = [];
    emitter.on('tick', () => { order.push('on-1'); });
    emitter.once('tick', () => { order.push('once'); });
    emitter.on('tick', () => { order.push('on-2'); });
    emitter.emit('tick', 1);
    expect(order).toEqual(['on-1', 'once', 'on-2']);
    emitter.emit('tick', 2);
    expect(order).toEqual(['on-1', 'once', 'on-2', 'on-1', 'on-2']);
  });

  test('once_invoked_only_once_even_with_multiple_listeners_for_event', () => {
    const emitter = new Emitter<Events>();
    let onceCalls = 0;
    let onCalls = 0;
    emitter.on('tick', () => {
      onCalls += 1;
    });
    emitter.once('tick', () => {
      onceCalls += 1;
    });
    emitter.emit('tick', 1);
    emitter.emit('tick', 2);
    expect(onceCalls).toBe(1);
    expect(onCalls).toBe(2);
  });

  test('once_listener_removal_clears_event_when_no_other_listeners', () => {
    const emitter = new Emitter<Events>();
    emitter.once('tick', () => undefined);
    emitter.emit('tick', 1);
    expect(emitter.eventNames()).toEqual([]);
  });

  test('once_handler_remains_until_fired_even_if_other_listeners_added_later', () => {
    const emitter = new Emitter<Events>();
    let onceCalls = 0;
    emitter.once('tick', () => {
      onceCalls += 1;
    });
    emitter.on('tick', () => undefined);
    emitter.emit('tick', 1);
    expect(onceCalls).toBe(1);
    expect(emitter.listenerCount('tick')).toBe(1);
  });

  test('once_handler_fires_for_void_payload_events', () => {
    const emitter = new Emitter<Events>();
    let count = 0;
    emitter.once('ready', () => {
      count += 1;
    });
    emitter.emit('ready', undefined);
    emitter.emit('ready', undefined);
    expect(count).toBe(1);
  });
});
