import { PickType } from "@nestjs/swagger";
import { SubscriptionDto } from "./subscription.dto";
import { IsString, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateSubscriptionDto extends PickType(SubscriptionDto, [
  "user_id",
  "plan_id",
] as const) {
  @ApiProperty({
    description: "Payment ID that triggered this subscription, if applicable",
    example: "pay_abcdef123456",
    required: false,
  })
  @IsString()
  @IsOptional()
  payment_id?: string;
}
