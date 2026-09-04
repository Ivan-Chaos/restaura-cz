import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { DbModule } from './db/db.module.js';
import { ImagesModule } from './images/images.module.js';
import { MenusModule } from './menus/menus.module.js';

@Module({
  // ImagesModule.forRoot() reads the environment to decide between Cloudflare
  // R2 and the local disk, and mounts the development image route only for the
  // latter (feature 006).
  imports: [DbModule, ImagesModule.forRoot(), AuthModule, MenusModule],
})
export class AppModule {}
