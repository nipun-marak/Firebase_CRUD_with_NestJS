import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { db, auth } from '../config/firebase.config';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, setDoc, query, where, Timestamp } from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  signInWithCustomToken
} from 'firebase/auth';
import { adminAuth } from '../config/firebase.config';
import { geminiAI, getExampleConversationsFromFirebase, getSystemPromptFromFirebase } from '../config/gemini.config';
import { CreateUserDto, Gender } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChatMessageDto } from './dto/chat-message.dto';
import * as dotenv from 'dotenv';

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
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
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

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<TokenResponse> {
    try {
      // Verify the refresh token
      const decodedToken = await adminAuth.verifyIdToken(refreshTokenDto.refreshToken);
      
      // Generate a new custom token
      const customToken = await adminAuth.createCustomToken(decodedToken.uid);
      
      // Exchange custom token for ID tokens
      const userCredential = await signInWithCustomToken(auth, customToken);
      const accessToken = await userCredential.user.getIdToken();
      const refreshToken = await userCredential.user.getIdToken(true); // Force refresh

      return {
        accessToken,
        refreshToken
      };
    } catch (error) {
      if (error.code === 'auth/id-token-expired') {
        throw new HttpException('Refresh token expired', HttpStatus.UNAUTHORIZED);
      }
      throw new HttpException('Failed to refresh token', HttpStatus.INTERNAL_SERVER_ERROR);
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
      const refreshToken = await userCredential.user.getIdToken(true); // Force refresh
      
      return {
        user: {
          uid: userCredential.user.uid,
          email: userCredential.user.email as string,
        },
        accessToken,
        refreshToken
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

  async findByUid(uid: string): Promise<User> {
    try {
      const docRef = doc(db, this.usersCollection, uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const data = docSnap.data();
      // Convert Firestore Timestamp to Date
      return {
        ...data,
        id: docSnap.id,
        createdAt: data.createdAt.toDate()
      } as User;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch user profile', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateProfile(uid: string, updateUserDto: UpdateUserDto): Promise<User> {
    try {
      const docRef = doc(db, this.usersCollection, uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const updates: Partial<User> = { ...updateUserDto };
      
      // Update profile image if gender is changed
      if (updateUserDto.gender) {
        updates.profileImage = updateUserDto.gender === Gender.MALE 
          ? this.MALE_PROFILE_IMAGE 
          : this.FEMALE_PROFILE_IMAGE;
      }

      await updateDoc(docRef, updates);

      // Fetch and return updated user data
      const updatedDocSnap = await getDoc(docRef);
      if (!updatedDocSnap.exists()) {
        throw new HttpException('Failed to fetch updated user data', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const data = updatedDocSnap.data();
      return {
        ...data,
        id: updatedDocSnap.id,
        createdAt: data.createdAt.toDate()
      } as User;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to update user profile', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async chat(uid: string, chatMessageDto: ChatMessageDto): Promise<ChatMessage[]> {
    try {
      // Get the chat history subcollection reference
      const chatHistoryRef = collection(db, this.usersCollection, uid, 'chat-history');

      // Store user message
      const userMessage: ChatMessage = {
        role: 'user',
        content: chatMessageDto.message,
        timestamp: new Date()
      };

      await addDoc(chatHistoryRef, {
        ...userMessage,
        timestamp: Timestamp.fromDate(userMessage.timestamp)
      });

      // Get response from Gemini
      const model = geminiAI.getGenerativeModel({ model: "gemini-2.0-pro-exp-02-05" });
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

      await addDoc(chatHistoryRef, {
        ...assistantChatMessage,
        timestamp: Timestamp.fromDate(assistantChatMessage.timestamp)
      });

      // Get updated chat history
      const chatSnapshot = await getDocs(query(chatHistoryRef));
      return chatSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          timestamp: data.timestamp.toDate()
        } as ChatMessage;
      }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    } catch (error) {
      throw new HttpException('Failed to process chat message', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getChatHistory(uid: string): Promise<ChatMessage[]> {
    try {
      const chatHistoryRef = collection(db, this.usersCollection, uid, 'chat-history');
      const chatSnapshot = await getDocs(query(chatHistoryRef));
      
      return chatSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          timestamp: data.timestamp.toDate()
        } as ChatMessage;
      }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch (error) {
      throw new HttpException('Failed to fetch chat history', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 