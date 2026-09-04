import { BillPrintProps, KitchenBillPrintProps } from '../types/printer';

export const ESC_COMMANDS = {
  // Initialization
  INIT: '\x1b@',

  // Alignment
  ALIGN_LEFT: '\x1ba\x00',
  ALIGN_CENTER: '\x1ba\x01',
  ALIGN_RIGHT: '\x1ba\x02',

  // Text formatting
  FONT_NORMAL: '\x1b!\x00',
  FONT_BOLD: '\x1b!\x08',
  FONT_TITLE: '\x1b!\x38', // Double width, double height, bold
  FONT_LARGE: '\x1b!\x30', // Double width, double height
  FONT_DOUBLE_HEIGHT: '\x1b!\x10',
  FONT_DOUBLE_WIDTH: '\x1b!\x20',
  
  BOLD_ON: '\x1bE\x01',
  BOLD_OFF: '\x1bE\x00',
  
  UNDERLINE_ON: '\x1b-\x01',
  UNDERLINE_OFF: '\x1b-\x00',

  // Feeds and Paper Cut
  FEED_LINE: '\n',
  FEED_LINES_3: '\x1bd\x03',
  FEED_LINES_5: '\x1bd\x05',
  CUT_FULL: '\x1di',
  CUT_PARTIAL: '\x1dm',
  CUT_FEED: '\x1dV\x41\x03', // GS V 'A' 3 lines feed then cut

  // Hardware Actions
  OPEN_DRAWER: '\x1bp\x00\x19\xfa', // Open cash drawer (pin 2, 50ms)
  BEEP: '\x1bb\x02\x02', // Beep 2 times
};

/**
 * Loại bỏ dấu tiếng Việt và ký tự ngoài ASCII để tránh lỗi ký tự '?' trên máy in nhiệt
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    // Loại bỏ mọi ký tự không thuộc bảng mã ASCII chuẩn (32 - 126 và xuống dòng)
    .replace(/[^\x20-\x7E\n\r]/g, '')
    .trim();
}

/**
 * Định dạng dòng 2 cột: Cột trái căn trái, cột phải căn phải
 */
export function formatTwoColumns(left: string, right: string, width = 48): string {
  const cleanLeft = removeVietnameseTones(left);
  const cleanRight = removeVietnameseTones(right);
  const spaces = width - cleanLeft.length - cleanRight.length;

  if (spaces > 0) {
    return cleanLeft + ' '.repeat(spaces) + cleanRight + '\n';
  } else {
    // Nếu quá dài, xuống dòng cột phải
    return cleanLeft + '\n' + ' '.repeat(Math.max(0, width - cleanRight.length)) + cleanRight + '\n';
  }
}

/**
 * Định dạng bảng món ăn: Tên (căn trái), SL (giữa), Giá (phải), Thành tiền (phải)
 */
export function formatItemRow(name: string, qty: number, price: number, total: number, width = 48): string {
  const cleanName = removeVietnameseTones(name);
  const qtyStr = `${qty}`;
  const priceStr = price.toLocaleString('vi-VN');
  const totalStr = total.toLocaleString('vi-VN');

  // Mẫu: 
  // Dòng 1: Tên món (nếu dài có thể chiếm 1 dòng riêng)
  // Dòng 2:       [SL] x [Đơn giá]            [Thành tiền]
  let result = '';
  if (cleanName.length <= width - 20) {
    // Tên ngắn, đưa lên dòng và căn thành tiền
    result += cleanName + '\n';
  } else {
    result += cleanName + '\n';
  }

  const subCol = `  ${qtyStr} x ${priceStr}`;
  const padLen = Math.max(1, width - subCol.length - totalStr.length);
  result += subCol + ' '.repeat(padLen) + totalStr + '\n';

  return result;
}

/**
 * Sinh chuỗi phân cách nét đứt hoặc nét liền
 */
export function createDivider(char = '-', width = 48): string {
  return char.repeat(width) + '\n';
}

/**
 * Chuyển chuỗi text sang Uint8Array
 */
export function stringToBytes(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    bytes[i] = text.charCodeAt(i) & 0xff;
  }
  return bytes;
}

/**
 * Ghép nhiều mảng Uint8Array lại thành một mảng duy nhất
 */
export function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Sinh mã ESC/POS cho Hóa đơn thanh toán bán hàng (Bill 80mm - 48 ký tự)
 */
