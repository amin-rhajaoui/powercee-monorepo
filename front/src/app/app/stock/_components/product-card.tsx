"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductListItem, formatPrice, CATEGORY_LABELS } from "@/lib/api/products";
import { s3UrlToProxyUrl } from "@/lib/api";
import { Package } from "lucide-react";

type ProductCardProps = {
  product: ProductListItem;
  onClick: () => void;
};

const getCategoryBadgeVariant = (category: string) => {
  switch (category) {
    case "HEAT_PUMP":
      return "default";
    case "THERMOSTAT":
      return "secondary";
    default:
      return "outline";
  }
};

export function ProductCard({ product, onClick }: ProductCardProps) {
  const imageUrl = product.image_url ? s3UrlToProxyUrl(product.image_url) : null;

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Image container */}
        <div className="relative aspect-square bg-muted/30 rounded-t-lg overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-contain p-4"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                target.nextElementSibling?.classList.remove("hidden");
              }}
            />
          ) : null}
          <div className={`flex items-center justify-center w-full h-full ${imageUrl ? "hidden" : ""}`}>
            <Package className="h-16 w-16 text-muted-foreground/40" />
          </div>

          {/* Status badge */}
          {!product.is_active && (
            <Badge variant="secondary" className="absolute top-2 right-2">
              Inactif
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Brand and category */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              {product.brand}
            </span>
            <Badge variant={getCategoryBadgeVariant(product.category)} className="text-xs">
              {CATEGORY_LABELS[product.category as keyof typeof CATEGORY_LABELS] || product.category}
            </Badge>
          </div>

          {/* Name */}
          <h3 className="font-semibold text-foreground line-clamp-2">{product.name}</h3>

          {/* Reference */}
          <p className="text-xs text-muted-foreground font-mono">{product.reference}</p>

          {/* Price */}
          <div className="pt-2 border-t">
            <span className="text-xl font-bold text-foreground">
              {formatPrice(product.price_ht)}
            </span>
            <span className="text-xs text-muted-foreground ml-1">HT</span>
          </div>

          {/* Module codes */}
          {product.module_codes && product.module_codes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {product.module_codes.map((code) => (
                <Badge key={code} variant="outline" className="text-xs">
                  {code}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
