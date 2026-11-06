<?php

declare(strict_types=1);

namespace Acunsoft\DataTable\Laravel\Tests;

use Acunsoft\DataTable\Laravel\Column;
use Acunsoft\DataTable\Laravel\QueryApplier;
use Acunsoft\DataTable\Laravel\TableQuery;
use Acunsoft\DataTable\Laravel\Tests\Fixtures\Order;
use Acunsoft\DataTable\Laravel\Tests\Fixtures\OrderLine;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** A select list with bindings (`withSum()` with a condition) is counted and totalled without them. */
final class SelectBindingsCountTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Schema::create('order_lines', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('order_id');
            $table->string('status');
            $table->decimal('total', 10, 2);
        });
        foreach ([[1, 'paid', '10.00'], [1, 'refunded', '5.00'], [1, 'shipped', '2.50'], [2, 'paid', '7.00'], [4, 'new', '1.00']] as [$order, $status, $total]) {
            OrderLine::query()->insert(['order_id' => $order, 'status' => $status, 'total' => $total]);
        }
    }

    private function orders(): \Illuminate\Database\Eloquent\Builder
    {
        return Order::query()->withSum(['lines as paid' => fn ($lines) => $lines->whereIn('status', ['paid', 'shipped'])], 'total');
    }

    public function test_the_count_probe_drops_the_select_bindings_with_the_select_list(): void
    {
        $columns = [Column::make('customer')->sortable()->filterable(), Column::make('total')->type('decimal')->sortable()->filterable()->sum()];
        $query = TableQuery::fromArray(['filters' => [['field' => 'total', 'op' => 'gt', 'value' => '60']], 'pageSize' => 2]);
        // The subquery's two bindings stayed with the probe and shifted the filter's: a wrong count or "column index out of range".
        self::assertSame([4, true], QueryApplier::count(QueryApplier::apply($this->orders(), $query, $columns)));
        $page = QueryApplier::paginate($this->orders(), $query, $columns);
        self::assertSame(4, $page->total());
        self::assertSame(['12.50', '7.00'], array_map(fn ($order) => number_format((float) $order->paid, 2, '.', ''), $page->items()));
        self::assertSame(['total' => '5300.40'], QueryApplier::aggregates($this->orders(), $query, $columns));
        // Past the limit, the exact count (getCountForPagination) has always dropped them.
        self::assertSame([3, false], QueryApplier::count(QueryApplier::apply($this->orders(), $query, $columns), 3, null));
        self::assertSame([4, true], QueryApplier::count(QueryApplier::apply($this->orders(), $query, $columns), null));
    }
}
