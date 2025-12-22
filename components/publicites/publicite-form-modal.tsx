// components/publicites/publicite-form-modal.tsx
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Calendar, ExternalLink, Image as ImageIcon } from "lucide-react";
import { type Publicite, usePublicitesStore } from '@/stores/publicitesStore';
import { toast } from "sonner";

// ============================================
// VALIDATION SCHEMA
// ============================================

/**
 * Schéma de validation pour le formulaire de publicité
 */
const publiciteFormSchema = z.object({
    titre: z
        .string()
        .min(3, "Le titre doit contenir au moins 3 caractères")
        .max(255, "Le titre ne peut pas dépasser 255 caractères"),

    description: z
        .string()
        .min(10, "La description doit contenir au moins 10 caractères")
        .max(1000, "La description ne peut pas dépasser 1000 caractères"),

    url_image: z
        .string()
        .url("Veuillez entrer une URL valide")
        .refine((url) => {
            // Accepter images, vidéos et GIFs
            const validExtensions = [
                '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
                '.mp4', '.webm', '.mov', '.avi'
            ];
            return validExtensions.some(ext => url.toLowerCase().includes(ext));
        }, "L'URL doit pointer vers une image (jpg, png, gif, webp, svg) ou une vidéo (mp4, webm, mov)"),

    lien: z
        .string()
        .url("Veuillez entrer une URL valide pour le lien de destination"),

    date_start: z
        .string()
        .refine((date) => {
            const selectedDate = new Date(date);
            return !isNaN(selectedDate.getTime());
        }, "Date de début invalide"),

    date_end: z
        .string()
        .refine((date) => {
            const selectedDate = new Date(date);
            return !isNaN(selectedDate.getTime());
        }, "Date de fin invalide"),

    is_actif: z.boolean(),
}).refine((data) => {
    const start = new Date(data.date_start);
    const end = new Date(data.date_end);
    return end > start;
}, {
    message: "La date de fin doit être postérieure à la date de début",
    path: ["date_end"],
});

type PubliciteFormValues = z.infer<typeof publiciteFormSchema>;

// ============================================
// PROPS
// ============================================

interface PubliciteFormModalProps {
    open: boolean;
    onClose: () => void;
    publicite?: Publicite;
    isLoading?: boolean;
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export function PubliciteFormModal({
    open,
    onClose,
    publicite,
    isLoading: externalLoading = false,
}: PubliciteFormModalProps) {
    const isEditing = !!publicite;
    const { createPublicite, updatePublicite } = usePublicitesStore();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    /**
     * Initialisation du formulaire avec react-hook-form
     */
    const form = useForm<PubliciteFormValues>({
        resolver: zodResolver(publiciteFormSchema),
        defaultValues: {
            titre: publicite?.titre || "",
            description: publicite?.description || "",
            url_image: publicite?.url_image || "",
            lien: publicite?.lien || "",
            date_start: publicite?.date_start 
                ? new Date(publicite.date_start).toISOString().split('T')[0]
                : "",
            date_end: publicite?.date_end 
                ? new Date(publicite.date_end).toISOString().split('T')[0]
                : "",
            is_actif: publicite?.is_actif ?? true,
        },
    });

    /**
     * Réinitialise le formulaire quand la modal s'ouvre avec de nouvelles données
     */
    React.useEffect(() => {
        if (open && publicite) {
            form.reset({
                titre: publicite.titre,
                description: publicite.description,
                url_image: publicite.url_image,
                lien: publicite.lien,
                date_start: new Date(publicite.date_start).toISOString().split('T')[0],
                date_end: new Date(publicite.date_end).toISOString().split('T')[0],
                is_actif: publicite.is_actif,
            });
        } else if (open && !publicite) {
            // Valeurs par défaut pour création
            const today = new Date().toISOString().split('T')[0];
            const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0];

            form.reset({
                titre: "",
                description: "",
                url_image: "",
                lien: "",
                date_start: today,
                date_end: nextWeek,
                is_actif: true,
            });
        }
    }, [open, publicite, form]);

