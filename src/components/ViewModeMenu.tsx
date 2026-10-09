"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_PREFS, FONT_SIZES, THEMES, VERSOES, readPrefs, savePrefs, type Prefs } from "@/lib/prefs";
import styles from "./ViewModeMenu.module.css";

/** Menu "Aa" do cabeçalho: versão (padrão ou celular), tema, tamanho da fonte, densidade e leitura facilitada. */
export function ViewModeMenu() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPrefs(readPrefs());
    const onChange = (e: Event) => setPrefs((e as CustomEvent<Prefs>).detail);
    window.addEventListener("grifo:prefs", onChange);
    return () => window.removeEventListener("grifo:prefs", onChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const update = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePrefs(next);
  };

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        title="Modos de visualização"
      >
        <span aria-hidden>Aa</span>
        <span className="sr-only">Modos de visualização</span>
      </button>
      {open && (
        <div className={styles.panel} role="dialog" aria-label="Modos de visualização">
          <fieldset className={styles.group}>
            <legend>Versão</legend>
            <div className={styles.row}>
              {VERSOES.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  className={styles.chip}
                  aria-pressed={prefs.layout === v.value}
                  onClick={() => update({ layout: v.value })}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className={styles.group}>
            <legend>Tema</legend>
            <div className={styles.themes}>
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={styles.theme}
                  data-swatch={t.value}
                  aria-pressed={prefs.theme === t.value}
                  onClick={() => update({ theme: t.value })}
                >
                  <span className={styles.swatch} aria-hidden />
                  {t.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className={styles.group}>
            <legend>Tamanho do texto</legend>
            <div className={styles.row}>
              {FONT_SIZES.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  className={styles.chip}
                  aria-pressed={prefs.fonte === f.value}
                  onClick={() => update({ fonte: f.value })}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={prefs.densidade === "compacta"}
              onChange={(e) => update({ densidade: e.target.checked ? "compacta" : "confortavel" })}
            />
            Layout compacto
          </label>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={prefs.leitura === "facil"}
              onChange={(e) => update({ leitura: e.target.checked ? "facil" : "padrao" })}
            />
            Fonte de leitura facilitada
          </label>
          <button type="button" className={styles.reset} onClick={() => update(DEFAULT_PREFS)}>
            Restaurar padrão
          </button>
        </div>
      )}
    </div>
  );
}
