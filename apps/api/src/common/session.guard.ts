import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, type PublicAccount } from '../auth/auth.service.js';
import { SESSION_COOKIE } from '../auth/session-cookie.js';
import { AppError } from './app-error.js';

/** What controllers read after the guard has run. */
export interface AuthenticatedRequest extends Request {
  account: PublicAccount;
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies?.[SESSION_COOKIE] as string | undefined;

    const account = await this.auth.resolveSession(token);
    if (!account) throw AppError.unauthenticated();

    (request as AuthenticatedRequest).account = account;
    return true;
  }
}
