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
        gap: '8px',
        padding: '4px 12px',
        fontSize: '12px',
        borderRadius: '4px',
        backgroundColor: isConnected ? '#d4edda' : '#f8d7da',
        color: isConnected ? '#155724' : '#721c24',
        border: `1px solid ${isConnected ? '#c3e6cb' : '#f5c6cb'}`,
      }}
    >
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isConnected ? '#28a745' : '#dc3545',
        }}
      />
      <span>{isConnected && <>Connected</>}</span>
      {!isConnected && (
        <button
          onClick={handleReconnect}
          style={{
            marginLeft: '8px',
            padding: '2px 8px',
            fontSize: '11px',
            borderRadius: '3px',
            border: '1px solid #721c24',
            backgroundColor: '#fff',
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
