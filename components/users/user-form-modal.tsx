// components/users/user-form-modal.tsx
'use client';

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { type User } from '@/stores/usersStore';

// ============================================
// VALIDATION SCHEMA
// ============================================

const userFormSchema = z.object({
    name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(255),
    email: z.string().email("Adresse email invalide").max(255),
    role: z.enum(["Client", "Boutique", "Livreur", "Administrateur"]),
    phone: z.string().min(9, "Le numéro de téléphone doit contenir au moins 9 chiffres").max(20).optional().or(z.literal("")),
    address: z.string().max(255).optional().or(z.literal("")),
    description: z.string().max(1000).optional().or(z.literal("")),
    heure_ouverture: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format: HH:MM").optional().or(z.literal("")),
    heure_fermeture: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format: HH:MM").optional().or(z.literal("")),
    is_verified: z.boolean(),
    is_active: z.boolean(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

// ============================================
// PROPS
// ============================================

interface UserFormModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: UserFormValues) => Promise<void>;
    user?: User;
    isLoading?: boolean;
}

// ============================================
// COMPOSANT
// ============================================

export function UserFormModal({
    open,
    onClose,
    onSubmit,
    user,
    isLoading = false,
}: UserFormModalProps) {
    const isEditing = !!user;

    const form = useForm<UserFormValues>({
        resolver: zodResolver(userFormSchema),
        defaultValues: {
            name: user?.name || "",
            email: user?.email || "",
            role: user?.role || "Client",
            phone: user?.phone || "",
            address: user?.address || "",
            description: user?.description || "",
            heure_ouverture: user?.heure_ouverture || "",
            heure_fermeture: user?.heure_fermeture || "",
            is_verified: user?.is_verified || false,
            is_active: user?.is_active ?? true,
        },
    });

    React.useEffect(() => {
        if (open) {
            form.reset({
                name: user?.name || "",
                email: user?.email || "",
                role: user?.role || "Client",
                phone: user?.phone || "",
                address: user?.address || "",
                description: user?.description || "",
                heure_ouverture: user?.heure_ouverture || "",
                heure_fermeture: user?.heure_fermeture || "",
                is_verified: user?.is_verified || false,
                is_active: user?.is_active ?? true,
            });
        }
    }, [open, user, form]);

    const handleSubmit = async (data: UserFormValues) => {
        await onSubmit(data);
        form.reset();
    };

    const handleClose = () => {
        form.reset();
        onClose();
    };

    const selectedRole = form.watch("role");
    const showBoutiqueFields = selectedRole === "Boutique";

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Modifier l'utilisateur" : "Créer un utilisateur"}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? "Modifiez les informations de l'utilisateur ci-dessous." : "Remplissez le formulaire pour créer un nouvel utilisateur."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Informations générales</h3>

                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nom complet *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="John Doe" {...field} disabled={isLoading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>

                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email *</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="john.doe@example.com" {...field} disabled={isLoading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>

                            <FormField control={form.control} name="role" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Rôle *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner un rôle" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Client">Client</SelectItem>
                                            <SelectItem value="Boutique">Boutique</SelectItem>
                                            <SelectItem value="Livreur">Livreur</SelectItem>
                                            <SelectItem value="Administrateur">Administrateur</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>

                            <FormField control={form.control} name="phone" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Téléphone</FormLabel>
                                    <FormControl>
                                        <Input type="tel" placeholder="+241 XX XX XX XX" {...field} disabled={isLoading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>

                            <FormField control={form.control} name="address" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Adresse</FormLabel>
                                    <FormControl>
                                        <Input placeholder="123 Rue de la Paix, Libreville" {...field} disabled={isLoading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>

                        {showBoutiqueFields && (
                            <div className="space-y-4 border-t pt-4">
                                <h3 className="text-lg font-medium">Informations boutique</h3>

                                <FormField control={form.control} name="description" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Description de la boutique..." className="resize-none" {...field} disabled={isLoading} />
                                        </FormControl>
                                        <FormDescription>Décrivez brièvement votre boutique</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}/>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="heure_ouverture" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Heure d'ouverture</FormLabel>
                                            <FormControl>
                                                <Input type="time" {...field} disabled={isLoading} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="heure_fermeture" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Heure de fermeture</FormLabel>
                                            <FormControl>
                                                <Input type="time" {...field} disabled={isLoading} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4 border-t pt-4">
                            <h3 className="text-lg font-medium">Paramètres</h3>

                            <FormField control={form.control} name="is_verified" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Compte vérifié</FormLabel>
                                        <FormDescription>L'utilisateur a été vérifié par l'administration</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isLoading} />
                                    </FormControl>
                                </FormItem>
                            )}/>

                            <FormField control={form.control} name="is_active" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Compte actif</FormLabel>
                                        <FormDescription>L'utilisateur peut accéder à la plateforme</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isLoading} />
                                    </FormControl>
                                </FormItem>
                            )}/>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                                Annuler
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditing ? "Mettre à jour" : "Créer"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
