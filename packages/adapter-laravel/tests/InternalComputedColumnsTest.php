<?php

declare(strict_types=1);

namespace Acunsoft\DataTable\Laravel\Tests;

use Acunsoft\DataTable\Laravel\Column;
use Acunsoft\DataTable\Laravel\DataTableServiceProvider;
use Acunsoft\DataTable\Laravel\QueryApplier;
use Acunsoft\DataTable\Laravel\TableExport;
use Acunsoft\DataTable\Laravel\TableQuery;
use Acunsoft\DataTable\Laravel\TableResponse;
use Acunsoft\DataTable\Laravel\Tests\Fixtures\DefaultsOrdersTable;
use Acunsoft\DataTable\Laravel\Tests\Fixtures\Order;
use Illuminate\Http\Request;
use Livewire\Livewire;
use Livewire\LivewireServiceProvider;

/** internal() columns are never shown; computed() / value() columns read their value from a closure; searchUsing() searches. */
final class InternalComputedColumnsTest extends TestCase
{
    protected function getPackageProviders($app): array
    {
        return [LivewireServiceProvider::class, DataTableServiceProvider::class];
    }

    public function test_an_internal_column_is_never_rendered_listed_or_put_in_the_hidden_list(): void
    {
        $table = Livewire::test(DefaultsOrdersTable::class, ['sortFirst' => ['rank' => 'desc']]);
        $html = $table->html();
        self::assertStringNotContainsString('data-column-id="rank"', $html);
        self::assertStringNotContainsString('data-label="rank"', $html);
        self::assertStringNotContainsString('value="rank"', $html); // not in the columns menu
        self::assertStringNotContainsString('value="secret"', $html);
        self::assertStringNotContainsString('do-not-send', $html);
        $table->assertSet('hiddenColumns', ['city', 'note']);
        // Neither the menu nor a forged URL shows or hides it.
        $table->call('toggleColumn', 'rank')->assertSet('hiddenColumns', ['city', 'note']);
        Livewire::withQueryParams(['hidden' => ['rank', 'secret']])->test(DefaultsOrdersTable::class)->assertSet('hiddenColumns', ['rank', 'secret']);
        self::assertStringNotContainsString('data-column-id="rank"', Livewire::test(DefaultsOrdersTable::class, ['sortFirst' => []])->call('toggleColumn', 'city')->html());
    }

    public function test_an_internal_column_still_sorts_filters_and_searches(): void
    {
        $sorted = Livewire::test(DefaultsOrdersTable::class, ['sortFirst' => ['rank' => 'asc']]);
        // created_at ascending, NULL first on SQLite; the key breaks ties.
        self::assertSame([5, 2, 3, 1, 4], array_map(fn ($order) => $order->id, $sorted->instance()->rows->items()));
        $filtered = Livewire::test(DefaultsOrdersTable::class)->call('setFilter', 'secret', 'eq', 'do-not-send');
        self::assertCount(5, $filtered->instance()->rows->items());
        $filtered->call('setFilter', 'secret', 'eq', 'other');
        self::assertCount(0, $filtered->instance()->rows->items());

        // The JSON endpoint: allowed in the query, left out of the rows.
        $columns = [Column::make('customer')->sortable(), Column::make('secret')->filterable()->internal()];
        $response = TableResponse::for(Order::query())->columns($columns)
            ->toResponse(Request::create('/orders', 'GET', ['filters' => [['field' => 'secret', 'op' => 'eq', 'value' => 'do-not-send']], 'pageSize' => '2']));
        $data = $response->getData(true);
        self::assertSame(5, $data['totalRows']);
        self::assertSame(['id', 'customer'], array_keys($data['rows'][0]));
    }

    public function test_a_computed_column_reads_its_value_from_a_closure_not_a_relation(): void
    {
        $table = Livewire::test(DefaultsOrdersTable::class);
        // `subtotal()` is a method of Order: read as an attribute, Eloquent would take it for a relation and throw.
        self::assertStringContainsString('data-label="Subtotal"', $table->html());
        self::assertMatchesRegularExpression('/<td data-label="Subtotal"\s+class="adt-num"\s*>\s*4,000\.00<\/td>/', preg_replace('/<!--.*?-->/s', '', $table->html()));

        $columns = [Column::make('customer'), Column::computed('subtotal', fn (Order $order) => $order->subtotal())->type('decimal')];
        $json = TableResponse::for(Order::query()->whereKey(1))->columns($columns)->toResponse(Request::create('/orders'))->getData(true);
        self::assertSame('96.40', $json['rows'][0]['subtotal']);

        $response = TableExport::for(Order::query()->whereKey([1, 2]))->columns($columns)->csv();
        ob_start();
        $response->sendContent();
        self::assertSame("\u{FEFF}customer,subtotal\r\n\"Ayşe Yılmaz\",96.40\r\n\"Ali Kaya\",64.00\r\n", (string) ob_get_clean());

        // value() on a column with a real column name: the value from the closure, sorting by the column.
        $column = Column::make('total')->type('decimal')->sortable()->value(fn (Order $order) => '1.00');
        self::assertSame('1.00', $column->valueOf(Order::query()->find(1)));
        $ids = QueryApplier::apply(Order::query(), TableQuery::fromArray(['sort' => 'total:desc']), [$column])->pluck('id')->all();
        self::assertSame([4, 1, 3, 2, 5], $ids);
    }

    public function test_a_computed_column_cannot_be_edited(): void
    {
        try {
            Column::computed('subtotal', fn ($row) => 1)->editable();
            self::fail('computed and editable');
        } catch (\InvalidArgumentException) {
        }
        $this->expectException(\InvalidArgumentException::class);
        Column::make('total')->editable()->value(fn ($row) => 1);
    }

    public function test_internal_columns_are_left_out_of_exports(): void
    {
        $csv = Livewire::test(DefaultsOrdersTable::class, ['sortFirst' => []])->call('toggleColumn', 'city')->call('export', 'csv');
        $content = base64_decode($csv->effects['download']['content']);
        self::assertStringStartsWith("\u{FEFF}Customer,City,Total,Subtotal\r\n", $content);
        self::assertStringNotContainsString('do-not-send', $content);
    }

    public function test_search_using_a_folded_column_makes_a_column_searchable_unless_said_otherwise(): void
    {
        self::assertTrue(Column::make('customer')->searchUsing('customer_search')->isSearchable());
        self::assertFalse(Column::make('customer')->searchUsing('customer_search')->searchable(false)->isSearchable());
        self::assertFalse(Column::make('customer')->searchable(false)->searchUsing('customer_search')->isSearchable());
        self::assertFalse(Column::make('customer')->isSearchable()); // unchanged without it
        $columns = [Column::make('customer')->searchUsing('customer_search'), Column::make('city')];
        self::assertSame(['Ayşe Yılmaz'], QueryApplier::apply(Order::query(), TableQuery::fromArray(['search' => 'ayse']), $columns)->pluck('customer')->all());
        // The Livewire search box appears for such a column (DefaultsOrdersTable's only searchable column).
        self::assertStringContainsString('wire:model.live.debounce.300ms="search"', Livewire::test(DefaultsOrdersTable::class)->html());
    }
}
