"use client";

import { useState } from "react";
import { loginAction } from "@/app/login/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setError("");

    // Appelle la server action
    const result = await loginAction(formData);

    if (result?.error) {
      setError(result.error);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Content de te revoir!</CardTitle>
          <CardDescription>
            Connectez-vous avec votre compte Apple ou Google.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="user@example.com"
                  required
                />
              </Field>

              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-4 hover:underline"
                  >
                    Mot de passe oublié?
                  </a>
                </div>
                <Input id="password" name="password" type="password" required />
              </Field>

              {/* ❗ Affichage des erreurs */}
              {error && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md border border-red-200">
                  {error}
                </p>
              )}

              <Field>
                <Button type="submit" className="w-full">
                  Se connecter
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
