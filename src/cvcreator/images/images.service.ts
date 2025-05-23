import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateImageDto } from "./dto/create-image.dto";
import { UpdateImageDto } from "./dto/update-image.dto";
import { ImageDto } from "./dto/image.dto"; // Import ImageDto
import { Image, Prisma } from "@prisma/client";
import { ImageType as LocalImageType } from "../../types/ImageType";
import { Express } from "express"; // Reverted import
import * as fs from "fs/promises";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class ImagesService {
  constructor(private prisma: PrismaService) {}

  private isValidLocalImageType(typeString: any): typeString is LocalImageType {
    if (typeString === null || typeString === undefined) return true; // Prisma accepts null for type
    return Object.values(LocalImageType).includes(typeString as LocalImageType);
  }

  private mapPrismaImageToDto(image: Image): ImageDto {
    let dtoType: LocalImageType | undefined = undefined;
    if (image.type) {
      if (
        Object.values(LocalImageType).includes(image.type as LocalImageType)
      ) {
        dtoType = image.type as LocalImageType;
      } else {
        console.warn(
          `Image ${image.id} has type '${image.type}' from DB which is not a valid LocalImageType.`
        );
      }
    }

    return {
      id: image.id,
      user_id: image.user_id,
      type: dtoType,
      image_name: image.image_name,
      image_type: image.image_type, // MIME type
      image_url: image.image_url === null ? undefined : image.image_url,
      image_path: image.image_path === null ? undefined : image.image_path,
      image_size: image.image_size,
      image_data:
        image.image_data === null || image.image_data === undefined // Prisma's JsonValue can be null
          ? undefined
          : (image.image_data as Record<string, any>),
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
    };
  }

  async create(
    createImageDto: CreateImageDto,
    // Explicitly type `file` as `any` for now to bypass immediate TS errors,
    // will rely on runtime checks and controller-level validation (ParseFilePipe)
    file: any
  ): Promise<ImageDto> {
    if (
      !file ||
      !file.originalname ||
      !file.mimetype ||
      file.size === undefined ||
      !file.buffer
    ) {
      throw new BadRequestException(
        "Valid image file with all properties (originalname, mimetype, size, buffer) is required."
      );
    }
    // Now, we can safely destructure, assuming the above check passes.
    // For stricter typing, one might define a local interface for the expected file structure.
    const { originalname, mimetype, size, buffer } =
      file as Express.Multer.File;

    let imageTypeForDb: LocalImageType | null = null;
    if (createImageDto.type !== undefined) {
      if (this.isValidLocalImageType(createImageDto.type)) {
        imageTypeForDb = createImageDto.type;
      } else {
        // Use String() to avoid 'never' type issues in template literal
        const typeAsString = String(createImageDto.type);
        throw new BadRequestException(
          `Invalid image type provided: ${typeAsString}. Valid types are: ${Object.values(LocalImageType).join(", ")}`
        );
      }
    }

    const extension = path.extname(originalname);
    const fileName = `${uuidv4()}${extension}`;
    const uploadPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "uploads",
      "images"
    ); // Adjusted path
    const filePath = path.join(uploadPath, fileName);

    try {
      await fs.mkdir(uploadPath, { recursive: true });
      await fs.writeFile(filePath, buffer);
    } catch (error) {
      console.error("Failed to save image file:", error);
      throw new InternalServerErrorException("Failed to save image file.");
    }

    const imageData: Prisma.ImageCreateInput = {
      user: { connect: { id: createImageDto.user_id } },
      type: imageTypeForDb as string | null, // Cast to string | null
      image_name: createImageDto.image_name || originalname,
      image_type: mimetype, // This is the actual MIME type from the file
      image_path: filePath,
      image_size: size,
      image_data: createImageDto.image_data || undefined, // Prisma handles undefined as no-op, null as set to null
    };

    try {
      const createdImage = await this.prisma.image.create({ data: imageData });
      return this.mapPrismaImageToDto(createdImage);
    } catch (dbError) {
      console.error("Failed to save image to DB:", dbError);
      try {
        await fs.unlink(filePath); // Attempt to clean up orphaned file
      } catch (fileError) {
        console.error("Failed to delete orphaned file:", fileError);
      }
      throw new InternalServerErrorException(
        "Failed to save image information to database."
      );
    }
  }

  async findAll(): Promise<ImageDto[]> {
    const images = await this.prisma.image.findMany();
    return images.map((image) => this.mapPrismaImageToDto(image));
  }

  async findOne(id: string): Promise<ImageDto> {
    const image = await this.prisma.image.findUnique({
      where: { id },
    });
    if (!image) {
      throw new NotFoundException(`Image with ID "${id}" not found`);
    }
    return this.mapPrismaImageToDto(image);
  }

  async update(id: string, updateImageDto: UpdateImageDto): Promise<ImageDto> {
    const existingImage = await this.prisma.image.findUnique({ where: { id } });
    if (!existingImage) {
      throw new NotFoundException(
        `Image with ID "${id}" not found for update.`
      );
    }

    const dataToUpdate: Prisma.ImageUpdateInput = {};

    // Handle standard fields
    if (Object.prototype.hasOwnProperty.call(updateImageDto, "image_name")) {
      dataToUpdate.image_name = updateImageDto.image_name;
    }
    if (Object.prototype.hasOwnProperty.call(updateImageDto, "image_type")) {
      dataToUpdate.image_type = updateImageDto.image_type;
    }
    if (Object.prototype.hasOwnProperty.call(updateImageDto, "image_url")) {
      dataToUpdate.image_url = updateImageDto.image_url;
    }
    if (Object.prototype.hasOwnProperty.call(updateImageDto, "image_path")) {
      dataToUpdate.image_path = updateImageDto.image_path;
    }
    if (Object.prototype.hasOwnProperty.call(updateImageDto, "image_size")) {
      dataToUpdate.image_size = updateImageDto.image_size;
    }

    if (Object.prototype.hasOwnProperty.call(updateImageDto, "image_data")) {
      dataToUpdate.image_data = updateImageDto.image_data;
    }

    if (Object.prototype.hasOwnProperty.call(updateImageDto, "type")) {
      const typeValue = updateImageDto.type;
      if (typeValue === undefined || typeValue === null) {
        dataToUpdate.type = null;
      } else if (this.isValidLocalImageType(typeValue)) {
        dataToUpdate.type = typeValue as string;
      } else {
        const typeAsString = String(typeValue);
        throw new BadRequestException(
          `Invalid image type for update: ${typeAsString}. Valid types are: ${Object.values(LocalImageType).join(", ")}`
        );
      }
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return this.mapPrismaImageToDto(existingImage);
    }

    try {
      const updatedImage = await this.prisma.image.update({
        where: { id },
        data: dataToUpdate,
      });
      return this.mapPrismaImageToDto(updatedImage);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new NotFoundException(
          `Image with ID "${id}" not found during update operation.`
        );
      }
      console.error("Failed to update image in DB:", error);
      throw new InternalServerErrorException("Failed to update image.");
    }
  }

  async remove(id: string): Promise<ImageDto> {
    const image = await this.prisma.image.findUnique({ where: { id } });
    if (!image) {
      throw new NotFoundException(
        `Image with ID "${id}" not found for deletion.`
      );
    }

    if (image.image_path) {
      try {
        await fs.unlink(image.image_path);
      } catch (error) {
        console.error(
          `Failed to delete image file at ${image.image_path}:`,
          error
        );
        // Do not re-throw if file not found, but log for other fs errors
        if (error.code !== "ENOENT") {
          console.error("Error during file deletion (not ENOENT):", error);
        }
      }
    } else {
      console.warn(
        `Image with ID "${id}" has no image_path. Deleting DB record only.`
      );
    }

    try {
      const deletedImage = await this.prisma.image.delete({
        where: { id },
      });
      return this.mapPrismaImageToDto(deletedImage);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new NotFoundException(
          `Image with ID "${id}" was not found during the delete operation, it might have been already deleted.`
        );
      }
      console.error("Failed to delete image from DB:", error);
      throw new InternalServerErrorException(
        "Failed to delete image from database."
      );
    }
  }

  async findAllByUserId(userId: string): Promise<ImageDto[]> {
    const images = await this.prisma.image.findMany({
      where: { user_id: userId },
    });
    return images.map((image) => this.mapPrismaImageToDto(image));
  }

  async findOneByUserId(id: string, userId: string): Promise<ImageDto> {
    const image = await this.prisma.image.findUnique({
      where: { id },
    });
    if (!image) {
      throw new NotFoundException(`Image with ID "${id}" not found`);
    }
    if (image.user_id !== userId) {
      throw new ForbiddenException(
        "You do not have permission to access this image"
      );
    }
    return this.mapPrismaImageToDto(image);
  }

  async updateByUserId(
    id: string,
    updateImageDto: UpdateImageDto,
    userId: string
  ): Promise<ImageDto> {
    // First, verify the image exists and belongs to the user.
    // findOneByUserId already returns ImageDto, so we don't need to map again if we use its result.
    // However, the update logic below re-fetches and maps, which is fine.
    await this.findOneByUserId(id, userId); // This ensures the image belongs to the user and throws if not.

    // The update logic is similar to the general 'update' method, but scoped to the user.
    // We need to ensure that the DTO doesn't try to change user_id.
    // For simplicity, we'll reuse parts of the 'update' method's logic.
    // Note: UpdateImageDto should not contain user_id. If it does, it should be ignored.

    const dataToUpdate: Prisma.ImageUpdateInput = {};

    if (Object.prototype.hasOwnProperty.call(updateImageDto, "image_name")) {
      dataToUpdate.image_name = updateImageDto.image_name;
    }
    if (Object.prototype.hasOwnProperty.call(updateImageDto, "image_type")) {
      dataToUpdate.image_type = updateImageDto.image_type;
    }
    if (Object.prototype.hasOwnProperty.call(updateImageDto, "image_url")) {
      dataToUpdate.image_url = updateImageDto.image_url;
    }
    if (Object.prototype.hasOwnProperty.call(updateImageDto, "image_path")) {
      // Generally, image_path should not be updatable by users this way.
      // This might be an admin-only feature or handled differently (e.g., re-upload).
      // For now, keeping it as per previous structure but flagging as a review point.
      dataToUpdate.image_path = updateImageDto.image_path;
    }
    if (Object.prototype.hasOwnProperty.call(updateImageDto, "image_size")) {
      dataToUpdate.image_size = updateImageDto.image_size;
    }
    if (Object.prototype.hasOwnProperty.call(updateImageDto, "image_data")) {
      dataToUpdate.image_data = updateImageDto.image_data;
    }
    if (Object.prototype.hasOwnProperty.call(updateImageDto, "type")) {
      const typeValue = updateImageDto.type;
      if (typeValue === undefined || typeValue === null) {
        dataToUpdate.type = null;
      } else if (this.isValidLocalImageType(typeValue)) {
        dataToUpdate.type = typeValue as string;
      } else {
        const typeAsString = String(typeValue);
        throw new BadRequestException(
          `Invalid image type for update: ${typeAsString}. Valid types are: ${Object.values(LocalImageType).join(", ")}`
        );
      }
    }
    // Ensure user_id is not part of dataToUpdate from DTO
    if ("user_id" in dataToUpdate) {
      delete (dataToUpdate as any).user_id;
    }
    if ("userId" in dataToUpdate) {
      delete (dataToUpdate as any).userId;
    }

    if (Object.keys(dataToUpdate).length === 0) {
      // No actual data to update, fetch and return existing image DTO
      const existingImage = await this.prisma.image.findUnique({
        where: { id },
      });
      if (!existingImage)
        throw new NotFoundException(`Image with ID "${id}" not found.`); // Should be caught by findOneByUserId
      return this.mapPrismaImageToDto(existingImage);
    }

    try {
      const updatedImage = await this.prisma.image.update({
        where: { id, user_id: userId }, // Ensure update happens only if user_id matches
        data: dataToUpdate,
      });
      return this.mapPrismaImageToDto(updatedImage);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new NotFoundException(
          `Image with ID "${id}" not found for user "${userId}" during update.`
        );
      }
      console.error("Failed to update image in DB for user:", error);
      throw new InternalServerErrorException("Failed to update image.");
    }
  }

  async removeByUserId(id: string, userId: string): Promise<ImageDto> {
    // findOneByUserId will throw if not found or not owned by user.
    // It returns ImageDto, but we need the raw Image object for image_path.
    // So, we fetch the raw image first.
    const image = await this.prisma.image.findUnique({
      where: { id },
    });

    if (!image) {
      throw new NotFoundException(`Image with ID "${id}" not found.`);
    }
    if (image.user_id !== userId) {
      throw new ForbiddenException(
        "You do not have permission to delete this image."
      );
    }

    if (image.image_path) {
      try {
        await fs.unlink(image.image_path);
      } catch (error) {
        console.error(
          `Failed to delete image file at ${image.image_path}:`,
          error
        );
        if (error.code !== "ENOENT") {
          // Log and potentially alert, but don't block DB record deletion for other fs errors
          // unless it's critical. For now, we proceed.
          console.error("Error during file deletion (not ENOENT):", error);
        }
      }
    } else {
      console.warn(
        `Image with ID "${id}" (user "${userId}") has no image_path. Deleting DB record only.`
      );
    }

    try {
      const deletedImage = await this.prisma.image.delete({
        where: { id, user_id: userId }, // Ensure delete happens only if user_id matches
      });
      return this.mapPrismaImageToDto(deletedImage);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025" // Record to delete not found
      ) {
        throw new NotFoundException(
          `Image with ID "${id}" was not found for user "${userId}" during delete, it might have been already deleted.`
        );
      }
      console.error("Failed to delete image from DB for user:", error);
      throw new InternalServerErrorException(
        "Failed to delete image from database."
      );
    }
  }
}
