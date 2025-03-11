import { Controller, Get, Post, Body, Param, Put, Delete, HttpStatus, UseGuards, Patch, HttpException, Headers } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, LoginResponse, TokenResponse, ChatMessage } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChatMessageDto } from './dto/chat-message.dto';
import { ApiResponse } from '../interfaces/api-response.interface';
import { AuthGuard } from '../guards/auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { DecodedIdToken } from 'firebase-admin/auth';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('update-profile')
  @UseGuards(AuthGuard)
  async updateProfile(
    @CurrentUser() user: DecodedIdToken,
    @Body() updateUserDto: UpdateUserDto,
    @Headers('authorization') authorization: string
  ): Promise<ApiResponse<User>> {
    const token = authorization?.split('Bearer ')[1];
    if (!token) {
      throw new HttpException('Missing authorization token', HttpStatus.UNAUTHORIZED);
    }
    
    const updatedUser = await this.usersService.updateProfile(token, updateUserDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'User profile updated successfully',
      data: updatedUser
    };
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<ApiResponse<void>> {
    await this.usersService.resetPassword(resetPasswordDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Password reset email sent successfully',
      data: null
    };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async checkAuth(
    @CurrentUser() user: DecodedIdToken,
    @Headers('authorization') authorization: string
  ): Promise<ApiResponse<User>> {
    try {
      console.log("checkAuth for user:", user.uid);
      const token = authorization?.split('Bearer ')[1];
      if (!token) {
        throw new HttpException('Missing authorization token', HttpStatus.UNAUTHORIZED);
      }
      
      const userProfile = await this.usersService.getUserByToken(token);
      return {
        statusCode: HttpStatus.OK,
        message: 'User profile retrieved successfully',
        data: userProfile
      };
    } catch (error) {
      console.error("Error in checkAuth:", error);
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to get user profile', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<ApiResponse<LoginResponse>> {
    const loginData = await this.usersService.login(loginDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Login successful',
      data: loginData
    };
  }

  @Get('all')
  async findAll(): Promise<ApiResponse<User[]>> {
    const users = await this.usersService.findAll();
    return {
      statusCode: HttpStatus.OK,
      message: 'Users retrieved successfully',
      data: users
    };
  }

  @Get('one/:id')
  async findOne(@Param('id') id: string): Promise<ApiResponse<User>> {
    const user = await this.usersService.findOne(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'User retrieved successfully',
      data: user
    };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() user: Partial<User>): Promise<ApiResponse<void>> {
    await this.usersService.update(id, user);
    return {
      statusCode: HttpStatus.OK,
      message: 'User updated successfully',
      data: null
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<ApiResponse<void>> {
    await this.usersService.remove(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'User deleted successfully',
      data: null
    };
  }

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto): Promise<ApiResponse<User>> {
    const user = await this.usersService.register(createUserDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'User registered successfully',
      data: user
    };
  }

  @Post('refresh-token')
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto): Promise<ApiResponse<TokenResponse>> {
    const tokens = await this.usersService.refreshToken(refreshTokenDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Tokens refreshed successfully',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        refreshTokenExpiry: tokens.refreshTokenExpiry.toString()
      }
    };
  }

  @Post('chat')
  @UseGuards(AuthGuard)
  async chat(
    @CurrentUser() user: DecodedIdToken,
    @Body() chatMessageDto: ChatMessageDto,
    @Headers('authorization') authorization: string
  ): Promise<ApiResponse<{ messages: ChatMessage[], chatId: string }>> {
    const token = authorization?.split('Bearer ')[1];
    if (!token) {
      throw new HttpException('Missing authorization token', HttpStatus.UNAUTHORIZED);
    }
    
    const chatResult = await this.usersService.chat(token, chatMessageDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Chat message processed successfully',
      data: chatResult
    };
  }

  @Get('chat-history/:chatId')
  @UseGuards(AuthGuard)
  async getChatHistory(
    @CurrentUser() user: DecodedIdToken,
    @Param('chatId') chatId: string,
    @Headers('authorization') authorization: string
  ): Promise<ApiResponse<ChatMessage[]>> {
    const token = authorization?.split('Bearer ')[1];
    if (!token) {
      throw new HttpException('Missing authorization token', HttpStatus.UNAUTHORIZED);
    }
    
    const chatHistory = await this.usersService.getChatHistory(token, chatId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Chat history retrieved successfully',
      data: chatHistory
    };
  }
  
  @Get('chat-conversations')
  @UseGuards(AuthGuard)
  async getChatConversations(
    @CurrentUser() user: DecodedIdToken,
    @Headers('authorization') authorization: string
  ): Promise<ApiResponse<any[]>> {
    const token = authorization?.split('Bearer ')[1];
    if (!token) {
      throw new HttpException('Missing authorization token', HttpStatus.UNAUTHORIZED);
    }
    
    const conversations = await this.usersService.getChatConversations(token);
    return {
      statusCode: HttpStatus.OK,
      message: 'Chat conversations retrieved successfully',
      data: conversations
    };
  }

  @Get('chat-history')
  @UseGuards(AuthGuard)
  async getAllChatHistory(
    @CurrentUser() user: DecodedIdToken,
    @Headers('authorization') authorization: string
  ): Promise<ApiResponse<{ conversations: any[], messages: ChatMessage[] }>> {
    try {
      const token = authorization?.split('Bearer ')[1];
      if (!token) {
        throw new HttpException('Missing authorization token', HttpStatus.UNAUTHORIZED);
      }
      
      const allChatHistory = await this.usersService.getAllChatHistory(token);
      return {
        statusCode: HttpStatus.OK,
        message: 'All chat history retrieved successfully',
        data: allChatHistory
      };
    } catch (error) {
      console.error('Error in getAllChatHistory:', error);
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to get all chat history', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 