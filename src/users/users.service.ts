import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { User, Prisma } from "@prisma/client";
import { CreateUserDto } from "./dto/create-user.dto"; // Restaurada la importación
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Crea un nuevo usuario.
   * La contraseña debe ser hasheada antes de llamar a este método.
   * @param createUserDto Datos para la creación del usuario.
   * @returns El usuario creado.
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    // Restaurado el método create
    // Asegúrate de que CreateUserDto sea compatible con Prisma.UserCreateInput
    // Puede que necesites mapear los campos si no coinciden directamente.
    // Por ejemplo, si CreateUserDto tiene `password` pero Prisma espera `hashedPassword`.
    // Por ahora, asumimos una compatibilidad directa o que el hashing se hace antes.
    return this.prisma.user.create({ data: createUserDto as any }); // Usar 'as any' temporalmente si hay dudas de tipo, revisar luego.
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  /**
   * Obtiene un usuario por su ID.
   * @param id ID del usuario.
   * @returns El usuario si se encuentra.
   * @throws NotFoundException si el usuario no se encuentra.
   */
  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado`);
    }
    return user;
  }

  /**
   * Obtiene un usuario por su email.
   * @param email Email del usuario.
   * @returns El usuario si se encuentra, o null.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Actualiza un usuario existente.
   * @param id ID del usuario a actualizar.
   * @param updateUserDto Datos para la actualización.
   * @returns El usuario actualizado.
   * @throws NotFoundException si el usuario no se encuentra.
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    try {
      const { email, password, firstName, lastName } = updateUserDto;
      const dataToUpdate: Prisma.UserUpdateInput = {};
      let newUserDataFields: Record<string, any> | null = null;

      if (email !== undefined) {
        dataToUpdate.email = email;
      }
      if (password !== undefined) {
        // SECURITY WARNING: Password should be hashed before saving.
        // This is a critical security step not implemented here.
        this.logger.warn(
          `Updating password for user ${id} without hashing. THIS IS INSECURE.`
        );
        dataToUpdate.password = password; // In a real application, store a hashed password.
      }

      // Check if firstName or lastName are provided to update user_data
      if (firstName !== undefined || lastName !== undefined) {
        newUserDataFields = {};
        if (firstName !== undefined) {
          newUserDataFields.firstName = firstName;
        }
        if (lastName !== undefined) {
          newUserDataFields.lastName = lastName;
        }
      }

      if (newUserDataFields) {
        // Fetch the user to safely merge with existing user_data
        const user = await this.prisma.user.findUnique({
          where: { id },
          select: { user_data: true },
        });

        if (!user) {
          // This case should ideally be caught before if no other fields are being updated,
          // but it's a safeguard if only user_data fields were passed.
          throw new NotFoundException(
            `User with ID ${id} not found when preparing to update user_data.`
          );
        }

        const existingUserData =
          user.user_data &&
          typeof user.user_data === "object" &&
          !Array.isArray(user.user_data)
            ? (user.user_data as Record<string, any>)
            : {};

        dataToUpdate.user_data = { ...existingUserData, ...newUserDataFields };
      }

      // Log if DTO contains properties other than the ones explicitly handled
      const handledKeys = ["email", "password", "firstName", "lastName"];
      const allDtoKeys = Object.keys(updateUserDto);
      const unhandledKeys = allDtoKeys.filter(
        (key) => !handledKeys.includes(key) && updateUserDto[key] !== undefined
      );

      if (unhandledKeys.length > 0) {
        this.logger.warn(
          `UpdateUserDto for user ${id} contained unhandled properties: ${unhandledKeys.join(
            ", "
          )}. These were not processed.`
        );
      }

      if (Object.keys(dataToUpdate).length === 0) {
        this.logger.log(
          `Update called for user ${id}, but no updatable fields were provided in the DTO. Returning current user data.`
        );
        // Ensure user exists before returning their data for a no-op update
        const currentUser = await this.prisma.user.findUnique({
          where: { id },
        });
        if (!currentUser) {
          throw new NotFoundException(
            `User with ID ${id} not found when attempting to return current data for no-op update.`
          );
        }
        return currentUser;
      }

      this.logger.log(
        `Attempting to update user ${id} with data: ${JSON.stringify(dataToUpdate)}`
      );
      return await this.prisma.user.update({
        where: { id },
        data: dataToUpdate,
      });
    } catch (error) {
      this.logger.error(
        `Error updating user ${id}: ${error.message}`,
        error.stack
      );
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new NotFoundException(`User with ID ${id} not found.`);
        }
        this.logger.error(
          `Prisma known request error on user update: Code ${error.code}, Meta: ${JSON.stringify(
            error.meta
          )}`
        );
        throw new InternalServerErrorException(
          `A database error occurred while updating user ${id}. Prisma Code: ${error.code}`
        );
      } else if (error instanceof Prisma.PrismaClientValidationError) {
        this.logger.error(
          `Prisma validation error updating user ${id}. This may indicate an issue with the generated Prisma Client or query structure. Details: ${error.message}`
        );
        throw new BadRequestException(
          `Invalid data for user update. Prisma validation failed.`
        );
      } else if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error; // Re-throw specific HTTP exceptions
      }
      throw new InternalServerErrorException(
        `An unexpected error occurred while updating user ${id}.`
      );
    }
  }

  /**
   * Elimina un usuario.
   * @param id ID del usuario a eliminar.
   * @returns El usuario eliminado.
   * @throws NotFoundException si el usuario no se encuentra.
   */
  async remove(id: string): Promise<User> {
    try {
      return await this.prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === "P2025") {
        // Error de Prisma: Registro no encontrado.
        throw new NotFoundException(`Usuario con ID "${id}" no encontrado`);
      }
      throw error;
    }
  }
}
