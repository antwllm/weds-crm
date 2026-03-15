import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Mail, Settings, PanelLeftClose, PanelLeft, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/pipeline', label: 'Pipeline', icon: LayoutDashboard },
  { to: '/inbox', label: 'Boîte de réception', icon: Mail },
  { to: '/settings', label: 'Paramètres', icon: Settings },
] as const;

interface SidebarProps {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ onNavigate, collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo / Title */}
      <div className="flex h-14 items-center border-b px-4 justify-between">
        {!collapsed && <h1 className="text-lg font-bold tracking-tight">Weds CRM</h1>}
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onToggleCollapse}
            title={collapsed ? 'Ouvrir le menu' : 'Réduire le menu'}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
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
                  'w-full gap-2',
                  collapsed ? 'justify-center px-2' : 'justify-start',
                  isActive && 'font-semibold',
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && item.label}
              </Button>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          className={cn(
            'w-full gap-2 text-muted-foreground hover:text-destructive',
            collapsed ? 'justify-center px-2' : 'justify-start',
          )}
          title={collapsed ? 'Déconnexion' : undefined}
          onClick={() => { window.location.href = '/auth/logout'; }}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && 'Déconnexion'}
        </Button>
      </div>
    </div>
  );
}
