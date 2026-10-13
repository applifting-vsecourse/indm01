# Story: Polls on quacks

## Who, what, why

**As** a signed-in Quacker user who wants the group to decide something (where do we go for lunch?),
**I want** to post a question with a few answers that everyone else can pick from,
**so that** I can see how many people chose each answer without counting replies by hand.

Today people ask in a post and count the replies themselves. Someone always gets the numbers wrong, and the question gets buried under the replies. This is a small first version. The goal is to see whether people use polls at all.

## Decisions

All decisions below have been confirmed with the product owner.

| Topic                | Decision                                                                                                                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| What a poll is       | A poll is attached to a quack. The quack text is the question. A poll quack appears in the feed like any other quack and can have a mood.                                                                                                                                |
| Answers              | 2 to 4 answers, each 1 to 50 characters after trimming. Two answers can't have the same text (case and surrounding spaces are ignored).                                                                                                                                  |
| Deadline             | The author picks how long the poll is open: 1 hour, 1 day (preselected) or 1 week. After that, voting is closed for good. There is no other way to close a poll.                                                                                                         |
| Who can vote         | Every signed-in user except the author.                                                                                                                                                                                                                                  |
| One person, one vote | Each person has at most one vote per poll. Clicking another answer moves the vote there. Clicking your current answer removes your vote.                                                                                                                                 |
| Counts               | Everyone sees the counts at all times, including before voting. Each answer shows a bar, the count and a whole-number percentage. The total number of votes is shown below the answers.                                                                                  |
| Anonymity            | Only counts are shown. Nobody can see who voted for what. You can see which answer you picked (✓).                                                                                                                                                                       |
| Feels instant        | A vote shows up immediately, before the server answers.                                                                                                                                                                                                                  |
| Failed vote          | If the server doesn't accept the vote, the poll goes back to how it was and a message appears under that poll. The message goes away on the next vote attempt.                                                                                                           |
| Other people's votes | The feed refetches every 15 seconds while the tab is visible, and also when you come back to the tab and after you vote. The counts shown always come from the server. There are no live pushes.                                                                         |
| Closing on screen    | The poll switches to closed exactly at its deadline, without waiting for a refetch. The server rejects late votes in any case.                                                                                                                                           |
| Closed poll          | Shows the final bars and counts, and the answers are no longer buttons. The answer(s) with the most votes are bold with a trophy icon. All tied leaders are highlighted. With zero votes, nothing is highlighted.                                                        |
| Time left            | Shown in the largest unit that fits, rounded up: up to 60 minutes `N min`, up to 24 hours `N h`, beyond that `N d`. With only seconds left it reads `1 min`. A fresh 1-hour poll reads `Closes in 60 min`, a 1-day poll `Closes in 24 h`, a 1-week poll `Closes in 7 d`. |
| Search               | Feed search also matches poll answer text. Searching `pizza` finds a poll with a "Pizza" answer.                                                                                                                                                                         |
| Editing              | Quacks can't be edited or deleted today, so polls can't either. Question, answers and deadline are fixed once posted.                                                                                                                                                    |
| Measuring use        | Polls and votes are in the database anyway. Usage is read with SQL after two weeks. No log events or analytics.                                                                                                                                                          |

## Out of scope

- Live updates over websockets or SSE
- Seeing who voted, or voter lists per answer
- Closing a poll early, extending it, or a custom deadline with a date picker
- Editing or deleting a poll, its answers or its votes
- Choosing several answers (multiple choice), ranked voting, or "other" with free text
- Notifications ("your poll closed", "someone voted")
- Polls outside the `/quacks` feed (separate page, header, landing page)
- Filtering the feed to polls only

## Acceptance criteria

Each criterion can be checked in the browser on `/quacks`. Some need two signed-in users (e.g. two browsers or a private window). Each has a yes or no answer.

**Creating a poll**

