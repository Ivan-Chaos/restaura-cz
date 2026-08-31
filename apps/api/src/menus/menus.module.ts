import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MenusController } from './menus.controller.js';
import { MenusService } from './menus.service.js';
import { PublicMenusController } from './public-menus.controller.js';

@Module({
  // For SessionGuard, which resolves the cookie through AuthService.
  imports: [AuthModule],
  controllers: [MenusController, PublicMenusController],
  providers: [MenusService],
})
export class MenusModule {}
