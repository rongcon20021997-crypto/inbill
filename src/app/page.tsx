'use client';

import React, { useState, useEffect } from 'react';
import {
  Printer,
  Settings2,
  Receipt,
  ChefHat,
  Zap,
  Usb,
  Globe,
  Monitor,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import PrinterSettingModal from '../components/PrinterSettingModal';
import ReceiptPreview from '../components/ReceiptPreview';
import BillPrint from '../components/BillPrint';
import KitchenBillPrint from '../components/KitchenBillPrint';
import { useBillPrint } from '../hooks/useBillPrint';
import { BillItem, BillPrintProps, KitchenBillPrintProps, PrinterConfig, PrinterMethod } from '../types/printer';
import { getStoredPrinterConfig } from '../services/print/printService';
import { formatOrderToBillData, formatOrderToKitchenBillData } from '../utils/print';
import { isWebSerialSupported } from '../services/print/serialPrintService';
import { isWebUsbSupported } from '../services/print/usbPrintService';

// Đơn hàng mẫu theo mô hình quán
const SAMPLE_PRESETS: Record<string, { name: string; items: BillItem[]; tableName: string; orderType: string }> = {
  cafe: {
    name: 'Quán Cà Phê & Trà Sữa Tiết Ú',
    tableName: 'Bàn 04 (Lầu 1)',
    orderType: 'Tại bàn',
    items: [
      {
        id: 1,
        name: 'Trà Sữa Oolong Nướng Kem Trứng',
        quantity: 2,
        price: 45000,
        total: 90000,
        note: '70% đường, 50% đá',
        toppings: [
          { name: 'Trân châu đen', price: 10000 },
          { name: 'Thạch củ năng', price: 10000 },
        ],
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
  },
  restaurant: {
    name: 'Nhà Hàng Cơm Niêu & Lẩu',
    tableName: 'Phòng VIP 02',
    orderType: 'Tại bàn',
    items: [
      {
        id: 10,
        name: 'Cơm Niêu Cháy Giòn Kho Quẹt',
        quantity: 3,
        price: 65000,
        total: 195000,
      },
      {
        id: 11,
        name: 'Cá Bống Kho Tộ Miền Tây',
        quantity: 1,
        price: 120000,
        total: 120000,
        note: 'Kho đậm đà, nhiều tiêu xanh',
      },
      {
        id: 12,
        name: 'Canh Cua Rau Đay Cà Pháo',
        quantity: 1,
        price: 75000,
        total: 75000,
      },
      {
        id: 13,
        name: 'Trà Đá Hoa Lài',
        quantity: 4,
        price: 5000,
        total: 20000,
      },
    ],
  },
  takeaway: {
    name: 'Order Nhanh Mang Về (Take-away)',
    tableName: '',
    orderType: 'Mang về',
    items: [
      {
        id: 20,
        name: 'Trà Đào Cam Sả (Size L)',
        quantity: 2,
        price: 42000,
        total: 84000,
        note: 'Để riêng đá, mang đi xa',
      },
      {
        id: 21,
        name: 'Bánh Mì Chảo Đặc Biệt',
        quantity: 1,
        price: 49000,
        total: 49000,
        note: 'Trứng ốp la lòng đào',
      },
    ],
  },
};

export default function CashierPrintPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [config, setConfig] = useState<PrinterConfig>(getStoredPrinterConfig());
  const [presetKey, setPresetKey] = useState<string>('cafe');
  const [items, setItems] = useState<BillItem[]>(SAMPLE_PRESETS.cafe.items);
  const [tableName, setTableName] = useState<string>(SAMPLE_PRESETS.cafe.tableName);
  const [orderType, setOrderType] = useState<string>(SAMPLE_PRESETS.cafe.orderType);
  const [discount, setDiscount] = useState<number>(20000);
  const [customerPay, setCustomerPay] = useState<number>(200000);
  const [previewMode, setPreviewMode] = useState<'bill' | 'kitchen'>('bill');
  const [serialOk, setSerialOk] = useState(false);
  const [usbOk, setUsbOk] = useState(false);

  const {
    isPrinting,
    lastResult,
    logs,
    printContentRef,
    kitchenContentRef,
    printBill,
    printKitchenBill,
    testMethod,
    clearLogs,
  } = useBillPrint(() => {
    console.log('In ấn hoàn tất!');
  });

  // Tải cấu hình và kiểm tra API phần cứng
  useEffect(() => {
    setConfig(getStoredPrinterConfig());
    setSerialOk(isWebSerialSupported());
    setUsbOk(isWebUsbSupported());
  }, [isModalOpen]);

  // Đổi preset
  const handleSelectPreset = (key: string) => {
    setPresetKey(key);
    const p = SAMPLE_PRESETS[key];
    setItems([...p.items]);
    setTableName(p.tableName);
    setOrderType(p.orderType);
    if (key === 'restaurant') {
      setDiscount(40000);
      setCustomerPay(400000);
    } else if (key === 'takeaway') {
      setDiscount(0);
      setCustomerPay(150000);
    } else {
      setDiscount(20000);
      setCustomerPay(200000);
    }
  };

  // Cập nhật số lượng món
  const updateItemQty = (index: number, delta: number) => {
    setItems((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index] = {
        ...updated[index],
        quantity: newQty,
        total: newQty * updated[index].price,
      };
      return updated;
    });
  };

  // Tính toán tài chính
  const subtotal = items.reduce((sum, item) => sum + (item.total ?? item.quantity * item.price), 0);
  const total = Math.max(0, subtotal - discount);
  const change = Math.max(0, customerPay - total);

  // Tạo đối tượng billData và kitchenData
  const billData: BillPrintProps = {
    storeName: 'TIẾT Ú COFFEE & TEA',
    storeAddress: '123 Đường Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh',
    branchAddresses: ['CN2: 45 Hoàng Diệu, Quận 4, TP.HCM'],
    hotline: '1900 6868 - 0909 123 456',
    billCode: `HD${new Date().getMinutes().toString().padStart(2, '0')}${new Date().getSeconds().toString().padStart(2, '0')}`,
    tableName,
    orderType,
    cashier: 'Nguyễn Thu Ngân',
    customerName: 'Anh Tuấn (0912***789)',
    orderTime: `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')} ${new Date().toLocaleDateString('vi-VN')}`,
    items,
    subtotal,
    discount,
    discountNote: discount > 0 ? 'Voucher Tri Ân Khách Hàng' : undefined,
    vat: 0,
    total,
    customerPay,
    change,
    paymentMethod: 'Chuyển khoản QR (VietQR)',
    wifiInfo: {
      ssid: 'Tiet U Guest 5G',
      pass: 'tietu2026',
    },
    footerNotes: 'Cảm ơn Quý Khách - Hẹn Gặp Lại!',
  };

  const kitchenData: KitchenBillPrintProps = formatOrderToKitchenBillData({
    billCode: billData.billCode,
    tableName: billData.tableName || 'MANG VỀ',
    items: billData.items,
  });

  const getMethodBadge = (m: PrinterMethod) => {
    switch (m) {
      case 'serial':
        return { label: '⚡ Cổng COM (Web Serial)', color: '#38bdf8' };
      case 'usb':
        return { label: '🔌 Cáp USB (WebUSB)', color: '#a855f7' };
      case 'ip':
        return { label: '🌐 Mạng LAN IP (Port 9100)', color: '#10b981' };
      case 'browser':
        return { label: '🖨️ Trình duyệt (Kiosk)', color: '#f59e0b' };
    }
  };

  const currentBadge = getMethodBadge(config.defaultMethod);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation Bar */}
      <header style={headerBarStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={logoBadgeStyle}>
            <Printer size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '0.3px', margin: 0 }}>
                Hệ Thống Cấu Hình & Test In Nhiệt ESC/POS
              </h1>
              <span style={systemBadgeStyle}>v2.0 POS</span>
            </div>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>
              Hỗ trợ 4 chuẩn kết nối: Serial RS232, WebUSB, Raw TCP Socket 9100 & Kiosk Printing
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Badge phương thức hiện tại */}
          <div style={{ ...activeMethodIndicatorStyle, borderColor: currentBadge.color }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Phương thức:</span>
            <strong style={{ fontSize: '12px', color: currentBadge.color }}>
              {currentBadge.label}
            </strong>
          </div>

          <button onClick={() => setIsModalOpen(true)} style={configBtnStyle}>
            <Settings2 size={16} />
            <span>Cài Đặt Máy In</span>
          </button>
        </div>
      </header>

      {/* Main Workspace 3-Column Layout */}
      <main style={mainLayoutStyle}>
        {/* LEFT COLUMN: Thu Ngân & Đơn Hàng */}
        <section style={panelCardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Receipt size={18} color="#38bdf8" />
              <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                Bàn Làm Việc Thu Ngân (Cashier POS)
              </h2>
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Mã: #{billData.billCode}</span>
          </div>

          <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
            {/* Chọn mẫu quán */}
            <div style={{ marginBottom: '14px' }}>
              <label style={fieldLabelStyle}>Chọn kịch bản đơn hàng mẫu:</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '6px' }}>
                {Object.entries(SAMPLE_PRESETS).map(([key, p]) => (
                  <button
                    key={key}
                    onClick={() => handleSelectPreset(key)}
                    style={{
                      padding: '8px 6px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      border: presetKey === key ? '2px solid #3b82f6' : '1px solid #334155',
                      backgroundColor: presetKey === key ? '#1e3a8a' : '#0f172a',
                      color: presetKey === key ? '#ffffff' : '#94a3b8',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    {p.name.split(' ')[1] || p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Thông tin bàn / Khu vực */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={fieldLabelStyle}>Bàn / Vị trí:</label>
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  style={posInputStyle}
                  placeholder="VD: Bàn 04"
                />
              </div>
              <div>
                <label style={fieldLabelStyle}>Hình thức:</label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                  style={posInputStyle}
                >
                  <option value="Tại bàn">Tại bàn</option>
                  <option value="Mang về">Mang về (Take-away)</option>
                  <option value="Giao hàng">Giao hàng (Delivery)</option>
                </select>
              </div>
            </div>

            {/* Danh sách món */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={fieldLabelStyle}>Danh sách món ({items.length}):</label>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Khổ 80mm</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {items.map((item, idx) => (
                  <div key={idx} style={orderItemRowStyle}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        {item.price.toLocaleString('vi-VN')}đ / phần
                        {item.note && <span style={{ color: '#60a5fa', marginLeft: '6px' }}>• {item.note}</span>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button onClick={() => updateItemQty(idx, -1)} style={qtyBtnStyle}>
                        <Minus size={12} />
                      </button>
                      <span style={{ fontSize: '13px', fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button onClick={() => updateItemQty(idx, 1)} style={qtyBtnStyle}>
                        <Plus size={12} />
                      </button>
                      <div style={{ minWidth: '75px', textAlign: 'right', fontWeight: 700, fontSize: '13px', color: '#38bdf8' }}>
                        {(item.total ?? item.quantity * item.price).toLocaleString('vi-VN')}đ
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tính toán thanh toán */}
            <div style={calcBoxStyle}>
              <div style={calcRowStyle}>
                <span>Tổng tiền hàng:</span>
                <span style={{ fontWeight: 600 }}>{subtotal.toLocaleString('vi-VN')}đ</span>
              </div>
              <div style={calcRowStyle}>
                <span>Chiết khấu / Giảm giá:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    style={{ ...posInputStyle, width: '100px', textAlign: 'right', padding: '3px 6px', fontSize: '12px' }}
                  />
                  <span>đ</span>
                </div>
              </div>
              <div style={{ ...calcRowStyle, borderTop: '1px solid #334155', paddingTop: '8px', marginTop: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>CẦN THANH TOÁN:</span>
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#10b981' }}>
                  {total.toLocaleString('vi-VN')}đ
                </span>
              </div>
              <div style={calcRowStyle}>
                <span>Tiền khách đưa:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    value={customerPay}
                    onChange={(e) => setCustomerPay(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    style={{ ...posInputStyle, width: '110px', textAlign: 'right', padding: '3px 6px', fontSize: '12px' }}
                  />
                  <span>đ</span>
                </div>
              </div>
              <div style={calcRowStyle}>
                <span>Tiền thừa trả khách:</span>
                <span style={{ fontWeight: 700, color: '#38bdf8' }}>{change.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>

            {/* Các nút hành động chính */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
              <button
                onClick={() => printBill(billData)}
                disabled={isPrinting || items.length === 0}
                style={primaryPrintBtnStyle}
              >
                <Printer size={18} />
                <span>Thanh Toán &amp; In Bill</span>
              </button>

              <button
                onClick={() => printKitchenBill(kitchenData)}
                disabled={isPrinting || items.length === 0}
                style={kitchenPrintBtnStyle}
              >
                <ChefHat size={18} />
                <span>Gửi Báo Bếp</span>
              </button>
            </div>

            {/* Hàng nút Test nhanh theo từng phương thức */}
            <div style={{ marginTop: '16px', borderTop: '1px solid #2a374e', paddingTop: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px' }}>
                🧪 Bắn lệnh in test trực tiếp tới thiết bị:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                <button
                  onClick={() => testMethod('serial')}
                  disabled={isPrinting}
                  style={quickTestBtnStyle}
                  title="Test Web Serial COM port"
                >
                  <Zap size={13} color="#38bdf8" />
                  <span>Test COM</span>
                </button>

                <button
                  onClick={() => testMethod('usb')}
                  disabled={isPrinting}
                  style={quickTestBtnStyle}
                  title="Test WebUSB Bulk Transfer"
                >
                  <Usb size={13} color="#a855f7" />
                  <span>Test USB</span>
                </button>

                <button
                  onClick={() => testMethod('ip')}
                  disabled={isPrinting}
                  style={quickTestBtnStyle}
                  title="Test TCP Socket Port 9100"
                >
                  <Globe size={13} color="#10b981" />
                  <span>Test IP LAN</span>
                </button>

                <button
                  onClick={() => testMethod('browser')}
                  disabled={isPrinting}
                  style={quickTestBtnStyle}
                  title="Test Kiosk Browser Window.print"
                >
                  <Monitor size={13} color="#f59e0b" />
                  <span>Test Kiosk</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* MIDDLE COLUMN: Xem Trước Giấy Nhiệt 80mm & Byte Dump */}
        <section style={panelCardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="#10b981" />
              <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                Mô Phỏng Hóa Đơn Nhiệt 80mm &amp; ESC/POS
              </h2>
            </div>
            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>Tự động cắt giấy</span>
          </div>

          <div style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
            <ReceiptPreview
              billData={billData}
              kitchenData={kitchenData}
              mode={previewMode}
              onModeChange={setPreviewMode}
            />
          </div>
        </section>

        {/* RIGHT COLUMN: Console Log & Trạng Thái Phần Cứng */}
        <section style={panelCardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#a855f7" />
              <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                Nhật Ký Thực Thi (Console Log)
              </h2>
            </div>
            <button onClick={clearLogs} style={clearBtnStyle} title="Xóa logs">
              <Trash2 size={14} />
              <span>Xóa</span>
            </button>
          </div>

          <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
            {/* Bảng trạng thái chuẩn kết nối */}
            <div style={statusOverviewBoxStyle}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                Trạng thái API trình duyệt &amp; Phần cứng:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={statusBadgeItemStyle(serialOk)}>
                  <Zap size={14} />
                  <span>Web Serial: {serialOk ? 'Hỗ trợ' : 'Không'}</span>
                </div>
                <div style={statusBadgeItemStyle(usbOk)}>
                  <Usb size={14} />
                  <span>WebUSB: {usbOk ? 'Hỗ trợ' : 'Không'}</span>
                </div>
                <div style={statusBadgeItemStyle(true)}>
                  <Globe size={14} />
                  <span>Next TCP 9100: Sẵn sàng</span>
                </div>
                <div style={statusBadgeItemStyle(true)}>
                  <Monitor size={14} />
                  <span>Kiosk Iframe: Chuẩn 80mm</span>
                </div>
              </div>
            </div>

            {/* Thông báo kết quả lệnh gần nhất */}
            {lastResult && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: lastResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${lastResult.success ? '#10b981' : '#ef4444'}`,
                  fontSize: '12px',
                  color: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {lastResult.success ? (
                  <CheckCircle2 size={16} color="#10b981" />
                ) : (
                  <AlertCircle size={16} color="#ef4444" />
                )}
                <div>
                  <strong>{lastResult.success ? 'Thành công:' : 'Thất bại:'}</strong> {lastResult.message}
                  {lastResult.fallbackUsed && (
                    <div style={{ color: '#f59e0b', fontSize: '11px', marginTop: '2px' }}>
                      (Đã kích hoạt Fallback in qua Trình duyệt)
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Danh sách Logs */}
            <div style={logContainerStyle}>
              {logs.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', padding: '40px 10px' }}>
                  Chưa có nhật ký in ấn. Hãy bấm &quot;Thanh toán &amp; In Bill&quot; hoặc &quot;In Thử Nghiệm&quot; để theo dõi quá trình giao tiếp phần cứng.
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} style={logItemStyle(log.type)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={logTypeBadgeStyle(log.type)}>
                          {log.type.toUpperCase()}
                        </span>
                        {log.method && (
                          <span style={logMethodBadgeStyle}>
                            {log.method.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>{log.timestamp}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#e2e8f0', marginTop: '4px', lineHeight: '1.4' }}>
                      {log.message}
                    </div>
                    {log.details && (
                      <pre style={logDetailPreStyle}>{log.details}</pre>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Mẹo kiến trúc in ấn */}
            <div style={tipBoxStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
                <HelpCircle size={14} />
                <span>Gợi ý cấu hình tại quầy:</span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' }}>
                ⭐ <strong>Cổng COM (Serial)</strong> chạy ổn định nhất cho máy POS cắm dây.<br />
                ⭐ <strong>Mạng LAN / IP 9100</strong> là lựa chọn tối ưu nhất cho máy in bếp từ xa không dây.<br />
                ⭐ <strong>Trình duyệt</strong> làm kênh dự phòng (Fallback) tự động nếu dây cáp lỏng.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Vùng chứa ẩn cho iframe in Trình duyệt / Kiosk (Bắt buộc theo tài liệu) */}
      <div className="screen-only-hidden" aria-hidden="true">
        <div ref={printContentRef}>
          <BillPrint {...billData} />
        </div>
        <div ref={kitchenContentRef}>
          <KitchenBillPrint {...kitchenData} />
        </div>
      </div>

      {/* Modal Cài Đặt Máy In */}
      <PrinterSettingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTestBrowser={() => testMethod('browser')}
      />
    </div>
  );
}

// Styling tokens
const headerBarStyle: React.CSSProperties = {
  backgroundColor: '#0f172a',
  borderBottom: '1px solid #1e293b',
  padding: '12px 24px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  position: 'sticky',
  top: 0,
  zIndex: 100,
};

const logoBadgeStyle: React.CSSProperties = {
  width: '38px',
  height: '38px',
  borderRadius: '10px',
  background: 'linear-gradient(135deg, #2563eb, #0284c7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 10px rgba(37, 99, 235, 0.4)',
};

const systemBadgeStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  backgroundColor: 'rgba(56, 189, 248, 0.15)',
  color: '#38bdf8',
  padding: '2px 8px',
  borderRadius: '12px',
  border: '1px solid rgba(56, 189, 248, 0.3)',
};

const activeMethodIndicatorStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  borderRadius: '8px',
  backgroundColor: '#1e293b',
  border: '1px solid',
};

const configBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 16px',
  borderRadius: '8px',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};

const mainLayoutStyle: React.CSSProperties = {
  flex: 1,
  padding: '16px',
  display: 'grid',
  gridTemplateColumns: 'minmax(340px, 1fr) minmax(320px, 1fr) minmax(320px, 1fr)',
  gap: '16px',
  boxSizing: 'border-box',
  height: 'calc(100vh - 65px)',
};

const panelCardStyle: React.CSSProperties = {
  backgroundColor: '#131b2e',
  borderRadius: '12px',
  border: '1px solid #1e293b',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  height: '100%',
};

const cardHeaderStyle: React.CSSProperties = {
  padding: '12px 16px',
  backgroundColor: '#0f172a',
  borderBottom: '1px solid #1e293b',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#94a3b8',
  marginBottom: '4px',
};

const posInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  borderRadius: '6px',
  border: '1px solid #334155',
  backgroundColor: '#0f172a',
  color: '#f8fafc',
  fontSize: '12px',
  outline: 'none',
  boxSizing: 'border-box',
};

const orderItemRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 10px',
  backgroundColor: '#0f172a',
  borderRadius: '8px',
  border: '1px solid #1e293b',
};

const qtyBtnStyle: React.CSSProperties = {
  width: '24px',
  height: '24px',
  borderRadius: '6px',
  backgroundColor: '#1e293b',
  color: '#f8fafc',
  border: '1px solid #334155',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

const calcBoxStyle: React.CSSProperties = {
  backgroundColor: '#0f172a',
  borderRadius: '8px',
  padding: '10px 12px',
  border: '1px solid #1e293b',
  marginTop: '8px',
};

const calcRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '12px',
  color: '#94a3b8',
  marginBottom: '4px',
};

const primaryPrintBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '12px 14px',
  borderRadius: '8px',
  backgroundColor: '#10b981',
  color: '#ffffff',
  border: 'none',
  fontSize: '13px',
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
};

const kitchenPrintBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '12px 14px',
  borderRadius: '8px',
  backgroundColor: '#dc2626',
  color: '#ffffff',
  border: 'none',
  fontSize: '13px',
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
};

const quickTestBtnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '4px',
  padding: '6px 4px',
  borderRadius: '6px',
  backgroundColor: '#0f172a',
  border: '1px solid #2a374e',
  color: '#e2e8f0',
  fontSize: '10px',
  fontWeight: 600,
  cursor: 'pointer',
};

const clearBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '11px',
  color: '#94a3b8',
  backgroundColor: 'transparent',
  border: 'none',
  cursor: 'pointer',
};

const statusOverviewBoxStyle: React.CSSProperties = {
  backgroundColor: '#0f172a',
  borderRadius: '8px',
  padding: '10px',
  border: '1px solid #1e293b',
};

const statusBadgeItemStyle = (ok: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '11px',
  color: ok ? '#34d399' : '#94a3b8',
  backgroundColor: '#131b2e',
  padding: '6px 8px',
  borderRadius: '6px',
});

const logContainerStyle: React.CSSProperties = {
  flex: 1,
  backgroundColor: '#0b0f19',
  borderRadius: '8px',
  border: '1px solid #1e293b',
  padding: '8px',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  minHeight: '220px',
};

const logItemStyle = (type: string): React.CSSProperties => ({
  padding: '8px 10px',
  borderRadius: '6px',
  backgroundColor: '#131b2e',
  borderLeft: `3px solid ${
    type === 'success'
      ? '#10b981'
      : type === 'warn'
      ? '#f59e0b'
      : type === 'error'
      ? '#ef4444'
      : '#3b82f6'
  }`,
});

const logTypeBadgeStyle = (type: string): React.CSSProperties => ({
  fontSize: '9px',
  fontWeight: 800,
  padding: '1px 5px',
  borderRadius: '4px',
  backgroundColor:
    type === 'success'
      ? 'rgba(16, 185, 129, 0.2)'
      : type === 'warn'
      ? 'rgba(245, 158, 11, 0.2)'
      : type === 'error'
      ? 'rgba(239, 68, 68, 0.2)'
      : 'rgba(59, 130, 246, 0.2)',
  color:
    type === 'success'
      ? '#34d399'
      : type === 'warn'
      ? '#fbbf24'
      : type === 'error'
      ? '#f87171'
      : '#60a5fa',
});

const logMethodBadgeStyle: React.CSSProperties = {
  fontSize: '9px',
  fontWeight: 700,
  padding: '1px 5px',
  borderRadius: '4px',
  backgroundColor: '#1e293b',
  color: '#94a3b8',
};

const logDetailPreStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#94a3b8',
  backgroundColor: '#090d16',
  padding: '4px 6px',
  borderRadius: '4px',
  marginTop: '4px',
  overflowX: 'auto',
};

const tipBoxStyle: React.CSSProperties = {
  backgroundColor: 'rgba(56, 189, 248, 0.08)',
  border: '1px solid rgba(56, 189, 248, 0.2)',
  borderRadius: '8px',
  padding: '10px 12px',
};
