import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Badge component — Bridge Design System
 *
 * All badges: rounded (4px), 12px Medium, px-2 py-0.5, visible border.
 * Six semantic color variants per bridge-design-system/SKILL.md.
 */
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded border px-2 py-0.5 text-[12px] font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-colors duration-150 overflow-hidden",
  {
    variants: {
      variant: {
        /* Bridge: Neutral — Slate 05 bg, Slate 15 border, Charcoal 80 text */
        default:
          "bg-[#F9F9FA] border-[#ECEDF0] text-[#3D445A]",
        /* Bridge: Purple — Purple 10 bg, Purple 15 border, Purple S10 text */
        purple:
          "bg-[#F6F2FF] border-[#F1ECFF] text-[#552BCB]",
        /* Bridge: Info — Sky 10 bg, Sky 15 border, Royal S10 text */
        info:
          "bg-[#EEF4FF] border-[#E6EEFF] text-[#0036D7]",
        /* Bridge: Success — Kelly 10 bg, Kelly 15 border, Kelly S10 text */
        success:
          "bg-[#E7F6EA] border-[#DBF1E0] text-[#005F15]",
        /* Bridge: Warning — Honey 10 bg, Honey 15 border, Honey S10 text */
        warning:
          "bg-[#FCF4E6] border-[#FBEFD9] text-[#714A00]",
        /* Bridge: Error — Ruby 10 bg, Ruby 20 border, Ruby S10 text */
        error:
          "bg-[#FCEBEB] border-[#F9D7D7] text-[#9E0000]",
        /* Legacy compat — secondary */
        secondary:
          "bg-[#F9F9FA] border-[#ECEDF0] text-[#3D445A]",
        /* Legacy compat — outline */
        outline:
          "border-[#D9DBE1] bg-transparent text-[#0D1531]",
        /* Legacy compat — destructive */
        destructive:
          "bg-[#FCEBEB] border-[#F9D7D7] text-[#9E0000]",
        ghost: "border-transparent [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "border-transparent text-[#0038FF] underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
