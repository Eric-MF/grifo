// Feriados nacionais, na ordem do calendário: cada um só fica à venda na semana do feriado.
// Base: Lei 662/1949 (redação da Lei 10.607/2002), Lei 6.802/1980 (12/10) e Lei 14.759/2023 (20/11);
// a Sexta-feira da Paixão consta como feriado nacional na portaria federal de cada ano.
import type { Tema } from "../../themes";
import { ANO_NOVO } from "./ano-novo";
import { APARECIDA } from "./aparecida";
import { CONSCIENCIA_NEGRA } from "./consciencia-negra";
import { FINADOS } from "./finados";
import { INDEPENDENCIA } from "./independencia";
import { NATAL } from "./natal";
import { PAIXAO } from "./paixao";
import { REPUBLICA } from "./republica";
import { TIRADENTES } from "./tiradentes";
import { TRABALHO } from "./trabalho";

export const FERIADOS: Tema[] = [ANO_NOVO, PAIXAO, TIRADENTES, TRABALHO, INDEPENDENCIA, APARECIDA, FINADOS, REPUBLICA, CONSCIENCIA_NEGRA, NATAL];
