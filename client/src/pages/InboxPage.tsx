import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThreadList } from '@/components/inbox/ThreadList';
import { ThreadDetail } from '@/components/inbox/ThreadDetail';
import { ComposeReply } from '@/components/inbox/ComposeReply';
import { useThreads, useLeadEmails } from '@/hooks/useInbox';

interface DraftFromLeadState {
  draft?: string;
  leadId?: number;
  leadEmail?: string;
}

export default function InboxPage() {
  const location = useLocation();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [pageToken, setPageToken] = useState<string | undefined>();
  const [initialDraft, setInitialDraft] = useState<string | undefined>();
  const [draftLeadId, setDraftLeadId] = useState<number | undefined>();
  const [standaloneCompose, setStandaloneCompose] = useState<{
    to: string;
    draft: string;
    leadId: number;
  } | null>(null);

  const { data, isLoading, error } = useThreads(pageToken);
  const threads = data?.threads ?? [];
  const hasMore = !!data?.nextPageToken;

  // Draft-from-lead flow: read location.state
  const draftState = location.state as DraftFromLeadState | null;
  const leadIdForEmails = draftState?.leadId ?? null;
  const { data: leadEmailsData } = useLeadEmails(leadIdForEmails);

  useEffect(() => {
    if (!draftState?.draft || !draftState?.leadId) return;

    const emails = leadEmailsData?.emails;
    if (emails === undefined) return; // Still loading

    if (emails.length > 0) {
      // Find most recent email with a gmailThreadId
      const withThread = emails.filter((e) => e.gmailThreadId);
      if (withThread.length > 0) {
        const mostRecent = withThread[0];
        setSelectedThreadId(mostRecent.gmailThreadId!);
        setInitialDraft(draftState.draft);
        setDraftLeadId(draftState.leadId);
      }
    } else {
      // No linked emails: set draft so it appears when user selects a thread
      setInitialDraft(draftState.draft);
      setDraftLeadId(draftState.leadId);
      // Also show standalone compose as fallback
      setStandaloneCompose({
        to: draftState.leadEmail ?? '',
        draft: draftState.draft,
        leadId: draftState.leadId,
      });
    }

    // Clear location state to prevent stale drafts on refresh
    window.history.replaceState({}, document.title);
  }, [draftState?.draft, draftState?.leadId, draftState?.leadEmail, leadEmailsData]);

  const handleLoadMore = () => {
    if (data?.nextPageToken) {
      setPageToken(data.nextPageToken);
    }
  };

  // Mobile: show back button when thread is selected
  const showMobileDetail = selectedThreadId || standaloneCompose;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        {showMobileDetail && (
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => {
              setSelectedThreadId(null);
              setStandaloneCompose(null);
            }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <h2 className="text-lg font-semibold">Boîte de réception</h2>
      </div>

      {/* Split pane */}
      <div className="grid flex-1 grid-cols-1 md:grid-cols-[350px_1fr] overflow-hidden">
        {/* Left: Thread list */}
        <div
          className={`border-r overflow-y-auto ${
            showMobileDetail ? 'hidden md:block' : 'block'
          }`}
        >
          {error ? (
            <div className="flex items-center justify-center p-8 text-destructive text-sm">
              Erreur de chargement. Veuillez vous reconnecter.
            </div>
          ) : (
            <ThreadList
              threads={threads}
              selectedId={selectedThreadId}
              onSelect={(id) => {
                setSelectedThreadId(id);
                setStandaloneCompose(null);
              }}
              isLoading={isLoading}
              onLoadMore={handleLoadMore}
              hasMore={hasMore}
            />
          )}
        </div>

        {/* Right: Thread detail or empty state */}
        <div
          className={`overflow-hidden ${
            showMobileDetail ? 'block' : 'hidden md:block'
          }`}
        >
          {standaloneCompose ? (
            <div className="flex h-full flex-col">
              <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground">
                Nouveau message
              </div>
              <ComposeReply
                leadId={standaloneCompose.leadId}
                initialDraft={standaloneCompose.draft}
                initialTo={standaloneCompose.to}
              />
            </div>
          ) : selectedThreadId ? (
            <ThreadDetail
              threadId={selectedThreadId}
              initialDraft={initialDraft}
              draftLeadId={draftLeadId}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Sélectionnez un fil de discussion
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
