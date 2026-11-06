import React, { useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import ReviewsSection from '../components/ReviewsSection.jsx';
import ContactModal from '../components/ContactModal.jsx';
import PricingModal from '../components/PricingModal.jsx';

export default function ReviewsPage() {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  return (
    <div className="calculator-layout">
      <Navbar
        backendOnline={true}
        onOpenContact={() => setIsContactOpen(true)}
        onOpenPricing={() => setIsPricingOpen(true)}
      />

      <main className="main-content" style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px' }}>
        <ReviewsSection />
      </main>

      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />

      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        onOpenContact={() => setIsContactOpen(true)}
      />

      <Footer
        onOpenContact={() => setIsContactOpen(true)}
        onOpenPricing={() => setIsPricingOpen(true)}
      />
    </div>
  );
}
