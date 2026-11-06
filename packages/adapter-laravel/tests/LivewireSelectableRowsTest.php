<?php

declare(strict_types=1);

namespace Acunsoft\DataTable\Laravel\Tests;

use Acunsoft\DataTable\Laravel\DataTableServiceProvider;
use Acunsoft\DataTable\Laravel\Tests\Fixtures\Order;
use Acunsoft\DataTable\Laravel\Tests\Fixtures\OrdersTable;
use Acunsoft\DataTable\Laravel\Tests\Fixtures\SelectableOrdersTable;
use Acunsoft\DataTable\Laravel\Tests\Fixtures\SqlSelectableOrdersTable;
use Livewire\Livewire;
use Livewire\LivewireServiceProvider;

/** isSelectable() / selectableRows(), the selection in the table's order, and bulk actions that keep the selection. */
final class LivewireSelectableRowsTest extends TestCase
{
    protected function getPackageProviders($app): array
    {
        return [LivewireServiceProvider::class, DataTableServiceProvider::class];
    }

    // Orders 2 (Ali Kaya, 80.00) and 4 (Iğdır Ticaret, 5000.00) are inactive: the only selectable ones.

    public function test_rows_that_may_not_be_chosen_get_no_checkbox(): void
    {
        $html = preg_replace('/<!--.*?-->/s', '', Livewire::test(SelectableOrdersTable::class)->html());
        self::assertStringContainsString('aria-label="Select Ali Kaya"', $html);
        self::assertStringContainsString('aria-label="Select Iğdır Ticaret"', $html);
        self::assertStringNotContainsString('aria-label="Select Ayşe Yılmaz"', $html);
        self::assertMatchesRegularExpression('/data-row-id="1"[^>]*>\s*<td class="adt-select">\s*<\/td>/', $html); // the cell stays, empty
        self::assertStringContainsString('aria-label="Select all rows on this page"', $html); // the page has selectable rows

        Order::query()->update(['active' => true]);
        self::assertStringNotContainsString('aria-label="Select all rows on this page"', Livewire::test(SelectableOrdersTable::class)->html());
    }

    public function test_the_page_a_range_a_row_and_a_set_list_keep_to_selectable_rows(): void
    {
        $table = Livewire::test(SelectableOrdersTable::class)->call('togglePage')->assertSet('selected', ['2', '4']);
        self::assertStringContainsString('wire:key="adt-page-all"', $table->html()); // "all" means all that may be chosen
        $table->call('togglePage')->assertSet('selected', []);
        $table->call('selectRange', '1', '5')->assertSet('selected', ['2', '4']);
        $table->call('clearSelection')->call('toggleRow', '1')->call('toggleRow', 3)->assertSet('selected', []);
        $table->set('selected', ['1', '2', '5'])->assertSet('selected', ['2']); // set from the browser
    }

    public function test_the_server_skips_rows_that_are_no_longer_selectable(): void
    {
        $table = Livewire::test(SelectableOrdersTable::class)->call('togglePage');
        Order::query()->whereKey(4)->update(['active' => true]); // changed meanwhile
        $table->call('runBulkAction', 'collect')->assertSet('received', [2])->assertSet('selected', []);
    }

    public function test_all_matching_needs_the_rule_in_sql_and_then_skips_the_rows(): void
    {
        $php = Livewire::test(SelectableOrdersTable::class)->call('toggleRow', '2');
        self::assertStringNotContainsString('wire:click="selectAllMatching"', $php->html());
        $php->call('selectAllMatching')->assertSet('allMatching', false)->assertSet('selected', ['2']);

        $sql = Livewire::test(SqlSelectableOrdersTable::class)->call('toggleRow', '2');
        self::assertStringContainsString('Select all 2 matching rows', $sql->html()); // counts the selectable matching rows, not 5
        $sql->call('selectAllMatching')->assertSet('allMatching', true);
        self::assertStringContainsString('2 selected', $sql->html());
        $sql->call('runBulkAction', 'collect')->assertSet('received', [2, 4]);
    }

    public function test_selected_query_follows_the_tables_sort_with_the_key_last(): void
    {
        $table = Livewire::test(SelectableOrdersTable::class)->call('togglePage')->call('sortBy', 'total')->call('sortBy', 'total'); // desc
        $table->call('runBulkAction', 'review')->assertSet('received', [4, 2]);
        $table->call('sortBy', 'total')->call('runBulkAction', 'review')->assertSet('received', [2, 4]); // no sort: by key
        $sql = Livewire::test(SqlSelectableOrdersTable::class)->call('sortBy', 'customer')->call('sortBy', 'customer')->call('toggleRow', '2')->call('selectAllMatching');
        $sql->call('runBulkAction', 'collect')->assertSet('received', [4, 2]); // "Iğdır" after "Ali", descending

        // Every matching row of a table without a rule, sorted on screen by city descending, then the key.
        Order::query()->whereKey(5)->update(['city' => 'İzmir']);
        $orders = Livewire::test(OrdersTable::class)->call('sortBy', 'city')->call('sortBy', 'city')->call('selectAllMatching');
        $ids = (fn () => $this->selectedQuery()->pluck('id')->all())->call($orders->instance());
        self::assertSame(array_map(fn ($order) => $order->id, $orders->instance()->rows->items()), $ids);
        $explicit = Livewire::test(OrdersTable::class)->call('sortBy', 'total')->call('toggleRow', '4')->call('toggleRow', '2')->call('toggleRow', '1');
        self::assertSame([2, 1, 4], (fn () => $this->selectedQuery()->pluck('id')->all())->call($explicit->instance()));
    }

    public function test_an_export_of_the_selection_is_in_the_tables_order(): void
    {
        $table = Livewire::test(SelectableOrdersTable::class)->call('togglePage')->call('sortBy', 'total')->call('sortBy', 'total');
        $content = base64_decode($table->call('export', 'csv')->effects['download']['content']);
        self::assertSame(['Customer,Total,Active', '"Iğdır Ticaret",5000.00,false', '"Ali Kaya",80.00,false'], array_slice(explode("\r\n", ltrim($content, "\u{FEFF}")), 0, 3));
    }

    public function test_keep_selection_leaves_the_selection_for_the_handler_to_clear(): void
    {
        $table = Livewire::test(SelectableOrdersTable::class)->call('togglePage');
        $table->call('runBulkAction', 'review')->assertSet('received', [2, 4])->assertSet('selected', ['2', '4']);
        $table->call('runBulkAction', 'collect')->assertSet('selected', []); // the default clears it
    }
}
