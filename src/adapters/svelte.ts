/**
 * Mr.Latin — Svelte adapter.
 *
 * Exposes a Svelte *action*, `use:mrLatin`, that attaches a Mr.Latin engine to
 * an element (scanning that subtree), reconfigures it on `update`, and tears it
 * down on `destroy`. A small Svelte-compatible store, `mrLatinState`, mirrors
 * the current language / busy state for `$`-auto-subscription in templates.
 *
 * The store implements the Svelte store contract by hand — no `svelte/store`
 * import — so the package keeps zero runtime dependencies. Svelte itself ships
 * the compiler that understands `use:` and `$store`; nothing is imported here.
 *
 * ```svelte
 * <script lang="ts">
 *   import { mrLatin, mrLatinState } from "mr.latin/svelte";
 * </script>
 *
 * <main use:mrLatin={{ languages: ["en", "te"] }}>
 *   <p>Language: {$mrLatinState.language}</p>
 * </main>
 * ```
 */

import { MrLatin } from "../core/mr-latin";
import type { LanguageCode, MrLatinOptions } from "../types";

/**
 * The slice of the engine's runtime surface the adapter consumes. Declared
 * structurally so the glue stays decoupled from the engine's internals while
 * keeping every exported signature fully typed.
 */
interface EngineInstance {
  start(): unknown;
  setLanguage(language: LanguageCode): unknown;
  readonly language: LanguageCode;
  readonly busy: boolean;
  subscribe(listener: () => void): () => void;
  stop?(): void;
  destroy?(): void;
}

function asEngine(instance: MrLatin): EngineInstance {
  return instance as unknown as EngineInstance;
}

function teardown(engine: EngineInstance): void {
  if (typeof engine.stop === "function") engine.stop();
  else if (typeof engine.destroy === "function") engine.destroy();
}

/** The reactive state surfaced through {@link mrLatinState}. */
export interface MrLatinState {
  /** The current display language. */
  language: LanguageCode;
  /** True while a translation pass is in flight. */
  busy: boolean;
}

/** A read-only Svelte-compatible store (the minimum the `$` prefix needs). */
export interface Readable<T> {
  subscribe(run: (value: T) => void): () => void;
}

/** A hand-rolled writable store implementing the Svelte store contract. */
function createStore<T>(initial: T): {
  store: Readable<T>;
  set(value: T): void;
} {
  let value = initial;
  const subscribers = new Set<(value: T) => void>();

  const store: Readable<T> = {
    subscribe(run) {
      subscribers.add(run);
      run(value); // Svelte stores notify immediately on subscribe.
      return () => {
        subscribers.delete(run);
      };
    },
  };

  const set = (next: T): void => {
    value = next;
    for (const run of subscribers) run(value);
  };

  return { store, set };
}

const { store: mrLatinState, set: setState } = createStore<MrLatinState>({
  language: "",
  busy: false,
});

/** Live language + busy state of the most recently started engine. */
export { mrLatinState };

/** The object an `update` call may receive from Svelte (or `void` for none). */
export interface SvelteActionReturn {
  update(options: MrLatinOptions): void;
  destroy(): void;
}

/**
 * Svelte action: `use:mrLatin={options}`.
 *
 * Starts the engine scoped to `node` (used as the scan/observe root), keeps the
 * shared {@link mrLatinState} store in sync, and recreates the engine when the
 * passed options change.
 */
export function mrLatin(
  node: HTMLElement,
  options: MrLatinOptions = {},
): SvelteActionReturn {
  let engine: EngineInstance | null = null;
  let unsubscribe: (() => void) | null = null;

  const sync = (): void => {
    if (!engine) return;
    setState({ language: engine.language, busy: engine.busy });
  };

  const startWith = (opts: MrLatinOptions): void => {
    engine = asEngine(new MrLatin({ root: node, ...opts }));
    unsubscribe = engine.subscribe(sync);
    engine.start();
    sync();
  };

  const stop = (): void => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    if (engine) {
      teardown(engine);
      engine = null;
    }
  };

  startWith(options);

  return {
    update(next: MrLatinOptions) {
      stop();
      startWith(next);
    },
    destroy() {
      stop();
    },
  };
}

export default mrLatin;
