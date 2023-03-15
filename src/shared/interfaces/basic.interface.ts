export interface ErrorResponse {
  message: string | object
  statusCode: number
  error: string
}

export interface UserSession {
  sub: string;
  id: string;
  name: string;
  username: string;
  locationId?: string;
  role: string;
}

export enum Role {
  SuperAdmin = 'superadmin',
  Admin = 'admin',
  User = 'user',
  All = 'all',
}

export enum AccountStatus {
  Enabled = 'enabled',
  Disabled = 'disabled',
}

export enum PaymentMethod {
  Cash = 'Cash',
  Pin = 'Pin',
  Coupons = 'Coupons',
  RFIDCard = 'RFID Card',
  RepresentationGift = 'Representation Gift',
  EmployeeGift = 'Employee Gift',
}

export enum AllPaymentMethod {
  Cash = 'Cash',
  Pin = 'Pin',
  Coupons = 'Coupons',
  RFIDCard = 'RFID Card',
  RepresentationGift = 'Representation Gift',
  EmployeeGift = 'Employee Gift',
  Ideal = 'iDEAL',
  Bancontact = 'Bancontact',
  VisaMastercard = 'VisaMastercard',
  UnKnown = 'UnKnown',
}

export enum OnlinePaymentMethod {
  Ideal = 'iDEAL',
  Bancontact = 'Bancontact',
  VisaMastercard = 'VisaMastercard'
}

export enum OnlinePaymentMethodID {
  iDEAL = 10,
  Bancontact = 436,
  VisaMastercard = 706
}