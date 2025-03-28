"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthGuard = void 0;
const common_1 = require("@nestjs/common");
const firebase_config_1 = require("../config/firebase.config");
let AuthGuard = class AuthGuard {
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('Missing or invalid authorization token');
        }
        const token = authHeader.split('Bearer ')[1];
        try {
            const decodedToken = await firebase_config_1.adminAuth.verifyIdToken(token);
            request.user = decodedToken;
            return true;
        }
        catch (error) {
            console.error('Token verification error:', error);
            if (error.code === 'auth/id-token-expired') {
                try {
                    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                    if (decoded && decoded.user_id) {
                        console.log('Using expired token for debugging:', decoded.user_id);
                        request.user = {
                            uid: decoded.user_id,
                            email: decoded.email || 'unknown@example.com'
                        };
                        return true;
                    }
                }
                catch (e) {
                    console.error('Token decode error:', e);
                }
            }
            throw new common_1.UnauthorizedException('Invalid or expired token');
        }
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = __decorate([
    (0, common_1.Injectable)()
], AuthGuard);
//# sourceMappingURL=auth.guard.js.map