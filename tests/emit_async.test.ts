import { Emitter } from '../src/index';
import { AggregateListenerError } from '../src/errors';

type Events = {
  load: string;
  save: { ok: boolean };
}

describe('Emitter.emitAsync', () => {
  test('emitAsync_awaits_async_handlers_in_parallel', async () => {
    const emitter = new Emitter<Events>();
    const events: string[] = [];
    emitter.on('load', async (s) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      events.push(`a:${s}`);
    });
    emitter.on('load', async (s) => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      events.push(`b:${s}`);
    });
    await emitter.emitAsync('load', 'go');
    expect(events.sort()).toEqual(['a:go', 'b:go']);
  });

  test('emitAsync_with_no_listeners_resolves_immediately', async () => {
    const emitter = new Emitter<Events>();
    await expect(emitter.emitAsync('load', 'x')).resolves.toBeUndefined();
  });

  test('emitAsync_supports_sync_handlers_too', async () => {
    const emitter = new Emitter<Events>();
    let calls = 0;
    emitter.on('load', () => {
      calls += 1;
    });
    emitter.on('load', () => {
      calls += 1;
    });
    await emitter.emitAsync('load', 'x');
    expect(calls).toBe(2);
  });

  test('emitAsync_collects_rejected_promises_into_AggregateListenerError', async () => {
    const emitter = new Emitter<Events>();
    emitter.on('load', () => undefined);
    emitter.on('load', async () => {
      throw new Error('boom-async');
    });
    emitter.on('load', () => {
      throw new Error('boom-sync');
    });
    await expect(emitter.emitAsync('load', 'x')).rejects.toThrow(
      AggregateListenerError,
    );
  });

  test('emitAsync_aggregate_error_preserves_all_reasons', async () => {
    const emitter = new Emitter<Events>();
    emitter.on('save', async () => {
      throw new Error('one');
    });
    emitter.on('save', async () => {
      throw new Error('two');
    });
    try {
      await emitter.emitAsync('save', { ok: false });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AggregateListenerError);
      expect((err as AggregateListenerError).errors).toHaveLength(2);
    }
  });

  test('emitAsync_routes_errors_to_onError_callback_when_configured', async () => {
    const captured: string[] = [];
    const emitter = new Emitter<Events>({
      onError: (err) => captured.push((err as Error).message),
    });
    emitter.on('load', async () => {
      throw new Error('first');
    });
    emitter.on('load', async () => {
      throw new Error('second');
    });
    await expect(emitter.emitAsync('load', 'x')).resolves.toBeUndefined();
    expect(captured.sort()).toEqual(['first', 'second']);
  });

  test('emitAsync_processes_once_handlers_and_removes_them', async () => {
    const emitter = new Emitter<Events>();
    let count = 0;
    emitter.once('load', async () => {
      count += 1;
    });
    await emitter.emitAsync('load', 'x');
    await emitter.emitAsync('load', 'y');
    expect(count).toBe(1);
  });

  test('emitAsync_unrelated_event_with_no_listeners_returns_void', async () => {
    const emitter = new Emitter<Events>();
    emitter.on('load', () => undefined);
    await expect(emitter.emitAsync('save', { ok: true })).resolves.toBeUndefined();
  });
});
