import { Gender } from './create-user.dto';

export class UpdateUserDto {
  fullName?: string;
  gender?: Gender;
  // Note: email and password updates should be handled separately for security
} 