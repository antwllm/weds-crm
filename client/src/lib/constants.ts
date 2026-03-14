import type { LeadStatus, ActivityType } from '@/types';

// --- Pipeline stages ---

export interface PipelineStage {
  value: LeadStatus;
  label: string;
  color: string;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { value: 'nouveau', label: 'Nouveau', color: 'bg-blue-100 text-blue-800' },
  { value: 'contacte', label: 'Contact\u00e9', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'rdv', label: 'RDV', color: 'bg-purple-100 text-purple-800' },
  { value: 'devis_envoye', label: 'Devis envoy\u00e9', color: 'bg-orange-100 text-orange-800' },
  { value: 'signe', label: 'Sign\u00e9', color: 'bg-green-100 text-green-800' },
  { value: 'perdu', label: 'Perdu', color: 'bg-red-100 text-red-800' },
];

// --- Source badges ---

export const SOURCE_BADGES: Record<string, { label: string; color: string }> = {
  'mariages.net': { label: 'Mariages.net', color: 'bg-pink-100 text-pink-800' },
  'zankyou': { label: 'Zankyou.fr', color: 'bg-purple-100 text-purple-800' },
  'weds.fr': { label: 'weds.fr', color: 'bg-blue-100 text-blue-800' },
  'recommandation': { label: 'Recommandation', color: 'bg-green-100 text-green-800' },
  'instagram': { label: 'Instagram', color: 'bg-orange-100 text-orange-800' },
  'manuel': { label: 'Manuel', color: 'bg-gray-100 text-gray-800' },
};

// --- Activity type labels ---

export interface ActivityTypeInfo {
  label: string;
  color: string;
  icon: string;
}

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, ActivityTypeInfo> = {
  email_received: { label: 'Email re\u00e7u', color: 'text-blue-600', icon: 'Mail' },
  sms_sent: { label: 'SMS envoy\u00e9', color: 'text-green-600', icon: 'MessageSquare' },
  email_sent: { label: 'Email envoy\u00e9', color: 'text-indigo-600', icon: 'Send' },
  status_change: { label: 'Changement de statut', color: 'text-orange-600', icon: 'ArrowRight' },
  note_added: { label: 'Note ajout\u00e9e', color: 'text-gray-600', icon: 'StickyNote' },
  duplicate_inquiry: { label: 'Demande en double', color: 'text-yellow-600', icon: 'Copy' },
  notification_failed: { label: 'Notification \u00e9chou\u00e9e', color: 'text-red-600', icon: 'AlertTriangle' },
  pipedrive_synced: { label: 'Sync Pipedrive', color: 'text-purple-600', icon: 'RefreshCw' },
  whatsapp_sent: { label: 'WhatsApp envoye', color: 'text-green-600', icon: 'MessageCircle' },
  whatsapp_received: { label: 'WhatsApp recu', color: 'text-teal-600', icon: 'MessageCircle' },
};
