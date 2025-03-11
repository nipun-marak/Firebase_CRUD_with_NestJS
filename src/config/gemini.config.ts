import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import { db } from './firebase.config';
import { doc, getDoc } from 'firebase/firestore';

// Load environment variables
dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  throw new Error('Gemini API key is missing. Please check your .env file.');
}

export const geminiAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Default system prompt as fallback
const defaultSystemPrompt = ``;

// Function to fetch system prompt from Firebase
export async function getSystemPromptFromFirebase(): Promise<string> {
  try {
    const systemPromptRef = doc(db, 'history', '1XseTZyEJ8G1VhAE58u4');
    const docSnap = await getDoc(systemPromptRef);
    
    if (!docSnap.exists()) {
      console.warn('System prompt document not found, using default prompt');
      return defaultSystemPrompt;
    }

    // Get the data and convert to string
    const data = docSnap.data();
    
    // Retrieve systemPrompt and ensure it's a string.
    const systemPrompt = JSON.stringify(data)
    const parsedData = JSON.parse(systemPrompt)
    // console.log('parsedData', parsedData)
    // console.log('systemPrompt', parsedData.systemPromt)
    return parsedData.systemPromt || defaultSystemPrompt;
  } catch (error) {
    console.error('Error fetching system prompt:', error);
    return defaultSystemPrompt;
  }
}

// Function to fetch example conversations from Firebase
export async function getExampleConversationsFromFirebase(): Promise<any[]> {
  try {
    const exampleHistoryRef = doc(db, 'history', '1XseTZyEJ8G1VhAE58u4');
    const docSnap = await getDoc(exampleHistoryRef);
    
    if (!docSnap.exists()) {
      console.warn('Example history document not found, using default conversations');
      return defaultExampleConversations;
    }

    const data = docSnap.data();
    const systemPrompt = JSON.stringify(data)
    const parsedData = JSON.parse(systemPrompt)
    // console.log('data', data.conversations)
    return parsedData.exampleHistory || defaultExampleConversations;
  } catch (error) {
    console.error('Error fetching example conversations:', error);
    return defaultExampleConversations;
  }
}

// Default example conversations as fallback
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
