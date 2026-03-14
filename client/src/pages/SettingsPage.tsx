import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TemplateEditor } from '@/components/settings/TemplateEditor';
import { AiPromptEditor } from '@/components/settings/AiPromptEditor';

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <h1 className="text-2xl font-bold">Paramètres</h1>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Modèles</TabsTrigger>
          <TabsTrigger value="ai">Paramètres IA</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4">
          <TemplateEditor />
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <AiPromptEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
