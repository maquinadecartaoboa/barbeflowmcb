import * as React from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  /** Value as a plain decimal string (e.g. "129.90") */
  value: string;
  /** Called with a plain decimal string (e.g. "129.90") */
  onChange: (value: string) => void;
  /** Show R$ prefix. Default: true */
  showPrefix?: boolean;
}

/**
 * Currency input with automatic R$ formatting and numeric keyboard.
 * Uses a cents-based mask: digits entered shift left like a calculator.
 * Typing 1 → 9 → 0 → 0 → 0 produces "190,00".
 * Internal value is always a decimal string (e.g. "190.00") for easy parsing.
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, showPrefix = true, placeholder = "0,00", ...props }, ref) => {
    // Convert decimal string to display format
    const toDisplay = (val: string): string => {
      if (!val) return '';
      const num = parseFloat(val);
      if (isNaN(num)) return '';
      return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Strip everything except digits
      const digits = e.target.value.replace(/\D/g, '');
      if (!digits) {
        onChange('');
        return;
      }
      // Convert cents to decimal string
      const cents = parseInt(digits, 10);
      const decimal = (cents / 100).toFixed(2);
      onChange(decimal);
    };

    return (
      <div className="relative">
        {showPrefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none select-none">
            R$
          </span>
        )}
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          value={toDisplay(value)}
          onChange={handleChange}
          className={cn(
            "flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-base text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            showPrefix && "pl-10",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
