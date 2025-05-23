import { PartialType, PickType } from "@nestjs/swagger";
import { UserDto } from "./user.dto";

// UpdateUserDto can update all fields from UserDto except id.
// Password can be optionally updated.
export class UpdateUserDto extends PartialType(
  PickType(UserDto, ["email", "firstName", "lastName", "password"] as const)
) {}
