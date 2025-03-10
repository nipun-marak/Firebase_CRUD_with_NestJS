"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const create_user_dto_1 = require("./dto/create-user.dto");
const login_dto_1 = require("./dto/login.dto");
const reset_password_dto_1 = require("./dto/reset-password.dto");
const update_user_dto_1 = require("./dto/update-user.dto");
const refresh_token_dto_1 = require("./dto/refresh-token.dto");
const chat_message_dto_1 = require("./dto/chat-message.dto");
const auth_guard_1 = require("../guards/auth.guard");
const current_user_decorator_1 = require("../decorators/current-user.decorator");
let UsersController = class UsersController {
    usersService;
    constructor(usersService) {
        this.usersService = usersService;
    }
    async updateProfile(user, updateUserDto) {
        const updatedUser = await this.usersService.updateProfile(user.uid, updateUserDto);
        return {
            statusCode: common_1.HttpStatus.OK,
            message: 'User profile updated successfully',
            data: updatedUser
        };
    }
    async resetPassword(resetPasswordDto) {
        await this.usersService.resetPassword(resetPasswordDto);
        return {
            statusCode: common_1.HttpStatus.OK,
            message: 'Password reset email sent successfully',
            data: null
        };
    }
    async checkAuth(user) {
        const userProfile = await this.usersService.findByUid(user.uid);
        return {
            statusCode: common_1.HttpStatus.OK,
            message: 'User profile retrieved successfully',
            data: userProfile
        };
    }
    async login(loginDto) {
        const loginData = await this.usersService.login(loginDto);
        return {
            statusCode: common_1.HttpStatus.OK,
            message: 'Login successful',
            data: loginData
        };
    }
    async findAll() {
        const users = await this.usersService.findAll();
        return {
            statusCode: common_1.HttpStatus.OK,
            message: 'Users retrieved successfully',
            data: users
        };
    }
    async findOne(id) {
        const user = await this.usersService.findOne(id);
        return {
            statusCode: common_1.HttpStatus.OK,
            message: 'User retrieved successfully',
            data: user
        };
    }
    async update(id, user) {
        await this.usersService.update(id, user);
        return {
            statusCode: common_1.HttpStatus.OK,
            message: 'User updated successfully',
            data: null
        };
    }
    async remove(id) {
        await this.usersService.remove(id);
        return {
            statusCode: common_1.HttpStatus.OK,
            message: 'User deleted successfully',
            data: null
        };
    }
    async register(createUserDto) {
        const user = await this.usersService.register(createUserDto);
        return {
            statusCode: common_1.HttpStatus.CREATED,
            message: 'User registered successfully',
            data: user
        };
    }
    async refreshToken(refreshTokenDto) {
        const tokens = await this.usersService.refreshToken(refreshTokenDto);
        return {
            statusCode: common_1.HttpStatus.OK,
            message: 'Tokens refreshed successfully',
            data: tokens
        };
    }
    async chat(user, chatMessageDto) {
        const chatHistory = await this.usersService.chat(user.uid, chatMessageDto);
        return {
            statusCode: common_1.HttpStatus.OK,
            message: 'Chat message processed successfully',
            data: chatHistory
        };
    }
    async getChatHistory(user) {
        const chatHistory = await this.usersService.getChatHistory(user.uid);
        return {
            statusCode: common_1.HttpStatus.OK,
            message: 'Chat history retrieved successfully',
            data: chatHistory
        };
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Patch)('update-profile'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_user_dto_1.UpdateUserDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reset_password_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "checkAuth", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "login", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_user_dto_1.CreateUserDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('refresh-token'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refresh_token_dto_1.RefreshTokenDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "refreshToken", null);
__decorate([
    (0, common_1.Post)('chat'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, chat_message_dto_1.ChatMessageDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "chat", null);
__decorate([
    (0, common_1.Get)('chat-history'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getChatHistory", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map