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
import { ResendConfirmationDto } from './dto/resend-confirmation.dto.js';
import { SignInDto } from './dto/sign-in.dto.js';
import { SignUpDto } from './dto/sign-up.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
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
    // `locale` steers the confirmation email and is not part of the profile;
    // spreading the rest keeps ProfileDto the single definition of one.
    const { email, password, locale, ...profile } = dto;
    const issued = await this.auth.signUp(email, password, profile, locale);
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
   * Confirms the address using the code that was emailed to it.
   *
   * Session-guarded, which is what keeps this off the enumeration surface: a
   * caller can only ever confirm the account they are already signed in as, so
   * there is no email in the body to probe with.
   */
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard)
  async verifyEmail(
    @Req() request: Request,
    @Body() dto: VerifyEmailDto,
  ): Promise<AccountPayload> {
    const { account } = request as AuthenticatedRequest;
    if (!account) throw AppError.unauthenticated();

    await this.auth.verifyEmail(account.id, dto.code, dto.locale);

    // Re-stated rather than reusing the guard's copy: that one was resolved
    // before the address was confirmed, and answering with `emailVerified:
    // false` right after succeeding would send the frontend straight back.
    return {
      account: { ...account, emailVerified: true },
      profile: await this.auth.getProfile(account.id),
    };
  }

  @Post('verify-email/resend')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionGuard)
  async resendConfirmation(
    @Req() request: Request,
    @Body() dto: ResendConfirmationDto,
  ): Promise<void> {
    const { account } = request as AuthenticatedRequest;
    if (!account) throw AppError.unauthenticated();

    await this.auth.resendConfirmation(account.id, dto.locale);
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
