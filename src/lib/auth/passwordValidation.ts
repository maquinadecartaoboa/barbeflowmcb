export interface PasswordValidation {
  hasMinLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  hasNoEdgeSpaces: boolean;
  isValid: boolean;
}

export function validatePassword(password: string): PasswordValidation {
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasNoEdgeSpaces = password.length > 0 && password === password.trim();

  return {
    hasMinLength,
    hasLetter,
    hasNumber,
    hasNoEdgeSpaces,
    isValid: hasMinLength && hasLetter && hasNumber && hasNoEdgeSpaces,
  };
}
