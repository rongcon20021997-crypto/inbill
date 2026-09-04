import { BillPrintProps, KitchenBillPrintProps, PrintResult } from '../../types/printer';
import { generateEscPosBill, generateEscPosKitchenBill, generateEscPosTestSlip } from '../../utils/escpos';

const BAUD_RATE_KEY = 'inbill_serial_baud_rate';
const DEFAULT_BAUD_RATE = 9600;

/**
 * Kiểm tra xem trình duyệt có hỗ trợ Web Serial API không
 */
export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

/**
 * Kiểm tra chi tiết trạng thái môi trường hỗ trợ Web Serial
 */
export function checkWebSerialStatus(): { supported: boolean; reason?: string } {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'Môi trường Server không hỗ trợ Web Serial' };
  }
  if (!window.isSecureContext) {
    return {
      supported: false,
      reason: 'Web Serial yêu cầu kết nối bảo mật (HTTPS hoặc localhost). Hiện tại đang truy cập qua kết nối không an toàn.',
    };
  }
  if (!('serial' in navigator)) {
    return {
      supported: false,
      reason: 'Trình duyệt hiện tại không hỗ trợ Web Serial API. Vui lòng sử dụng Google Chrome, Edge hoặc Cốc Cốc phiên bản 89+.',
    };
  }
  return { supported: true };
}

/**
 * Lấy Baud Rate từ localStorage
 */
export function getStoredBaudRate(): number {
  if (typeof window === 'undefined') return DEFAULT_BAUD_RATE;
  const stored = localStorage.getItem(BAUD_RATE_KEY);
  if (stored) {
    const val = parseInt(stored, 10);
    if (!isNaN(val)) return val;
  }
  return DEFAULT_BAUD_RATE;
}

/**
 * Lưu Baud Rate vào localStorage
 */
export function saveStoredBaudRate(baudRate: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BAUD_RATE_KEY, baudRate.toString());
}

/**
 * Lấy cổng COM đã được người dùng cấp quyền trước đó
 */
export async function getPairedSerialPort(): Promise<any | null> {
  if (!isWebSerialSupported()) return null;
  try {
    const ports = await (navigator as any).serial.getPorts();
    if (ports && ports.length > 0) {
      return ports[0];
    }
  } catch (err) {
    console.error('Lỗi khi lấy danh sách cổng COM đã ghép nối:', err);
  }
  return null;
}

/**
 * Mở hộp thoại yêu cầu người dùng chọn cổng COM (VD: COM3, COM4,...)
 */
export async function requestSerialPort(): Promise<any> {
  if (!isWebSerialSupported()) {
    throw new Error('Trình duyệt không hỗ trợ Web Serial API');
  }
  try {
    const port = await (navigator as any).serial.requestPort();
    return port;
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      throw new Error('Người dùng đã hủy chọn cổng COM');
    }
    throw err;
  }
}

/**
 * Quên / Xóa quyền tất cả cổng COM đã lưu trong trình duyệt để chọn lại từ đầu
 */
export async function forgetAllSerialPorts(): Promise<void> {
  if (!isWebSerialSupported()) return;
  try {
    const ports = await (navigator as any).serial.getPorts();
    for (const port of ports) {
      // Đóng port nếu đang mở
      try {
        if (port.readable || port.writable) {
          await port.close();
        }
      } catch {
        // Bỏ qua
      }
      if (typeof port.forget === 'function') {
        await port.forget();
      }
    }
  } catch (err) {
    console.error('Lỗi khi xóa cổng COM đã ghép nối:', err);
  }
}

/**
 * Mở cổng COM, gửi buffer theo chunk 512 bytes và đóng cổng giải phóng khóa
 */
