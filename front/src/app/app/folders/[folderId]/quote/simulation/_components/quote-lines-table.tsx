"use client";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { QuoteLine } from "@/lib/api/quote";

interface QuoteLinesTableProps {
  lines: QuoteLine[];
  onUpdateLine: (index: number, field: keyof QuoteLine, value: string | number) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function QuoteLinesTable({ lines, onUpdateLine }: QuoteLinesTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Description</TableHead>
            <TableHead className="w-20 text-center">Qté</TableHead>
            <TableHead className="w-28 text-right">Prix HT</TableHead>
            <TableHead className="w-16 text-center">TVA</TableHead>
            <TableHead className="w-28 text-right">Total TTC</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line, index) => (
            <TableRow key={index}>
              <TableCell>
                {line.is_editable ? (
                  <Input
                    value={line.description}
                    onChange={(e) => onUpdateLine(index, "description", e.target.value)}
                    className="h-8"
                  />
                ) : (
                  <span className="text-muted-foreground">{line.description}</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                <Input
                  type="number"
                  min="1"
                  value={line.quantity}
                  onChange={(e) => onUpdateLine(index, "quantity", e.target.value)}
                  className="h-8 w-16 text-center"
                />
              </TableCell>
              <TableCell className="text-right">
                {line.is_editable ? (
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.unit_price_ht}
                    onChange={(e) => onUpdateLine(index, "unit_price_ht", e.target.value)}
                    className="h-8 w-28 text-right"
                  />
                ) : (
                  <span className="text-muted-foreground">
                    {formatCurrency(line.unit_price_ht)}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-center text-muted-foreground">
                {line.tva_rate}%
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(line.total_ttc)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
