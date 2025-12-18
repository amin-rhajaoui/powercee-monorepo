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
export const Logo = ({ className, width = 150, height = 50 }: LogoProps) => {
  return (
    <div className={cn("flex items-center overflow-hidden rounded-3xl", className)}>
      <Image
        src="/logo.png"
        alt="Prima Logo"
        width={width}
        height={height}
        className="object-contain"
        priority
      />
    </div>
  );
};
