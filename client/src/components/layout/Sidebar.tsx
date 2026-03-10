import { NavLink } from 'react-router-dom'
import { LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/pipeline', label: 'Pipeline', icon: LayoutDashboard },
] as const;

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo / Title */}
      <div className="flex h-14 items-center border-b px-4">
        <h1 className="text-lg font-bold tracking-tight">Weds CRM</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className="block"
          >
            {({ isActive }) => (
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-2',
                  isActive && 'font-semibold',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
