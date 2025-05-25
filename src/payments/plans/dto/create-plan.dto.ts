import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsNumber,
  Min,
  IsIn,
  IsBoolean,
  IsObject,
} from "class-validator";

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @IsNotEmpty()
  // Consider using a more specific validation if you have a fixed list of currencies
  currency: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(["month", "year"])
  billing_interval: string;

  @IsObject()
  @IsOptional()
  features?: any; // Prisma Json can be an object or array

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
