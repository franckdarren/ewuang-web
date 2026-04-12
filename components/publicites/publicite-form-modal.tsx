// components/publicites/publicite-form-modal.tsx
'use client';

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { createClient } from "@supabase/supabase-js";
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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Loader2,
    ExternalLink,
    Image as ImageIcon,
    Upload,
    X,
    FileVideo,
    Link as LinkIcon,
} from "lucide-react";
import { type Publicite, usePublicitesStore } from '@/stores/publicitesStore';
import { useAuthStore } from '@/stores/authStore';
import { toast } from "sonner";

// ============================================
// CONSTANTES
// ============================================

const BUCKET_NAME = "publicites";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
const ACCEPTED_TYPES = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES];

// ============================================
// VALIDATION SCHEMA
// ============================================

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
        .min(1, "Une image ou vidéo est requise")
        .url("Veuillez entrer une URL valide ou uploader un fichier"),

    lien: z
        .string()
        .url("Veuillez entrer une URL valide pour le lien de destination")
        .optional()
        .or(z.literal("")),

    date_start: z
        .string()
        .refine((date) => !isNaN(new Date(date).getTime()), "Date de début invalide"),

    date_end: z
        .string()
        .refine((date) => !isNaN(new Date(date).getTime()), "Date de fin invalide"),

    is_actif: z.boolean(),
}).refine((data) => new Date(data.date_end) > new Date(data.date_start), {
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
// HELPERS
// ============================================

function isVideoUrl(url: string): boolean {
    return /\.(mp4|webm|mov|avi)(\?.*)?$/i.test(url);
}

function isVideoFile(file: File): boolean {
    return ACCEPTED_VIDEO_TYPES.includes(file.type);
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
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
    const [isUploading, setIsUploading] = React.useState(false);
    const [uploadProgress, setUploadProgress] = React.useState(0);
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [mediaTab, setMediaTab] = React.useState<"upload" | "url">("upload");
    const fileInputRef = React.useRef<HTMLInputElement>(null);

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
            // Si on édite, afficher dans l'onglet URL car le fichier est déjà uploadé
            setMediaTab("url");
            setSelectedFile(null);
        } else if (open && !publicite) {
            const today = new Date().toISOString().split('T')[0];
            const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                .toISOString().split('T')[0];
            form.reset({
                titre: "",
                description: "",
                url_image: "",
                lien: "",
                date_start: today,
                date_end: nextWeek,
                is_actif: true,
            });
            setMediaTab("upload");
            setSelectedFile(null);
        }
        setUploadProgress(0);
    }, [open, publicite, form]);

    // ========== UPLOAD SUPABASE ==========

    const uploadToSupabase = async (file: File): Promise<string> => {
        const token = useAuthStore.getState().token;

        const storageClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            token
                ? { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { autoRefreshToken: false, persistSession: false } }
                : undefined
        );

        const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const filePath = fileName;

        setUploadProgress(20);

        const { error } = await storageClient.storage
            .from(BUCKET_NAME)
            .upload(filePath, file, { upsert: true, contentType: file.type });

        if (error) throw new Error(error.message);

        setUploadProgress(90);

        const { data: urlData } = storageClient.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        return urlData.publicUrl;
    };

    const handleFileSelect = async (file: File) => {
        // Validation type
        if (!ACCEPTED_TYPES.includes(file.type)) {
            toast.error("Type de fichier non accepté", {
                description: "Formats acceptés : JPG, PNG, GIF, WEBP, SVG, MP4, WEBM, MOV",
            });
            return;
        }

        // Validation taille
        if (file.size > MAX_FILE_SIZE) {
            toast.error("Fichier trop volumineux", {
                description: `Taille maximum : ${formatFileSize(MAX_FILE_SIZE)}`,
            });
            return;
        }

        setSelectedFile(file);
        setIsUploading(true);
        setUploadProgress(0);

        try {
            const publicUrl = await uploadToSupabase(file);
            form.setValue("url_image", publicUrl, { shouldValidate: true });
            setUploadProgress(100);
            toast.success("Fichier uploadé avec succès");
        } catch (error) {
            console.error("Erreur upload:", error);
            toast.error("Erreur lors de l'upload", {
                description: error instanceof Error ? error.message : "Réessayez plus tard",
            });
            setSelectedFile(null);
            setUploadProgress(0);
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
        // Reset input pour permettre re-sélection du même fichier
        e.target.value = "";
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileSelect(file);
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        form.setValue("url_image", "", { shouldValidate: false });
        setUploadProgress(0);
    };

    // ========== SUBMIT ==========

    const handleSubmit = async (data: PubliciteFormValues) => {
        setIsSubmitting(true);
        try {
            if (isEditing && publicite) {
                await updatePublicite(publicite.id, {
                    titre: data.titre,
                    description: data.description,
                    url_image: data.url_image,
                    lien: data.lien ?? "",
                    date_start: new Date(data.date_start).toISOString(),
                    date_end: new Date(data.date_end).toISOString(),
                    is_actif: data.is_actif,
                });
                toast.success("Succès", { description: "Campagne mise à jour avec succès" });
            } else {
                await createPublicite({
                    titre: data.titre,
                    description: data.description,
                    url_image: data.url_image,
                    lien: data.lien ?? "",
                    date_start: new Date(data.date_start).toISOString(),
                    date_end: new Date(data.date_end).toISOString(),
                    is_actif: data.is_actif,
                });
                toast.success("Succès", { description: "Campagne créée avec succès" });
            }
            form.reset();
            onClose();
        } catch (error) {
            console.error("Erreur lors de la soumission:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        form.reset();
        setSelectedFile(null);
        setUploadProgress(0);
        onClose();
    };

    const isLoading = isSubmitting || externalLoading || isUploading;
    const urlImage = form.watch("url_image");
    const showPreview = urlImage && urlImage.startsWith("http");

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

                        {/* ===== Informations générales ===== */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Informations générales</h3>

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
                                            {"Décrivez l'objectif et le contenu de votre campagne"}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* ===== Médias ===== */}
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="text-lg font-medium">Médias et liens</h3>

                            <FormField
                                control={form.control}
                                name="url_image"
                                render={() => (
                                    <FormItem>
                                        <FormLabel>Image ou vidéo *</FormLabel>
                                        <FormControl>
                                            <Tabs
                                                value={mediaTab}
                                                onValueChange={(v) => setMediaTab(v as "upload" | "url")}
                                            >
                                                <TabsList className="mb-3">
                                                    <TabsTrigger value="upload" disabled={isLoading}>
                                                        <Upload className="mr-2 h-4 w-4" />
                                                        Uploader un fichier
                                                    </TabsTrigger>
                                                    <TabsTrigger value="url" disabled={isLoading}>
                                                        <LinkIcon className="mr-2 h-4 w-4" />
                                                        URL externe
                                                    </TabsTrigger>
                                                </TabsList>

                                                {/* TAB UPLOAD */}
                                                <TabsContent value="upload" className="mt-0">
                                                    {selectedFile && uploadProgress === 100 ? (
                                                        /* Fichier uploadé */
                                                        <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 p-4">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    {isVideoFile(selectedFile) ? (
                                                                        <FileVideo className="h-8 w-8 text-green-600" />
                                                                    ) : (
                                                                        <ImageIcon className="h-8 w-8 text-green-600" />
                                                                    )}
                                                                    <div>
                                                                        <p className="text-sm font-medium">{selectedFile.name}</p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {formatFileSize(selectedFile.size)} — Uploadé avec succès
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={handleRemoveFile}
                                                                    disabled={isLoading}
                                                                    className="text-muted-foreground hover:text-destructive"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : isUploading ? (
                                                        /* En cours d'upload */
                                                        <div className="rounded-lg border p-4 space-y-3">
                                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                                Upload en cours...
                                                            </div>
                                                            <Progress value={uploadProgress} className="h-2" />
                                                            <p className="text-xs text-muted-foreground">
                                                                {selectedFile?.name} — {uploadProgress}%
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        /* Zone de drop */
                                                        <div
                                                            className="rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors p-8 text-center cursor-pointer"
                                                            onClick={() => fileInputRef.current?.click()}
                                                            onDrop={handleDrop}
                                                            onDragOver={(e) => e.preventDefault()}
                                                        >
                                                            <div className="flex flex-col items-center gap-3">
                                                                <div className="rounded-full bg-muted p-3">
                                                                    <Upload className="h-6 w-6 text-muted-foreground" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium">
                                                                        Cliquez ou glissez-déposez un fichier
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground mt-1">
                                                                        JPG, PNG, GIF, WEBP, SVG, MP4, WEBM, MOV — Max {formatFileSize(MAX_FILE_SIZE)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        accept={ACCEPTED_TYPES.join(",")}
                                                        className="hidden"
                                                        onChange={handleFileInputChange}
                                                        disabled={isLoading}
                                                    />
                                                </TabsContent>

                                                {/* TAB URL */}
                                                <TabsContent value="url" className="mt-0">
                                                    <div className="flex gap-2">
                                                        <ImageIcon className="h-5 w-5 text-muted-foreground mt-2 shrink-0" />
                                                        <Input
                                                            type="url"
                                                            placeholder="https://example.com/image.jpg"
                                                            value={form.watch("url_image")}
                                                            onChange={(e) =>
                                                                form.setValue("url_image", e.target.value, { shouldValidate: true })
                                                            }
                                                            disabled={isLoading}
                                                        />
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1.5 ml-7">
                                                        Formats acceptés : JPG, PNG, GIF, MP4, WEBM
                                                    </p>
                                                </TabsContent>
                                            </Tabs>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Aperçu du média */}
                            {showPreview && (
                                <div className="rounded-lg border p-4 bg-muted/50">
                                    <p className="text-sm font-medium mb-2">Aperçu :</p>
                                    <div className="relative aspect-video rounded-md overflow-hidden bg-background">
                                        {isVideoUrl(urlImage) ? (
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
                                                    e.currentTarget.src =
                                                        "https://via.placeholder.com/400x200?text=Aperçu+non+disponible";
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
                                        <FormLabel>Lien de destination</FormLabel>
                                        <FormControl>
                                            <div className="flex gap-2">
                                                <ExternalLink className="h-5 w-5 text-muted-foreground mt-2 shrink-0" />
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

                        {/* ===== Période de diffusion ===== */}
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="text-lg font-medium">Période de diffusion</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="date_start"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Date de début *</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} disabled={isLoading} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="date_end"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Date de fin *</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} disabled={isLoading} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* ===== Paramètres ===== */}
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="text-lg font-medium">Paramètres</h3>

                            <FormField
                                control={form.control}
                                name="is_actif"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">Campagne active</FormLabel>
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

                        {/* ===== Actions ===== */}
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
                                {(isSubmitting || isUploading) && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {isUploading
                                    ? "Upload en cours..."
                                    : isEditing
                                    ? "Mettre à jour"
                                    : "Créer la campagne"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
