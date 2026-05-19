import type { NextApiRequest, NextApiResponse } from 'next';

// Proxy d'image same-origin au nom neutre. Le navigateur charge
// /api/medias/file/<path> (non bloqué) ; le serveur récupère l'objet
// public du bucket Supabase `publicites`. Voir [[adblock-route-naming]].

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).end();
    }

    const parts = req.query.path;
    const objectPath = (Array.isArray(parts) ? parts.join('/') : String(parts ?? '')).trim();
    if (!objectPath || objectPath.includes('..')) return res.status(400).end();

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!base) return res.status(500).end();

    const src = `${base}/storage/v1/object/public/publicites/${objectPath}`;

    try {
        const upstream = await fetch(src);
        if (!upstream.ok) return res.status(upstream.status).end();

        const buffer = Buffer.from(await upstream.arrayBuffer());
        res.setHeader(
            'Content-Type',
            upstream.headers.get('content-type') ?? 'application/octet-stream'
        );
        res.setHeader(
            'Cache-Control',
            'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800'
        );
        return res.status(200).send(buffer);
    } catch {
        return res.status(502).end();
    }
}
