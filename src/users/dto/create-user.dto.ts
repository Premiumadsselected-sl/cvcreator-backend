import { OmitType, ApiProperty } from "@nestjs/swagger";
import { UserDto } from "./user.dto";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class CreateUserDto extends OmitType(UserDto, ["id"] as const) {
  @ApiProperty({
    description: "La contraseña para el usuario.",
    example: "Str0ngP@ssw0rd",
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
