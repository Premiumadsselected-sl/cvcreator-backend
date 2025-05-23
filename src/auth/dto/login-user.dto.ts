import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class LoginUserDto {
  @ApiProperty({
    description: "Dirección de correo electrónico del usuario.",
    example: "test@example.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "Contraseña del usuario.",
    example: "P@sswOrd123",
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
