'use client';

import { useState, useRef, useCallback } from 'react';
import { BillPrintProps, KitchenBillPrintProps, LogEntry, PrinterMethod, PrintResult } from '../types/printer';
import { printBillViaSerial, printKitchenBillViaSerial, testSerialPrinter } from '../services/print/serialPrintService';
import { printBillViaUsb, printKitchenBillViaUsb, testUsbPrinter } from '../services/print/usbPrintService';
import { getStoredPrinterConfig, printBillViaIp, printKitchenBillViaIp, testPrinterConnection } from '../services/print/printService';
import { printElement } from '../utils/print';

export function useBillPrint(onAfterPrint?: () => void) {
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<PrintResult | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const printContentRef = useRef<HTMLDivElement>(null);
  const kitchenContentRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((type: LogEntry['type'], message: string, method?: PrinterMethod, details?: any) => {
    const newEntry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
      type,
      method,
      message,
      details: details ? (typeof details === 'string' ? details : JSON.stringify(details)) : undefined,
    };
    setLogs((prev) => [newEntry, ...prev.slice(0, 49)]); // Giữ tối đa 50 log gần nhất
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  /**
   * In Hoá Đơn Thanh Toán với cơ chế Fallback thông minh
   */
  const printBill = useCallback(
    async (billData: BillPrintProps, overrideMethod?: PrinterMethod): Promise<PrintResult> => {
      setIsPrinting(true);
      const config = getStoredPrinterConfig();
      const method = overrideMethod || config.defaultMethod || 'browser';

      addLog('info', `Bắt đầu yêu cầu in hoá đơn #${billData.billCode} qua phương thức: ${method.toUpperCase()}`, method);

      try {
        let result: PrintResult;

        if (method === 'serial') {
          result = await printBillViaSerial(billData);
        } else if (method === 'usb') {
          result = await printBillViaUsb(billData);
        } else if (method === 'ip') {
          result = await printBillViaIp(billData);
        } else {
          // Trình duyệt Browser / Kiosk
          if (!printContentRef.current) {
            throw new Error('Không tìm thấy nội dung DOM hóa đơn để in bằng trình duyệt');
          }
          printElement(printContentRef.current, onAfterPrint);
          result = {
            success: true,
            message: 'Đã gửi lệnh in hoá đơn qua Trình duyệt (Kiosk / Window.print)',
            method: 'browser',
          };
        }

        // Kiểm tra cơ chế Fallback nếu phương thức phần cứng bị lỗi
        if (!result.success && config.autoFallback && method !== 'browser') {
          addLog(
            'warn',
            `Phương thức ${method.toUpperCase()} gặp sự cố (${result.message}). Tự động kích hoạt chế độ Fallback sang Trình duyệt...`,
            method
          );

          if (printContentRef.current) {
            printElement(printContentRef.current, onAfterPrint);
            const fallbackResult: PrintResult = {
              success: true,
              message: `Đã tự động chuyển đổi Fallback in qua Trình duyệt (Do ${method} lỗi: ${result.message})`,
              method: 'browser',
              fallbackUsed: true,
            };
            setLastResult(fallbackResult);
            addLog('success', 'In hoá đơn dự phòng qua Trình duyệt hoàn tất', 'browser');
            setIsPrinting(false);
            return fallbackResult;
          }
        }

        if (result.success) {
          addLog('success', result.message, method);
          if (onAfterPrint && method !== 'browser') {
            onAfterPrint();
          }
        } else {
          addLog('error', result.message, method);
        }

        setLastResult(result);
        setIsPrinting(false);
        return result;
      } catch (err: any) {
        const errorResult: PrintResult = {
          success: false,
          message: `Lỗi ngoại lệ khi in hoá đơn: ${err.message || err}`,
          method,
        };

        // Kích hoạt Fallback
        if (config.autoFallback && method !== 'browser' && printContentRef.current) {
          addLog('warn', `Gặp lỗi ngoại lệ: ${err.message}. Kích hoạt Fallback sang Trình duyệt...`, method);
          printElement(printContentRef.current, onAfterPrint);
          errorResult.fallbackUsed = true;
          errorResult.success = true;
          errorResult.message = `Đã Fallback sang Trình duyệt thành công sau lỗi: ${err.message}`;
        } else {
          addLog('error', errorResult.message, method);
        }

        setLastResult(errorResult);
        setIsPrinting(false);
        return errorResult;
      }
    },
    [addLog, onAfterPrint]
  );

  /**
   * In Phiếu Chế Biến Bếp
   */
  const printKitchenBill = useCallback(
    async (kitchenData: KitchenBillPrintProps, overrideMethod?: PrinterMethod): Promise<PrintResult> => {
      setIsPrinting(true);
      const config = getStoredPrinterConfig();
      // Bếp thường ưu tiên in qua Mạng LAN IP nếu có, hoặc phương thức mặc định
      const method = overrideMethod || config.defaultMethod || 'ip';

      addLog('info', `Bắt đầu gửi phiếu chế biến bàn [${kitchenData.tableName}] qua phương thức: ${method.toUpperCase()}`, method);

      try {
        let result: PrintResult;

        if (method === 'serial') {
          result = await printKitchenBillViaSerial(kitchenData);
        } else if (method === 'usb') {
          result = await printKitchenBillViaUsb(kitchenData);
        } else if (method === 'ip') {
          result = await printKitchenBillViaIp(kitchenData);
        } else {
          if (!kitchenContentRef.current) {
            throw new Error('Không tìm thấy nội dung DOM phiếu bếp để in');
          }
          printElement(kitchenContentRef.current, onAfterPrint);
          result = {
            success: true,
            message: 'Đã gửi lệnh in phiếu bếp qua Trình duyệt',
            method: 'browser',
          };
        }

        if (!result.success && config.autoFallback && method !== 'browser') {
          addLog('warn', `In bếp qua ${method} thất bại. Kích hoạt Fallback sang Trình duyệt...`, method);
          if (kitchenContentRef.current) {
            printElement(kitchenContentRef.current, onAfterPrint);
            const fallbackResult: PrintResult = {
              success: true,
              message: `Đã Fallback in phiếu bếp qua Trình duyệt (Lỗi: ${result.message})`,
              method: 'browser',
              fallbackUsed: true,
            };
            setLastResult(fallbackResult);
            addLog('success', 'In phiếu bếp qua Fallback trình duyệt hoàn tất', 'browser');
            setIsPrinting(false);
            return fallbackResult;
          }
        }

        if (result.success) {
          addLog('success', result.message, method);
          if (onAfterPrint && method !== 'browser') {
            onAfterPrint();
          }
        } else {
          addLog('error', result.message, method);
        }

        setLastResult(result);
        setIsPrinting(false);
        return result;
      } catch (err: any) {
        const errorResult: PrintResult = {
          success: false,
          message: `Lỗi in phiếu bếp: ${err.message || err}`,
          method,
        };
        addLog('error', errorResult.message, method);
        setLastResult(errorResult);
        setIsPrinting(false);
        return errorResult;
      }
    },
    [addLog, onAfterPrint]
  );

  /**
   * In Thử Nghiệm một phương thức cụ thể
   */
  const testMethod = useCallback(
    async (method: PrinterMethod): Promise<PrintResult> => {
      setIsPrinting(true);
      addLog('info', `Đang kích hoạt in thử nghiệm kiểm tra kết nối: ${method.toUpperCase()}`, method);

      try {
        let result: PrintResult;

        if (method === 'serial') {
          result = await testSerialPrinter();
        } else if (method === 'usb') {
          result = await testUsbPrinter();
        } else if (method === 'ip') {
          const config = getStoredPrinterConfig();
          result = await testPrinterConnection(config.billPrinterIp, config.printerPort);
        } else {
          // In test trình duyệt
          if (printContentRef.current) {
            printElement(printContentRef.current);
            result = {
              success: true,
              message: 'Đã kích hoạt in thử nghiệm qua Trình duyệt',
              method: 'browser',
            };
          } else {
            result = {
              success: false,
              message: 'Không tìm thấy vùng xem trước để in thử trình duyệt',
              method: 'browser',
            };
          }
        }

        if (result.success) {
          addLog('success', result.message, method);
        } else {
          addLog('error', result.message, method);
        }

        setLastResult(result);
        setIsPrinting(false);
        return result;
      } catch (err: any) {
        const errorResult: PrintResult = {
          success: false,
          message: `Lỗi in thử: ${err.message || err}`,
          method,
        };
        addLog('error', errorResult.message, method);
        setLastResult(errorResult);
        setIsPrinting(false);
        return errorResult;
      }
    },
    [addLog]
  );

  return {
    isPrinting,
    lastResult,
    logs,
    printContentRef,
    kitchenContentRef,
    printBill,
    printKitchenBill,
    testMethod,
    clearLogs,
    addLog,
  };
}
