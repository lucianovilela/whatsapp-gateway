"use server";

import { redirect } from "next/navigation";

import { isValidPassword, parseCredentials } from "@/app/lib/credentials";
import { hashPassword, verifyPassword } from "@/app/lib/password";
import { prisma } from "@/app/lib/prisma";
import { createSession, deleteSession, verifySession } from "@/app/lib/session";

export type FormState = { error?: string; success?: string } | undefined;

export async function login(_state: FormState, formData: FormData): Promise<FormState> {
  const credentials = parseCredentials({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!credentials) {
    return { error: "Credenciais inválidas." };
  }

  const user = await prisma.user.findUnique({
    where: { email: credentials.email },
    select: { id: true, passwordHash: true, tokenVersion: true },
  });
  const isValid = await verifyPassword(credentials.password, user?.passwordHash ?? null);

  if (!user || !isValid) {
    return { error: "Credenciais inválidas." };
  }

  await createSession(user.id, user.tokenVersion);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

export async function changePassword(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const sessionUser = await verifySession();
  const currentPassword = formData.get("currentPassword");
  const newPassword = formData.get("newPassword");
  const confirmPassword = formData.get("confirmPassword");

  if (!isValidPassword(currentPassword)) {
    return { error: "Senha atual incorreta." };
  }

  if (!isValidPassword(newPassword)) {
    return { error: "A nova senha deve ter entre 8 e 128 caracteres." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "A confirmação não confere com a nova senha." };
  }

  if (newPassword === currentPassword) {
    return { error: "A nova senha deve ser diferente da atual." };
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { passwordHash: true },
  });

  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    return { error: "Senha atual incorreta." };
  }

  const { tokenVersion } = await prisma.user.update({
    where: { id: sessionUser.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      tokenVersion: { increment: 1 },
    },
    select: { tokenVersion: true },
  });

  await createSession(sessionUser.id, tokenVersion);

  return { success: "Senha alterada com sucesso." };
}