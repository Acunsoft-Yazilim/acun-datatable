<?php

declare(strict_types=1);

namespace Acunsoft\DataTable\Laravel\Tests\Fixtures;

use Acunsoft\DataTable\Laravel\Column;
use Acunsoft\DataTable\Laravel\Livewire\WithDataTable;
use Illuminate\Database\Eloquent\Builder;
use Livewire\Component;

/** A default sort, columns hidden at first, an internal and a computed column, a caption for screen readers only. */
final class DefaultsOrdersTable extends Component
{
    use WithDataTable;

    /** @var array<string, string> */
    public array $sortFirst = ['total' => 'desc'];

    public bool $showCaption = false;

    /** Lets a test sort in mount(), as apps did before defaultSort(). */
    public string $mountSort = '';

    public function mount(): void
    {
        if ($this->mountSort !== '') {
            $this->sort = $this->mountSort;
        }
    }

    protected function columns(): array
    {
        return [
            Column::make('customer')->header('Customer')->sortable()->searchUsing('customer_search'),
            Column::make('city')->header('City')->sortable()->hidden(),
            Column::make('total')->header('Total')->type('decimal')->sortable(),
            Column::make('note')->header('Note')->hidden(),
            Column::computed('subtotal', fn (Order $order) => $order->subtotal())->header('Subtotal')->type('decimal'),
            Column::make('rank')->column('created_at')->sortable()->internal(),
            Column::make('secret')->filterable()->internal(),
        ];
    }

    protected function query(): Builder
    {
        return Order::query();
    }

    protected function defaultSort(): array
    {
        return $this->sortFirst;
    }

    protected function caption(): ?string
    {
        return 'Orders';
    }

    protected function captionVisible(): bool
    {
        return $this->showCaption;
    }

    protected function exportFormats(): array
    {
        return ['csv'];
    }
}
