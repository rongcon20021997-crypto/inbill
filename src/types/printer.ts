export type PrinterMethod = 'serial' | 'usb' | 'ip' | 'browser';

export interface BillItem {
  id?: string | number;
  name: string;
  quantity: number;
  price: number;
  total?: number;
  note?: string;
  toppings?: Array<{ name: string; price: number }>;
}

export interface BillPrintProps {
  storeName: string;
  storeAddress: string;
  branchAddresses?: string[];
  hotline: string;
  billCode: string;
  tableName?: string;
  orderType?: string;
  cashier: string;
  customerName?: string;
  orderTime: string;
  items: BillItem[];
  subtotal: number;
  discount?: number;
  discountNote?: string;
  vat?: number;
  total: number;
  customerPay?: number;
  change?: number;
  paymentMethod?: string;
  qrCodeUrl?: string;
  footerNotes?: string;
  wifiInfo?: {
    ssid: string;
    pass: string;
  };
}

export interface KitchenItem {
  name: string;
  quantity: number;
  note?: string;
  options?: string[];
}

export interface KitchenBillPrintProps {
  orderCode: string;
  tableName: string;
  orderTime: string;
  items: KitchenItem[];
  note?: string;
  printTime?: string;
}

export interface PrinterConfig {
  defaultMethod: PrinterMethod;
  baudRate: number;
  billPrinterIp: string;
  kitchenPrinterIp: string;
  printerPort: number;
  autoFallback: boolean;
  openCashDrawer: boolean;
  autoCut: boolean;
  paperWidth: number; // 48 for 80mm, 32 for 58mm
  usbVendorId?: number;
  usbProductId?: number;
  usbDeviceName?: string;
  serialPortName?: string;
}

export interface PrintResult {
  success: boolean;
  message: string;
  method?: PrinterMethod;
  fallbackUsed?: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warn' | 'error';
  method?: PrinterMethod;
  message: string;
  details?: string;
}
