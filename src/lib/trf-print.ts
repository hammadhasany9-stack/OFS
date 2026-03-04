import { Order, Batch } from '@/types/order'

export interface TRFPrintData {
  orderId: string
  clientName: string
  customerPO: string
  kitName: string
  kitId: number
  shipTo: string
  orderQty: number
  processedDate: string
  batchNumber: number | null
  batchSize: number
  lineNumber: string
  lots: { lotId: string; quantity: number }[]
}

export function formatControlId(n: number): string {
  return `CTRL-ID-${String(n).padStart(4, '0')}`
}

function formatProcessedDate(isoStr: string): string {
  const d = new Date(isoStr)
  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const year = d.getUTCFullYear()
  const hours = d.getUTCHours()
  const minutes = String(d.getUTCMinutes()).padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const h = hours % 12 || 12
  return `${day}/${month}/${year}, ${h}:${minutes} ${ampm} UTC`
}

// ── Pseudo 1D barcode as SVG string ──────────────────────────────────────────
function barcodeSVG(value: string, width = 140, height = 44): string {
  const bars: { w: number; bar: boolean }[] = [
    { w: 2, bar: true }, { w: 2, bar: false }, { w: 2, bar: true },
  ]
  value.split('').forEach((ch) => {
    const code = ch.charCodeAt(0)
    for (let i = 7; i >= 0; i--) {
      const bit = (code >> i) & 1
      bars.push({ w: bit ? 3 : 1, bar: true })
      bars.push({ w: 1, bar: false })
    }
    bars.push({ w: 2, bar: false })
  })
  bars.push({ w: 2, bar: false }, { w: 2, bar: true }, { w: 2, bar: false }, { w: 2, bar: true })

  const total = bars.reduce((s, b) => s + b.w, 0)
  const scale = width / total
  let px = 0
  const correctRects: string[] = []
  bars.forEach((b) => {
    if (b.bar) {
      correctRects.push(
        `<rect x="${(px * scale).toFixed(2)}" y="0" width="${Math.max(b.w * scale, 0.5).toFixed(2)}" height="${height}" fill="black"/>`
      )
    }
    px += b.w
  })

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${correctRects.join('')}</svg>`
}

// ── Pseudo Data Matrix SVG string ─────────────────────────────────────────────
function dataMatrixSVG(value: string, size = 64): string {
  const cells = 18
  const cs = size / cells
  const rects: string[] = []
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      let filled = false
      if (r === cells - 1) filled = true
      else if (c === 0) filled = true
      else if (r === 0) filled = c % 2 === 0
      else if (c === cells - 1) filled = r % 2 === 0
      else {
        const idx = (r - 1) * (cells - 2) + (c - 1)
        const code = value.charCodeAt(idx % value.length)
        filled = (code + r * 3 + c * 7) % 11 < 6
      }
      if (filled) {
        rects.push(`<rect x="${(c * cs).toFixed(1)}" y="${(r * cs).toFixed(1)}" width="${cs.toFixed(1)}" height="${cs.toFixed(1)}" fill="black"/>`)
      }
    }
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${size}" height="${size}" fill="white"/>${rects.join('')}<rect x="0" y="0" width="${size}" height="${size}" fill="none" stroke="black" stroke-width="1"/></svg>`
}

