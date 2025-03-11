import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { db, auth, adminAuth } from '../config/firebase.config';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, setDoc, query, where, Timestamp, orderBy, limit } from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  signInWithCustomToken,
  UserCredential,
  updateProfile as updateFirebaseProfile
} from 'firebase/auth';
import { geminiAI, getExampleConversationsFromFirebase, getSystemPromptFromFirebase } from '../config/gemini.config';
import { CreateUserDto, Gender } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChatMessageDto } from './dto/chat-message.dto';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
import { DecodedIdToken } from 'firebase-admin/auth';

// Load environment variables
dotenv.config();

export interface User {
  id?: string;
  uid: string;
  email: string;
  fullName: string;
  gender: Gender;
  profileImage: string;
  createdAt: Date;
}

export interface LoginResponse {
  user: {
    uid: string;
    email: string;
  };
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiry: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiry: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

@Injectable()
export class UsersService {
  private readonly usersCollection = 'users';
  private readonly MALE_PROFILE_IMAGE = 'https://cloud.appwrite.io/v1/storage/buckets/67cbfeb8001cacdead02/files/67cc4f75002419fbfc11/view?project=67cbfcdd00313bbf5ea5&mode=admin';
  private readonly FEMALE_PROFILE_IMAGE = 'https://cloud.appwrite.io/v1/storage/buckets/67cbfeb8001cacdead02/files/67cc4f8400007b439e24/view?project=67cbfcdd00313bbf5ea5&mode=admin';

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, resetPasswordDto.email);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        throw new HttpException('No user found with this email', HttpStatus.NOT_FOUND);
      }
      if (error.code === 'auth/invalid-email') {
        throw new HttpException('Invalid email format', HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Failed to send password reset email', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async register(createUserDto: CreateUserDto): Promise<User> {
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        createUserDto.email,
        createUserDto.password
      );

      const { uid } = userCredential.user;
      const email = userCredential.user.email as string;

      // Prepare user data for Firestore
      const userData: User = {
        uid,
        email,
        fullName: createUserDto.fullName,
        gender: createUserDto.gender,
        profileImage: createUserDto.gender === Gender.MALE 
          ? this.MALE_PROFILE_IMAGE 
          : this.FEMALE_PROFILE_IMAGE,
        createdAt: new Date()
      };

      // Store additional user data in Firestore
      await setDoc(doc(db, this.usersCollection, uid), userData);

      return userData;
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        throw new HttpException('Email already in use', HttpStatus.CONFLICT);
      }
      if (error.code === 'auth/invalid-email') {
        throw new HttpException('Invalid email format', HttpStatus.BAD_REQUEST);
      }
      if (error.code === 'auth/weak-password') {
        throw new HttpException('Password is too weak', HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Failed to register user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        loginDto.email,
        loginDto.password
      );

      const accessToken = await userCredential.user.getIdToken();
      
      // Generate a custom refresh token with 1 year expiry
      const refreshToken = this.generateRefreshToken();
      const refreshTokenExpiry = new Date();
      refreshTokenExpiry.setFullYear(refreshTokenExpiry.getFullYear() + 1); // 1 year expiry
      
      // Store the refresh token in Firestore
      await setDoc(doc(db, 'refreshTokens', refreshToken), {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        createdAt: Timestamp.fromDate(new Date()),
        expiresAt: Timestamp.fromDate(refreshTokenExpiry)
      });
      
      return {
        user: {
          uid: userCredential.user.uid,
          email: userCredential.user.email as string,
        },
        accessToken,
        refreshToken,
        refreshTokenExpiry: refreshTokenExpiry.toISOString()
      };
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      if (error.code === 'auth/wrong-password') {
        throw new HttpException('Invalid password', HttpStatus.UNAUTHORIZED);
      }
      if (error.code === 'auth/invalid-email') {
        throw new HttpException('Invalid email format', HttpStatus.BAD_REQUEST);
      }
      if (error.code === 'auth/too-many-requests') {
        throw new HttpException('Too many failed login attempts. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
      }
      throw new HttpException('Login failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Generate a secure random refresh token
  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<TokenResponse> {
    try {
      // Get the refresh token from Firestore
      const tokenQuery = query(
        collection(db, 'refreshTokens'),
        where('__name__', '==', refreshTokenDto.refreshToken)
      );
      
      const tokenSnapshot = await getDocs(tokenQuery);
      
      if (tokenSnapshot.empty) {
        throw new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
      }
      
      const tokenDoc = tokenSnapshot.docs[0];
      const tokenData = tokenDoc.data();
      
      // Check if token is expired
      const expiresAt = tokenData.expiresAt.toDate();
      if (expiresAt < new Date()) {
        // Remove the expired token
        await deleteDoc(doc(db, 'refreshTokens', tokenDoc.id));
        throw new HttpException('Refresh token expired', HttpStatus.UNAUTHORIZED);
      }
      
      // Get the user from Firebase Auth
      const userRecord = await adminAuth.getUser(tokenData.uid);
      
      // Generate a new custom token
      const customToken = await adminAuth.createCustomToken(userRecord.uid);
      
      // Exchange custom token for ID token (access token)
      const userCredential = await signInWithCustomToken(auth, customToken);
      const accessToken = await userCredential.user.getIdToken();
      
      // Generate a new refresh token
      const newRefreshToken = this.generateRefreshToken();
      const refreshTokenExpiry = new Date();
      refreshTokenExpiry.setFullYear(refreshTokenExpiry.getFullYear() + 1); // 1 year expiry
      
      // Store the new refresh token in Firestore
      await setDoc(doc(db, 'refreshTokens', newRefreshToken), {
        uid: userRecord.uid,
        email: userRecord.email,
        createdAt: Timestamp.fromDate(new Date()),
        expiresAt: Timestamp.fromDate(refreshTokenExpiry)
      });
      
      // Delete the old refresh token
      await deleteDoc(doc(db, 'refreshTokens', tokenDoc.id));
      
      return {
        accessToken,
        refreshToken: newRefreshToken,
        refreshTokenExpiry: refreshTokenExpiry.toISOString()
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to refresh token', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findAll(): Promise<User[]> {
    try {
      const querySnapshot = await getDocs(collection(db, this.usersCollection));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));
    } catch (error) {
      throw new HttpException('Failed to fetch users', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findOne(id: string): Promise<User> {
    try {
      const docRef = doc(db, this.usersCollection, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      return {
        id: docSnap.id,
        ...docSnap.data()
      } as User;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async update(id: string, user: Partial<User>): Promise<void> {
    try {
      const docRef = doc(db, this.usersCollection, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      await updateDoc(docRef, user);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to update user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.usersCollection, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      await deleteDoc(docRef);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to delete user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get user by access token
  async getUserByToken(token: string): Promise<User> {
    try {
      // Verify the access token
      const decodedToken = await adminAuth.verifyIdToken(token);
      const uid = decodedToken.uid;
      
      // Query the user from Firestore
      const userQuery = query(
        collection(db, this.usersCollection), 
        where('uid', '==', uid)
      );
      const querySnapshot = await getDocs(userQuery);
      
      if (querySnapshot.empty) {
        // Try to get user info from Firebase Auth
        try {
          const userRecord = await adminAuth.getUser(uid);
          
          // Create a new user document
          const userData: User = {
            uid: userRecord.uid,
            email: userRecord.email || 'unknown@example.com',
            fullName: userRecord.displayName || 'User',
            gender: Gender.MALE, // Default
            profileImage: this.MALE_PROFILE_IMAGE,
            createdAt: new Date()
          };
          
          // Store user data in Firestore
          await setDoc(doc(db, this.usersCollection, uid), userData);
          
          return userData;
        } catch (authError) {
          throw new HttpException('Invalid or expired token', HttpStatus.UNAUTHORIZED);
        }
      }
      
      const userDoc = querySnapshot.docs[0];
      
      return {
        id: userDoc.id,
        ...userDoc.data(),
        createdAt: userDoc.data().createdAt.toDate()
      } as User;
    } catch (error) {
      if (error.code === 'auth/id-token-expired') {
        throw new HttpException('Token expired', HttpStatus.UNAUTHORIZED);
      }
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to authenticate user', HttpStatus.UNAUTHORIZED);
    }
  }

  async updateProfile(accessToken: string, updateUserDto: UpdateUserDto): Promise<User> {
    try {
      // Get user from token
      const user = await this.getUserByToken(accessToken);
      const uid = user.uid;
      
      // Prepare update data
      const updateData: Partial<User> = {
        ...updateUserDto
      };
      
      if (updateUserDto.gender) {
        updateData.profileImage = updateUserDto.gender === Gender.MALE 
          ? this.MALE_PROFILE_IMAGE 
          : this.FEMALE_PROFILE_IMAGE;
      }
      
      // Update the user in Firestore
      await updateDoc(doc(db, this.usersCollection, uid), updateData);
      
      // Return updated user
      return {
        ...user,
        ...updateData
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to update profile', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async chat(accessToken: string, chatMessageDto: ChatMessageDto): Promise<{ messages: ChatMessage[], chatId: string }> {
    try {
      console.log("Processing chat for token:", accessToken ? "token-provided" : "no-token");
      
      // First, get the user from token
      const user = await this.getUserByToken(accessToken);
      const uid = user.uid;
      
      // Chat reference should be:
      // users/{uid}/chat-history/{chatId}/messages/{messageId}
      // We need to ensure proper collection-document-collection structure
      
      // Check if this is a new chat or existing one
      let chatId: string;
      const chatHistoryRef = collection(db, this.usersCollection, uid, 'chat-history');
      
      if (chatMessageDto.isNewChat) {
        // For new chat, create a document name from first message
        const words = chatMessageDto.message.split(/\s+/);
        const first100Words = words.slice(0, 100).join(' ');
        const sanitizedName = first100Words
          .replace(/[^a-zA-Z0-9_]/g, '_')
          .substring(0, 50); // Firestore document names have limits
          
        // Ensure uniqueness with timestamp
        chatId = sanitizedName ? `${sanitizedName}_${Date.now()}` : `chat_${Date.now()}`;
        
        // Create an empty document to serve as the chat container
        await setDoc(doc(chatHistoryRef, chatId), {
          title: first100Words.substring(0, 50),
          createdAt: Timestamp.fromDate(new Date()),
          updatedAt: Timestamp.fromDate(new Date())
        });
      } else {
        // For existing chat, use the provided chatId
        chatId = chatMessageDto.chatId || '';
        
        if (!chatId) {
          // Find the most recent chat if no chatId provided
          const chatsSnapshot = await getDocs(chatHistoryRef);
          const chats = chatsSnapshot.docs;
          
          if (chats.length === 0) {
            // No existing chats, create a new one
            chatId = `chat_${Date.now()}`;
            await setDoc(doc(chatHistoryRef, chatId), {
              title: chatMessageDto.message.substring(0, 50),
              createdAt: Timestamp.fromDate(new Date()),
              updatedAt: Timestamp.fromDate(new Date())
            });
          } else {
            // Use the most recent chat document
            const sortedChats = chats.map(doc => {
              const data = doc.data();
              return { 
                id: doc.id, 
                updatedAt: data.updatedAt,
                createdAt: data.createdAt
              };
            }).sort((a, b) => {
              const dateA = a.updatedAt?.toDate() || new Date(0);
              const dateB = b.updatedAt?.toDate() || new Date(0);
              return dateB.getTime() - dateA.getTime();
            });
            
            chatId = sortedChats[0].id;
          }
        }
        
        // Update the chat document's updatedAt field
        await updateDoc(doc(chatHistoryRef, chatId), {
          updatedAt: Timestamp.fromDate(new Date())
        });
      }
      
      // Reference to the messages collection inside the chat document
      const messagesRef = collection(chatHistoryRef, chatId, 'messages');
      
      // Store user message
      const userMessage: ChatMessage = {
        role: 'user',
        content: chatMessageDto.message,
        timestamp: new Date()
      };

      await addDoc(messagesRef, {
        ...userMessage,
        timestamp: Timestamp.fromDate(userMessage.timestamp)
      });

      // Get response from Gemini
      const model = geminiAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const systemPrompt = await getSystemPromptFromFirebase();
      const exampleConversations = await getExampleConversationsFromFirebase();
      
      const chat = model.startChat({
        history: exampleConversations,
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
        },
      });
      
      const context = `${systemPrompt}\n\nPlease provide a response to the following message: ${chatMessageDto.message}`;
      const result = await chat.sendMessage(context);
      const response = await result.response;
      const assistantMessage = response.text();

      // Store assistant message
      const assistantChatMessage: ChatMessage = {
        role: 'assistant',
        content: assistantMessage,
        timestamp: new Date()
      };

      await addDoc(messagesRef, {
        ...assistantChatMessage,
        timestamp: Timestamp.fromDate(assistantChatMessage.timestamp)
      });

      // Get updated chat history for this chat
      const chatSnapshot = await getDocs(query(messagesRef));
      const messages = chatSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          timestamp: data.timestamp.toDate()
        } as ChatMessage;
      }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      // Return the current chat's messages
      return {
        messages: messages,
        chatId: chatId
      };
    } catch (error) {
      console.error('Chat error:', error);
      throw new HttpException('Failed to process chat message', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get chat history for a specific chat
  async getChatHistory(accessToken: string, chatId: string): Promise<ChatMessage[]> {
    try {
      console.log("Getting chat history with token:", accessToken ? "token-provided" : "no-token");
      
      // First, get the user from token
      const user = await this.getUserByToken(accessToken);
      const uid = user.uid;
      
      // Then check if chat exists
      const chatDocRef = doc(db, this.usersCollection, uid, 'chat-history', chatId);
      const chatDoc = await getDoc(chatDocRef);
      
      if (!chatDoc.exists()) {
        console.log("Chat not found:", chatId);
        throw new HttpException('Chat not found', HttpStatus.NOT_FOUND);
      }
      
      // Use the proper collection-document-collection path structure
      const messagesRef = collection(db, this.usersCollection, uid, 'chat-history', chatId, 'messages');
      const chatSnapshot = await getDocs(query(messagesRef));
      
      return chatSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          timestamp: data.timestamp.toDate()
        } as ChatMessage;
      }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch (error) {
      console.error('Error getting chat history:', error);
      throw new HttpException('Failed to get chat history', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get all chat conversations for a user
  async getChatConversations(accessToken: string): Promise<any[]> {
    try {
      console.log("Getting chat conversations with token:", accessToken ? "token-provided" : "no-token");
      
      // First, get the user from token
      const user = await this.getUserByToken(accessToken);
      const uid = user.uid;
      
      // Proceed with getting chat history
      const chatHistoryRef = collection(db, this.usersCollection, uid, 'chat-history');
      const chatsSnapshot = await getDocs(chatHistoryRef);
      
      // If no chats exist yet, return empty array
      if (chatsSnapshot.empty) {
        console.log("No chat conversations found for user:", uid);
        return [];
      }
      
      // Get all chat documents with their metadata
      const conversations = await Promise.all(
        chatsSnapshot.docs.map(async (chatDoc) => {
          const chatId = chatDoc.id;
          const chatData = chatDoc.data();
          
          // Get message count
          const messagesRef = collection(db, this.usersCollection, uid, 'chat-history', chatId, 'messages');
          const messagesSnapshot = await getDocs(messagesRef);
          
          return {
            id: chatId,
            ...chatData,
            createdAt: chatData.createdAt?.toDate?.() || chatData.createdAt,
            updatedAt: chatData.updatedAt?.toDate?.() || chatData.updatedAt,
            messageCount: messagesSnapshot.size
          };
        })
      );
      
      // Sort by last updated timestamp (newest first)
      return conversations.sort((a, b) => {
        const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date(0);
        const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
    } catch (error) {
      console.error('Error getting chat conversations:', error);
      throw new HttpException('Failed to get chat conversations', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get all chat history for a user across all conversations
  async getAllChatHistory(accessToken: string): Promise<{ conversations: any[], messages: ChatMessage[] }> {
    try {
      // First, get all conversations using the token
      const conversations = await this.getChatConversations(accessToken);
      
      // Get the user from token
      const user = await this.getUserByToken(accessToken);
      const uid = user.uid;
      
      // Then, gather all messages from all conversations
      const allMessages: ChatMessage[] = [];
      
      // Process each conversation to get its messages
      await Promise.all(
        conversations.map(async (conversation) => {
          const chatId = conversation.id;
          const messagesRef = collection(db, this.usersCollection, uid, 'chat-history', chatId, 'messages');
          const messagesSnapshot = await getDocs(messagesRef);
          
          // Process messages
          const messages = messagesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              ...data,
              timestamp: data.timestamp.toDate(),
              chatId: chatId,
              conversationTitle: conversation.title || 'Untitled Chat'
            } as ChatMessage & { chatId: string, conversationTitle: string };
          });
          
          allMessages.push(...messages);
        })
      );
      
      // Sort all messages by timestamp (newest first)
      allMessages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      return {
        conversations,
        messages: allMessages
      };
    } catch (error) {
      console.error('Error getting all chat history:', error);
      throw new HttpException('Failed to get chat history', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getDailyVerse(accessToken: string, date: string): Promise<{ verse: string, reference: string, occasion: string }> {
    try {
      // Verify the user is authenticated
      await this.getUserByToken(accessToken);
      
      // Use a more natural and conversational prompt for Gemini
      const geminiPrompt = `Today is ${date}. Does today have any special significance according to the Christian religion? If yes, then give me a Bible verse according to the day. If not, then which Bible verse would be good for today? Return only the verse text and its reference in the following JSON format: {"verse": "The full verse text", "reference": "Book Chapter:Verse", "occasion": "The name of the special day or 'regular day' if none"}. Do not include any explanations or additional text.`;
      
      // Create a generative model
      const model = geminiAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      
      // Generate content
      const result = await model.generateContent(geminiPrompt);
      const response = result.response.text();
      
      try {
        // Clean the response by removing markdown formatting
        let cleanedResponse = response;
        
        // Remove markdown code block markers if present
        if (response.includes('```')) {
          // Extract content between code block markers
          const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (codeBlockMatch && codeBlockMatch[1]) {
            cleanedResponse = codeBlockMatch[1];
          }
        }
        
        // Parse the cleaned JSON response from Gemini
        const parsedResponse = JSON.parse(cleanedResponse);
        return {
          verse: parsedResponse.verse,
          reference: parsedResponse.reference,
          occasion: parsedResponse.occasion || "regular day"
        };
      } catch (parseError) {
        // Fallback in case Gemini doesn't return valid JSON
        console.error('Error parsing Gemini response as JSON:', parseError);
        
        // Extract verse and reference using regex if JSON parsing fails
        const verseMatch = response.match(/"verse":\s*"([^"]+)"/);
        const referenceMatch = response.match(/"reference":\s*"([^"]+)"/);
        const occasionMatch = response.match(/"occasion":\s*"([^"]+)"/);
        
        return {
          verse: verseMatch ? verseMatch[1] : "The Lord is my shepherd; I shall not want.",
          reference: referenceMatch ? referenceMatch[1] : "Psalm 23:1",
          occasion: occasionMatch ? occasionMatch[1] : "regular day"
        };
      }
    } catch (error) {
      console.error('Error in getDailyVerse:', error);
      throw new HttpException(
        'Failed to retrieve daily verse',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 