1. Under the quack text field there is an "Add poll" button. Clicking it shows two empty answer inputs labelled "Answer 1" and "Answer 2", and a "Poll length" select with 1 hour, 1 day and 1 week. 1 day is preselected.
2. An "Add answer" button adds a third and then a fourth input. With four answers, the button is gone.
3. With more than two answers, each answer input has a remove button (×) that screen readers announce as "Remove answer N". With exactly two, there are no remove buttons.
4. A "Remove poll" button hides the poll fields, and the quack posts as a plain quack.
5. Submitting with an empty answer shows "Fill in this answer" under that input. Nothing is posted.
6. An answer input won't take more than 50 characters.
7. Two answers with the same text (e.g. "Pizza" and " pizza ") show "Answers must be different" under the second one. Nothing is posted.
8. A valid poll posts. It appears at the top of the feed, and the form goes back to a plain empty quack form.

**Seeing a poll**

9. A poll quack shows the question (the quack text), then each answer as a full-width row with a bar, the answer text, the count and the percentage, e.g. `Pizza 5 · 50%`.
10. Below the answers, the footer shows the total and the time left, e.g. `10 votes · Closes in 3 h`. The time left follows the "Time left" decision (e.g. `Closes in 45 min`, `Closes in 3 h`, `Closes in 6 d`), and the footer shows `1 vote` in the singular.
11. Percentages are whole numbers, and a poll with 0 votes shows `0 · 0%` on every answer.

**Voting (as someone other than the author)**

12. Clicking an answer immediately shows ✓ on it, adds one to its count and updates all percentages and the total. There is no visible wait.
13. After voting, the footer also shows _Click your answer again to remove your vote._
14. Clicking a different answer moves the ✓ there. The old answer loses one, the new one gains one, and the total stays the same.
15. Clicking the ✓ answer again removes the vote. Its count drops by one, the total drops by one and the hint disappears.
16. Reloading the page keeps your vote and shows the same counts.
17. A second user who votes on the same poll sees their vote counted. Within about 15 seconds, the first user sees it too without reloading.
18. Two users voting at the same time each count once. After both reloads, the totals are identical in both browsers.

**Author**

19. On their own poll, the author sees the bars, counts and countdown. The answers are not clickable, and there is no vote hint.

**Failed vote**

20. With DevTools set to _Offline_, clicking an answer shows the vote briefly. It then goes back to the previous state, and the message _Your vote didn't go through. Try again._ appears under that poll.
21. Going back online and clicking again removes the message, and the vote goes through.

**Closing**

22. When the deadline passes with the page open, the poll switches to closed at that moment, without a reload. The answers are no longer buttons, and the footer reads `10 votes · Closed`.
23. In a closed poll, the answer with the most votes is bold with a trophy icon that screen readers announce as "Winner".
24. When two answers tie for the most votes, both are highlighted.
25. A closed poll with no votes highlights nothing, and its footer reads `No votes · Closed`.
26. Your own pick keeps its ✓ after the poll closes.
27. If a vote reaches the server after the deadline (e.g. the clock on the computer is wrong), the poll goes back to its previous state, shows _This poll has closed._ and switches to closed.

**Search**

28. Searching a word that appears only in a poll answer (e.g. `pizza`) shows that poll quack.

**Accessibility**

29. Each answer button announces its text, count and percentage, and whether it is selected (`aria-pressed`). The bars themselves are not announced.
30. The failed-vote message is announced by screen readers when it appears.

## Technical notes

**Data model** (one migration via `pnpm backend prisma:migrations:run`)

- `Poll`: `id`, `quackId` (unique, cascade delete), `closesAt`, `createdAt`.
- `PollAnswer`: `id`, `pollId` (cascade), `text` (`VarChar(50)`), `position`.
- `PollVote`: `id`, `pollId`, `answerId`, `userId` (all cascade), `createdAt`, `updatedAt`, with `@@unique([pollId, userId])`. The database enforces one vote per person per poll.
- Counts are never stored. They are always computed from `PollVote` rows (`groupBy answerId` / `_count`), so they can't drift.
- The seed adds one open poll and one closed poll with a few votes from different seed users.

**Backend**

