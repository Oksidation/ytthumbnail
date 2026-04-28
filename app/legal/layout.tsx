import { NavBar } from "@/components/site/NavBar";
import { Footer } from "@/components/site/Footer";
import { Container } from "@/components/site/Container";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavBar />
      <main className="flex-1 py-16">
        <Container className="prose prose-invert max-w-3xl">
          {children}
        </Container>
      </main>
      <Footer />
    </>
  );
}
