import Image from "next/image";
import Link from "next/link";
import {
  ShoppingCart,
  Truck,
  Shield,
  ChevronRight,
  Smartphone,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/images/logo1.png"
              alt="Ewuang"
              width={40}
              height={40}
            />
            <span className="text-xl font-bold text-[#0b2545]">Ewuang</span>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-[#0b2545] text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-[#0b2545]/90 transition-colors"
          >
            Se connecter
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#e8fdf5] via-white to-[#f0fdf4] -z-10" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#4ade80]/20 to-[#22d3ee]/20 blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-[#a3e635]/15 to-[#34d399]/15 blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            {/* Text */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-[#0b2545]/5 rounded-full px-4 py-1.5 text-sm text-[#0b2545] font-medium mb-6">
                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-[#4ade80] to-[#22d3ee]" />
                Marketplace Gabonaise
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0b2545] leading-tight mb-6">
                Achetez & vendez
                <br />
                <span className="bg-gradient-to-r from-[#4ade80] via-[#34d399] to-[#22d3ee] bg-clip-text text-transparent">
                  en toute simplicité
                </span>
              </h1>
              <p className="text-lg text-gray-600 max-w-lg mx-auto lg:mx-0 mb-8">
                La première marketplace gabonaise qui connecte acheteurs,
                vendeurs et livreurs sur une seule plateforme.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-[#4ade80] to-[#22d3ee] text-[#0b2545] px-8 py-3.5 rounded-full text-base font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-[#4ade80]/25"
                >
                  Accéder au dashboard
                  <ChevronRight className="w-5 h-5" />
                </Link>
                <a
                  href="https://play.google.com/store"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border-2 border-[#0b2545] text-[#0b2545] px-8 py-3.5 rounded-full text-base font-semibold hover:bg-[#0b2545] hover:text-white transition-colors"
                >
                  <Smartphone className="w-5 h-5" />
                  Télécharger l&apos;app
                </a>
              </div>
            </div>

            {/* Logo / Hero Image */}
            <div className="flex-1 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#4ade80]/30 to-[#22d3ee]/30 rounded-full blur-3xl scale-110" />
                <Image
                  src="/images/logo1.png"
                  alt="Ewuang Marketplace"
                  width={400}
                  height={400}
                  className="relative z-10 drop-shadow-2xl"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-[#0b2545]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Pourquoi choisir Ewuang ?
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Une plateforme complète pour le commerce en ligne au Gabon
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: ShoppingCart,
                title: "Marketplace locale",
                description:
                  "Parcourez des centaines d'articles de boutiques gabonaises. Commandez facilement depuis votre téléphone.",
              },
              {
                icon: Truck,
                title: "Livraison rapide",
                description:
                  "Un réseau de livreurs dédiés pour vous livrer vos commandes rapidement partout au Gabon.",
              },
              {
                icon: Shield,
                title: "Paiement sécurisé",
                description:
                  "Transactions sécurisées et suivi en temps réel de vos commandes et paiements.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4ade80] to-[#22d3ee] flex items-center justify-center mb-5">
                  <feature.icon className="w-6 h-6 text-[#0b2545]" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-[#f0fdf4] to-[#ecfeff]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0b2545] mb-4">
            Prêt à commencer ?
          </h2>
          <p className="text-gray-600 text-lg mb-8">
            Téléchargez l&apos;application mobile ou accédez à l&apos;espace
            d&apos;administration pour gérer votre activité.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
            <a
              href="https://play.google.com/store"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-[#0b2545] text-white px-8 py-4 rounded-full text-base font-semibold hover:bg-[#0b2545]/90 transition-colors"
            >
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302-2.302 2.302-2.698-2.302 2.698-2.302zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
              </svg>
              Télécharger sur Google Play
            </a>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#4ade80] to-[#22d3ee] text-[#0b2545] px-8 py-4 rounded-full text-base font-semibold hover:opacity-90 transition-opacity"
            >
              Espace administration
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0b2545] border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/images/logo1.png"
              alt="Ewuang"
              width={32}
              height={32}
            />
            <span className="text-white font-semibold">Ewuang</span>
          </div>
          <p className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} Ewuang. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
