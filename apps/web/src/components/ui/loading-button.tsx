import { Loader2 } from "lucide-react";
import * as React from "react";

import { Button, type ButtonProps, buttonVariants } from "./button";
import { cn } from "@/lib/utils";

interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean;
}

function LoadingButton({
  className,
  variant,
  size,
  isLoading = false,
  disabled,
  children,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}

export { LoadingButton, buttonVariants };
