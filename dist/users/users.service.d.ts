import { CreateUserDto, Gender } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChatMessageDto } from './dto/chat-message.dto';
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
export declare class UsersService {
    private readonly usersCollection;
    private readonly MALE_PROFILE_IMAGE;
    private readonly FEMALE_PROFILE_IMAGE;
    resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void>;
    register(createUserDto: CreateUserDto): Promise<User>;
    login(loginDto: LoginDto): Promise<LoginResponse>;
    private generateRefreshToken;
    refreshToken(refreshTokenDto: RefreshTokenDto): Promise<TokenResponse>;
    findAll(): Promise<User[]>;
    findOne(id: string): Promise<User>;
    update(id: string, user: Partial<User>): Promise<void>;
    remove(id: string): Promise<void>;
    getUserByToken(token: string): Promise<User>;
    updateProfile(accessToken: string, updateUserDto: UpdateUserDto): Promise<User>;
    chat(accessToken: string, chatMessageDto: ChatMessageDto): Promise<{
        messages: ChatMessage[];
        chatId: string;
    }>;
    getChatHistory(accessToken: string, chatId: string): Promise<ChatMessage[]>;
    getChatConversations(accessToken: string): Promise<any[]>;
    getAllChatHistory(accessToken: string): Promise<{
        conversations: any[];
        messages: ChatMessage[];
    }>;
    getDailyVerse(accessToken: string, date: string): Promise<{
        verse: string;
        reference: string;
        occasion: string;
    }>;
}
