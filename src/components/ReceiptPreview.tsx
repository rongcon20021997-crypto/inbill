'use client';

import React, { useState } from 'react';
import { FileText, Code2, Eye, Copy, Check } from 'lucide-react';
import BillPrint from './BillPrint';
import KitchenBillPrint from './KitchenBillPrint';
import { BillPrintProps, KitchenBillPrintProps } from '../types/printer';
import { generateEscPosBill, generateEscPosKitchenBill } from '../utils/escpos';

interface ReceiptPreviewProps {
  billData: BillPrintProps;
  kitchenData: KitchenBillPrintProps;
  mode: 'bill' | 'kitchen';
  onModeChange: (mode: 'bill' | 'kitchen') => void;
}

export default function ReceiptPreview({
  billData,
  kitchenData,
  mode,
  onModeChange,
}: ReceiptPreviewProps) {
  const [viewType, setViewType] = useState<'visual' | 'escpos'>('visual');
  const [copied, setCopied] = useState(false);

  // Sinh byte ESC/POS thực tế
  const escposBytes = mode === 'bill' ? generateEscPosBill(billData) : generateEscPosKitchenBill(kitchenData);

  // Hiển thị dạng Hex & Text
  const formatHexDump = (bytes: Uint8Array): string => {
    let result = '';
    const length = Math.min(bytes.length, 1024); // Giới hạn xem trước 1KB đầu
    for (let i = 0; i < length; i += 16) {
      const offsetStr = i.toString(16).padStart(4, '0').toUpperCase();
      const chunk = bytes.slice(i, i + 16);
      let hexPart = '';
      let asciiPart = '';

      for (let j = 0; j < 16; j++) {
        if (j < chunk.length) {
          hexPart += chunk[j].toString(16).padStart(2, '0').toUpperCase() + ' ';
          // ASCII hiển thị nếu là ký tự in được
          const c = chunk[j];
          asciiPart += c >= 32 && c <= 126 ? String.fromCharCode(c) : '.';
        } else {
          hexPart += '   ';
        }
      }

      result += `${offsetStr}:  ${hexPart} |${asciiPart}|\n`;
    }
    if (bytes.length > 1024) {
      result += `\n... [Còn ${bytes.length - 1024} bytes nữa]`;
    }
    return result;
  };

  const hexDumpText = formatHexDump(escposBytes);

  const handleCopyHex = () => {
    navigator.clipboard.writeText(hexDumpText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={containerStyle}>
      {/* Header controls */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => onModeChange('bill')}
            style={getModeBtnStyle(mode === 'bill')}
          >
            <FileText size={14} />
            <span>Hóa Đơn Thu Ngân</span>
          </button>
          <button
            onClick={() => onModeChange('kitchen')}
            style={getModeBtnStyle(mode === 'kitchen')}
          >
            <FileText size={14} />
            <span>Phiếu Order Bếp</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '4px', backgroundColor: '#0f172a', padding: '2px', borderRadius: '6px' }}>
          <button
            onClick={() => setViewType('visual')}
            style={getViewToggleStyle(viewType === 'visual')}
            title="Xem trước hóa đơn thực tế"
          >
            <Eye size={14} />
            <span>Giấy 80mm</span>
          </button>
          <button
            onClick={() => setViewType('escpos')}
            style={getViewToggleStyle(viewType === 'escpos')}
            title="Xem mã lệnh ESC/POS Byte Stream"
          >
            <Code2 size={14} />
            <span>Mã ESC/POS ({escposBytes.length}B)</span>
          </button>
        </div>
      </div>

      {/* Body Area */}
      <div style={bodyStyle}>
        {viewType === 'visual' ? (
          <div style={paperRollWrapperStyle}>
            {/* Hiệu ứng mép giấy răng cưa nhiệt */}
            <div style={sawtoothTopStyle} />
            <div style={paperContentStyle}>
              {mode === 'bill' ? (
                <BillPrint {...billData} />
              ) : (
                <KitchenBillPrint {...kitchenData} />
              )}
            </div>
            <div style={sawtoothBottomStyle} />
          </div>
        ) : (
          <div style={{ position: 'relative', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Tổng kích thước buffer: <strong style={{ color: '#38bdf8' }}>{escposBytes.length} bytes</strong> | Lệnh cắt giấy: <strong style={{ color: '#10b981' }}>GS V (0x1D 0x56)</strong>
              </span>
              <button onClick={handleCopyHex} style={copyBtnStyle}>
                {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                <span>{copied ? 'Đã sao chép' : 'Sao chép Hex'}</span>
              </button>
            </div>
            <pre style={hexCodeBlockStyle}>
              {hexDumpText}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  backgroundColor: '#1e293b',
  borderRadius: '12px',
  border: '1px solid #334155',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  backgroundColor: '#0f172a',
  borderBottom: '1px solid #334155',
  flexWrap: 'wrap',
  gap: '8px',
};

const getModeBtnStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 600,
  backgroundColor: active ? '#2563eb' : 'transparent',
  color: active ? '#ffffff' : '#94a3b8',
  border: active ? '1px solid #3b82f6' : '1px solid transparent',
  cursor: 'pointer',
});

const getViewToggleStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 10px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 600,
  backgroundColor: active ? '#334155' : 'transparent',
  color: active ? '#f8fafc' : '#64748b',
  border: 'none',
  cursor: 'pointer',
});

const bodyStyle: React.CSSProperties = {
  flex: 1,
  padding: '16px',
  overflowY: 'auto',
  display: 'flex',
  justifyContent: 'center',
  backgroundColor: '#090d16',
};

const paperRollWrapperStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '340px',
  filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.6))',
  animation: 'fadeIn 0.3s ease',
};

const paperContentStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  padding: '8px 0',
  boxShadow: 'inset 0 0 10px rgba(0,0,0,0.03)',
};

const sawtoothTopStyle: React.CSSProperties = {
  height: '8px',
  backgroundImage: 'linear-gradient(135deg, #ffffff 4px, transparent 0), linear-gradient(-135deg, #ffffff 4px, transparent 0)',
  backgroundSize: '10px 8px',
  backgroundRepeat: 'repeat-x',
};

const sawtoothBottomStyle: React.CSSProperties = {
  height: '8px',
  backgroundImage: 'linear-gradient(45deg, #ffffff 4px, transparent 0), linear-gradient(-45deg, #ffffff 4px, transparent 0)',
  backgroundSize: '10px 8px',
  backgroundRepeat: 'repeat-x',
};

const copyBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '11px',
  backgroundColor: '#334155',
  color: '#e2e8f0',
  border: 'none',
  borderRadius: '4px',
  padding: '4px 8px',
  cursor: 'pointer',
};

const hexCodeBlockStyle: React.CSSProperties = {
  backgroundColor: '#020617',
  padding: '12px',
  borderRadius: '8px',
  border: '1px solid #1e293b',
  color: '#38bdf8',
  fontFamily: '"JetBrains Mono", Consolas, "Courier New", monospace',
  fontSize: '11px',
  lineHeight: '1.45',
  overflowX: 'auto',
  margin: 0,
};
