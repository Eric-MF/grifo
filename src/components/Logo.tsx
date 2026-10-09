import { LOGO_PATHS } from "./logo-paths";

/** Grifo da marca, desenhado inline com a cor atual do texto (currentColor). */
export function Logo({ size = 40, title = "Grifo", className }: { size?: number; title?: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 210 210"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={className}
      fill="currentColor"
    >
      {LOGO_PATHS.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
