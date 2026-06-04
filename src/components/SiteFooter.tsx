export function SiteFooter() {
  return (
    <footer className="site-footer">
      <section className="layout3-services" aria-label="Store benefits">
        <div className="layout3-service">
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path d="M5 14h24v21H5z" />
            <path d="M29 22h7l7 7v6H29z" />
            <circle cx="16" cy="37" r="4" />
            <circle cx="36" cy="37" r="4" />
            <path d="M10 9h15M6 21h12M3 27h12" />
          </svg>
          <div>
            <strong>FAST SHIPPING</strong>
            <span>
              Delivery within 1-3
              <br />
              business days
            </span>
          </div>
        </div>
        <div className="layout3-service">
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path d="M24 5 40 12v12c0 10-6 17-16 21C14 41 8 34 8 24V12l16-7Z" />
            <path d="m17 25 5 5 10-12" />
          </svg>
          <div>
            <strong>SECURE PAYMENT</strong>
            <span>
              100% secure payment
              <br />
              guaranteed
            </span>
          </div>
        </div>
        <div className="layout3-service">
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path d="M24 4 44 24 24 44 4 24 24 4Z" />
            <path d="M24 4v40M4 24h40M14 14l20 20M34 14 14 34" />
          </svg>
          <div>
            <strong>100% AUTHENTIC</strong>
            <span>
              Authentic products
              <br />
              you can trust
            </span>
          </div>
        </div>
        <div className="layout3-service">
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path d="M10 29v-5a14 14 0 0 1 28 0v5" />
            <path d="M10 29h6v10h-6zM32 29h6v10h-6z" />
            <path d="M32 39c0 4-4 5-8 5" />
          </svg>
          <div>
            <strong>CUSTOMER SUPPORT</strong>
            <span>
              We&apos;re here to help
              <br />
              you anytime
            </span>
          </div>
        </div>
      </section>
      <p className="layout3-footer">© 2026 Harmony Lab. All rights reserved.</p>
    </footer>
  );
}
