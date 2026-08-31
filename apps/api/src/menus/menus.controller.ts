import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { SessionGuard, type AuthenticatedRequest } from '../common/session.guard.js';
import { UuidParam } from '../common/uuid-param.pipe.js';
import { CreateItemDto, UpdateItemDto } from './dto/item.dto.js';
import { CreateMenuDto, UpdateMenuDto } from './dto/menu.dto.js';
import { CreateSectionDto, UpdateSectionDto } from './dto/section.dto.js';
import {
  MenusService,
  type ItemView,
  type MenuDetail,
  type MenuStatus,
  type MenuSummary,
  type SectionView,
} from './menus.service.js';

/** Every route here is owner-only and scoped to the caller's own menus. */
@Controller('menus')
@UseGuards(SessionGuard)
export class MenusController {
  constructor(private readonly menus: MenusService) {}

  private accountId(request: Request): string {
    return (request as AuthenticatedRequest).account.id;
  }

  @Get()
  async list(@Req() request: Request): Promise<{ menus: MenuSummary[] }> {
    return { menus: await this.menus.listMenus(this.accountId(request)) };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() request: Request,
    @Body() dto: CreateMenuDto,
  ): Promise<{ menu: MenuDetail }> {
    return { menu: await this.menus.createMenu(this.accountId(request), dto.name) };
  }

  @Get(':menuId')
  async detail(
    @Req() request: Request,
    @Param('menuId', UuidParam) menuId: string,
  ): Promise<{ menu: MenuDetail }> {
    return { menu: await this.menus.getMenuDetail(this.accountId(request), menuId) };
  }

  @Patch(':menuId')
  async update(
    @Req() request: Request,
    @Param('menuId', UuidParam) menuId: string,
    @Body() dto: UpdateMenuDto,
  ): Promise<{ menu: MenuDetail }> {
    return { menu: await this.menus.updateMenu(this.accountId(request), menuId, dto) };
  }

  @Delete(':menuId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() request: Request,
    @Param('menuId', UuidParam) menuId: string,
  ): Promise<void> {
    await this.menus.deleteMenu(this.accountId(request), menuId);
  }

  // ----------------------------------------------------------- publishing

  @Post(':menuId/publish')
  @HttpCode(HttpStatus.OK)
  async publish(
    @Req() request: Request,
    @Param('menuId', UuidParam) menuId: string,
  ): Promise<{ status: MenuStatus; publicSlug: string; publicPath: string }> {
    return this.menus.publish(this.accountId(request), menuId);
  }

  @Post(':menuId/unpublish')
  @HttpCode(HttpStatus.OK)
  async unpublish(
    @Req() request: Request,
    @Param('menuId', UuidParam) menuId: string,
  ): Promise<{ status: MenuStatus; publicSlug: string | null }> {
    return this.menus.unpublish(this.accountId(request), menuId);
  }

  // ------------------------------------------------------------- sections

  @Post(':menuId/sections')
  @HttpCode(HttpStatus.CREATED)
  async addSection(
    @Req() request: Request,
    @Param('menuId', UuidParam) menuId: string,
    @Body() dto: CreateSectionDto,
  ): Promise<{ section: SectionView }> {
    return { section: await this.menus.addSection(this.accountId(request), menuId, dto.title) };
  }

  @Patch(':menuId/sections/:sectionId')
  async updateSection(
    @Req() request: Request,
    @Param('menuId', UuidParam) menuId: string,
    @Param('sectionId', UuidParam) sectionId: string,
    @Body() dto: UpdateSectionDto,
  ): Promise<{ section: SectionView }> {
    return {
      section: await this.menus.updateSection(this.accountId(request), menuId, sectionId, dto),
    };
  }

  @Delete(':menuId/sections/:sectionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeSection(
    @Req() request: Request,
    @Param('menuId', UuidParam) menuId: string,
    @Param('sectionId', UuidParam) sectionId: string,
  ): Promise<void> {
    await this.menus.deleteSection(this.accountId(request), menuId, sectionId);
  }

  // ---------------------------------------------------------------- items

  @Post(':menuId/sections/:sectionId/items')
  @HttpCode(HttpStatus.CREATED)
  async addItem(
    @Req() request: Request,
    @Param('menuId', UuidParam) menuId: string,
    @Param('sectionId', UuidParam) sectionId: string,
    @Body() dto: CreateItemDto,
  ): Promise<{ item: ItemView }> {
    return {
      item: await this.menus.addItem(this.accountId(request), menuId, sectionId, dto),
    };
  }

  @Patch(':menuId/sections/:sectionId/items/:itemId')
  async updateItem(
    @Req() request: Request,
    @Param('menuId', UuidParam) menuId: string,
    @Param('sectionId', UuidParam) sectionId: string,
    @Param('itemId', UuidParam) itemId: string,
    @Body() dto: UpdateItemDto,
  ): Promise<{ item: ItemView }> {
    return {
      item: await this.menus.updateItem(this.accountId(request), menuId, sectionId, itemId, dto),
    };
  }

  @Delete(':menuId/sections/:sectionId/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeItem(
    @Req() request: Request,
    @Param('menuId', UuidParam) menuId: string,
    @Param('sectionId', UuidParam) sectionId: string,
    @Param('itemId', UuidParam) itemId: string,
  ): Promise<void> {
    await this.menus.deleteItem(this.accountId(request), menuId, sectionId, itemId);
  }
}
