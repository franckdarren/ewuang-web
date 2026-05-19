import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File as FormidableFile } from 'formidable';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = {
    api: { bodyParser: false },
};

const ALLOWED_MIME: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
};

async function parseForm(req: NextApiRequest) {
    return new Promise<{ files: formidable.Files }>((resolve, reject) => {
        const form = formidable({ multiples: false, maxFileSize: 5 * 1024 * 1024 });
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
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return res.status(401).json({ error: 'Token invalide' });

        const { files } = await parseForm(req);
        if (!files.file) return res.status(400).json({ error: 'Fichier requis' });

        const file = (Array.isArray(files.file) ? files.file[0] : files.file) as FormidableFile;
        const mime = file.mimetype ?? '';
        const ext = ALLOWED_MIME[mime];

        if (!ext) {
            fs.unlinkSync(file.filepath);
            return res.status(400).json({ error: 'Format non supporté. Utilisez JPG, PNG, WebP ou GIF.' });
        }

        const buffer = fs.readFileSync(file.filepath);
        fs.unlinkSync(file.filepath);

        const filePath = `publicites/${user.id}/${Date.now()}.${ext}`;

        const storageClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                global: { headers: { Authorization: `Bearer ${token}` } },
                auth: { autoRefreshToken: false, persistSession: false },
            }
        );

        const { error: uploadError } = await storageClient.storage
            .from('publicites')
            .upload(filePath, buffer, { contentType: mime, upsert: false });

        if (uploadError) return res.status(500).json({ error: uploadError.message });

        const { data: urlData } = supabase.storage.from('publicites').getPublicUrl(filePath);

        return res.status(200).json({ url: urlData.publicUrl });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erreur serveur';
        return res.status(500).json({ error: message });
    }
}
