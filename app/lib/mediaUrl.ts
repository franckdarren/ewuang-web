// Réécrit une URL Supabase Storage du bucket `publicites` vers un proxy
// same-origin au nom neutre. Sans ça, les bloqueurs de pub bloquent
// l'affichage de l'image (URL contenant "publicites"). Voir mémoire
// [[adblock-route-naming]]. Idempotent et sûr sur les URLs externes.

export function proxiedMediaUrl(url?: string | null): string {
    if (!url) return '';
    // blob:/data:/relative déjà sûrs
    if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('/')) {
        return url;
    }

    const marker = '/storage/v1/object/';
    const i = url.indexOf(marker);
    if (i === -1) return url; // pas une URL de notre Storage

    let rest = url.slice(i + marker.length); // ex: "public/publicites/x.jpg"
    if (rest.startsWith('public/')) rest = rest.slice('public/'.length);

    const bucketPrefix = 'publicites/';
    if (!rest.startsWith(bucketPrefix)) return url; // autre bucket

    const objectPath = rest.slice(bucketPrefix.length).split('?')[0];
    if (!objectPath) return url;

    return `/api/medias/file/${objectPath}`;
}
