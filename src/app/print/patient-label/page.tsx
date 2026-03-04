"use client"

import { useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { Suspense } from "react"

function PatientLabelContent() {
  const searchParams = useSearchParams()
  const name = searchParams.get("name") ?? "Patient"
  const req = searchParams.get("req") ?? "—"
  const dob = searchParams.get("dob") ?? "—"

  useEffect(() => {
    const timer = setTimeout(() => window.print(), 600)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
          background: #e5e7eb;
          color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }

        /* Screen preview: 3× physical size (2in×1in) for readability */
        .label {
          width: 576px;
          height: 288px;
          background: #ffffff;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 28px 32px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.10);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .patient-name {
          font-size: 27px;
          font-weight: 700;
          color: #111827;
          line-height: 1.25;
          margin-bottom: 14px;
          letter-spacing: -0.2px;
        }

        .divider {
          height: 1px;
          background: #e5e7eb;
          margin-bottom: 10px;
        }

        .field-row {
          font-size: 19px;
          color: #6b7280;
          line-height: 1.7;
          display: flex;
          gap: 4px;
        }

        .field-row .value {
          color: #111827;
          font-weight: 500;
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
          font-family: inherit;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        }
        .print-btn:hover { background: #2d5282; }

        @media print {
          @page { size: 2in 1in; margin: 0; }
          body {
            background: white;
            display: block;
            min-height: unset;
          }
          .print-btn { display: none !important; }
          .label {
            width: 2in;
            height: 1in;
            border: none;
            border-radius: 0;
            box-shadow: none;
            padding: 0.06in 0.1in;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .patient-name { font-size: 9pt; margin-bottom: 2pt; }
          .divider { margin-bottom: 2pt; }
          .field-row { font-size: 6.5pt; line-height: 1.4; }
        }
      `}</style>

      <button className="print-btn" onClick={() => window.print()}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
        Print / Save as PDF
      </button>

      <div className="label">
        <div className="patient-name">{name}</div>
        <div className="divider" />
        <div className="field-row">
          Requisition No.: <span className="value">{req}</span>
        </div>
        <div className="field-row">
          Patient DOB: <span className="value">{dob}</span>
        </div>
      </div>
    </>
  )
}

export default function PatientLabelPage() {
  return (
    <Suspense>
      <PatientLabelContent />
    </Suspense>
  )
}
