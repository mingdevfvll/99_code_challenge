import { useEffect, useRef } from "react";
import "number-flow";
import type NumberFlowElement from "number-flow";

export const DECIMAL_INPUT_PATTERN = /^[0-9]*\.?[0-9]*$/;

export const NUMBER_FLOW_FORMAT = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
} as const satisfies Intl.NumberFormatOptions;

export function parseDisplayValue(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

interface NumberFlowOutputProps {
  value: number;
  format: typeof NUMBER_FLOW_FORMAT;
}

export function NumberFlowOutput({ value, format }: NumberFlowOutputProps) {
  const numberFlowRef = useRef<NumberFlowElement | null>(null);

  useEffect(() => {
    const numberFlow = numberFlowRef.current;
    if (!numberFlow) return;

    numberFlow.format = format;
    numberFlow.update(value);
  }, [format, value]);

  return <number-flow ref={numberFlowRef} />;
}
