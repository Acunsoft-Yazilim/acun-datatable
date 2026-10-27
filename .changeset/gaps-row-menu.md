---
"@acunsoft/datatable-dom": patch
---

A row's "⋮" menu opens whole: it was cut off by the table's scroll box on the last rows and by the cards on phones. Open, it is fixed over the page below its button (above when there is no room below), kept inside the window, and follows the button while the page or the table scrolls. `placeMenu()` does this for `.adt-row-menu`, so React and Vue get it too; styles.css has the new rule.
