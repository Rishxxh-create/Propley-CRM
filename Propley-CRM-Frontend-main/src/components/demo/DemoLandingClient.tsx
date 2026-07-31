'use client';

import { useCallback } from 'react';
import Clarity from '@microsoft/clarity';
import Link from 'next/link';
import { ClarityTracker } from '@/components/demo/ClarityTracker';

export function DemoLandingClient() {
  const track = useCallback((name: string) => {
    Clarity.event(name);
  }, []);

  const onSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    Clarity.event('demo_inquiry_submit');
    const form = e.currentTarget;
    const name = (form.elements.namedItem('name') as HTMLInputElement)?.value?.trim();
    if (name) {
      Clarity.identify(`lead-${name.toLowerCase().replace(/\s+/g, '-')}`, undefined, 'demo-landing', name);
    }
    alert('Thank you — your interest is recorded in this Clarity demo session.');
    form.reset();
  }, []);

  return (
    <>
      <ClarityTracker page="demo-landing" />
      <header className="clarity-demo-nav">
        <span className="clarity-demo-logo">Propley · Demo</span>
        <nav className="clarity-demo-nav-links" aria-label="Primary">
          <a href="#developments" onClick={() => track('nav_developments')}>
            Developments
          </a>
          <a href="#gallery" onClick={() => track('nav_gallery')}>
            Gallery
          </a>
          <a href="#inquire" onClick={() => track('nav_inquire')}>
            Inquire
          </a>
          <Link href="/demo/analytics" onClick={() => track('nav_analytics')}>
            Analytics
          </Link>
        </nav>
        <button
          type="button"
          className="clarity-demo-nav-cta"
          onClick={() => {
            track('nav_schedule');
            document.getElementById('inquire')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          Schedule visit
        </button>
      </header>

      <section className="clarity-demo-hero">
        <div className="clarity-demo-hero-bg" aria-hidden />
        <div className="clarity-demo-hero-inner">
          <p className="clarity-demo-eyebrow">Clarity demo · session replay test</p>
          <h1>The Ivory Pavilion — cinematic sales experience</h1>
          <p>
            Interact with this page to generate heatmaps and session recordings in Microsoft
            Clarity. Styles use a public CSS file with absolute URLs so replays render correctly.
          </p>
          <div className="clarity-demo-hero-actions">
            <button
              type="button"
              className="clarity-demo-btn-primary"
              onClick={() => {
                track('hero_explore');
                document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Explore gallery
            </button>
            <Link
              href="/demo/analytics"
              className="clarity-demo-btn-ghost"
              onClick={() => track('hero_analytics')}
            >
              View analytics hub
            </Link>
          </div>
        </div>
      </section>

      <section id="developments" className="clarity-demo-section">
        <h2 className="clarity-demo-section-title">Signature developments</h2>
        <div className="clarity-demo-section-rule" />
        <div className="clarity-demo-grid-3">
          <article className="clarity-demo-card">
            <h3>Skyview Estate</h3>
            <p>Terraced residences with panoramic city views and private wellness pavilions.</p>
          </article>
          <article className="clarity-demo-card">
            <h3>Lodha World Towers</h3>
            <p>Iconic vertical living with concierge arrival and curated art program.</p>
          </article>
          <article className="clarity-demo-card">
            <h3>The Ivory Pavilion</h3>
            <p>Low-density estate homes with infinity pool decks and master-suite galleries.</p>
          </article>
        </div>
      </section>

      <section id="gallery" className="clarity-demo-section">
        <h2 className="clarity-demo-section-title">Architectural gallery</h2>
        <div className="clarity-demo-section-rule" />
        <div className="clarity-demo-gallery">
          <figure className="clarity-demo-gallery-item">
            <img
              src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=80"
              alt="Exterior facade at dusk"
              width={900}
              height={600}
            />
            <figcaption className="clarity-demo-gallery-caption">Arrival pavilion</figcaption>
          </figure>
          <figure className="clarity-demo-gallery-item">
            <img
              src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80"
              alt="Living room interior"
              width={600}
              height={400}
            />
            <figcaption className="clarity-demo-gallery-caption">Living pavilion</figcaption>
          </figure>
          <figure className="clarity-demo-gallery-item">
            <img
              src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=80"
              alt="Infinity pool terrace"
              width={600}
              height={400}
            />
            <figcaption className="clarity-demo-gallery-caption">Terrace & pool</figcaption>
          </figure>
        </div>
      </section>

      <section id="inquire" className="clarity-demo-cta-band">
        <div className="clarity-demo-cta-inner">
          <span className="clarity-demo-badge-live">Clarity recording active</span>
          <h2 className="clarity-demo-section-title" style={{ color: '#fff', marginTop: '1rem' }}>
            Request a private presentation
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem' }}>
            Submit the form — each interaction is captured for heatmaps and session replay.
          </p>
          <form className="clarity-demo-form" onSubmit={onSubmit}>
            <label htmlFor="demo-name">Full name</label>
            <input id="demo-name" name="name" type="text" placeholder="Aditya Khanna" required />
            <label htmlFor="demo-email">Email</label>
            <input id="demo-email" name="email" type="email" placeholder="aditya@example.com" />
            <button type="submit" className="clarity-demo-btn-primary" style={{ marginTop: '0.5rem' }}>
              Initialize inquiry
            </button>
          </form>
        </div>
      </section>

      <footer className="clarity-demo-footer">
        <span>Propley demo · project wsfm0rhyky</span>
        <Link href="/demo/analytics">Open analytics hub →</Link>
      </footer>
    </>
  );
}
