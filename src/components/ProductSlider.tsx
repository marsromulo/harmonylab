"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type ProductSliderProps = {
  children: ReactNode;
};

export function ProductSlider({ children }: ProductSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollPrevious, setCanScrollPrevious] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  function updateArrowState() {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    const maxScroll = track.scrollWidth - track.clientWidth - 2;
    setCanScrollPrevious(track.scrollLeft > 2);
    setCanScrollNext(track.scrollLeft < maxScroll);
  }

  function scrollProducts(direction: "previous" | "next") {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    const firstCard = track.querySelector<HTMLElement>(".product-card");
    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;
    const step = firstCard ? firstCard.getBoundingClientRect().width + gap : track.clientWidth;

    track.scrollBy({
      behavior: "smooth",
      left: direction === "previous" ? -step : step,
    });
  }

  useEffect(() => {
    updateArrowState();

    const track = trackRef.current;

    if (!track) {
      return;
    }

    const resizeObserver = new ResizeObserver(updateArrowState);
    resizeObserver.observe(track);
    track.addEventListener("scroll", updateArrowState, { passive: true });
    window.addEventListener("resize", updateArrowState);

    return () => {
      resizeObserver.disconnect();
      track.removeEventListener("scroll", updateArrowState);
      window.removeEventListener("resize", updateArrowState);
    };
  }, []);

  return (
    <div className="product-slider">
      <button
        className="product-arrow product-arrow-previous"
        type="button"
        aria-label="Show previous products"
        disabled={!canScrollPrevious}
        onClick={() => scrollProducts("previous")}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <div className="product-track" aria-label="Featured products" ref={trackRef} tabIndex={0}>
        {children}
      </div>

      <button
        className="product-arrow product-arrow-next"
        type="button"
        aria-label="Show next products"
        disabled={!canScrollNext}
        onClick={() => scrollProducts("next")}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}
