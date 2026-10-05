# Notif6 Recipients

A small web page (GitHub Pages) to view and change the Genesys Cloud Data Table **Notif6_Recipients**,
the list of people who get the "call waiting too long" notifications (SMS, WhatsApp, desktop chat, e-mail).

**Address:** https://libermany.github.io/BEZEQ/notif6-recipients/

## What it does
- Shows **all fields of every recipient on one screen**, one line per recipient.
- Edit any field in place; changed lines are highlighted. **Save changes** writes only the changed lines.
- **+ Add line**: the key is numbered automatically (highest key + 1).
- Tick one or more lines and **Delete selected**. The remaining lines are then **renumbered 1..N**, because the
  Notification workflow reads the keys 1, 2, 3 ... and stops at the first missing key.
- Checks phone numbers (`+972501234567`, no spaces), the user id (UUID) and e-mail addresses before saving.

## Sign-in and security
- Sign-in is Genesys Cloud **Authorization Code + PKCE**. The page holds **no secret**. It only contains the
  public client id of the OAuth client `Notif6_RecipientsApp` and the id of the data table.
- The signed-in person needs permission to **view and edit Architect data table rows**. Everything the page does is
  done with that person's own rights; the token lives only in the browser tab (`sessionStorage`).
- The page can be opened by anyone, but without a Genesys sign-in with those permissions it shows nothing.

## OAuth client (already created)
| Setting | Value |
|---|---|
| Name | `Notif6_RecipientsApp` |
| Grant | Code Authorization (PKCE, no client secret used) |
| Redirect URI | `https://libermany.github.io/BEZEQ/notif6-recipients/` (must match exactly) |
| Scopes | `architect`, `user-basic-info` |
| Token lifetime | 28800 sec (8 hours) |

## Change the table or the client
Edit the `CFG` block at the top of the script in `index.html`: `region`, `clientId`, `tableId`.

## Related
- PowerShell: `Manage-NotifRecipients.ps1` (List / Add / Change / Remove / Renumber with the same automatic key).
- The table columns: key, Name, Enabled, SendSMS, SendWA, SendDesktop, SendEmail, SmsTo, SmsFrom, WaTo, WaFrom,
  WaTemplateResponseId, UserId, EmailTo.
