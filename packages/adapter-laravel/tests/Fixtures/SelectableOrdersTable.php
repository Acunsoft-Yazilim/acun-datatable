<?php

declare(strict_types=1);

namespace Acunsoft\DataTable\Laravel\Tests\Fixtures;

use Acunsoft\DataTable\Laravel\Action;
use Acunsoft\DataTable\Laravel\Column;
use Acunsoft\DataTable\Laravel\Livewire\WithDataTable;
use Illuminate\Database\Eloquent\Builder;
use Livewire\Component;

/** Only inactive orders may be chosen (isSelectable(), PHP only: no "all matching"). */
class SelectableOrdersTable extends Component
{
    use WithDataTable;

    /** @var list<int> the keys a bulk action received, in its order */
    public array $received = [];

    protected function columns(): array
    {
        return [
            Column::make('customer')->header('Customer')->sortable()->searchUsing('customer_search'),
            Column::make('total')->header('Total')->type('decimal')->sortable(),
            Column::make('active')->header('Active')->type('boolean')->filterable()->searchable(false),
        ];
    }

    protected function query(): Builder
    {
        return Order::query();
    }

    protected function selectable(): bool
    {
        return true;
    }

    protected function exportFormats(): array
    {
        return ['csv'];
    }

    protected function isSelectable(Order $order): bool
    {
        return ! $order->active;
    }

    protected function bulkActions(): array
    {
        return [
            Action::make('collect')->label('Collect')->handle(fn (Builder $selected) => $this->received = $selected->pluck('id')->all()),
            Action::make('review')->label('Review')->keepSelection()->handle(fn (Builder $selected) => $this->received = $selected->pluck('id')->all()),
        ];
    }
}
