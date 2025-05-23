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
    description: "The first name of the user.",
    example: "John",
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    description: "The last name of the user.",
    example: "Doe",
  })
  @IsString()
  @IsOptional()
  lastName?: string;

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
