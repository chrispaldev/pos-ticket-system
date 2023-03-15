import { Controller, Get, Post, Body, Patch, Param, Delete, Res, UseGuards, Query } from '@nestjs/common';
import { ApiOperation, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto, ListCategoryDto, ExportCategoryDto } from './dto';
import { Roles } from '../shared/decorators';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Role } from '../shared/interfaces';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('category')
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiOperation({ summary: 'Create Category' })
  @Roles(Role.Admin)
  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @ApiOperation({ summary: 'Update Category' })
  @Roles(Role.Admin)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @ApiOperation({ summary: 'Delete Category' })
  @Roles(Role.Admin)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.categoryService.delete(id);
  }

  @ApiOperation({ summary: 'Get Category' })
  @Roles(Role.Admin)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.categoryService.get(id);
  }

  @ApiOperation({ summary: 'List Categories' })
  @Roles(Role.Admin)
  @Get('list/all')
  list(@Query() listCategoryDto: ListCategoryDto) {
    return this.categoryService.list(listCategoryDto);
  }

  @ApiOperation({ summary: 'Export Categories' })
  @Roles(Role.Admin)
  @Get('export/all')
  export(@Query() exportCategoryDto: ExportCategoryDto, @Res() response: Response) {
    this.categoryService.export(exportCategoryDto, response);
  }
}
