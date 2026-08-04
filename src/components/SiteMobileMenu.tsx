"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { siteNavItems, type SiteNavKey } from "./site-navigation";

export function SiteMobileMenu({ active }: { active: SiteNavKey }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        aria-controls="site-mobile-navigation"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close menu" : "Open menu"}
        className="site-menu-toggle"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span />
        <span />
        <span />
      </button>

      {isOpen ? (
        <div className="site-mobile-menu-layer">
          <button
            aria-label="Close menu"
            className="site-mobile-menu-backdrop"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <aside className="site-mobile-menu" id="site-mobile-navigation">
            <div className="site-mobile-menu-head">
              <strong>Menu</strong>
              <button
                aria-label="Close menu"
                className="site-mobile-menu-close"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 5l14 14M19 5 5 19" />
                </svg>
              </button>
            </div>
            <nav aria-label="Mobile navigation">
              {siteNavItems.map((item) => (
                <Link
                  className={active === item.key ? "active" : undefined}
                  href={item.href}
                  key={item.key}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
