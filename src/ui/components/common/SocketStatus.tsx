import { useEffect, useState } from 'react'

export function SocketStatus() {
  const [isConnected, setIsConnected] = useState(false)
  const [socketId, setSocketId] = useState<string | null>(null)

  useEffect(() => {
    checkSocketStatus()

    // Check status every 5 seconds
    const interval = setInterval(checkSocketStatus, 5000)

    return () => clearInterval(interval)
  }, [])

  const checkSocketStatus = async () => {
    try {
      const connected = await window.electron.socket.isConnected()
      setIsConnected(connected)

      if (connected) {
        const id = await window.electron.socket.getId()
        setSocketId(id)
      } else {
        setSocketId(null)
      }
    } catch (error) {
      console.error('Error checking socket status:', error)
      setIsConnected(false)
      setSocketId(null)
    }
  }

  const handleReconnect = async () => {
    try {
      await window.electron.socket.reconnect()
      setTimeout(checkSocketStatus, 1000)
    } catch (error) {
      console.error('Error reconnecting socket:', error)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        padding: '4px 4px',
        fontSize: '12px',
        borderRadius: '4px',
        backgroundColor: isConnected ? '#d4edda' : '#f8d7da',
        color: isConnected ? '#155724' : '#721c24',
        border: `1px solid ${isConnected ? '#c3e6cb' : '#f5c6cb'}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 4px',
          fontSize: '12px',
          borderRadius: '4px',
          backgroundColor: isConnected ? '#28a745' : '#dc3545',
        }}
      />
      <span>{isConnected && <>Connected</>}</span>
      {!isConnected && (
         <button
          onClick={handleReconnect}
          style={{
            fontSize: '11px',
            padding: '0 2px',
            borderRadius: '3px',
            color: '#721c24',
            cursor: 'pointer',
          }}
        >
          Reconnect
        </button>
      )}
    </div>
  )
}
