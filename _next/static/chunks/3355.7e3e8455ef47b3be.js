"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[3355],{33355:(e,a,o)=>{o.d(a,{corrigirComIA:()=>u});var t=o(34737),r=o(96145),i=o(65880),n=o(23497);let s=`Voc\xea \xe9 examinador(a) da 2\xaa fase do Exame de Ordem (OAB/FGV), \xe1rea Direito Penal.
Corrija a resposta do examinando estritamente pela tabela de "Distribui\xe7\xe3o dos Pontos" fornecida.

Regras da banca que voc\xea deve aplicar:
- Cada componente vale o valor indicado ou zero. N\xe3o h\xe1 meio-termo dentro de um componente.
- Pontue a tese quando o examinando a desenvolveu com as pr\xf3prias palavras, mesmo sem usar os termos exatos do gabarito. Sin\xf4nimos e formula\xe7\xf5es equivalentes contam.
- "A mera cita\xe7\xe3o do dispositivo legal n\xe3o confere pontua\xe7\xe3o": um componente de dispositivo legal s\xf3 pontua se o componente de tese do mesmo item tamb\xe9m pontuou (campo "requer").
- Dispositivo legal com n\xfamero, par\xe1grafo, inciso ou diploma errado n\xe3o pontua.
- Na pe\xe7a, se o examinando redigiu uma pe\xe7a diferente da cab\xedvel (pe\xe7a inadequada), informe peca_adequada = false.
- N\xe3o d\xea pontos por conte\xfado que n\xe3o est\xe1 no texto. Na d\xfavida, n\xe3o pontue e explique o motivo.

Responda SOMENTE com JSON no formato pedido. Justificativas curtas (at\xe9 2 frases), em portugu\xeas, dirigidas ao examinando.`;function p(e){return e.map(e=>({n:e.n,secao:e.secao,descricao:e.descricao,componentes:e.componentes.map(e=>({id:e.id,valor:e.valor,criterio:e.rotulo??(e.dispositivo?`Dispositivo: ${e.dispositivo.join(" ou ")}`:(e.termos??e.alternativas?.flat()??[]).join(" + ")),requer:e.requer}))}))}let d={type:"object",additionalProperties:!1,required:["peca_adequada","itens","comentario_geral"],properties:{peca_adequada:{type:"boolean"},itens:{type:"array",items:{type:"object",additionalProperties:!1,required:["parte","n","componentes"],properties:{parte:{type:"string",description:'C\xf3digo da parte: "peca", "q1", "q2"…'},n:{type:"string",description:'N\xfamero do item na tabela de pontos ("1", "8.2", "A")'},componentes:{type:"array",items:{type:"object",additionalProperties:!1,required:["id","atendido","justificativa"],properties:{id:{type:"string"},atendido:{type:"boolean"},justificativa:{type:"string"},trecho:{type:"string"}}}}}}},comentario_geral:{type:"string"}}},c=r.Ikc({peca_adequada:r.zMY().default(!0),itens:r.YOg(r.Ikc({parte:r.YjP(),n:i.K_(r.NDH,void 0),componentes:r.YOg(r.Ikc({id:r.YjP(),atendido:r.zMY(),justificativa:r.YjP().default(""),trecho:r.YjP().optional()}))})),comentario_geral:r.YjP().default("")});async function u(e,a,o){let r,i,u,m,{sistema:l,usuario:x}=(i=(r=[{parte:"peca",titulo:`Pe\xe7a: ${e.peca.nome}`,enunciado:e.peca.enunciado,gabarito:e.peca.gabarito_comentado,itens:p(e.peca.itens),resposta:a.peca},...e.questoes.map((e,o)=>({parte:`q${e.n}`,titulo:`Quest\xe3o ${e.n}`,enunciado:e.enunciado,gabarito:e.gabarito_comentado,itens:p(e.itens),resposta:a.questoes[o]??""}))]).map(e=>`## ${e.titulo} (parte "${e.parte}")

