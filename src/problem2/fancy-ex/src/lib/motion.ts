import type { Variants } from "framer-motion";

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      delayChildren: 0.1,
      staggerChildren: 0.06,
    },
  },
};

export const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};
