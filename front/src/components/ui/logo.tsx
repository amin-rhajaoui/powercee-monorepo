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
export const Logo = ({ className, width = 240, height = 72 }: LogoProps) => {
  return (
    <Image
      src="/logo.png"
      alt="PowerCEE Logo"
      width={width}
      height={height}
      className={cn(
        "object-contain max-w-full rounded-[24px]",
        "w-[180px] h-auto sm:w-[200px] md:w-[240px]",
        className
      )}
      priority
    />
  );
};
