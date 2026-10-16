'use client';

import { useActionState } from 'react';

import { changePassword } from '@/app/lib/auth-actions';

const inputClassName =
  'border border-slate-300 bg-white px-3 py-2 font-normal text-slate-900 focus:border-teal-700 focus:outline-none';

const fields = [
  { name: 'currentPassword', label: 'Senha atual', autoComplete: 'current-password' },
  { name: 'newPassword', label: 'Nova senha', autoComplete: 'new-password' },
  { name: 'confirmPassword', label: 'Confirmar nova senha', autoComplete: 'new-password' },
];

export default function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);

  return (
    <form
      action={action}
      className='flex w-full max-w-sm flex-col gap-4 border border-slate-200 bg-white p-6 shadow-sm'
    >
      {fields.map((field) => (
        <label
          className='flex flex-col gap-1 text-sm font-semibold text-slate-700'
          key={field.name}
        >
          {field.label}
          <input
            className={inputClassName}
            name={field.name}
            type='password'
            autoComplete={field.autoComplete}
            minLength={field.name === 'currentPassword' ? undefined : 8}
            maxLength={128}
            required
          />
        </label>
      ))}
      {state?.error && (
        <p className='border border-red-200 bg-red-50 p-3 text-sm text-red-700' role='alert'>
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className='border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800' role='status'>
          {state.success}
        </p>
      )}
      <button
        className='bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60'
        type='submit'
        disabled={pending}
      >
        {pending ? 'Salvando...' : 'Alterar senha'}
      </button>
    </form>
  );
}