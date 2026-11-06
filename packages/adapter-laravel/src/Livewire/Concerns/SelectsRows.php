<?php

declare(strict_types=1);

namespace Acunsoft\DataTable\Laravel\Livewire\Concerns;

use Acunsoft\DataTable\Laravel\QueryApplier;
use Acunsoft\DataTable\Laravel\TableQuery;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\Builder as QueryBuilder;

/**
 * Row selection: single rows, ranges, the page, and every matching row.
 *
 * Which rows may be chosen: define `isSelectable($row): bool` on the
 * component (rows it refuses get no checkbox and are never part of the
 * selection: single rows, ranges, the page, `selectedQuery()`, bulk actions,
 * exports), and `selectableRows($query)` with the same rule in SQL for "all
 * matching" (without it, a table with `isSelectable()` does not offer "all
 * matching"). Both are optional; their parameter types are yours.
 *
 * @internal part of {@see \Acunsoft\DataTable\Laravel\Livewire\WithDataTable}; use that trait.
 */
trait SelectsRows
{
    protected function isSelected(string $key): bool
    {
        return $this->allMatching
            ? ! in_array($key, $this->excluded, true)
            : in_array($key, $this->selectedKeys(), true);
    }

    public function toggleRow(string|int $key): void
    {
        $key = (string) $key;
        if ($this->allMatching) {
            // Any key the browser sends: kept short and at most maxSelected(), as the selection is.
            $this->excluded = in_array($key, $this->excluded, true)
                ? array_values(array_diff($this->excluded, [$key]))
                : self::distinctKeys([...$this->excluded, $key], $this->maxSelected());

            return;
        }
        $selected = $this->selectedKeys();
        if (in_array($key, $selected, true)) {
            $this->selected = array_values(array_diff($selected, [$key]));
        } elseif (count($selected) < $this->maxSelected() && $this->selectableKeys([$key]) !== []) {
            $this->selected = [...$selected, $key];
        }
    }

    /**
     * Shift+click: select (`$select` true) or clear every row of the current
     * page from `$from` to `$to`, both included. Keys not on the page are ignored.
     */
    public function selectRange(string|int $from, string|int $to, bool $select = true): void
    {
        $page = $this->pageKeys();
        $start = array_search((string) $from, $page, true);
        $end = array_search((string) $to, $page, true);
        if ($start === false || $end === false) {
            return;
        }
        $selectable = $this->selectablePageKeys();
        $range = array_values(array_intersect(array_slice($page, min($start, $end), abs($end - $start) + 1), $selectable));
        if ($this->allMatching) {
            $this->excluded = $select
                ? array_values(array_diff($this->excluded, $range))
                : self::distinctKeys([...$this->excluded, ...$range], $this->maxSelected());

            return;
        }
        $selected = $this->selectedKeys();
        $this->selected = $select
            ? array_slice(array_values(array_unique([...$selected, ...$range])), 0, max(count($selected), $this->maxSelected()))
            : array_values(array_diff($selected, $range));
    }

    /** Select the (selectable) rows of the current page, or clear them when all are selected. */
    public function togglePage(): void
    {
        $keys = $this->selectablePageKeys();
        $all = $keys !== [] && array_reduce($keys, fn (bool $carry, string $key) => $carry && $this->isSelected($key), true);
        if ($this->allMatching) {
            $this->excluded = $all
                ? self::distinctKeys([...$this->excluded, ...$keys], $this->maxSelected())
                : array_values(array_diff($this->excluded, $keys));

            return;
        }
        $selected = $this->selectedKeys();
        $this->selected = $all
            ? array_values(array_diff($selected, $keys))
            : array_slice(array_values(array_unique([...$selected, ...$keys])), 0, $this->maxSelected());
    }

    /** 'none', 'some' or 'all' for the selectable rows on the current page. */
    protected function pageSelection(): string
    {
        $keys = $this->selectablePageKeys();
        $count = count(array_filter($keys, fn (string $key) => $this->isSelected($key)));

        return match (true) {
            $count === 0 => 'none',
            $count === count($keys) => 'all',
            default => 'some',
        };
    }

    public function selectAllMatching(): void
    {
        if (! $this->canSelectAllMatching()) {
            return;
        }
        $this->allMatching = true;
        $this->excluded = [];
        $this->selected = [];
    }

    public function clearSelection(): void
    {
        $this->allMatching = false;
        $this->excluded = [];
        $this->selected = [];
    }

    /** The selection size; for "all matching" a bounded count (see selectionSize()). */
    protected function selectedCount(): int
    {
        return $this->selectionSize()[0];
    }

    /** @return array{0: int, 1: bool} the selection size and whether it is exact */
    protected function selectionSize(): array
    {
        return $this->allMatching
            ? QueryApplier::count($this->selectionQuery(sorted: false), $this->countLimit(), $this->countTimeout())
            : [count($this->selectedKeys()), true];
    }

