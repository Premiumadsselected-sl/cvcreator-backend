import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
} from "class-validator";

export class RegisterUserDto {
  @ApiProperty({
    description:
      "Dirección de correo electrónico del usuario. Debe tener un formato de correo electrónico válido.",
    example: "test@example.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "Contraseña del usuario. Mínimo 8 caracteres.",
    example: "P@sswOrd123",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    description: "Nombre del usuario.",
    example: "John",
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    description: "Apellido del usuario.",
    example: "Doe",
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    description: "Nombre de usuario (puede ser autogenerado o provisto).",
    example: "johndoe",
  })
  @IsString()
  @IsOptional()
  username?: string; // Mantenemos username por si se quiere pasar explícitamente

  @ApiPropertyOptional({
    description:
      "Configuración regional preferida del usuario (ej. 'en', 'es'). Por defecto es 'es'.",
    example: "en",
  })
  @IsString()
  @IsOptional()
  locale?: string;
}
