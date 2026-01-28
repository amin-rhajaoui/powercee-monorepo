"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductListItem, formatPrice, CATEGORY_LABELS } from "@/lib/api/products";
import { s3UrlToProxyUrl } from "@/lib/api";
import { Package, Eye } from "lucide-react";

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
      variant="interactive"
      className="group overflow-hidden"
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Image container */}
        <div className="relative aspect-square bg-gradient-to-br from-muted/50 to-muted/30 overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                target.nextElementSibling?.classList.remove("hidden");
              }}
            />
          ) : null}
          <div
            className={`flex items-center justify-center w-full h-full ${
              imageUrl ? "hidden" : ""
            }`}
          >
            <Package className="h-16 w-16 text-muted-foreground/30" />
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="bg-background/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
                <Eye className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>

          {/* Status badge */}
          {!product.is_active && (
            <Badge
              variant="secondary"
              className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm"
            >
              Inactif
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-2">
          {/* Brand and category */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium truncate">
              {product.brand}
            </span>
            <Badge
              variant={getCategoryBadgeVariant(product.category)}
              className="text-xs shrink-0"
            >
              {CATEGORY_LABELS[product.category as keyof typeof CATEGORY_LABELS] ||
                product.category}
            </Badge>
          </div>

          {/* Name */}
          <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>

          {/* Reference */}
          <p className="text-xs text-muted-foreground font-mono">
            {product.reference}
          </p>

          {/* Price */}
          <div className="pt-3 border-t flex items-baseline gap-1">
            <span className="text-xl font-bold text-foreground">
              {formatPrice(product.price_ht)}
            </span>
            <span className="text-xs text-muted-foreground">HT</span>
          </div>

          {/* Module codes */}
          {product.module_codes && product.module_codes.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {product.module_codes.slice(0, 3).map((code) => (
                <Badge key={code} variant="outline" className="text-xs">
                  {code}
                </Badge>
              ))}
              {product.module_codes.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{product.module_codes.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
