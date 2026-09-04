import { BillPrintProps, KitchenBillPrintProps } from '../types/printer';

/**
 * In nội dung DOM bằng hidden iframe và CSS tối ưu cho máy in nhiệt 80mm
 */
export function printElement(element: HTMLElement, onAfterPrint?: () => void): void {
  if (typeof window === 'undefined') return;

  // Tạo thẻ iframe ẩn
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';

  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    return;
  }

  // Khởi tạo HTML chuẩn cho in nhiệt 80mm
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>In Hóa Đơn</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0mm !important;
          }
          *, *::before, *::after {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 2mm 3mm;
            width: 74mm;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Courier New";
            color: #000;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          .no-print {
            display: none !important;
          }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `);
  iframeDoc.close();

  // Đợi hình ảnh & fonts tải xong trước khi gọi lệnh in
  const executePrint = () => {
    try {
      const cw = iframe.contentWindow;
      if (!cw) return;

      cw.focus();

      // Lắng nghe sự kiện sau khi in xong
      cw.onafterprint = () => {
        if (onAfterPrint) onAfterPrint();
        setTimeout(() => {
          try {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          } catch {
            // Ignore
          }
        }, 300);
      };

      cw.print();
    } catch (e) {
      console.error('Lỗi khi kích hoạt iframe.print():', e);
      if (onAfterPrint) onAfterPrint();
      try {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      } catch {
        // Ignore
      }
    }
  };

  // Đảm bảo fonts đã sẵn sàng
  if ((iframeDoc as any).fonts?.ready) {
    (iframeDoc as any).fonts.ready.then(() => {
      setTimeout(executePrint, 150);
    });
  } else {
    setTimeout(executePrint, 250);
  }
}

/**
 * Chuẩn hóa đối tượng đơn hàng sang định dạng BillPrintProps
 */
export function formatOrderToBillData(order: any): BillPrintProps {
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

  return {
    storeName: order?.storeName || 'TIẾT Ú COFFEE & TEA',
    storeAddress: order?.storeAddress || '123 Đường Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh',
    branchAddresses: order?.branchAddresses || [
      'CN2: 45 Hoàng Diệu, Quận 4, TP.HCM',
    ],
    hotline: order?.hotline || '1900 6868 - 0909 123 456',
    billCode: order?.billCode || `HD${Math.floor(100000 + Math.random() * 900000)}`,
    tableName: order?.tableName || 'Bàn 04 (Lầu 1)',
    orderType: order?.orderType || 'Tại bàn',
    cashier: order?.cashier || 'Nguyễn Thu Ngân',
    customerName: order?.customerName || 'Anh Tuấn (0912***789)',
    orderTime: order?.orderTime || timeStr,
    items: order?.items || [
      {
        id: 1,
        name: 'Trà Sữa Oolong Nướng Kem Trứng',
        quantity: 2,
        price: 45000,
        total: 90000,
        toppings: [
          { name: 'Trân châu đen', price: 10000 },
          { name: 'Thạch củ năng', price: 10000 },
        ],
        note: '70% đường, 50% đá',
      },
      {
        id: 2,
        name: 'Cà Phê Muối Tiết Ú',
        quantity: 1,
        price: 35000,
        total: 35000,
        note: 'Ít ngọt, nhiều kem béo',
      },
      {
        id: 3,
        name: 'Bánh Croissant Trứng Muối',
        quantity: 1,
        price: 38000,
        total: 38000,
      },
    ],
    subtotal: order?.subtotal || 183000,
    discount: order?.discount || 20000,
    discountNote: order?.discountNote || 'Voucher KH Thân thiết',
    vat: order?.vat || 0,
    total: order?.total || 163000,
    customerPay: order?.customerPay || 200000,
    change: order?.change || 37000,
    paymentMethod: order?.paymentMethod || 'Chuyển khoản QR (VietQR)',
    wifiInfo: order?.wifiInfo || {
      ssid: 'Tiet U Guest 5G',
      pass: 'tietu2026',
    },
    footerNotes: 'Cảm ơn Quý Khách - Hẹn Gặp Lại!',
  };
}

/**
 * Chuẩn hóa đối tượng đơn hàng sang định dạng KitchenBillPrintProps
 */
export function formatOrderToKitchenBillData(order: any): KitchenBillPrintProps {
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  return {
    orderCode: order?.billCode || `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
    tableName: order?.tableName || 'BÀN 04',
    orderTime: timeStr,
    printTime: `${timeStr} (Lần 1)`,
    items: order?.items ? order.items.map((i: any) => ({
      name: i.name,
      quantity: i.quantity,
      note: i.note,
      options: i.toppings?.map((t: any) => `+ ${t.name}`),
    })) : [
      {
        name: 'Trà Sữa Oolong Nướng Kem Trứng',
        quantity: 2,
        note: '70% đường, 50% đá',
        options: ['+ Trân châu đen', '+ Thạch củ năng'],
      },
      {
        name: 'Cà Phê Muối Tiết Ú',
        quantity: 1,
        note: 'Ít ngọt, nhiều kem béo',
      },
      {
        name: 'Bánh Croissant Trứng Muối',
        quantity: 1,
        note: 'Hâm nóng giòn',
      },
    ],
    note: 'Khách yêu cầu mang đồ uống ra trước, bánh ra sau.',
  };
}
