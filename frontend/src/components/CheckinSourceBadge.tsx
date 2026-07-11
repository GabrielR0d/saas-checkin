interface CheckinSourceBadgeProps {
  source?: 'whatsapp' | 'rfid' | string | null
}

export function CheckinSourceBadge({ source }: CheckinSourceBadgeProps) {
  if (source === 'whatsapp') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400">
        WhatsApp 📱
      </span>
    )
  }

  if (source === 'rfid') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400">
        RFID 🪪
      </span>
    )
  }

  return <span className="text-slate-600">—</span>
}
