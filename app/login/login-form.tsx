'use client';

import { useActionState } from 'react';

import { login } from '@/app/lib/auth-actions';

const inputClassName =
  'border border-slate-300 bg-white px-3 py-2 font-normal text-slate-900 focus:border-teal-700 focus:outline-none';

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form
      action={action}
      className='flex w-full max-w-sm flex-col gap-4 border border-slate-200 bg-white p-6 shadow-sm'
    >
      <label className='flex flex-col gap-1 text-sm font-semibold text-slate-700'>
        E-mail
        <input
          className={inputClassName}
          name='email'
          type='email'
          autoComplete='email'
          maxLength={254}
          required
        />
      </label>
      <label className='flex flex-col gap-1 text-sm font-semibold text-slate-700'>
        Senha
        <input
          className={inputClassName}
          name='password'
          type='password'
          autoComplete='current-password'
          maxLength={128}
          required
        />
      </label>
      {state?.error && (
        <p className='border border-red-200 bg-red-50 p-3 text-sm text-red-700' role='alert'>
          {state.error}
        </p>
      )}
      <button
        className='bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60'
        type='submit'
        disabled={pending}
      >
        {pending ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}