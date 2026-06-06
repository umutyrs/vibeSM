import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-sans font-medium tracking-wide uppercase transition-colors duration-200 focus:outline-none",
  {
    variants: {
      variant: {
        default:
          "border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 shadow-[0_0_10px_rgba(234,89,47,0.1)]",
        secondary:
          "border-white/10 bg-white/5 text-white/80 hover:bg-white/10",
        destructive:
          "border-destructive/20 bg-destructive/10 text-destructive-inline hover:bg-destructive/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]",
        outline: "border-white/10 bg-transparent text-white",
        productPill: "rounded-full border-primary/30 bg-primary/15 text-primary hover:bg-primary/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