export function generateEscPosBill(data: BillPrintProps, width = 48): Uint8Array {
  const commands: string[] = [];

  // Khởi tạo máy in
  commands.push(ESC_COMMANDS.INIT);

  // Mở két tiền (nếu cần)
  commands.push(ESC_COMMANDS.OPEN_DRAWER);

  // Header cửa hàng (Căn giữa, Chữ lớn)
  commands.push(ESC_COMMANDS.ALIGN_CENTER);
  commands.push(ESC_COMMANDS.FONT_TITLE);
  commands.push(removeVietnameseTones(data.storeName || 'TIET U COFFEE & TEA') + '\n');

  // Địa chỉ & Hotline (Căn giữa, Chữ thường)
  commands.push(ESC_COMMANDS.FONT_NORMAL);
  if (data.storeAddress) {
    commands.push(removeVietnameseTones(data.storeAddress) + '\n');
  }
  if (data.branchAddresses && data.branchAddresses.length > 0) {
    for (const branch of data.branchAddresses) {
      commands.push(removeVietnameseTones(branch) + '\n');
    }
  }
  if (data.hotline) {
    commands.push(`Hotline: ${data.hotline}\n`);
  }

  // Tiêu đề hoá đơn
  commands.push('\n');
  commands.push(ESC_COMMANDS.FONT_BOLD);
  commands.push(ESC_COMMANDS.FONT_DOUBLE_HEIGHT);
  commands.push('HOA DON THANH TOAN\n');
  commands.push(ESC_COMMANDS.FONT_NORMAL);

  // Thông tin đơn hàng (Căn trái)
  commands.push(ESC_COMMANDS.ALIGN_LEFT);
  commands.push(createDivider('-', width));
  commands.push(formatTwoColumns(`Ma HD: ${data.billCode}`, `Thu ngan: ${removeVietnameseTones(data.cashier || 'Admin')}`, width));
  commands.push(formatTwoColumns(`Thoi gian: ${data.orderTime}`, data.tableName ? `Ban: ${removeVietnameseTones(data.tableName)}` : (data.orderType || 'Mang ve'), width));
  if (data.customerName) {
    commands.push(formatTwoColumns(`Khach hang: ${removeVietnameseTones(data.customerName)}`, '', width));
  }
  commands.push(createDivider('=', width));

  // Tiêu đề cột
  commands.push(formatTwoColumns('TEN MON', 'T.TIEN', width));
  commands.push(createDivider('-', width));

  // Danh sách món ăn
  for (const item of data.items) {
    const itemTotal = item.total ?? (item.quantity * item.price);
    commands.push(formatItemRow(item.name, item.quantity, item.price, itemTotal, width));
    
    // Toppings / Ghi chú
    if (item.toppings && item.toppings.length > 0) {
      for (const top of item.toppings) {
        commands.push(`  + ${removeVietnameseTones(top.name)}: ${top.price.toLocaleString('vi-VN')}d\n`);
      }
    }
    if (item.note) {
      commands.push(`  * Ghi chu: ${removeVietnameseTones(item.note)}\n`);
    }
  }

  // Tổng kết hoá đơn
  commands.push(createDivider('-', width));
  commands.push(formatTwoColumns('Tien hang:', `${data.subtotal.toLocaleString('vi-VN')} d`, width));

  if (data.discount && data.discount > 0) {
    const discLabel = data.discountNote ? `Giam gia (${removeVietnameseTones(data.discountNote)}):` : 'Giam gia:';
    commands.push(formatTwoColumns(discLabel, `-${data.discount.toLocaleString('vi-VN')} d`, width));
  }

  if (data.vat && data.vat > 0) {
    commands.push(formatTwoColumns('Thue VAT:', `+${data.vat.toLocaleString('vi-VN')} d`, width));
  }

  // TỔNG CỘNG (Chữ đậm, to x2)
  commands.push(createDivider('=', width));
  commands.push(ESC_COMMANDS.FONT_BOLD);
  commands.push(ESC_COMMANDS.FONT_DOUBLE_HEIGHT);
  commands.push(formatTwoColumns('TONG TIEN:', `${data.total.toLocaleString('vi-VN')} d`, width));
  commands.push(ESC_COMMANDS.FONT_NORMAL);

  if (data.customerPay !== undefined) {
    commands.push(createDivider('-', width));
    commands.push(formatTwoColumns('Khach dua:', `${data.customerPay.toLocaleString('vi-VN')} d`, width));
    const change = data.change ?? (data.customerPay - data.total);
    commands.push(formatTwoColumns('Tien thua:', `${Math.max(0, change).toLocaleString('vi-VN')} d`, width));
  }

  if (data.paymentMethod) {
    commands.push(formatTwoColumns('Hinh thuc:', removeVietnameseTones(data.paymentMethod), width));
  }

  // Footer (Căn giữa)
  commands.push(createDivider('-', width));
  commands.push(ESC_COMMANDS.ALIGN_CENTER);

  if (data.wifiInfo) {
    commands.push(`Wifi: ${data.wifiInfo.ssid} | Pass: ${data.wifiInfo.pass}\n`);
  }
  
  commands.push(removeVietnameseTones(data.footerNotes || 'Cam on Quy Khach - Hen Gap Lai!') + '\n');
  commands.push('Website: https://tietu.vn\n');

  // Đẩy giấy và cắt
  commands.push(ESC_COMMANDS.FEED_LINES_5);
  commands.push(ESC_COMMANDS.CUT_FEED);

  // Gộp lại thành chuỗi và convert byte
  return stringToBytes(commands.join(''));
}

