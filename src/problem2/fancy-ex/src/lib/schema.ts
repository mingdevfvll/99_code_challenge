import { z } from "zod";

export const swapSchema = z
  .object({
    fromSymbol: z.string().min(1, "Select a token to send"),
    toSymbol: z.string().min(1, "Select a token to receive"),
    fromAmount: z
      .string()
      .min(1, "Enter an amount")
      .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
        message: "Amount must be a positive number",
      }),
  })
  .refine((data) => data.fromSymbol !== data.toSymbol, {
    message: "Tokens must be different",
    path: ["toSymbol"],
  });

export type SwapFormValues = z.infer<typeof swapSchema>;
