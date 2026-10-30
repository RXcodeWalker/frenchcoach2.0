import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

interface Props {
  open: boolean;
  /** Questions already answered this session (skips don't count). */
  answered: number;
  onStay: () => void;
  onLeave: () => void;
}

/**
 * Asked when Escape is pressed mid-session. "Keep practising" comes first so it takes
 * focus (Modal focuses the first control): Enter/Space on the dialog never leaves by
 * accident, and Escape again simply closes it.
 */
export function LeaveSessionDialog({ open, answered, onStay, onLeave }: Props) {
  return (
    <Modal
      open={open}
      onClose={onStay}
      title="Leave this session?"
      footer={
        <>
          <Button variant="primary" onClick={onStay}>Keep practising</Button>
          <Button variant="quiet" onClick={onLeave}>Leave session</Button>
        </>
      }
    >
      <p className="text-[15px] leading-snug text-ink-muted">
        {answered > 0
          ? `You'll see a summary of the ${answered} question${answered === 1 ? '' : 's'} you've answered.`
          : "You haven't answered anything yet, so nothing will be saved."}
      </p>
    </Modal>
  );
}
