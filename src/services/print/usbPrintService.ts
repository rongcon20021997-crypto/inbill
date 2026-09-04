import { BillPrintProps, KitchenBillPrintProps, PrintResult } from '../../types/printer';
import { generateEscPosBill, generateEscPosKitchenBill, generateEscPosTestSlip } from '../../utils/escpos';

const USB_VENDOR_ID_KEY = 'inbill_usb_vendor_id';
const USB_PRODUCT_ID_KEY = 'inbill_usb_product_id';
const USB_DEVICE_NAME_KEY = 'inbill_usb_device_name';

/**
 * Kiểm tra xem trình duyệt có hỗ trợ WebUSB API không
 */
export function isWebUsbSupported(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator;
}

/**
 * Kiểm tra chi tiết trạng thái môi trường hỗ trợ WebUSB
 */
export function checkWebUsbStatus(): { supported: boolean; reason?: string } {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'Môi trường Server không hỗ trợ WebUSB' };
  }
  if (!window.isSecureContext) {
    return {
      supported: false,
      reason: 'WebUSB yêu cầu kết nối bảo mật (HTTPS hoặc localhost). Hiện tại đang truy cập qua kết nối không an toàn.',
    };
  }
  if (!('usb' in navigator)) {
    return {
      supported: false,
      reason: 'Trình duyệt hiện tại không hỗ trợ WebUSB API. Vui lòng sử dụng Google Chrome hoặc Edge phiên bản 61+.',
    };
  }
  return { supported: true };
}

/**
 * Lấy thiết bị USB máy in đã được người dùng cấp quyền trước đó
 */
export async function getPairedUsbPrinter(): Promise<any | null> {
  if (!isWebUsbSupported()) return null;
  try {
    const devices = await (navigator as any).usb.getDevices();
    if (!devices || devices.length === 0) return null;

    const storedVendor = localStorage.getItem(USB_VENDOR_ID_KEY);
    const storedProduct = localStorage.getItem(USB_PRODUCT_ID_KEY);

    if (storedVendor && storedProduct) {
      const vId = parseInt(storedVendor, 10);
      const pId = parseInt(storedProduct, 10);
      const matched = devices.find((d: any) => d.vendorId === vId && d.productId === pId);
      if (matched) return matched;
    }

    // Nếu không khớp chính xác, trả về thiết bị USB đầu tiên đã ghép nối
    return devices[0];
  } catch (err) {
    console.error('Lỗi khi lấy thiết bị USB đã ghép nối:', err);
    return null;
  }
}

/**
 * Mở popup trình duyệt Chrome để người dùng chọn máy in USB
 */
export async function requestUsbPrinter(): Promise<any> {
  if (!isWebUsbSupported()) {
    throw new Error('Trình duyệt không hỗ trợ WebUSB API');
  }
  try {
    // Không truyền filter để hiển thị tất cả thiết bị USB được cắm vào
    const device = await (navigator as any).usb.requestDevice({ filters: [] });
    if (device) {
      localStorage.setItem(USB_VENDOR_ID_KEY, device.vendorId?.toString() || '');
      localStorage.setItem(USB_PRODUCT_ID_KEY, device.productId?.toString() || '');
      localStorage.setItem(
        USB_DEVICE_NAME_KEY,
        device.productName || `USB Device (${device.vendorId?.toString(16)}:${device.productId?.toString(16)})`
      );
    }
    return device;
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      throw new Error('Người dùng đã hủy chọn thiết bị USB');
    }
    throw err;
  }
}

/**
 * Gửi lệnh ESC/POS qua chu trình WebUSB Bulk Transfer
 */
