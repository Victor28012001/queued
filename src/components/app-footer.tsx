import { Link, useLocation } from 'react-router'
// import { useMemo } from 'react'

export function AppFooter({
  links,
}: {
  links: { label: string; path: string; icon: string }[]
}) {
  const { pathname } = useLocation()

  // const activeIndex = useMemo(() => {
  //   return links.findIndex((link) => pathname.startsWith(link.path))
  // }, [pathname, links])

  // ❌ Hide footer on welcome page
  if (pathname === '/') return null

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-neutral-100 dark:bg-neutral-900 border-t dark:border-neutral-800 z-1000">
      <div className="relative flex justify-around items-center py-2">
        
        {/* 🔴 Sliding Active Indicator */}
        {/* <div
          className="absolute bottom-1 h-1 w-20 bg-red-500 rounded-full transition-all duration-300"
          style={{
            left: `${(activeIndex / links.length) * 100}%`,
            transform: 'translateX(50%)',
          }}
        /> */}

        {links.map(({ label, path, icon }, _index) => {
          const active = pathname.startsWith(path)

          return (
            <Link
              key={path}
              to={path}
              className="flex flex-col items-center justify-center flex-1 py-2"
            >
              <img
                src={icon}
                alt={label}
                className={`w-[48px] h-[48px] transition-all duration-300 ${
                  active
                    ? 'scale-110 opacity-100'
                    : 'opacity-50 scale-95'
                }`}
              />

              {/* 👇 Remove this span if you want icon-only UI */}
              <span
                className={`text-[10px] mt-1 transition-all duration-300 ${
                  active
                    ? 'text-red-600 font-semibold'
                    : 'text-neutral-400'
                }`}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </footer>
  )
}