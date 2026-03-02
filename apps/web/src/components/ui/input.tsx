import { Input as InputPrimitive } from "@base-ui/react/input";
import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all",
        "focus:border-[#ff6b6b] focus:ring-2 focus:ring-[#ff6b6b]/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "dark:border-white/10 dark:bg-white/5 dark:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
