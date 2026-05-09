import { cn } from "@/lib/utils";

const EDGE_PX = 18;
const HALF_PX = EDGE_PX / 2;

export interface CubeLoaderProps {
  className?: string;
  centered?: boolean;
}

export function CubeLoader({ className, centered = false }: CubeLoaderProps) {
  const face =
    "pointer-events-none absolute inset-0 box-border border border-white bg-transparent";

  return (
    <div
      role="status"
      aria-label="Loading"
      aria-live="polite"
      style={{
        width: EDGE_PX,
        height: EDGE_PX,
        ...(centered
          ? {
              position: "absolute",
              left: "50%",
              top: "50%",
              marginLeft: -HALF_PX,
              marginTop: -HALF_PX,
            }
          : {}),
      }}
      className={cn(
        "relative block shrink-0 [transform-style:preserve-3d] animate-loader-cube",
        className,
      )}
    >
      <div
        className={face}
        style={{
          transform: `rotateY(0deg) translateZ(${HALF_PX}px)`,
        }}
      />
      <div
        className={face}
        style={{
          transform: `rotateY(90deg) translateZ(${HALF_PX}px)`,
        }}
      />
      <div
        className={face}
        style={{
          transform: `rotateY(-90deg) translateZ(${HALF_PX}px)`,
        }}
      />
      <div
        className={face}
        style={{
          transform: `rotateY(180deg) translateZ(${HALF_PX}px)`,
        }}
      />
    </div>
  );
}
