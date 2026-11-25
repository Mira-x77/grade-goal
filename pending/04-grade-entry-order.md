# 4. Grade entry order fix

**Type:** bug
**Status:** Open — symptoms not captured yet

## What we know

Grade/mark entries are not shown in the order the student expects. The ordering
logic is in the grading and home-screen code (marks, coefficients, averages).

## To capture before starting

- [ ] Where does it show: the subject list, the marks list, the average card, or
      the PDF/term summary?
- [ ] What order appears now? (by date entered, by subject, by coefficient,
      newest first…)
- [ ] What order is expected?
- [ ] Does it change after editing an existing mark, or only after adding one?
- [ ] Screenshot of the wrong order with the expected order written beside it

## Things to check in code

1. Sort key used when the list is built (date vs `createdAt` vs array index).
2. Whether a new mark is appended and never re-sorted.
3. Whether edits keep the original position instead of moving the row.
4. Whether the order differs between the in-memory list and what is read back
   from IndexedDB / Supabase (server returns unordered rows).

## Done when

- [ ] The list order is deterministic and matches the documented rule
- [ ] Adding, editing and deleting a mark all preserve that order
- [ ] Same order after an app restart and after a sync
- [ ] Ordering rule written down in this file once agreed

## Notes

Decide the rule explicitly (e.g. newest first) before changing code, otherwise
the fix will flip back later.
