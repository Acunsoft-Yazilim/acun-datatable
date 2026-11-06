<?php

declare(strict_types=1);

namespace Acunsoft\DataTable\Laravel\Tests\Fixtures;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class Order extends Model
{
    public $timestamps = false;
    protected $guarded = [];
    protected $casts = ['total' => 'decimal:2', 'active' => 'boolean'];

    /** Lines of the order (the `order_lines` table exists only in the tests that create it). */
    public function lines(): HasMany
    {
        return $this->hasMany(OrderLine::class);
    }

    /** A plain method, not a relation: a column with this ID needs `Column::computed()`. */
    public function subtotal(): string
    {
        return number_format((float) $this->total * 0.8, 2, '.', '');
    }
}
