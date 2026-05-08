# emitter-ts

Strict typed event emitter for TypeScript with sync/async dispatch, `once`/`off` semantics, listener-error isolation, and zero runtime dependencies.

The emitter is parameterised by an event-name → payload-type map; every method is inferred from that map, so passing the wrong payload to `emit`, registering a handler with the wrong signature, or referring to an unknown event are all compile-time errors.

## Features

- Generic `Emitter<EventMap>` with full payload-type inference.
- Synchronous `emit` and parallel `emitAsync`.
- `on`, `once`, `off` plus an unsubscribe function returned from each subscription.
- Snapshot dispatch — listeners added during `emit` are not invoked for the in-flight event; listeners removed during `emit` are still invoked if they preceded the removal point in the original list.
- Listener-error isolation — one throwing handler does not stop the others; collected errors are routed via `onError` if configured, or thrown as `AggregateListenerError`.
- Configurable `maxListeners` per emitter for early leak detection.
- Zero runtime dependencies. Strict TypeScript (`noImplicitAny`, `noUnusedLocals`, `noImplicitReturns`, `strict: true`).

## Install

```bash
npm install emitter-ts
```

## Usage

```ts
import { Emitter } from 'emitter-ts';

type AppEvents = {
  login: { userId: string };
  logout: { userId: string; reason: 'manual' | 'idle' };
  message: string;
};

const bus = new Emitter<AppEvents>();

const unsubscribe = bus.on('login', ({ userId }) => {
  console.log(`hello ${userId}`);
});

bus.once('logout', ({ userId, reason }) => {
  console.log(`bye ${userId} (${reason})`);
});

bus.emit('login', { userId: 'alice' });
bus.emit('logout', { userId: 'alice', reason: 'manual' });

unsubscribe(); // remove the login listener
```

## Running tests

```bash
npm install
npm test

The suite has 51 tests at 100% coverage.
```

## License

MIT © Nripanka Das
