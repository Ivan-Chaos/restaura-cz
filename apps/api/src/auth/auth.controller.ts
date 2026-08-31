import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppError } from '../common/app-error.js';
import { SessionGuard, type AuthenticatedRequest } from '../common/session.guard.js';
import { loadEnv } from '../config/env.js';
import { AuthService, type IssuedSession, type PublicAccount } from './auth.service.js';
import { SignInDto } from './dto/sign-in.dto.js';
import { SignUpDto } from './dto/sign-up.dto.js';
import {
  clearedCookieOptions,
  sessionCookieOptions,
  SESSION_COOKIE,
} from './session-cookie.js';

@Controller('auth')
export class AuthController {
  private readonly cookieSecure = loadEnv().cookieSecure;

  constructor(private readonly auth: AuthService) {}

  @Post('sign-up')
  @HttpCode(HttpStatus.CREATED)
  async signUp(
    @Body() dto: SignUpDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ account: PublicAccount }> {
    const issued = await this.auth.signUp(dto.email, dto.password);
    return this.respondWithSession(issued, response);
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body() dto: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ account: PublicAccount }> {
    const issued = await this.auth.signIn(dto.email, dto.password);
    return this.respondWithSession(issued, response);
  }

  /**
   * Deliberately unguarded: signing out with an already-invalid session should
   * still clear the cookie rather than fail with a 401.
   */
  @Post('sign-out')
  @HttpCode(HttpStatus.NO_CONTENT)
  async signOut(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.signOut(request.cookies?.[SESSION_COOKIE] as string | undefined);
    response.clearCookie(SESSION_COOKIE, clearedCookieOptions(this.cookieSecure));
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@Req() request: Request): { account: PublicAccount } {
    const { account } = request as AuthenticatedRequest;
    if (!account) throw AppError.unauthenticated();
    return { account };
  }

  private respondWithSession(
    issued: IssuedSession,
    response: Response,
  ): { account: PublicAccount } {
    response.cookie(
      SESSION_COOKIE,
      issued.token,
      sessionCookieOptions(this.cookieSecure, issued.expiresAt),
    );
    return { account: issued.account };
  }
}
