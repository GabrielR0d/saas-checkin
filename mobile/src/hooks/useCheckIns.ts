import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { AccessLog } from '../types'

export function useCheckIns(limit = 50) {
  return useQuery<AccessLog[]>({
    queryKey: ['access-logs', limit],
    queryFn: async () => {
      const res = await api.get(`/access-logs?limit=${limit}`)
      return res.data?.data ?? []
    },
    refetchInterval: 10_000,
  })
}
