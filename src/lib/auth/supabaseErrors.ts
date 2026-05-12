interface AuthErrorLike {
  message?: string;
  code?: string;
}

export function translateSupabaseAuthError(error: AuthErrorLike | null | undefined): string {
  if (!error?.message) return "Ocorreu um erro inesperado. Tente novamente.";

  const msg = error.message;
  const lower = msg.toLowerCase();

  if (/password.*at least.*characters/i.test(msg)) {
    return "A senha precisa ter pelo menos 8 caracteres.";
  }
  if (/password.*contain.*character|password.*letters.*digits/i.test(msg)) {
    return "A senha precisa ter letras e números.";
  }
  if (/same.*as.*old|new password.*should.*be.*different/i.test(msg)) {
    return "A nova senha precisa ser diferente da senha atual.";
  }
  if (/token.*expired|token.*invalid|invalid.*token|otp.*expired|jwt.*expired/i.test(msg)) {
    return "Este link expirou ou já foi usado. Solicite uma nova redefinição de senha.";
  }
  if (/rate.*limit|too.*many.*requests/i.test(msg)) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
  }
  if (/email.*not.*found|user.*not.*found/i.test(msg)) {
    return "Não encontramos uma conta com esse e-mail.";
  }
  if (/invalid.*login.*credentials|invalid.*credentials/i.test(msg)) {
    return "E-mail ou senha incorretos.";
  }
  if (/email.*already.*registered|user.*already.*registered/i.test(msg)) {
    return "Já existe uma conta com esse e-mail.";
  }
  if (/network|fetch.*failed|failed to fetch/i.test(lower)) {
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  }

  return "Não foi possível concluir a operação. Tente novamente em alguns minutos.";
}
