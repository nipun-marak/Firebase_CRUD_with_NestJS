"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const firebase_config_1 = require("../config/firebase.config");
const firestore_1 = require("firebase/firestore");
const auth_1 = require("firebase/auth");
const gemini_config_1 = require("../config/gemini.config");
const create_user_dto_1 = require("./dto/create-user.dto");
const dotenv = require("dotenv");
const crypto = require("crypto");
dotenv.config();
let UsersService = class UsersService {
    usersCollection = 'users';
    MALE_PROFILE_IMAGE = 'https://cloud.appwrite.io/v1/storage/buckets/67cbfeb8001cacdead02/files/67cc4f75002419fbfc11/view?project=67cbfcdd00313bbf5ea5&mode=admin';
    FEMALE_PROFILE_IMAGE = 'https://cloud.appwrite.io/v1/storage/buckets/67cbfeb8001cacdead02/files/67cc4f8400007b439e24/view?project=67cbfcdd00313bbf5ea5&mode=admin';
    async resetPassword(resetPasswordDto) {
        try {
            await (0, auth_1.sendPasswordResetEmail)(firebase_config_1.auth, resetPasswordDto.email);
        }
        catch (error) {
            if (error.code === 'auth/user-not-found') {
                throw new common_1.HttpException('No user found with this email', common_1.HttpStatus.NOT_FOUND);
            }
            if (error.code === 'auth/invalid-email') {
                throw new common_1.HttpException('Invalid email format', common_1.HttpStatus.BAD_REQUEST);
            }
            throw new common_1.HttpException('Failed to send password reset email', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async register(createUserDto) {
        try {
            const userCredential = await (0, auth_1.createUserWithEmailAndPassword)(firebase_config_1.auth, createUserDto.email, createUserDto.password);
            const { uid } = userCredential.user;
            const email = userCredential.user.email;
            const userData = {
                uid,
                email,
                fullName: createUserDto.fullName,
                gender: createUserDto.gender,
                profileImage: createUserDto.gender === create_user_dto_1.Gender.MALE
                    ? this.MALE_PROFILE_IMAGE
                    : this.FEMALE_PROFILE_IMAGE,
                createdAt: new Date()
            };
            await (0, firestore_1.setDoc)((0, firestore_1.doc)(firebase_config_1.db, this.usersCollection, uid), userData);
            return userData;
        }
        catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                throw new common_1.HttpException('Email already in use', common_1.HttpStatus.CONFLICT);
            }
            if (error.code === 'auth/invalid-email') {
                throw new common_1.HttpException('Invalid email format', common_1.HttpStatus.BAD_REQUEST);
            }
            if (error.code === 'auth/weak-password') {
                throw new common_1.HttpException('Password is too weak', common_1.HttpStatus.BAD_REQUEST);
            }
            throw new common_1.HttpException('Failed to register user', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async login(loginDto) {
        try {
            const userCredential = await (0, auth_1.signInWithEmailAndPassword)(firebase_config_1.auth, loginDto.email, loginDto.password);
            const accessToken = await userCredential.user.getIdToken();
            const refreshToken = this.generateRefreshToken();
            const refreshTokenExpiry = new Date();
            refreshTokenExpiry.setFullYear(refreshTokenExpiry.getFullYear() + 1);
            await (0, firestore_1.setDoc)((0, firestore_1.doc)(firebase_config_1.db, 'refreshTokens', refreshToken), {
                uid: userCredential.user.uid,
                email: userCredential.user.email,
                createdAt: firestore_1.Timestamp.fromDate(new Date()),
                expiresAt: firestore_1.Timestamp.fromDate(refreshTokenExpiry)
            });
            return {
                user: {
                    uid: userCredential.user.uid,
                    email: userCredential.user.email,
                },
                accessToken,
                refreshToken,
                refreshTokenExpiry: refreshTokenExpiry.toISOString()
            };
        }
        catch (error) {
            if (error.code === 'auth/user-not-found') {
                throw new common_1.HttpException('User not found', common_1.HttpStatus.NOT_FOUND);
            }
            if (error.code === 'auth/wrong-password') {
                throw new common_1.HttpException('Invalid password', common_1.HttpStatus.UNAUTHORIZED);
            }
            if (error.code === 'auth/invalid-email') {
                throw new common_1.HttpException('Invalid email format', common_1.HttpStatus.BAD_REQUEST);
            }
            if (error.code === 'auth/too-many-requests') {
                throw new common_1.HttpException('Too many failed login attempts. Please try again later.', common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
            throw new common_1.HttpException('Login failed', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    generateRefreshToken() {
        return crypto.randomBytes(64).toString('hex');
    }
    async refreshToken(refreshTokenDto) {
        try {
            const tokenQuery = (0, firestore_1.query)((0, firestore_1.collection)(firebase_config_1.db, 'refreshTokens'), (0, firestore_1.where)('__name__', '==', refreshTokenDto.refreshToken));
            const tokenSnapshot = await (0, firestore_1.getDocs)(tokenQuery);
            if (tokenSnapshot.empty) {
                throw new common_1.HttpException('Invalid refresh token', common_1.HttpStatus.UNAUTHORIZED);
            }
            const tokenDoc = tokenSnapshot.docs[0];
            const tokenData = tokenDoc.data();
            const expiresAt = tokenData.expiresAt.toDate();
            if (expiresAt < new Date()) {
                await (0, firestore_1.deleteDoc)((0, firestore_1.doc)(firebase_config_1.db, 'refreshTokens', tokenDoc.id));
                throw new common_1.HttpException('Refresh token expired', common_1.HttpStatus.UNAUTHORIZED);
            }
            const userRecord = await firebase_config_1.adminAuth.getUser(tokenData.uid);
            const customToken = await firebase_config_1.adminAuth.createCustomToken(userRecord.uid);
            const userCredential = await (0, auth_1.signInWithCustomToken)(firebase_config_1.auth, customToken);
            const accessToken = await userCredential.user.getIdToken();
            const newRefreshToken = this.generateRefreshToken();
            const refreshTokenExpiry = new Date();
            refreshTokenExpiry.setFullYear(refreshTokenExpiry.getFullYear() + 1);
            await (0, firestore_1.setDoc)((0, firestore_1.doc)(firebase_config_1.db, 'refreshTokens', newRefreshToken), {
                uid: userRecord.uid,
                email: userRecord.email,
                createdAt: firestore_1.Timestamp.fromDate(new Date()),
                expiresAt: firestore_1.Timestamp.fromDate(refreshTokenExpiry)
            });
            await (0, firestore_1.deleteDoc)((0, firestore_1.doc)(firebase_config_1.db, 'refreshTokens', tokenDoc.id));
            return {
                accessToken,
                refreshToken: newRefreshToken,
                refreshTokenExpiry: refreshTokenExpiry.toISOString()
            };
        }
        catch (error) {
            if (error instanceof common_1.HttpException)
                throw error;
            throw new common_1.HttpException('Failed to refresh token', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async findAll() {
        try {
            const querySnapshot = await (0, firestore_1.getDocs)((0, firestore_1.collection)(firebase_config_1.db, this.usersCollection));
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        }
        catch (error) {
            throw new common_1.HttpException('Failed to fetch users', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async findOne(id) {
        try {
            const docRef = (0, firestore_1.doc)(firebase_config_1.db, this.usersCollection, id);
            const docSnap = await (0, firestore_1.getDoc)(docRef);
            if (!docSnap.exists()) {
                throw new common_1.HttpException('User not found', common_1.HttpStatus.NOT_FOUND);
            }
            return {
                id: docSnap.id,
                ...docSnap.data()
            };
        }
        catch (error) {
            if (error instanceof common_1.HttpException)
                throw error;
            throw new common_1.HttpException('Failed to fetch user', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async update(id, user) {
        try {
            const docRef = (0, firestore_1.doc)(firebase_config_1.db, this.usersCollection, id);
            const docSnap = await (0, firestore_1.getDoc)(docRef);
            if (!docSnap.exists()) {
                throw new common_1.HttpException('User not found', common_1.HttpStatus.NOT_FOUND);
            }
            await (0, firestore_1.updateDoc)(docRef, user);
        }
        catch (error) {
            if (error instanceof common_1.HttpException)
                throw error;
            throw new common_1.HttpException('Failed to update user', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async remove(id) {
        try {
            const docRef = (0, firestore_1.doc)(firebase_config_1.db, this.usersCollection, id);
            const docSnap = await (0, firestore_1.getDoc)(docRef);
            if (!docSnap.exists()) {
                throw new common_1.HttpException('User not found', common_1.HttpStatus.NOT_FOUND);
            }
            await (0, firestore_1.deleteDoc)(docRef);
        }
        catch (error) {
            if (error instanceof common_1.HttpException)
                throw error;
            throw new common_1.HttpException('Failed to delete user', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getUserByToken(token) {
        try {
            const decodedToken = await firebase_config_1.adminAuth.verifyIdToken(token);
            const uid = decodedToken.uid;
            const userQuery = (0, firestore_1.query)((0, firestore_1.collection)(firebase_config_1.db, this.usersCollection), (0, firestore_1.where)('uid', '==', uid));
            const querySnapshot = await (0, firestore_1.getDocs)(userQuery);
            if (querySnapshot.empty) {
                try {
                    const userRecord = await firebase_config_1.adminAuth.getUser(uid);
                    const userData = {
                        uid: userRecord.uid,
                        email: userRecord.email || 'unknown@example.com',
                        fullName: userRecord.displayName || 'User',
                        gender: create_user_dto_1.Gender.MALE,
                        profileImage: this.MALE_PROFILE_IMAGE,
                        createdAt: new Date()
                    };
                    await (0, firestore_1.setDoc)((0, firestore_1.doc)(firebase_config_1.db, this.usersCollection, uid), userData);
                    return userData;
                }
                catch (authError) {
                    throw new common_1.HttpException('Invalid or expired token', common_1.HttpStatus.UNAUTHORIZED);
                }
            }
            const userDoc = querySnapshot.docs[0];
            return {
                id: userDoc.id,
                ...userDoc.data(),
                createdAt: userDoc.data().createdAt.toDate()
            };
        }
        catch (error) {
            if (error.code === 'auth/id-token-expired') {
                throw new common_1.HttpException('Token expired', common_1.HttpStatus.UNAUTHORIZED);
            }
            if (error instanceof common_1.HttpException)
                throw error;
            throw new common_1.HttpException('Failed to authenticate user', common_1.HttpStatus.UNAUTHORIZED);
        }
    }
    async updateProfile(accessToken, updateUserDto) {
        try {
            const user = await this.getUserByToken(accessToken);
            const uid = user.uid;
            const updateData = {
                ...updateUserDto
            };
            if (updateUserDto.gender) {
                updateData.profileImage = updateUserDto.gender === create_user_dto_1.Gender.MALE
                    ? this.MALE_PROFILE_IMAGE
                    : this.FEMALE_PROFILE_IMAGE;
            }
            await (0, firestore_1.updateDoc)((0, firestore_1.doc)(firebase_config_1.db, this.usersCollection, uid), updateData);
            return {
                ...user,
                ...updateData
            };
        }
        catch (error) {
            if (error instanceof common_1.HttpException)
                throw error;
            throw new common_1.HttpException('Failed to update profile', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async chat(accessToken, chatMessageDto) {
        try {
            console.log("Processing chat for token:", accessToken ? "token-provided" : "no-token");
            const user = await this.getUserByToken(accessToken);
            const uid = user.uid;
            let chatId;
            const chatHistoryRef = (0, firestore_1.collection)(firebase_config_1.db, this.usersCollection, uid, 'chat-history');
            if (chatMessageDto.isNewChat) {
                const words = chatMessageDto.message.split(/\s+/);
                const first100Words = words.slice(0, 100).join(' ');
                const sanitizedName = first100Words
                    .replace(/[^a-zA-Z0-9_]/g, '_')
                    .substring(0, 50);
                chatId = sanitizedName ? `${sanitizedName}_${Date.now()}` : `chat_${Date.now()}`;
                await (0, firestore_1.setDoc)((0, firestore_1.doc)(chatHistoryRef, chatId), {
                    title: first100Words.substring(0, 50),
                    createdAt: firestore_1.Timestamp.fromDate(new Date()),
                    updatedAt: firestore_1.Timestamp.fromDate(new Date())
                });
            }
            else {
                chatId = chatMessageDto.chatId || '';
                if (!chatId) {
                    const chatsSnapshot = await (0, firestore_1.getDocs)(chatHistoryRef);
                    const chats = chatsSnapshot.docs;
                    if (chats.length === 0) {
                        chatId = `chat_${Date.now()}`;
                        await (0, firestore_1.setDoc)((0, firestore_1.doc)(chatHistoryRef, chatId), {
                            title: chatMessageDto.message.substring(0, 50),
                            createdAt: firestore_1.Timestamp.fromDate(new Date()),
                            updatedAt: firestore_1.Timestamp.fromDate(new Date())
                        });
                    }
                    else {
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
                await (0, firestore_1.updateDoc)((0, firestore_1.doc)(chatHistoryRef, chatId), {
                    updatedAt: firestore_1.Timestamp.fromDate(new Date())
                });
            }
            const messagesRef = (0, firestore_1.collection)(chatHistoryRef, chatId, 'messages');
            const userMessage = {
                role: 'user',
                content: chatMessageDto.message,
                timestamp: new Date()
            };
            await (0, firestore_1.addDoc)(messagesRef, {
                ...userMessage,
                timestamp: firestore_1.Timestamp.fromDate(userMessage.timestamp)
            });
            const model = gemini_config_1.geminiAI.getGenerativeModel({ model: "gemini-1.5-pro" });
            const systemPrompt = await (0, gemini_config_1.getSystemPromptFromFirebase)();
            const exampleConversations = await (0, gemini_config_1.getExampleConversationsFromFirebase)();
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
            const assistantChatMessage = {
                role: 'assistant',
                content: assistantMessage,
                timestamp: new Date()
            };
            await (0, firestore_1.addDoc)(messagesRef, {
                ...assistantChatMessage,
                timestamp: firestore_1.Timestamp.fromDate(assistantChatMessage.timestamp)
            });
            const chatSnapshot = await (0, firestore_1.getDocs)((0, firestore_1.query)(messagesRef));
            const messages = chatSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    timestamp: data.timestamp.toDate()
                };
            }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            return {
                messages: messages,
                chatId: chatId
            };
        }
        catch (error) {
            console.error('Chat error:', error);
            throw new common_1.HttpException('Failed to process chat message', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getChatHistory(accessToken, chatId) {
        try {
            console.log("Getting chat history with token:", accessToken ? "token-provided" : "no-token");
            const user = await this.getUserByToken(accessToken);
            const uid = user.uid;
            const chatDocRef = (0, firestore_1.doc)(firebase_config_1.db, this.usersCollection, uid, 'chat-history', chatId);
            const chatDoc = await (0, firestore_1.getDoc)(chatDocRef);
            if (!chatDoc.exists()) {
                console.log("Chat not found:", chatId);
                throw new common_1.HttpException('Chat not found', common_1.HttpStatus.NOT_FOUND);
            }
            const messagesRef = (0, firestore_1.collection)(firebase_config_1.db, this.usersCollection, uid, 'chat-history', chatId, 'messages');
            const chatSnapshot = await (0, firestore_1.getDocs)((0, firestore_1.query)(messagesRef));
            return chatSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    timestamp: data.timestamp.toDate()
                };
            }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        }
        catch (error) {
            console.error('Error getting chat history:', error);
            throw new common_1.HttpException('Failed to get chat history', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getChatConversations(accessToken) {
        try {
            console.log("Getting chat conversations with token:", accessToken ? "token-provided" : "no-token");
            const user = await this.getUserByToken(accessToken);
            const uid = user.uid;
            const chatHistoryRef = (0, firestore_1.collection)(firebase_config_1.db, this.usersCollection, uid, 'chat-history');
            const chatsSnapshot = await (0, firestore_1.getDocs)(chatHistoryRef);
            if (chatsSnapshot.empty) {
                console.log("No chat conversations found for user:", uid);
                return [];
            }
            const conversations = await Promise.all(chatsSnapshot.docs.map(async (chatDoc) => {
                const chatId = chatDoc.id;
                const chatData = chatDoc.data();
                const messagesRef = (0, firestore_1.collection)(firebase_config_1.db, this.usersCollection, uid, 'chat-history', chatId, 'messages');
                const messagesSnapshot = await (0, firestore_1.getDocs)(messagesRef);
                return {
                    id: chatId,
                    ...chatData,
                    createdAt: chatData.createdAt?.toDate?.() || chatData.createdAt,
                    updatedAt: chatData.updatedAt?.toDate?.() || chatData.updatedAt,
                    messageCount: messagesSnapshot.size
                };
            }));
            return conversations.sort((a, b) => {
                const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date(0);
                const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date(0);
                return dateB.getTime() - dateA.getTime();
            });
        }
        catch (error) {
            console.error('Error getting chat conversations:', error);
            throw new common_1.HttpException('Failed to get chat conversations', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getAllChatHistory(accessToken) {
        try {
            const conversations = await this.getChatConversations(accessToken);
            const user = await this.getUserByToken(accessToken);
            const uid = user.uid;
            const allMessages = [];
            await Promise.all(conversations.map(async (conversation) => {
                const chatId = conversation.id;
                const messagesRef = (0, firestore_1.collection)(firebase_config_1.db, this.usersCollection, uid, 'chat-history', chatId, 'messages');
                const messagesSnapshot = await (0, firestore_1.getDocs)(messagesRef);
                const messages = messagesSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        ...data,
                        timestamp: data.timestamp.toDate(),
                        chatId: chatId,
                        conversationTitle: conversation.title || 'Untitled Chat'
                    };
                });
                allMessages.push(...messages);
            }));
            allMessages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            return {
                conversations,
                messages: allMessages
            };
        }
        catch (error) {
            console.error('Error getting all chat history:', error);
            throw new common_1.HttpException('Failed to get chat history', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getDailyVerse(accessToken, date) {
        try {
            await this.getUserByToken(accessToken);
            const geminiPrompt = `Today is ${date}. Does today have any special significance according to the Christian religion? If yes, then give me a Bible verse according to the day. If not, then which Bible verse would be good for today? Return only the verse text and its reference in the following JSON format: {"verse": "The full verse text", "reference": "Book Chapter:Verse", "occasion": "The name of the special day or 'regular day' if none"}. Do not include any explanations or additional text.`;
            const model = gemini_config_1.geminiAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
            const result = await model.generateContent(geminiPrompt);
            const response = result.response.text();
            try {
                let cleanedResponse = response;
                if (response.includes('```')) {
                    const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                    if (codeBlockMatch && codeBlockMatch[1]) {
                        cleanedResponse = codeBlockMatch[1];
                    }
                }
                const parsedResponse = JSON.parse(cleanedResponse);
                return {
                    verse: parsedResponse.verse,
                    reference: parsedResponse.reference,
                    occasion: parsedResponse.occasion || "regular day"
                };
            }
            catch (parseError) {
                console.error('Error parsing Gemini response as JSON:', parseError);
                const verseMatch = response.match(/"verse":\s*"([^"]+)"/);
                const referenceMatch = response.match(/"reference":\s*"([^"]+)"/);
                const occasionMatch = response.match(/"occasion":\s*"([^"]+)"/);
                return {
                    verse: verseMatch ? verseMatch[1] : "The Lord is my shepherd; I shall not want.",
                    reference: referenceMatch ? referenceMatch[1] : "Psalm 23:1",
                    occasion: occasionMatch ? occasionMatch[1] : "regular day"
                };
            }
        }
        catch (error) {
            console.error('Error in getDailyVerse:', error);
            throw new common_1.HttpException('Failed to retrieve daily verse', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)()
], UsersService);
//# sourceMappingURL=users.service.js.map