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

/**
 * Schéma de validation pour le formulaire utilisateur
 */
const userFormSchema = z.object({
    name: z
        .string()
        .min(2, "Le nom doit contenir au moins 2 caractères")
        .max(255, "Le nom ne peut pas dépasser 255 caractères"),
    
    email: z
        .string()
        .email("Adresse email invalide")
        .max(255, "L'email ne peut pas dépasser 255 caractères"),
    
    role: z
        .enum(["Client", "Boutique", "Livreur", "Administrateur"])
        .default("Client"),
    
    phone: z
        .string()
        .min(9, "Le numéro de téléphone doit contenir au moins 9 chiffres")
        .max(20, "Le numéro de téléphone ne peut pas dépasser 20 caractères")
        .optional()
        .or(z.literal("")),
    
    address: z
        .string()
        .max(255, "L'adresse ne peut pas dépasser 255 caractères")
        .optional()
        .or(z.literal("")),
    
    description: z
        .string()
        .max(1000, "La description ne peut pas dépasser 1000 caractères")
        .optional()
        .or(z.literal("")),
    
    heure_ouverture: z
        .string()
        .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format: HH:MM")
        .optional()
        .or(z.literal("")),
    
    heure_fermeture: z
        .string()
        .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format: HH:MM")
        .optional()
        .or(z.literal("")),
    
    is_verified: z.boolean().default(false),
    is_active: z.boolean().default(true),
});

type UserFormValues = z.infer<typeof userFormSchema>;

// ============================================
// PROPS
// ============================================

interface UserFormModalProps {
    /** Indique si la modal est ouverte */
    open: boolean;
    
    /** Fonction appelée pour fermer la modal */
    onClose: () => void;
    
    /** Fonction appelée lors de la soumission du formulaire */
    onSubmit: (data: UserFormValues) => Promise<void>;
    
    /** Utilisateur à modifier (undefined pour création) */
    user?: User;
    
    /** Indique si une action est en cours */
    isLoading?: boolean;
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export function UserFormModal({
    open,
    onClose,
    onSubmit,
    user,
    isLoading = false,
}: UserFormModalProps) {
    const isEditing = !!user;

    /**
     * Initialisation du formulaire avec react-hook-form
     */
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
            is_active: user?.is_active !== undefined ? user.is_active : true,
        },
    });

    /**
     * Réinitialise le formulaire quand la modal s'ouvre avec de nouvelles données
     */
    React.useEffect(() => {
        if (open && user) {
            form.reset({
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone || "",
                address: user.address || "",
                description: user.description || "",
                heure_ouverture: user.heure_ouverture || "",
                heure_fermeture: user.heure_fermeture || "",
                is_verified: user.is_verified,
                is_active: user.is_active,
            });
        } else if (open && !user) {
            // Réinitialiser avec valeurs par défaut pour création
            form.reset({
                name: "",
                email: "",
                role: "Client",
                phone: "",
                address: "",
                description: "",
                heure_ouverture: "",
                heure_fermeture: "",
                is_verified: false,
                is_active: true,
            });
        }
    }, [open, user, form]);

    /**
     * Gestion de la soumission du formulaire
     */
    const handleSubmit = async (data: UserFormValues) => {
        await onSubmit(data);
        form.reset();
    };

    /**
     * Gestion de la fermeture de la modal
     */
    const handleClose = () => {
        form.reset();
        onClose();
    };

    /**
     * Observe le rôle sélectionné pour afficher/masquer les champs spécifiques
     */
    const selectedRole = form.watch("role");
    const showBoutiqueFields = selectedRole === "Boutique";

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Modifier l'utilisateur" : "Créer un utilisateur"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Modifiez les informations de l'utilisateur ci-dessous."
                            : "Remplissez le formulaire pour créer un nouvel utilisateur."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        {/* Section: Informations générales */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Informations générales</h3>

                            {/* Nom */}
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nom complet *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="John Doe"
                                                {...field}
                                                disabled={isLoading}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Email */}
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email *</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="email"
                                                placeholder="john.doe@example.com"
                                                {...field}
                                                disabled={isLoading}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Rôle */}
                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Rôle *</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            disabled={isLoading}
                                        >
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
                                )}
                            />

                            {/* Téléphone */}
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Téléphone</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="tel"
                                                placeholder="+241 XX XX XX XX"
                                                {...field}
                                                disabled={isLoading}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Adresse */}
                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Adresse</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="123 Rue de la Paix, Libreville"
                                                {...field}
                                                disabled={isLoading}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Section: Informations boutique (visible uniquement si rôle = boutique) */}
                        {showBoutiqueFields && (
                            <div className="space-y-4 border-t pt-4">
                                <h3 className="text-lg font-medium">Informations boutique</h3>

                                {/* Description */}
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Description de la boutique..."
                                                    className="resize-none"
                                                    {...field}
                                                    disabled={isLoading}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Décrivez brièvement votre boutique
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Horaires */}
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="heure_ouverture"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Heure d'ouverture</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="time"
                                                        {...field}
                                                        disabled={isLoading}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="heure_fermeture"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Heure de fermeture</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="time"
                                                        {...field}
                                                        disabled={isLoading}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Section: Paramètres */}
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="text-lg font-medium">Paramètres</h3>

                            {/* Compte vérifié */}
                            <FormField
                                control={form.control}
                                name="is_verified"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">
                                                Compte vérifié
                                            </FormLabel>
                                            <FormDescription>
                                                L'utilisateur a été vérifié par l'administration
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                disabled={isLoading}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            {/* Compte actif */}
                            <FormField
                                control={form.control}
                                name="is_active"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">
                                                Compte actif
                                            </FormLabel>
                                            <FormDescription>
                                                L'utilisateur peut accéder à la plateforme
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                disabled={isLoading}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Boutons d'action */}
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleClose}
                                disabled={isLoading}
                            >
                                Annuler
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {isEditing ? "Mettre à jour" : "Créer"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}