interface LogoProps {
  variant?: "light" | "dark"
  withTagline?: boolean
  className?: string
}

export function Logo({ variant = "light", withTagline = false, className }: LogoProps) {
  const word = variant === "dark" ? "text-white" : "text-[#10263b]"
  const tag = variant === "dark" ? "text-white/50" : "text-slate-500"

  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <svg className="h-9 w-9 shrink-0" viewBox="0 0 40 40" aria-hidden="true">
        <path d="M7 4h7.5c2.2 0 4.2 1.1 5.5 2.9l7.2 10.2-7.5 5.2-5.6-7.9-5.2 3.6V4Z" fill="#1b9d8d" />
        <path d="M7 19.6 17.4 12l7.2 10.2-14.6 10.1H7V19.6Z" fill="#127c72" />
        <path d="M18.5 25.8 25.8 20l7.2 10.1-6.1 4.3-8.4-8.6Z" fill="#55b9a8" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className={`font-heading text-[16px] font-bold tracking-tight ${word}`}>Duta Integra</span>
        <span className={`mt-0.5 text-[13px] font-medium ${tag}`}>{withTagline ? "Solutions · Satu platform, peluang tanpa had" : "Solutions"}</span>
      </span>
    </span>
  )
}
