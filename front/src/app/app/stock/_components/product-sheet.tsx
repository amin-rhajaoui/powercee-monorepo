"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : product ? (
          <>
            <SheetHeader>
              <SheetTitle className="text-xl">{product.name}</SheetTitle>
              <p className="text-sm text-muted-foreground">{product.brand}</p>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Image */}
              <div className="aspect-video bg-muted/30 rounded-lg overflow-hidden flex items-center justify-center">
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
                  <Package className="h-20 w-20 text-muted-foreground/40" />
                )}
              </div>

              {/* General info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Reference</span>
                  <span className="font-mono">{product.reference}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Categorie</span>
                  <Badge>
                    {CATEGORY_LABELS[product.category as keyof typeof CATEGORY_LABELS]}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Prix HT</span>
                  <span className="text-xl font-bold">{formatPrice(product.price_ht)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Statut</span>
                  <Badge variant={product.is_active ? "default" : "secondary"}>
                    {product.is_active ? "Actif" : "Inactif"}
                  </Badge>
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">{product.description}</p>
                  </div>
                </>
              )}

              {/* Technical specs for Heat Pump */}
              {product.category === "HEAT_PUMP" && product.heat_pump_details && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-3">Specifications techniques</h4>
                    <div className="space-y-2 text-sm">
                      {product.heat_pump_details.etas_35 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ETAS 35C</span>
                          <span>{product.heat_pump_details.etas_35}%</span>
                        </div>
                      )}
                      {product.heat_pump_details.etas_55 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ETAS 55C</span>
                          <span>{product.heat_pump_details.etas_55}%</span>
                        </div>
                      )}
                      {product.heat_pump_details.power_minus_7 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Puissance -7C</span>
                          <span>{product.heat_pump_details.power_minus_7} kW</span>
                        </div>
                      )}
                      {product.heat_pump_details.power_supply && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Alimentation</span>
                          <span>
                            {POWER_SUPPLY_LABELS[product.heat_pump_details.power_supply]}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Usage</span>
                        <span>
                          {product.heat_pump_details.is_duo
                            ? "Chauffage + ECS"
                            : "Chauffage seul"}
                        </span>
                      </div>
                      {product.heat_pump_details.class_regulator && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Classe regulateur</span>
                          <span>{product.heat_pump_details.class_regulator}</span>
                        </div>
                      )}
                      {product.heat_pump_details.refrigerant_type && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Refrigerant</span>
                          <span>{product.heat_pump_details.refrigerant_type}</span>
                        </div>
                      )}
                      {product.heat_pump_details.noise_level && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Niveau sonore</span>
                          <span>{product.heat_pump_details.noise_level} dB</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Technical specs for Thermostat */}
              {product.category === "THERMOSTAT" && product.thermostat_details && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-3">Specifications techniques</h4>
                    <div className="space-y-2 text-sm">
                      {product.thermostat_details.class_rank && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Classe</span>
                          <span>{product.thermostat_details.class_rank}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Module codes */}
              {product.module_codes && product.module_codes.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-3">Modules CEE</h4>
                    <div className="flex flex-wrap gap-2">
                      {product.module_codes.map((code) => (
                        <Badge key={code} variant="outline">
                          {code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Compatible products info */}
              {product.compatible_product_ids && product.compatible_product_ids.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Produits compatibles</h4>
                    <p className="text-sm text-muted-foreground">
                      {product.compatible_product_ids.length} produit(s) compatible(s)
                    </p>
                  </div>
                </>
              )}

              {/* Actions */}
              <Separator />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => onEdit(product)}>
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
                    Desactiver
                  </Button>
                ) : (
                  <Button variant="default" className="flex-1" onClick={() => onRestore(product)}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reactiver
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
