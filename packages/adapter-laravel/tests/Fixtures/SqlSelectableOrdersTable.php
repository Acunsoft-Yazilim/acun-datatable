<?php

declare(strict_types=1);

namespace Acunsoft\DataTable\Laravel\Tests\Fixtures;

use Illuminate\Database\Eloquent\Builder;

/** The same rule in SQL too (selectableRows()): "all matching" is offered and skips active orders. */
final class SqlSelectableOrdersTable extends SelectableOrdersTable
{
    protected function selectableRows(Builder $query): Builder
    {
        return $query->where('active', false);
    }
}
