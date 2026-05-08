import { Emitter } from '../src/index';
import { AggregateListenerError, EmitterError } from '../src/errors';

type Events = {
  data: string;
}

describe('Emitter.emit error handling', () => {
  test('emit_listener_throw_runs_remaining_listeners_then_throws_aggregate', () => {
    const emitter = new Emitter<Events>();
    const seen: string[] = [];
    emitter.on('data', () => {
      seen.push('first');
    });
    emitter.on('data', () => {
      throw new Error('mid-fail');
    });
    emitter.on('data', () => {
      seen.push('third');
    });
    expect(() => emitter.emit('data', 'x')).toThrow(AggregateListenerError);
    expect(seen).toEqual(['first', 'third']);
  });

  test('emit_aggregate_error_carries_event_name_and_error_list', () => {
    const emitter = new Emitter<Events>();
    emitter.on('data', () => {
      throw new Error('fail');
    });
    try {
      emitter.emit('data', 'x');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AggregateListenerError);
      const aggregate = err as AggregateListenerError;
      expect(aggregate.eventName).toBe('data');
      expect(aggregate.errors).toHaveLength(1);
      expect(aggregate.code).toBe('LISTENER_FAILED');
    }
  });

  test('emit_routes_errors_to_onError_when_configured', () => {
    const captured: Array<{ err: unknown; name: string }> = [];
    const emitter = new Emitter<Events>({
      onError: (err, name) => captured.push({ err, name }),
    });
    emitter.on('data', () => {
      throw new Error('boom');
    });
    expect(() => emitter.emit('data', 'x')).not.toThrow();
    expect(captured).toHaveLength(1);
    expect((captured[0]!.err as Error).message).toBe('boom');
    expect(captured[0]!.name).toBe('data');
  });

  test('emit_with_no_listeners_is_a_no_op', () => {
    const emitter = new Emitter<Events>();
    expect(() => emitter.emit('data', 'x')).not.toThrow();
  });

  test('emit_handler_removed_during_emit_still_runs_if_already_in_snapshot', () => {
    const emitter = new Emitter<Events>();
    const seen: string[] = [];
    let unsubB: () => void = () => undefined;
    emitter.on('data', () => {
      seen.push('a');
      unsubB();
    });
    unsubB = emitter.on('data', () => {
      seen.push('b');
    });
    emitter.emit('data', 'x');
    expect(seen).toEqual(['a', 'b']);
  });

  test('emit_handler_added_during_emit_does_not_run_for_current_emit', () => {
    const emitter = new Emitter<Events>();
    const seen: string[] = [];
    emitter.on('data', () => {
      seen.push('a');
      emitter.on('data', () => {
        seen.push('added');
      });
    });
    emitter.emit('data', 'x');
    expect(seen).toEqual(['a']);
    emitter.emit('data', 'y');
    expect(seen).toEqual(['a', 'a', 'added']);
  });

  test('emit_promise_rejection_from_async_handler_is_routed_to_onError', async () => {
    const captured: string[] = [];
    const emitter = new Emitter<Events>({
      onError: (err) => captured.push((err as Error).message),
    });
    emitter.on('data', async () => {
      throw new Error('async-boom');
    });
    emitter.emit('data', 'x');
    await new Promise((resolve) => setImmediate(resolve));
    expect(captured).toEqual(['async-boom']);
  });

  test('emit_AggregateListenerError_is_an_EmitterError', () => {
    const emitter = new Emitter<Events>();
    emitter.on('data', () => {
      throw new Error('nope');
    });
    try {
      emitter.emit('data', 'x');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(EmitterError);
      expect((err as EmitterError).code).toBe('LISTENER_FAILED');
    }
  });
});
