import { GoogleGenerativeAI } from '@google/generative-ai';
export declare const geminiAI: GoogleGenerativeAI;
export declare function getSystemPromptFromFirebase(): Promise<string>;
export declare function getExampleConversationsFromFirebase(): Promise<any[]>;
