import { Test, TestingModule } from '@nestjs/testing';
import { RFIDCardController } from '../rfidcard.controller';
import { RFIDCardService } from '../rfidcard.service';

describe('RFIDCardController', () => {
  let controller: RFIDCardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RFIDCardController],
      providers: [RFIDCardService],
    }).compile();

    controller = module.get<RFIDCardController>(RFIDCardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
