import { NavBar } from "@/components/site/NavBar";
import { Footer } from "@/components/site/Footer";
import { PricingTable } from "@/components/landing/PricingTable";
import { Faq } from "@/components/landing/Faq";

export const metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <>
      <NavBar />
      <main>
        <PricingTable />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
