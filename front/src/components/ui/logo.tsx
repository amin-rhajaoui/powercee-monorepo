import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

/**
 * Composant Logo pour PowerCEE.
 * Utilise l'image /logo.png placée dans le dossier public.
 */
export const Logo = ({ className, width = 120, height = 40 }: LogoProps) => {
  return (
    <div className={cn("flex items-center justify-center rounded-2xl overflow-hidden border border-zinc-100/50", className)}>
      <Image
        src="/logo.png"
        alt="PowerCEE Logo"
        width={width}
        height={height}
        className="object-contain h-full w-auto"
        priority
      />
    </div>
  );
};
