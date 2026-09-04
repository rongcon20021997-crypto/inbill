import React from 'react';
import { BillPrintProps } from '../types/printer';

export default function BillPrint(props: BillPrintProps) {
  const {
    storeName,
    storeAddress,
    branchAddresses,
    hotline,
    billCode,
    tableName,
    orderType,
    cashier,
    customerName,
    orderTime,
    items,
    subtotal,
    discount,
    discountNote,
    vat,
    total,
    customerPay,
    change,
    paymentMethod,
    wifiInfo,
    footerNotes,
  } = props;

  return (
    <div
      className="bill-receipt-container"
      style={{
        width: '100%',
        maxWidth: '300px',
        margin: '0 auto',
        padding: '12px 8px',
        backgroundColor: '#ffffff',
        color: '#111827',
        fontFamily: '"Courier New", Courier, monospace, -apple-system, sans-serif',
        fontSize: '12px',
        lineHeight: '1.35',
        boxSizing: 'border-box',
      }}
    >
      {/* Header Store Info */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {storeName}
        </div>
        <div style={{ fontSize: '11px', marginTop: '2px', color: '#374151' }}>
          {storeAddress}
        </div>
        {branchAddresses && branchAddresses.map((b, i) => (
          <div key={i} style={{ fontSize: '10px', color: '#4b5563' }}>{b}</div>
        ))}
        <div style={{ fontSize: '11px', marginTop: '2px', fontWeight: 600 }}>
          Hotline: {hotline}
        </div>
      </div>

      {/* Bill Title */}
      <div style={{ textAlign: 'center', margin: '8px 0 4px', borderTop: '1px dashed #6b7280', borderBottom: '1px dashed #6b7280', padding: '6px 0' }}>
        <div style={{ fontSize: '15px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
          HÓA ĐƠN THANH TOÁN
        </div>
        <div style={{ fontSize: '11px', marginTop: '2px' }}>
          Mã HĐ: <span style={{ fontWeight: 700 }}>{billCode}</span>
        </div>
      </div>

      {/* Order Info */}
      <div style={{ fontSize: '11px', margin: '6px 0', borderBottom: '1px dashed #9ca3af', paddingBottom: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Thời gian:</span>
          <span style={{ fontWeight: 600 }}>{orderTime}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Thu ngân:</span>
          <span>{cashier}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Khu vực:</span>
          <span style={{ fontWeight: 700 }}>{tableName || orderType || 'Mang về'}</span>
        </div>
        {customerName && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Khách hàng:</span>
            <span style={{ fontWeight: 600 }}>{customerName}</span>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div style={{ margin: '8px 0' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 800,
            borderBottom: '1px solid #111827',
            paddingBottom: '3px',
            marginBottom: '6px',
            fontSize: '11px',
          }}
        >
          <span style={{ width: '55%' }}>TÊN MÓN</span>
          <span style={{ width: '15%', textAlign: 'center' }}>SL</span>
          <span style={{ width: '30%', textAlign: 'right' }}>T.TIỀN</span>
        </div>

        {items.map((item, idx) => {
          const itemTotal = item.total ?? item.quantity * item.price;
          return (
            <div key={idx} style={{ marginBottom: '6px', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ width: '55%', fontWeight: 700, wordBreak: 'break-word' }}>
                  {item.name}
                </span>
                <span style={{ width: '15%', textAlign: 'center', fontWeight: 600 }}>
                  {item.quantity}
                </span>
                <span style={{ width: '30%', textAlign: 'right', fontWeight: 700 }}>
                  {itemTotal.toLocaleString('vi-VN')}đ
                </span>
              </div>
              <div style={{ fontSize: '10px', color: '#4b5563', paddingLeft: '4px' }}>
                {item.price.toLocaleString('vi-VN')}đ / phần
              </div>
              {item.toppings && item.toppings.map((top, tIdx) => (
                <div key={tIdx} style={{ fontSize: '10px', color: '#374151', paddingLeft: '8px' }}>
                  + {top.name} ({top.price.toLocaleString('vi-VN')}đ)
                </div>
              ))}
              {item.note && (
                <div style={{ fontSize: '10px', fontStyle: 'italic', color: '#1e40af', paddingLeft: '8px' }}>
                  * {item.note}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Totals Section */}
      <div style={{ borderTop: '1px dashed #6b7280', paddingTop: '6px', fontSize: '11px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
          <span>Tiền hàng:</span>
          <span>{subtotal.toLocaleString('vi-VN')}đ</span>
        </div>

        {discount && discount > 0 ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', color: '#dc2626' }}>
            <span>Giảm giá {discountNote ? `(${discountNote})` : ''}:</span>
            <span>-{discount.toLocaleString('vi-VN')}đ</span>
          </div>
        ) : null}

        {vat && vat > 0 ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span>Thuế VAT:</span>
            <span>+{vat.toLocaleString('vi-VN')}đ</span>
          </div>
        ) : null}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            borderTop: '2px solid #111827',
            borderBottom: '2px solid #111827',
            padding: '4px 0',
            margin: '4px 0',
            fontWeight: 800,
            fontSize: '13px',
          }}
        >
          <span>TỔNG CỘNG:</span>
          <span style={{ fontSize: '15px' }}>{total.toLocaleString('vi-VN')}đ</span>
        </div>

        {customerPay !== undefined && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span>Khách đưa:</span>
              <span style={{ fontWeight: 600 }}>{customerPay.toLocaleString('vi-VN')}đ</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tiền thừa:</span>
              <span style={{ fontWeight: 600 }}>
                {Math.max(0, change ?? customerPay - total).toLocaleString('vi-VN')}đ
              </span>
            </div>
          </>
        )}

        {paymentMethod && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
            <span>Phương thức:</span>
            <span style={{ fontWeight: 600 }}>{paymentMethod}</span>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div style={{ borderTop: '1px dashed #6b7280', marginTop: '8px', paddingTop: '8px', textAlign: 'center' }}>
        {wifiInfo && (
          <div style={{ fontSize: '10px', color: '#374151', marginBottom: '4px' }}>
            📶 Wifi: <span style={{ fontWeight: 700 }}>{wifiInfo.ssid}</span> | Pass: <span style={{ fontWeight: 700 }}>{wifiInfo.pass}</span>
          </div>
        )}
        <div style={{ fontSize: '11px', fontWeight: 700, margin: '4px 0' }}>
          {footerNotes || 'Cảm ơn Quý Khách - Hẹn Gặp Lại!'}
        </div>
        <div style={{ fontSize: '9px', color: '#6b7280' }}>
          Hệ thống Quản lý Tiết Ú POS • tietu.vn
        </div>
      </div>
    </div>
  );
}
