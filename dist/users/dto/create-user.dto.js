"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateUserDto = exports.Gender = void 0;
var Gender;
(function (Gender) {
    Gender["MALE"] = "male";
    Gender["FEMALE"] = "female";
})(Gender || (exports.Gender = Gender = {}));
class CreateUserDto {
    email;
    password;
    fullName;
    gender;
}
exports.CreateUserDto = CreateUserDto;
//# sourceMappingURL=create-user.dto.js.map