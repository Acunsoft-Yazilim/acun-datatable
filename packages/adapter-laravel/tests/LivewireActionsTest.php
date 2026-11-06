<?php

declare(strict_types=1);

namespace Acunsoft\DataTable\Laravel\Tests;

use Acunsoft\DataTable\Laravel\Action;
use Acunsoft\DataTable\Laravel\DataTableServiceProvider;
use Acunsoft\DataTable\Laravel\Tests\Fixtures\ConfirmOrdersTable;
use Acunsoft\DataTable\Laravel\Tests\Fixtures\Order;
use Acunsoft\DataTable\Laravel\Tests\Fixtures\OrdersTable;
use Livewire\Livewire;
use Livewire\LivewireServiceProvider;

final class LivewireActionsTest extends TestCase
{
    protected function getPackageProviders($app): array
    {
        return [LivewireServiceProvider::class, DataTableServiceProvider::class];
    }

    public function test_row_actions_render_with_the_row_name_and_confirm(): void
    {
        $html = Livewire::test(OrdersTable::class)->html();
        self::assertStringContainsString('<th scope="col" class="adt-th adt-actions">Actions</th>', $html);
        self::assertStringContainsString('aria-label="Activate: Ali Kaya"', $html);
        self::assertStringNotContainsString('aria-label="Activate: Ayşe Yılmaz"', $html); // already active: hidden
        self::assertStringContainsString('wire:click="runRowAction(\'activate\', \'2\')"', $html); // no confirm: runs on click
        // With confirm(): the question (and tone) as data attributes, asked through the pluggable confirm, then run.
        self::assertMatchesRegularExpression('/data-action="delete"\s+aria-label="Delete: Ayşe Yılmaz"\s+data-confirm="Delete this order\?"\s+data-confirm-tone="default"\s+x-data x-on:click="[^"]*Symbol\.for\(\'acunsoft\.datatable\.confirm\'\)[^"]*window\.AcunUI[^"]*window\.confirm\(ask\.text\)[^"]*\.then\(ok => ok && \$wire\.runRowAction\(\'delete\', \'1\'\)\)"/', $html);
        self::assertStringNotContainsString('wire:confirm', $html); // never the browser's confirm directly
    }

    public function test_a_confirmation_carries_its_title_labels_and_tone_escaped(): void
    {
        $html = preg_replace('/<!--.*?-->/s', '', Livewire::test(ConfirmOrdersTable::class)->call('toggleRow', '1')->html());
        self::assertMatchesRegularExpression('/data-action="delete"\s+aria-label="Delete: Ayşe Yılmaz"\s+data-confirm="Delete &quot;this&quot; order\?"\s+data-confirm-title="Delete order"\s+data-confirm-label="Delete"\s+data-confirm-cancel="Keep"\s+data-confirm-tone="danger"\s+x-data x-on:click=/', $html);
        // A danger() bulk action: the danger tone without saying so; labels left out are the dialog's own.
        self::assertMatchesRegularExpression('/data-action="archive"\s+data-confirm="Archive them\?"\s+data-confirm-title="Archive"\s+data-confirm-tone="danger"\s+x-data/', $html);
        self::assertMatchesRegularExpression('/<option value="archive"\s+data-confirm="Archive them\?"\s+data-confirm-title="Archive"\s+data-confirm-tone="danger"\s*>/', $html);
        // The same keys the DOM renderer's confirm handler gets.
        foreach (["ask.title = data.confirmTitle", "ask.confirmLabel = data.confirmLabel", "ask.cancelLabel = data.confirmCancel", "ask.tone = data.confirmTone"] as $part) {
            self::assertStringContainsString($part, $html);
        }
    }

    public function test_confirm_options_and_their_defaults(): void
    {
        $plain = Action::make('delete')->confirm('Sure?');
        self::assertSame(['data-confirm' => 'Sure?', 'data-confirm-tone' => 'default'], $plain->confirmAttributes());
        self::assertSame('danger', $plain->danger()->confirmTone());
        self::assertSame('default', $plain->danger()->confirm('Sure?', tone: 'default')->confirmTone());
        self::assertSame([], Action::make('edit')->confirmAttributes());
        $full = Action::make('delete')->confirm('Sure?', 'Delete', 'Yes', 'No');
        self::assertSame(['Sure?', 'Delete', 'Yes', 'No'], [$full->confirmText(), $full->confirmTitle(), $full->confirmLabel(), $full->cancelLabel()]);
        $this->expectException(\InvalidArgumentException::class);
        Action::make('delete')->confirm('Sure?', tone: 'loud');
    }

    public function test_a_row_action_runs_on_the_row_and_refreshes_the_table(): void
    {
        $table = Livewire::test(OrdersTable::class)->call('runRowAction', 'activate', '2');
        self::assertTrue(Order::query()->find(2)->active);
        self::assertStringNotContainsString('aria-label="Activate: Ali Kaya"', $table->html());
        $table->call('runRowAction', 'delete', 5)->assertDontSee('Deniz Şahin');
        self::assertNull(Order::query()->find(5));
    }

    public function test_row_actions_ignore_forged_keys_hidden_and_unknown_actions(): void
    {
        Livewire::test(OrdersTable::class, ['onlyCity' => 'Ankara'])
            ->call('runRowAction', 'delete', '4') // exists, but outside query()
            ->call('runRowAction', 'activate', '1') // outside query() too
            ->call('runRowAction', 'drop', '2') // not an action
            ->call('runRowAction', 'delete', str_repeat('9', 100));
        self::assertNotNull(Order::query()->find(4));
        self::assertSame(5, Order::query()->count());

        Livewire::test(OrdersTable::class)->call('runRowAction', 'activate', '1'); // hidden for an active row
        self::assertSame('VIP', Order::query()->find(1)->note); // the handler did not run
    }