### Enunciado
${e.enunciado}

### Gabarito comentado da FGV
${e.gabarito}

### Tabela de pontos
${JSON.stringify(e.itens,null,1)}

### Resposta do examinando
<<<
${e.resposta.trim()||"(em branco)"}
>>>`).join("\n\n---\n\n"),u=r.map(e=>`"${e.parte}"`).join(", "),{sistema:s,usuario:`${e.numeral} Exame de Ordem — Direito Penal.

No JSON, o campo "parte" de cada item \xe9 o c\xf3digo da parte (${u}), nunca o nome da se\xe7\xe3o ("Raz\xf5es de Apela\xe7\xe3o"); o campo "n" \xe9 o n\xfamero do item na tabela.

${i}`}),f=["peca",...e.questoes.map(e=>`q${e.n}`)],v=await (0,n.Bf)({...o,sistema:l,usuario:x,schema:((m=structuredClone(d)).properties.itens.items.properties.parte.enum=f,m)}),q=c.safeParse(function(e){let a=e.trim().replace(/^```(?:json)?\s*/i,"").replace(/```\s*$/,"");try{return JSON.parse(a)}catch{let e=a.indexOf("{"),o=a.lastIndexOf("}");if(e>=0&&o>e)return JSON.parse(a.slice(e,o+1));throw new n.PG("A IA respondeu em um formato inesperado.","resposta")}}(v));if(!q.success)throw new n.PG("A resposta da IA n\xe3o seguiu o formato esperado.","resposta");let g=q.data;for(let e of g.itens)e.parte=function(e,a){let o=e.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();if(a.includes(o))return o;let t=o.match(/^q\s*(\d+)\b/)??o.match(/quest\w*\s*(\d+)/);return t&&a.includes(`q${t[1]}`)?`q${t[1]}`:"peca"}(e.parte,f);let b=new Set([...e.peca.itens.map(e=>`peca|${e.n}`),...e.questoes.flatMap(e=>e.itens.map(a=>`q${e.n}|${a.n}`))]);if(g.itens.length&&!g.itens.some(e=>b.has(`${e.parte}|${e.n}`)))throw new n.PG("A IA respondeu sem indicar os itens da tabela de pontos. Tente de novo ou use outro modelo.","resposta");let $=[{parte:"peca",itens:e.peca.itens,valor:e.peca.valor},...e.questoes.map(e=>({parte:`q${e.n}`,itens:e.itens,valor:e.valor}))],h=[],j=$.map(e=>{let o=0;for(let a of e.itens){let t=g.itens.find(o=>o.parte===e.parte&&o.n===a.n),r=new Map(t?.componentes.map(e=>[e.id,e])??[]),i=a.componentes.map(e=>{let a=r.get(e.id),o=!!a?.atendido;return o&&e.requer&&!r.get(e.requer)?.atendido&&(o=!1),{id:e.id,obtido:o?e.valor:0,justificativa:a?.justificativa??"N\xe3o avaliado pela IA.",trecho:a?.trecho}}),n=i.reduce((e,a)=>e+a.obtido,0);o+=a.teto?Math.min(a.teto,n):n,h.push({parte:e.parte,n:a.n,componentes:i})}let r="peca"===e.parte?!a.peca.trim():!a.questoes[Number(e.parte.slice(1))-1]?.trim(),i=(0,t.round2)(o);return(r||"peca"===e.parte&&!g.peca_adequada)&&(i=0),{parte:e.parte,obtido:i,valor:e.valor}});return{provedor:o.provedor,modelo:o.modelo,criadoEm:Date.now(),itens:h,partes:j,total:(0,t.round2)(j.reduce((e,a)=>e+a.obtido,0)),comentarioGeral:(g.peca_adequada?"":"A IA considerou a pe\xe7a inadequada (nota zero na pe\xe7a, conforme o edital). ")+g.comentario_geral}}}}]);