/** Whether a free-text tag has been typed but not committed with Enter. */
export const hasUncommittedTag = (inputValue: string): boolean => inputValue.trim().length > 0;
