export enum Gender {
  MALE = 'male',
  FEMALE = 'female'
}

export class CreateUserDto {
  email: string;
  password: string;
  fullName: string;
  gender: Gender;
} 