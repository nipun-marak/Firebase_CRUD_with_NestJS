export declare enum Gender {
    MALE = "male",
    FEMALE = "female"
}
export declare class CreateUserDto {
    email: string;
    password: string;
    fullName: string;
    gender: Gender;
}
