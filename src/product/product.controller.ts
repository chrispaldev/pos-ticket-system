import { Controller, Get, Post, Body, Patch, Param, Delete, Res, UseGuards, Query } from '@nestjs/common';
import { ApiOperation, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto, ListProductDto, ExportProductDto } from './dto';
import { Roles } from '../shared/decorators';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Role } from '../shared/interfaces';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('product')
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @ApiOperation({ summary: 'Create Product' })
  @Roles(Role.Admin)
  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  @ApiOperation({ summary: 'Update Product' })
  @Roles(Role.Admin)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(id, updateProductDto);
  }

  @ApiOperation({ summary: 'Delete Product' })
  @Roles(Role.Admin)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.productService.delete(id);
  }

  @ApiOperation({ summary: 'Get Product' })
  @Roles(Role.Admin)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.productService.get(id);
  }

  @ApiOperation({ summary: 'List Products' })
  @Roles(Role.Admin)
  @Get('list/all')
  list(@Query() listProductDto: ListProductDto) {
    return this.productService.list(listProductDto);
  }

  @ApiOperation({ summary: 'Export Products' })
  @Roles(Role.Admin)
  @Get('export/all')
  export(@Query() exportProductDto: ExportProductDto, @Res() response: Response) {
    this.productService.export(exportProductDto, response);
  }
}
