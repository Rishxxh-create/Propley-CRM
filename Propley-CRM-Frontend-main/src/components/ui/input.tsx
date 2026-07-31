import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  ref,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        "flex h-12 w-full border-b border-stone-alt bg-transparent px-0 py-2 text-sm font-semibold transition-colors placeholder:text-zinc-400 placeholder:font-normal focus-visible:outline-none focus-visible:border-gold disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
