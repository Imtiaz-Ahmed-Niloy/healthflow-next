import type { Locale } from "./config";
import type { Messages } from "./messages";

// Types every t("…") call: a key that isn't in the English messages is a
// typecheck error, not a raw key on screen.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
