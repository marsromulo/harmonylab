import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { loginCustomerAction, registerCustomerAction } from "@/app/account/actions";
import { createCheckoutOrderAction } from "@/app/checkout/actions";
import { CheckoutAddressFields } from "@/components/CheckoutAddressFields";
import { CheckoutPaymentMethod } from "@/components/CheckoutPaymentMethod";
import { CheckoutPlaceOrderButton } from "@/components/CheckoutPlaceOrderButton";
import { ReferralCodeField } from "@/components/ReferralCodeField";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getCartSummary } from "@/lib/cart";
import { getCurrentCustomer, getCustomerAddresses } from "@/lib/customers";
import { formatProductPrice } from "@/lib/products";
import { getValidatedWebsiteReferralCode } from "@/lib/referrals";
import { calculateShippingCents } from "@/lib/shipping";

type CheckoutPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  "login-failed": "We could not sign you in with those details.",
  "login-invalid": "Please enter your email and password.",
  "register-failed": "We could not create this account. Try again or sign in.",
  "register-invalid": "Please enter your first name, last name, email, and a password with at least 8 characters.",
  "register-password-mismatch": "Please make sure both password fields match.",
  "payment-cancelled": "Payment was cancelled. You can review your checkout and try again.",
  "payment-unavailable": "That payment method is not available yet. Please choose Credit Card.",
  "referral-invalid": "That referral code was not found. Contact your referrer for the correct code or leave it blank.",
  "shipping-invalid": "Please enter your name, address, and city for delivery.",
};

const successMessages: Record<string, string> = {
  "confirm-email": "Account created. Check your email if confirmation is enabled before checkout.",
  registered: "Account created. You are signed in.",
};

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  await connection();
  const [{ error, success }, cart, { profile, user }, cookieReferralCode] = await Promise.all([
    searchParams,
    getCartSummary(),
    getCurrentCustomer(),
    getValidatedWebsiteReferralCode(),
  ]);
  const addresses = profile ? await getCustomerAddresses(profile.id) : [];
  const currency = cart.lines[0]?.product.currency ?? "HKD";
  const shippingCents = cart.lines.length > 0
    ? await calculateShippingCents({
        country: "Hong Kong",
        subtotalCents: cart.subtotalCents,
      })
    : 0;
  const totalCents = cart.subtotalCents + shippingCents;
  const errorMessage = error ? errorMessages[error] : null;
  const successMessage = success ? successMessages[success] : null;

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
        ) : !user ?  (
          <section className="checkout-auth-stack">
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
                <input name="phone" type="tel" />
              </label>
              <label>
                Password
                <input minLength={8} name="password" type="password" required />
              </label>
              <label>
                Confirm password
                <input minLength={8} name="password_confirmation" type="password" required />
              </label>
              <button type="submit">REGISTER</button>
            </form>
          </section>
        ) : (
          <form action={createCheckoutOrderAction} className="checkout-layout" id="checkout-order-form">
            <div className="checkout-form">
              <h3>Delivery Details</h3>
              <CheckoutAddressFields addresses={addresses} profile={profile} />
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
                <div className="checkout-total">
                  <span>Items</span>
                  <strong>{cart.itemCount}</strong>
                </div>
                <div className="checkout-total">
                  <span>Subtotal</span>
                  <strong>{formatProductPrice({ currency, priceCents: cart.subtotalCents })}</strong>
                </div>
                <div className="checkout-total">
                  <span>Shipping</span>
                  <strong>{formatProductPrice({ currency, priceCents: shippingCents })}</strong>
                </div>
                <div className="checkout-total grand">
                  <span>Total</span>
                  <strong>{formatProductPrice({ currency, priceCents: totalCents })}</strong>
                </div>
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
