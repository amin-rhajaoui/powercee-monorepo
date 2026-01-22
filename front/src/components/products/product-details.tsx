import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Product,
    formatPrice,
    CATEGORY_LABELS,
    POWER_SUPPLY_LABELS,
} from "@/lib/api/products";
import { s3UrlToProxyUrl } from "@/lib/api";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductDetailsProps {
    product: Product;
    className?: string;
}

type SpecConfigItem = {
    key: string;
    label: string;
    getValue?: (details: any) => React.ReactNode;
};

const PRODUCT_SPECS_CONFIG: Record<string, SpecConfigItem[]> = {
    HEAT_PUMP: [
        { key: "etas_35", label: "ETAS 35°C", getValue: (d) => `${d.etas_35}%` },
        { key: "etas_55", label: "ETAS 55°C", getValue: (d) => `${d.etas_55}%` },
        {
            key: "power_minus_7",
            label: "Puissance -7°C",
            getValue: (d) => `${d.power_minus_7} kW`,
        },
        {
            key: "power_supply",
            label: "Alimentation",
            getValue: (d) =>
                POWER_SUPPLY_LABELS[d.power_supply as keyof typeof POWER_SUPPLY_LABELS],
        },
        {
            key: "is_duo",
            label: "Usage",
            getValue: (d) => (d.is_duo ? "Chauffage + ECS" : "Chauffage seul"),
        },
        { key: "class_regulator", label: "Régulateur" },
        { key: "refrigerant_type", label: "Réfrigérant" },
        { key: "noise_level", label: "Niveau sonore", getValue: (d) => `${d.noise_level} dB` },
    ],
    THERMOSTAT: [{ key: "class_rank", label: "Classe" }],
};

export function ProductDetails({ product, className }: ProductDetailsProps) {
    const imageUrl = product.image_url ? s3UrlToProxyUrl(product.image_url) : null;

    return (
        <div className={cn("space-y-6", className)}>
            {/* Image & Key Info */}
            <div className="space-y-4">
                <div className="aspect-video bg-muted/30 rounded-lg overflow-hidden flex items-center justify-center border">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={product.name}
                            className="w-full h-full object-contain p-4"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                            }}
                        />
                    ) : (
                        <Package className="h-20 w-20 text-muted-foreground/20" />
                    )}
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">
                            Prix HT
                        </span>
                        <div className="text-2xl font-bold text-primary">
                            {formatPrice(product.price_ht)}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">
                            Statut
                        </span>
                        <div>
                            <Badge
                                variant={product.is_active ? "default" : "secondary"}
                                className="px-2 py-0.5 text-xs font-semibold"
                            >
                                {product.is_active ? "Actif" : "Inactif"}
                            </Badge>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">
                            Référence
                        </span>
                        <div className="font-mono text-sm">{product.reference}</div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">
                            Catégorie
                        </span>
                        <div className="text-sm font-medium">
                            {CATEGORY_LABELS[product.category as keyof typeof CATEGORY_LABELS]}
                        </div>
                    </div>
                </div>
            </div>

            {/* Description */}
            {product.description && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                        Description
                    </h4>
                    <div className="text-sm text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-md">
                        {product.description}
                    </div>
                </div>
            )}

            {/* Technical Specifications Container */}
            {(() => {
                const config = PRODUCT_SPECS_CONFIG[product.category];
                const details =
                    product.category === "HEAT_PUMP"
                        ? product.heat_pump_details
                        : product.category === "THERMOSTAT"
                            ? product.thermostat_details
                            : null;

                if (!config || !details) return null;

                // Filter valid specs that have values
                const validSpecs = config
                    .map((item) => {
                        const value = item.getValue
                            ? item.getValue(details)
                            : details[item.key as keyof typeof details];

                        if (value === null || value === undefined || value === "") return null;
                        return { ...item, value };
                    })
                    .filter(Boolean) as { label: string; value: React.ReactNode }[];

                if (validSpecs.length === 0) return null;

                return (
                    <div className="bg-muted/40 p-4 rounded-lg space-y-3 border border-border/50">
                        <h4 className="font-medium text-sm flex items-center gap-2 pb-2 border-b border-border/50">
                            Spécifications techniques
                        </h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                            {validSpecs.map((spec, index) => (
                                <div key={index} className="flex flex-col gap-0.5">
                                    <span className="text-xs text-muted-foreground">
                                        {spec.label}
                                    </span>
                                    <span className="font-medium">{spec.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {/* Module codes */}
            {product.module_codes && product.module_codes.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Modules CEE
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {product.module_codes.map((code) => (
                            <Badge key={code} variant="secondary" className="font-mono text-xs">
                                {code}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            {/* Compatible products info */}
            {product.compatible_product_ids && product.compatible_product_ids.length > 0 && (
                <div className="bg-blue-50/50 dark:bg-blue-950/10 p-3 rounded-lg border border-blue-100 dark:border-blue-900/20">
                    <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">
                        Compatibilité
                    </h4>
                    <p className="text-sm text-blue-600/80 dark:text-blue-400/80">
                        Ce produit est compatible avec{" "}
                        <span className="font-semibold">
                            {product.compatible_product_ids.length}
                        </span>{" "}
                        autre(s) référence(s).
                    </p>
                </div>
            )}
        </div>
    );
}
