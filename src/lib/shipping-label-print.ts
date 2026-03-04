import { Order, Batch } from '@/types/order'

function generateFakeTracking(): string {
  return Array.from({ length: 20 }, () => Math.floor(Math.random() * 10)).join('')
}

function formatTracking(t: string): string {
  return t.replace(/(.{4})/g, '$1 ').trim()
}

function generateBarcodeSVGBars(): string {
  const bars: string[] = []
  let x = 0
  const totalWidth = 460
  const barCount = 95
  const unitWidth = totalWidth / barCount
  for (let i = 0; i < barCount; i++) {
    const isBlack = Math.random() > 0.4
    const widthUnits = Math.random() > 0.7 ? 2 : 1
    if (isBlack) {
      bars.push(`<rect x="${x.toFixed(1)}" y="0" width="${(unitWidth * widthUnits - 0.5).toFixed(1)}" height="60" fill="#000"/>`)
    }
    x += unitWidth * widthUnits
    if (x >= totalWidth) break
  }
  return bars.join('')
}

function buildShippingLabelPage(order: Order, batch: Batch | null | undefined, copyIndex: number, totalCopies: number): string {
  const tracking = generateFakeTracking()
  const trackingFormatted = formatTracking(tracking)
  const batchSuffix = batch ? ` — Batch ${batch.batchNumber}` : ''
  const pageLabel = totalCopies > 1 ? ` (${copyIndex + 1} of ${totalCopies})` : ''

  return `
  <div class="page">
    <div class="label">

      <div class="header-row">
        <div class="carrier-logo">UPS</div>
        <div class="header-right">
          <div class="service-name">GROUND</div>
          <div class="copy-badge">${pageLabel}</div>
        </div>
      </div>

      <div class="address-section">
        <div class="section-label">SHIP FROM</div>
        <div class="address-text">
          <strong>${order.clientName}</strong><br/>
          ${order.customerPO ? `PO: ${order.customerPO}<br/>` : ''}
          Order ID: ${order.id}${batchSuffix}
        </div>
      </div>

      <div class="address-section ship-to-section">
        <div class="section-label">SHIP TO</div>
        <div class="address-text ship-to-address">
          ${order.shipTo}
        </div>
      </div>

      <div class="order-info">
        <div class="info-row"><span class="info-label">Kit Name:</span> ${order.kitName}</div>
        <div class="info-row"><span class="info-label">Kit ID:</span> ${order.kitId}</div>
        ${batch ? `<div class="info-row"><span class="info-label">Batch:</span> ${batch.batchNumber} (Qty: ${batch.size})</div>` : `<div class="info-row"><span class="info-label">Order Qty:</span> ${order.orderQty}</div>`}
        <div class="info-row info-qc"><span class="info-label">⚠ QC Failed Reprint</span></div>
      </div>

      <div class="tracking-section">
        <div class="tracking-header">TRACKING #</div>
        <div class="barcode-area">
          <svg class="barcode-svg" viewBox="0 0 460 60" preserveAspectRatio="none">
            ${generateBarcodeSVGBars()}
          </svg>
          <div class="tracking-number">${trackingFormatted}</div>
        </div>
      </div>

    </div>
  </div>`
}

export function openShippingLabelPrint(order: Order, batch: Batch | null | undefined, failedCount: number): void {
  if (failedCount <= 0) return

  const pages = Array.from({ length: failedCount }, (_, i) =>
    buildShippingLabelPage(order, batch, i, failedCount)
  ).join('')

  const batchSuffix = batch ? ` B${batch.batchNumber}` : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Shipping Labels — ${order.id}${batchSuffix}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #d1d5db;
      color: #000;
    }
    .page {
      width: 816px;
      min-height: 1056px;
      background: #fff;
      margin: 24px auto;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px;
    }
    .label {
      width: 100%;
      max-width: 520px;
      border: 2px solid #000;
      font-family: Arial, Helvetica, sans-serif;
    }
    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #000;
      padding: 12px 16px;
    }
    .carrier-logo {
      font-size: 42px;
      font-weight: 900;
      letter-spacing: -2px;
      color: #1a3a6e;
    }
    .header-right {
      text-align: right;
    }
    .service-name {
      font-size: 18px;
      font-weight: 900;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .copy-badge {
      font-size: 11px;
      color: #666;
      margin-top: 2px;
    }
    .address-section {
      padding: 10px 14px;
      border-bottom: 1px solid #ccc;
    }
    .section-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 4px;
      letter-spacing: 0.5px;
    }
    .address-text {
      font-size: 12px;
      line-height: 1.7;
    }
    .ship-to-section {
      border-bottom: 2px solid #000;
    }
    .ship-to-address {
      font-size: 16px;
      font-weight: 700;
      line-height: 1.5;
    }
    .order-info {
      padding: 10px 14px;
      border-bottom: 1px solid #ccc;
    }
    .info-row {
      font-size: 11px;
      line-height: 1.8;
      color: #333;
    }
    .info-label {
      font-weight: 700;
    }
    .info-qc {
      margin-top: 4px;
      color: #b45309;
      font-weight: 700;
      font-size: 11px;
    }
    .tracking-section {}
    .tracking-header {
      text-align: center;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding: 6px;
      border-top: 2px solid #000;
      border-bottom: 1px solid #ccc;
    }
    .barcode-area {
      padding: 12px 10px 8px;
      text-align: center;
    }
    .barcode-svg {
      width: 100%;
      height: 60px;
    }
    .tracking-number {
      font-size: 11px;
      letter-spacing: 2px;
      margin-top: 4px;
      color: #333;
    }
    .print-btn {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 9px 18px;
      background: #1e3a5f;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      font-family: Arial, sans-serif;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    }
    .print-btn:hover { background: #2d5282; }
    @media print {
      @page { size: letter; margin: 0; }
      body { background: white; }
      .print-btn { display: none !important; }
      .page {
        width: 8.5in;
        min-height: 11in;
        margin: 0;
        box-shadow: none;
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
    </svg>
    Print / Save as PDF
  </button>
  ${pages}
  <script>setTimeout(function(){ window.print(); }, 600);</script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.open()
    win.document.write(html)
    win.document.close()
  }
}