/**
 * Sinh mã ESC/POS cho Phiếu chế biến Bếp (Kitchen Ticket)
 */
export function generateEscPosKitchenBill(data: KitchenBillPrintProps, width = 48): Uint8Array {
  const commands: string[] = [];

  // Khởi tạo máy in
  commands.push(ESC_COMMANDS.INIT);

  // Âm thanh báo bếp (2 tiếng bíp)
  commands.push(ESC_COMMANDS.BEEP);

  // Header Bếp (Chữ rất to, căn giữa)
  commands.push(ESC_COMMANDS.ALIGN_CENTER);
  commands.push(ESC_COMMANDS.FONT_TITLE);
  commands.push('=== PHIEU BEP ===\n');

  // Bàn / Đơn hàng
  commands.push(ESC_COMMANDS.FONT_LARGE);
  commands.push(`BAN: ${removeVietnameseTones(data.tableName || 'MANG VE')}\n`);
  commands.push(ESC_COMMANDS.FONT_NORMAL);

  commands.push(ESC_COMMANDS.ALIGN_LEFT);
  commands.push(createDivider('-', width));
  commands.push(formatTwoColumns(`Ma don: #${data.orderCode}`, `Gio: ${data.orderTime}`, width));
  if (data.printTime) {
    commands.push(formatTwoColumns(`In luc: ${data.printTime}`, '', width));
  }
  commands.push(createDivider('=', width));

  // Danh sách món cần chế biến
  for (const item of data.items) {
    // Tên món và Số lượng chữ to rõ
    commands.push(ESC_COMMANDS.FONT_BOLD);
    commands.push(ESC_COMMANDS.FONT_DOUBLE_HEIGHT);
    commands.push(`[ ${item.quantity} ]  ${removeVietnameseTones(item.name)}\n`);
    commands.push(ESC_COMMANDS.FONT_NORMAL);

    if (item.options && item.options.length > 0) {
      for (const opt of item.options) {
        commands.push(`    -> ${removeVietnameseTones(opt)}\n`);
      }
    }

    if (item.note) {
      commands.push(ESC_COMMANDS.FONT_BOLD);
      commands.push(`    * LUU Y: ${removeVietnameseTones(item.note)}\n`);
      commands.push(ESC_COMMANDS.FONT_NORMAL);
    }
    commands.push(createDivider('.', width));
  }

  if (data.note) {
    commands.push(ESC_COMMANDS.FONT_BOLD);
    commands.push(`GHI CHU DON: ${removeVietnameseTones(data.note)}\n`);
    commands.push(ESC_COMMANDS.FONT_NORMAL);
  }

  // Đẩy giấy & Cắt
  commands.push(ESC_COMMANDS.FEED_LINES_5);
  commands.push(ESC_COMMANDS.CUT_FEED);

  return stringToBytes(commands.join(''));
}

/**
 * Sinh mã ESC/POS cho bản in Test máy in
 */
export function generateEscPosTestSlip(methodName: string, extraInfo?: string, width = 48): Uint8Array {
  const commands: string[] = [];
  const now = new Date().toLocaleString('vi-VN');

  commands.push(ESC_COMMANDS.INIT);
  commands.push(ESC_COMMANDS.BEEP);
  commands.push(ESC_COMMANDS.ALIGN_CENTER);
  commands.push(ESC_COMMANDS.FONT_TITLE);
  commands.push('TEST IN NHIET 80MM\n');

  commands.push(ESC_COMMANDS.FONT_NORMAL);
  commands.push(createDivider('=', width));
  commands.push(`Phuong thuc: ${removeVietnameseTones(methodName)}\n`);
  commands.push(`Thoi gian: ${now}\n`);
  if (extraInfo) {
    commands.push(`Thong so: ${removeVietnameseTones(extraInfo)}\n`);
  }
  commands.push(createDivider('-', width));

  commands.push(ESC_COMMANDS.ALIGN_LEFT);
  commands.push('1. Tieng Viet khong dau: HOP LE\n');
  commands.push('2. Canh le 48 ky tu: CHUAN KHAC 80MM\n');
  commands.push('3. Kiem tra cat giay tu dong: OK\n');
  commands.push('4. Ket noi phan cung: THANH CONG!\n');
  commands.push(createDivider('=', width));

  commands.push(ESC_COMMANDS.ALIGN_CENTER);
  commands.push('MAY IN SAN SANG HOAT DONG\n');
  commands.push(ESC_COMMANDS.FEED_LINES_5);
  commands.push(ESC_COMMANDS.CUT_FEED);

  return stringToBytes(commands.join(''));
}
