import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

// Initialise Firebase Admin une seule fois (pattern singleton pour Next.js)
if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) {
        throw new Error('Variable FIREBASE_SERVICE_ACCOUNT_JSON manquante dans .env.local');
    }
    initializeApp({
        credential: cert(JSON.parse(raw)),
    });
}

export { getMessaging };
