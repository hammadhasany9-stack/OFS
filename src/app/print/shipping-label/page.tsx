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

function ShippingLabelContent() {
  const searchParams = useSearchParams()
  const name = searchParams.get("name") ?? "Patient"
  const req = searchParams.get("req") ?? "—"
  const dob = searchParams.get("dob") ?? "—"
  const orderId = searchParams.get("orderId") ?? "—"
  const kitName = searchParams.get("kitName") ?? "—"
  const kitId = searchParams.get("kitId") ?? "—"

  const trackingRef = useRef(generateFakeTracking())
  const barsRef = useRef(generateBarcodeBars())

  const tracking = trackingRef.current
  const trackingFormatted = `9400 ${tracking.slice(0, 4)} ${tracking.slice(4, 8)} ${tracking.slice(8, 12)} ${tracking.slice(12, 16)} ${tracking.slice(16, 20)}`
  const bars = barsRef.current

  const today = new Date()
  const dateFormatted = today.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }).replace(",", "")

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

        /* ── Header row ── */
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
          padding: 8px 10px;
          gap: 4px;
          position: relative;
        }

        .postage-meta {
          font-size: 8px;
          line-height: 1.6;
          color: #000;
        }

        .postage-meta strong { font-weight: 700; }

        .endicia-badge {
          position: absolute;
          right: 8px;
          top: 8px;
          writing-mode: vertical-rl;
          text-orientation: mixed;
          transform: rotate(180deg);
          font-size: 9px;
          font-style: italic;
          font-weight: 700;
          color: #1a56db;
          letter-spacing: 0.5px;
          border: 1px solid #1a56db;
          padding: 3px 2px;
        }

        .qr-header {
          width: 56px;
          height: 56px;
          border: 1px solid #999;
          padding: 3px;
          margin-top: auto;
          align-self: flex-end;
        }

        .qr-inner {
          width: 100%;
          height: 100%;
          background: repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 0 0 / 6px 6px;
        }

        /* ── Service bar ── */
        .service-bar {
          background: #fff;
          border-bottom: 2px solid #000;
          padding: 8px 10px;
          text-align: center;
        }

        .service-name {
          font-size: 20px;
          font-weight: 900;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        /* ── Destination block (LABCORP) ── */
        .destination-block {
          padding: 10px 12px;
          border-bottom: 1px solid #ccc;
        }

        .dest-name {
          font-size: 15px;
          font-weight: 900;
        }

        .dest-code-row {
          display: flex;
          justify-content: flex-end;
          gap: 6px;
          margin-bottom: 4px;
        }

        .code-badge {
          background: #000;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 7px;
        }

        .code-num { font-size: 11px; font-weight: 700; }

        .dest-address {
          font-size: 13px;
          line-height: 1.7;
        }

        /* ── Ship To section ── */
        .ship-to-section {
          border-top: 1px solid #ccc;
          border-bottom: 1px solid #ccc;
          padding: 10px 12px;
          display: flex;
          gap: 10px;
          align-items: flex-start;
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

        .redacted-block {
          background: #1a1a1a;
          height: 32px;
          flex: 1;
          border-radius: 2px;
          align-self: center;
        }

        /* ── TRF info strip ── */
        .trf-info-strip {
          border-top: 1px solid #ccc;
          background: #f9f9f9;
          padding: 6px 12px;
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .trf-info-item {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .trf-info-label {
          font-size: 7px;
          font-weight: 700;
          text-transform: uppercase;
          color: #666;
          letter-spacing: 0.5px;
        }

        .trf-info-value {
          font-size: 10px;
          font-weight: 600;
          color: #000;
        }

        /* ── Tracking section ── */
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

        .barcode-area { padding: 12px 10px 10px; text-align: center; }
        .barcode-svg { width: 100%; height: 60px; }

        .tracking-number {
          font-size: 11px;
          letter-spacing: 1.5px;
          margin-top: 5px;
          color: #000;
          font-weight: 600;
        }

        /* ── Print button ── */
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

          {/* Header row */}
          <div className="header-row">
            <div className="big-g">G</div>
            <div className="header-right">
              <div className="endicia-badge">endicia</div>
              <div className="postage-meta">
                <strong>US POSTAGE AND FEES PAID</strong><br />
                GROUND ADVANTAGE IMI<br />
                {dateFormatted}<br />
                Mailed from ZIP 92707<br />
                4 OZ GROUND ADVANTAGE RATE<br />
                ZONE 8
              </div>
              <div className="postage-meta" style={{ marginTop: "4px" }}>
                16950093<br />
                Commercial
                <span style={{ marginLeft: "20px" }}>063S0001442221</span>
              </div>
              <div className="qr-header">
                <div className="qr-inner" />
              </div>
            </div>
          </div>

          {/* Service bar */}
          <div className="service-bar">
            <div className="service-name">USPS GROUND ADVANTAGE™</div>
          </div>

          {/* Destination block */}
          <div className="destination-block">
            <div className="dest-code-row">
              <span className="code-badge">C033</span>
              <span className="code-num">0001</span>
            </div>
            <div className="dest-name">LABCORP</div>
            <div className="dest-address">
              Attn: Direct Testing Lab<br />
              1447 YORK CT<br />
              BURLINGTON NC 27215-3361
            </div>
          </div>

          {/* Ship To */}
          <div className="ship-to-section">
            <div className="ship-label">SHIP<br />TO:</div>
            <div className="qr-placeholder">
              <div className="qr-inner" />
            </div>
            <div className="redacted-block" />
          </div>

          {/* TRF info strip */}
          <div className="trf-info-strip">
            <div className="trf-info-item">
              <span className="trf-info-label">Patient</span>
              <span className="trf-info-value">{name}</span>
            </div>
            <div className="trf-info-item">
              <span className="trf-info-label">Req No.</span>
              <span className="trf-info-value">{req}</span>
            </div>
            <div className="trf-info-item">
              <span className="trf-info-label">DOB</span>
              <span className="trf-info-value">{dob}</span>
            </div>
            <div className="trf-info-item">
              <span className="trf-info-label">Order ID</span>
              <span className="trf-info-value">{orderId}</span>
            </div>
            <div className="trf-info-item">
              <span className="trf-info-label">Kit</span>
              <span className="trf-info-value">{kitName} #{kitId}</span>
            </div>
          </div>

          {/* Tracking */}
          <div className="tracking-header">USPS TRACKING #</div>
          <div className="barcode-area">
            <svg className="barcode-svg" viewBox="0 0 460 60" preserveAspectRatio="none">
              {bars.map((bar, i) => (
                <rect key={i} x={bar.x} y={0} width={bar.width} height={60} fill="#000" />
              ))}
            </svg>
            <div className="tracking-number">{trackingFormatted}</div>
          </div>

        </div>
      </div>
    </>
  )
}

export default function ShippingLabelPage() {
  return (
    <Suspense>
      <ShippingLabelContent />
    </Suspense>
  )
}
