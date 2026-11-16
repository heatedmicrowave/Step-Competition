# Sign-in email: link + code

The app signs people in with the link in the email, or with the code from the same email
(for when a mail app uses up the link, or the email is opened on another device).

Supabase only puts the code in the email if the template asks for it. In Supabase:
Authentication -> Emails (Templates). Do this for BOTH "Magic Link" and "Confirm signup".

Subject: `Your Pass1 sign-in`

Body (replace everything):

```html
<h2>Sign in to Pass1</h2>
<p><a href="{{ .ConfirmationURL }}">Tap here to sign in</a></p>
<p>Or type this code in the app: <b style="font-size:22px;letter-spacing:3px">{{ .Token }}</b></p>
```
