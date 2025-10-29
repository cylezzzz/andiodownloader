// ANDIO Addon: bypass
// Auto-generated via Wizard
// Beschreibung: keine paywalls umgehen. nur diese passwortgeschützen weil man freundschaften schließen soll

module.exports = {
  name: "bypass",
  version: "1.0.0",
  active: true,
  run: async (args) => {
    console.log("[bypass] läuft mit", args);
    return { ok: true, message: "Addon bypass erfolgreich ausgeführt." };
  }
};