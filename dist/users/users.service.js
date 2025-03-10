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
const firebase_config_2 = require("../config/firebase.config");
const gemini_config_1 = require("../config/gemini.config");
const create_user_dto_1 = require("./dto/create-user.dto");
const dotenv = require("dotenv");
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
    async refreshToken(refreshTokenDto) {
        try {
            const decodedToken = await firebase_config_2.adminAuth.verifyIdToken(refreshTokenDto.refreshToken);
            const customToken = await firebase_config_2.adminAuth.createCustomToken(decodedToken.uid);
            const userCredential = await (0, auth_1.signInWithCustomToken)(firebase_config_1.auth, customToken);
            const accessToken = await userCredential.user.getIdToken();
            const refreshToken = await userCredential.user.getIdToken(true);
            return {
                accessToken,
                refreshToken
            };
        }
        catch (error) {
            if (error.code === 'auth/id-token-expired') {
                throw new common_1.HttpException('Refresh token expired', common_1.HttpStatus.UNAUTHORIZED);
            }
            throw new common_1.HttpException('Failed to refresh token', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async login(loginDto) {
        try {
            const userCredential = await (0, auth_1.signInWithEmailAndPassword)(firebase_config_1.auth, loginDto.email, loginDto.password);
            const accessToken = await userCredential.user.getIdToken();
            const refreshToken = await userCredential.user.getIdToken(true);
            return {
                user: {
                    uid: userCredential.user.uid,
                    email: userCredential.user.email,
                },
                accessToken,
                refreshToken
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
    async findByUid(uid) {
        try {
            const docRef = (0, firestore_1.doc)(firebase_config_1.db, this.usersCollection, uid);
            const docSnap = await (0, firestore_1.getDoc)(docRef);
            if (!docSnap.exists()) {
                throw new common_1.HttpException('User not found', common_1.HttpStatus.NOT_FOUND);
            }
            const data = docSnap.data();
            return {
                ...data,
                id: docSnap.id,
                createdAt: data.createdAt.toDate()
            };
        }
        catch (error) {
            if (error instanceof common_1.HttpException)
                throw error;
            throw new common_1.HttpException('Failed to fetch user profile', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async updateProfile(uid, updateUserDto) {
        try {
            const docRef = (0, firestore_1.doc)(firebase_config_1.db, this.usersCollection, uid);
            const docSnap = await (0, firestore_1.getDoc)(docRef);
            if (!docSnap.exists()) {
                throw new common_1.HttpException('User not found', common_1.HttpStatus.NOT_FOUND);
            }
            const updates = { ...updateUserDto };
            if (updateUserDto.gender) {
                updates.profileImage = updateUserDto.gender === create_user_dto_1.Gender.MALE
                    ? this.MALE_PROFILE_IMAGE
                    : this.FEMALE_PROFILE_IMAGE;
            }
            await (0, firestore_1.updateDoc)(docRef, updates);
            const updatedDocSnap = await (0, firestore_1.getDoc)(docRef);
            if (!updatedDocSnap.exists()) {
                throw new common_1.HttpException('Failed to fetch updated user data', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
            const data = updatedDocSnap.data();
            return {
                ...data,
                id: updatedDocSnap.id,
                createdAt: data.createdAt.toDate()
            };
        }
        catch (error) {
            if (error instanceof common_1.HttpException)
                throw error;
            throw new common_1.HttpException('Failed to update user profile', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async chat(uid, chatMessageDto) {
        try {
            const chatHistoryRef = (0, firestore_1.collection)(firebase_config_1.db, this.usersCollection, uid, 'chat-history');
            const userMessage = {
                role: 'user',
                content: chatMessageDto.message,
                timestamp: new Date()
            };
            await (0, firestore_1.addDoc)(chatHistoryRef, {
                ...userMessage,
                timestamp: firestore_1.Timestamp.fromDate(userMessage.timestamp)
            });
            const model = gemini_config_1.geminiAI.getGenerativeModel({ model: "gemini-2.0-pro-exp-02-05" });
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
            await (0, firestore_1.addDoc)(chatHistoryRef, {
                ...assistantChatMessage,
                timestamp: firestore_1.Timestamp.fromDate(assistantChatMessage.timestamp)
            });
            const chatSnapshot = await (0, firestore_1.getDocs)((0, firestore_1.query)(chatHistoryRef));
            return chatSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    timestamp: data.timestamp.toDate()
                };
            }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        }
        catch (error) {
            throw new common_1.HttpException('Failed to process chat message', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getChatHistory(uid) {
        try {
            const chatHistoryRef = (0, firestore_1.collection)(firebase_config_1.db, this.usersCollection, uid, 'chat-history');
            const chatSnapshot = await (0, firestore_1.getDocs)((0, firestore_1.query)(chatHistoryRef));
            return chatSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    timestamp: data.timestamp.toDate()
                };
            }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        }
        catch (error) {
            throw new common_1.HttpException('Failed to fetch chat history', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)()
], UsersService);
//# sourceMappingURL=users.service.js.map