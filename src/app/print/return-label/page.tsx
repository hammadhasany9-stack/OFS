"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"
import { Suspense } from "react"

function generateFakeTracking(): string {
  return Array.from({ length: 20 }, () => Math.floor(Math.random() * 10)).join("")
}

function generateBarcodeBars(): { x: number; width: number }[] {
  const bars: { x: number; width: number }[] = []
  let x = 0
  const totalWidth = 460
  const barCount = 95
  const unitWidth = totalWidth / barCount

  for (let i = 0; i < barCount; i++) {
    const isBlack = Math.random() > 0.4
    const widthUnits = Math.random() > 0.7 ? 2 : 1
    if (isBlack) {
      bars.push({ x: parseFloat(x.toFixed(1)), width: parseFloat((unitWidth * widthUnits - 0.5).toFixed(1)) })
    }
    x += unitWidth * widthUnits
    if (x >= totalWidth) break
  }
  return bars
}

function ReturnLabelContent() {
  const searchParams = useSearchParams()
  const name = searchParams.get("name") ?? "Patient"
  const req = searchParams.get("req") ?? "—"
  const orderId = searchParams.get("orderId") ?? ""
  const kitName = searchParams.get("kitName") ?? ""
  const kitId = searchParams.get("kitId") ?? ""

  const trackingRef = useRef(generateFakeTracking())
  const barsRef = useRef(generateBarcodeBars())
  const orderBarsRef = useRef(generateBarcodeBars())

  const tracking = trackingRef.current
  const trackingFormatted = tracking.replace(/(.{4})/g, "$1 ").trim()
  const bars = barsRef.current
  const orderBars = orderBarsRef.current
  const orderBarcodeValue = [orderId, kitName, kitId].filter(Boolean).join("|")

  useEffect(() => {
    const timer = setTimeout(() => window.print(), 600)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      <style>{`
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

        .pc-postage { font-size: 9px; color: #555; }

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

        .code-num { font-size: 11px; font-weight: 700; }

        .redacted-block {
          background: #000;
          height: 32px;
          margin: 8px 10px;
          border-radius: 2px;
        }

        .specimen-notice {
          text-align: center;
          font-size: 11px;
          font-style: italic;
          padding: 6px 10px;
          border-top: 1px solid #ccc;
          border-bottom: 1px solid #ccc;
          margin: 4px 0;
        }

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

        .address-block { font-size: 13px; line-height: 1.6; }
        .address-block strong { font-weight: 900; font-size: 14px; }

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

        .barcode-area { padding: 12px 10px 8px; text-align: center; }
        .barcode-svg { width: 100%; height: 60px; }

        .tracking-number {
          font-size: 11px;
          letter-spacing: 2px;
          margin-top: 4px;
          color: #333;
        }

        .order-barcode-section {
          border-top: 1px solid #ccc;
          padding: 8px 10px 10px;
          text-align: center;
        }

        .order-barcode-header {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #555;
          margin-bottom: 4px;
        }

        .order-barcode-svg { width: 100%; height: 36px; }

        .order-barcode-value {
          font-size: 8px;
          letter-spacing: 0.5px;
          margin-top: 3px;
          color: #555;
          font-family: monospace;
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
          }
        }
      `}</style>

      <button className="print-btn" onClick={() => window.print()}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
        Print / Save as PDF
      </button>

      <div className="page">
        <div className="label">
          <div className="header-row">
            <div className="big-g">G</div>
            <div className="header-right">
              <div className="no-postage">
                NO POSTAGE<br />NECESSARY IF<br />MAILED IN THE<br />UNITED STATES
              </div>
              <div className="endicia-row">
                <span className="endicia-logo">&#x1d452;ndicia</span>
                <span className="pc-postage">PC Postage Returns</span>
              </div>
            </div>
          </div>

          <div className="service-bar">
            <div className="service-name">USPS GROUND ADVANTAGE ™ RTN</div>
          </div>

          <div className="code-row">
            <span className="code-badge">C032</span>
            <span className="code-num">0001</span>
          </div>

          <div className="redacted-block" />

          <div className="specimen-notice">Time Sensitive Exempt Human Specimen</div>

          <div className="ship-to-row">
            <div>
              <div className="ship-label">SHIP<br />TO:</div>
            </div>
            <div className="qr-placeholder">
              <div className="qr-inner" />
            </div>
            <div className="address-block">
              <strong>LABCORP</strong><br />
              Attn: Direct Testing Lab<br />
              1447 YORK CT<br />
              BURLINGTON NC 27215-3361
            </div>
          </div>

          <div className="tracking-header">USPS TRACKING #</div>
          <div className="barcode-area">
            <svg className="barcode-svg" viewBox="0 0 460 60" preserveAspectRatio="none">
              {bars.map((bar, i) => (
                <rect key={i} x={bar.x} y={0} width={bar.width} height={60} fill="#000" />
              ))}
            </svg>
            <div className="tracking-number">{trackingFormatted}</div>
          </div>

          {orderBarcodeValue && (
            <div className="order-barcode-section">
              <div className="order-barcode-header">Order Reference</div>
              <svg className="order-barcode-svg" viewBox="0 0 460 36" preserveAspectRatio="none">
                {orderBars.map((bar, i) => (
                  <rect key={i} x={bar.x} y={0} width={bar.width} height={36} fill="#000" />
                ))}
              </svg>
              <div className="order-barcode-value">{orderBarcodeValue}</div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default function ReturnLabelPage() {
  return (
    <Suspense>
      <ReturnLabelContent />
    </Suspense>
  )
}