    /**
     * The selected rows as a query inside `query()`, for bulk actions:
     * `$this->selectedQuery()->update([...])` or `->get()`. In the table's
     * current order (its allowed sorting, the key last), so keys taken from
     * it come as on screen. Rows `isSelectable()` refuses are left out.
     * MySQL refuses `ORDER BY` in an `UPDATE`/`DELETE` with a join: call
     * `->reorder()` first there.
     */
    protected function selectedQuery(): EloquentBuilder|QueryBuilder
    {
        return $this->selectionQuery(sorted: true);
    }

    /** The selection as a query; unsorted for counts and exports, which order it themselves. */
    private function selectionQuery(bool $sorted): EloquentBuilder|QueryBuilder
    {
        $query = $sorted || $this->allMatching ? $this->dataTableQuery() : null;
        $sort = $query !== null && $sorted ? implode(',', array_map(fn (array $rule) => "{$rule['field']}:{$rule['direction']}", $query->sorting)) : '';
        if ($query !== null && $this->allMatching) {
            $matching = TableQuery::fromArray(['filters' => $this->wireFilters($query), 'search' => $query->search, 'sort' => $sort]);
            if ($query->searchKeys !== null) {
                $matching = $matching->withSearchKeys($query->searchKeys, $query->searchKeyColumn); // the engine's rows, as on screen
            }
            $builder = $this->onlySelectable(QueryApplier::apply($this->query(), $matching, $this->dataTableColumns(), $sorted ? $this->keyName() : null));

            return $this->excluded === [] ? $builder : $this->whereKeys($builder, $this->excluded, not: true);
        }
        $builder = $this->onlySelectable($this->whereKeys($this->query(), $this->selectableKeys($this->selectedKeys())));

        return $sorted ? QueryApplier::apply($builder, TableQuery::fromArray(['sort' => $sort]), $this->dataTableColumns(), $this->keyName()) : $builder;
    }

    /** Whether the component limits which rows may be chosen (`isSelectable()`). */
    private function hasSelectableRule(): bool
    {
        return method_exists($this, 'isSelectable');
    }

    /** "All matching" is offered unless only `isSelectable()` (no SQL `selectableRows()`) limits the rows. */
    protected function canSelectAllMatching(): bool
    {
        return ! $this->hasSelectableRule() || method_exists($this, 'selectableRows');
    }

    /** Whether one row on the page may be chosen (`isSelectable()`; every row without it). */
    protected function rowIsSelectable(mixed $row): bool
    {
        return ! $this->hasSelectableRule() || $this->isSelectable($row) === true;
    }

    /** @return list<string> the keys of the page's rows that may be chosen */
    protected function selectablePageKeys(): array
    {
        return array_values(array_map(fn ($row) => $this->rowKey($row), array_filter($this->rows->items(), fn ($row) => $this->rowIsSelectable($row))));
    }

    /**
     * Of these keys, those of rows inside `query()` that `isSelectable()`
     * accepts, in the given order (one query; nothing to look up without the rule).
     *
     * @param  list<string>  $keys
     * @return list<string>
     */
    private function selectableKeys(array $keys): array
    {
        if (! $this->hasSelectableRule() || $keys === []) {
            return $keys;
        }
        $allowed = [];
        foreach ($this->onlySelectable($this->whereKeys($this->query(), $keys))->get() as $row) {
            if ($this->isSelectable($row) === true) {
                $allowed[$this->rowKey($row)] = true;
            }
        }

        return array_values(array_filter($keys, fn (string $key) => isset($allowed[$key])));
    }

    /** `selectableRows()` on a query, when the component has it. */
    private function onlySelectable(EloquentBuilder|QueryBuilder $builder): EloquentBuilder|QueryBuilder
    {
        return method_exists($this, 'selectableRows') ? $this->selectableRows($builder) : $builder;
    }

    /**
     * How many rows "all matching" would choose: the matching rows, those
     * `selectableRows()` allows when there is a rule.
     *
     * @return array{0: int, 1: bool} the count and whether it is exact
     */
    protected function matchingSelectableCount(): array
    {
        if (! $this->hasSelectableRule()) {
            return [$this->rows->total(), $this->rows->totalIsExact()];
        }
        $query = $this->dataTableQuery();
        $matching = TableQuery::fromArray(['filters' => $this->wireFilters($query), 'search' => $query->search]);
        if ($query->searchKeys !== null) {
            $matching = $matching->withSearchKeys($query->searchKeys, $query->searchKeyColumn);
        }

        return QueryApplier::count($this->onlySelectable(QueryApplier::apply($this->query(), $matching, $this->dataTableColumns())), $this->countLimit(), $this->countTimeout());
    }
}
