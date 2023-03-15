import { Test, TestingModule } from '@nestjs/testing';
import { RFIDCardService } from '../rfidcard.service';

describe('RFIDCardService', () => {
  let service: RFIDCardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RFIDCardService],
    }).compile();

    service = module.get<RFIDCardService>(RFIDCardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
