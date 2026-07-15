import { Suspense } from "react";
import BoutiqueLandingClient from "./boutique-landing-client";

export const metadata = {
  title: "Boutique — Ewuang",
  description: "Découvrez cette boutique sur Ewuang, la marketplace gabonaise.",
};

export default async function BoutiqueLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <BoutiqueLandingClient slug={slug} />
    </Suspense>
  );
}
