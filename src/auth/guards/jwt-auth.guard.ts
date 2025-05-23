import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext
  ): any {
    // console.log('JwtAuthGuard: handleRequest', { err, user, info, status });
    if (err || !user) {
      // Log details for debugging
      // console.error('JWT Authentication Error:', err, 'Info:', info);
      throw err || new Error("Unauthorized - JWT Guard"); // More specific error
    }
    // Attach user to request for downstream use if not already done by passport
    const request = context.switchToHttp().getRequest();
    request.user = user;
    return user;
  }
}
