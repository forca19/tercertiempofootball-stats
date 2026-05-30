'use client'

import { useRouter } from 'next/navigation'

type Props = {
  children: React.ReactNode
}

export default function BackButton({ children }: Props) {
  const router = useRouter()

  return (
    <button
      type="button"
      className="back-link"
      style={{ background: 'none', border: 0, cursor: 'pointer', font: 'inherit', padding: 0 }}
      onClick={() => router.back()}
    >
      {children}
    </button>
  )
}
