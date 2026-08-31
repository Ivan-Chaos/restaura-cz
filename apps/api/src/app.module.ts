import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { DbModule } from './db/db.module.js';
import { MenusModule } from './menus/menus.module.js';

@Module({
  imports: [DbModule, AuthModule, MenusModule],
})
export class AppModule {}
