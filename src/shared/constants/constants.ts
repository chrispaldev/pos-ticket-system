export const MESSAGES = {
  ACCOUNT_DISABLED: 'Account disabled',
  INVALID_PAYMENT_METHOD: 'Invalid payment method',
  INVALID_PAYMENT_METHODS: 'Invalid payment methods',
  INVALID_CREDENTIALS: 'Invalid credentials',
  INVALID_REFRESH_TOKEN: 'Invalid refresh token',
  EXPIRED_REFRESH_TOKEN: 'Expired refresh token',
  INSUFFICIENT_PERMISSION: 'Insufficient permission',
  INCORRECT_PASSWORD: 'Password is incorrect',
  RFID_CARD_DISABLED: 'RFID card is disabled',
  RFID_CARD_NOT_PURCHASED: 'RFID card is not purchased',
  RFID_CARD_ALREADY_PURCHASED: 'RFID card is already purchased',
  RFID_CARD_LOW_CREDITS: 'RFID card has low credits',
  RFID_CARD_MUST_BE_PURCHASED: 'RFID card must be purchased before adding credits',
  RFID_CARD_INVALID_DETAILS: 'RFID card details are invalid',
  REFUND_REQ_ALREADY_SUBMITTED: 'Refund request is already submitted',
  DUPLICATE_TRACK_IDS: 'Track IDs are duplicate',
  INVALID_TRACK_ID: 'Invalid track ID',
  TERMINAL_NOT_LINKED: 'Terminal is not linked',
  QR_VOUCHER_ALREADY_REDEEMED: 'QR Voucher is already redeemed',
  ENTITY_DOES_NOT_EXIST: 'Entity does not exist',
  INTERNAL_SERVER_ERROR: 'Internal server error occured',
};

export const GENERAL_DATA = {
  cashCardWebUrl: 'https://cashcard.trichter.nl/1',
  webshopUrl: 'https://curling.magischmaastrichtvrijthof.nl/checkout',
  censoredLocations: ['6345f10cc79b1c420066a612'],
  terminalPaymentMethodId: 1927,
}

export const RFID_SETTINGS = {
  purchasePrice: 1,
  refundPrice: 2.9,
  euroToCredit: 0.344827,
  creditToEuro: 2.9,
}

export const MENUS = [
  { id: 'topseller', label: 'Top Sellers' },
  { id: 'rfidcard', label: 'RFID Card' },
  { id: 'qrvoucher', label: 'QR Voucher' },
  { id: 'event', label: 'Event' },
  { id: '632b48482fb11ad6d25f06a3', label: 'Bar' },
  { id: '632c747c44e68c0a6b5b5fa6', label: 'Keuken' },
  { id: '63465ea4c79b1c420066a7be', label: 'SJOKOHUIS' },
  { id: '63465eb9c79b1c420066a7c2', label: 'Frieten' },
  { id: '63465ec6c79b1c420066a7c6', label: 'Perfume' },
  { id: '63469d67c79b1c420066ab78', label: 'Kippen gril' },
]
