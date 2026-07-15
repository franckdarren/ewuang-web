"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CertifiedBadge } from "@/components/certified-badge";
import { AlertCircle, Apple, Clock, MapPin, Play, Store } from "lucide-react";

type BoutiquePublicInfo = {
  id: string;
  slug: string;
  name: string;
  url_logo: string | null;
  description: string | null;
  address: string | null;
  heure_ouverture: string | null;
  heure_fermeture: string | null;
  is_certified: boolean;
};

type Step = "loading" | "found" | "not-found" | "error";

export default function BoutiqueLandingClient({ slug }: { slug: string }) {
  const [step, setStep] = useState<Step>("loading");
  const [boutique, setBoutique] = useState<BoutiquePublicInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/boutiques/public/${encodeURIComponent(slug)}`, {
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) {
          setStep(res.status === 404 ? "not-found" : "error");
          return;
        }
        const data = await res.json();
        setBoutique(data);
        setStep("found");
      } catch {
        if (cancelled) return;
        setStep("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  function notifyComingSoon() {
    toast.info("Bientôt disponible sur les stores ! Revenez vite pour télécharger l'app.");
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <Image
            src="/images/logo1.png"
            alt="Ewuang"
            width={64}
            height={64}
            className="drop-shadow-md"
          />
        </div>

        {step === "loading" && <LoadingCard />}
        {step === "not-found" && <NotFoundCard />}
        {step === "error" && <ErrorCard />}
        {step === "found" && boutique && (
          <BoutiqueCard boutique={boutique} onDownloadClick={notifyComingSoon} />
        )}
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="flex flex-col items-center gap-4 py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Chargement de la boutique…</p>
      </CardContent>
    </Card>
  );
}

function NotFoundCard() {
  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="rounded-full bg-destructive/10 p-3">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>
        <div>
          <h2 className="mb-1 text-lg font-bold text-foreground">Boutique introuvable</h2>
          <p className="text-sm text-muted-foreground">
            Ce lien n&apos;est plus valide ou la boutique n&apos;est plus active.
          </p>
        </div>
        <Link
          href="/"
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Retour à l&apos;accueil
        </Link>
      </CardContent>
    </Card>
  );
}

function ErrorCard() {
  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="rounded-full bg-destructive/10 p-3">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>
        <div>
          <h2 className="mb-1 text-lg font-bold text-foreground">Erreur</h2>
          <p className="text-sm text-muted-foreground">
            Impossible de charger cette boutique. Vérifiez votre connexion.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function BoutiqueCard({
  boutique,
  onDownloadClick,
}: {
  boutique: BoutiquePublicInfo;
  onDownloadClick: () => void;
}) {
  const hours =
    boutique.heure_ouverture && boutique.heure_fermeture
      ? `${boutique.heure_ouverture} — ${boutique.heure_fermeture}`
      : null;

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="flex flex-col items-center gap-4 pt-8 pb-6 text-center">
        {boutique.url_logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={boutique.url_logo}
            alt={boutique.name}
            className="h-20 w-20 rounded-2xl object-cover shadow"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary">
            <Store className="h-9 w-9 text-primary-foreground" />
          </div>
        )}

        <div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-xl font-bold text-foreground">{boutique.name}</h1>
          </div>
          <div className="mt-2 flex justify-center">
            <CertifiedBadge certified={boutique.is_certified} />
          </div>
        </div>

        {boutique.description && (
          <p className="text-sm text-muted-foreground">{boutique.description}</p>
        )}

        <div className="w-full space-y-2 rounded-xl border bg-muted p-4 text-left text-sm">
          {boutique.address && (
            <div className="flex items-start gap-2 text-foreground">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span>{boutique.address}</span>
            </div>
          )}
          {hours && (
            <div className="flex items-start gap-2 text-foreground">
              <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span>{hours}</span>
            </div>
          )}
          {!boutique.address && !hours && (
            <p className="text-muted-foreground">
              Aucune information supplémentaire disponible pour cette boutique.
            </p>
          )}
        </div>

        <div className="w-full space-y-3 pt-2">
          <p className="text-sm font-semibold text-foreground">
            Ouvrez cette boutique dans l&apos;application Ewuang
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            {/* TODO: remplacer par le lien réel une fois l'app publiée sur l'App Store */}
            <Button
              variant="outline"
              className="w-full"
              onClick={onDownloadClick}
            >
              <Apple className="mr-2 h-4 w-4" />
              App Store
            </Button>
            {/* TODO: remplacer par le lien réel une fois l'app publiée sur le Play Store */}
            <Button
              variant="outline"
              className="w-full"
              onClick={onDownloadClick}
            >
              <Play className="mr-2 h-4 w-4" />
              Google Play
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
