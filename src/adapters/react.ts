/**
 * Mr.Latin — React adapter.
 *
 * `useMrLatin` owns one engine instance for the lifetime of the component:
 * it starts Mr.Latin on mount, tears it down on unmount, and re-renders the
 * component whenever the display language or the busy flag changes. React is an
 * *optional* peer dependency — this module is only imported from `mr.latin/react`.
 *
 * ```tsx
 * function Page() {
 *   const { language, busy, setLanguage } = useMrLatin({ languages: ["en", "te"] });
 *   return (
 *     <button disabled={busy} onClick={() => setLanguage("te")}>
 *       {language}
 *     </button>
 *   );
 * }
 * ```
 */

import { useEffect, useRef, useState } from "react";
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
  /** The current display language. */
  language: LanguageCode;
  /** True while a translation pass is in flight. */
  busy: boolean;
  /** Switch the page to another language. */
  setLanguage: (language: LanguageCode) => void;
}

/**
 * Manage a Mr.Latin engine for the lifetime of a React component.
 *
 * The options are read once on mount; pass stable values (or remount the host
 * component) to reconfigure the engine.
 */
export function useMrLatin(options: MrLatinOptions = {}): UseMrLatin {
  const engineRef = useRef<EngineInstance | null>(null);
  const [language, setLanguageState] = useState<LanguageCode>(
    options.language ?? "",
  );
  const [busy, setBusy] = useState<boolean>(false);

  useEffect(() => {
    const engine = asEngine(new MrLatin(options));
    engineRef.current = engine;

    const sync = (): void => {
      setLanguageState(engine.language);
      setBusy(engine.busy);
    };

    const unsubscribe = engine.subscribe(sync);
    engine.start();
    sync();

    return () => {
      unsubscribe();
      teardown(engine);
      engineRef.current = null;
    };
    // Engine is configured once on mount; see the doc comment above.
  }, []);

  const setLanguage = (next: LanguageCode): void => {
    engineRef.current?.setLanguage(next);
  };

  return { language, busy, setLanguage };
}

export default useMrLatin;
