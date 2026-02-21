import type { Metadata } from "next"
import { SignUpPage } from '@/components/ui/sign-up'

export const metadata: Metadata = {
  title: "Sign up",
  robots: {
    index: false,
    follow: false,
  },
}

export default function SignUpRoute() {
  return <SignUpPage />
}
