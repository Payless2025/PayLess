import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import CodeExample from '@/components/CodeExample';
import UseCases from '@/components/UseCases';
import Strengths from '@/components/Strengths';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        <Hero />
        <Features />
        <CodeExample />
        <UseCases />
        <Strengths />
        <Footer />
      </main>
    </>
  );
}

