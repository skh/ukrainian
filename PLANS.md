# Plans

## Taxonomy / learner's dictionary

### Goal
Turn the app into a full-fledged learner's dictionary-with-drills. Paper learner's dictionaries have hierarchical taxonomies / categories of words. Words can belong to one or more categories. Multiple taxonomy "trees" should be supported.

### End-state schema

```
taxonomy      id, name                          -- e.g. "Semantic fields", "Grammar"
category      id, taxonomy_id, parent_id?, name, position  -- self-referential tree node
word_category word_id, category_id              -- many-to-many membership
```

### Implementation phases

**Phase 1 — flat tags** (start here)
- `tag (id, name)` and `word_tag (word_id, tag_id)`
- No hierarchy, no taxonomy concept
- Add tag filter to drill select screen
- Phase 1 data migrates to Phase 2 with zero changes (rows just get `parent_id = null`)

**Phase 2 — add hierarchy**
- Add `parent_id nullable` to `tag` (rename to `category`)
- "All descendants" query: recursive CTE or in-memory tree walk (trees are small)
- Phase 2 data migrates to Phase 3 by creating one default taxonomy and back-filling the FK

**Phase 3 — multiple trees**
- Add `taxonomy (id, name)` and `taxonomy_id` on `category`
- Semantic fields and grammatical categories become separate trees

### Design notes
- Use **adjacency list** (`parent_id`), not nested sets or materialized paths — trees are small, whole taxonomy can be loaded into memory
- Word membership by convention goes on **leaf nodes only**; drilling by a parent means "all descendants that have members"
- Multiple memberships across trees are independent (e.g. "Food vocabulary" + "Perfective verbs" simultaneously)
- Add `position int` to `category` from Phase 2 onwards — reordering without it is painful later
