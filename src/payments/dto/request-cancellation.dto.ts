import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID } from "class-validator";

export class RequestCancellationDto {
  @ApiProperty({
    description: "The ID of the subscription to cancel.",
    example: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  })
  @IsUUID()
  subscriptionId: string;

  @ApiProperty({
    description: "Optional reason for cancellation.",
    example: "No longer need the service.",
    required: false,
  })
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}
