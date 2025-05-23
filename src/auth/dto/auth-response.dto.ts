import { ApiProperty } from "@nestjs/swagger";
import { UserDto } from "../../users/dto/user.dto";
import { IsNotEmpty, IsString } from "class-validator";

export class AuthResponseDto {
  @ApiProperty({
    description: "Token de Acceso JWT",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiProperty({
    description: "Detalles del usuario autenticado",
    type: () => UserDto,
  })
  user: UserDto;
}
