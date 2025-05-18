import admin from 'firebase-admin';
import serviceAccount from '../config/serviceAcountKey.json'; // replace with your actual path

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
