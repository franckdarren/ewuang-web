"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Store,
  User,
} from "lucide-react";

type BoutiqueInfo = {
  name: string;
  owner_name: string | null;
  url_logo: string | null;
};

type VerifyResponse = {
  email: string;
  boutique: BoutiqueInfo;
  expires_at: string | null;
};

type Step = "verifying" | "form" | "submitting" | "success" | "error";

export default function InviteAcceptClient() {
  const search = useSearchParams();
  const token = search?.get("token") ?? "";

  const [step, setStep] = useState<Step>("verifying");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [invitation, setInvitation] = useState<VerifyResponse | null>(null);

  const [ownerName, setOwnerName] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Vérification du token au mount
  useEffect(() => {
    if (!token) {
      setStep("error");
      setErrorMsg("Aucun code d'invitation fourni dans le lien.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/boutiques/membres/verify-token?token=${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setStep("error");
          setErrorMsg(data.error ?? "Lien invalide");
          return;
        }
        setInvitation(data);
        setStep("form");
      } catch {
        if (cancelled) return;
        setStep("error");
        setErrorMsg("Impossible de vérifier le lien. Vérifiez votre connexion.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (ownerName.trim().length < 2) {
      setErrorMsg("Entrez votre nom (minimum 2 caractères).");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Mot de passe : minimum 6 caractères.");
      return;
    }
    setErrorMsg("");
    setStep("submitting");

    try {
      const res = await fetch("/api/boutiques/membres/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          owner_name: ownerName.trim(),
          password,
          phone: phone.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Échec de l'inscription");
        setStep("form");
        return;
      }
      setStep("success");
    } catch {
      setErrorMsg("Erreur réseau. Réessayez.");
      setStep("form");
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-[#f7f8fa] via-white to-[#eef4ff] p-4">
      <div className="w-full max-w-md">
        {/* Header — logo Ewuang */}
        <div className="mb-6 flex flex-col items-center">
          <Image
            src="/images/logo2.png"
            alt="Ewuang"
            width={64}
            height={64}
            className="drop-shadow-md"
          />
        </div>

        {step === "verifying" && <VerifyingCard />}
        {step === "error" && <ErrorCard message={errorMsg} />}
        {(step === "form" || step === "submitting") && invitation && (
          <FormCard
            invitation={invitation}
            ownerName={ownerName}
            password={password}
            phone={phone}
            showPassword={showPassword}
            setOwnerName={setOwnerName}
            setPassword={setPassword}
            setPhone={setPhone}
            setShowPassword={setShowPassword}
            errorMsg={errorMsg}
            submitting={step === "submitting"}
            onSubmit={handleSubmit}
          />
        )}
        {step === "success" && invitation && (
          <SuccessCard invitation={invitation} />
        )}
      </div>
    </div>
  );
}

// ─── Vérification ───────────────────────────────────────────────────────────

function VerifyingCard() {
  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="flex flex-col items-center gap-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#0b2545]" />
        <p className="text-sm text-gray-600">Vérification de votre invitation…</p>
      </CardContent>
    </Card>
  );
}

// ─── Erreur ─────────────────────────────────────────────────────────────────

function ErrorCard({ message }: { message: string }) {
  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="rounded-full bg-red-50 p-3">
          <AlertCircle className="h-7 w-7 text-red-500" />
        </div>
        <div>
          <h2 className="mb-1 text-lg font-bold text-gray-900">
            Lien invalide
          </h2>
          <p className="text-sm text-gray-600">{message}</p>
        </div>
        <p className="text-xs text-gray-500">
          Demandez au propriétaire de vous renvoyer une nouvelle invitation.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Formulaire ─────────────────────────────────────────────────────────────

function FormCard(props: {
  invitation: VerifyResponse;
  ownerName: string;
  password: string;
  phone: string;
  showPassword: boolean;
  setOwnerName: (v: string) => void;
  setPassword: (v: string) => void;
  setPhone: (v: string) => void;
  setShowPassword: (v: boolean) => void;
  errorMsg: string;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const {
    invitation,
    ownerName,
    password,
    phone,
    showPassword,
    setOwnerName,
    setPassword,
    setPhone,
    setShowPassword,
    errorMsg,
    submitting,
    onSubmit,
  } = props;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="space-y-4 pb-2">
        <div className="flex items-center gap-3 rounded-xl bg-[#0b2545]/5 p-3">
          {invitation.boutique.url_logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={invitation.boutique.url_logo}
              alt={invitation.boutique.name}
              className="h-11 w-11 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0b2545]">
              <Store className="h-5 w-5 text-white" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Vous rejoignez
            </p>
            <p className="truncate text-base font-bold text-[#0b2545]">
              {invitation.boutique.name}
            </p>
          </div>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Créer votre compte gérant
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Invitation pour{" "}
            <span className="font-semibold text-gray-900">
              {invitation.email}
            </span>
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="owner_name">Votre nom complet</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="owner_name"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Amerlinda Mboumba"
                className="pl-9"
                disabled={submitting}
                autoFocus
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">
              Téléphone <span className="text-gray-400">(facultatif)</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+241 XX XX XX XX"
              disabled={submitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 caractères"
                className="pr-10"
                disabled={submitting}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Vous utiliserez ce mot de passe pour vous connecter dans
              l&apos;application Ewuang.
            </p>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-[#0b2545] hover:bg-[#0b2545]/90"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création du compte…
              </>
            ) : (
              <>
                Créer mon compte
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Succès ─────────────────────────────────────────────────────────────────

function SuccessCard({ invitation }: { invitation: VerifyResponse }) {
  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="flex flex-col items-center gap-5 py-10 text-center">
        <div className="rounded-full bg-green-50 p-3">
          <CheckCircle2 className="h-9 w-9 text-green-600" />
        </div>
        <div>
          <h2 className="mb-1 text-xl font-bold text-gray-900">
            Compte créé !
          </h2>
          <p className="text-sm text-gray-600">
            Vous faites maintenant partie de{" "}
            <span className="font-semibold text-gray-900">
              {invitation.boutique.name}
            </span>
            .
          </p>
        </div>
        <div className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-left text-sm">
          <p className="mb-2 font-semibold text-gray-900">
            Prochaine étape :
          </p>
          <p className="text-gray-700">
            Ouvrez l&apos;application Ewuang sur votre téléphone et connectez-vous
            avec :
          </p>
          <ul className="mt-2 space-y-1 text-gray-600">
            <li>
              <span className="font-medium">Email :</span> {invitation.email}
            </li>
            <li>
              <span className="font-medium">Mot de passe :</span> celui que vous
              venez de choisir
            </li>
          </ul>
        </div>
        <Link
          href="/"
          className="text-xs text-gray-500 underline-offset-2 hover:underline"
        >
          Retour à l&apos;accueil
        </Link>
      </CardContent>
    </Card>
  );
}
