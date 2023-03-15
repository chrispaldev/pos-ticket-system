import { Injectable } from '@nestjs/common';
import { LocationService } from '../location';
import { UserService } from '../user';
import { CategoryService } from '../category';
import { ProductService } from '../product';
import { EventService } from '../event';
import { RFIDCardService } from '../rfidcard';
import { OrderService } from '../order';
import { TransactionService } from '../transaction';
import { Role } from '../shared/interfaces';

@Injectable()
export class StatService {
  constructor(
    private readonly locationService: LocationService,
    private readonly userService: UserService,
    private readonly categoryService: CategoryService,
    private readonly productService: ProductService,
    private readonly eventService: EventService,
    private readonly rfidCardService: RFIDCardService,
    private readonly orderService: OrderService,
    private readonly transactionService: TransactionService,
  ) {}

  async countAllStats(role: Role) {
    const [
      // locationsCount, 
      // usersCount, 
      // categoriesCount, 
      // productsCount, 
      // eventsCount, 
      // rfidCardsCount, 
      rfidCardsStats,
      ordersStats,
      freezingOrdersCount,
      dealsCount,
      rfidOrdersStats,
      turnoverStats,
    ] = await Promise.all([
      // this.locationService.estimatedCount(),
      // this.userService.estimatedCount(),
      // this.categoryService.estimatedCount(),
      // this.productService.estimatedCount(),
      // this.eventService.estimatedCount(),
      // this.rfidCardService.estimatedCount(),
      this.rfidCardService.getRFIDCardsStats(),
      this.transactionService.getOrdersStats(),
      this.orderService.estimatedCountFreezeOrders(),
      this.transactionService.countDeals(),
      this.transactionService.getRFIDOrdersStats(),
      this.transactionService.getTurnoverStats(),
    ])
    return {
      countStats: {
        // locationsCount, 
        // usersCount, 
        // categoriesCount, 
        // productsCount, 
        // eventsCount, 
        // rfidCardsCount,
        purchasedRFIDCardsCount: rfidCardsStats.totalPurchased,
        activeRFIDCardsCredits: rfidCardsStats.totalCredits, 
        ordersCount: ordersStats.totalOrders,
        ordersByRFIDCount: ordersStats.totalOrdersByRFID,
        freezingOrdersCount,
        dealsCount,
        rfidPurchaseAmount: rfidOrdersStats.totalPurchaseAmount,
        rfidTopupAmount: rfidOrdersStats.totalTopupAmount,
        actualCashTurnover: role === Role.SuperAdmin ? turnoverStats.actualCashTurnover : 0,
        cashTurnover: turnoverStats.cashTurnover,
        pinTurnover: turnoverStats.pinTurnover,
        onlineTurnover: turnoverStats.onlineTurnover,
        totalTurnover: turnoverStats.totalTurnover,
        actualTotalTurnover: turnoverStats.actualTotalTurnover,
      }
    }
  }
}
