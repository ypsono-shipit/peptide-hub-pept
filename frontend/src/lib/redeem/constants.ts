/** Research Only sells by kits of 10 vials. 1 SEMA ≈ 1 vial unit. */
export const VIALS_PER_KIT = 10;
export const SEMA_PER_VIAL = 1;
export const SEMA_PER_KIT = VIALS_PER_KIT * SEMA_PER_VIAL; // 10
export const MIN_KITS = 1;
export const MAX_KITS = 20; // soft cap until ops scales

export function kitsToSema(kits: number): number {
  return Math.max(0, Math.floor(kits)) * SEMA_PER_KIT;
}

export function seMaToKits(sema: number): number {
  return Math.floor(sema / SEMA_PER_KIT);
}