export async function sendEscPosToSerialPort(
  port: any,
  dataBuffer: Uint8Array,
  customBaudRate?: number
): Promise<void> {
  const baudRate = customBaudRate || getStoredBaudRate();

  // Kiểm tra xem cổng đã được mở từ phiên trước hay chưa
  const isOpen = Boolean(port.readable || port.writable);

  if (!isOpen) {
    try {
      // Mở kết nối serial với baudRate
      await port.open({
        baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
      });
    } catch (err: any) {
      const msg = err.message || '';
      if (!msg.includes('already open')) {
        let diagnostic = '';
        if (msg.includes('Failed to open serial port') || err.name === 'NetworkError') {
          diagnostic =
            ' -> NGUYÊN NHÂN: Cổng COM này đang bị Driver máy in Windows (Print Spooler) hoặc ứng dụng khác chiếm giữ độc quyền, HOẶC bạn đã chọn nhầm cổng COM bo mạch (như COM1). Hãy bấm nút "Chọn lại Cổng COM" hoặc chuyển sang tab "Cáp USB" / "Trình duyệt".';
        }
        throw new Error(`Không thể mở cổng COM (${baudRate} baud): ${msg}${diagnostic}`);
      }
    }
  }

  if (!port.writable) {
    throw new Error('Cổng COM không có luồng ghi (writable stream)');
  }

  const writer = port.writable.getWriter();

  try {
    // Chia nhỏ dữ liệu thành các chunk 512 bytes để không làm tràn bộ đệm máy in nhiệt
    const CHUNK_SIZE = 512;
    for (let offset = 0; offset < dataBuffer.length; offset += CHUNK_SIZE) {
      const chunk = dataBuffer.slice(offset, offset + CHUNK_SIZE);
      await writer.write(chunk);
      // Giảm tải áp lực truyền nhận
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
  } finally {
    try {
      writer.releaseLock();
    } catch {
      // Bỏ qua lỗi nếu lock đã được giải phóng
    }
    try {
      await port.close();
    } catch {
      // Bỏ qua lỗi đóng cổng
    }
  }
}

/**
 * Thực hiện in hoá đơn thanh toán qua Cổng COM
 */
export async function printBillViaSerial(data: BillPrintProps): Promise<PrintResult> {
  try {
    const status = checkWebSerialStatus();
    if (!status.supported) {
      return { success: false, message: status.reason || 'Web Serial không được hỗ trợ', method: 'serial' };
    }

    let port = await getPairedSerialPort();
    if (!port) {
      port = await requestSerialPort();
    }

    const buffer = generateEscPosBill(data);
    await sendEscPosToSerialPort(port, buffer);

    return {
      success: true,
      message: 'In hóa đơn thành công qua Cổng COM (Web Serial)',
      method: 'serial',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Lỗi in Cổng COM: ${err.message || 'Không xác định'}`,
      method: 'serial',
    };
  }
}

/**
 * In phiếu chế biến bếp qua Cổng COM
 */
export async function printKitchenBillViaSerial(data: KitchenBillPrintProps): Promise<PrintResult> {
  try {
    const status = checkWebSerialStatus();
    if (!status.supported) {
      return { success: false, message: status.reason || 'Web Serial không được hỗ trợ', method: 'serial' };
    }

    let port = await getPairedSerialPort();
    if (!port) {
      port = await requestSerialPort();
    }

    const buffer = generateEscPosKitchenBill(data);
    await sendEscPosToSerialPort(port, buffer);

    return {
      success: true,
      message: 'In phiếu bếp thành công qua Cổng COM',
      method: 'serial',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Lỗi in phiếu bếp COM: ${err.message || 'Không xác định'}`,
      method: 'serial',
    };
  }
}

/**
 * In mẫu test kiểm tra kết nối Cổng COM
 */
export async function testSerialPrinter(): Promise<PrintResult> {
  try {
    const status = checkWebSerialStatus();
    if (!status.supported) {
      return { success: false, message: status.reason || 'Web Serial không được hỗ trợ', method: 'serial' };
    }

    // Yêu cầu chọn cổng hoặc lấy cổng đã có
    let port = await getPairedSerialPort();
    if (!port) {
      port = await requestSerialPort();
    }

    const baudRate = getStoredBaudRate();
    const buffer = generateEscPosTestSlip('CONG COM (SERIAL)', `Baud Rate: ${baudRate} bps`);
    await sendEscPosToSerialPort(port, buffer);

    return {
      success: true,
      message: `In thử nghiệm thành công qua Cổng COM (${baudRate} bps)`,
      method: 'serial',
    };
  } catch (err: any) {
    const rawMsg = err.message || 'Lỗi không xác định';
    let suggestion = '';
    if (rawMsg.includes('Failed to open serial port')) {
      suggestion = ' 👉 Khắc phục: Bạn đang chọn nhầm cổng (như COM1 bo mạch), hoặc Driver Windows đang chiếm cổng. Hãy mở "Cài Đặt Máy In" -> bấm "Đổi / Chọn Lại COM" để chọn đúng cổng máy in (COM3, COM4...), hoặc chuyển sang tab "Trình duyệt (Kiosk)" / "Cáp USB".';
    }
    return {
      success: false,
      message: `In thử nghiệm Cổng COM thất bại: ${rawMsg}${suggestion}`,
      method: 'serial',
    };
  }
}
