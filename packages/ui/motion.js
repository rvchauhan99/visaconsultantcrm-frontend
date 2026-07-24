/**
 * Framer-motion presets for Editorial Luxe.
 * Apps must have framer-motion installed.
 * Always respect prefers-reduced-motion at call sites.
 */

const easeOut = [0.16, 1, 0.3, 1];

export const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: { duration: 0.42, ease: easeOut },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.28, ease: easeOut },
};

export const sealIn = {
  initial: { opacity: 0, scale: 1.35, rotate: -5 },
  animate: { opacity: 1, scale: 1, rotate: -1.5 },
  transition: { duration: 0.48, ease: easeOut },
};

export const hoverLift = {
  whileHover: { y: -3, transition: { duration: 0.22, ease: easeOut } },
  whileTap: { scale: 0.985 },
};

export const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.36, ease: easeOut } },
};

export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
  transition: { duration: 0.32, ease: easeOut },
};

/** Returns true when user prefers reduced motion */
export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Strip motion props when reduced motion is on */
export function safeMotion(variants) {
  if (prefersReducedMotion()) {
    return {
      initial: false,
      animate: { opacity: 1, y: 0, scale: 1, rotate: 0 },
      exit: undefined,
      transition: { duration: 0 },
      whileHover: undefined,
      whileTap: undefined,
    };
  }
  return variants;
}
