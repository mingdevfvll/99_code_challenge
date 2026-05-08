import { useCallback, useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useForm, useWatch } from "react-hook-form";

import type { SwapFormValues, SwapStatus, Token } from "@/types";
import { swapSchema } from "@/lib/schema";
import {
  didMockSwapSucceed,
  formatStatusMessage,
  getConfettiColors,
} from "@/lib/swap";
import { usePrices } from "@/hooks/usePrices";

const EMPTY_VALUES: SwapFormValues = {
  fromSymbol: "",
  toSymbol: "",
  fromAmount: "",
};

export interface UseSwapFormResult {
  tokens: Token[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
  formState: ReturnType<typeof useForm<SwapFormValues>>["formState"];
  fromToken: Token | null;
  toToken: Token | null;
  fromAmount: string;
  toAmount: string;
  isFormDisabled: boolean;
  status: SwapStatus;
  statusMessage: string | null;
  setFieldValue: (name: keyof SwapFormValues, value: string) => void;
  handleFlip: () => void;
  onFormSubmit: ReturnType<
    ReturnType<typeof useForm<SwapFormValues>>["handleSubmit"]
  >;
}

export function useSwapForm(): UseSwapFormResult {
  const { tokens, isLoading, isFetching, isError, refetch } = usePrices();
  const [status, setStatus] = useState<SwapStatus>("idle");

  const form = useForm<SwapFormValues>({
    resolver: zodResolver(swapSchema),
    defaultValues: EMPTY_VALUES,
  });

  const { control, formState, handleSubmit, setValue } = form;
  const [fromSymbol, toSymbol, fromAmount] = useWatch({
    control,
    name: ["fromSymbol", "toSymbol", "fromAmount"],
  });

  const isSubmitting = status === "loading";
  const isFormDisabled = isLoading || isError || isSubmitting;
  const statusMessage = formatStatusMessage(status);

  const fromToken = useMemo(
    () => tokens.find((token) => token.symbol === fromSymbol) ?? null,
    [tokens, fromSymbol],
  );

  const toToken = useMemo(
    () => tokens.find((token) => token.symbol === toSymbol) ?? null,
    [tokens, toSymbol],
  );

  const toAmount = useMemo(() => {
    if (!fromToken || !toToken || !fromAmount) return "";

    const input = Number.parseFloat(fromAmount);
    if (Number.isNaN(input) || input <= 0) return "";

    return ((input * fromToken.price) / toToken.price).toFixed(6);
  }, [fromToken, toToken, fromAmount]);

  useEffect(() => {
    if (status !== "success" && status !== "error") return;

    const id = window.setTimeout(() => {
      setStatus("idle");
    }, 3_000);

    return () => {
      window.clearTimeout(id);
    };
  }, [status]);

  const setFieldValue = useCallback(
    (name: keyof SwapFormValues, value: string) => {
      setValue(name, value, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    },
    [setValue],
  );

  const handleFlip = useCallback(() => {
    setFieldValue("fromSymbol", toSymbol);
    setFieldValue("toSymbol", fromSymbol);
    setFieldValue("fromAmount", toAmount);
  }, [fromSymbol, toSymbol, toAmount, setFieldValue]);

  const onSubmit = useCallback(
    async (values: SwapFormValues) => {
      if (!fromToken || !toToken || !toAmount) {
        setStatus("error");
        toast.error("Swap failed", {
          description: "Select valid tokens and enter an amount.",
        });
        return;
      }

      setStatus("loading");
      await new Promise((resolve) => window.setTimeout(resolve, 1_800));

      const success = didMockSwapSucceed();
      if (success) {
        setStatus("success");
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
          colors: getConfettiColors(),
        });
        toast.success("Swap confirmed", {
          description: `${values.fromAmount} ${values.fromSymbol} -> ${toAmount} ${values.toSymbol}`,
        });
      } else {
        setStatus("error");
        toast.error("Swap failed", {
          description: "Network error. Please try again.",
        });
      }
    },
    [fromToken, toToken, toAmount],
  );

  const onFormSubmit = handleSubmit(onSubmit);

  return {
    tokens,
    isLoading,
    isFetching,
    isError,
    refetch,
    formState,
    fromToken,
    toToken,
    fromAmount,
    toAmount,
    isFormDisabled,
    status,
    statusMessage,
    setFieldValue,
    handleFlip,
    onFormSubmit,
  };
}
