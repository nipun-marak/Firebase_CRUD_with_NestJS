"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAuth = exports.auth = exports.db = void 0;
const app_1 = require("firebase/app");
const firestore_1 = require("firebase/firestore");
const auth_1 = require("firebase/auth");
const admin = require("firebase-admin");
const dotenv = require("dotenv");
dotenv.config();
if (!process.env.FIREBASE_API_KEY) {
    throw new Error('Firebase configuration is missing. Please check your .env file.');
}
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
};
var serviceAccount = require("../../service-account-key.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
});
const app = (0, app_1.initializeApp)(firebaseConfig);
exports.db = (0, firestore_1.getFirestore)(app);
exports.auth = (0, auth_1.getAuth)(app);
exports.adminAuth = admin.auth();
//# sourceMappingURL=firebase.config.js.map