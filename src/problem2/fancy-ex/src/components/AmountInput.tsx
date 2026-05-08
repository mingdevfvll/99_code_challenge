import { type ChangeEvent, useEffect, useId, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "number-flow";
import type NumberFlowElement from "number-flow";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DECIMAL_INPUT_PATTERN = /^[0-9]*\.?[0-9]*$/;
const NUMBER_FLOW_FORMAT = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
} as const satisfies Intl.NumberFormatOptions;

export interface AmountInputProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}

interface NumberFlowOutputProps {
  value: number;
  format: typeof NUMBER_FLOW_FORMAT;
}

function parseDisplayValue(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function NumberFlowOutput({ value, format }: NumberFlowOutputProps) {
  const numberFlowRef = useRef<NumberFlowElement | null>(null);

  useEffect(() => {
    const numberFlow = numberFlowRef.current;
    if (!numberFlow) return;

    numberFlow.format = format;
    numberFlow.update(value);
  }, [format, value]);

  return <number-flow ref={numberFlowRef} />;
}

export function AmountInput({
  label,
  value,
  onChange,
  readOnly = false,
  disabled = false,
  error,
  placeholder = "0.00",
}: AmountInputProps) {
  const id = useId();
  const hasError = Boolean(error);
  const errorId = `${id}-error`;
  const displayValue = parseDisplayValue(value);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value;
    if (!DECIMAL_INPUT_PATTERN.test(nextValue)) return;
    onChange?.(nextValue);
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="font-sans text-xs font-semibold uppercase tracking-wider text-muted-fg"
      >
        {label}
      </label>
      <div
        data-invalid={hasError || undefined}
        className={cn(
          "flex min-h-14 items-center rounded-xl border border-muted bg-surface px-3 transition-colors duration-150 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
          hasError && "border-error focus-within:border-error focus-within:ring-error/20",
          readOnly && "bg-surface-2",
        )}
      >
        {readOnly ? (
          <div
            id={id}
            aria-invalid={hasError}
            aria-describedby={hasError ? errorId : undefined}
            className="w-full font-mono text-2xl text-fg"
          >
            <NumberFlowOutput value={displayValue} format={NUMBER_FLOW_FORMAT} />
          </div>
        ) : (
          <Input
            id={id}
            type="text"
            inputMode="decimal"
            value={value}
            placeholder={placeholder}
            disabled={disabled}
            onChange={handleChange}
            aria-invalid={hasError}
            aria-describedby={hasError ? errorId : undefined}
            className="h-auto border-0 bg-transparent px-0 py-3 font-mono text-2xl text-fg shadow-none outline-none ring-offset-0 placeholder:text-muted-fg focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        )}
      </div>
      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            key="amount-input-error"
            id={errorId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden font-sans text-xs text-error"
            role="alert"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
