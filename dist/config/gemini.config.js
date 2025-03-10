"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geminiAI = void 0;
exports.getSystemPromptFromFirebase = getSystemPromptFromFirebase;
exports.getExampleConversationsFromFirebase = getExampleConversationsFromFirebase;
const generative_ai_1 = require("@google/generative-ai");
const dotenv = require("dotenv");
const firebase_config_1 = require("./firebase.config");
const firestore_1 = require("firebase/firestore");
dotenv.config();
if (!process.env.GEMINI_API_KEY) {
    throw new Error('Gemini API key is missing. Please check your .env file.');
}
exports.geminiAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = exports.geminiAI.getGenerativeModel({ model: 'gemini-pro' });
const defaultSystemPrompt = ``;
async function getSystemPromptFromFirebase() {
    try {
        const systemPromptRef = (0, firestore_1.doc)(firebase_config_1.db, 'history', '1XseTZyEJ8G1VhAE58u4');
        const docSnap = await (0, firestore_1.getDoc)(systemPromptRef);
        if (!docSnap.exists()) {
            console.warn('System prompt document not found, using default prompt');
            return defaultSystemPrompt;
        }
        const data = docSnap.data();
        return data.systemPrompt || defaultSystemPrompt;
    }
    catch (error) {
        console.error('Error fetching system prompt:', error);
        return defaultSystemPrompt;
    }
}
async function getExampleConversationsFromFirebase() {
    try {
        const exampleHistoryRef = (0, firestore_1.doc)(firebase_config_1.db, 'history', '1XseTZyEJ8G1VhAE58u4');
        const docSnap = await (0, firestore_1.getDoc)(exampleHistoryRef);
        if (!docSnap.exists()) {
            console.warn('Example history document not found, using default conversations');
            return defaultExampleConversations;
        }
        const data = docSnap.data();
        return data.conversations || defaultExampleConversations;
    }
    catch (error) {
        console.error('Error fetching example conversations:', error);
        return defaultExampleConversations;
    }
}
const defaultExampleConversations = [
    {
        role: 'user',
        parts: [{ text: "How are you?" }]
    },
    {
        role: 'model',
        parts: [{ text: "I'm fine, thank you! How can I help you today?" }]
    }
];
//# sourceMappingURL=gemini.config.js.map