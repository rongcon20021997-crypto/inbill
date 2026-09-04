import { NextResponse } from 'next/server';
import net from 'net';
import { generateEscPosBill, generateEscPosKitchenBill, generateEscPosTestSlip } from '@/utils/escpos';

/**
 * Gửi mảng byte ESC/POS tới máy in nhiệt qua RAW TCP Socket (cổng 9100)
 */
function sendToPrinter(
  ip: string,
  port: number,
  buffer: Uint8Array,
  timeoutMs = 4000
): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    const client = new net.Socket();
    let isHandled = false;

    const cleanup = () => {
      if (!client.destroyed) {
        client.destroy();
      }
    };

    client.setTimeout(timeoutMs);

    client.connect(port, ip, () => {
      // Kết nối thành công, ghi dữ liệu buffer xuống socket
      client.write(Buffer.from(buffer), (writeErr) => {
        if (writeErr) {
          if (!isHandled) {
            isHandled = true;
            cleanup();
            resolve({
              success: false,
              message: `Lỗi ghi dữ liệu tới máy in: ${writeErr.message}`,
            });
          }
        } else {
          // Cho phép máy in nhận đủ gói tin trước khi đóng socket
          setTimeout(() => {
            if (!isHandled) {
              isHandled = true;
              client.end();
              cleanup();
              resolve({
                success: true,
                message: `Đã gửi thành công ${buffer.length} bytes tới máy in ${ip}:${port}`,
              });
            }
          }, 250);
        }
      });
    });

    client.on('timeout', () => {
      if (!isHandled) {
        isHandled = true;
        cleanup();
        resolve({
          success: false,
          message: `Hết thời gian chờ (${timeoutMs}ms) kết nối tới máy in tại IP ${ip}:${port}. Vui lòng kiểm tra cáp mạng/Wi-Fi của máy in.`,
        });
      }
    });

    client.on('error', (err: any) => {
      if (!isHandled) {
        isHandled = true;
        cleanup();
        let errMsg = err.message;
        if (err.code === 'ECONNREFUSED') {
          errMsg = `Máy in tại ${ip}:${port} từ chối kết nối (Cổng ${port} chưa mở hoặc sai cấu hình RAW 9100).`;
        } else if (err.code === 'EHOSTUNREACH' || err.code === 'ENETUNREACH') {
          errMsg = `Không thể tiếp cận địa chỉ IP ${ip}. Vui lòng đảm bảo máy tính và máy in cùng dải mạng LAN.`;
        } else if (err.code === 'ETIMEDOUT') {
          errMsg = `Kết nối tới ${ip}:${port} quá hạn (Timeout).`;
        }
        resolve({
          success: false,
          message: `Lỗi kết nối Socket máy in: ${errMsg}`,
        });
      }
    });
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, data, printerIp, printerPort = 9100, action } = body;

    if (!printerIp) {
      return NextResponse.json(
        { success: false, message: 'Địa chỉ IP máy in không được để trống' },
        { status: 400 }
      );
    }

    const port = Number(printerPort) || 9100;
    let buffer: Uint8Array;

    if (action === 'test') {
      buffer = generateEscPosTestSlip('MANG LAN / IP (PORT 9100)', `IP: ${printerIp}:${port}`);
    } else if (type === 'kitchen') {
      if (!data) {
        return NextResponse.json(
          { success: false, message: 'Thiếu dữ liệu phiếu bếp' },
          { status: 400 }
        );
      }
      buffer = generateEscPosKitchenBill(data);
    } else if (type === 'bill') {
      if (!data) {
        return NextResponse.json(
          { success: false, message: 'Thiếu dữ liệu hoá đơn' },
          { status: 400 }
        );
      }
      buffer = generateEscPosBill(data);
    } else if (type === 'raw' && body.rawBase64) {
      buffer = Buffer.from(body.rawBase64, 'base64');
    } else {
      return NextResponse.json(
        { success: false, message: 'Loại yêu cầu in không hợp lệ' },
        { status: 400 }
      );
    }

    const result = await sendToPrinter(printerIp, port, buffer);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Lỗi tại /api/print:', error);
    return NextResponse.json(
      {
        success: false,
        message: `Lỗi hệ thống in ấn: ${error.message || 'Lỗi không xác định'}`,
      },
      { status: 500 }
    );
  }
}