// ── Cut-off page HTML (matches sample exactly) ────────────────────────────────
function getCutoffHTML(data: TRFPrintData): string {
  const batchSuffix = data.batchNumber !== null ? ` - B${data.batchNumber}` : ''
  const batchId = data.batchNumber !== null ? `${data.orderId} - B${data.batchNumber}` : '-'
  const startCtrl = formatControlId(1)
  const endCtrl = formatControlId(data.batchSize)
  const processedOn = formatProcessedDate(data.processedDate)

  return `
    <div class="page">
      <h1 class="page-title">Line Information Summary for Order ID ${data.orderId}${batchSuffix}</h1>

      <div class="section">
        <div class="section-label">Order Detail</div>
        <div class="field">Order ID: ${data.orderId}</div>
        <div class="field">Kit ID: ${data.kitId}</div>
        <div class="field">Kit Name: ${data.kitName}</div>
        <div class="field">Customer Name: ${data.clientName}</div>
        <div class="field">Total Order Quantity: ${data.orderQty}</div>
      </div>

      <div class="section">
        <div class="section-label">Batch &amp; LOT Information</div>
        ${data.batchNumber !== null ? `<div class="field">Batch ID: ${batchId}</div>` : ''}
        ${data.batchNumber !== null ? `<div class="field">Batch Quantity: ${data.batchSize}</div>` : ''}
        ${data.lineNumber ? `<div class="field">Line No.: ${data.lineNumber}</div>` : ''}
      </div>

      <div class="section">
        <div class="section-label">Date &amp; Time Stamp</div>
        <div class="field">Processed On: ${processedOn}</div>
      </div>

      <div class="section">
        <div class="section-label">Control ID Range</div>
        <div class="field">Start Control ID: ${startCtrl}</div>
        <div class="field">End Control ID: ${endCtrl}</div>
      </div>
    </div>
  `
}

