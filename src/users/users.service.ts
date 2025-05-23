import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { User } from "@prisma/client";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crea un nuevo usuario.
   * La contraseña debe ser hasheada antes de llamar a este método.
   * @param createUserDto Datos para la creación del usuario.
   * @returns El usuario creado.
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    return this.prisma.user.create({ data: createUserDto });
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
      return await this.prisma.user.update({
        where: { id },
        data: updateUserDto,
      });
    } catch (error) {
      if (error.code === "P2025") {
        // Error de Prisma: Registro no encontrado.
        throw new NotFoundException(`Usuario con ID "${id}" no encontrado`);
      }
      throw error;
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
