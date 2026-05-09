import DotField from "@/components/DotField";

export function DotFieldBackground() {
  return (
    <div className="absolute inset-0 z-[1]">
      <DotField
        dotRadius={1.5}
        dotSpacing={17}
        bulgeStrength={26}
        glowRadius={0}
        sparkle={false}
        waveAmplitude={0}
        cursorRadius={650}
        cursorForce={0.78}
        bulgeOnly
        gradientFrom="#A855F7"
        gradientTo="#B497CF"
        glowColor="#000000"
      />
    </div>
  );
}
