import { OmitType, ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserDto } from "./user.dto";
import {
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsObject,
} from "class-validator";

// Ahora UserDto ya tiene user_name y user_data, así que no necesitamos excluirlos aquí si los queremos mantener del DTO base.
// Si CreateUserDto debe tener una definición diferente o más específica para ellos, se pueden redefinir.
// Por ahora, asumimos que los heredados de UserDto (que son opcionales) son suficientes.
// Si CreateUserDto NO debe exponerlos, entonces sí los omitimos.
// Vamos a omitirlos para ser explícitos sobre qué campos son para la *creación*.
export class CreateUserDto extends OmitType(UserDto, [
  "id",
  "firstName",
  "lastName",
  "user_name",
  "user_data",
] as const) {
  @ApiProperty({
    description: "La contraseña para el usuario.",
    example: "Str0ngP@ssw0rd",
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  // Redefinimos user_name y user_data aquí para que CreateUserDto los tenga explícitamente
  // si es que los datos de entrada para la creación deben incluirlos directamente.
  // Si AuthService los va a construir, entonces no son necesarios aquí.
  // Basado en la lógica de AuthService, user_name y user_data se construyen allí,
  // por lo que no es estrictamente necesario que CreateUserDto los tenga.
  // Sin embargo, para que UsersService.create los reciba, deben estar en el DTO que usa.

  @ApiPropertyOptional({
    description: "Nombre de usuario (se puede autogenerar si no se provee).",
    example: "johndoe",
  })
  @IsString()
  @IsOptional()
  user_name?: string;

  @ApiPropertyOptional({
    description: "Datos adicionales del usuario en formato JSON.",
    example: { preferences: {} },
  })
  @IsObject()
  @IsOptional()
  user_data?: Record<string, any>;

  // El email se hereda de UserDto y es obligatorio allí.
  // No necesitamos redefinir email aquí a menos que queramos cambiar sus decoradores.
}
