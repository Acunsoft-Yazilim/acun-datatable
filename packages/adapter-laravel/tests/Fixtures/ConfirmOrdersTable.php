<?php

declare(strict_types=1);

namespace Acunsoft\DataTable\Laravel\Tests\Fixtures;

use Acunsoft\DataTable\Laravel\Action;
use Acunsoft\DataTable\Laravel\Column;

/** Actions whose confirmation has a title, labels and a tone. */
final class ConfirmOrdersTable extends \Livewire\Component
{
    use \Acunsoft\DataTable\Laravel\Livewire\WithDataTable;

    protected function columns(): array
    {
        return [Column::make('customer')->header('Customer')];
    }

    protected function query(): \Illuminate\Database\Eloquent\Builder
    {
        return Order::query()->whereKey(1);
    }

    protected function selectable(): bool
    {
        return true;
    }

    protected function rowActions(): array
    {
        return [
            Action::make('delete')->label('Delete')
                ->confirm('Delete "this" order?', title: 'Delete order', confirmLabel: 'Delete', cancelLabel: 'Keep', tone: 'danger')
                ->handle(fn (Order $order) => $order->delete()),
        ];
    }

    protected function bulkActions(): array
    {
        return [
            Action::make('archive')->label('Archive')->danger()->confirm('Archive them?', title: 'Archive')
                ->handle(fn ($selected) => $selected->update(['note' => 'archived'])),
        ];
    }
}
