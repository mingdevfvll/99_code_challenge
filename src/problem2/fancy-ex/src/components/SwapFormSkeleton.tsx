import { motion } from "framer-motion";

import { Skeleton } from "@/components/ui/skeleton";
import { cardVariants } from "@/lib/motion";

export function SwapFormSkeleton() {
  return (
    <motion.section
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-md rounded-xl border border-muted bg-surface p-6 shadow-sm"
      aria-label="Loading swap form"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
        <Skeleton className="mx-auto size-8 rounded-full" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
    </motion.section>
  );
}
