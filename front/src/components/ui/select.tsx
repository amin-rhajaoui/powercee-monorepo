"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectContextValue {
  value?: string
  onValueChange?: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
}

const SelectContext = React.createContext<SelectContextValue>({
  open: false,
  setOpen: () => {},
})

const Select = ({
  children,
  value,
  onValueChange,
  defaultValue,
}: {
  children: React.ReactNode
  value?: string
  onValueChange?: (value: string) => void
  defaultValue?: string
}) => {
  const [open, setOpen] = React.useState(false)
  const [internalValue, setInternalValue] = React.useState(defaultValue || value || "")
  
  const handleValueChange = React.useCallback((newValue: string) => {
    setInternalValue(newValue)
    onValueChange?.(newValue)
    setOpen(false)
  }, [onValueChange])

  React.useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value)
    }
  }, [value])

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-select-container]')) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <SelectContext.Provider value={{ value: internalValue, onValueChange: handleValueChange, open, setOpen }}>
      <div className="relative" data-select-container>
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button"> & {
    asChild?: boolean
  }
>(({ className, children, asChild, ...props }, ref) => {
  const { value, open, setOpen } = React.useContext(SelectContext)
  
  // #region agent log
  // Fix hypothèse 3: Typage correct pour React.cloneElement avec ref
  // React.cloneElement a des limitations de typage avec les refs
  // On utilise React.ReactElement<any> pour permettre le passage de ref
  fetch('http://127.0.0.1:7245/ingest/608e63c0-36e9-4fc5-88de-a2cccab9ee5a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'select.tsx:76',message:'asChild branch - fix typage cloneElement',data:{asChild:!!asChild,hasChildren:!!children,fixType:'React.ReactElement<any>'},timestamp:Date.now(),sessionId:'debug-session',runId:'select-fix',hypothesisId:'3'})}).catch(()=>{});
  // #endregion
  
  if (asChild && React.isValidElement(children)) {
    // Type assertion nécessaire car React.cloneElement ne peut pas garantir
    // que le type de l'élément enfant accepte une ref
    return React.cloneElement(children as React.ReactElement<any>, { ref, ...props })
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children || value || "Sélectionner..."}
      <ChevronDownIcon className={cn("h-4 w-4 opacity-50 transition-transform", open && "rotate-180")} />
    </button>
  )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const { value } = React.useContext(SelectContext)
  return <span>{value || placeholder || "Sélectionner..."}</span>
}

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, children, ...props }, ref) => {
  const { open } = React.useContext(SelectContext)
  
  if (!open) return null

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 mt-1 max-h-96 min-w-[8rem] overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & {
    value: string
  }
>(({ className, children, value: itemValue, ...props }, ref) => {
  const { value, onValueChange } = React.useContext(SelectContext)
  const isSelected = value === itemValue

  return (
    <div
      ref={ref}
      role="option"
      aria-selected={isSelected}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        isSelected && "bg-accent",
        className
      )}
      onClick={() => onValueChange?.(itemValue)}
      {...props}
    >
      {children}
    </div>
  )
})
SelectItem.displayName = "SelectItem"

export {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
}
