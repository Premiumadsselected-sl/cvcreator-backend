import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class SubscriptionCancellationRequestDto {
  @ApiProperty({
    description: "Optional reason for cancelling the subscription.",
    example: "I no longer need this service.",
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancellationReason?: string;
}
