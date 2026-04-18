
The error is clear from network logs: Firestore returns `PERMISSION_DENIED` when the seed script tries to write user docs. The user already replaced the default test rules with the production rules I gave them — but the production rules require the writer to ALREADY be an admin (`isRole('admin')`) to create other users' docs. The seed runs from an unauthenticated/non-admin context, so it's blocked.

Two fix paths:
1. **Temporary**: Revert to permissive rules, seed, then redeploy strict rules. Simple but manual.
2. **Better**: Update the seed to create each Auth user, then sign in as that user to write their own `users/{uid}` doc (allowed by `request.auth.uid == uid`). For buses/notifications, sign in as the admin (created first) before writing those.

Path 2 is fully automated and works with strict production rules. That's what I'll plan.

## Plan

Update `src/utils/seedDatabase.ts` so it works with strict production rules:

1. For each user (admin, drivers, students):
   - `createUserWithEmailAndPassword` (this auto-signs them in)
   - Immediately write `users/{uid}` doc — allowed because `request.auth.uid == uid`
2. After all users created, `signIn` as the admin
3. As admin, write the 3 bus documents — allowed because `isRole('admin')`
4. Sign out at the end

Also: surface clearer error messages in the toast so future permission issues are obvious.

No rules change needed. User keeps the strict production rules deployed.

## Files to edit
- `src/utils/seedDatabase.ts` — restructure write order + sign in as admin before bus writes

## Acceptance
- Click "Initialize Demo Data" with strict rules deployed → all users + buses created without errors
- Final state: signed out, ready to log in as any seeded account
