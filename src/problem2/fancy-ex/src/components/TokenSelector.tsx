import { useId, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { motion } from "framer-motion";

import type { Token } from "@/types";
import { useScramble } from "@/hooks/useScramble";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TokenIcon } from "@/components/TokenIcon";
import { formatUsd } from "@/lib/numbers/currency-format";
import { cn } from "@/lib/utils";

export interface TokenSelectorProps {
  label: string;
  value: Token | null;
  tokens: Token[];
  onChange: (token: Token) => void;
  disabled?: boolean;
  error?: string;
}

export function TokenSelector({
  label,
  value,
  tokens,
  onChange,
  disabled = false,
  error,
}: TokenSelectorProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const selectedSymbol = value?.symbol ?? "";
  const labelId = `${id}-label`;
  const valueId = `${id}-value`;
  const errorId = `${id}-error`;
  const { displayText } = useScramble({
    text: selectedSymbol,
    trigger: Boolean(value),
  });

  function handleSelect(token: Token) {
    onChange(token);
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        id={labelId}
        className="font-sans text-[10px] font-semibold uppercase tracking-wider text-muted-fg"
      >
        {label}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-labelledby={`${labelId} ${valueId}`}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              "h-12 w-full justify-between rounded-xl border-muted bg-surface px-3 text-fg hover:bg-surface-2 hover:text-fg",
              error && "border-error focus-visible:ring-error",
            )}
          >
            {value ? (
              <span className="flex min-w-0 items-center gap-2">
                <TokenIcon key={value.symbol} token={value} />
                <span
                  id={valueId}
                  className="truncate font-mono text-sm tracking-wider"
                >
                  {displayText || value.symbol}
                </span>
              </span>
            ) : (
              <span
                id={valueId}
                className="font-mono text-sm tracking-wider text-muted-fg"
              >
                SELECT TOKEN
              </span>
            )}
            <ChevronsUpDown className="size-4 text-muted-fg" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="max-w-[calc(100vw-2rem)] w-[--radix-popover-trigger-width] p-0"
        >
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Command>
              <CommandInput placeholder="Search token..." />
              <CommandList>
                <CommandEmpty>No token found.</CommandEmpty>
                <CommandGroup>
                  {tokens.map((token) => {
                    const isSelected = token.symbol === value?.symbol;

                    return (
                      <CommandItem
                        key={token.symbol}
                        value={token.symbol}
                        onSelect={() => handleSelect(token)}
                        className="min-w-0 gap-3"
                      >
                        <TokenIcon token={token} />
                        <span className="min-w-0 truncate text-sm text-fg">
                          {token.symbol}
                        </span>
                        <span className="ml-auto shrink-0 text-xs text-muted-fg">
                          {formatUsd(token.price)}
                        </span>
                        {isSelected ? (
                          <Check className="size-3 text-primary" aria-hidden="true" />
                        ) : null}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </motion.div>
        </PopoverContent>
      </Popover>
      {error ? (
        <p id={errorId} className="font-sans text-xs text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
