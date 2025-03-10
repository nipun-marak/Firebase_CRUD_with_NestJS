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
export declare class UsersService {
    private readonly usersCollection;
    private readonly MALE_PROFILE_IMAGE;
    private readonly FEMALE_PROFILE_IMAGE;
    resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void>;
    register(createUserDto: CreateUserDto): Promise<User>;
    refreshToken(refreshTokenDto: RefreshTokenDto): Promise<TokenResponse>;
    login(loginDto: LoginDto): Promise<LoginResponse>;
    findAll(): Promise<User[]>;
    findOne(id: string): Promise<User>;
    update(id: string, user: Partial<User>): Promise<void>;
    remove(id: string): Promise<void>;
    findByUid(uid: string): Promise<User>;
    updateProfile(uid: string, updateUserDto: UpdateUserDto): Promise<User>;
    chat(uid: string, chatMessageDto: ChatMessageDto): Promise<ChatMessage[]>;
    getChatHistory(uid: string): Promise<ChatMessage[]>;
}
