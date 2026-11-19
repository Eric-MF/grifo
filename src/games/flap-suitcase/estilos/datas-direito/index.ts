// Datas do Direito, na ordem do calendário: cada uma só fica à venda na semana da data.
// 19/5: Lei 10.448/2002 · 11/8: lei de 11 de agosto de 1827 (cursos jurídicos) · 8/12: Decreto-Lei 8.292/1945 ·
// 14/12: art. 82 da Lei 8.625/1993.
import type { Tema } from "../../themes";
import { DEFENSORIA } from "./defensoria";
import { DIA_DA_JUSTICA } from "./dia-da-justica";
import { MINISTERIO_PUBLICO } from "./ministerio-publico";
import { ONZE_DE_AGOSTO } from "./onze-de-agosto";

export const DATAS_DIREITO: Tema[] = [DEFENSORIA, ONZE_DE_AGOSTO, DIA_DA_JUSTICA, MINISTERIO_PUBLICO];
