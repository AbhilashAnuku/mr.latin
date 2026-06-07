/**
 * Mr.Latin — Vue 3 adapter.
 *
 * `useMrLatin` is a composable that owns one engine instance: it starts
 * Mr.Latin on mount, stops it on unmount, and exposes reactive `language` /
 * `busy` refs that update whenever the engine's state changes. Vue is an
 * *optional* peer dependency — this module is only imported from `mr.latin/vue`.
 *
 * ```vue
 * <script setup lang="ts">
 * import { useMrLatin } from "mr.latin/vue";
 * const { language, busy, setLanguage } = useMrLatin({ languages: ["en", "te"] });
 * </script>
 *
 * <template>
 *   <button :disabled="busy" @click="setLanguage('te')">{{ language }}</button>
 * </template>
 * ```
 */

import { onMounted, onUnmounted, ref } from "vue";
import type { Ref } from "vue";
import { MrLatin } from "../core/mr-latin";
import type { LanguageCode, MrLatinOptions } from "../types";

/**
 * The slice of the engine's runtime surface the adapters consume. Declared
 * structurally so the framework glue stays decoupled from the engine's
 * internals while keeping every exported signature fully typed.
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

export interface UseMrLatin {
  /** The current display language (reactive). */
  language: Ref<LanguageCode>;
  /** True while a translation pass is in flight (reactive). */
  busy: Ref<boolean>;
  /** Switch the page to another language. */
  setLanguage: (language: LanguageCode) => void;
}

/**
 * Manage a Mr.Latin engine for the lifetime of the calling component.
 *
 * The options are read once when the component mounts; pass stable values to
 * configure the engine.
 */
export function useMrLatin(options: MrLatinOptions = {}): UseMrLatin {
  const language: Ref<LanguageCode> = ref(options.language ?? "");
  const busy: Ref<boolean> = ref(false);

  let engine: EngineInstance | null = null;
  let unsubscribe: (() => void) | null = null;

  onMounted(() => {
    engine = asEngine(new MrLatin(options));
    const sync = (): void => {
      if (!engine) return;
      language.value = engine.language;
      busy.value = engine.busy;
    };
    unsubscribe = engine.subscribe(sync);
    engine.start();
    sync();
  });

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    if (engine) {
      teardown(engine);
      engine = null;
    }
  });

  const setLanguage = (next: LanguageCode): void => {
    engine?.setLanguage(next);
  };

  return { language, busy, setLanguage };
}

export default useMrLatin;
