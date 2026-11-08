interface LogoProps {
  variant?: "light" | "dark"
  withTagline?: boolean
  className?: string
}

export function Logo({ variant = "light", withTagline = false, className }: LogoProps) {
  const word = variant === "dark" ? "text-white" : "text-foreground"
  const tag = variant === "dark" ? "text-white/50" : "text-muted-foreground"

  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <img
        src="/mark.png"
        alt="Duta Integra"
        className="h-10 w-10 shrink-0 rounded-[10px] object-contain shadow-xs"
        draggable={false}
      />
      <span className="flex flex-col leading-none">
        <span className={`font-heading text-xl font-extrabold tracking-tight ${word}`}>
          dutaintegra<span className="text-[#F04E00]">.my</span>
        </span>
        {withTagline && (
          <span className={`mt-1 text-[9px] font-semibold tracking-[0.18em] ${tag}`}>
            SATU PLATFORM, PELUANG TANPA HAD
          </span>
        )}
      </span>
    </span>
  )
}
