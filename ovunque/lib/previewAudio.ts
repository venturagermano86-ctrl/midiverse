/** Un solo preview alla volta in tutta l'app. */

type Stopper = () => void;

let active: Stopper | null = null;

export function claimPreview(stop: Stopper): void {
  if (active && active !== stop) {
    try {
      active();
    } catch {
      /* ignore */
    }
  }
  active = stop;
}

export function releasePreview(stop: Stopper): void {
  if (active === stop) active = null;
}
