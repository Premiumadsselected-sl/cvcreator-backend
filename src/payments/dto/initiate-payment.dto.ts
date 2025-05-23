import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class InitiatePaymentDto {
  @ApiProperty({
    description: "User email address",
    example: "user@example.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "ID of the plan to subscribe to",
    example: "clxkz23dc0000z0x1y2z3h4j5",
  })
  @IsString()
  @IsNotEmpty()
  plan_id: string;
}
