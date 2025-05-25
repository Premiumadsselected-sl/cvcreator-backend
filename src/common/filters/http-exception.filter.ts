// filepath: /Users/arcademan/Documents/Projects/ADSDIGITAL/cvcreator-backend/src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { Prisma } from "@prisma/client";

export interface ApiErrorResponse {
  error_status: true;
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string;
  details?: any;
}

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name); // Logger puede mantenerse para usos futuros esenciales

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    let statusCode: number;
    let message: string;
    let details: Record<string, any> | string | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const errorResponse = exception.getResponse();
      if (typeof errorResponse === "string") {
        message = errorResponse;
      } else if (typeof errorResponse === "object" && errorResponse !== null) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        message = errorResponse.message || "Internal server error";
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        details = errorResponse.details || errorResponse.error || undefined;
      } else {
        message = "Internal server error";
      }
    } else if (
      exception instanceof Prisma.PrismaClientKnownRequestError ||
      (typeof exception === "object" &&
        exception !== null &&
        "code" in exception &&
        "meta" in exception &&
        "clientVersion" in exception &&
        (exception as any).name === "PrismaClientKnownRequestError")
    ) {
      const knownError = exception as Prisma.PrismaClientKnownRequestError;
      details = {
        code: knownError.code,
        meta: knownError.meta,
        clientVersion: knownError.clientVersion,
      };
      switch (knownError.code) {
        case "P2002": {
          statusCode = HttpStatus.CONFLICT;
          let fields = "unknown";
          if (
            knownError.meta &&
            typeof knownError.meta === "object" &&
            "target" in knownError.meta
          ) {
            const target = (knownError.meta as { target?: string[] }).target;
            if (Array.isArray(target)) {
              fields = target.join(", ");
            }
          }
          message = `Conflict: A record with the specified unique field(s) already exists. Fields: ${fields}`;
          break;
        }
        case "P2025": {
          statusCode = HttpStatus.NOT_FOUND;
          const cause = (knownError.meta as any)?.cause || "Record not found.";
          message = cause;
          details = {
            ...details,
            cause,
          };
          break;
        }
        default: {
          statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
          message = `Unhandled Prisma error (${knownError.code}).`;
          break;
        }
      }
    } else if (
      exception instanceof Prisma.PrismaClientValidationError ||
      (typeof exception === "object" &&
        exception !== null &&
        "name" in exception &&
        (exception as any).name === "PrismaClientValidationError")
    ) {
      const validationError = exception as Prisma.PrismaClientValidationError;
      statusCode = HttpStatus.BAD_REQUEST;
      message = "Prisma Validation Error: Invalid input data.";
      details = {
        name: validationError.name,
        message: validationError.message,
      };
    } else if (exception instanceof Error) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception.message || "An unexpected error occurred.";
      details = {
        name: exception.name,
        stack:
          process.env.NODE_ENV === "development" ? exception.stack : undefined,
      };
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = "An unknown error occurred.";
      details = { error: String(exception) };
    }

    const finalErrorResponse: ApiErrorResponse = {
      error_status: true,
      statusCode,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(request),
      method: httpAdapter.getRequestMethod(request),
      message,
      details,
    };

    try {
      httpAdapter.setHeader(response, "Content-Type", "application/json");
      httpAdapter.reply(response, finalErrorResponse, statusCode);
    } catch (replyError) {
      // Log an error if sending the response fails, as this is critical.
      this.logger.error(
        `Failed to send error response for path ${finalErrorResponse.path}: ${
          replyError instanceof Error ? replyError.message : String(replyError)
        }`,
        replyError instanceof Error ? replyError.stack : undefined
      );
      if (!response.headersSent) {
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error_status: true,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          timestamp: new Date().toISOString(),
          path: httpAdapter.getRequestUrl(request),
          method: httpAdapter.getRequestMethod(request),
          message: "Fallback error: Failed to send primary error response.",
          details: {
            originalError: message,
            replyError:
              replyError instanceof Error
                ? replyError.message
                : String(replyError),
          },
        });
      }
    }
  }
}
