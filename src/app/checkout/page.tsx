import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { loginCustomerAction, registerCustomerAction } from "@/app/account/actions";
import { createCheckoutOrderAction } from "@/app/checkout/actions";
import { CheckoutAddressFields } from "@/components/CheckoutAddressFields";
import { CheckoutPaymentMethod } from "@/components/CheckoutPaymentMethod";
import { CheckoutPlaceOrderButton } from "@/components/CheckoutPlaceOrderButton";
import { CheckoutTotals } from "@/components/CheckoutTotals";
import { ReferralCodeField } from "@/components/ReferralCodeField";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getCartSummary } from "@/lib/cart";
import { getCurrentCustomer, getCustomerAddresses } from "@/lib/customers";
import { getCheckoutDiscountQuote } from "@/lib/discounts";
import { formatProductPrice } from "@/lib/products";
import { getValidatedWebsiteReferralCode } from "@/lib/referrals";

type CheckoutPageProps = {
  searchParams: Promise<{
    error?: string;
    guest?: string;
    success?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  "login-failed": "We could not sign you in with those details.",
  "login-invalid": "Please enter your email and password.",
  "register-failed": "We could not create this account. Try again or sign in.",
  "register-invalid": "Please enter your first name, last name, email, and a password with at least 6 characters.",
  "register-password-mismatch": "Please make sure both password fields match.",
  "guest-unavailable": "Guest checkout is not enabled yet. Please sign in or create an account.",
  "payment-cancelled": "Payment was cancelled. You can review your checkout and try again.",
  "payment-unavailable": "That payment method is not available. Please choose another option.",
  "referral-invalid": "That referral code was not found. Contact your referrer for the correct code or leave it blank.",
  "shipping-invalid": "Please enter your name, address, and city for delivery.",
};

const successMessages: Record<string, string> = {
  "confirm-email": "Account created. Check your email if confirmation is enabled before checkout.",
  registered: "Account created. You are signed in.",
};

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  await connection();
  const [{ error, guest, success }, cart, { profile, user }, cookieReferralCode] = await Promise.all([
    searchParams,
    getCartSummary(),
    getCurrentCustomer(),
    getValidatedWebsiteReferralCode(),
  ]);
  const addresses = profile ? await getCustomerAddresses(profile.id) : [];
  const currency = cart.lines[0]?.product.currency ?? "HKD";
  const quote = cart.lines.length > 0
    ? await getCheckoutDiscountQuote({
        country: "Hong Kong",
        currency,
        referralCode: profile?.referralCode || cookieReferralCode,
        subtotalCents: cart.subtotalCents,
      })
    : {
        discountCents: 0,
        discountDetails: [],
        shippingCents: 0,
        totalCents: 0,
      };
  const errorMessage = error ? errorMessages[error] : null;
  const successMessage = success ? successMessages[success] : null;
  const isGuestCheckout = guest === "1" || user?.is_anonymous === true;

  return (
    <div className="page">
      <SiteHeader active="products" />
      <main className="checkout-page">
        <div className="section-head checkout-page-head">
          <div>
            <p className="eyebrow">SECURE CHECKOUT</p>
            <h2>Checkout</h2>
          </div>
        </div>

        {errorMessage ? <p className="account-alert error">{errorMessage}</p> : null}
        {successMessage ? <p className="account-alert success">{successMessage}</p> : null}

        {cart.lines.length === 0 ? (
          <section className="cart-empty">
            <h3>Your cart is empty.</h3>
            <p>Add products before checkout.</p>
            <Link className="btn" href="/products">
              SHOP NOW
            </Link>
          </section>
        ) : !user && !isGuestCheckout ? (
          <section className="checkout-auth-stack">
            <div className="account-panel account-form checkout-auth-form">
              <p className="eyebrow">GUEST CHECKOUT</p>
              <h3>Continue without an account</h3>
              <p>
                Enter your contact and delivery information at checkout. We will remember it on this
                device for your next purchase.
              </p>
              <Link className="account-guest-button" href="/checkout?guest=1">
                CONTINUE AS GUEST
              </Link>
            </div>

            <form action={loginCustomerAction} className="account-panel account-form checkout-auth-form">
              <p className="eyebrow">RETURNING CUSTOMER</p>
              <h3>Sign in</h3>
              <p>Already have an account? Sign in to continue checkout.</p>
              <input name="redirect_to" type="hidden" value="/checkout" />
              <label>
                Email
                <input name="email" type="email" required />
              </label>
              <label>
                Password
                <input name="password" type="password" required />
              </label>
              <button type="submit">SIGN IN</button>
            </form>

            <form action={registerCustomerAction} className="account-panel account-form checkout-auth-form">
              <p className="eyebrow">CREATE AN ACCOUNT</p>
              <h3>Register</h3>
              <p>For faster checkout and easy access to your orders, register below.</p>
              <input name="redirect_to" type="hidden" value="/checkout" />
              <div className="account-form-split">
                <label>
                  First name
                  <input name="first_name" required />
                </label>
                <label>
                  Last name
                  <input name="last_name" required />
                </label>
              </div>
              <label>
                Email
                <input name="email" type="email" required />
              </label>
              <label>
                Phone
                <span className="phone-prefix-field">
                  <b>+852</b>
                  <input inputMode="numeric" maxLength={8} name="phone" pattern="[0-9]{8}" type="tel" />
                </span>
              </label>
              <label>
                Password
                <input minLength={6} name="password" type="password" required />
              </label>
              <label>
                Confirm password
                <input minLength={6} name="password_confirmation" type="password" required />
              </label>
              <button type="submit">REGISTER</button>
            </form>

          </section>
        ) : (
          <form action={createCheckoutOrderAction} className="checkout-layout" id="checkout-order-form">
            <input name="checkout_mode" type="hidden" value={isGuestCheckout ? "guest" : "account"} />
            <div className="checkout-form">
              <h3>Delivery Details</h3>
              {isGuestCheckout ? (
                <p className="checkout-guest-note">
                  Guest details are stored on this device and reused on your next checkout.
                </p>
              ) : null}
              <CheckoutAddressFields
                addresses={addresses}
                isGuest={isGuestCheckout}
                profile={profile}
              />
            </div>

            <div className="checkout-side">
              <aside className="checkout-summary">
                <h3>Order Summary</h3>
                <div className="checkout-lines">
                  {cart.lines.map((line) => (
                    <article className="checkout-line" key={line.product.id}>
                      <Image src={line.product.imageUrl} alt={line.product.name} width={64} height={64} />
                      <div>
                        <strong>{line.product.name}</strong>
                        <span>
                          {line.quantity} x {formatProductPrice(line.product)}
                        </span>
                      </div>
                      <b>{formatProductPrice({ currency: line.product.currency, priceCents: line.lineTotalCents })}</b>
                    </article>
                  ))}
                </div>
                <CheckoutTotals
                  currency={currency}
                  formId="checkout-order-form"
                  initialQuote={quote}
                  itemCount={cart.itemCount}
                  subtotalCents={cart.subtotalCents}
                />
                <Link className="cart-clear" href="/cart">
                  Edit cart
                </Link>
              </aside>
              <CheckoutPaymentMethod formId="checkout-order-form" />
              <ReferralCodeField
                formId="checkout-order-form"
                savedCode={profile?.referralCode || cookieReferralCode}
              />
              <CheckoutPlaceOrderButton />
            </div>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
