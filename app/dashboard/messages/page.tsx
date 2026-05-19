// app/dashboard/messages/page.tsx
"use client";

import { ChatPanel } from "@/components/chat/chat-panel";

export default function MessagesPage() {
    return (
        <div className="flex flex-col gap-6 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Messagerie</h1>
                <p className="text-muted-foreground">
                    Échangez en toute sécurité avec les boutiques, clients et livreurs.
                </p>
            </div>
            <ChatPanel title="Discussions" />
        </div>
    );
}
