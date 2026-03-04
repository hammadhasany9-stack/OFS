import { Order, Batch } from '@/types/order'

interface KitLabelData {
  kitAbbreviation: string
  catalogueNumber: string
  lotNumber: string
  expirationDate: string
  quantity: number
}

function getKitAbbreviation(kitName: string): string {
  return kitName.replace(/\s*kit\s*/i, '').trim().toUpperCase()
}

function formatExpirationDate(isoStr: string): string {
  const d = new Date(isoStr)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const year = d.getFullYear()
  return `${month}/${day}/${year}`
}

function buildLabelHTML(labels: KitLabelData[], orderId: string, batchLabel: string): string {
  const pageElements: string[] = []

  labels.forEach((label) => {
    const expDisplay = label.expirationDate
      ? formatExpirationDate(label.expirationDate)
      : '\u2014'
    const catalogDisplay = label.catalogueNumber || '\u2014'
    const lotDisplay = label.lotNumber || '\u2014'

    for (let i = 0; i < label.quantity; i++) {
      pageElements.push(`
        <div class="page">
          <div class="label">
            <div class="kit-name">${label.kitAbbreviation}</div>
            <div class="label-field">Catalog Number: ${catalogDisplay}</div>
            <div class="label-field">LOT: ${lotDisplay}</div>
            <div class="label-field">EXPIRATION DATE: ${expDisplay}</div>
          </div>
        </div>
      `)
    }
  })

  const titleLabel = batchLabel ? `${orderId}${batchLabel}` : orderId

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Kit ID Labels \u2014 ${titleLabel}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #d1d5db;
      color: #000;
    }

    /* ── Screen preview: 3× physical size (2in×1in) for readability ── */
    .page {
      width: 576px;
      height: 288px;
      background: #fff;
      margin: 24px auto;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      display: flex;
      align-items: stretch;
    }

    .label {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 5px;
      border: 1px solid #c8c8c8;
      padding: 18px 24px;
      flex: 1;
    }

    .kit-name {
      font-size: 27px;
      font-weight: 700;
      color: #111;
      margin-bottom: 5px;
      letter-spacing: 0.4px;
    }

    .label-field {
      font-size: 19px;
      color: #444;
      line-height: 1.45;
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

    /* ── Print media: physical 2in × 1in label ── */
    @media print {
      @page { size: 2in 1in; margin: 0; }
      body { background: white; }
      .print-btn { display: none !important; }
      .page {
        width: 2in;
        height: 1in;
        margin: 0;
        box-shadow: none;
        page-break-after: always;
      }
      .label {
        padding: 0.06in 0.1in;
        gap: 1.5pt;
      }
      .kit-name { font-size: 9pt; margin-bottom: 2pt; }
      .label-field { font-size: 6.5pt; line-height: 1.4; }
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

  ${pageElements.join('')}

  <script>setTimeout(function(){ window.print(); }, 600);</script>
</body>
</html>`
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Prints exactly `failedCount` Kit ID label pages using the order / batch lot info.
 * Used by the QC Failed accordion print button.
 */
export function openKitIdLabelPrintQCFailed(order: Order, batch: Batch | null | undefined, failedCount: number): void {
  if (failedCount <= 0) return
  const kitAbbr = getKitAbbreviation(order.kitName)
  const batchLabel = batch ? ` B${batch.batchNumber}` : ''

  // Collect lot details from the relevant source
  const rawLots = batch?.lots?.length
    ? batch.lots
    : order.setupLots?.length
    ? order.setupLots
    : null

  let labels: KitLabelData[]
  if (rawLots && rawLots.length > 0) {
    // Distribute failedCount across lots proportionally (first-lot-wins for remainder)
    let remaining = failedCount
    labels = rawLots
      .map((lot) => {
        if (remaining <= 0) return null
        const qty = Math.min(lot.quantity, remaining)
        remaining -= qty
        return {
          kitAbbreviation: kitAbbr,
          catalogueNumber: lot.catalogueNumber ?? '',
          lotNumber: lot.lotNumber ?? lot.lotId,
          expirationDate: lot.expirationDate ?? '',
          quantity: qty,
        }
      })
      .filter((l): l is KitLabelData => l !== null)
  } else {
    labels = [{ kitAbbreviation: kitAbbr, catalogueNumber: '', lotNumber: '', expirationDate: '', quantity: failedCount }]
  }

  const html = buildLabelHTML(labels, order.id, batchLabel)
  const win = window.open('', '_blank')
  if (win) {
    win.document.open()
    win.document.write(html)
    win.document.close()
  }
}

export function openKitIdLabelPrint(order: Order, batch?: Batch): void {
  const kitAbbr = getKitAbbreviation(order.kitName)
  const batchLabel = batch ? ` B${batch.batchNumber}` : ''

  let labels: KitLabelData[]

  if (batch && batch.lots && batch.lots.length > 0) {
    // Batched order: use lot details stored on the batch
    labels = batch.lots.map((lot) => ({
      kitAbbreviation: kitAbbr,
      catalogueNumber: lot.catalogueNumber ?? '',
      lotNumber: lot.lotNumber ?? lot.lotId,
      expirationDate: lot.expirationDate ?? '',
      quantity: lot.quantity,
    }))
  } else if (!batch && order.setupLots && order.setupLots.length > 0) {
    // Non-batched order: use lot details stored directly on the order
    labels = order.setupLots.map((lot) => ({
      kitAbbreviation: kitAbbr,
      catalogueNumber: lot.catalogueNumber ?? '',
      lotNumber: lot.lotNumber ?? lot.lotId,
      expirationDate: lot.expirationDate ?? '',
      quantity: lot.quantity,
    }))
  } else {
    const qty = batch ? batch.size : order.kitIdLabelCount
    labels = [
      {
        kitAbbreviation: kitAbbr,
        catalogueNumber: '',
        lotNumber: '',
        expirationDate: '',
        quantity: qty,
      },
    ]
  }

  const html = buildLabelHTML(labels, order.id, batchLabel)
  const win = window.open('', '_blank')
  if (win) {
    win.document.open()
    win.document.write(html)
    win.document.close()
  }
}
