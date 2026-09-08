import { theme } from '@/theme'

export function LandingFooter() {
  return (
    <footer className={`pt-20 pb-12 ${theme.classes.footer} relative z-10 text-slate-600 dark:text-slate-300 transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* 4 Footer Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-16">

          {/* Column 1: Comparisons */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-5">
              PROPPULSE VS
            </h4>
            <ul className="space-y-3 text-xs sm:text-sm">
              <li>
                <a href="#features" className="hover:text-[#2B5748] dark:hover:text-[#9CB080] transition-colors">
                  PropPulse Vs ActiveCampaign
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-[#2B5748] dark:hover:text-[#9CB080] transition-colors">
                  PropPulse Vs Hubspot
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-[#2B5748] dark:hover:text-[#9CB080] transition-colors">
                  PropPulse Vs ClickFunnels
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-[#2B5748] dark:hover:text-[#9CB080] transition-colors">
                  PropPulse Vs Follow Up Boss
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: About */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-5">
              ABOUT PROPPULSE
            </h4>
            <ul className="space-y-3 text-xs sm:text-sm">
              <li>
                <a href="#" className="hover:text-[#2B5748] dark:hover:text-[#9CB080] transition-colors">
                  Who We Are
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#2B5748] dark:hover:text-[#9CB080] transition-colors">
                  Careers
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#2B5748] dark:hover:text-[#9CB080] transition-colors">
                  Blogs
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#2B5748] dark:hover:text-[#9CB080] transition-colors">
                  Events
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#2B5748] dark:hover:text-[#9CB080] transition-colors">
                  Affiliate Program
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact Us */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-5">
              CONTACT US
            </h4>
            <div className="space-y-2 text-xs sm:text-sm">
              <p className="font-semibold text-slate-800 dark:text-slate-200">Corporate HQ</p>
              <p>1801 N. Lamar St.</p>
              <p>Suite 600</p>
              <p>Dallas, Texas 75202</p>
              <p className="pt-2 text-[#2B5748] dark:text-[#9CB080] font-semibold">Toll Free: +1 888 732 4197</p>
            </div>
          </div>

          {/* Column 4: Socials */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-5">
              SOCIALS
            </h4>
            <div className="flex items-center space-x-4">
              {/* Facebook */}
              <a href="#" aria-label="Facebook" className="hover:text-[#2B5748] dark:hover:text-white transition-colors">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              {/* Instagram */}
              <a href="#" aria-label="Instagram" className="hover:text-[#2B5748] dark:hover:text-white transition-colors">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              {/* X / Twitter */}
              <a href="#" aria-label="X" className="hover:text-[#2B5748] dark:hover:text-white transition-colors">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              {/* YouTube */}
              <a href="#" aria-label="YouTube" className="hover:text-[#2B5748] dark:hover:text-white transition-colors">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
              {/* LinkedIn */}
              <a href="#" aria-label="LinkedIn" className="hover:text-[#2B5748] dark:hover:text-white transition-colors">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
            </div>
          </div>

        </div>

        {/* Divider Bar */}
        <div className={`w-full h-px ${theme.classes.divider} my-8`} />

        {/* Bottom Bar: Logo & Copyright */}
        <div className="flex flex-col items-center justify-center text-center space-y-4 pt-2">

          {/* Logo */}
          <div className="flex items-center space-x-2">

            <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              PropPulse OS
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            © 2026 PropPulse LLC, a subsidiary of PropPulse OS Inc. | All Rights Reserved
          </p>

          <div className="flex flex-wrap justify-center gap-6 text-[11px] text-slate-500 dark:text-slate-400">
            <a href="#" className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
              Privacy Policy
            </a>
            <span>|</span>
            <a href="#" className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
              Terms of Service
            </a>
            <span>|</span>
            <a href="#" className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
              Privacy and Security
            </a>
          </div>

        </div>

      </div>
    </footer>
  )
}
