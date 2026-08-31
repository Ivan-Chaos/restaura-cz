import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppError } from '../common/app-error.js';
import { SessionGuard, type AuthenticatedRequest } from '../common/session.guard.js';
import { loadEnv } from '../config/env.js';
import {
  AuthService,
  type IssuedSession,
  type PublicAccount,
  type PublicProfile,
} from './auth.service.js';
import { ProfileDto } from './dto/profile.dto.js';
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
  ): Promise<AccountPayload> {
    const { email, password, ...profile } = dto;
    const issued = await this.auth.signUp(email, password, profile);
    return this.respondWithSession(issued, response);
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body() dto: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AccountPayload> {
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

  /**
   * The one read every signed-in page makes. It carries the profile — `null`
   * for an account created before profiles existed — so the frontend can gate
   * the dashboard without a second round trip.
   */
  @Get('me')
  @UseGuards(SessionGuard)
  async me(@Req() request: Request): Promise<AccountPayload> {
    const { account } = request as AuthenticatedRequest;
    if (!account) throw AppError.unauthenticated();

    return { account, profile: await this.auth.getProfile(account.id) };
  }

  /**
   * Upsert, not create-then-update: the profile-completion step and the
   * settings form are the same write under the same rules, and a caller has no
   * reason to know which of the two it is performing.
   */
  @Put('profile')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard)
  async putProfile(
    @Req() request: Request,
    @Body() dto: ProfileDto,
  ): Promise<{ profile: PublicProfile }> {
    const { account } = request as AuthenticatedRequest;
    if (!account) throw AppError.unauthenticated();

    return { profile: await this.auth.upsertProfile(account.id, dto) };
  }

  private respondWithSession(issued: IssuedSession, response: Response): AccountPayload {
    response.cookie(
      SESSION_COOKIE,
      issued.token,
      sessionCookieOptions(this.cookieSecure, issued.expiresAt),
    );
    return { account: issued.account, profile: issued.profile };
  }
}

/** What sign-up, sign-in and `me` all answer with, so the frontend has one shape. */
interface AccountPayload {
  account: PublicAccount;
  profile: PublicProfile | null;
}
