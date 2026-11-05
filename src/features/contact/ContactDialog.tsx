import { useEffect, useId, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Segmented } from '../../components/ui/Segmented';
import { TextField } from '../../components/auth/TextField';
import { InlineAlert } from '../../components/auth/InlineAlert';
import {
  FEEDBACK_MAX_CHARS,
  FEEDBACK_MIN_CHARS,
  contactEmail,
  isPlausibleEmail,
  sendFeedback,
  type FeedbackKind,
} from '../../services/contact/sendFeedback';
import { track } from '../../services/telemetry/telemetryService';

const KINDS: { id: FeedbackKind; label: string; prompt: string }[] = [
  { id: 'bug', label: 'Bug', prompt: 'What happened, and what did you expect instead?' },
  { id: 'marking', label: 'Marking', prompt: 'Which answer was marked wrongly, and why do you think so?' },
  { id: 'idea', label: 'Idea', prompt: 'What would make FrenchCoach more useful for you?' },
  { id: 'other', label: 'Other', prompt: 'What’s on your mind?' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  /** Prefilled reply address (the signed-in learner's email). */
  defaultEmail?: string | null;
  /** The page it is sent from (pathname only). */
  route?: string;
  defaultKind?: FeedbackKind;
}

type Status = 'idle' | 'sending' | 'sent' | 'rate_limited' | 'failed';

/**
 * "Send feedback": a message straight to the owner, from anywhere in the app.
 * Three choices only — what kind, what happened, where to reply — so it takes
 * under a minute. A draft survives closing the dialog (it is cleared only once
 * sent); Ctrl/Cmd+Enter sends.
 */
export function ContactDialog({ open, onClose, defaultEmail, route, defaultKind = 'bug' }: Props) {
  const messageId = useId();
  const [kind, setKind] = useState<FeedbackKind>(defaultKind);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [status, setStatus] = useState<Status>('idle');

  // A learner who signs in after the dialog first mounted gets their address filled in.
  useEffect(() => {
    if (defaultEmail && !email) setEmail(defaultEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultEmail]);

  // Re-opening after a send starts a fresh message.
  useEffect(() => {
    if (open && status === 'sent') {
      setStatus('idle');
      setMessage('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const trimmed = message.trim();
  const emailInvalid = email.trim() !== '' && !isPlausibleEmail(email);
  const canSend = trimmed.length >= FEEDBACK_MIN_CHARS && !emailInvalid && status !== 'sending';
  const fallbackEmail = contactEmail();
  const prompt = KINDS.find(k => k.id === kind)?.prompt ?? '';

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSend) return;
    setStatus('sending');
    const result = await sendFeedback({ kind, message, contactEmail: email, route });
    if (result.ok) {
      track({ name: 'feedback_sent', props: { kind, has_email: email.trim() !== '' } });
      setStatus('sent');
      return;
    }
    setStatus(result.reason === 'rate_limited' ? 'rate_limited' : 'failed');
  };

  const onMessageKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void submit();
    }
  };

  if (status === 'sent') {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Thank you"
        footer={<Button className="w-full" onClick={onClose}>Done</Button>}
      >
        <div data-testid="contact-sent" className="space-y-3">
          <InlineAlert tone="success">Your message has been sent.</InlineAlert>
          <p className="text-body-s text-ink-muted">
            {email.trim()
              ? <>Every message is read. If a reply is needed, it will go to <strong className="font-semibold text-ink">{email.trim()}</strong>.</>
              : 'Every message is read, and it genuinely shapes what gets built next.'}
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Send feedback"
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>Cancel</Button>
          <Button
            className="ml-auto"
            type="submit"
            form={`${messageId}-form`}
            disabled={!canSend}
            loading={status === 'sending'}
            data-testid="contact-send"
          >
            {status === 'sending' ? 'Sending…' : 'Send'}
          </Button>
        </>
      }
    >
      <form id={`${messageId}-form`} onSubmit={e => void submit(e)} className="space-y-4" data-testid="contact-dialog">
        <p className="text-body-s text-ink-muted">
          Found a bug, disagree with a mark, or have an idea? This goes straight to the person who builds FrenchCoach.
        </p>

        <Segmented<FeedbackKind>
          label="What is it about?"
          options={KINDS.map(({ id, label }) => ({ id, label }))}
          value={kind}
          onChange={setKind}
          testIdPrefix="contact-kind"
        />

        <div>
          <label htmlFor={messageId} className="mb-1.5 block text-label text-ink">Your message</label>
          <textarea
            id={messageId}
            value={message}
            onChange={e => setMessage(e.target.value.slice(0, FEEDBACK_MAX_CHARS))}
            onKeyDown={onMessageKeyDown}
            placeholder={prompt}
            rows={5}
            maxLength={FEEDBACK_MAX_CHARS}
            aria-describedby={`${messageId}-count`}
            data-testid="contact-message"
            className="w-full resize-y rounded-control border border-hairline-strong bg-surface px-3 py-2.5 text-[16px] text-ink
              placeholder:text-ink-subtle transition-colors duration-state ease-smooth hover:border-ink-subtle focus:border-action"
          />
          <p id={`${messageId}-count`} className="mt-1.5 flex justify-between text-label font-normal text-ink-subtle">
            <span>The page you’re on is included.</span>
            <span className="font-numeral">{message.length}/{FEEDBACK_MAX_CHARS}</span>
          </p>
        </div>

        <TextField
          label="Email for a reply (optional)"
          type="email"
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          error={emailInvalid ? 'That doesn’t look like an email address.' : null}
          data-testid="contact-email"
        />

        {status === 'rate_limited' && (
          <InlineAlert>You’ve sent a lot of messages today — thank you! Please try again tomorrow.</InlineAlert>
        )}
        {status === 'failed' && (
          <InlineAlert>
            Your message couldn’t be sent. Check your connection and try again
            {fallbackEmail ? <>, or email <a className="underline" href={`mailto:${fallbackEmail}`}>{fallbackEmail}</a></> : null}.
          </InlineAlert>
        )}

        {fallbackEmail && status !== 'failed' && (
          <p className="text-label font-normal text-ink-subtle">
            Prefer email? <a className="underline hover:text-ink-muted" href={`mailto:${fallbackEmail}`}>{fallbackEmail}</a>
          </p>
        )}
      </form>
    </Modal>
  );
}
