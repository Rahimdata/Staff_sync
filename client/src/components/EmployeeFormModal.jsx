import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { ROLE_LABELS } from '../utils/roles';
import Modal from './Modal';

const ROLE_OPTIONS = ['EMPLOYEE', 'MANAGER', 'HR'];

// managerId arrives populated ({ _id, name }) from the list endpoint and as a plain id elsewhere.
const idOf = (m) => (m && typeof m === 'object' ? m._id : m) || '';

function EmployeeForm({ employee, managers, currentUserId, onClose, onSaved }) {
  const editing = !!employee;
  const isSelf = editing && employee._id === currentUserId;

  const [form, setForm] = useState({
    name: employee?.name ?? '',
    email: employee?.email ?? '',
    password: '',
    role: employee?.role ?? 'EMPLOYEE',
    department: employee?.department ?? '',
    designation: employee?.designation ?? '',
    managerId: idOf(employee?.managerId),
    dateOfJoining: employee?.dateOfJoining ? employee.dateOfJoining.slice(0, 10) : '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const validate = () => {
    if (!form.name.trim()) return 'Enter the employee’s name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return 'Enter a valid email address.';
    if (!editing && form.password.length < 8) return 'The password needs at least 8 characters.';
    if (!form.department.trim() || !form.designation.trim()) return 'Add a department and a designation.';
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      if (editing) {
        // Send only what changed, so an untouched form doesn't trigger a "nothing to update" error.
        const changes = {};
        if (form.name.trim() !== employee.name) changes.name = form.name.trim();
        if (form.email.trim().toLowerCase() !== employee.email) changes.email = form.email.trim();
        if (form.department.trim() !== (employee.department ?? '')) changes.department = form.department.trim();
        if (form.designation.trim() !== (employee.designation ?? '')) changes.designation = form.designation.trim();
        if (form.role !== employee.role) changes.role = form.role;
        if (form.managerId !== idOf(employee.managerId)) changes.managerId = form.managerId || null;
        if (form.dateOfJoining && form.dateOfJoining !== (employee.dateOfJoining ?? '').slice(0, 10)) changes.dateOfJoining = form.dateOfJoining;

        if (Object.keys(changes).length === 0) {
          onClose();
          return;
        }
        const { data } = await api.put(`/users/${employee._id}`, changes);
        onSaved(data.user, 'edit');
      } else {
        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          department: form.department.trim(),
          designation: form.designation.trim(),
        };
        if (form.managerId) payload.managerId = form.managerId;
        if (form.dateOfJoining) payload.dateOfJoining = form.dateOfJoining;
        const { data } = await api.post('/auth/register', payload);
        onSaved(data.user, 'create');
      }
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save. Try again.'));
      setSubmitting(false);
    }
  };

  const managerChoices = managers.filter((m) => m._id !== employee?._id);

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="alert alert--error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="field-row">
        <div className="field">
          <label className="field__label" htmlFor="empName">
            Full name
          </label>
          <input id="empName" className="input input--plain" value={form.name} onChange={set('name')} disabled={submitting} autoFocus />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="empEmail">
            Work email
          </label>
          <input id="empEmail" type="email" className="input input--plain" value={form.email} onChange={set('email')} disabled={submitting} autoComplete="off" />
        </div>
      </div>

      {!editing && (
        <div className="field">
          <label className="field__label" htmlFor="empPassword">
            Temporary password
          </label>
          <input id="empPassword" type="password" className="input input--plain" value={form.password} onChange={set('password')} disabled={submitting} autoComplete="new-password" />
          <span className="field__count">At least 8 characters</span>
        </div>
      )}

      <div className="field-row">
        <div className="field">
          <label className="field__label" htmlFor="empRole">
            Role
          </label>
          <select id="empRole" className="input input--plain" value={form.role} onChange={set('role')} disabled={submitting || isSelf}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          {isSelf && <span className="field__count">You can’t change your own role</span>}
        </div>
        <div className="field">
          <label className="field__label" htmlFor="empManager">
            Reports to
          </label>
          <select id="empManager" className="input input--plain" value={form.managerId} onChange={set('managerId')} disabled={submitting}>
            <option value="">No manager</option>
            {managerChoices.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label className="field__label" htmlFor="empDept">
            Department
          </label>
          <input id="empDept" className="input input--plain" value={form.department} onChange={set('department')} disabled={submitting} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="empDesig">
            Designation
          </label>
          <input id="empDesig" className="input input--plain" value={form.designation} onChange={set('designation')} disabled={submitting} />
        </div>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="empJoin">
          Date of joining <span className="muted">(optional)</span>
        </label>
        <input id="empJoin" type="date" className="input input--plain" value={form.dateOfJoining} onChange={set('dateOfJoining')} disabled={submitting} />
      </div>

      <div className="modal__foot">
        <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 size={17} className="spin" />
              Saving
            </>
          ) : editing ? (
            'Save changes'
          ) : (
            'Add employee'
          )}
        </button>
      </div>
    </form>
  );
}

/**
 * Add (employee = null) or edit an employee.
 * @param {{ open: boolean, employee: object|null, managers: object[], currentUserId: string, onClose: () => void, onSaved: (user: object, mode: 'create'|'edit') => void }} props
 */
export default function EmployeeFormModal({ open, employee, managers, currentUserId, onClose, onSaved }) {
  return (
    <Modal open={open} title={employee ? 'Edit employee' : 'Add employee'} onClose={onClose} width={560}>
      <EmployeeForm employee={employee} managers={managers} currentUserId={currentUserId} onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}