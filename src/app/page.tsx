import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { ProductCard } from "@/components/ProductCard";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getFeaturedProducts } from "@/lib/products";

export default async function Home() {
  await connection();
  const featuredProducts = await getFeaturedProducts(3);

  return (
    <div className="page">
      <SiteHeader active="home" />

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">VITAMIN C SKINCARE</p>
            <h1>
              Glow Naturally,
              <br />
              Everyday.
            </h1>
            <p className="lead">
              Brightening skincare essentials infused with
              <br />
              Vitamin C to reveal a healthier, radiant you.
            </p>
            <Link className="btn" href="/products">
              SHOP NOW
            </Link>
            <div className="benefits mini">
              <div>
                <span>✧</span>
                <b>Brighten</b>
                <small>Improve dull skin</small>
              </div>
              <div>
                <span>♧</span>
                <b>Hydrate</b>
                <small>Deep moisture</small>
              </div>
              <div>
                <span>♨</span>
                <b>Nourish</b>
                <small>Healthy glowing skin</small>
              </div>
            </div>
          </div>
          <Image
            className="hero-img"
            src="/asset/hero-products.png"
            alt="Vitamin C skincare products"
            width={669}
            height={471}
            priority
          />
        </section>

        <section className="featured" id="products">
          <div className="section-head">
            <div>
              <h2>Our Products</h2>
            </div>
          </div>
          <button className="arrow left" type="button" aria-label="Previous products">
            ‹
          </button>
          <button className="arrow right" type="button" aria-label="Next products">
            ›
          </button>
          <div className="grid products">
            {featuredProducts.map((product) => (
              <ProductCard product={product} key={product.id} />
            ))}
          </div>
        </section>

        <section className="strip">
          <div>
            <span>◎</span>
            <b>Brightening</b>
            <p>
              Vitamin C helps improve
              <br />
              dull skin and uneven tone.
            </p>
          </div>
          <div>
            <span>♧</span>
            <b>Hydrating</b>
            <p>
              Deep hydration for
              <br />
              soft and supple skin.
            </p>
          </div>
          <div>
            <span>♢</span>
            <b>Anti-Aging</b>
            <p>
              Reduce the look of fine lines
              <br />
              and wrinkles.
            </p>
          </div>
          <div>
            <span>☘</span>
            <b>Gentle Formula</b>
            <p>
              Suitable for all skin types,
              <br />
              even sensitive skin.
            </p>
          </div>
        </section>

        <section className="about">
          <Image
            src="/asset/about-products.png"
            alt="Vitamin C skincare set"
            width={445}
            height={253}
          />
          <div className="about-copy">
            <p className="eyebrow">ABOUT BEAUTY HOST</p>
            <h2>
              Skincare that cares
              <br />
              for your natural beauty.
            </h2>
            <p>
              At Beauty Host, we believe healthy, radiant skin starts with high-quality
              ingredients and the right care. Our Vitamin C collection is specially formulated
              to brighten, hydrate, and protect your skin every day.
            </p>
            <Link className="outline" href="/products">
              LEARN MORE
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
      <Image
        className="phone"
        src="/asset/phone-preview.png"
        alt="Mobile preview"
        width={225}
        height={614}
        aria-hidden="true"
      />
    </div>
  );
}
