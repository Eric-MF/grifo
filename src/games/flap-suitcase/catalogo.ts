// Todos os estilos do Flap Suitcase. A posição de cada um vai no código de verificação,
// então estilos novos só entram no fim da lista (os grupos, na ordem de GRUPOS_ESTILOS).
import { TEMAS_BASE, type Tema } from "./themes";
import { SURPRESAS_BASE } from "./estilos/base";
import { CENARIOS_BASE } from "./estilos/base-cenarios";
import { BIOMAS } from "./estilos/biomas";
import { CONSTITUICOES } from "./estilos/constituicoes";
import { DATAS_DIREITO } from "./estilos/datas-direito";
import { ESTADOS } from "./estilos/estados";
import { FERIADOS } from "./estilos/feriados";
import { FESTAS } from "./estilos/festas";

// os estilos de fora dos grupos ganham aqui o cenário (ver estilos/base-cenarios.ts) e a surpresa (estilos/base.ts)
const BASE: Tema[] = TEMAS_BASE.map((t) => ({ ...t, ...CENARIOS_BASE[t.id], ...(SURPRESAS_BASE[t.id] ? { surpresa: SURPRESAS_BASE[t.id] } : {}) }));

export const TEMAS: Tema[] = [...BASE, ...FERIADOS, ...ESTADOS, ...BIOMAS, ...CONSTITUICOES, ...DATAS_DIREITO, ...FESTAS];
export const temaPorId = (id: string) => TEMAS.find((t) => t.id === id) ?? TEMAS[0];
