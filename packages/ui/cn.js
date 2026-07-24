/** Shared cn() for @passage/ui components */
function cn(...inputs) {
  // Lightweight merge without hard deps at package level —
  // apps should pass className; we filter falsy.
  return inputs.flat().filter(Boolean).join(" ");
}

module.exports = { cn };
