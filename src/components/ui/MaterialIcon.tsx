import React from 'react'

export interface MaterialIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string
  size?: number | string
  filled?: boolean
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700
  className?: string
}

export function MaterialIcon({
  name,
  size = 20,
  filled = false,
  weight = 400,
  className = '',
  style,
  ...props
}: MaterialIconProps) {
  const sizePx = typeof size === 'number' ? `${size}px` : size

  return (
    <span
      className={`material-symbols-outlined select-none inline-flex items-center justify-center shrink-0 leading-none ${className}`}
      style={{
        fontSize: sizePx,
        width: sizePx,
        height: sizePx,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' 24`,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    >
      {name}
    </span>
  )
}

export default MaterialIcon
