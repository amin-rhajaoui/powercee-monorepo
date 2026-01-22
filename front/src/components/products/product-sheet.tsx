"use client";

import { useEffect, useState } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Product, getProduct } from "@/lib/api/products";
import { Pencil, Trash2, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ProductDetails } from "./product-details";

type ProductSheetProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    productId?: string | null;
    product?: Product | null;
    onEdit?: (product: Product) => void;
    onDelete?: (product: Product) => void;
    onRestore?: (product: Product) => void;
};

export function ProductSheet({
    open,
    onOpenChange,
    productId,
    product: initialProduct,
    onEdit,
    onDelete,
    onRestore,
}: ProductSheetProps) {
    const [product, setProduct] = useState<Product | null>(initialProduct || null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open) {
            if (productId) {
                setIsLoading(true);
                getProduct(productId)
                    .then(setProduct)
                    .catch((err) => {
                        toast.error("Impossible de charger le produit");
                        console.error(err);
                    })
                    .finally(() => setIsLoading(false));
            } else if (initialProduct) {
                setProduct(initialProduct);
            }
        } else {
            // Reset state on close if needed, though usually we want to keep it until next open
            // to avoid flashing. But for productId change it's handled above.
        }
    }, [open, productId, initialProduct]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-lg overflow-y-auto flex flex-col h-full p-0 gap-0 w-full">
                {/* Fixed Header */}
                <SheetHeader className="p-6 border-b shrink-0">
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

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full min-h-[200px]">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : product ? (
                        <div className="space-y-6">
                            <ProductDetails product={product} />

                            {/* Actions Section - placed at bottom of content or sticky? 
                  User asked for "padding" in "fenetre glissante". 
                  Putting it end of scroll is standard for long forms/details.
              */}
                            <div className="pt-4 flex gap-3">
                                {onEdit && (
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => onEdit(product)}
                                    >
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Modifier
                                    </Button>
                                )}
                                {product.is_active ? (
                                    onDelete && (
                                        <Button
                                            variant="destructive"
                                            className="flex-1"
                                            onClick={() => onDelete(product)}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Désactiver
                                        </Button>
                                    )
                                ) : (
                                    onRestore && (
                                        <Button
                                            variant="default"
                                            className="flex-1"
                                            onClick={() => onRestore(product)}
                                        >
                                            <RotateCcw className="mr-2 h-4 w-4" />
                                            Réactiver
                                        </Button>
                                    )
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>
            </SheetContent>
        </Sheet>
    );
}
