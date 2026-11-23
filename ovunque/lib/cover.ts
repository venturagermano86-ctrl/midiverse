import type { CSSProperties } from "react";

/** Cover art procedurale — nessun asset esterno. */
export function coverStyle(hue: number): CSSProperties {
  const h2 = (hue + 42) % 360;
  const h3 = (hue + 190) % 360;
  return {
    background: `
      radial-gradient(ellipse 80% 60% at 20% 20%, hsl(${hue} 70% 48% / 0.9), transparent 55%),
      radial-gradient(ellipse 70% 50% at 85% 75%, hsl(${h2} 65% 40% / 0.75), transparent 50%),
      linear-gradient(145deg, hsl(${h3} 25% 12%), hsl(${hue} 30% 18%))
    `,
  };
}
