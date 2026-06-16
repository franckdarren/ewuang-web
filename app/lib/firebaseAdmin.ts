import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging as fbGetMessaging, type Messaging } from 'firebase-admin/messaging';

// Initialise Firebase Admin de façon paresseuse (lazy) et tolérante.
//
// Important : on n'initialise PAS au niveau module et on ne `throw` jamais à
// l'import. Le push FCM est best-effort — si la variable d'environnement
// FIREBASE_SERVICE_ACCOUNT_JSON est absente ou invalide, on renvoie simplement
// `null` pour que l'appelant ignore le push sans faire échouer le flux
// principal (ex. l'insertion des notifications in-app).
let cachedMessaging: Messaging | null | undefined;

export function getMessagingSafe(): Messaging | null {
    if (cachedMessaging !== undefined) return cachedMessaging;

    try {
        if (!getApps().length) {
            const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
            if (!raw) {
                console.warn(
                    '[firebaseAdmin] FIREBASE_SERVICE_ACCOUNT_JSON manquante — push FCM désactivé.',
                );
                cachedMessaging = null;
                return cachedMessaging;
            }
            initializeApp({ credential: cert(JSON.parse(raw)) });
        }
        cachedMessaging = fbGetMessaging();
    } catch (err) {
        console.error('[firebaseAdmin] initialisation impossible — push FCM désactivé:', err);
        cachedMessaging = null;
    }

    return cachedMessaging;
}

/**
 * Variante rétrocompatible : retourne l'instance Messaging ou lève une erreur si
 * Firebase n'est pas configuré. À n'utiliser qu'à l'INTÉRIEUR d'un try/catch
 * best-effort (l'erreur ne doit jamais remonter au flux principal). Contrairement
 * à l'ancienne implémentation, l'initialisation est paresseuse : l'import de ce
 * module ne lève plus jamais d'exception.
 */
export function getMessaging(): Messaging {
    const messaging = getMessagingSafe();
    if (!messaging) {
        throw new Error('Firebase Admin non configuré (FIREBASE_SERVICE_ACCOUNT_JSON manquante).');
    }
    return messaging;
}
