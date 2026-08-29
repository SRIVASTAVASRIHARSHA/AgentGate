import React, { useState } from 'react'
import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration
} from '@simplewebauthn/browser'

const API_BASE = typeof window !== 'undefined' ? window.location.origin : ''

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...(options.headers || {})
    },
    ...options
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload?.message || `Request failed (${response.status})`)
  }

  return payload
}

export default function StatusSection() {
  const [deviceRegistered, setDeviceRegistered] = useState(false)
  const [authorizationVerified, setAuthorizationVerified] = useState(false)
  const [registerMessage, setRegisterMessage] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [registering, setRegistering] = useState(false)
  const [authenticating, setAuthenticating] = useState(false)

  const handleRegisterDevice = async () => {
    if (!browserSupportsWebAuthn()) {
      setRegisterMessage('WebAuthn is not supported in this browser.')
      return
    }

    if (!platformAuthenticatorIsAvailable()) {
      setRegisterMessage('Platform authenticator is not available on this device.')
      return
    }

    setRegistering(true)
    setRegisterMessage('')

    try {
      const optionsJSON = await requestJson(`${API_BASE}/register-options`)
      const registrationResponse = await startRegistration({ optionsJSON })
      const verification = await requestJson(`${API_BASE}/register-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registrationResponse)
      })

      if (verification?.verified === true) {
        setDeviceRegistered(true)
        setRegisterMessage('Device Registered')
        return
      }

      throw new Error(verification?.message || 'Registration verification failed.')
    } catch (error) {
      setDeviceRegistered(false)
      setRegisterMessage(error?.message || 'Device registration failed.')
    } finally {
      setRegistering(false)
    }
  }

  const handleTestAuthorization = async () => {
    if (!browserSupportsWebAuthn()) {
      setAuthMessage('WebAuthn is not supported in this browser.')
      return
    }

    if (!platformAuthenticatorIsAvailable()) {
      setAuthMessage('Platform authenticator is not available on this device.')
      return
    }

    setAuthenticating(true)
    setAuthMessage('')

    try {
      const optionsJSON = await requestJson(`${API_BASE}/auth-options`)
      const authenticationResponse = await startAuthentication({ optionsJSON })
      const verification = await requestJson(`${API_BASE}/auth-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(authenticationResponse)
      })

      if (verification?.verified === true) {
        setAuthorizationVerified(true)
        setAuthMessage('Authorization Verified')
        return
      }

      throw new Error(verification?.message || 'Authorization verification failed.')
    } catch (error) {
      setAuthorizationVerified(false)
      setAuthMessage(error?.message || 'Authorization failed.')
    } finally {
      setAuthenticating(false)
    }
  }

  return (
    <section className="editorial-section">
      <div className="section-meta">
        <span className="section-num">01 / DEVICE AUTHORIZATION</span>
        <h2 className="section-title">/STATUS</h2>
      </div>

      <div className="status-display">
        <div className="status-indicator">
          <span className={`status-indicator-dot ${deviceRegistered ? 'pulse-warning' : 'pulse-warning'}`} />
          <span className="status-indicator-text">{deviceRegistered ? 'REGISTERED' : 'UNREGISTERED'}</span>
        </div>
        <h3 className="status-display-main">
          {deviceRegistered ? 'DEVICE\nREGISTERED' : 'DEVICE\nNOT REGISTERED'}
        </h3>
      </div>

      <div className="section-body">
        <p className="section-desc">
          This phone will become the human authorization endpoint for Agent Gate.
          Pairing this client enables cryptographic verification of code changes and
          sensitive tasks proposed by autonomous agents.
        </p>
      </div>

      <div className="section-action" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start' }}>
        <button
          type="button"
          className="editorial-btn"
          onClick={handleRegisterDevice}
          disabled={registering}
          aria-label="Register Device"
          style={{ opacity: registering ? 0.7 : 1 }}
        >
          <span className="btn-label-text">{registering ? 'REGISTERING...' : 'REGISTER DEVICE'}</span>
          <span className="btn-label-arrow">→</span>
        </button>
        {registerMessage ? (
          <div style={{ color: deviceRegistered ? '#d6a21d' : '#f5d68a', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {registerMessage}
          </div>
        ) : null}

        <button
          type="button"
          className="editorial-btn"
          onClick={handleTestAuthorization}
          disabled={authenticating}
          aria-label="Test Authorization"
          style={{ opacity: authenticating ? 0.7 : 1 }}
        >
          <span className="btn-label-text">{authenticating ? 'VERIFYING...' : 'TEST AUTHORIZATION'}</span>
          <span className="btn-label-arrow">→</span>
        </button>
        {authMessage ? (
          <div style={{ color: authorizationVerified ? '#d6a21d' : '#f5d68a', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {authMessage}
          </div>
        ) : null}
      </div>
    </section>
  )
}
