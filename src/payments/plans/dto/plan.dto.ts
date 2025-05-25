import { ApiProperty } from "@nestjs/swagger";

// Define el enum directamente para Swagger, ya que PlanInterval de Prisma puede no ser compatible.
export enum PlanIntervalSwagger {
  DAY = "DAY",
  WEEK = "WEEK",
  MONTH = "MONTH",
  YEAR = "YEAR",
}

export class PlanDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false, nullable: true })
  description: string | null;

  @ApiProperty({ type: "number", format: "float" })
  price: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ enum: PlanIntervalSwagger, enumName: "PlanIntervalSwagger" })
  interval: PlanIntervalSwagger; // Usar el enum definido localmente para Swagger

  @ApiProperty()
  interval_count: number;

  @ApiProperty()
  active: boolean;

  @ApiProperty()
  created_at: Date;

  @ApiProperty({ required: false, nullable: true })
  updated_at: Date | null;
}
