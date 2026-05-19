"use client";

/**
 * ContactButton — bouton réutilisable « Contacter ».
 *
 * Ouvre une fenêtre de discussion (ChatPanel) avec un utilisateur cible,
 * en pré-créant/retrouvant le fil via la matrice d'autorisation serveur.
 * Réutilisable partout : fiche article, commande, réclamation…
 *
 * Exemple :
 *   <ContactButton targetUserId={boutique.id} label="Contacter la boutique" />
 *   <ContactButton targetUserId={admin.id} commandeId={cmd.id} />
 */

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/chat/chat-panel";
import { MessageCircle } from "lucide-react";

type Variant =
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";

export function ContactButton({
    targetUserId,
    commandeId,
    reclamationId,
    label = "Contacter",
    variant = "default",
    size = "default",
    className,
}: {
    targetUserId: string;
    commandeId?: string;
    reclamationId?: string;
    label?: string;
    variant?: Variant;
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={variant} size={size} className={className}>
                    <MessageCircle className="h-4 w-4" />
                    {size !== "icon" && <span className="ml-2">{label}</span>}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl p-0">
                <DialogHeader className="border-b px-4 py-3">
                    <DialogTitle>Messagerie</DialogTitle>
                </DialogHeader>
                <div className="p-4 pt-0">
                    {/* Ne monte le panel (et ses abonnements Realtime) que si ouvert */}
                    {open && (
                        <ChatPanel
                            title="Discussions"
                            startWith={{
                                target_user_id: targetUserId,
                                commande_id: commandeId,
                                reclamation_id: reclamationId,
                            }}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
