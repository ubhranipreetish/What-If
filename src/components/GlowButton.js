"use client";

export default function GlowButton({ children, onClick, href, className = "", size = "lg" }) {
    const sizeClasses = {
        sm: "px-6 py-3 text-sm",
        md: "px-8 py-4 text-base",
        lg: "px-10 py-5 text-lg",
    };

    const baseClasses = `
    relative inline-flex items-center justify-center gap-2
    font-semibold tracking-wide uppercase
    rounded-xl cursor-pointer
    bg-gradient-to-r from-[#00e5ff] via-[#00b4d8] to-[#0077b6]
    text-[#050a18] 
    transition-all duration-300 ease-out
    hover:scale-105 hover:shadow-[0_0_40px_rgba(0,229,255,0.4)]
    active:scale-95
    animate-glow
    ${sizeClasses[size]}
    ${className}
  `;

    if (href) {
        return (
            <a href={href} className={baseClasses}>
                {children}
                <span className="absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity hover:opacity-100" />
            </a>
        );
    }

    return (
        <button onClick={onClick} className={baseClasses}>
            {children}
            <span className="absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity hover:opacity-100" />
        </button>
    );
}
