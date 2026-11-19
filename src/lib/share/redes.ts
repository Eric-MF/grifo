// As redes sociais do compartilhar. Nenhuma recebe uma imagem pelo link de compartilhar: os links levam o texto e o
// endereço, e a prévia que a rede mostra vem da imagem da página (og:image). O endereço compartilhado é o da prévia
// da pessoa (src/lib/share/previas.ts), com a imagem da nota ou dos pontos dela. O Pinterest é o único que aceita
// imagem no link, por endereço público: vai a da prévia.
// Por isso:
// - no celular (e onde o navegador sabe compartilhar arquivos), a imagem do card vai pela lista de apps do sistema;
// - no computador, cada rede abre o site dela, com o texto e o link quando ela deixa; copiar e baixar a imagem ficam
//   nos botões próprios.

import { IMAGEM_COMPARTILHAR, SITE } from "@/config/site";

export type IdRede =
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "x"
  | "tiktok"
  | "linkedin"
  | "telegram"
  | "threads"
  | "bluesky"
  | "pinterest"
  | "reddit"
  | "discord"
  | "email";

export interface Rede {
  id: IdRede;
  nome: string;
  /**
   * O link de compartilhar da rede, com o texto e o endereço (nas que não têm, a página dela). `imagem` é o endereço
   * público da imagem da prévia, para a rede que aceita imagem no link (o Pinterest).
   */
  link: (texto: string, url: string, imagem?: string) => string;
  /** A rede recebe o texto e o endereço pelo link (nas outras, abre só o site). */
  recebeLink: boolean;
}

const enc = encodeURIComponent;
const comLink = (texto: string, url: string) => `${texto} ${url}`;

export const REDES: Rede[] = [
  { id: "whatsapp", nome: "WhatsApp", recebeLink: true, link: (t, u) => `https://wa.me/?text=${enc(comLink(t, u))}` },
  { id: "instagram", nome: "Instagram", recebeLink: false, link: () => "https://www.instagram.com/" },
  { id: "facebook", nome: "Facebook", recebeLink: true, link: (_, u) => `https://www.facebook.com/sharer/sharer.php?u=${enc(u)}` },
  { id: "x", nome: "X", recebeLink: true, link: (t, u) => `https://x.com/intent/post?text=${enc(t)}&url=${enc(u)}` },
  { id: "tiktok", nome: "TikTok", recebeLink: false, link: () => "https://www.tiktok.com/" },
  { id: "linkedin", nome: "LinkedIn", recebeLink: true, link: (_, u) => `https://www.linkedin.com/sharing/share-offsite/?url=${enc(u)}` },
  { id: "telegram", nome: "Telegram", recebeLink: true, link: (t, u) => `https://t.me/share/url?url=${enc(u)}&text=${enc(t)}` },
  { id: "threads", nome: "Threads", recebeLink: true, link: (t, u) => `https://www.threads.net/intent/post?text=${enc(comLink(t, u))}` },
  { id: "bluesky", nome: "Bluesky", recebeLink: true, link: (t, u) => `https://bsky.app/intent/compose?text=${enc(comLink(t, u))}` },
  {
    id: "pinterest",
    nome: "Pinterest",
    recebeLink: true,
    // a imagem do Pin tem de estar num endereço público: a da prévia da pessoa (ou, sem ela, a do site)
    link: (t, u, imagem) => `https://www.pinterest.com/pin/create/button/?url=${enc(u)}&media=${enc(imagem ?? SITE.url + IMAGEM_COMPARTILHAR)}&description=${enc(t)}`,
  },
  { id: "reddit", nome: "Reddit", recebeLink: true, link: (t, u) => `https://www.reddit.com/submit?url=${enc(u)}&title=${enc(t)}` },
  { id: "discord", nome: "Discord", recebeLink: false, link: () => "https://discord.com/app" },
  { id: "email", nome: "E-mail", recebeLink: true, link: (t, u) => `mailto:?subject=${enc(t)}&body=${enc(comLink(t, u))}` },
];
