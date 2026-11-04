import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronRight, MessageSquare } from 'lucide-react';
import { SettingRow } from '../../components/ui/SettingToggle';
import { useAuth } from '../../context/AuthContext';
import { ContactDialog } from './ContactDialog';

/** Profile's "Send feedback" row (the "Help & feedback" group) — the mobile route to the owner. */
export function SendFeedbackRow({ divided = false }: { divided?: boolean }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { pathname } = useLocation();
  return (
    <>
      <SettingRow
        icon={<MessageSquare size={16} />}
        label="Send feedback"
        description="Report a bug, question a mark or suggest an idea"
        onClick={() => setOpen(true)}
        divided={divided}
        testId="profile-send-feedback"
        trailing={<ChevronRight size={16} className="text-ink-subtle" aria-hidden="true" />}
      />
      <ContactDialog open={open} onClose={() => setOpen(false)} defaultEmail={user?.email} route={pathname} />
    </>
  );
}
