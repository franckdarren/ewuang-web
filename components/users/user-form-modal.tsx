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
import { Loader2, Eye, EyeOff, Copy, Check } from "lucide-react";
import { type User, useUsersStore } from '@/stores/usersStore';

// ============================================
// VALIDATION SCHEMA
// ============================================

const createSchema = z.object({
    name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(255),
    email: z.string().email("Email invalide").max(255),
    password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
    role: z.enum(["Client", "Boutique", "Livreur", "Administrateur"]),
    phone: z.string().min(9).max(20).optional().or(z.literal("")),
    address: z.string().max(255).optional().or(z.literal("")),
    description: z.string().max(1000).optional().or(z.literal("")),
    heure_ouverture: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().or(z.literal("")),
    heure_fermeture: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().or(z.literal("")),
});

const editSchema = z.object({
    name: z.string().min(2).max(255),
    email: z.string().email().max(255),
    password: z.string().optional(),
    role: z.enum(["Client", "Boutique", "Livreur", "Administrateur"]),
    phone: z.string().min(9).max(20).optional().or(z.literal("")),
    address: z.string().max(255).optional().or(z.literal("")),
    description: z.string().max(1000).optional().or(z.literal("")),
    heure_ouverture: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().or(z.literal("")),
    heure_fermeture: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().or(z.literal("")),
    is_verified: z.boolean().optional(),
    is_active: z.boolean().optional(),
});

type FormValues = z.infer<typeof createSchema> & { is_verified?: boolean; is_active?: boolean };

// ============================================
// PROPS
// ============================================

interface UserFormModalProps {
    open: boolean;
    onClose: () => void;
    user?: User;
    isLoading?: boolean;
}

// ============================================
// COMPOSANT
// ============================================

