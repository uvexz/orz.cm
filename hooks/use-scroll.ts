import { useEffect, useRef, useState } from "react";

export function useScroll(threshold: number) {
  const [scrolled, setScrolled] = useState(false);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const updateScrollState = () => {
      frameRef.current = null;
      const nextScrolled = window.scrollY > threshold;
      setScrolled((previous) =>
        previous === nextScrolled ? previous : nextScrolled,
      );
    };

    const onScroll = () => {
      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(updateScrollState);
    };

    updateScrollState();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      window.removeEventListener("scroll", onScroll);
    };
  }, [threshold]);

  return scrolled;
}
