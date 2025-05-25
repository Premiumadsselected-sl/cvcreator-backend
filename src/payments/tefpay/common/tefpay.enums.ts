export enum TefpayTransactionType {
  // Client Present initiated
  PAYMENT_STANDARD = "201",
  PREAUTHORIZATION = "202",
  AUTHENTICATION = "203",
  SUBSCRIPTION_SETUP = "6",
  PHONE_PAYMENT = "11",
  CARD_VALIDATION = "19", // Document title: "Validación de tarjeta de crédito/débito"
  STORE_CARD = "21",
  NO_3DS_PAYMENT = "22",
  TRANSFER_PAYMENT = "41",
  NO_3DS_PAYMENT_ONLINE = "27", // Listed as a client initiated type in one table, though not in primary list of Ds_Merchant_TransactionType for requests.

  // Client Absent / Merchant Initiated
  REFUND = "4",
  REFUND_ONLINE = "204",
  PREAUTHORIZATION_CONFIRMATION = "207",
  AUTHENTICATION_CONFIRMATION = "209",
  RECURRING_PAYMENT = "208",
  PREAUTHORIZATION_CANCEL = "218",
  DEFERRED_PREAUTHORIZATION = "216", // Document title: "Preautorización diferida"
  AVS_VALIDATION = "33", // Document title: "Validacion AVS importe cero" / "Validacion AVS"

  // Other types mentioned in documentation
  TOTALS_QUERY = "210", // Consulta de totales
  RECURRING_PAYMENT_STRIPE = "25", // Cobro recurrente con Stripe
  NO_ACS_AUTHENTICATION_PAYMENT = "227", // Cobro sin autenticación ACS
}

export enum TefpayLanguage {
  ENGLISH = "en",
  SPANISH = "es",
  FRENCH = "fr",
  RUSSIAN = "ru",
  CATALAN = "ca",
  CZECH = "cs",
  ITALIAN = "it",
  GERMAN = "de",
  PORTUGUESE = "pt",
  POLISH = "pl",
  DANISH = "da",
}

export enum TefpayCurrency {
  EUR = "978", // Euro
  USD = "840", // Dólar
  GBP = "826", // Libra Esterlina
  CAD = "124", // Dólar canadiense
  JPY = "392", // Yen
  // Doc lists "032 – Austral Argentino". ARS (Argentine Peso) is 032. Austral is historic.
  ARS = "032",
  // Doc lists "052 – Peso Chileno". ISO 4217 for CLP is 152. Barbados Dollar (BBD) is 052.
  // Sticking to doc value "052" for "Peso Chileno" as per instruction, despite likely typo.
  CLP_FROM_DOC = "052",
  COP = "170", // Peso Colombiano
  INR = "356", // Rupia India
  MXN = "484", // Nuevo Peso Mejicano
  PEN = "604", // Nuevos Soles
  CHF = "756", // Franco Suizo
  BRL = "986", // Real Brasileño
  // Doc lists "937 – Bolívar Venezolano". VEF is historic, current is VES (928).
  VEF_FROM_DOC = "937",
  TRY = "949", // Lira Turca
}

export enum TefpayTemplateNumber {
  CREDIT_DEBIT_DEFAULT = "00",
  BANK_TRANSFER = "01",
  CREDIT_DEBIT_WITH_CONDITIONS = "02",
  CREDIT_DEBIT_AMOUNT_ON_TEFPAY = "03",
  CREDIT_DEBIT_FULL_CART = "04",
  RENEW_CARD = "05",
}

export enum TefpayBooleanLike {
  YES = "S",
  NO = "N",
}
