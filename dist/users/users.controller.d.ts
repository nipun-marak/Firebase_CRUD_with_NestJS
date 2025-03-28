import { UsersService } from './users.service';
import { User, LoginResponse, TokenResponse, ChatMessage } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChatMessageDto } from './dto/chat-message.dto';
import { ApiResponse } from '../interfaces/api-response.interface';
import { DecodedIdToken } from 'firebase-admin/auth';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    updateProfile(user: DecodedIdToken, updateUserDto: UpdateUserDto, authorization: string): Promise<ApiResponse<User>>;
    resetPassword(resetPasswordDto: ResetPasswordDto): Promise<ApiResponse<void>>;
    checkAuth(user: DecodedIdToken, authorization: string): Promise<ApiResponse<User>>;
    login(loginDto: LoginDto): Promise<ApiResponse<LoginResponse>>;
    findAll(): Promise<ApiResponse<User[]>>;
    findOne(id: string): Promise<ApiResponse<User>>;
    update(id: string, user: Partial<User>): Promise<ApiResponse<void>>;
    remove(id: string): Promise<ApiResponse<void>>;
    register(createUserDto: CreateUserDto): Promise<ApiResponse<User>>;
    refreshToken(refreshTokenDto: RefreshTokenDto): Promise<ApiResponse<TokenResponse>>;
    chat(user: DecodedIdToken, chatMessageDto: ChatMessageDto, authorization: string): Promise<ApiResponse<{
        messages: ChatMessage[];
        chatId: string;
    }>>;
    getChatHistory(user: DecodedIdToken, chatId: string, authorization: string): Promise<ApiResponse<ChatMessage[]>>;
    getChatConversations(user: DecodedIdToken, authorization: string): Promise<ApiResponse<any[]>>;
    getAllChatHistory(user: DecodedIdToken, authorization: string): Promise<ApiResponse<{
        conversations: any[];
        messages: ChatMessage[];
    }>>;
    getDailyVerse(user: DecodedIdToken, authorization: string, date: string): Promise<ApiResponse<{
        verse: string;
        reference: string;
        occasion: string;
    }>>;
}
