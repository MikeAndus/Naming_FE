import { Link, NavLink, Outlet } from 'react-router-dom'

import { cn } from '@/lib/utils'

export function App() {
  return (
    <div className="h-screen overflow-hidden bg-muted/30 text-foreground">
      <header className="fixed inset-x-0 top-0 z-40 h-14 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-full w-full max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <Link className="text-sm font-semibold tracking-wide" to="/projects">
            Naming
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground',
                  isActive && 'bg-accent text-accent-foreground',
                )
              }
              to="/projects"
            >
              Dashboard
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="h-full overflow-y-auto pt-14">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
