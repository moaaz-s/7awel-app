"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import { useHaptic } from "@/context/HapticContext"
import Link from "next/link"

// The updated buttonVariants with rounded pill style matching Revolut design
const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary/15 text-foreground hover:bg-secondary/25",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
        gradient: "bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90",
        // New variants for themed buttons
        white: "bg-white text-black hover:bg-white/90", // Light button for dark backgrounds
        black: "bg-black/80 text-white hover:bg-black/70 backdrop-blur-sm", // Dark button
        light: "bg-white text-black hover:bg-white/90 border border-gray-200", // Light theme button
        dark: "bg-gray-900 text-white hover:bg-black", // Dark theme button
        // Link variant that maintains button styling
        "button-link": "", // For Link components that should look like buttons
      },
      size: {
        default: "h-[var(--button-height-md)] px-5 text-sm",
        sm: "h-[var(--button-height-sm)] px-4 text-xs",
        lg: "h-[var(--button-height-lg)] px-8 text-base",
        icon: "h-10 w-10",
      },
      radius: {
        default: "rounded-[var(--button-radius)]", // Pill shape (rounded-full)
        md: "rounded-md",
        sm: "rounded-sm",
        none: "rounded-none",
      },
      shadow: {
        default: "shadow-sm",
        md: "shadow-md",
        lg: "shadow-lg",
        none: "",
        // Revolut-style shadow - subtle elevation with slight bottom emphasis
        revolut: "shadow-[0_2px_8px_rgba(0,0,0,0.08)]",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      radius: "default",
      shadow: "revolut", // Default to Revolut-style shadow
      fullWidth: false,
    },
  },
)

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
  isIconOnly?: boolean
  haptic?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  href?: string;
  withoutShadow?: boolean;
  fullWidth?: boolean;
  onClick?: React.MouseEventHandler<Element>;
}

// Function to render button content
const ButtonContent: React.FC<{
  children: React.ReactNode;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isIconOnly?: boolean;
  isLoading?: boolean;
}> = ({ 
  children,
  icon,
  iconPosition = 'left',
  isIconOnly = false,
  isLoading = false 
}) => {
  if (isLoading) {
    return (
      <span className="flex items-center justify-center">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        <span>{children}</span>
      </span>
    );
  }
  
  return (
    <span className="flex items-center justify-between gap-2">
      {icon && iconPosition === 'left' && !isIconOnly && 
        <span className="inline-flex">{icon}</span>
      }
      {(!isIconOnly || !icon) && <span>{children}</span>}
      {icon && iconPosition === 'right' && !isIconOnly && 
        <span className="inline-flex">{icon}</span>
      }
      {isIconOnly && icon && 
        <span className="inline-flex">{icon}</span>
      }
    </span>
  );
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    radius, 
    shadow,
    fullWidth,
    isIconOnly = false, 
    asChild = false, 
    isLoading = false, 
    haptic = false,
    onClick,
    children,
    icon,
    iconPosition = 'left',
    href,
    withoutShadow = false,
    ...props 
  }, ref) => {
    const effectiveShadow = withoutShadow ? "none" : shadow;
    const { trigger, isAvailable } = useHaptic();

    const handleClick = (e: React.MouseEvent<Element>) => {
      // Trigger haptic feedback if enabled
      if (haptic && isAvailable && !props.disabled && !isLoading) {
        trigger(haptic === true ? 'light' : haptic);
      }
      // Call the original onClick handler if provided
      onClick?.(e);
    };
    
    // Common button props
    const buttonProps = {
      className: cn(buttonVariants({ 
        variant, 
        size, 
        radius, 
        shadow: effectiveShadow,
        fullWidth,
        className 
      }), isIconOnly ? "p-0 rounded-full" : ""),
      onClick: handleClick,
      disabled: isLoading || props.disabled,
      ...props,
    };
    
    // Render as a Link
    if (href && !asChild) {
      return (
        <Link 
          href={href || '#'} 
          passHref 
          legacyBehavior
        >
          <a
            className={buttonProps.className}
            onClick={handleClick as React.MouseEventHandler<HTMLAnchorElement>}
            {...(props as unknown as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
            ref={ref as React.Ref<HTMLAnchorElement>}
          >
            <ButtonContent
              children={children}
              icon={icon}
              iconPosition={iconPosition}
              isIconOnly={isIconOnly}
              isLoading={isLoading}
            />
          </a>
        </Link>
      );
    }
    
    // Render as a child component
    if (asChild) {
      return (
        <Slot
          {...buttonProps}
          ref={ref}
        >
          <ButtonContent
            children={children}
            icon={icon}
            iconPosition={iconPosition}
            isIconOnly={isIconOnly}
            isLoading={isLoading}
          />
        </Slot>
      );
    }
    
    // Render as regular button
    return (
      <button
        {...buttonProps}
        ref={ref}
      >
        <ButtonContent
          children={children}
          icon={icon}
          iconPosition={iconPosition}
          isIconOnly={isIconOnly}
          isLoading={isLoading}
        />
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
