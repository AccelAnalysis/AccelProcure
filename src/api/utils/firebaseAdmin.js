let firebaseAppPromise;

const loadFirebaseAdmin = async () => {
  if (firebaseAppPromise !== undefined) {
    return firebaseAppPromise;
  }

  firebaseAppPromise = import('firebase-admin')
    .then((module) => module.default || module)
    .catch(() => null);

  return firebaseAppPromise;
};

export const getFirebaseAdminApp = async () => {
  const admin = await loadFirebaseAdmin();
  if (!admin) {
    return null;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  const existingApp = admin.apps?.length ? admin.app() : null;
  if (existingApp) {
    return existingApp;
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
};

export default getFirebaseAdminApp;
