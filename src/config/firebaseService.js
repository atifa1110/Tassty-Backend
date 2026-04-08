import admin from 'firebase-admin';

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountRaw) {
    throw new Error("Variabel FIREBASE_SERVICE_ACCOUNT!");
}

// 2. Ubah string jadi objek JSON
const serviceAccount = JSON.parse(serviceAccountRaw);

// 3. Inisialisasi Admin SDK
admin.initializeApp({
    credential: admin.credential.cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
    })
});

export default admin;