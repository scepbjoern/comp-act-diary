'use client'

import { useState, useRef, useEffect } from 'react'
import { IconLock, IconShieldLock } from '@tabler/icons-react'

interface PasscodeLockScreenProps {
  onUnlock: (passcode: string) => Promise<boolean>
  passcodeLength?: number
}

/**
 * Full-screen passcode lock overlay.
 * Shows a simple PIN input that unlocks the app.
 */
export function PasscodeLockScreen({ onUnlock, passcodeLength = 4 }: PasscodeLockScreenProps) {
  const [digits, setDigits] = useState<string[]>(Array(passcodeLength).fill(''))
  const [error, setError] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Focus first input on mount with a small delay to ensure visibility
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Reset error state after animation
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(false)
        setDigits(Array(passcodeLength).fill(''))
        inputRefs.current[0]?.focus()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [error, passcodeLength])

  const handleDigitChange = async (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1)
    
    const newDigits = [...digits]
    newDigits[index] = digit
    setDigits(newDigits)

    if (digit) {
      // Move to next input
      if (index < passcodeLength - 1) {
        inputRefs.current[index + 1]?.focus()
      } else {
        // All digits entered, attempt unlock
        const passcode = newDigits.join('')
        if (passcode.length === passcodeLength) {
          setIsChecking(true)
          const success = await onUnlock(passcode)
          setIsChecking(false)
          
          if (!success) {
            setError(true)
          }
        }
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move to previous input if current is empty
        inputRefs.current[index - 1]?.focus()
        const newDigits = [...digits]
        newDigits[index - 1] = ''
        setDigits(newDigits)
      } else {
        const newDigits = [...digits]
        newDigits[index] = ''
        setDigits(newDigits)
      }
      e.preventDefault()
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < passcodeLength - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, passcodeLength)
    if (pasted) {
      const newDigits = Array(passcodeLength).fill('')
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i]
      }
      setDigits(newDigits)
      
      // Focus last filled or next empty
      const lastIndex = Math.min(pasted.length, passcodeLength - 1)
      inputRefs.current[lastIndex]?.focus()
      
      // If complete, attempt unlock
      if (pasted.length === passcodeLength) {
        setTimeout(async () => {
          setIsChecking(true)
          const success = await onUnlock(pasted)
          setIsChecking(false)
          if (!success) {
            setError(true)
          }
        }, 100)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-base-300/95 backdrop-blur-md">
      <div className="flex flex-col items-center gap-6 p-8">
        {/* Lock icon */}
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 text-primary">
          <IconShieldLock className="w-10 h-10" stroke={1.5} />
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-xl font-semibold text-base-content">Tagebuch gesperrt</h1>
          <p className="text-sm text-gray-400 mt-1">
            Bitte gib deinen Code ein
          </p>
        </div>

        {/* PIN inputs */}
        <div 
          className={`flex gap-3 ${error ? 'animate-shake' : ''}`}
          onPaste={handlePaste}
        >
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={el => { inputRefs.current[index] = el }}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={e => handleDigitChange(index, e.target.value)}
              onKeyDown={e => handleKeyDown(index, e)}
              disabled={isChecking}
              className={`
                w-12 h-14 text-center text-2xl font-bold
                bg-base-100 border-2 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                transition-all duration-150
                ${error ? 'border-error bg-error/10' : 'border-base-300'}
                ${isChecking ? 'opacity-50' : ''}
              `}
              autoComplete="off"
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-error text-sm animate-fadeIn">
            Falscher Code. Bitte erneut versuchen.
          </p>
        )}

        {/* Checking indicator */}
        {isChecking && (
          <div className="flex items-center gap-2 text-gray-400">
            <span className="loading loading-spinner loading-sm" />
            <span className="text-sm">Prüfe...</span>
          </div>
        )}

        {/* Hint */}
        <p className="text-xs text-gray-500 mt-4">
          <IconLock className="inline w-3 h-3 mr-1" />
          Automatische Sperre nach Inaktivität
        </p>
      </div>

      {/* CSS for shake animation */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}
