"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-btn border-2 border-transparent font-semibold whitespace-nowrap transition-[transform,box-shadow] duration-75 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        brand:
          "bg-primary text-primary-foreground shadow-press-brand active:translate-y-1 active:shadow-none",
        sun: "bg-sun text-[#4A3200] shadow-press-sun active:translate-y-1 active:shadow-none",
        ghost:
          "bg-card text-foreground border-line-strong shadow-press-line active:translate-y-1 active:shadow-none",
        outline:
          "bg-transparent text-foreground border-line-strong hover:bg-muted",
        destructive:
          "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/15",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        default: "h-11 px-6 text-[15px]",
        lg: "h-13 px-8 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "brand", size: "default" },
  },
)

function Button({
  className,
  variant = "brand",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
