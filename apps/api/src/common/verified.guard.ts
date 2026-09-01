import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AppError } from './app-error.js';
import type { AuthenticatedRequest } from './session.guard.js';

/**
 * Refuses a signed-in owner who has not confirmed their email address.
 *
 * The frontend also gates on this, but a gate that only exists in the frontend
 * is a gate in the wrong trust zone: the API listens on its own port and
 * answers anyone holding a session cookie. This is the one that counts.
 *
 * Always mounted *after* SessionGuard — it reads the account that guard
 * attached, and mounting it alone would let an unauthenticated request through
 * on a missing property.
 */
@Injectable()
export class VerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const { account } = request as AuthenticatedRequest;

    if (!account) throw AppError.unauthenticated();
    if (!account.emailVerified) throw AppError.emailUnverified();

    return true;
  }
}
