import * as React from "react"
import { Download } from "lucide-react"
import { Button, ButtonProps } from "./button"
import { cn } from "@/lib/utils"

export interface DownloadButtonProps extends Omit<ButtonProps, "children"> {
  href: string
  label?: string
}

export function DownloadButton({
  href,
  label,
  className,
  ...props
}: DownloadButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-6 w-6", className)}
      asChild
      {...props}
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label || "Télécharger"}
      >
        <Download className="h-4 w-4" />
      </a>
    </Button>
  )
}
