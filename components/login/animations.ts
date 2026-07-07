export const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export const stagger = {
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.12 },
  },
};

export const easeOut = [0.22, 1, 0.36, 1] as const;
