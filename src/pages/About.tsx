import { Link } from "react-router";
import {
  Sparkles,
  ArrowRight,
  Compass,
  Droplet,
  ShieldCheck,
  Feather,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerBottomNav } from "@/components/CustomerBottomNav";

export default function About() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans selection:bg-[#C5A059] selection:text-[#111111]">
      {/* Editorial Announcement Bar */}
      <div className="bg-[#111111] text-[#E0C895] text-[11px] sm:text-xs tracking-[0.2em] uppercase py-2 px-4 text-center border-b border-[#262421] font-medium">
        The Fragrance Store — House of Brands
      </div>

      {/* Main Luxury Header */}
      <header className="sticky top-0 z-40 bg-[#111111]/95 backdrop-blur-md border-b border-[#262421] text-[#FDFBF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-6">
          <Link
            to="/store/the-fragrance-store"
            className="flex items-center gap-3 group shrink-0 whitespace-nowrap"
            aria-label="The Fragrance Store - House of Brands"
          >
            <div className="h-10 w-10 rounded-lg overflow-hidden border border-[#C5A059]/40 bg-[#1B1B1B] p-0.5 shadow-sm group-hover:border-[#C5A059] transition-colors">
              <img
                src="/fragrance/brand-mark.svg"
                alt="The Fragrance Store Monogram"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-lg sm:text-xl font-bold tracking-[0.18em] uppercase text-[#FDFBF7] group-hover:text-[#E0C895] transition-colors leading-none">
                The Fragrance Store
              </span>
              <span className="text-[9.5px] sm:text-[10px] tracking-[0.3em] font-sans text-[#C5A059] uppercase mt-1 leading-none">
                House of Brands
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-[13px] tracking-wider uppercase font-medium text-[#C4BEB3]">
            <Link to="/store/the-fragrance-store" className="hover:text-[#FDFBF7] transition-colors whitespace-nowrap">
              Home
            </Link>
            <Link to="/products" className="hover:text-[#FDFBF7] transition-colors whitespace-nowrap">
              Fragrances
            </Link>
            <Link to="/about" className="text-[#C5A059] transition-colors whitespace-nowrap">
              About House
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/products">
              <Button
                size="sm"
                className="h-9 px-4 bg-[#C5A059] hover:bg-[#D9BC7D] text-[#111111] text-xs font-semibold tracking-wider uppercase rounded-none"
              >
                Browse Shop
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24 md:pb-16">
        {/* ==================================================================== */}
        {/* HERO: EDITORIAL HOUSE STATEMENT                                      */}
        {/* ==================================================================== */}
        <section className="relative bg-[#111111] text-[#FDFBF7] py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-b border-[#262421]">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 text-xs tracking-[0.3em] uppercase text-[#C5A059] font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Editorial Dossier</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-[#FDFBF7] leading-tight">
              The Art of <span className="italic text-[#E0C895]">Signature Scents.</span>
            </h1>

            <p className="text-base sm:text-lg text-[#C4BEB3] max-w-2xl mx-auto font-light leading-relaxed">
              The Fragrance Store is a sanctuary for perfume enthusiasts, connoisseurs, and anyone seeking a personal olfactory signature. We curate distinguished flacons from esteemed perfume houses and independent master artisans.
            </p>

            <div className="pt-4 flex items-center justify-center gap-4 text-xs tracking-widest uppercase text-[#9E978C]">
              <span>Curated Selection</span>
              <span>·</span>
              <span>Authentic Provenance</span>
              <span>·</span>
              <span>Artisanal Extraits</span>
            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* SECTION 1: OLFACTORY PHILOSOPHY                                      */}
        {/* ==================================================================== */}
        <section className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-5">
              <span className="text-xs tracking-[0.25em] uppercase text-[#9E7B35] font-semibold block">
                Philosophy
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#111111] leading-tight">
                An Invisible Signature That Outlasts the Moment
              </h2>
              <p className="text-sm sm:text-base text-[#555555] leading-relaxed">
                A truly exceptional fragrance is more than an accessory—it is an evocative memory, an aura of confidence, and an extension of personal identity. Our portfolio brings together fragrances crafted with masterfully balanced olfactory pyramids: brilliant top notes, rich harmonious hearts, and lingering base notes that evolve gracefully throughout the day.
              </p>
              <p className="text-sm sm:text-base text-[#555555] leading-relaxed">
                Whether you gravitate toward the clean vibrancy of sparkling citrus, the warmth of amber and rare woods, or the nocturnal intrigue of pure oud, our collection is curated to inspire discovery.
              </p>
            </div>

            <div className="relative aspect-[4/3] rounded-none overflow-hidden border border-[#E4E0D8] bg-[#141312] shadow-md">
              <img
                src="/fragrance/hero-fragrance.svg"
                alt="The Fragrance Store Heritage"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#111111]/70 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 text-center">
                <span className="text-[11px] tracking-[0.25em] uppercase text-[#C5A059] block font-semibold">
                  House of Brands
                </span>
                <span className="font-serif text-sm text-[#FDFBF7]">
                  Curated Fine Fragrances &amp; Flacons
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* SECTION 2: CONCENTRATION GUIDE (EDUCATIONAL)                         */}
        {/* ==================================================================== */}
        <section className="py-16 sm:py-20 bg-white border-y border-[#E4E0D8]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs tracking-[0.25em] uppercase text-[#9E7B35] font-semibold block mb-1">
                Olfactory Guide
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#111111]">
                Understanding Fragrance Concentrations
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-[#666666]">
                Concentration determines intensity, development on skin, and longevity of wear.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 bg-[#FDFBF7] border border-[#E4E0D8] space-y-3 text-center">
                <div className="inline-flex p-3 rounded-full bg-[#111111] text-[#E0C895] mb-1">
                  <Feather className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-[#111111]">
                  Eau de Toilette
                </h3>
                <span className="text-xs tracking-wider font-mono text-[#9E7B35] block">
                  8% – 15% Essence
                </span>
                <p className="text-xs text-[#666666] leading-relaxed">
                  Lighter, invigorating projection ideal for daytime moments and warm seasons. Lasts 3 to 5 hours.
                </p>
              </div>

              <div className="p-6 bg-[#FDFBF7] border border-[#E4E0D8] space-y-3 text-center">
                <div className="inline-flex p-3 rounded-full bg-[#111111] text-[#E0C895] mb-1">
                  <Droplet className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-[#111111]">
                  Eau de Parfum
                </h3>
                <span className="text-xs tracking-wider font-mono text-[#9E7B35] block">
                  15% – 20% Essence
                </span>
                <p className="text-xs text-[#666666] leading-relaxed">
                  The quintessential balance of radiant presence and longevity. Unfolds beautifully for 6 to 8 hours.
                </p>
              </div>

              <div className="p-6 bg-[#FDFBF7] border border-[#C5A059] space-y-3 text-center shadow-xs">
                <div className="inline-flex p-3 rounded-full bg-[#111111] text-[#E0C895] mb-1">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-[#111111]">
                  Extrait de Parfum
                </h3>
                <span className="text-xs tracking-wider font-mono text-[#9E7B35] block">
                  20% – 40% Essence
                </span>
                <p className="text-xs text-[#666666] leading-relaxed">
                  The pinnacle of perfumery. Intense concentration, opulent warmth, and deep sillage lingering 12+ hours.
                </p>
              </div>

              <div className="p-6 bg-[#FDFBF7] border border-[#E4E0D8] space-y-3 text-center">
                <div className="inline-flex p-3 rounded-full bg-[#111111] text-[#E0C895] mb-1">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-[#111111]">
                  Pure Attars &amp; Oils
                </h3>
                <span className="text-xs tracking-wider font-mono text-[#9E7B35] block">
                  Alcohol-Free Concentrates
                </span>
                <p className="text-xs text-[#666666] leading-relaxed">
                  Traditional oil formulations aged in sandalwood or distilled agarwood, creating an intimate, enduring aura.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* SECTION 3: THREE HOUSE COMMITMENTS                                   */}
        {/* ==================================================================== */}
        <section className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs tracking-[0.25em] uppercase text-[#9E7B35] font-semibold block mb-1">
              Standards
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#111111]">
              The House Commitments
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-white border border-[#E4E0D8] space-y-3">
              <ShieldCheck className="h-6 w-6 text-[#9E7B35]" />
              <h3 className="font-serif text-xl font-semibold text-[#111111]">
                Authenticity Guaranteed
              </h3>
              <p className="text-xs sm:text-sm text-[#666666] leading-relaxed">
                Every bottle and discovery vial in our collection is backed by genuine provenance. We work exclusively with certified distributors and verified perfume creators.
              </p>
            </div>

            <div className="p-8 bg-white border border-[#E4E0D8] space-y-3">
              <Compass className="h-6 w-6 text-[#9E7B35]" />
              <h3 className="font-serif text-xl font-semibold text-[#111111]">
                Curated Discovery
              </h3>
              <p className="text-xs sm:text-sm text-[#666666] leading-relaxed">
                We believe finding a scent should be an exploratory journey. Our discovery sets allow you to experience full compositions and note progressions in your own environment.
              </p>
            </div>

            <div className="p-8 bg-white border border-[#E4E0D8] space-y-3">
              <Sparkles className="h-6 w-6 text-[#9E7B35]" />
              <h3 className="font-serif text-xl font-semibold text-[#111111]">
                Pristine Storage
              </h3>
              <p className="text-xs sm:text-sm text-[#666666] leading-relaxed">
                Delicate perfume oils and natural essences are kept in climate-regulated conditions, shielding each flacon from heat, humidity, and direct sunlight.
              </p>
            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* SECTION 4: CALL TO ACTION                                            */}
        {/* ==================================================================== */}
        <section className="bg-[#111111] text-[#FDFBF7] py-20 px-4 sm:px-6 lg:px-8 border-t border-[#262421]">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <span className="text-xs tracking-[0.3em] uppercase text-[#C5A059] font-medium block">
              Begin Your Journey
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-medium text-[#FDFBF7] leading-tight">
              Ready to Discover Your Signature?
            </h2>
            <p className="text-sm sm:text-base text-[#C4BEB3] max-w-xl mx-auto leading-relaxed">
              Explore our portfolio of fragrances, or browse our proposed collections to experience the artistry of fine scent.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              <Link to="/store/the-fragrance-store">
                <Button
                  className="h-12 px-8 bg-[#C5A059] hover:bg-[#D9BC7D] text-[#111111] text-xs font-semibold tracking-widest uppercase rounded-none"
                >
                  Return to Home
                </Button>
              </Link>
              <Link to="/products">
                <Button
                  variant="outline"
                  className="h-12 px-8 border border-[#443E36] bg-transparent text-[#FDFBF7] hover:bg-[#1B1B1B] text-xs font-semibold tracking-widest uppercase rounded-none"
                >
                  <span>Explore Fragrances</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Persistent Customer Bottom Nav */}
      <CustomerBottomNav active="about" />
    </div>
  );
}
