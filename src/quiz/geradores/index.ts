// Registro dos geradores de perguntas. Para criar um novo:
//   npm run nova:pergunta -- --gerador <id> <peça>   (cria o arquivo e o inclui nesta lista)
import type { Gerador } from "../types";
import defesa from "./defesa";
import prisaoAcoes from "./prisao-acoes";
import recursos from "./recursos";

export const GERADORES: Gerador[] = [...defesa, ...recursos, ...prisaoAcoes];
