import { Module } from '@nestjs/common';
import { SessionGuard } from '../common/session.guard.js';
import { VerifiedGuard } from '../common/verified.guard.js';
import { MailModule } from '../mail/mail.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [MailModule],
  controllers: [AuthController],
  providers: [AuthService, SessionGuard, VerifiedGuard],
  // Menus guard their routes with both guards, which need AuthService.
  exports: [AuthService, SessionGuard, VerifiedGuard],
})
export class AuthModule {}
