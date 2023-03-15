import { Test, TestingModule } from '@nestjs/testing';
import { KitchenController } from '../kitchen.controller';
import { KitchenService } from '../kitchen.service';

describe('KitchenController', () => {
  let controller: KitchenController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KitchenController],
      providers: [KitchenService],
    }).compile();

    controller = module.get<KitchenController>(KitchenController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
