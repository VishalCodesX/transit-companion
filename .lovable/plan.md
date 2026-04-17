
The user is asking about their **current** Firestore rules (the default test-mode rules that expire after 30 days) and what they should change for production. This is a research/advisory question — no code changes needed in the Lovable codebase. The proper production rules already exist in `firestore.rules` in the project from earlier work.

I'll give them:
1. Confirmation that yes, those are dangerous test-mode rules
2. The exact production rules to paste into Firebase Console (matching the spec + their schema)
3. Step-by-step instructions to deploy