export async function sendEscPosToUsbDevice(device: any, dataBuffer: Uint8Array): Promise<void> {
  try {
    if (!device.opened) {
      await device.open();
    }

    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }

    // Tìm Interface và Endpoint Bulk OUT (Direction: out, Type: bulk)
    let targetInterface: any = null;
    let targetEndpoint: any = null;

    for (const iface of device.configuration.interfaces) {
      for (const alt of iface.alternates) {
        // Tìm endpoint gửi dữ liệu (OUT) kiểu BULK
        const outEndpoint = alt.endpoints.find(
          (ep: any) => ep.direction === 'out' && ep.type === 'bulk'
        );
        if (outEndpoint) {
          targetInterface = iface;
          targetEndpoint = outEndpoint;
          break;
        }
      }
      if (targetEndpoint) break;
    }

    if (!targetInterface || !targetEndpoint) {
      throw new Error('Không tìm thấy Endpoint BULK OUT phù hợp trên thiết bị USB này.');
    }

    const interfaceNumber = targetInterface.interfaceNumber;

    // Chiếm quyền interface
    try {
      await device.claimInterface(interfaceNumber);
    } catch (claimErr: any) {
      throw new Error(
        `Không thể chiếm quyền USB Interface (${claimErr.message}). ` +
        `Gợi ý: Trên Windows nếu Driver máy in đang chặn cổng độc quyền, hãy dùng công cụ Zadig chuyển sang WinUSB hoặc sử dụng chế độ Cổng COM (Serial).`
      );
    }

    try {
      // Chia nhỏ dữ liệu thành chunks 512 bytes
      const CHUNK_SIZE = 512;
      for (let offset = 0; offset < dataBuffer.length; offset += CHUNK_SIZE) {
        const chunk = dataBuffer.slice(offset, offset + CHUNK_SIZE);
        await device.transferOut(targetEndpoint.endpointNumber, chunk);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    } finally {
      try {
        await device.releaseInterface(interfaceNumber);
      } catch {
        // Bỏ qua lỗi release
      }
      try {
        await device.close();
      } catch {
        // Bỏ qua lỗi close
      }
    }
  } catch (err: any) {
    throw err;
  }
}

/**
 * Thực hiện in hoá đơn thanh toán qua WebUSB
 */
export async function printBillViaUsb(data: BillPrintProps): Promise<PrintResult> {
  try {
    const status = checkWebUsbStatus();
    if (!status.supported) {
      return { success: false, message: status.reason || 'WebUSB không được hỗ trợ', method: 'usb' };
    }

    let device = await getPairedUsbPrinter();
    if (!device) {
      device = await requestUsbPrinter();
    }

    const buffer = generateEscPosBill(data);
    await sendEscPosToUsbDevice(device, buffer);

    return {
      success: true,
      message: `In hóa đơn thành công qua USB (${device.productName || 'Thermal Printer'})`,
      method: 'usb',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Lỗi in USB: ${err.message || 'Không xác định'}`,
      method: 'usb',
    };
  }
}

/**
 * In phiếu bếp qua WebUSB
 */
export async function printKitchenBillViaUsb(data: KitchenBillPrintProps): Promise<PrintResult> {
  try {
    const status = checkWebUsbStatus();
    if (!status.supported) {
      return { success: false, message: status.reason || 'WebUSB không được hỗ trợ', method: 'usb' };
    }

    let device = await getPairedUsbPrinter();
    if (!device) {
      device = await requestUsbPrinter();
    }

    const buffer = generateEscPosKitchenBill(data);
    await sendEscPosToUsbDevice(device, buffer);

    return {
      success: true,
      message: `In phiếu bếp thành công qua USB (${device.productName || 'Kitchen Printer'})`,
      method: 'usb',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Lỗi in phiếu bếp USB: ${err.message || 'Không xác định'}`,
      method: 'usb',
    };
  }
}

/**
 * Bắn lệnh in kiểm tra qua cổng USB
 */
export async function testUsbPrinter(): Promise<PrintResult> {
  try {
    const status = checkWebUsbStatus();
    if (!status.supported) {
      return { success: false, message: status.reason || 'WebUSB không được hỗ trợ', method: 'usb' };
    }

    let device = await getPairedUsbPrinter();
    if (!device) {
      device = await requestUsbPrinter();
    }

    const info = device.productName || `VID:${device.vendorId?.toString(16)} PID:${device.productId?.toString(16)}`;
    const buffer = generateEscPosTestSlip('CAP USB TRUC TIEP (WEBUSB)', info);
    await sendEscPosToUsbDevice(device, buffer);

    return {
      success: true,
      message: `In thử nghiệm thành công qua USB (${info})`,
      method: 'usb',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `In thử nghiệm USB thất bại: ${err.message || 'Lỗi không xác định'}`,
      method: 'usb',
    };
  }
}
