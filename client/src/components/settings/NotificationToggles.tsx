import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotificationSettings, useToggleNotification } from '@/hooks/useSettings';
import type { NotificationSetting } from '@/hooks/useSettings';

const GROUPS: { title: string; channels: string[] }[] = [
  {
    title: 'Nouveau contact',
    channels: ['free_mobile_new_contact', 'email_recap_new_contact', 'whatsapp_prospect'],
  },
  {
    title: 'Alertes erreurs',
    channels: ['free_mobile_error', 'email_error'],
  },
];

export function NotificationToggles() {
  const { data: settings, isLoading } = useNotificationSettings();
  const toggleMutation = useToggleNotification();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-9 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const settingsMap = new Map<string, NotificationSetting>(
    settings?.map((s) => [s.channel, s]) ?? []
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {group.title}
            </h3>
            <div className="space-y-3">
              {group.channels.map((channel) => {
                const setting = settingsMap.get(channel);
                if (!setting) return null;
                return (
                  <div
                    key={channel}
                    className="flex items-center justify-between"
                  >
                    <label
                      htmlFor={`toggle-${channel}`}
                      className="text-sm cursor-pointer"
                    >
                      {setting.label}
                    </label>
                    <Switch
                      id={`toggle-${channel}`}
                      checked={setting.enabled}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ channel, enabled: checked })
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