export function UserFormModal({
    open,
    onClose,
    user,
    isLoading: externalLoading = false,
}: UserFormModalProps) {
    const isEditing = !!user;
    const createUser = useUsersStore((s) => s.createUser);

    const form = useForm<FormValues>({
        resolver: zodResolver(isEditing ? editSchema : createSchema),
        defaultValues: {
            name: user?.name || "",
            email: user?.email || "",
            password: "",
            role: user?.role || "Livreur",
            phone: user?.phone || "",
            address: user?.address || "",
            description: user?.description || "",
            heure_ouverture: user?.heure_ouverture || "",
            heure_fermeture: user?.heure_fermeture || "",
            is_verified: user?.is_verified || false,
            is_active: user?.is_active ?? true,
        },
    });

    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [createdCredentials, setCreatedCredentials] = React.useState<{ email: string; password: string } | null>(null);
    const [copied, setCopied] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            form.reset({
                name: user?.name || "",
                email: user?.email || "",
                password: "",
                role: user?.role || "Livreur",
                phone: user?.phone || "",
                address: user?.address || "",
                description: user?.description || "",
                heure_ouverture: user?.heure_ouverture || "",
                heure_fermeture: user?.heure_fermeture || "",
                is_verified: user?.is_verified || false,
                is_active: user?.is_active ?? true,
            });
            setCreatedCredentials(null);
            setCopied(false);
            setShowPassword(false);
        }
    }, [open, user, form]);

    const handleSubmit = async (data: FormValues) => {
        if (isEditing) {
            onClose();
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await createUser({
                email: data.email,
                password: data.password,
                name: data.name,
                role: data.role,
                phone: data.phone || undefined,
                address: data.address || undefined,
            });

            if (result) {
                setCreatedCredentials({
                    email: data.email,
                    password: data.password,
                });
            }
        } catch (err) {
            console.error("Erreur lors de la soumission:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        form.reset();
        setCreatedCredentials(null);
        setCopied(false);
        onClose();
    };

    const handleCopyCredentials = async () => {
        if (!createdCredentials) return;
        const text = `Identifiants Ewuang\nEmail : ${createdCredentials.email}\nMot de passe : ${createdCredentials.password}`;
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const selectedRole = form.watch("role");
    const showBoutiqueFields = selectedRole === "Boutique";
    const loading = isSubmitting || externalLoading;

    // ============================================
    // ÉCRAN DE CONFIRMATION APRÈS CRÉATION
    // ============================================
    if (createdCredentials) {
        return (
            <Dialog open={open} onOpenChange={handleClose}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-green-600">Utilisateur créé avec succès</DialogTitle>
                        <DialogDescription>
                            Communiquez ces identifiants à l&apos;utilisateur pour qu&apos;il puisse se connecter.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
                            <div>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Email</p>
                                <p className="text-sm font-mono mt-1">{createdCredentials.email}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Mot de passe</p>
                                <p className="text-sm font-mono mt-1">{createdCredentials.password}</p>
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={handleCopyCredentials}
                        >
                            {copied ? (
                                <>
                                    <Check className="mr-2 h-4 w-4 text-green-600" />
                                    Copié !
                                </>
                            ) : (
                                <>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copier les identifiants
                                </>
                            )}
                        </Button>
                    </div>

                    <DialogFooter>
                        <Button onClick={handleClose}>Fermer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    // ============================================
    // FORMULAIRE DE CRÉATION / ÉDITION
    // ============================================
    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Détails de l'utilisateur" : "Créer un utilisateur"}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Consultez les informations de l'utilisateur."
                            : "Remplissez le formulaire pour créer un nouvel utilisateur avec ses identifiants de connexion."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        <div className="space-y-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nom complet *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="John Doe" {...field} disabled={isEditing || loading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email *</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="john@example.com" {...field} disabled={isEditing || loading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            {!isEditing && (
                                <FormField control={form.control} name="password" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mot de passe *</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="Min. 6 caractères"
                                                    {...field}
                                                    disabled={loading}
                                                    className="pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                    tabIndex={-1}
                                                >
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </FormControl>
                                        <FormDescription>
                                            Ce mot de passe sera communiqué à l&apos;utilisateur pour sa première connexion.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            )}

                            <FormField control={form.control} name="role" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Rôle *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={isEditing || loading}>
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
                            )} />

                            <FormField control={form.control} name="phone" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Téléphone</FormLabel>
                                    <FormControl>
                                        <Input type="tel" placeholder="+241 XX XX XX XX" {...field} disabled={isEditing || loading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="address" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Adresse</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Libreville, Gabon" {...field} disabled={isEditing || loading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        {showBoutiqueFields && (
                            <div className="space-y-4 border-t pt-4">
                                <FormField control={form.control} name="description" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea {...field} disabled={isEditing || loading} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="heure_ouverture" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Heure d&apos;ouverture</FormLabel>
                                            <FormControl>
                                                <Input type="time" {...field} disabled={isEditing || loading} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="heure_fermeture" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Heure de fermeture</FormLabel>
                                            <FormControl>
                                                <Input type="time" {...field} disabled={isEditing || loading} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </div>
                        )}

                        {isEditing && (
                            <div className="space-y-4 border-t pt-4">
                                <FormField control={form.control} name="is_verified" render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between border p-4 rounded-lg">
                                        <div>
                                            <FormLabel>Compte vérifié</FormLabel>
                                            <FormDescription>Vérifié par l&apos;administration</FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} disabled />
                                        </FormControl>
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="is_active" render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between border p-4 rounded-lg">
                                        <div>
                                            <FormLabel>Compte actif</FormLabel>
                                            <FormDescription>L&apos;utilisateur peut accéder à la plateforme</FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} disabled />
                                        </FormControl>
                                    </FormItem>
                                )} />
                            </div>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                                {isEditing ? "Fermer" : "Annuler"}
                            </Button>
                            {!isEditing && (
                                <Button type="submit" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Création en cours...
                                        </>
                                    ) : (
                                        "Créer l'utilisateur"
                                    )}
                                </Button>
                            )}
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
