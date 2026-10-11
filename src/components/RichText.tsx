import { Fragment, type ReactNode } from "react";
import { linkifica } from "./Citacoes";

// Markdown mínimo usado nos enunciados/gabaritos: parágrafos, **negrito**, *itálico*.
function inline(text: string, chave = "t", data?: string): ReactNode[] {
  const out: ReactNode[] = [];
  // **negrito** pode conter *itálico* (ex.: "**… diferente de *habeas corpus* …**")
  const re = /(\*\*((?:[^*]|\*(?!\*))+?)\*\*|\*([^*]+)\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(...linkifica(text.slice(last, m.index), `${chave}${out.length}`, data));
    if (m[2]) out.push(<strong key={k++}>{inline(m[2], `${chave}${out.length}`, data)}</strong>);
    else out.push(<em key={k++}>{m[3]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(...linkifica(text.slice(last), `${chave}${out.length}`, data));
  return out;
}

export function RichText({ text, className, data }: { text: string; className?: string; data?: string }) {
  const paras = text.trim().split(/\n\s*\n/);
  return (
    <div className={className}>
      {paras.map((p, i) => (
        <p key={i}>
          {p.split("\n").map((line, j) => (
            <Fragment key={j}>
              {j > 0 && <br />}
              {inline(line, "t", data)}
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}