    /**
     * Gestion de la soumission du formulaire
     */
    const handleSubmit = async (data: PubliciteFormValues) => {
        setIsSubmitting(true);

        try {
            if (isEditing && publicite) {
                // Mise à jour
                await updatePublicite(publicite.id, {
                    titre: data.titre,
                    description: data.description,
                    url_image: data.url_image,
                    lien: data.lien,
                    date_start: new Date(data.date_start).toISOString(),
                    date_end: new Date(data.date_end).toISOString(),
                    is_actif: data.is_actif,
                });

                toast.success('Succès', {
                    description: 'Campagne mise à jour avec succès',
                });
            } else {
                // Création
                await createPublicite({
                    titre: data.titre,
                    description: data.description,
                    url_image: data.url_image,
                    lien: data.lien,
                    date_start: new Date(data.date_start).toISOString(),
                    date_end: new Date(data.date_end).toISOString(),
                    is_actif: data.is_actif,
                });

                toast.success('Succès', {
                    description: 'Campagne créée avec succès',
                });
            }

            form.reset();
            onClose();
        } catch (error) {
            console.error('Erreur lors de la soumission:', error);
            // L'erreur est déjà gérée par le store avec un toast
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Gestion de la fermeture de la modal
     */
    const handleClose = () => {
        form.reset();
        onClose();
    };

    const isLoading = isSubmitting || externalLoading;

    /**
     * Aperçu de l'URL de l'image
     */
    const urlImage = form.watch("url_image");
    const showPreview = urlImage && urlImage.startsWith('http');

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl">
                        {isEditing ? "Modifier la campagne" : "Créer une campagne"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Modifiez les informations de votre campagne publicitaire."
                            : "Créez une nouvelle campagne publicitaire pour promouvoir vos produits."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        {/* Section: Informations de base */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Informations générales</h3>

                            {/* Titre */}
                            <FormField
                                control={form.control}
                                name="titre"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Titre de la campagne *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Ex: Promotion d'été 2024"
                                                {...field}
                                                disabled={isLoading}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Le titre principal de votre campagne publicitaire
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Description */}
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description *</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Décrivez votre campagne publicitaire..."
                                                className="resize-none min-h-[100px]"
                                                {...field}
                                                disabled={isLoading}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Décrivez l'objectif et le contenu de votre campagne
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Section: Médias */}
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="text-lg font-medium">Médias et liens</h3>

                            {/* URL de l'image/vidéo */}
                            <FormField
                                control={form.control}
                                name="url_image"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>URL de l'image ou vidéo *</FormLabel>
                                        <FormControl>
                                            <div className="space-y-2">
                                                <div className="flex gap-2">
                                                    <ImageIcon className="h-5 w-5 text-muted-foreground mt-2" />
                                                    <Input
                                                        type="url"
                                                        placeholder="https://example.com/image.jpg"
                                                        {...field}
                                                        disabled={isLoading}
                                                    />
                                                </div>
                                            </div>
                                        </FormControl>
                                        <FormDescription>
                                            Formats acceptés : JPG, PNG, GIF, MP4, WEBM
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Aperçu du média */}
                            {showPreview && (
                                <div className="rounded-lg border p-4 bg-muted/50">
                                    <p className="text-sm font-medium mb-2">Aperçu :</p>
                                    <div className="relative aspect-video rounded-md overflow-hidden bg-background">
                                        {urlImage.match(/\.(mp4|webm|mov)$/i) ? (
                                            <video
                                                src={urlImage}
                                                className="w-full h-full object-contain"
                                                controls
                                                muted
                                            />
                                        ) : (
                                            <img
                                                src={urlImage}
                                                alt="Aperçu"
                                                className="w-full h-full object-contain"
                                                onError={(e) => {
                                                    e.currentTarget.src = 'https://via.placeholder.com/400x200?text=Aperçu+non+disponible';
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Lien de destination */}
                            <FormField
                                control={form.control}
                                name="lien"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Lien de destination *</FormLabel>
                                        <FormControl>
                                            <div className="flex gap-2">
                                                <ExternalLink className="h-5 w-5 text-muted-foreground mt-2" />
                                                <Input
                                                    type="url"
                                                    placeholder="https://example.com/promo"
                                                    {...field}
                                                    disabled={isLoading}
                                                />
                                            </div>
                                        </FormControl>
                                        <FormDescription>
                                            URL vers laquelle les utilisateurs seront redirigés
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Section: Période */}
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="text-lg font-medium">Période de diffusion</h3>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Date de début */}
                                <FormField
                                    control={form.control}
                                    name="date_start"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Date de début *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="date"
                                                    {...field}
                                                    disabled={isLoading}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Date de fin */}
                                <FormField
                                    control={form.control}
                                    name="date_end"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Date de fin *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="date"
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

                        {/* Section: Paramètres */}
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="text-lg font-medium">Paramètres</h3>

                            {/* Statut actif */}
                            <FormField
                                control={form.control}
                                name="is_actif"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">
                                                Campagne active
                                            </FormLabel>
                                            <FormDescription>
                                                La campagne sera visible sur la plateforme pendant la période définie
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
                                {isEditing ? "Mettre à jour" : "Créer la campagne"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}