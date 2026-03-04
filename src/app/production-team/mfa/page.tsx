import { MfaForm } from "@/components/auth/MfaForm"

export default function ProductionMfaPage() {
  return <MfaForm section="production" redirectTo="/production-team" />
}
