import { LoginForm } from "@/components/auth/LoginForm"

export default function ProductionLoginPage() {
  return <LoginForm section="production" mfaPath="/production-team/mfa" />
}
