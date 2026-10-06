# Story: Search the quack feed

## Who, what, why

**As** a signed-in Quacker user who remembers a post I saw earlier,
**I want** to type a word from it or its author's name and see only the quacks that match,
**so that** I can find that post again without scrolling through the whole feed.

People keep telling us they can't find a post they saw last week. This is a deliberately small first version. The goal is to find out whether people search at all, not to build full-text search.

## Decisions

All decisions below have been confirmed with the product owner.

| Topic               | Decision                                                                                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What is searched    | Quack text, the author's display name, and the author's @username. Mood is not searched.                                                                       |
| Several words       | Every word must match. Each word can match the text, the name or the username, in any order.                                                                   |
| Matching            | Matching ignores case and also matches part of a word (`duck` matches "Ducks"). Accents must match exactly: `kachna` does not find "káchna".                   |
| Leading `@`         | A leading `@` is stripped from a word, so `@DeepDuckThoughts` matches the username.                                                                            |
| When results update | As you type, about 300 ms after the user stops typing. There is no submit button.                                                                              |
| Where               | Only the `/quacks` feed page.                                                                                                                                  |
| URL                 | The query lives in the URL (`/quacks?q=crumb`). Refresh, Back and shared links keep the search.                                                                |
| Order               | Newest first, the same as the feed.                                                                                                                            |
| Post form           | The form stays visible while searching. A new post appears in the results only if it matches the current query. Otherwise it shows once the search is cleared. |
| Query length        | The query can be at most 100 characters.                                                                                                                       |
| Measuring use       | Search runs on the backend. Each search writes one structured log line. Nothing is stored in the database.                                                     |

## Out of scope

- Highlighting the matched words
- Ignoring accents (Postgres `unaccent`), stemming, ranking by relevance, typo tolerance
- Searching by date or mood, and filters in general
- Clicking an author to search for their posts
- Paging and infinite scroll (the feed has none today either)
- A search page of its own, search in the header, or search on the landing page
- An analytics tool or a database table for search events

## Acceptance criteria

Each criterion can be checked in the browser on `/quacks` while signed in, and has a yes or no answer.

**The search input**

1. Above the list there is a text input with the visible label "Search quacks" and the placeholder "e.g. pond or @CaffeinatedDuck".
2. There is no Search button. The list updates while typing, without pressing Enter.
3. The input won't take more than 100 characters.

**Matching**

4. Typing a word that appears in a quack's text shows that quack. Quacks that don't contain the word disappear.
5. Typing part of an author's display name, e.g. `caffein`, shows only that author's quacks.
6. Typing an author's username with or without `@` (`@CaffeinatedDuck` or `CaffeinatedDuck`) shows only that author's quacks.
7. Case doesn't matter: `POND` and `pond` give the same results.
8. With two words, e.g. an author's name plus a word from one of their quacks, only quacks that match **both** are shown.
9. Results stay newest first.

**URL and navigation**

10. After typing `pond`, the address bar shows `/quacks?q=pond`.
11. Reloading that page shows `pond` in the input and the same filtered results.
12. Opening `/quacks?q=pond` directly in a new tab shows the same filtered results.

**Clearing**

13. A clear button (×) appears only when the input has text. Screen readers announce it as "Clear search".
14. Clicking it empties the input, removes `?q=` from the URL and shows the full feed.
15. Deleting the text by hand also shows the full feed again.

**Posting while searching**

16. While a search is active, posting a quack that matches the query adds it to the top of the results.
17. Posting a quack that does not match clears the form, but the quack is not shown. After clearing the search it is at the top of the feed.

## When there's nothing to show

18. **No matches.** When the query matches nothing, the list area shows _No quacks match "‹query›"._ It is not a blank area. The input still has the query, and the clear button works.
19. **Empty query.** An empty query, only spaces, or only `@` shows the full feed. No "no matches" message appears.
20. **No quacks at all.** With no search and an empty database, the existing _No quacks yet. Post the first one._ message still appears.
21. **Loading.** While the next results load, the previous results stay visible, so the list doesn't go blank. On the first load of the page, the existing spinner shows.
22. **Error.** If the search request fails (e.g. DevTools set to _Offline_), the list shows the existing error alert with a Reload button. Reloading after going back online shows the results for the same query.

## Technical notes

**Backend** (covered by unit tests in `quacks.service.spec.ts`, since none of this is visible in the browser)

- `GET /api/quacks` accepts an optional `q` query param, validated by a DTO (`@IsOptional() @IsString() @MaxLength(100)`) and documented in Swagger. A longer `q` returns `400`.
- The service splits `q` on whitespace, strips one leading `@` from each word, and drops empty words. If no words are left, it returns the full feed and logs nothing.
- The repository uses a Prisma `where: { AND: words.map(w => ({ OR: [text contains w, user.name contains w, user.username contains w] })) }` with `mode: 'insensitive'`. No new index is needed at this size.
- Each non-empty search logs via Nest `Logger`: `{ event: 'quack_search', userId, query, resultCount }`.

**Frontend**

- `quackKeys` and `quacksQueryOptions` take an optional `q`, so each query is cached separately. `addQuack` keeps invalidating all quack lists.
- The `q` search param is validated with zod on the `/_ProtectedPages/quacks` route. The input is debounced at 300 ms before the URL is updated.
- `placeholderData: keepPreviousData` keeps the previous results visible while the next ones load.
- `QuackList` gets a "no matches" empty state, separate from "No quacks yet".
- Use the kit `Input`, `Label` and `Button` (ghost, icon-only with `aria-label`). Follow `DESIGN.md`: no shadow on the input, no card around the search.
- Tests: the no-match empty state in `QuackList.test.tsx`, plus a test for clearing the search.

## How we'll read the result

After two weeks, count the `quack_search` log lines: the number of searches, the number of distinct users who searched, and the share of searches with `resultCount = 0`. Many zero-result searches would point to what to build next (accent folding or typo tolerance).
