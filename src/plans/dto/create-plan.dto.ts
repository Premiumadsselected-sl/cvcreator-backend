import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  IsOptional,
  IsBoolean,
  IsObject,
} from "class-validator";

export class CreatePlanDto {
  @ApiProperty({ description: "Nombre del plan", example: "Plan Básico" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: "Precio del plan", example: 9.99 })
  @IsNumber()
  @IsNotEmpty()
  price: number;

  @ApiPropertyOptional({
    description: "Descripción del plan",
    example: "Acceso básico a todas las funcionalidades.",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: "Lista de características del plan",
    example: ["Característica 1", "Característica 2"],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  features: string[];

  @ApiPropertyOptional({
    description: "ID de precio de Stripe asociado al plan",
    example: "price_1Habcde12345",
  })
  @IsString()
  @IsOptional()
  stripe_price_id?: string; // Este se mantendrá si se refiere al ID de PRECIO de Stripe

  @ApiPropertyOptional({
    description: "ID de PLAN de Stripe asociado al plan", // Cambiada descripción para claridad
    example: "plan_1Habcde12345", // Ejemplo de ID de Plan
  })
  @IsString()
  @IsOptional()
  stripe_plan_id?: string; // Este es el que coincide con schema.prisma

  @ApiPropertyOptional({
    description: "ID de producto de Stripe asociado al plan",
    example: "prod_1Habcde12345",
  })
  @IsString()
  @IsOptional()
  stripe_product_id?: string;

  @ApiPropertyOptional({
    description: "Metadata adicional para el plan",
    type: "object",
    example: { popular: true },
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: "Indica si el plan está activo y disponible para suscripción",
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
