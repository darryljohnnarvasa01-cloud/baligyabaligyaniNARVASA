import { useEffect, useRef, useState } from 'react'

const GOOGLE_SCRIPT_ID = 'google-identity-services'
const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

function loadGoogleIdentityScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google sign-in requires a browser environment.'))
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google)
  }

  const existingScript = document.getElementById(GOOGLE_SCRIPT_ID)

  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(window.google), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google script.')), { once: true })
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = GOOGLE_SCRIPT_ID
    script.src = GOOGLE_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.google)
    script.onerror = () => reject(new Error('Failed to load Google script.'))
    document.head.appendChild(script)
  })
}

export default function GoogleSignInButton({
  onCredential,
  disabled = false,
  text = 'continue_with',
  context = 'signin',
  oneTap = false,
  autoSelect = false,
  framed = true,
}) {
  const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID
  const buttonRef = useRef(null)
  const callbackRef = useRef(onCredential)
  const [status, setStatus] = useState(clientId ? 'loading' : 'unavailable')

  useEffect(() => {
    callbackRef.current = onCredential
  }, [onCredential])

  useEffect(() => {
    if (!clientId || !buttonRef.current) {
      return undefined
    }

    let isCancelled = false

    const initializeGoogleButton = async () => {
      try {
        await loadGoogleIdentityScript()

        if (isCancelled || !buttonRef.current || !window.google?.accounts?.id) {
          return
        }

        buttonRef.current.innerHTML = ''

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (!response?.credential || disabled) {
              return
            }

            callbackRef.current?.(response.credential)
          },
          context,
          ux_mode: 'popup',
          auto_select: autoSelect,
          itp_support: true,
        })

        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'pill',
          width: 360,
          logo_alignment: 'left',
        })

        if (oneTap && !disabled) {
          window.google.accounts.id.prompt()
        } else if (window.google.accounts.id.cancel) {
          window.google.accounts.id.cancel()
        }

        setStatus('ready')
      } catch {
        if (!isCancelled) {
          setStatus('error')
        }
      }
    }

    void initializeGoogleButton()

    return () => {
      isCancelled = true

      if (window.google?.accounts?.id?.cancel) {
        window.google.accounts.id.cancel()
      }
    }
  }, [autoSelect, clientId, context, disabled, oneTap, text])

  if (!clientId) {
    return null
  }

  if (status === 'error') {
    if (!framed) {
      return <div className="text-sm text-[#7a7a7a]">Google sign-in is currently unavailable.</div>
    }

    return (
      <div className="rounded-[18px] border border-[#ece4d5] bg-[#fcfaf4] px-4 py-3 text-sm text-[#7a7a7a]">
        Google sign-in is currently unavailable.
      </div>
    )
  }

  if (!framed) {
    return (
      <div className={disabled ? 'pointer-events-none opacity-60' : ''}>
        <div ref={buttonRef} className="flex min-h-[44px] items-center justify-center" />
        {status === 'loading' ? (
          <div className="mt-2 text-center text-xs text-[#7a7a7a]">Loading Google sign-in...</div>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={[
        'rounded-[22px] border border-[#ece4d5] bg-white p-3 transition',
        disabled ? 'pointer-events-none opacity-60' : '',
      ].join(' ')}
    >
      <div ref={buttonRef} className="flex min-h-[44px] items-center justify-center" />
      {status === 'loading' ? (
        <div className="mt-2 text-center text-xs text-[#7a7a7a]">Loading Google sign-in...</div>
      ) : null}
    </div>
  )
}
