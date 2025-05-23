import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsDateString,
  IsUUID,
  IsObject,
  IsEnum,
} from "class-validator";
import { ImageType } from "../../../types/ImageType"; // Updated import

export class ImageDto {
  @ApiProperty({
    description: "Image unique identifier",
    example: "img_a0eebc99",
  })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: "User ID associated with the image",
    example: "user-123",
  })
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @ApiPropertyOptional({
    description: "Type of the image",
    enum: ImageType, // Uses the imported ImageType
    example: ImageType.PROFILE,
  })
  @IsEnum(ImageType)
  @IsOptional()
  type?: ImageType;

  @ApiProperty({
    description: "Name of the image file",
    example: "profile_picture.jpg",
  })
  @IsString()
  @IsNotEmpty()
  image_name: string;

  @ApiProperty({
    description: "MIME type of the image",
    example: "image/jpeg",
  })
  @IsString()
  @IsNotEmpty()
  image_type: string;

  @ApiPropertyOptional({
    description: "URL of the image if stored externally",
    example: "https://example.com/image.jpg",
  })
  @IsString()
  @IsOptional()
  image_url?: string;

  @ApiPropertyOptional({
    description: "Path to the image if stored locally",
    example: "/uploads/images/profile_picture.jpg",
  })
  @IsString()
  @IsOptional()
  image_path?: string;

  @ApiProperty({
    description: "Size of the image in bytes",
    example: 102400,
    type: "integer",
  })
  @IsInt()
  image_size: number;

  @ApiPropertyOptional({
    description: "Additional metadata for the image",
    type: "object",
    example: { dimension: "100x100" },
    additionalProperties: true, // Added this line
  })
  @IsObject()
  @IsOptional()
  image_data?: Record<string, any>; // Changed to Record<string, any> for better type safety with JSON

  @ApiProperty({
    description: "Creation timestamp",
    example: "2023-01-01T12:00:00.000Z",
  })
  @IsDateString()
  createdAt: Date;

  @ApiProperty({
    description: "Last update timestamp",
    example: "2023-01-02T12:00:00.000Z",
  })
  @IsDateString()
  updatedAt: Date;
}
