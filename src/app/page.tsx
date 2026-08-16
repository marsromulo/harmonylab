import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

function ValueIcon({ type }: { type: "leaf" | "skin" | "sparkles" | "heart" }) {
  if (type === "leaf") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 19c11 0 14-7 14-14C11 5 5 10 5 19Z" />
        <path d="M5 19c4-6 8-9 14-14" />
      </svg>
    );
  }

  if (type === "skin") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3c-4 3-6 6-6 10a6 6 0 0 0 12 0c0-4-2-7-6-10Z" />
        <path d="M9 14c1.7 1.4 4.3 1.4 6 0" />
      </svg>
    );
  }

  if (type === "sparkles") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3c1.2 4 2.2 5 6 6-3.8 1-4.8 2-6 6-1.2-4-2.2-5-6-6 3.8-1 4.8-2 6-6Z" />
        <path d="M19 14c.6 2 1.1 2.5 3 3-1.9.5-2.4 1-3 3-.6-2-1.1-2.5-3-3 1.9-.5 2.4-1 3-3Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.7A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
    </svg>
  );
}

const concernCards = [
  {
    className: "concern-card--lavender",
    image: "/new-design/assets/product_01.png",
    title: "Anti-Aging & Renewal",
    href: "/products/retinol-serum",
    icon: "sparkles",
  },
  {
    className: "concern-card--pink",
    image: "/new-design/assets/product_02.png",
    title: "Brightening & Even Tone",
    href: "/products/niacinamide-serum",
    icon: "skin",
  },
  {
    className: "concern-card--gold",
    image: "/new-design/assets/product_03.png",
    title: "Hydration & Glow",
    href: "/products/vitamin-c-serum",
    icon: "sparkles",
  },
  {
    className: "concern-card--light-brown",
    image: "/new-design/assets/organic-sunscreen-card-v2.png",
    title: "Organic Sunscreen SPF 50 PA",
    href: "/products/organic-sunscreen-spf-50-pa",
    icon: "heart",
  },
] as const;

export default function Home() {
  return (
    <div className="page new-design-page">
      <SiteHeader active="home" />

      <main>
        <section className="new-hero">
          <div className="store-container new-hero-inner">
            <div className="new-hero-content">
              <p className="new-eyebrow">Scientific skincare</p>
              <h1>
                Your Skin,
                <br />
                Our Harmony.
              </h1>
              <p className="new-hero-lead">Effective. Safe. Beautifully You.</p>
              <p className="new-hero-desc">
                Advanced formulations that nurture your skin and reveal its natural radiance every day.
              </p>

              <div className="new-hero-cta">
                <Link className="new-btn new-btn-primary" href="/products">
                  Shop Best Sellers
                </Link>
              </div>
            </div>
            <div className="new-hero-visual" aria-hidden="true" />
          </div>
        </section>

        <section className="value-strip" aria-label="Store benefits">
          <div className="store-container value-strip-inner">
            <article className="value-item">
              <span className="value-icon">
                <ValueIcon type="leaf" />
              </span>
              <h3>Clean & Safe Ingredients</h3>
            </article>
            <article className="value-item">
              <span className="value-icon">
                <ValueIcon type="skin" />
              </span>
              <h3>Suitable for All Skin Types</h3>
            </article>
            <article className="value-item">
              <span className="value-icon">
                <ValueIcon type="sparkles" />
              </span>
              <h3>Visible Results You Can Feel</h3>
            </article>
            <article className="value-item">
              <span className="value-icon">
                <ValueIcon type="heart" />
              </span>
              <h3>Trusted by Many</h3>
            </article>
          </div>
        </section>

        <section className="new-section section-story" aria-labelledby="story-heading">
          <div className="store-container story-layout">
            <div className="story-video-wrap">
              <video
                id="harmony-story-video"
                className="story-video"
                controls
                playsInline
                preload="metadata"
                aria-label="Harmony skincare story"
              >
                <source src="/media/mainpage-video.mp4" type="video/mp4" />
                Your browser does not support the video element.
              </video>
            </div>

            <div className="section-copy story-copy">
              <p className="section-label">Our story</p>
              <h2 id="story-heading">Science-Backed Skincare That Works in Harmony with You.</h2>
              <p>
                We blend advanced science with gentle, effective ingredients to help your skin look and feel its
                best—every day.
              </p>
              <a className="new-btn new-btn-primary story-button" href="/media/mainpage-video.mp4">
                Watch Our Story
              </a>
            </div>
          </div>
        </section>

        <section className="new-section section-concerns">
          <div className="store-container concerns-layout">
            <div className="section-copy">
              <p className="section-label">Shop by concern</p>
              <h2>
                Find What
                <br />
                Your Skin Needs
              </h2>
              <p>Target your skincare goals with our gentle yet effective formulas.</p>
              <Link className="text-link" href="/products">
                View All Products
              </Link>
            </div>

            <div className="concern-grid">
              {concernCards.map((card) => (
                <article className={`concern-card ${card.className}`} key={card.title}>
                  <Link className="concern-card-media" href={card.href} aria-label={`View ${card.title}`}>
                    <Image src={card.image} alt="" width={330} height={420} />
                  </Link>
                  <div className="concern-card-content">
                    <span className="concern-card-icon">
                      <ValueIcon type={card.icon} />
                    </span>
                    <h3>{card.title}</h3>
                    <Link href={card.href}>Shop Now</Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="new-section section-about">
          <div className="store-container about-grid">
            <div className="section-copy about-copy">
              <p className="section-label">About Harmony Lab</p>
              <h2>
                Skincare that Works
                <br />
                in Harmony with You
              </h2>
              <p>
                We blend advanced science with nature&apos;s best ingredients to create skincare that is safe,
                effective, and made for real results.
              </p>
              <Link className="text-link" href="/products">
                Learn Our Story
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
