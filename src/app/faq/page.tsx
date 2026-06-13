import type { Metadata } from "next";
import { StaticPageShell } from "@/components/StaticPageShell";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | Harmony Lab",
  description: "Answers about Harmony Lab products, payments, shipping, returns, and support.",
};

const faqSections = [
  {
    title: "Orders & Products",
    questions: [
      {
        question: "What products does Harmony Lab offer?",
        answer:
          "Harmony Lab offers carefully formulated beauty and skincare products designed to support healthy, radiant-looking skin. Product details, ingredients, and usage instructions can be found on each product page.",
      },
      {
        question: "How do I know which product is right for me?",
        answer:
          "Each product page contains detailed information about the product's benefits and recommended use. If you're unsure which product is best for your needs, feel free to contact our customer support team for guidance.",
      },
      {
        question: "Are your products suitable for all skin types?",
        answer:
          "Our products are formulated to be suitable for most skin types. However, individual skin sensitivities may vary. We recommend performing a patch test before full use.",
      },
      {
        question: "Can I use multiple Harmony Lab products together?",
        answer:
          "Yes. Many of our products are designed to complement one another as part of a complete skincare routine. Please follow the usage instructions provided with each product.",
      },
      {
        question: "Do you test on animals?",
        answer:
          "Harmony Lab is committed to responsible beauty practices. Please refer to the product packaging or contact us for specific information regarding individual products.",
      },
    ],
  },
  {
    title: "Orders & Payments",
    questions: [
      {
        question: "What payment methods do you accept?",
        answer:
          "We accept major credit cards, debit cards, and other payment methods displayed at checkout.",
      },
      {
        question: "Can I modify or cancel my order?",
        answer:
          "If your order has not yet been processed or shipped, we may be able to assist with changes or cancellations. Please contact us as soon as possible after placing your order.",
      },
      {
        question: "How can I check my order status?",
        answer:
          "Once your order has been shipped, you will receive a confirmation email containing tracking information (where available).",
      },
    ],
  },
  {
    title: "Shipping",
    questions: [
      {
        question: "Do you ship internationally?",
        answer:
          "Shipping availability depends on your location. Available shipping destinations will be shown during checkout.",
      },
      {
        question: "How long will delivery take?",
        answer:
          "Delivery times vary depending on the destination and shipping method selected. Estimated delivery times will be displayed during checkout.",
      },
      {
        question: "Will I receive tracking information?",
        answer:
          "Yes. Tracking details will be provided by email once your order has been dispatched, where applicable.",
      },
    ],
  },
  {
    title: "Returns & Refunds",
    questions: [
      {
        question: "What is your return policy?",
        answer:
          "If you receive a damaged, defective, or incorrect item, please contact us within 7 days of receiving your order. We will review your request and provide further assistance.",
      },
      {
        question: "Can I return opened products?",
        answer:
          "For hygiene and safety reasons, opened or used beauty products generally cannot be returned unless the item is defective or incorrect.",
      },
      {
        question: "When will I receive my refund?",
        answer:
          "Approved refunds are typically processed within 5–10 business days. The time required for funds to appear in your account may vary depending on your payment provider.",
      },
    ],
  },
  {
    title: "Contact Us",
    questions: [
      {
        question: "How can I contact Harmony Lab?",
        answer:
          "For any questions regarding products, orders, or shipping, please use the contact form on our website or email our customer support team.",
        note: "We aim to respond to all inquiries within 1–2 business days.",
      },
    ],
  },
] as const;

export default function FaqPage() {
  return (
    <StaticPageShell active="faq" label="Frequently Asked Questions">
      <div className="faq-page">
        <header className="faq-header">
          <p>HELP CENTER</p>
          <h1>Frequently Asked Questions</h1>
        </header>

        <div className="faq-sections">
          {faqSections.map((section) => (
            <section className="faq-section" key={section.title}>
              <h2>{section.title}</h2>
              <div className="faq-list">
                {section.questions.map((item) => (
                  <details className="faq-item" key={item.question}>
                    <summary>{item.question}</summary>
                    <div className="faq-answer">
                      <p>{item.answer}</p>
                      {"note" in item ? <p>{item.note}</p> : null}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </StaticPageShell>
  );
}
