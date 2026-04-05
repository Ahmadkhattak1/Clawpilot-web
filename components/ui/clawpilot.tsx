import type { HTMLAttributes, ReactNode } from "react"

import { cn } from "@/lib/utils"

const sectionSpacing = {
  compact: "px-6 py-12 md:py-16",
  default: "px-6 py-16 md:py-20",
} as const

const containerWidth = {
  sm: "max-w-2xl",
  md: "max-w-3xl",
  lg: "max-w-4xl",
  xl: "max-w-5xl",
} as const

const surfaceTone = {
  default: "border-border/50 bg-card/80",
  muted: "border-border/50 bg-secondary/40",
  frosted: "border-border/50 bg-card/75",
} as const

const surfacePadding = {
  md: "p-5",
  lg: "p-6",
} as const

const surfaceRadius = {
  lg: "rounded-xl",
  xl: "rounded-2xl",
} as const

type ClawSectionProps = HTMLAttributes<HTMLElement> & {
  spacing?: keyof typeof sectionSpacing
}

type ClawContainerProps = HTMLAttributes<HTMLDivElement> & {
  size?: keyof typeof containerWidth
}

type ClawSectionIntroProps = HTMLAttributes<HTMLDivElement> & {
  align?: "left" | "center"
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
}

type ClawSurfaceOptions = {
  interactive?: boolean
  padding?: keyof typeof surfacePadding
  radius?: keyof typeof surfaceRadius
  tone?: keyof typeof surfaceTone
}

type ClawSurfaceProps = HTMLAttributes<HTMLDivElement> & ClawSurfaceOptions

type ClawStatProps = HTMLAttributes<HTMLDivElement> & {
  label: string
  value: ReactNode
}

export function ClawSection({
  className,
  spacing = "default",
  ...props
}: ClawSectionProps) {
  return <section className={cn("relative", sectionSpacing[spacing], className)} {...props} />
}

export function ClawContainer({
  className,
  size = "lg",
  ...props
}: ClawContainerProps) {
  return <div className={cn("mx-auto", containerWidth[size], className)} {...props} />
}

export function ClawSectionIntro({
  align = "center",
  className,
  description,
  eyebrow,
  title,
  ...props
}: ClawSectionIntroProps) {
  const isCentered = align === "center"

  return (
    <div className={cn(isCentered ? "text-center" : "text-left", className)} {...props}>
      {eyebrow ? <p className="type-eyebrow">{eyebrow}</p> : null}
      <h2 className={cn("type-h2", eyebrow ? "mt-4" : undefined)}>{title}</h2>
      {description ? (
        <p
          className={cn(
            "type-body mt-3",
            isCentered ? "mx-auto max-w-2xl" : "max-w-2xl",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  )
}

export function clawSurfaceClassName({
  interactive = false,
  padding = "lg",
  radius = "xl",
  tone = "default",
}: ClawSurfaceOptions = {}) {
  return cn(
    "border",
    surfaceTone[tone],
    surfacePadding[padding],
    surfaceRadius[radius],
    interactive && "transition-colors hover:bg-muted/40",
  )
}

export function ClawSurface({
  className,
  interactive = false,
  padding = "lg",
  radius = "xl",
  tone = "default",
  ...props
}: ClawSurfaceProps) {
  return (
    <div
      className={cn(
        clawSurfaceClassName({ interactive, padding, radius, tone }),
        className,
      )}
      {...props}
    />
  )
}

export function ClawIconFrame({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/40 bg-background",
        className,
      )}
      {...props}
    />
  )
}

export function ClawStat({ className, label, value, ...props }: ClawStatProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)} {...props}>
      <span className="type-stat-value">{value}</span>
      <span className="type-stat-label">{label}</span>
    </div>
  )
}
