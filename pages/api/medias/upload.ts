import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File as FormidableFile } from 'formidable';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../app/lib/supabaseAdmin';

// Upload de média via le serveur (pas d'appel navigateur -> supabase.co).
// Le chemin de cette route est volontairement neutre : un upload direct
// vers une URL contenant "publicites" est silencieusement bloqué par les
// bloqueurs de pub / certains réseaux. Voir mémoire [[adblock-route-naming]].

const BUCKET = 'publicites';

export const config = {
    api: { bodyParser: false },
};

const ALLOWED_MIME: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
};

function parseForm(req: NextApiRequest) {
    return new Promise<{ files: formidable.Files }>((resolve, reject) => {
        const form = formidable({ multiples: false, maxFileSize: 50 * 1024 * 1024 });
        form.parse(req, (err, _fields, files) => {
            if (err) reject(err);
            else resolve({ files });
        });
    });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Non authentifié' });

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) return res.status(401).json({ error: 'Token invalide' });

        const { files } = await parseForm(req);
        const raw = files.file;
        if (!raw) return res.status(400).json({ error: 'Fichier requis' });

        const file = (Array.isArray(raw) ? raw[0] : raw) as FormidableFile;
        const mime = file.mimetype ?? '';
        const ext = ALLOWED_MIME[mime];

        if (!ext) {
            fs.unlinkSync(file.filepath);
            return res.status(400).json({ error: 'Format non supporté.' });
        }

        const buffer = fs.readFileSync(file.filepath);
        fs.unlinkSync(file.filepath);

        const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

        // Client service role : l'upload se fait côté serveur, hors RLS.
        const storage = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const { error: uploadError } = await storage.storage
            .from(BUCKET)
            .upload(filePath, buffer, { contentType: mime, upsert: true });

        if (uploadError) return res.status(500).json({ error: uploadError.message });

        const { data } = storage.storage.from(BUCKET).getPublicUrl(filePath);
        return res.status(200).json({ url: data.publicUrl });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erreur serveur';
        return res.status(500).json({ error: message });
    }
}
