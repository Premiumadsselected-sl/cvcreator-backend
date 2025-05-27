import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Request } from "express";

interface AuthenticatedRequestUser {
  sub: string;
  role?: string;
  [key: string]: any;
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedRequestUser;
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userPayload = request.user;

    if (!userPayload || !userPayload.sub) {
      throw new UnauthorizedException(
        "User not authenticated or user ID missing in token payload."
      );
    }

    try {
      const userFromDb = await this.prisma.user.findUnique({
        where: { id: userPayload.sub },
      });

      if (!userFromDb) {
        throw new UnauthorizedException("User not found.");
      }

      if (userFromDb.role !== "admin") {
        throw new ForbiddenException("User does not have admin privileges.");
      }
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      console.error("Error in AdminGuard:", error);
      throw new ForbiddenException(
        "An error occurred while verifying admin privileges."
      );
    }
    return true;
  }
}
