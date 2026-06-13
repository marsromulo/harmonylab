import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ReferralCodeCapture } from "@/components/ReferralCodeCapture";

type ReferralCodePageProps = {
  params: Promise<{
    code: string;
  }>;
};

export default async function ReferralCodePage({ params }: ReferralCodePageProps) {
  const { code } = await params;

  return (
    <div className="page">
      <SiteHeader active="products" />
      <main className="checkout-page">
        <ReferralCodeCapture code={code} />
      </main>
      <SiteFooter />
    </div>
  );
}
