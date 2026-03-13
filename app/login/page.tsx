import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { ArrowLeft } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-svh">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#0b2545] flex-col justify-between p-12 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#4ade80]/15 to-[#22d3ee]/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-[#a3e635]/10 to-[#34d399]/10 blur-3xl" />

        {/* Top - Back link */}
        <Link
          href="/"
          className="relative z-10 inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l&apos;accueil
        </Link>

        {/* Center - Logo & text */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <Image
            src="/images/logo1.png"
            alt="Ewuang"
            width={180}
            height={180}
            className="drop-shadow-2xl mb-8"
          />
          <h1 className="text-3xl font-bold text-white mb-3">
            Bienvenue sur{" "}
            <span className="bg-gradient-to-r from-[#4ade80] to-[#22d3ee] bg-clip-text text-transparent">
              Ewuang
            </span>
          </h1>
          <p className="text-white/60 text-lg max-w-sm">
            Gérez votre marketplace gabonaise depuis votre espace
            d&apos;administration.
          </p>
        </div>

        {/* Bottom - Quote */}
        <div className="relative z-10">
          <div className="border-l-2 border-[#4ade80]/40 pl-4">
            <p className="text-white/50 text-sm italic">
              &quot;La marketplace qui connecte le Gabon&quot;
            </p>
          </div>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-[#0b2545] transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Accueil
          </Link>
        </div>

        {/* Form centered */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <Image
              src="/images/logo1.png"
              alt="Ewuang"
              width={120}
              height={120}
            />
          </div>

          <div className="w-full max-w-sm">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
