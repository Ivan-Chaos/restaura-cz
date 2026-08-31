import { Module } from '@nestjs/common';
import { SessionGuard } from '../common/session.guard.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionGuard],
  // Menus guard their routes with SessionGuard, which needs AuthService.
  exports: [AuthService, SessionGuard],
})
export class AuthModule {}
