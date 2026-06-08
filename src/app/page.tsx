import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getFeaturedProducts, getProductDescriptionPreview } from "@/lib/products";

export default async function Home() {
  const products = await getFeaturedProducts(3);
  return (
    <div className="page layout3-page">
      <SiteHeader active="home" />

      <main>
        <section className="layout3-hero">
          <div className="layout3-hero-copy">
            <p className="layout3-eyebrow">Vitamin C Skincare</p>
            <h1>
              Glow Naturally,
              <br />
              <span>Everyday.</span>
            </h1>
            <p className="layout3-lead">
              Brightening skincare essentials infused with Vitamin C to reveal a healthier, radiant you.
            </p>
            <Link className="layout3-btn" href="/products">
              SHOP NOW <span>→</span>
            </Link>
            <div className="layout3-hero-icons">
              <div className="layout3-hero-icon">
                <svg viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M24 5v38M5 24h38" />
                  <path d="M24 11c4 8 5 9 13 13-8 4-9 5-13 13-4-8-5-9-13-13 8-4 9-5 13-13Z" />
                </svg>
                <strong>Brighten</strong>
                <span>
                  Improve dull
                  <br />
                  skin
                </span>
              </div>
              <div className="layout3-hero-icon">
                <svg viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M24 5C15 17 11 24 11 31a13 13 0 0 0 26 0C37 24 33 17 24 5Z" />
                </svg>
                <strong>Hydrate</strong>
                <span>
                  Deep
                  <br />
                  moisture
                </span>
              </div>
              <div className="layout3-hero-icon">
                <svg viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M11 36c18 0 26-9 26-26-17 1-26 9-26 26Z" />
                  <path d="M11 36c7-10 14-16 26-26" />
                  <path d="M16 21C9 19 6 15 6 9c8 0 13 4 15 11" />
                </svg>
                <strong>Nourish</strong>
                <span>
                  Healthy
                  <br />
                  glowing skin
                </span>
              </div>
              <div className="layout3-hero-icon">
                <svg viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M24 6 39 12v12c0 10-6 16-15 20C15 40 9 34 9 24V12l15-6Z" />
                  <path d="m17 25 5 5 10-12" />
                </svg>
                <strong>Protect</strong>
                <span>
                  Strengthen
                  <br />
                  skin barrier
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="layout3-products" aria-label="Featured products">
          {products.map((product) => (
            <article className="layout3-product-card" key={product.id}>
              <Link href={`/products/${product.slug}`} aria-label={`View ${product.name}`} className="layout3-product-card-link">
                <Image src={product.imageUrl} alt={product.name} width={500} height={360} />
              </Link>
              <div className="layout3-product-info">
                <p className="layout3-eyebrow">{product.name}</p>
                <h2>
                  <Link href={`/products/${product.slug}`}>{product.name}</Link>
                </h2>
                <p>{getProductDescriptionPreview(product.description)}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="layout3-benefits">
          <div className="layout3-benefit">
            <div>
              <svg viewBox="0 0 48 48" aria-hidden="true">
                <circle cx="24" cy="24" r="15" />
                <circle cx="24" cy="24" r="9" />
              </svg>
              <h3>Brightening</h3>
              <p>
                Vitamin C helps improve
                <br />
                dull skin and uneven tone.
              </p>
            </div>
          </div>
          <div className="layout3-benefit">
            <div>
              <svg viewBox="0 0 48 48" aria-hidden="true">
                <path d="M24 10c-5 0-9 4-9 9 0 4 3 7 6 8-4 1-8 4-8 9 0 6 6 8 11 3 5 5 11 3 11-3 0-5-4-8-8-9 3-1 6-4 6-8 0-5-4-9-9-9Z" />
                <path d="M24 28v14" />
              </svg>
              <h3>Hydrating</h3>
              <p>
                Deep hydration for
                <br />
                soft and supple skin.
              </p>
            </div>
          </div>
          <div className="layout3-benefit">
            <div>
              <svg viewBox="0 0 48 48" aria-hidden="true">
                <path d="M24 5 39 24 24 43 9 24 24 5Z" />
              </svg>
              <h3>Anti-Aging</h3>
              <p>
                Reduce the look of fine lines
                <br />
                and wrinkles.
              </p>
            </div>
          </div>
          <div className="layout3-benefit flower">
            <div>
              <svg viewBox="0 0 48 48" aria-hidden="true">
                <path d="M23 5c4 7 4 11 0 18-4-7-4-11 0-18Zm0 38c-4-7-4-11 0-18 4 7 4 11 0 18Zm20-20c-7 4-11 4-18 0 7-4 11-4 18 0ZM5 23c7-4 11-4 18 0-7 4-11 4-18 0Z" />
              </svg>
              <h3>Gentle Formula</h3>
              <p>
                Suitable for all skin types,
                <br />
                even sensitive skin.
              </p>
            </div>
          </div>
        </section>

        <section className="layout3-about">
          <Image
            src="/layout3/about-us-banner.png"
            alt="Harmony Lab Vitamin C skincare collection"
            width={1657}
            height={949}
          />
          <div className="layout3-about-text">
            <p className="layout3-eyebrow">About Harmony Lab</p>
            <h2>
              Skincare that cares
              <br />
              for your natural beauty.
            </h2>
            <p>
              At Harmony Lab, we believe healthy, radiant skin starts with high-quality ingredients and the right care.
              Our Vitamin C collection is specially formulated to brighten, hydrate, and protect your skin every day.
            </p>
            <Link className="layout3-btn layout3-outline-btn" href="/products">
              LEARN MORE
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
