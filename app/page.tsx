import { NavBar } from "@/components/site/NavBar";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/landing/Hero";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { SampleGallery } from "@/components/landing/SampleGallery";
import { PricingTable } from "@/components/landing/PricingTable";
import { Faq } from "@/components/landing/Faq";

export default function HomePage() {
  return (
    <>
      <NavBar />
      <main>
        <Hero />
        <FeatureGrid />
        <HowItWorks />
        <SampleGallery />
        <PricingTable />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
