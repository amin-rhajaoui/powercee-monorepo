"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Product,
  ProductListItem,
  getProduct,
  formatPrice,
  CATEGORY_LABELS,
  POWER_SUPPLY_LABELS,
} from "@/lib/api/products";
import { s3UrlToProxyUrl } from "@/lib/api";
import { Package, Pencil, Trash2, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";

type ProductSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onRestore: (product: Product) => void;
};

export function ProductSheet({
  open,
  onOpenChange,
  productId,
  onEdit,
  onDelete,
  onRestore,
}: ProductSheetProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && productId) {
      setIsLoading(true);
      getProduct(productId)
        .then(setProduct)
        .catch((err) => {
          toast.error("Impossible de charger le produit");
          console.error(err);
        })
        .finally(() => setIsLoading(false));
    } else {
      setProduct(null);
    }
  }, [open, productId]);

  const imageUrl = product?.image_url ? s3UrlToProxyUrl(product.image_url) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">
            {isLoading
              ? "Chargement..."
              : product
                ? product.name
                : "Détails du produit"}
          </SheetTitle>
          {!isLoading && product && (
            <SheetDescription>{product.brand}</SheetDescription>
          )}
        </SheetHeader>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center h-full min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : product ? (

          <div className="mt-6 space-y-6">
            {/* Image */}
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

            {/* General info */}
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
                  {
                    CATEGORY_LABELS[
                    product.category as keyof typeof CATEGORY_LABELS
                    ]
                  }
                </div>
              </div>
            </div>

            {/* Description */}
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

            {/* Technical specs for Heat Pump */}
            {/* Technical Specifications Container */}
            {(product.category === "HEAT_PUMP" && product.heat_pump_details) ||
              (product.category === "THERMOSTAT" && product.thermostat_details) ? (
              <div className="bg-muted/40 p-4 rounded-lg space-y-3 border border-border/50">
                <h4 className="font-medium text-sm flex items-center gap-2 pb-2 border-b border-border/50">
                  Spécifications techniques
                </h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  {product.category === "HEAT_PUMP" &&
                    product.heat_pump_details && (
                      <>
                        {product.heat_pump_details.etas_35 && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground">
                              ETAS 35°C
                            </span>
                            <span className="font-medium">
                              {product.heat_pump_details.etas_35}%
                            </span>
                          </div>
                        )}
                        {product.heat_pump_details.etas_55 && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground">
                              ETAS 55°C
                            </span>
                            <span className="font-medium">
                              {product.heat_pump_details.etas_55}%
                            </span>
                          </div>
                        )}
                        {product.heat_pump_details.power_minus_7 && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground">
                              Puissance -7°C
                            </span>
                            <span className="font-medium">
                              {product.heat_pump_details.power_minus_7} kW
                            </span>
                          </div>
                        )}
                        {product.heat_pump_details.power_supply && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground">
                              Alimentation
                            </span>
                            <span className="font-medium">
                              {
                                POWER_SUPPLY_LABELS[
                                product.heat_pump_details.power_supply
                                ]
                              }
                            </span>
                          </div>
                        )}
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-muted-foreground">
                            Usage
                          </span>
                          <span className="font-medium">
                            {product.heat_pump_details.is_duo
                              ? "Chauffage + ECS"
                              : "Chauffage seul"}
                          </span>
                        </div>
                        {product.heat_pump_details.class_regulator && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground">
                              Régulateur
                            </span>
                            <span className="font-medium">
                              {product.heat_pump_details.class_regulator}
                            </span>
                          </div>
                        )}
                        {product.heat_pump_details.refrigerant_type && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground">
                              Réfrigérant
                            </span>
                            <span className="font-medium">
                              {product.heat_pump_details.refrigerant_type}
                            </span>
                          </div>
                        )}
                        {product.heat_pump_details.noise_level && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground">
                              Niveau sonore
                            </span>
                            <span className="font-medium">
                              {product.heat_pump_details.noise_level} dB
                            </span>
                          </div>
                        )}
                      </>
                    )}

                  {product.category === "THERMOSTAT" &&
                    product.thermostat_details && (
                      <>
                        {product.thermostat_details.class_rank && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground">
                              Classe
                            </span>
                            <span className="font-medium">
                              {product.thermostat_details.class_rank}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                </div>
              </div>
            ) : null}

            {/* Module codes */}

            {product.module_codes && product.module_codes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Modules CEE
                </h4>
                <div className="flex flex-wrap gap-2">
                  {product.module_codes.map((code) => (
                    <Badge
                      key={code}
                      variant="secondary"
                      className="font-mono text-xs"
                    >
                      {code}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Compatible products info */}

            {product.compatible_product_ids &&
              product.compatible_product_ids.length > 0 && (
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

            {/* Actions */}

            <div className="pt-4 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onEdit(product)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Modifier
              </Button>
              {product.is_active ? (
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => onDelete(product)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Désactiver
                </Button>
              ) : (
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => onRestore(product)}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Réactiver
                </Button>
              )}
            </div>
          </div>

        ) : null}
      </SheetContent>
    </Sheet >
  );
}
