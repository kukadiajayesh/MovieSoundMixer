import React from 'react'

export const Switch: React.FC<{ on: boolean; onChange: (v: boolean) => void; label: string }> = ({
  on,
  onChange,
  label,
}) => (
  <label className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
    <span className="track" />
    <span>{label}</span>
  </label>
)