// ── TRF form HTML (matches LabCorp sample) ─────────────────────────────────────
function getTRFFormHTML(data: TRFPrintData, controlId: string, isLastPage: boolean): string {
  const pageBreak = isLastPage ? '' : 'page-break-after: always;'
  const qr = dataMatrixSVG(controlId, 66)
  const footerBarcode = barcodeSVG(`KB${data.kitId}${controlId}`, 130, 38)

  return `
    <div class="page trf-form" style="${pageBreak}">

      <!-- Header: Logo + Data Matrix -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <svg width="38" height="38" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg">
            <circle cx="19" cy="19" r="17" fill="none" stroke="#cc0000" stroke-width="2.2"/>
            <ellipse cx="19" cy="19" rx="8" ry="15.5" fill="none" stroke="#cc0000" stroke-width="1.6"/>
            <line x1="2" y1="19" x2="36" y2="19" stroke="#cc0000" stroke-width="1.6"/>
          </svg>
          <span style="font-size:26px; font-weight:800; color:#1a1a1a; letter-spacing:-0.5px; font-family:'Arial Black',Arial,sans-serif;">labcorp</span>
        </div>
        ${qr}
      </div>

      <!-- Account info -->
      <div style="margin-bottom:9px; line-height:1.8; font-size:10px;">
        <div>Account Number: ${data.kitId}</div>
        <div>Account Name: ${data.clientName}</div>
        <div>Control ID: <strong>${controlId}</strong></div>
      </div>

      <hr style="border:none; border-top:1px solid #000; margin:0 0 9px 0;"/>

      <!-- Patient Information -->
      <div style="margin-bottom:9px;">
        <div style="font-weight:bold; font-size:11px; margin-bottom:6px;">Patient Information:</div>
        <div style="margin-bottom:6px;">Patient Name:&nbsp;<span class="blank" style="width:270px;"></span></div>
        <div style="margin-bottom:6px;">Patient DOB:&nbsp;<span class="blank" style="width:120px;"></span></div>
        <div style="margin-bottom:6px; display:flex; gap:32px; flex-wrap:wrap;">
          <span>Patient Gender:&nbsp;<span class="blank" style="width:100px;"></span></span>
          <span>Patient ID/MRN#:&nbsp;<span class="blank" style="width:130px;"></span></span>
        </div>
        <div>Patient Address:&nbsp;<span class="blank" style="width:400px;"></span></div>
      </div>

      <hr style="border:none; border-top:1px solid #000; margin:0 0 9px 0;"/>

      <!-- Order Information -->
      <div style="margin-bottom:9px;">
        <div style="font-weight:bold; font-size:11px; margin-bottom:6px;">Order Information:</div>
        <div style="margin-bottom:4px;">Ordered Test: 125248</div>
        <div>Test Description: ${data.kitName}</div>
      </div>

      <hr style="border:none; border-top:1px solid #000; margin:0 0 9px 0;"/>

      <!-- Test Information (Patient fills) -->
      <div style="margin-bottom:9px;">
        <div style="font-weight:bold; font-size:11px; margin-bottom:7px; text-decoration:underline;">
          Test Information &#8211; PATIENT COMPLETE ALL FIELDS
        </div>
        <div style="border:1px solid #000; padding:8px 12px; margin-bottom:7px; font-size:10px; line-height:1.4;">
          TIME COLLECTED:&nbsp;<span class="blank" style="width:88px;"></span>&nbsp;AM/PM
          &nbsp;&nbsp;&nbsp;&nbsp;
          DATE COLLECTED:&nbsp;<span class="blank" style="width:26px;"></span>&nbsp;/&nbsp;<span class="blank" style="width:26px;"></span>&nbsp;/&nbsp;<span class="blank" style="width:40px;"></span>
        </div>
        <div style="font-size:9px; margin-bottom:7px; line-height:1.5; color:#111;">
          I hereby authorize the release of medical information related to the service described herein and authorize payment directly to Labcorp.
        </div>
        <div>Patient/Guardian Signature:&nbsp;<span class="blank" style="width:240px;"></span></div>
      </div>

      <hr style="border:none; border-top:1px solid #000; margin:0 0 9px 0;"/>

      <!-- Billing Information -->
      <div style="margin-bottom:9px;">
        <div style="font-weight:bold; font-size:11px; margin-bottom:6px;">Billing Information:</div>
        <div style="margin-bottom:5px;">Diagnosis/ICD-CM:&nbsp;<span class="blank" style="width:290px;"></span></div>
        <div style="margin-bottom:5px;">Ordering Physician (Last, First):&nbsp;<span class="blank" style="width:210px;"></span></div>
        <div style="margin-bottom:4px;">NPI: 1104825843</div>
        <div>Billing Type: Account Bill 02</div>
      </div>

      <hr style="border:none; border-top:1px solid #000; margin:0 0 9px 0;"/>

      <!-- Insurance Information -->
      <div style="margin-bottom:14px;">
        <div style="font-weight:bold; font-size:11px; margin-bottom:7px;">Insurance Information:</div>
        <div style="border:1px solid #000; padding:8px 10px; margin-bottom:8px; line-height:2; font-size:10px;">
          <div style="font-weight:bold; margin-bottom:2px;">Primary Insurance:</div>
          <div>LCA Insurance Code:</div>
          <div>Co Name:</div>
          <div>Addr:</div>
          <div>Policy Number#:</div>
          <div>Group #:</div>
          <div>Insured Relationship to Pt:</div>
        </div>
        <div style="border:1px solid #000; padding:8px 10px; line-height:2; font-size:10px;">
          <div style="font-weight:bold; margin-bottom:2px;">Responsible Party/Guarantor Information</div>
          <div>Name:</div>
          <div>Address:</div>
          <div>Guarantor Insured City, State, Zip:</div>
          <div>Relationship to Pt:</div>
        </div>
      </div>

      <!-- Footer -->
      <div style="border-top:1px solid #ccc; padding-top:8px; display:flex; justify-content:space-between; align-items:center;">
        <div style="font-weight:bold; font-size:10px;">Kit Billing Number: ${data.kitId}</div>
        ${footerBarcode}
      </div>
    </div>
  `
}

