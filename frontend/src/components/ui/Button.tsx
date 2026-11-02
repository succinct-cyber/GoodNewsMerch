'use client'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'dark' | 'outline' | 'light'
  size?: 'sm' | 'md'
  full?: boolean
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'dark', size = 'md', full, loading, children, className = '', ...rest }, ref) => {
    const base = `inline-flex items-center justify-center gap-2 font-bold tracking-[0.15em]
      uppercase border-2 cursor-pointer transition-all duration-200 active:scale-[0.97]
      disabled:opacity-50 disabled:cursor-not-allowed`
    const sizes = { sm: 'px-[18px] py-2 text-[11px]', md: 'px-7 py-3 text-[12px]' }
    const variants = {
      dark:    'bg-black text-white border-black hover:bg-[#2a2a2a] hover:border-[#2a2a2a]',
      outline: 'bg-transparent text-text border-text hover:bg-text hover:text-white',
      light:   'bg-white text-black border-white hover:bg-section-bg',
    }
    return (
      <button ref={ref}
        className={`${base} ${sizes[size]} ${variants[variant]} ${full ? 'w-full' : ''} ${className}`}
        {...rest}>
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent
            rounded-full animate-spin" />
        ) : children}
      </button>
    )
  }
)
Button.displayName = 'Button'
export default Button
