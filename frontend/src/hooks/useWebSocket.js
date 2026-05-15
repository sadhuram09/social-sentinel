import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import BASE_URL from '../utils/api'

export function useWebSocket() {
  const socketRef = useRef(null)

  const [connected, setConnected] = useState(false)

  const [tweets, setTweets] = useState([])

  const [stats, setStats] = useState({
    total: 0,
    bullying: 0,
    depression: 0,
    neutral: 0,
  })

  useEffect(() => {
    const socket = io(BASE_URL, {
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('new_tweet', (tweet) => {
      const stamped = {
        ...tweet,
        _key: `${tweet.id}_${Date.now()}`,
        time: 'now',
      }

      setTweets((prev) => {
        const updated = [stamped, ...prev.slice(0, 49)]

        return updated.map((t, i) => ({
          ...t,
          time:
            i === 0
              ? 'now'
              : i < 3
              ? `${i * 3}s`
              : i < 8
              ? `${Math.round(i * 8)}s`
              : `${Math.round(i * 0.4)}m`,
        }))
      })

      setStats((prev) => ({
        total: prev.total + 1,
        bullying:
          prev.bullying + (tweet.type === 'bullying' ? 1 : 0),
        depression:
          prev.depression + (tweet.type === 'depression' ? 1 : 0),
        neutral:
          prev.neutral + (tweet.type === 'neutral' ? 1 : 0),
      }))
    })

    return () => socket.disconnect()
  }, [])

  const pause = useCallback(
    () => socketRef.current?.disconnect(),
    []
  )

  const resume = useCallback(
    () => socketRef.current?.connect(),
    []
  )

  return {
    connected,
    tweets,
    stats,
    pause,
    resume,
  }
}