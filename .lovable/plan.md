
The user wants a checklist of what they need to do on their end to complete TransitIQ. This is a status/handoff question, not an implementation task — but the spec asked me to flag missing setup. Let me give a concise, organized checklist.

Based on the codebase:
- Firebase config is hardcoded (transitiq-11) — works out of the box
- Google Maps key is optional (stub fallback exists)
- Firestore rules exist in `firestore.rules` but must be deployed
- Auth providers must be enabled in Firebase console
- Authorized domains must include the Lovable preview/published domain
- Demo seed must be triggered manually
