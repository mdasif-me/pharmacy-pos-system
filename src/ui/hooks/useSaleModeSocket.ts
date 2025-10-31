import { useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { StockBroadcastPayload } from '../services/broadcastService'

type SocketStatus = 'disconnected' | 'connecting' | 'connected'

type UseSaleModeSocketResult = {
  status: SocketStatus
  lastEvent: StockBroadcastPayload | null
  error: string | null
}

export const useSaleModeSocket = (shouldConnect: boolean): UseSaleModeSocketResult => {
  const socketRef = useRef<Socket | null>(null)
  const [status, setStatus] = useState<SocketStatus>('disconnected')
  const [lastEvent, setLastEvent] = useState<StockBroadcastPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!shouldConnect) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      setStatus('disconnected')
      return
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL
    if (!socketUrl) {
      setStatus('disconnected')
      setError('socket url missing')
      return
    }
    setStatus('connecting')

    const socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      forceNew: true,
      secure: socketUrl.startsWith('http://'),
    })

    socketRef.current = socket

    const handleConnect = () => {
      setStatus('connected')
      setError(null)
    }

    const handleDisconnect = (reason: Socket.DisconnectReason) => {
      setStatus('disconnected')
      if (reason && reason !== 'io client disconnect') {
        setError(reason)
      }
    }

    const handleConnectError = (err: Error) => {
      setStatus('disconnected')
      setError(err.message ?? 'connection failed')
    }

    const handleReconnectAttempt = () => {
      setStatus('connecting')
    }

    const handleReconnect = () => {
      setStatus('connected')
      setError(null)
    }

    const handleAddStock = (payload: StockBroadcastPayload) => {
      setLastEvent(payload)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)
    socket.io.on('reconnect_attempt', handleReconnectAttempt)
    socket.io.on('reconnect', handleReconnect)
    socket.io.on('error', handleConnectError)
    socket.on('add_stock', handleAddStock)

    if (socket.connected) {
      handleConnect()
    }

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)
      socket.io.off('reconnect_attempt', handleReconnectAttempt)
      socket.io.off('reconnect', handleReconnect)
      socket.io.off('error', handleConnectError)
      socket.off('add_stock', handleAddStock)
      socket.disconnect()
      socketRef.current = null
    }
  }, [shouldConnect])

  return useMemo(() => ({ status, lastEvent, error }), [status, lastEvent, error])
}
