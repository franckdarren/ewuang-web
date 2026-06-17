import { Suspense } from "react";
import InviteAcceptClient from "./invite-accept-client";

export const metadata = {
  title: "Rejoindre une boutique — Ewuang",
  description: "Acceptez votre invitation et créez votre compte gérant.",
};

export default function InviteAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <InviteAcceptClient />
    </Suspense>
  );
}
