import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-black ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-b-4 border-black/20 hover:brightness-110 active:border-b-0 active:translate-y-1 shadow-xl",
        destructive:
          "bg-destructive text-destructive-foreground border-b-4 border-black/20 hover:brightness-110 active:border-b-0 active:translate-y-1 shadow-xl",
        outline:
          "border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground border-b-4 active:border-b-2 active:translate-y-1",
        secondary:
          "bg-secondary text-secondary-foreground border-b-4 border-black/10 hover:brightness-105 active:border-b-0 active:translate-y-1",
        ghost: "hover:bg-accent hover:text-accent-foreground border-transparent",
        link: "text-primary underline-offset-4 hover:underline",
        // New variants for specific actions
        action: "bg-accent text-accent-foreground border-b-4 border-black/20 hover:brightness-110 active:border-b-0 active:translate-y-1 shadow-xl",
        success: "bg-success text-success-foreground border-b-4 border-black/20 hover:brightness-110 active:border-b-0 active:translate-y-1 shadow-xl",
      },
      size: {
        default: "h-12 px-6 py-2 rounded-2xl",
        sm: "h-10 rounded-xl px-4 text-xs",
        lg: "h-14 rounded-3xl px-10 text-base",
        icon: "h-12 w-12 rounded-2xl",
        xl: "h-16 rounded-3xl px-12 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