// ── Full print document ────────────────────────────────────────────────────────
function buildPrintHTML(data: TRFPrintData): string {
  const forms = Array.from({ length: data.batchSize }, (_, i) => i + 1)
  const batchLabel = data.batchNumber !== null ? ` B${data.batchNumber}` : ''

  const cutoffHTML = getCutoffHTML(data)
  const formsHTML = forms
    .map((n, idx) => getTRFFormHTML(data, formatControlId(n), idx === forms.length - 1))
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>TRF Print — ${data.orderId}${batchLabel}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #d1d5db;
      color: #000;
    }

    /* ── Page shell ── */
    .page {
      width: 816px;
      min-height: 1056px;
      padding: 52px 60px;
      background: #fff;
      margin: 24px auto;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }

    .trf-form {
      padding: 32px 44px;
      font-size: 10px;
    }

    /* ── Cut-off page ── */
    .page-title {
      font-size: 19px;
      font-weight: bold;
      color: #000;
      margin-bottom: 24px;
      line-height: 1.3;
    }

    .section {
      margin-bottom: 20px;
    }

    .section-label {
      font-size: 13px;
      color: #9ca3af;
      margin-bottom: 6px;
    }

    .field {
      font-size: 13px;
      font-weight: bold;
      color: #000;
      margin-bottom: 5px;
      line-height: 1.5;
    }

    /* ── TRF blanks ── */
    .blank {
      display: inline-block;
      border-bottom: 1px solid #000;
      vertical-align: bottom;
      min-height: 13px;
    }

    /* ── Print button (screen only) ── */
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

    /* ── Print media ── */
    @media print {
      @page { size: letter; margin: 0; }
      html, body { background: white; }
      .print-btn { display: none !important; }
      .page {
        width: 8.5in;
        min-height: 11in;
        margin: 0;
        box-shadow: none;
        padding: 0.6in 0.7in;
        page-break-after: always;
      }
      .trf-form { padding: 0.35in 0.46in; }
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

  ${cutoffHTML}
  ${formsHTML}

  <script>setTimeout(function(){ window.print(); }, 600);</script>
</body>
</html>`
}

// ── Public API ─────────────────────────────────────────────────────────────────
export function openTRFPrint(order: Order, batch: Batch): void {
  const lineNumber = batch.printRoomStatus
    ? batch.printRoomStatus.replace('Line ', '')
    : ''

  const data: TRFPrintData = {
    orderId: order.id,
    clientName: order.clientName,
    customerPO: order.customerPO,
    kitName: order.kitName,
    kitId: order.kitId,
    shipTo: order.shipTo,
    orderQty: order.orderQty,
    processedDate: order.processedDate.toISOString(),
    batchNumber: batch.batchNumber,
    batchSize: batch.size,
    lineNumber,
    lots: batch.lots,
  }

  const html = buildPrintHTML(data)
  const win = window.open('', '_blank')
  if (win) {
    win.document.open()
    win.document.write(html)
    win.document.close()
  }
}

/**
 * Prints exactly `failedCount` TRF forms using the order / batch header info.
 * Used by the QC Failed accordion print button.
 */
export function openTRFPrintQCFailed(order: Order, batch: Batch | null | undefined, failedCount: number): void {
  if (failedCount <= 0) return
  const data: TRFPrintData = {
    orderId: order.id,
    clientName: order.clientName,
    customerPO: order.customerPO,
    kitName: order.kitName,
    kitId: order.kitId,
    shipTo: order.shipTo,
    orderQty: order.orderQty,
    processedDate: order.processedDate.toISOString(),
    batchNumber: batch?.batchNumber ?? null,
    batchSize: failedCount,
    lineNumber: '',
    lots: [],
  }
  const html = buildPrintHTML(data)
  const win = window.open('', '_blank')
  if (win) {
    win.document.open()
    win.document.write(html)
    win.document.close()
  }
}

export function openTRFPrintForOrder(order: Order): void {
  const lineNumber = order.printRoomStatus
    ? order.printRoomStatus.replace('Line ', '')
    : ''

  const data: TRFPrintData = {
    orderId: order.id,
    clientName: order.clientName,
    customerPO: order.customerPO,
    kitName: order.kitName,
    kitId: order.kitId,
    shipTo: order.shipTo,
    orderQty: order.orderQty,
    processedDate: order.processedDate.toISOString(),
    batchNumber: null,
    batchSize: order.trfFormCount,
    lineNumber,
    lots: [],
  }

  const html = buildPrintHTML(data)
  const win = window.open('', '_blank')
  if (win) {
    win.document.open()
    win.document.write(html)
    win.document.close()
  }
}
