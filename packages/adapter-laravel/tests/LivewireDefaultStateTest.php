<?php

declare(strict_types=1);

namespace Acunsoft\DataTable\Laravel\Tests;

use Acunsoft\DataTable\Laravel\DataTableServiceProvider;
use Acunsoft\DataTable\Laravel\Tests\Fixtures\DefaultsOrdersTable;
use Acunsoft\DataTable\Laravel\Tests\Fixtures\OrdersTable;
use Livewire\Livewire;
use Livewire\LivewireServiceProvider;

/** The state a table starts in (default sort, hidden columns) stays out of the URL; the caption can be for screen readers only. */
final class LivewireDefaultStateTest extends TestCase
{
    protected function getPackageProviders($app): array
    {
        return [LivewireServiceProvider::class, DataTableServiceProvider::class];
    }

    /** @return list<string> */
    private function customers(\Livewire\Features\SupportTesting\Testable $table): array
    {
        return array_map(fn ($order) => $order->customer, $table->instance()->rows->items());
    }

    public function test_the_default_sort_is_applied_but_is_the_urls_except_value(): void
    {
        $table = Livewire::test(DefaultsOrdersTable::class)->assertSet('sort', 'total:desc');
        self::assertSame(['Iğdır Ticaret', 'Ayşe Yılmaz', 'Can Öztürk', 'Ali Kaya', 'Deniz Şahin'], $this->customers($table));
        // Livewire leaves a value out of the URL while it equals `except`: the default sort is not written.
        self::assertSame('total:desc', $table->effects['url']['sort']['except']);
        self::assertMatchesRegularExpression('/aria-sort="descending"/', $table->html());
    }

    public function test_a_sort_the_user_chooses_differs_from_the_default_and_goes_into_the_url(): void
    {
        $table = Livewire::test(DefaultsOrdersTable::class)->call('sortBy', 'total'); // desc → none
        $table->assertSet('sort', '');
        self::assertSame([1, 2, 3, 4, 5], array_map(fn ($order) => $order->id, $table->instance()->rows->items()));
        $table->call('sortBy', 'customer')->assertSet('sort', 'customer:asc');
    }

    public function test_a_sort_in_the_url_wins_also_an_empty_one(): void
    {
        $byCustomer = Livewire::withQueryParams(['sort' => 'customer:asc'])->test(DefaultsOrdersTable::class)->assertSet('sort', 'customer:asc');
        self::assertSame('Ali Kaya', $this->customers($byCustomer)[0]);
        // `?sort=` is what the URL says after the user cleared the sort: no sort, not the default again.
        $cleared = Livewire::withQueryParams(['sort' => ''])->test(DefaultsOrdersTable::class)->assertSet('sort', '');
        self::assertSame([1, 2, 3, 4, 5], array_map(fn ($order) => $order->id, $cleared->instance()->rows->items()));
    }

    public function test_a_sort_set_in_mount_still_works_and_unusable_default_rules_are_dropped(): void
    {
        Livewire::test(DefaultsOrdersTable::class, ['mountSort' => 'customer:desc'])->assertSet('sort', 'customer:desc');
        // Unknown, non-sortable and badly directed rules are left out; an internal() column sorts.
        $table = Livewire::test(DefaultsOrdersTable::class, ['sortFirst' => ['nope' => 'asc', 'note' => 'asc', 'customer' => 'up', 'rank' => 'desc']])
            ->assertSet('sort', 'rank:desc');
        self::assertSame('Iğdır Ticaret', $this->customers($table)[0]); // the latest created_at
    }

    public function test_tables_without_a_default_sort_keep_the_old_url_behaviour(): void
    {
        $table = Livewire::test(OrdersTable::class)->assertSet('sort', '');
        self::assertSame('', $table->effects['url']['sort']['except']);
    }

    public function test_hidden_columns_at_their_default_are_the_urls_except_value(): void
    {
        $table = Livewire::test(DefaultsOrdersTable::class)->assertSet('hiddenColumns', ['city', 'note']);
        self::assertSame(['city', 'note'], $table->effects['url']['hiddenColumns']['except']);
        // Shown and hidden again: back to the default list, in its order, so again out of the URL.
        $table->call('toggleColumn', 'city')->assertSet('hiddenColumns', ['note'])
            ->call('toggleColumn', 'city')->assertSet('hiddenColumns', ['city', 'note']);
        // A user change is a different list (and written).
        $table->call('toggleColumn', 'total')->assertSet('hiddenColumns', ['city', 'total', 'note']);
        Livewire::withQueryParams(['hidden' => ['total']])->test(DefaultsOrdersTable::class)->assertSet('hiddenColumns', ['total']);
    }

    public function test_the_caption_can_be_for_screen_readers_only(): void
    {
        self::assertStringContainsString('<caption class="adt-sr-only">Orders</caption>', Livewire::test(DefaultsOrdersTable::class)->html());
        self::assertStringContainsString('<caption>Orders</caption>', Livewire::test(DefaultsOrdersTable::class, ['showCaption' => true])->html());
        self::assertStringContainsString('<caption>Orders</caption>', Livewire::test(OrdersTable::class)->html()); // the default: visible
    }
}
