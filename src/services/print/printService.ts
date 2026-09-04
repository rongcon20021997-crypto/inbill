import { BillPrintProps, KitchenBillPrintProps, PrintResult, PrinterConfig } from '../../types/printer';

const PRINTER_CONFIG_KEY = 'inbill_printer_config';

const DEFAULT_CONFIG: PrinterConfig = {
  defaultMethod: 'browser',
  baudRate: 9600,
  billPrinterIp: '192.168.1.200',
  kitchenPrinterIp: '192.168.1.201',
  printerPort: 9100,
  autoFallback: true,
  openCashDrawer: true,
  autoCut: true,
  paperWidth: 48,
};

/**
 * Lấy cấu hình máy in từ localStorage hoặc fallback biến môi trường / mặc định
 */
export function getStoredPrinterConfig(): PrinterConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(PRINTER_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (e) {
    console.error('Không thể đọc cấu hình máy in từ localStorage:', e);
  }
  return DEFAULT_CONFIG;
}

/**
 * Lưu cấu hình máy in vào localStorage
 */
export function savePrinterConfig(config: Partial<PrinterConfig>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredPrinterConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(PRINTER_CONFIG_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Không thể lưu cấu hình máy in:', e);
  }
}

/**
 * Gửi lệnh in hoá đơn thanh toán qua Mạng LAN / IP
 */
export async function printBillViaIp(data: BillPrintProps, customIp?: string): Promise<PrintResult> {
  const config = getStoredPrinterConfig();
  const ip = customIp || config.billPrinterIp;
  const port = config.printerPort || 9100;

  if (!ip) {
    return {
      success: false,
      message: 'Chưa cấu hình địa chỉ IP máy in hoá đơn thu ngân',
      method: 'ip',
    };
  }

  try {
    const res = await fetch('/api/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'bill',
        data,
        printerIp: ip,
        printerPort: port,
      }),
    });

    const result = await res.json();
    return {
      success: result.success,
      message: result.message || (result.success ? `Đã in thành công tới máy in ${ip}` : 'In thất bại'),
      method: 'ip',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Lỗi kết nối mạng tới máy chủ in: ${err.message || 'Không có kết nối'}`,
      method: 'ip',
    };
  }
}

/**
 * Gửi lệnh in phiếu order báo bếp qua Mạng LAN / IP
 */
export async function printKitchenBillViaIp(data: KitchenBillPrintProps, customIp?: string): Promise<PrintResult> {
  const config = getStoredPrinterConfig();
  const ip = customIp || config.kitchenPrinterIp || config.billPrinterIp;
  const port = config.printerPort || 9100;

  if (!ip) {
    return {
      success: false,
      message: 'Chưa cấu hình địa chỉ IP máy in bếp',
      method: 'ip',
    };
  }

  try {
    const res = await fetch('/api/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'kitchen',
        data,
        printerIp: ip,
        printerPort: port,
      }),
    });

    const result = await res.json();
    return {
      success: result.success,
      message: result.message || (result.success ? `Đã gửi phiếu chế biến tới máy in bếp ${ip}` : 'In thất bại'),
      method: 'ip',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Lỗi kết nối mạng tới máy chủ in bếp: ${err.message || 'Không có kết nối'}`,
      method: 'ip',
    };
  }
}

/**
 * Kiểm tra kết nối tới máy in mạng LAN (Bắn lệnh test in)
 */
export async function testPrinterConnection(ip: string, port = 9100): Promise<PrintResult> {
  if (!ip) {
    return {
      success: false,
      message: 'Vui lòng nhập địa chỉ IP máy in cần kiểm tra',
      method: 'ip',
    };
  }

  try {
    const res = await fetch('/api/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'test',
        printerIp: ip,
        printerPort: port,
      }),
    });

    const result = await res.json();
    return {
      success: result.success,
      message: result.message || (result.success ? `Kết nối máy in IP ${ip}:${port} thành công` : 'Không phản hồi'),
      method: 'ip',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Lỗi kiểm tra máy in IP: ${err.message || 'Không thể kết nối máy chủ'}`,
      method: 'ip',
    };
  }
}
