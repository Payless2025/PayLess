import Hero from '@/components/Hero';
import Features from '@/components/Features';
import CodeExample from '@/components/CodeExample';
import UseCases from '@/components/UseCases';
import Comparison from '@/components/Comparison';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Features />
      <CodeExample />
      <UseCases />
      <Comparison />
      <Footer />
    </main>
  );
}

