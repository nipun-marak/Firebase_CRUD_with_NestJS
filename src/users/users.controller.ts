import { Controller, Get, Post, Body, Param, Put, Delete, HttpStatus, UseGuards, Patch } from '@nestjs/common';
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
    @Body() updateUserDto: UpdateUserDto
  ): Promise<ApiResponse<User>> {
    const updatedUser = await this.usersService.updateProfile(user.uid, updateUserDto);
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
  async checkAuth(@CurrentUser() user: DecodedIdToken): Promise<ApiResponse<User>> {
    const userProfile = await this.usersService.findByUid(user.uid);
    return {
      statusCode: HttpStatus.OK,
      message: 'User profile retrieved successfully',
      data: userProfile
    };
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

  @Get()
  async findAll(): Promise<ApiResponse<User[]>> {
    const users = await this.usersService.findAll();
    return {
      statusCode: HttpStatus.OK,
      message: 'Users retrieved successfully',
      data: users
    };
  }

  @Get(':id')
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
      data: tokens
    };
  }

  @Post('chat')
  @UseGuards(AuthGuard)
  async chat(
    @CurrentUser() user: DecodedIdToken,
    @Body() chatMessageDto: ChatMessageDto
  ): Promise<ApiResponse<ChatMessage[]>> {
    const chatHistory = await this.usersService.chat(user.uid, chatMessageDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Chat message processed successfully',
      data: chatHistory
    };
  }

  @Get('chat-history')
  @UseGuards(AuthGuard)
  async getChatHistory(
    @CurrentUser() user: DecodedIdToken
  ): Promise<ApiResponse<ChatMessage[]>> {
    const chatHistory = await this.usersService.getChatHistory(user.uid);
    return {
      statusCode: HttpStatus.OK,
      message: 'Chat history retrieved successfully',
      data: chatHistory
    };
  }
} 