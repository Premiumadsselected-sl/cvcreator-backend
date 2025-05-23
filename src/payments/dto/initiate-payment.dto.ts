import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsUUID } from "class-validator"; // Removed IsEmail and IsString, added IsUUID

export class InitiatePaymentDto {
  // Removed email field

  @ApiProperty({
    description: "ID of the plan to subscribe to",
    example: "clxkz23dc0000z0x1y2z3h4j5",
    format: "uuid", // Added format hint
  })
  @IsUUID() // Changed from IsString to IsUUID
  @IsNotEmpty()
  plan_id: string;
}
