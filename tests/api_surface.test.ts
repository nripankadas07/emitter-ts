import * as api from '../src/index';

describe('Public API surface', () => {
  test('emitter_class_is_exported', () => {
    expect(typeof api.Emitter).toBe('function');
  });

  test('error_classes_are_exported', () => {
    expect(typeof api.EmitterError).toBe('function');
    expect(typeof api.ListenerLimitError).toBe('function');
    expect(typeof api.AggregateListenerError).toBe('function');
  });

  test('error_classes_inherit_from_EmitterError', () => {
    const limit = new api.ListenerLimitError('foo', 1);
    const aggregate = new api.AggregateListenerError('foo', [new Error('e')]);
    expect(limit).toBeInstanceOf(api.EmitterError);
    expect(aggregate).toBeInstanceOf(api.EmitterError);
  });

  test('public_named_exports_are_exactly_the_documented_set', () => {
    const expected = [
      'AggregateListenerError',
      'Emitter',
      'EmitterError',
      'ListenerLimitError',
    ];
    const actual = Object.keys(api).sort();
    expect(actual).toEqual(expected);
  });

  test('ListenerLimitError_round_trip_carries_metadata', () => {
    const err = new api.ListenerLimitError('event-x', 7);
    expect(err.eventName).toBe('event-x');
    expect(err.limit).toBe(7);
    expect(err.code).toBe('LISTENER_LIMIT');
    expect(err.name).toBe('ListenerLimitError');
  });

  test('AggregateListenerError_round_trip_carries_metadata', () => {
    const reasons = [new Error('a'), 'b', 42];
    const err = new api.AggregateListenerError('topic', reasons);
    expect(err.eventName).toBe('topic');
    expect(err.errors).toEqual(reasons);
    expect(err.code).toBe('LISTENER_FAILED');
    expect(err.name).toBe('AggregateListenerError');
  });
});
