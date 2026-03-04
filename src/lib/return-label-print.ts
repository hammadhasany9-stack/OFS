interface ReturnLabelData {
  patientName: string
  requisitionNo: string
  trackingNumber?: string
}

function generateFakeTracking(): string {
  return Array.from({ length: 20 }, () => Math.floor(Math.random() * 10)).join('')
}

export function buildReturnLabelHTML(data: ReturnLabelData): string {
  const tracking = data.trackingNumber ?? generateFakeTracking()
  const trackingFormatted = tracking.replace(/(.{4})/g, '$1 ').trim()

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Return Label – ${data.requisitionNo}</title>
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
      max-width: 480px;
      border: 2px solid #000;
      font-family: Arial, Helvetica, sans-serif;
    }

    /* Top header row */
    .header-row {
      display: flex;
      align-items: stretch;
      border-bottom: 2px solid #000;
    }

    .big-g {
      font-size: 80px;
      font-weight: 900;
      line-height: 1;
      padding: 12px 16px;
      border-right: 2px solid #000;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 100px;
    }

    .header-right {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      padding: 8px 10px;
      gap: 4px;
    }

    .no-postage {
      font-size: 8px;
      font-weight: 700;
      text-align: right;
      line-height: 1.3;
      border: 1px solid #000;
      padding: 4px 6px;
    }

    .endicia-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
    }

    .endicia-logo {
      font-size: 11px;
      font-style: italic;
      font-weight: 600;
      color: #1a56db;
      letter-spacing: -0.5px;
    }

    .pc-postage {
      font-size: 9px;
      color: #555;
    }

    /* Service bar */
    .service-bar {
      background: #fff;
      border-bottom: 2px solid #000;
      padding: 8px 10px;
      text-align: center;
    }

    .service-name {
      font-size: 18px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    /* Code row */
    .code-row {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      padding: 6px 10px;
      gap: 6px;
      border-bottom: 1px solid #ccc;
    }

    .code-badge {
      background: #000;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 6px;
    }

    .code-num {
      font-size: 11px;
      font-weight: 700;
    }

    /* Redacted address block */
    .redacted-block {
      background: #000;
      height: 32px;
      margin: 8px 10px;
      border-radius: 2px;
    }

    /* Specimen notice */
    .specimen-notice {
      text-align: center;
      font-size: 11px;
      font-style: italic;
      padding: 6px 10px;
      border-top: 1px solid #ccc;
      border-bottom: 1px solid #ccc;
      margin: 4px 0;
    }

    /* Ship to */
    .ship-to-row {
      display: flex;
      padding: 10px;
      gap: 8px;
      border-bottom: 1px solid #ccc;
    }

    .ship-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      white-space: nowrap;
      padding-top: 2px;
    }

    .qr-placeholder {
      width: 44px;
      height: 44px;
      border: 1px solid #999;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      padding: 3px;
    }

    .qr-inner {
      width: 100%;
      height: 100%;
      background: repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 0 0 / 6px 6px;
    }

    .address-block {
      font-size: 13px;
      line-height: 1.6;
    }

    .address-block strong {
      font-weight: 900;
      font-size: 14px;
    }

    /* Tracking section */
    .tracking-header {
      background: #fff;
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

    /* Print button */
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

  <div class="page">
    <div class="label">

      <!-- Header row -->
      <div class="header-row">
        <div class="big-g">G</div>
        <div class="header-right">
          <div class="no-postage">NO POSTAGE<br>NECESSARY IF<br>MAILED IN THE<br>UNITED STATES</div>
          <div class="endicia-row">
            <span class="endicia-logo">&#x1d452;ndicia</span>
            <span class="pc-postage">PC Postage Returns</span>
          </div>
        </div>
      </div>

      <!-- Service bar -->
      <div class="service-bar">
        <div class="service-name">USPS GROUND ADVANTAGE &#x2122; RTN</div>
      </div>

      <!-- Code row -->
      <div class="code-row">
        <span class="code-badge">C032</span>
        <span class="code-num">0001</span>
      </div>

      <!-- Redacted sender block -->
      <div class="redacted-block"></div>

      <!-- Specimen notice -->
      <div class="specimen-notice">Time Sensitive Exempt Human Specimen</div>

      <!-- Ship to -->
      <div class="ship-to-row">
        <div>
          <div class="ship-label">SHIP<br>TO:</div>
        </div>
        <div class="qr-placeholder"><div class="qr-inner"></div></div>
        <div class="address-block">
          <strong>LABCORP</strong><br>
          Attn: Direct Testing Lab<br>
          1447 YORK CT<br>
          BURLINGTON NC 27215-3361
        </div>
      </div>

      <!-- Tracking -->
      <div class="tracking-header">USPS TRACKING #</div>
      <div class="barcode-area">
        <svg class="barcode-svg" viewBox="0 0 460 60" preserveAspectRatio="none">
          ${generateBarcodeSVGBars()}
        </svg>
        <div class="tracking-number">${trackingFormatted}</div>
      </div>

    </div>
  </div>

  <script>setTimeout(function(){ window.print(); }, 600);</script>
</body>
</html>`
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

export function openReturnLabelPrint(data: ReturnLabelData): void {
  const html = buildReturnLabelHTML(data)
  const win = window.open('', '_blank')
  if (win) {
    win.document.open()
    win.document.write(html)
    win.document.close()
  }
}

/**
 * Prints `count` return label pages in a single tab.
 * Used by the QC Failed accordion — one page per failed kit.
 */
export function openReturnLabelBulkPrint(orderId: string, count: number): void {
  if (count <= 0) return

  // Build individual label bodies (each generates its own unique tracking number)
  const pages = Array.from({ length: count }, (_, i) => {
    const tracking = generateFakeTracking()
    const trackingFormatted = tracking.replace(/(.{4})/g, '$1 ').trim()
    const copyLabel = count > 1 ? ` — Copy ${i + 1} of ${count}` : ''
    return `
  <div class="page">
    <div class="label">
      <div class="header-row">
        <div class="big-g">G</div>
        <div class="header-right">
          <div class="no-postage">NO POSTAGE<br>NECESSARY IF<br>MAILED IN THE<br>UNITED STATES</div>
          <div class="endicia-row">
            <span class="endicia-logo">&#x1d452;ndicia</span>
            <span class="pc-postage">PC Postage Returns</span>
          </div>
        </div>
      </div>
      <div class="service-bar">
        <div class="service-name">USPS GROUND ADVANTAGE &#x2122; RTN${copyLabel}</div>
      </div>
      <div class="code-row">
        <span class="code-badge">C032</span>
        <span class="code-num">0001</span>
      </div>
      <div class="redacted-block"></div>
      <div class="specimen-notice">Time Sensitive Exempt Human Specimen — Order ${orderId}</div>
      <div class="ship-to-row">
        <div><div class="ship-label">SHIP<br>TO:</div></div>
        <div class="qr-placeholder"><div class="qr-inner"></div></div>
        <div class="address-block">
          <strong>LABCORP</strong><br>
          Attn: Direct Testing Lab<br>
          1447 YORK CT<br>
          BURLINGTON NC 27215-3361
        </div>
      </div>
      <div class="tracking-header">USPS TRACKING #</div>
      <div class="barcode-area">
        <svg class="barcode-svg" viewBox="0 0 460 60" preserveAspectRatio="none">${generateBarcodeSVGBars()}</svg>
        <div class="tracking-number">${trackingFormatted}</div>
      </div>
    </div>
  </div>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Return Labels — ${orderId}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; background: #d1d5db; color: #000; }
    .page { width: 816px; min-height: 1056px; background: #fff; margin: 24px auto; box-shadow: 0 4px 16px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center; padding: 32px; }
    .label { width: 100%; max-width: 480px; border: 2px solid #000; font-family: Arial, Helvetica, sans-serif; }
    .header-row { display: flex; align-items: stretch; border-bottom: 2px solid #000; }
    .big-g { font-size: 80px; font-weight: 900; line-height: 1; padding: 12px 16px; border-right: 2px solid #000; display: flex; align-items: center; justify-content: center; min-width: 100px; }
    .header-right { flex: 1; display: flex; flex-direction: column; align-items: flex-end; padding: 8px 10px; gap: 4px; }
    .no-postage { font-size: 8px; font-weight: 700; text-align: right; line-height: 1.3; border: 1px solid #000; padding: 4px 6px; }
    .endicia-row { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
    .endicia-logo { font-size: 11px; font-style: italic; font-weight: 600; color: #1a56db; letter-spacing: -0.5px; }
    .pc-postage { font-size: 9px; color: #555; }
    .service-bar { background: #fff; border-bottom: 2px solid #000; padding: 8px 10px; text-align: center; }
    .service-name { font-size: 14px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; }
    .code-row { display: flex; justify-content: flex-end; align-items: center; padding: 6px 10px; gap: 6px; border-bottom: 1px solid #ccc; }
    .code-badge { background: #000; color: #fff; font-size: 11px; font-weight: 700; padding: 2px 6px; }
    .code-num { font-size: 11px; font-weight: 700; }
    .redacted-block { background: #000; height: 32px; margin: 8px 10px; border-radius: 2px; }
    .specimen-notice { text-align: center; font-size: 11px; font-style: italic; padding: 6px 10px; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; margin: 4px 0; }
    .ship-to-row { display: flex; padding: 10px; gap: 8px; border-bottom: 1px solid #ccc; }
    .ship-label { font-size: 9px; font-weight: 700; text-transform: uppercase; white-space: nowrap; padding-top: 2px; }
    .qr-placeholder { width: 44px; height: 44px; border: 1px solid #999; display: flex; align-items: center; justify-content: center; flex-shrink: 0; padding: 3px; }
    .qr-inner { width: 100%; height: 100%; background: repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 0 0 / 6px 6px; }
    .address-block { font-size: 13px; line-height: 1.6; }
    .address-block strong { font-weight: 900; font-size: 14px; }
    .tracking-header { background: #fff; text-align: center; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 6px; border-top: 2px solid #000; border-bottom: 1px solid #ccc; }
    .barcode-area { padding: 12px 10px 8px; text-align: center; }
    .barcode-svg { width: 100%; height: 60px; }
    .tracking-number { font-size: 11px; letter-spacing: 2px; margin-top: 4px; color: #333; }
    .print-btn { position: fixed; top: 16px; right: 16px; z-index: 9999; display: flex; align-items: center; gap: 6px; padding: 9px 18px; background: #1e3a5f; color: #fff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: Arial, sans-serif; box-shadow: 0 2px 8px rgba(0,0,0,0.25); }
    .print-btn:hover { background: #2d5282; }
    @media print {
      @page { size: letter; margin: 0; }
      body { background: white; }
      .print-btn { display: none !important; }
      .page { width: 8.5in; min-height: 11in; margin: 0; box-shadow: none; page-break-after: always; }
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
