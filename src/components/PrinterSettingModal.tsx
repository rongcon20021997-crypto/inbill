'use client';

import React, { useState, useEffect } from 'react';
import {
  Printer,
  Usb,
  Cpu,
  Globe,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Settings2,
  RefreshCw,
  Zap,
  Info,
  Sliders,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { PrinterConfig, PrinterMethod } from '../types/printer';
import {
  checkWebSerialStatus,
  getStoredBaudRate,
  saveStoredBaudRate,
  getPairedSerialPort,
  requestSerialPort,
  testSerialPrinter,
  forgetAllSerialPorts,
} from '../services/print/serialPrintService';
import {
  checkWebUsbStatus,
  getPairedUsbPrinter,
  requestUsbPrinter,
  testUsbPrinter,
} from '../services/print/usbPrintService';
import {
  getStoredPrinterConfig,
  savePrinterConfig,
  testPrinterConnection,
} from '../services/print/printService';

interface PrinterSettingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestBrowser?: () => void;
}

export default function PrinterSettingModal({ isOpen, onClose, onTestBrowser }: PrinterSettingModalProps) {
  const [activeTab, setActiveTab] = useState<PrinterMethod>('serial');
  const [config, setConfig] = useState<PrinterConfig>(getStoredPrinterConfig());
  const [serialStatus, setSerialStatus] = useState<{ supported: boolean; reason?: string }>({ supported: false });
  const [usbStatus, setUsbStatus] = useState<{ supported: boolean; reason?: string }>({ supported: false });
  const [pairedPortInfo, setPairedPortInfo] = useState<string | null>(null);
  const [pairedUsbInfo, setPairedUsbInfo] = useState<string | null>(null);
  const [testingStatus, setTestingStatus] = useState<{ loading: boolean; message: string; success?: boolean } | null>(null);
  const [saveToast, setSaveToast] = useState(false);

  // Khởi tạo kiểm tra môi trường khi mở modal
  useEffect(() => {
    if (isOpen) {
      const sStat = checkWebSerialStatus();
      setSerialStatus(sStat);

      const uStat = checkWebUsbStatus();
      setUsbStatus(uStat);

      const loadedConfig = getStoredPrinterConfig();
      setConfig(loadedConfig);
      setActiveTab(loadedConfig.defaultMethod);

      // Kiểm tra thiết bị đã paired
      getPairedSerialPort().then((port) => {
        if (port) {
          const info = port.getInfo ? port.getInfo() : null;
          setPairedPortInfo(
            info && info.usbVendorId
              ? `Cổng COM (VID: 0x${info.usbVendorId.toString(16)}, PID: 0x${info.usbProductId?.toString(16)})`
              : 'Cổng COM đã kết nối'
          );
        } else {
          setPairedPortInfo(null);
        }
      });

      getPairedUsbPrinter().then((dev) => {
        if (dev) {
          setPairedUsbInfo(
            dev.productName || `USB Device (${dev.vendorId?.toString(16)}:${dev.productId?.toString(16)})`
          );
        } else {
          setPairedUsbInfo(null);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    savePrinterConfig(config);
    saveStoredBaudRate(config.baudRate);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleResetSerialPorts = async () => {
    await forgetAllSerialPorts();
    setPairedPortInfo(null);
    setTestingStatus({
      loading: false,
      success: true,
      message: 'Đã xóa toàn bộ cổng COM đã ghép nối cũ. Bạn có thể bấm "Chọn / Đổi Cổng COM" để chọn lại đúng cổng.',
    });
  };

  const handleSelectSerialPort = async () => {
    setTestingStatus({ loading: true, message: 'Đang mở cửa sổ chọn cổng COM...' });
    try {
      const port = await requestSerialPort();
      if (port) {
        const info = port.getInfo ? port.getInfo() : null;
        const name = info && info.usbVendorId
          ? `Cổng COM (VID: 0x${info.usbVendorId.toString(16)}, PID: 0x${info.usbProductId?.toString(16)})`
          : 'Cổng COM đã chọn';
        setPairedPortInfo(name);
        setTestingStatus({
          loading: false,
          success: true,
          message: `Đã kết nối và lưu quyền truy cập: ${name}`,
        });
      }
    } catch (err: any) {
      setTestingStatus({
        loading: false,
        success: false,
        message: err.message || 'Chưa chọn cổng COM',
      });
    }
  };

  const handleTestSerial = async () => {
    setTestingStatus({ loading: true, message: 'Đang gửi lệnh in test ra Cổng COM...' });
    const res = await testSerialPrinter();
    setTestingStatus({
      loading: false,
      success: res.success,
      message: res.message,
    });
  };

  const handleSelectUsbDevice = async () => {
    setTestingStatus({ loading: true, message: 'Đang mở cửa sổ chọn thiết bị USB...' });
    try {
      const dev = await requestUsbPrinter();
      if (dev) {
        const name = dev.productName || `USB Device (${dev.vendorId?.toString(16)}:${dev.productId?.toString(16)})`;
        setPairedUsbInfo(name);
        setTestingStatus({
          loading: false,
          success: true,
          message: `Đã cấp quyền thiết bị USB: ${name}`,
        });
      }
    } catch (err: any) {
      setTestingStatus({
        loading: false,
        success: false,
        message: err.message || 'Chưa chọn thiết bị USB',
      });
    }
  };

  const handleTestUsb = async () => {
    setTestingStatus({ loading: true, message: 'Đang gửi dữ liệu in test ra máy in USB...' });
    const res = await testUsbPrinter();
    setTestingStatus({
      loading: false,
      success: res.success,
      message: res.message,
    });
  };

  const handleTestIp = async (type: 'bill' | 'kitchen') => {
    const targetIp = type === 'bill' ? config.billPrinterIp : config.kitchenPrinterIp;
    const label = type === 'bill' ? 'Thu ngân' : 'Bếp';
    setTestingStatus({ loading: true, message: `Đang kết nối Socket TCP 9100 tới máy in ${label} (${targetIp})...` });
    const res = await testPrinterConnection(targetIp, config.printerPort);
    setTestingStatus({
      loading: false,
      success: res.success,
      message: res.message,
    });
  };

  const handleTestBrowser = () => {
    if (onTestBrowser) {
      onTestBrowser();
      setTestingStatus({
        loading: false,
        success: true,
        message: 'Đã kích hoạt hộp thoại in của trình duyệt (hoặc Kiosk Print).',
      });
    }
  };

  return (
    <div className="modal-backdrop" style={backdropStyle}>
      <div className="modal-card" style={modalCardStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={iconBadgeStyle}>
              <Printer size={22} color="#3b82f6" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
                Cấu Hình & Quản Lý Máy In Nhiệt
              </h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                Hỗ trợ Cổng COM, Cáp USB, Mạng LAN IP 9100 & Trình duyệt
              </p>
            </div>
          </div>
          <button onClick={onClose} style={closeBtnStyle} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        {/* Status Toast */}
        {saveToast && (
          <div style={toastStyle}>
            <CheckCircle2 size={16} color="#10b981" />
            <span>Đã lưu cấu hình máy in thành công!</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={tabContainerStyle}>
          <button
            onClick={() => { setActiveTab('serial'); setTestingStatus(null); }}
            style={getTabBtnStyle(activeTab === 'serial')}
          >
            <Zap size={16} />
            <span>Cổng COM (Serial)</span>
            {config.defaultMethod === 'serial' && <span style={defaultBadgeStyle}>Mặc định</span>}
          </button>

          <button
            onClick={() => { setActiveTab('usb'); setTestingStatus(null); }}
            style={getTabBtnStyle(activeTab === 'usb')}
          >
            <Usb size={16} />
            <span>Cáp USB (WebUSB)</span>
            {config.defaultMethod === 'usb' && <span style={defaultBadgeStyle}>Mặc định</span>}
          </button>

          <button
            onClick={() => { setActiveTab('ip'); setTestingStatus(null); }}
            style={getTabBtnStyle(activeTab === 'ip')}
          >
            <Globe size={16} />
            <span>Mạng LAN / IP</span>
            {config.defaultMethod === 'ip' && <span style={defaultBadgeStyle}>Mặc định</span>}
          </button>

          <button
            onClick={() => { setActiveTab('browser'); setTestingStatus(null); }}
            style={getTabBtnStyle(activeTab === 'browser')}
          >
            <Monitor size={16} />
            <span>Trình duyệt (Kiosk)</span>
            {config.defaultMethod === 'browser' && <span style={defaultBadgeStyle}>Mặc định</span>}
          </button>
        </div>

        {/* Tab Contents */}
        <div style={contentBodyStyle}>
          {/* TAB 1: CỔNG COM (SERIAL) */}
          {activeTab === 'serial' && (
            <div>
              {/* Trạng thái hỗ trợ */}
              <div style={statusCardStyle(serialStatus.supported)}>
                {serialStatus.supported ? (
                  <CheckCircle2 size={20} color="#10b981" />
                ) : (
                  <AlertTriangle size={20} color="#f59e0b" />
                )}
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#f8fafc' }}>
                    Trạng thái Web Serial API:{' '}
                    <span style={{ color: serialStatus.supported ? '#10b981' : '#f59e0b' }}>
                      {serialStatus.supported ? 'Sẵn sàng & Được hỗ trợ' : 'Chưa hỗ trợ hoặc bị chặn'}
                    </span>
                  </div>
                  {serialStatus.reason && (
                    <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '3px' }}>
                      {serialStatus.reason}
                    </div>
                  )}
                </div>
              </div>

              {/* Thông tin ghép nối */}
              <div style={sectionBoxStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <label style={labelStyle}>Thiết bị Cổng COM đã chọn:</label>
                    <div style={{ fontSize: '13px', color: pairedPortInfo ? '#38bdf8' : '#94a3b8', fontWeight: 600 }}>
                      {pairedPortInfo || 'Chưa chọn cổng COM (Nhấn nút bên cạnh để chọn)'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {pairedPortInfo && (
                      <button
                        onClick={handleResetSerialPorts}
                        style={{ ...secondaryBtnStyle, padding: '7px 12px', fontSize: '11px', color: '#f87171' }}
                        title="Xóa ghép nối cổng COM hiện tại để chọn lại từ đầu"
                      >
                        <Trash2 size={13} />
                        <span>Xóa Ghép Nối Cũ</span>
                      </button>
                    )}
                    <button
                      onClick={handleSelectSerialPort}
                      disabled={!serialStatus.supported}
                      style={primaryBtnStyle}
                    >
                      <RefreshCw size={14} />
                      <span>{pairedPortInfo ? 'Đổi / Chọn Lại COM' : 'Chọn / Ghép Nối COM'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Hộp hướng dẫn khắc phục lỗi Failed to open serial port */}
              <div style={{ ...alertNoticeStyle, borderLeft: '4px solid #f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.08)' }}>
                <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '12px', color: '#fde68a', lineHeight: '1.5' }}>
                  <strong style={{ color: '#fbbf24' }}>Gặp lỗi &quot;Failed to open serial port&quot;?</strong>
                  <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                    <li>
                      <strong>1. Bạn đang chọn nhầm cổng COM:</strong> Hầu hết máy tính có cổng <code>COM1</code> mặc định trên bo mạch chủ. Nếu bạn chọn <code>COM1</code>, Windows sẽ từ chối mở. Hãy bấm nút <strong>&quot;Đổi / Chọn Lại COM&quot;</strong> ở trên và chọn cổng USB-to-Serial của máy in (thường là <code>COM3</code>, <code>COM4</code>, <code>COM5</code>...).
                    </li>
                    <li>
                      <strong>2. Driver Windows đang giữ cổng:</strong> Nếu bạn đã cài Driver hãng (như Xprinter, POS-80), dịch vụ Windows Print Spooler sẽ chiếm độc quyền cổng này.
                    </li>
                    <li>
                      <strong>3. Máy in cắm cáp USB thông thường:</strong> Nếu máy in cắm dây USB trực tiếp (không phải cổng COM ảo), hãy chuyển sang tab <button type="button" onClick={() => setActiveTab('browser')} style={{ background: 'none', border: 'none', color: '#38bdf8', textDecoration: 'underline', cursor: 'pointer', fontWeight: 700, padding: 0 }}>Trình duyệt (Kiosk)</button> hoặc <button type="button" onClick={() => setActiveTab('usb')} style={{ background: 'none', border: 'none', color: '#38bdf8', textDecoration: 'underline', cursor: 'pointer', fontWeight: 700, padding: 0 }}>Cáp USB (WebUSB)</button> để in trực tiếp không cần cổng COM!
                    </li>
                  </ul>
                </div>
              </div>

              {/* Tùy chỉnh Baud Rate */}
              <div style={{ ...sectionBoxStyle, marginTop: '14px' }}>
                <label style={labelStyle}>Tốc độ truyền (Baud Rate):</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {[9600, 19200, 38400, 115200].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, baudRate: rate }))}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: config.baudRate === rate ? '2px solid #3b82f6' : '1px solid #334155',
                        backgroundColor: config.baudRate === rate ? '#1e3a8a' : '#1e293b',
                        color: config.baudRate === rate ? '#ffffff' : '#94a3b8',
                        cursor: 'pointer',
                      }}
                    >
                      {rate} bps {rate === 9600 && '(Mặc định)'}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                  Hầu hết các máy in hóa đơn nhiệt POS (Xprinter, Bixolon, Epson) mặc định chạy ở 9600 bps.
                </div>
              </div>

              {/* In Thử Nghiệm COM */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleTestSerial}
                  disabled={testingStatus?.loading || !serialStatus.supported}
                  style={testActionBtnStyle}
                >
                  <Printer size={16} />
                  <span>In Thử Nghiệm Cổng COM (Slip Test)</span>
                </button>
                {config.defaultMethod !== 'serial' && (
                  <button
                    onClick={() => setConfig((p) => ({ ...p, defaultMethod: 'serial' }))}
                    style={secondaryBtnStyle}
                  >
                    <Check size={16} />
                    <span>Đặt làm máy in mặc định</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CÁP USB TRỰC TIẾP */}
          {activeTab === 'usb' && (
            <div>
              <div style={statusCardStyle(usbStatus.supported)}>
                {usbStatus.supported ? (
                  <CheckCircle2 size={20} color="#10b981" />
                ) : (
                  <AlertTriangle size={20} color="#f59e0b" />
                )}
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#f8fafc' }}>
                    Trạng thái WebUSB API:{' '}
                    <span style={{ color: usbStatus.supported ? '#10b981' : '#f59e0b' }}>
                      {usbStatus.supported ? 'Sẵn sàng & Được hỗ trợ' : 'Chưa hỗ trợ hoặc bị chặn'}
                    </span>
                  </div>
                  {usbStatus.reason && (
                    <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '3px' }}>
                      {usbStatus.reason}
                    </div>
                  )}
                </div>
              </div>

              {/* Thông tin thiết bị USB */}
              <div style={sectionBoxStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <label style={labelStyle}>Máy in USB đã ghép nối:</label>
                    <div style={{ fontSize: '13px', color: pairedUsbInfo ? '#38bdf8' : '#94a3b8', fontWeight: 600 }}>
                      {pairedUsbInfo || 'Chưa cấp quyền thiết bị USB'}
                    </div>
                  </div>
                  <button
                    onClick={handleSelectUsbDevice}
                    disabled={!usbStatus.supported}
                    style={primaryBtnStyle}
                  >
                    <Usb size={14} />
                    <span>Chọn Máy In USB</span>
                  </button>
                </div>
              </div>

              {/* Lưu ý kỹ thuật WinUSB */}
              <div style={alertNoticeStyle}>
                <Info size={18} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '12px', color: '#bae6fd', lineHeight: '1.4' }}>
                  <strong>Lưu ý quan trọng trên Windows:</strong> Nếu Driver mặc định của hãng máy in (Xprinter Driver, POS Driver) đang chiếm giữ cổng USB độc quyền, WebUSB có thể báo lỗi <em>claimInterface</em>.
                  Bạn có thể dùng tiện ích <strong>Zadig</strong> để đổi driver sang <strong>WinUSB</strong>, hoặc đơn giản hơn là sử dụng phương thức <strong>Cổng COM (Serial)</strong> cực kỳ mượt mà.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  onClick={handleTestUsb}
                  disabled={testingStatus?.loading || !usbStatus.supported}
                  style={testActionBtnStyle}
                >
                  <Printer size={16} />
                  <span>In Thử Nghiệm USB (Bulk Transfer)</span>
                </button>
                {config.defaultMethod !== 'usb' && (
                  <button
                    onClick={() => setConfig((p) => ({ ...p, defaultMethod: 'usb' }))}
                    style={secondaryBtnStyle}
                  >
                    <Check size={16} />
                    <span>Đặt làm máy in mặc định</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MẠNG LAN / IP */}
          {activeTab === 'ip' && (
            <div>
              <div style={sectionBoxStyle}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>IP Máy In Hóa Đơn Thu Ngân (Cổng 9100):</label>
                    <input
                      type="text"
                      value={config.billPrinterIp}
                      onChange={(e) => setConfig({ ...config, billPrinterIp: e.target.value })}
                      placeholder="192.168.1.200"
                      style={inputStyle}
                    />
                    <button
                      onClick={() => handleTestIp('bill')}
                      disabled={testingStatus?.loading}
                      style={{ ...secondaryBtnStyle, width: '100%', marginTop: '8px' }}
                    >
                      <Zap size={14} />
                      <span>Test Kết Nối Máy Thu Ngân</span>
                    </button>
                  </div>

                  <div>
                    <label style={labelStyle}>IP Máy In Báo Bếp (Kitchen Printer):</label>
                    <input
                      type="text"
                      value={config.kitchenPrinterIp}
                      onChange={(e) => setConfig({ ...config, kitchenPrinterIp: e.target.value })}
                      placeholder="192.168.1.201"
                      style={inputStyle}
                    />
                    <button
                      onClick={() => handleTestIp('kitchen')}
                      disabled={testingStatus?.loading}
                      style={{ ...secondaryBtnStyle, width: '100%', marginTop: '8px' }}
                    >
                      <Zap size={14} />
                      <span>Test Kết Nối Máy Bếp</span>
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '12px' }}>
                  <label style={labelStyle}>Cổng RAW TCP Socket (Mặc định 9100):</label>
                  <input
                    type="number"
                    value={config.printerPort}
                    onChange={(e) => setConfig({ ...config, printerPort: parseInt(e.target.value, 10) || 9100 })}
                    style={{ ...inputStyle, maxWidth: '160px' }}
                  />
                </div>
              </div>

              <div style={alertNoticeStyle}>
                <Info size={18} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '12px', color: '#bae6fd', lineHeight: '1.4' }}>
                  <strong>Cơ chế in qua IP:</strong> Trình duyệt gửi lệnh lên Next.js Server App Router (<code>/api/print</code>), server mở kết nối Socket TCP trực tiếp tới cổng 9100 của máy in trong mạng nội bộ. Rất thích hợp để in phiếu chế biến từ xa cho bếp và quầy pha chế mà không cần dây nối máy tính.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                {config.defaultMethod !== 'ip' && (
                  <button
                    onClick={() => setConfig((p) => ({ ...p, defaultMethod: 'ip' }))}
                    style={secondaryBtnStyle}
                  >
                    <Check size={16} />
                    <span>Đặt làm máy in mặc định</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: TRÌNH DUYỆT (BROWSER / KIOSK) */}
          {activeTab === 'browser' && (
            <div>
              <div style={sectionBoxStyle}>
                <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: '#f8fafc', fontWeight: 600 }}>
                  In Qua Trình Duyệt & Chế Độ Kiosk Tự Động
                </h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>
                  Sử dụng công nghệ ẩn iframe DOM và CSS <code>@page &#123; size: 80mm auto &#125;</code>.
                  Tương thích 100% với mọi hệ điều hành và trình duyệt thông qua Driver máy in Windows/macOS.
                </p>
              </div>

              {/* Hướng dẫn bật Kiosk Chrome */}
              <div style={{ ...sectionBoxStyle, backgroundColor: '#0f172a' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#38bdf8', marginBottom: '6px' }}>
                  🚀 Mẹo in tự động tức thì (Bỏ qua hộp thoại Print Preview):
                </div>
                <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6' }}>
                  <li>Tạo một shortcut của Google Chrome hoặc Edge ngoài màn hình Desktop.</li>
                  <li>Click chuột phải chọn <strong>Properties</strong> &gt; Thẻ <strong>Shortcut</strong>.</li>
                  <li>
                    Tại mục <strong>Target</strong>, thêm cờ sau vào cuối đường dẫn:{' '}
                    <code style={{ backgroundColor: '#1e293b', padding: '2px 6px', borderRadius: '4px', color: '#38bdf8' }}>
                      --kiosk-printing
                    </code>
                  </li>
                  <li>Khởi động lại Chrome bằng shortcut này, mỗi khi thu ngân bấm in, máy sẽ lập tức in và cắt giấy không cần bấm xác nhận!</li>
                </ol>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button onClick={handleTestBrowser} style={testActionBtnStyle}>
                  <Printer size={16} />
                  <span>In Thử Nghiệm Qua Trình Duyệt</span>
                </button>
                {config.defaultMethod !== 'browser' && (
                  <button
                    onClick={() => setConfig((p) => ({ ...p, defaultMethod: 'browser' }))}
                    style={secondaryBtnStyle}
                  >
                    <Check size={16} />
                    <span>Đặt làm máy in mặc định</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Alert kết quả in thử */}
          {testingStatus && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: testingStatus.loading
                  ? '#1e293b'
                  : testingStatus.success
                  ? 'rgba(16, 185, 129, 0.15)'
                  : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${
                  testingStatus.loading
                    ? '#334155'
                    : testingStatus.success
                    ? '#059669'
                    : '#dc2626'
                }`,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              {testingStatus.loading ? (
                <RefreshCw size={18} className="animate-spin" color="#38bdf8" />
              ) : testingStatus.success ? (
                <CheckCircle2 size={18} color="#10b981" />
              ) : (
                <XCircle size={18} color="#ef4444" />
              )}
              <div style={{ fontSize: '13px', color: '#f8fafc', flex: 1 }}>
                {testingStatus.message}
              </div>
            </div>
          )}

          {/* Cấu hình chung dưới đáy */}
          <div style={{ marginTop: '20px', borderTop: '1px solid #334155', paddingTop: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', marginBottom: '12px' }}>
              ⚙️ Cấu hình hoạt động tổng quát:
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={config.autoFallback}
                  onChange={(e) => setConfig({ ...config, autoFallback: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: '#3b82f6' }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '12px' }}>
                    Tự động Fallback sang Trình duyệt
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Nếu in COM/USB/IP bị ngắt cáp hoặc lỗi, tự động mở cửa sổ in trình duyệt để thu ngân không bị gián đoạn.
                  </div>
                </div>
              </label>

              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={config.openCashDrawer}
                  onChange={(e) => setConfig({ ...config, openCashDrawer: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: '#3b82f6' }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '12px' }}>
                    Bật lệnh mở két tiền (ESC p)
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Gửi xung điện kích hoạt mở ngăn kéo đựng tiền thu ngân khi in bill xong.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div style={footerStyle}>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Phương thức mặc định hiện tại:{' '}
            <strong style={{ color: '#38bdf8', textTransform: 'uppercase' }}>
              {config.defaultMethod}
            </strong>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} style={secondaryBtnStyle}>
              Đóng
            </button>
            <button onClick={handleSave} style={saveBtnStyle}>
              <Check size={16} />
              <span>Lưu Cấu Hình</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Styling tokens
const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: '16px',
};

const modalCardStyle: React.CSSProperties = {
  backgroundColor: '#1e293b',
  borderRadius: '14px',
  width: '100%',
  maxWidth: '780px',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
  overflow: 'hidden',
  color: '#f8fafc',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '18px 24px',
  borderBottom: '1px solid #334155',
  backgroundColor: '#0f172a',
};

const iconBadgeStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  borderRadius: '10px',
  backgroundColor: 'rgba(59, 130, 246, 0.15)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#94a3b8',
  cursor: 'pointer',
  padding: '6px',
  borderRadius: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const toastStyle: React.CSSProperties = {
  backgroundColor: 'rgba(16, 185, 129, 0.2)',
  borderBottom: '1px solid #10b981',
  color: '#6ee7b7',
  padding: '8px 24px',
  fontSize: '12px',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const tabContainerStyle: React.CSSProperties = {
  display: 'flex',
  backgroundColor: '#0f172a',
  padding: '4px 16px',
  gap: '6px',
  borderBottom: '1px solid #334155',
  overflowX: 'auto',
};

const getTabBtnStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 16px',
  fontSize: '13px',
  fontWeight: active ? 700 : 500,
  color: active ? '#38bdf8' : '#94a3b8',
  backgroundColor: active ? '#1e293b' : 'transparent',
  border: 'none',
  borderTopLeftRadius: '8px',
  borderTopRightRadius: '8px',
  borderBottom: active ? '2px solid #38bdf8' : '2px solid transparent',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.15s ease',
});

const defaultBadgeStyle: React.CSSProperties = {
  fontSize: '10px',
  backgroundColor: '#0369a1',
  color: '#ffffff',
  padding: '2px 6px',
  borderRadius: '10px',
  fontWeight: 600,
};

const contentBodyStyle: React.CSSProperties = {
  padding: '20px 24px',
  overflowY: 'auto',
  flex: 1,
};

const statusCardStyle = (supported: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '12px',
  padding: '12px 16px',
  borderRadius: '10px',
  backgroundColor: supported ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
  border: `1px solid ${supported ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
  marginBottom: '16px',
});

const sectionBoxStyle: React.CSSProperties = {
  backgroundColor: '#0f172a',
  borderRadius: '10px',
  padding: '14px 16px',
  marginBottom: '14px',
  border: '1px solid #334155',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#94a3b8',
  marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #334155',
  backgroundColor: '#1e293b',
  color: '#f8fafc',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
};

const alertNoticeStyle: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
  padding: '12px 14px',
  backgroundColor: 'rgba(56, 189, 248, 0.1)',
  border: '1px solid rgba(56, 189, 248, 0.25)',
  borderRadius: '8px',
  marginTop: '12px',
};

const primaryBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 14px',
  borderRadius: '6px',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
};

const secondaryBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  padding: '8px 14px',
  borderRadius: '6px',
  backgroundColor: '#334155',
  color: '#e2e8f0',
  border: 'none',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
};

const testActionBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 18px',
  borderRadius: '8px',
  backgroundColor: '#0284c7',
  color: '#ffffff',
  border: 'none',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.3)',
};

const saveBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 18px',
  borderRadius: '6px',
  backgroundColor: '#10b981',
  color: '#ffffff',
  border: 'none',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
};

const footerStyle: React.CSSProperties = {
  padding: '14px 24px',
  borderTop: '1px solid #334155',
  backgroundColor: '#0f172a',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
  alignItems: 'flex-start',
  cursor: 'pointer',
  padding: '8px',
  borderRadius: '8px',
  backgroundColor: '#0f172a',
};
