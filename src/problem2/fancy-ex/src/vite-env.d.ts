/// <reference types="vite/client" />

import type {
  DetailedHTMLProps,
  HTMLAttributes,
} from "react";
import type NumberFlowElement from "number-flow";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "number-flow": DetailedHTMLProps<
        HTMLAttributes<NumberFlowElement>,
        NumberFlowElement
      >;
    }
  }
}
