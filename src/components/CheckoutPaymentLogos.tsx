type LogoProps = {
  label: string;
  children: React.ReactNode;
};

function Logo({ children, label }: LogoProps) {
  return (
    <span className="checkout-payment-logo" role="img" aria-label={label} title={label}>
      {children}
    </span>
  );
}

export function CheckoutPaymentLogos() {
  return (
    <div className="checkout-payment-logos" aria-label="Available payment methods">
      <Logo label="AlipayHK and Alipay+">
        <svg className="payment-logo-alipay" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19.695 15.07c3.426 1.158 4.203 1.22 4.203 1.22V3.846C23.898 1.722 22.193 0 20.088 0H3.914C1.808 0 .102 1.722.102 3.846v16.31C.102 22.279 1.808 24 3.915 24h16.173c2.105 0 3.81-1.722 3.81-3.845v-.157s-6.19-2.602-9.315-4.119c-2.096 2.602-4.8 4.181-7.607 4.181-4.75 0-6.361-4.19-4.112-6.949.49-.602 1.324-1.175 2.617-1.497 2.025-.502 5.247.313 8.266 1.317a16.8 16.8 0 0 0 1.341-3.302H5.781v-.952h4.799V6.975H4.77v-.953h5.81V3.591s0-.409.411-.409h2.347v2.84h5.744v.951h-5.744v1.704h4.69a19.45 19.45 0 0 1-1.986 5.06c1.424.52 2.702 1.011 3.654 1.333m-13.81-2.032c-.596.06-1.71.325-2.321.869-1.83 1.608-.735 4.55 2.968 4.55 2.151 0 4.301-1.388 5.99-3.61-2.403-1.182-4.438-2.028-6.637-1.809" />
        </svg>
      </Logo>
      <Logo label="WeChat Pay">
        <svg className="payment-logo-wechat" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8.69 2.19C3.89 2.19 0 5.48 0 9.53c0 2.21 1.17 4.2 3 5.55.2.14.28.4.21.66l-.39 1.48c-.08.3.23.61.41.46l1.9-1.11a.86.86 0 0 1 .72-.1c1.15.35 2.35.45 3.55.35-.86-2.58.16-4.97 1.93-6.45 1.7-1.41 3.88-1.98 5.85-1.84-.57-3.58-4.19-6.35-8.59-6.35zm-2.9 3.8c.64 0 1.16.53 1.16 1.18s-.52 1.18-1.16 1.18-1.17-.53-1.17-1.18.52-1.18 1.17-1.18zm5.81 0c.64 0 1.16.53 1.16 1.18s-.52 1.18-1.16 1.18-1.16-.53-1.16-1.18.52-1.18 1.16-1.18zm5.34 2.87c-1.8-.05-3.75.51-5.28 1.78-1.72 1.43-2.69 3.72-1.78 6.22.94 2.45 3.67 4.23 6.88 4.23.83 0 1.62-.12 2.36-.34.21-.06.43-.03.6.09l1.58.93c.22.13.44-.09.34-.38l-.32-1.23a.49.49 0 0 1 .18-.56C23.02 18.48 24 16.82 24 14.98c0-3.21-2.93-5.84-6.66-6.09-.13-.01-.27-.03-.4-.03z" />
        </svg>
      </Logo>
      <Logo label="PayMe">
        <span className="payment-logo-wordmark payment-logo-payme">P</span>
      </Logo>
      <Logo label="FPS">
        <span className="payment-logo-wordmark payment-logo-fps">FPS</span>
      </Logo>
      <Logo label="UnionPay Wallet">
        <span className="payment-logo-wordmark payment-logo-unionpay">UP</span>
      </Logo>
      <Logo label="Visa">
        <svg className="payment-logo-visa" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9.11 8.26 5.97 15.76H3.92L2.37 9.78c-.09-.37-.17-.5-.46-.66A9.2 9.2 0 0 0 0 8.48l.05-.22h3.3c.45 0 .83.33.89.77l.82 4.33 2.02-5.1zm8.04 5.05c.01-1.98-2.74-2.09-2.72-2.97.01-.27.26-.56.82-.63a3.66 3.66 0 0 1 1.91.34l.34-1.59a5.2 5.2 0 0 0-1.81-.33c-1.92 0-3.27 1.02-3.28 2.48-.01 1.08.96 1.68 1.7 2.04.75.37 1.01.6 1 .93-.01.5-.6.72-1.16.73-.97.02-1.54-.26-1.99-.47l-.35 1.64c.45.21 1.29.39 2.16.4 2.03 0 3.37-1.01 3.38-2.57m5.06 2.45H24l-1.57-7.5h-1.65c-.36 0-.69.22-.83.55l-2.91 6.95h2.04l.4-1.12h2.49zm-2.17-2.66 1.02-2.81.59 2.81zm-8.16-4.84-1.6 7.5H8.34l1.6-7.5z" />
        </svg>
      </Logo>
      <Logo label="Mastercard">
        <span className="payment-logo-mastercard" aria-hidden="true">
          <i />
          <i />
        </span>
      </Logo>
      <Logo label="JCB">
        <span className="payment-logo-wordmark payment-logo-jcb">JCB</span>
      </Logo>
    </div>
  );
}
