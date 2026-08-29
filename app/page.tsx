import Header from '@/components/Header';
import Hero from '@/components/Hero';
import HowItWorks from '@/components/HowItWorks';
import CodeExample from '@/components/CodeExample';
import UseCases from '@/components/UseCases';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-payless-dark-bg">
        <Hero />
        <HowItWorks />
        <CodeExample />
        <UseCases />
        <Footer />
      </main>
    </>
  );
}
