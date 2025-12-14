import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3.5 gap-1.5 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all duration-200 overflow-hidden select-none',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-white hover:text-white shadow-sm [a&]:hover:bg-primary/90 [a&]:hover:shadow-md',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'border-transparent bg-destructive text-white hover:text-white shadow-sm [a&]:hover:bg-destructive/90 [a&]:hover:shadow-md focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/80',
        outline:
          'text-foreground border-border [a&]:hover:bg-muted [a&]:hover:border-primary/50',
        success:
          'border-transparent bg-emerald-500 text-white hover:text-white shadow-sm [a&]:hover:bg-emerald-600',
        warning:
          'border-transparent bg-amber-500 text-white hover:text-white shadow-sm [a&]:hover:bg-amber-600',
        info:
          'border-transparent bg-blue-500 text-white hover:text-white shadow-sm [a&]:hover:bg-blue-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