- `POST /api/quacks` accepts an optional `poll: { answers: string[], duration: '1h' | '1d' | '1w' }` using a nested DTO: `@ArrayMinSize(2) @ArrayMaxSize(4)`, each answer `@IsString() @IsNotEmpty() @MaxLength(50)` after trim, and `@IsIn` for the duration. The service rejects duplicate answers (case-insensitive, trimmed) with `400` and computes `closesAt = now + duration` on the server. The quack, poll and answers are created in one transaction.
- `PUT /api/quacks/:quackId/poll/vote` with body `{ answerId }` casts or moves the vote (upsert on `pollId + userId`). `DELETE /api/quacks/:quackId/poll/vote` removes it. Both are idempotent and take the voter from the session.
- Errors: `404` if there's no quack or poll, `400` if the answer is not in this poll, `403` if the voter is the author, `409` if `closesAt <= now` (body message "This poll has closed.").
- Both vote endpoints return the updated poll, so the client can reconcile with the exact server counts.
- `QuackResponseDto` gets `poll: { id, closesAt, isClosed, totalVotes, myAnswerId | null, answers: [{ id, text, votes }] } | null`. `isClosed` is decided by the server's clock. Answers are ordered by `position`, and `myAnswerId` is for the requesting user. Document everything in Swagger.
- Where this section and [`plan.md`](plan.md) differ in detail (file layout, mutation handling), `plan.md` is the more specific one.
- Search: add a fourth branch to the per-word `OR` in `QuackRepository.getQuacks`, `{ poll: { answers: { some: { text: { contains: word, mode: 'insensitive' } } } } }`, using the same `escapeLikePattern`. Run it once against the dev DB (see CLAUDE.md).
- Unit tests in `quacks.service.spec.ts` (or a new `polls.service.spec.ts`): duplicate answers are rejected, `closesAt` is computed from the duration, the author can't vote (403), a closed poll rejects votes (409), a vote moves or is removed, and an answer from another poll is rejected (400).

**Frontend**

- zod `pollSchema` in `quackSchemas.ts`. `addQuack` sends the optional poll.
- `QuackForm`: poll fields via react-hook-form `useFieldArray`, with the same rules in the zod schema (2–4 answers, 1–50 chars, unique after trim/lowercase). Use the kit `Input`, `Select`, `Button` (ghost, icon-only with `aria-label` for ×). Strip shadows per CLAUDE.md.
- `useVote` mutation:
  - `onMutate`: `cancelQueries` on the quack lists, snapshot, then optimistically update `myAnswerId`, counts and total in every cached quack list.
  - `onError`: restore the snapshot and set the per-poll error message. A `409` uses "This poll has closed." and also marks the poll closed.
  - `onSuccess` and `onSettled`: write the server's poll and invalidate the lists, but only for the last pending vote on that poll, so a queued click isn't overwritten.
  - `scope: { id: pollId }`, so rapid clicks run in order and the last click wins.
- The 15 s `refetchInterval` is set on the feed page (`refetchIntervalInBackground` stays `false`) and is switched off while a vote is pending, so a refetch can't bring back the old counts over an optimistic vote.
- `QuackPoll` component, rendered inside `QuackItem` with no card or border of its own (DESIGN.md: no nested cards).
  - Answers are `<button aria-pressed>` with a hairline border and `rounded-md`. The bar is an `aria-hidden` div with `bg-secondary` and a width from the percentage.
  - The trophy is a lucide icon with `aria-label="Winner"`. The error message uses `text-destructive` and `role="alert"`.
  - Closed is `isClosed` from the server, or the client clock passing `closesAt` (a timer set to the deadline flips the poll exactly then), or a `409` from a vote. The countdown re-renders once a minute.
- Tests: optimistic vote and rollback on error, move and remove vote, closed rendering with winner, ties and zero votes, author view, and form validation (empty answer, duplicates, add/remove answer limits).

## How we'll read the result

After two weeks, query the database for: the number of polls created, the number of distinct poll authors, the number of distinct voters, the median votes per poll, and the share of votes that were changed (`updatedAt > createdAt`). Few polls, or polls with only one or two votes, would say the feature isn't worth growing. Many changed votes would back the "let people change their minds" decision.
