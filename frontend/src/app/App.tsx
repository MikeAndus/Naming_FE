import { Link, NavLink, Outlet } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/projects', label: 'Projects' },
  { to: '/projects/123', label: 'Project Detail' },
]

export function App() {
  return (
    <div className="flex h-screen flex-col bg-muted/30 text-foreground">
      <header className="h-14 shrink-0 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-full w-full max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <Link className="text-sm font-semibold tracking-wide" to="/projects">
            Naming
          </Link>

          <nav className="flex items-center gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground',
                    isActive && 'bg-accent text-accent-foreground',
                  )
                }
                to={item.to}
              >
                {item.label}
              </NavLink>
            ))}

            <Button asChild size="sm">
              <Link to="/projects">Launch</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
