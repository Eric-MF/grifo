import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Site 100% estático (sem backend): `next build` gera a pasta out/.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // Só afeta o `next dev`: o indicador "N" não aparece no site publicado.
  devIndicators: false,
  // Arquivos *.dev.tsx (painel /revisao) só existem no `next dev`, nunca no site publicado.
  pageExtensions: process.env.NODE_ENV === "development" ? ["dev.tsx", "dev.ts", "tsx", "ts", "jsx", "js"] : ["tsx", "ts", "jsx", "js"],
  // Acesso ao servidor de desenvolvimento pela rede Tailscale (IP e MagicDNS).
  allowedDevOrigins: ["100.80.118.27", "servidor-tai", "*.ts.net", "**.ts.net"],
};

export default nextConfig;
