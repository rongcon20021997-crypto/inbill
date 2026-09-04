import React from 'react';
import { KitchenBillPrintProps } from '../types/printer';

export default function KitchenBillPrint(props: KitchenBillPrintProps) {
  const { orderCode, tableName, orderTime, printTime, items, note } = props;

  return (
    <div
      className="kitchen-receipt-container"
      style={{
        width: '100%',
        maxWidth: '300px',
        margin: '0 auto',
        padding: '12px 8px',
        backgroundColor: '#ffffff',
        color: '#111827',
        fontFamily: '"Courier New", Courier, monospace, -apple-system, sans-serif',
        fontSize: '13px',
        lineHeight: '1.4',
        boxSizing: 'border-box',
      }}
    >
      {/* Header Bếp */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #111827', paddingBottom: '6px' }}>
        <div style={{ fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
          *** PHIẾU BẾP ***
        </div>
        <div style={{ fontSize: '20px', fontWeight: 900, margin: '4px 0', color: '#b91c1c' }}>
          {tableName || 'MANG VỀ'}
        </div>
        <div style={{ fontSize: '11px', color: '#4b5563' }}>
          Mã đơn: <strong>#{orderCode}</strong>
        </div>
      </div>

      {/* Meta Time */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', margin: '6px 0', borderBottom: '1px dashed #6b7280', paddingBottom: '4px' }}>
        <span>Đặt: <strong>{orderTime}</strong></span>
        {printTime && <span>In: <strong>{printTime}</strong></span>}
      </div>

      {/* Items for Kitchen */}
      <div style={{ margin: '8px 0' }}>
        {items.map((item, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: '8px',
              paddingBottom: '6px',
              borderBottom: idx < items.length - 1 ? '1px dotted #9ca3af' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span
                style={{
                  display: 'inline-block',
                  backgroundColor: '#111827',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '15px',
                  padding: '1px 6px',
                  borderRadius: '3px',
                  marginRight: '8px',
                }}
              >
                {item.quantity}
              </span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#000000' }}>
                {item.name}
              </span>
            </div>

            {item.options && item.options.map((opt, oIdx) => (
              <div key={oIdx} style={{ fontSize: '12px', color: '#374151', paddingLeft: '32px', marginTop: '2px' }}>
                ↳ {opt}
              </div>
            ))}

            {item.note && (
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#dc2626',
                  paddingLeft: '32px',
                  marginTop: '2px',
                  fontStyle: 'italic',
                }}
              >
                ⚠️ {item.note}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Note for order */}
      {note && (
        <div style={{ borderTop: '2px solid #111827', paddingTop: '6px', marginTop: '6px' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#b91c1c' }}>
            LƯU Ý TOÀN ĐƠN:
          </div>
          <div style={{ fontSize: '12px', fontStyle: 'italic', marginTop: '2px' }}>
            {note}
          </div>
        </div>
      )}

      {/* Cutting line */}
      <div style={{ borderTop: '1px dashed #6b7280', marginTop: '12px', paddingTop: '6px', textAlign: 'center', fontSize: '10px', color: '#6b7280' }}>
        ---------------- [ HẾT PHIẾU BẾP ] ----------------
      </div>
    </div>
  );
}
