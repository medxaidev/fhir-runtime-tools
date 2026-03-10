import { useModal } from '@prismui/react';

export function ConfirmModal() {
  const { close } = useModal();

  return (
    <div className="modal-overlay" onClick={() => close('confirm')}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Confirm Action</h3>
        <p>Are you sure you want to proceed? This action will be recorded in the audit trail.</p>
        <div className="modal-actions">
          <button className="btn" onClick={() => close('confirm')}>Cancel</button>
          <button className="btn btn--primary" onClick={() => close('confirm')}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
