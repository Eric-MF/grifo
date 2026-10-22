import { EditorFolha } from "@/components/revisao/EditorFolha";

export const metadata = { title: "Folha de respostas (dev)", robots: { index: false } };

/** Editor do layout da folha de respostas e do caderno de caligrafia. Só existe no `npm run dev`. */
export default function Page() {
  return <EditorFolha />;
}
