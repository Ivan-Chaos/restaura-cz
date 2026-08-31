import { Controller, Get, Param } from '@nestjs/common';
import { MenusService, type PublicMenuView } from './menus.service.js';

/**
 * The only unauthenticated route in the API. It serves display fields alone —
 * no ids, no account data, no timestamps — so a shared menu link reveals
 * nothing about the owner or the rest of their workspace.
 */
@Controller('public/menus')
export class PublicMenusController {
  constructor(private readonly menus: MenusService) {}

  @Get(':slug')
  async bySlug(@Param('slug') slug: string): Promise<{ menu: PublicMenuView }> {
    return { menu: await this.menus.getPublicMenu(slug) };
  }
}
