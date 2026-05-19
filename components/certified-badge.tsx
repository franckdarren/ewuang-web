import { BadgeCheck } from "lucide-react";

import { cn } from "@/app/lib/utils";
import { Badge } from "@/components/ui/badge";

interface CertifiedBadgeProps {
    /** Affiche le badge uniquement si true. Pratique pour `<CertifiedBadge certified={user.is_certified} />`. */
    certified?: boolean | null;
    /** Cache le libellé et ne montre que l'icône (utile dans les listes denses). */
    iconOnly?: boolean;
    className?: string;
}

/**
 * Badge réutilisable « Boutique certifiée ».
 * Rend `null` si la boutique n'est pas certifiée, pour pouvoir l'insérer
 * directement à côté d'un nom de vendeur sans condition externe.
 */
export function CertifiedBadge({ certified, iconOnly = false, className }: CertifiedBadgeProps) {
    if (!certified) return null;

    return (
        <Badge
            className={cn("bg-emerald-600 hover:bg-emerald-600 text-white", className)}
            title="Boutique certifiée par Ewuang"
        >
            <BadgeCheck className="size-3" />
            {!iconOnly && "Boutique certifiée"}
        </Badge>
    );
}
