// Festas populares, na ordem do calendário: cada uma só fica à venda na semana da festa.
import type { Tema } from "../../themes";
import { BONFIM } from "./bonfim";
import { CARNAVAL } from "./carnaval";
import { CIRIO } from "./cirio";
import { PARINTINS } from "./parintins";
import { SAO_JOAO } from "./sao-joao";

export const FESTAS: Tema[] = [BONFIM, CARNAVAL, SAO_JOAO, PARINTINS, CIRIO];
