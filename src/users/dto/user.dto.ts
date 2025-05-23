import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from "class-validator";

export class UserDto {
  @ApiProperty({
    description: "The unique identifier of the user.",
    example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: "The email address of the user.",
    example: "user@example.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({
    description:
      "The first name of the user. This will be stored in user_data.",
    example: "John",
  })
  @IsString()
  @IsOptional()
  firstName?: string; // Este campo es para DTO, no directo del modelo User de Prisma

  @ApiPropertyOptional({
    description: "The last name of the user. This will be stored in user_data.",
    example: "Doe",
  })
  @IsString()
  @IsOptional()
  lastName?: string; // Este campo es para DTO, no directo del modelo User de Prisma

  @ApiPropertyOptional({
    description:
      "The password of the user. Will not be returned in responses by default.",
    example: "Str0ngP@ssw0rd",
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @IsOptional() // Make it optional in the general DTO
  password?: string;

  @ApiPropertyOptional({
    description: "Nombre de usuario (campo user_name en Prisma).",
    example: "johndoe",
  })
  @IsString()
  @IsOptional()
  user_name?: string;

  @ApiPropertyOptional({
    description:
      "Datos adicionales del usuario en formato JSON (campo user_data en Prisma).",
    example: { preferences: {}, profileComplete: false },
    type: "object",
    additionalProperties: true, // Added this line
  })
  @IsOptional()
  user_data?: Record<string, any>; // Prisma espera JsonValue, que puede ser Record<string, any>

  // Consider adding other relevant fields like roles, createdAt, updatedAt
  // For example:
  // @ApiPropertyOptional({ description: 'User roles', example: ['user', 'admin'], type: [String] })
  // @IsArray()
  // @IsString({ each: true })
  // @IsOptional()
  // roles?: string[];

  // @ApiPropertyOptional({ description: 'Timestamp of user creation' })
  // @IsDateString()
  // @IsOptional()
  // createdAt?: Date;

  // @ApiPropertyOptional({ description: 'Timestamp of last user update' })
  // @IsDateString()
  // @IsOptional()
  // updatedAt?: Date;
}

export enum UserRole {
  ADMIN = "ADMIN",
  USER = "USER",
}
