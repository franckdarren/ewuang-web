"use client";

/**
 * ChatPanel — composant de messagerie réutilisable.
 *
 * Fonctionne pour n'importe quel rôle : la liste des fils et les messages
 * sont filtrés côté serveur (matrice d'autorisation) et côté base (RLS).
 * Le temps réel passe par Supabase Realtime, sécurisé par la RLS
 * (le navigateur ne reçoit que les fils dont il est participant).
 *
 * Props :
 *  - startWith : ouvre automatiquement un fil au montage
 *                (ex. bouton "Contacter la boutique").
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { supabaseBrowser } from "@/app/utils/supabase/clients";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore, type ChatThread } from "@/stores/chatStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, ImagePlus, Loader2, X, MessageSquare, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

function initials(name?: string | null) {
    if (!name) return "?";
    return name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

function timeLabel(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function ChatPanel({
    startWith,
    title = "Messagerie",
}: {
    startWith?: {
        target_user_id: string;
        commande_id?: string;
        reclamation_id?: string;
    };
    title?: string;
}) {
    const userId = useAuthStore((s) => s.user?.id);
    const {
        threads,
        messagesByThread,
        activeThreadId,
        isLoadingThreads,
        isLoadingMessages,
        isSending,
        error,
        fetchThreads,
        selectThread,
        sendMessage,
        openThread,
        receiveMessage,
        applyThreadChange,
        clearError,
    } = useChatStore();

    const [text, setText] = useState("");
    const [image, setImage] = useState<File | null>(null);
    const [showList, setShowList] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    function handleSelectThread(id: string) {
        selectThread(id);
        setShowList(false);
    }

    const activeMessages = activeThreadId
        ? messagesByThread[activeThreadId] ?? []
        : [];
    const activeThread = threads.find((t) => t.id === activeThreadId) || null;

    // Chargement initial + ouverture éventuelle d'un fil
    useEffect(() => {
        (async () => {
            await fetchThreads();
            if (startWith) {
                try {
                    const id = await openThread(startWith);
                    await selectThread(id);
                    setShowList(false);
                } catch {
                    /* l'erreur est déjà dans le store */
                }
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Affiche les erreurs du store
    useEffect(() => {
        if (error) {
            toast.error(error);
            clearError();
        }
    }, [error, clearError]);

    // Realtime : mise à jour de la liste des fils (RLS = uniquement les miens)
    useEffect(() => {
        const supabase = supabaseBrowser();
        const channel = supabase
            .channel("chat-threads-rt")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "chat_threads" },
                (payload) => {
                    const row = payload.new as ChatThread | undefined;
                    if (!row?.id) return;
                    const mine =
                        row.participant_a_id === userId
                            ? row.unread_count_a
                            : row.unread_count_b;
                    applyThreadChange({
                        id: row.id,
                        last_message_at: row.last_message_at,
                        last_message_preview: row.last_message_preview,
                        unread:
                            row.id === activeThreadId ? 0 : mine ?? 0,
                    });
                }
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, activeThreadId]);

    // Realtime : nouveaux messages du fil actif
    useEffect(() => {
        if (!activeThreadId) return;
        const supabase = supabaseBrowser();
        const channel = supabase
            .channel(`chat-messages-${activeThreadId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "chat_messages",
                    filter: `thread_id=eq.${activeThreadId}`,
                },
                (payload) => {
                    receiveMessage(payload.new as any);
                }
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeThreadId]);

    // Scroll automatique en bas
    useEffect(() => {
        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, [activeMessages.length]);

    async function handleSend() {
        if (!activeThreadId || (!text.trim() && !image)) return;
        try {
            await sendMessage(activeThreadId, {
                contenu: text.trim() || undefined,
                image,
            });
            setText("");
            setImage(null);
            if (fileRef.current) fileRef.current.value = "";
        } catch {
            /* toast déjà géré */
        }
    }

    return (
        <div className="flex h-[calc(100vh-10rem)] overflow-hidden rounded-lg border bg-card">
            {/* ---- Liste des fils ---- */}
            <aside className={`${showList ? "flex" : "hidden"} md:flex w-full md:w-72 shrink-0 flex-col border-r`}>
                <div className="border-b px-4 py-3 font-semibold">{title}</div>
                <div className="flex-1 overflow-y-auto">
                    {isLoadingThreads ? (
                        <div className="space-y-3 p-4">
                            {[...Array(4)].map((_, i) => (
                                <Skeleton key={i} className="h-14 w-full" />
                            ))}
                        </div>
                    ) : threads.length === 0 ? (
                        <p className="p-4 text-sm text-muted-foreground">
                            Aucune discussion pour le moment.
                        </p>
                    ) : (
                        threads.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => handleSelectThread(t.id)}
                                className={`flex w-full items-center gap-3 border-b px-4 py-3 text-left transition hover:bg-accent ${
                                    t.id === activeThreadId ? "bg-accent" : ""
                                }`}
                            >
                                <Avatar className="h-9 w-9">
                                    <AvatarImage
                                        src={t.interlocuteur?.url_logo ?? undefined}
                                    />
                                    <AvatarFallback>
                                        {initials(t.interlocuteur?.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <span className="truncate text-sm font-medium">
                                            {t.interlocuteur?.name ?? "Utilisateur"}
                                        </span>
                                        {t.unread > 0 && (
                                            <Badge className="ml-2 h-5 min-w-5 justify-center px-1">
                                                {t.unread}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {t.last_message_preview ?? "Nouvelle discussion"}
                                    </p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </aside>

            {/* ---- Conversation active ---- */}
            <section className={`${!showList ? "flex" : "hidden"} md:flex flex-1 flex-col`}>
                {!activeThread ? (
                    <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
                        <MessageSquare className="mb-2 h-10 w-10" />
                        <p className="text-sm">
                            Sélectionnez une discussion pour commencer.
                        </p>
                    </div>
                ) : (
                    <>
                        <header className="flex items-center gap-3 border-b px-4 py-3">
                            <button
                                onClick={() => setShowList(true)}
                                className="md:hidden -ml-1 mr-1 rounded p-1 hover:bg-accent"
                                aria-label="Retour à la liste"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <Avatar className="h-8 w-8">
                                <AvatarImage
                                    src={activeThread.interlocuteur?.url_logo ?? undefined}
                                />
                                <AvatarFallback>
                                    {initials(activeThread.interlocuteur?.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="text-sm font-medium">
                                    {activeThread.interlocuteur?.name ?? "Utilisateur"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {activeThread.interlocuteur?.role}
                                </div>
                            </div>
                        </header>

                        <div
                            ref={scrollRef}
                            className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-4"
                        >
                            {isLoadingMessages ? (
                                <div className="space-y-3">
                                    {[...Array(5)].map((_, i) => (
                                        <Skeleton key={i} className="h-12 w-2/3" />
                                    ))}
                                </div>
                            ) : (
                                activeMessages.map((m) => {
                                    const mine = m.sender_id === userId;
                                    return (
                                        <div
                                            key={m.id}
                                            className={`flex ${
                                                mine ? "justify-end" : "justify-start"
                                            }`}
                                        >
                                            <div
                                                className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                                                    mine
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-background border"
                                                }`}
                                            >
                                                {m.image_url && (
                                                    <Image
                                                        src={m.image_url}
                                                        alt="pièce jointe"
                                                        width={240}
                                                        height={240}
                                                        className="mb-1 rounded-lg object-cover"
                                                        unoptimized
                                                    />
                                                )}
                                                {m.contenu && (
                                                    <p className="whitespace-pre-wrap break-words">
                                                        {m.contenu}
                                                    </p>
                                                )}
                                                <span
                                                    className={`mt-1 block text-[10px] ${
                                                        mine
                                                            ? "text-primary-foreground/70"
                                                            : "text-muted-foreground"
                                                    }`}
                                                >
                                                    {timeLabel(m.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Composer */}
                        <div className="border-t p-3">
                            {image && (
                                <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="truncate">{image.name}</span>
                                    <button
                                        onClick={() => {
                                            setImage(null);
                                            if (fileRef.current)
                                                fileRef.current.value = "";
                                        }}
                                        className="text-destructive"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            )}
                            <div className="flex items-end gap-2">
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    onChange={(e) =>
                                        setImage(e.target.files?.[0] ?? null)
                                    }
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => fileRef.current?.click()}
                                    title="Joindre une image"
                                >
                                    <ImagePlus className="h-4 w-4" />
                                </Button>
                                <Input
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    placeholder="Votre message…"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                />
                                <Button
                                    onClick={handleSend}
                                    disabled={
                                        isSending || (!text.trim() && !image)
                                    }
                                >
                                    {isSending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}
