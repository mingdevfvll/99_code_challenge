import { motion } from "framer-motion";
import BorderGlow from './BorderGlow';

import { cardVariants, sectionVariants } from "@/lib/motion";
import { useSwapForm } from "@/hooks/useSwapForm";
import { AmountInput } from "@/components/AmountInput";
import { ExchangeRate } from "@/components/ExchangeRate";
import { PriceErrorCard } from "@/components/PriceErrorCard";
import { SubmitButton } from "@/components/SubmitButton";
import { SwapArrow } from "@/components/SwapArrow";
import { SwapFormSkeleton } from "@/components/SwapFormSkeleton";
import { TokenSelector } from "@/components/TokenSelector";
import { useTheme } from "next-themes";

export function SwapForm() {
  const {
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
  } = useSwapForm();

  const { resolvedTheme } = useTheme();

  const backgroundColor =
    resolvedTheme === "dark" ? "#120F17" : "#f5f7f8";

  if (isLoading) return <SwapFormSkeleton />;
  if (isError) {
    return <PriceErrorCard isRetrying={isFetching} onRetry={refetch} />;
  }

  return (
    <BorderGlow
      edgeSensitivity={30}
      glowColor="40 80 80"
      borderRadius={28}
      glowRadius={40}
      glowIntensity={1}
      coneSpread={25}
      animated={false}
      colors={["#fc84c6", "#f63d19", "#fbda63"]}
      backgroundColor={backgroundColor}
      className="!shadow-lg"
    >
      <motion.form
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        onSubmit={onFormSubmit}
        className="w-full max-w-md rounded-[28px] bg-white dark:bg-surface p-4 md:p-6 shadow-sm"
      >
        <motion.div variants={sectionVariants} className="flex flex-col">
          <p className="font-sans font-semibold text-[10px] uppercase tracking-[2px] text-muted-fg">
            Currency Swap
          </p>
          <h1 className="font-mono text-3xl text-fg">
            Swap<span className="font-semibold text-primary">.</span>
          </h1>
        </motion.div>

        <div className="mt-6 flex flex-col gap-4">
          <motion.section
            variants={sectionVariants}
            className="grid grid-cols-2 gap-3 mb-2"
          >
            <TokenSelector
              label="SEND"
              value={fromToken}
              tokens={tokens}
              disabled={isFormDisabled}
              error={formState.errors.fromSymbol?.message}
              onChange={(token) => setFieldValue("fromSymbol", token.symbol)}
            />
            <AmountInput
              label="AMOUNT"
              value={fromAmount}
              disabled={isFormDisabled}
              error={formState.errors.fromAmount?.message}
              onChange={(value) => setFieldValue("fromAmount", value)}
              className="min-h-12"
            />
          </motion.section>

          <motion.div variants={sectionVariants}>
            <SwapArrow onClick={handleFlip} disabled={isFormDisabled} />
          </motion.div>

          <motion.section
            variants={sectionVariants}
            className="flex flex-col gap-2"
          >
            <TokenSelector
              label="RECEIVE"
              value={toToken}
              tokens={tokens}
              disabled={isFormDisabled}
              error={formState.errors.toSymbol?.message}
              onChange={(token) => setFieldValue("toSymbol", token.symbol)}
            />
            <AmountInput label="ESTIMATED RECEIVE" value={toAmount} readOnly />
          </motion.section>

          <motion.div variants={sectionVariants}>
            <ExchangeRate fromToken={fromToken} toToken={toToken} />
          </motion.div>

          {statusMessage ? (
            <motion.p
              variants={sectionVariants}
              className="font-sans text-xs text-muted-fg"
              role="status"
            >
              {statusMessage}
            </motion.p>
          ) : null}

          <motion.div variants={sectionVariants}>
            <SubmitButton status={status} disabled={isFormDisabled} />
          </motion.div>
        </div>
      </motion.form>
    </BorderGlow>
  );
}
