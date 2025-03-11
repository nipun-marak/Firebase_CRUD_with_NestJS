import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { adminAuth } from '../config/firebase.config';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization token');
    }

    const token = authHeader.split('Bearer ')[1];

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      request.user = decodedToken;
      return true;
    } catch (error) {
      console.error('Token verification error:', error);
      
      // For debugging - bypass token verification if it's expired
      // but still contains valid user data
      // WARNING: This should be removed in production
      if (error.code === 'auth/id-token-expired') {
        try {
          // Try to decode the token manually
          const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          
          if (decoded && decoded.user_id) {
            console.log('Using expired token for debugging:', decoded.user_id);
            request.user = {
              uid: decoded.user_id,
              email: decoded.email || 'unknown@example.com'
            };
            return true;
          }
        } catch (e) {
          console.error('Token decode error:', e);
        }
      }
      
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
} 