    public function test_bulk_actions_run_on_the_selection_and_clear_it(): void
    {
        $table = Livewire::test(OrdersTable::class)->call('toggleRow', '1')->call('toggleRow', '3');
        self::assertMatchesRegularExpression('/data-action="archive"\s+data-confirm="Archive the selected orders\?"\s+data-confirm-tone="default"\s+x-data x-on:click="[^"]*\.then\(ok => ok && \$wire\.runBulkAction\(\'archive\'\)\)"/', $table->html());
        self::assertStringNotContainsString('wire:confirm', $table->html());
        // Phones: the same choices as a select, the confirmation kept.
        self::assertStringContainsString('class="adt-control adt-selection-menu"', $table->html());
        self::assertMatchesRegularExpression('/<option value="archive"\s+data-confirm="Archive the selected orders\?"\s+data-confirm-tone="default"\s*>Archive/', $table->html());
        self::assertMatchesRegularExpression('/else if \(! option\.dataset\.confirm\) \$wire\.runBulkAction\(option\.value\); else [^"]*\}\)\(option\)\s*\.then\(ok => ok && \$wire\.runBulkAction\(option\.value\)\)/', $table->html());
        self::assertStringContainsString('<option value="__clear">Clear selection</option>', $table->html());
        $table->call('runBulkAction', 'archive')->assertSet('selected', []);
        self::assertSame([1, 3], Order::query()->where('note', 'archived')->orderBy('id')->pluck('id')->all());
    }

    public function test_bulk_actions_on_all_matching_rows_stay_inside_the_query(): void
    {
        Livewire::test(OrdersTable::class, ['onlyCity' => 'Ankara'])
            ->set('selected', ['4'])->call('runBulkAction', 'archive'); // 4 is outside query()
        self::assertSame(0, Order::query()->where('note', 'archived')->count());

        Livewire::test(OrdersTable::class)->set('search', 'ayse')->call('selectAllMatching')->call('runBulkAction', 'archive');
        self::assertSame([1], Order::query()->where('note', 'archived')->pluck('id')->all());
    }

    public function test_rows_taken_out_of_every_matching_row_are_bounded_like_the_selection(): void
    {
        $table = Livewire::test(OrdersTable::class, ['maxRows' => 3])->call('selectAllMatching');
        $table->call('toggleRow', str_repeat('x', 65)); // longer than any key
        self::assertSame([], $table->get('excluded'));
        for ($i = 0; $i < 5; $i++) {
            $table->call('toggleRow', "k{$i}");
        }
        self::assertSame(['k0', 'k1', 'k2'], $table->get('excluded')); // maxSelected(), not every key the browser sends
        $table->call('toggleRow', 'k3');
        self::assertNotContains('k3', $table->get('excluded')); // taking it back still works
    }

    public function test_the_selection_is_announced_from_the_first_row_on(): void
    {
        $table = Livewire::test(OrdersTable::class);
        self::assertMatchesRegularExpression('/<span class="adt-sr-only adt-selection-status" role="status">\s*<\/span>/', $table->html()); // there before anything is chosen
        $table->call('toggleRow', '1');
        self::assertMatchesRegularExpression('/<span class="adt-sr-only adt-selection-status" role="status">1 selected<\/span>/', $table->html());
        self::assertSame(1, substr_count($table->html(), 'role="status">1 selected'), 'read out once, not by the visible count too');
    }

    public function test_screen_readers_hear_the_second_sort_and_the_details_column(): void
    {
        $html = Livewire::test(OrdersTable::class)->call('sortBy', 'total')->call('sortBy', 'customer', true)->html();
        self::assertStringContainsString('<span class="adt-sr-only">sort 2, ascending</span>', $html); // aria-sort names the first only
        self::assertStringContainsString('<span class="adt-sr-only">sort 1, ascending</span>', $html);
        self::assertStringNotContainsString('sort 1', Livewire::test(OrdersTable::class)->call('sortBy', 'total')->html()); // one rule: aria-sort is enough
        $detail = Livewire::test(\Acunsoft\DataTable\Laravel\Tests\Fixtures\ResponsiveOrdersTable::class, ['detail' => 'fixtures::pill'])->html();
        self::assertStringContainsString('<td class="adt-expand-cell"><span class="adt-sr-only">Details</span></td>', $detail);
    }

    public function test_bulk_actions_need_a_selection_and_must_be_visible(): void
    {
        Livewire::test(OrdersTable::class)->call('runBulkAction', 'archive'); // nothing selected
        Livewire::test(OrdersTable::class, ['canArchive' => false])->call('toggleRow', '1')->call('runBulkAction', 'archive')
            ->assertDontSeeHtml('runBulkAction');
        Livewire::test(OrdersTable::class)->call('toggleRow', '1')->call('runBulkAction', 'unknown')->assertSet('selected', ['1']);
        self::assertSame(0, Order::query()->where('note', 'archived')->count());
    }

    public function test_action_definitions_are_validated(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        Action::make('1-bad');
    }

    public function test_an_action_without_a_handler_fails_loudly(): void
    {
        $this->expectException(\LogicException::class);
        Action::make('noop')->run(null);
    }
}
