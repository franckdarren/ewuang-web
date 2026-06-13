import admin from 'firebase-admin';

// Initialise Firebase Admin une seule fois (pattern singleton pour Next.js)
if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) {
        throw new Error('Variable FIREBASE_SERVICE_ACCOUNT_JSON manquante dans .env.local');
    }
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(raw)),
    });
}

export default admin;
