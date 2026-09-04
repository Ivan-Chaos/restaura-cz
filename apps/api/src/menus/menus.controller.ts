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
  Put,
  Req,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { SessionGuard, type AuthenticatedRequest } from '../common/session.guard.js';
import { UuidParam } from '../common/uuid-param.pipe.js';
import { VerifiedGuard } from '../common/verified.guard.js';
import { CropDto, toCropRect } from '../images/dto/crop.dto.js';
import { requireFile, type UploadedImage } from '../images/require-file.js';
import { ImageUpload } from '../images/upload.interceptor.js';
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

/**
 * Every route here is owner-only, scoped to the caller's own menus, and closed
 * to an account whose email is unconfirmed. Guard order matters: VerifiedGuard
 * reads the account SessionGuard attaches.
 *
 * Declared once on the controller rather than per route, because a guard each
 * new endpoint has to remember is one a new endpoint will forget. The public
 * guest-menu routes live in PublicMenusController and are deliberately
 * untouched — a diner is not an account.
 */
@Controller('menus')
@UseGuards(SessionGuard, VerifiedGuard)
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

  @Post(':menuId/sections/:sectionId/items/:itemId/duplicate')
  @HttpCode(HttpStatus.CREATED)
  async duplicateItem(
    @Req() request: Request,
    @Param('menuId', UuidParam) menuId: string,
    @Param('sectionId', UuidParam) sectionId: string,
    @Param('itemId', UuidParam) itemId: string,
  ): Promise<{ item: ItemView }> {
    return {
      item: await this.menus.duplicateItem(this.accountId(request), menuId, sectionId, itemId),
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

  /**
   * A dish's photograph (feature 006).
   *
   * Its own endpoint rather than a field on the item PATCH, so an ordinary text
   * edit stays an ordinary JSON request: folding a file into it would make
   * every price change a multipart upload, and would mix two failure domains in
   * one call.
   */
  @Put(':menuId/sections/:sectionId/items/:itemId/image')
  @HttpCode(HttpStatus.OK)
  @ImageUpload()
  async putItemImage(
    @Req() request: Request,
    @Param('menuId', UuidParam) menuId: string,
    @Param('sectionId', UuidParam) sectionId: string,
    @Param('itemId', UuidParam) itemId: string,
    @UploadedFile() file: UploadedImage | undefined,
    @Body() crop: CropDto,
  ): Promise<{ item: ItemView }> {
    const upload = requireFile(file);
    return {
      item: await this.menus.setItemImage(
        this.accountId(request),
        menuId,
        sectionId,
        itemId,
        upload.buffer,
        toCropRect(crop),
      ),
    };
  }

  /** Idempotent: a dish with no photograph is already in the state asked for. */
  @Delete(':menuId/sections/:sectionId/items/:itemId/image')
  @HttpCode(HttpStatus.OK)
  async removeItemImage(
    @Req() request: Request,
    @Param('menuId', UuidParam) menuId: string,
    @Param('sectionId', UuidParam) sectionId: string,
    @Param('itemId', UuidParam) itemId: string,
  ): Promise<{ item: ItemView }> {
    return {
      item: await this.menus.removeItemImage(
        this.accountId(request),
        menuId,
        sectionId,
        itemId,
      ),
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
