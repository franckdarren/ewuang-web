"use client";

import { useState } from "react";
import { loginAction } from "@/app/login/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await loginAction(formData);

    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-8", className)} {...props}>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[#0b2545]">
          Content de vous revoir !
        </h2>
        <p className="text-gray-500 mt-2">
          Connectez-vous à votre espace d&apos;administration.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email" className="text-[#0b2545] font-medium">
              Email
            </FieldLabel>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="votre@email.com"
                required
                disabled={isLoading}
                className="pl-10 h-11 border-gray-200 focus:border-[#4ade80] focus:ring-[#4ade80]/20 rounded-xl transition-all disabled:opacity-50"
              />
            </div>
          </Field>

          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="password" className="text-[#0b2545] font-medium">
                Mot de passe
              </FieldLabel>
              <a
                href="#"
                className={cn(
                  "text-xs text-[#22d3ee] hover:text-[#0b2545] transition-colors",
                  isLoading && "pointer-events-none opacity-50"
                )}
              >
                Mot de passe oublié ?
              </a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                disabled={isLoading}
                className="pl-10 pr-10 h-11 border-gray-200 focus:border-[#4ade80] focus:ring-[#4ade80]/20 rounded-xl transition-all disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </Field>

          {error && (
            <div className="animate-in fade-in-50 slide-in-from-top-2 duration-300">
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 flex items-start gap-2">
                <svg
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </p>
            </div>
          )}

          <Field>
            <Button
              type="submit"
              className="w-full h-11 rounded-xl bg-gradient-to-r from-[#4ade80] to-[#22d3ee] text-[#0b2545] font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-[#4ade80]/20 cursor-pointer"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                "Se connecter"
              )}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
