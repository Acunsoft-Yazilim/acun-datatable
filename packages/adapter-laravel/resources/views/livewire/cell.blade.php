{{-- The content of one cell: the column's own view (Column::view()) or its plain text. --}}
@if ($column->cellView() !== null)@include($column->cellView(), ['row' => $row, 'value' => $column->valueOf($row), 'text' => \Acunsoft\DataTable\Laravel\Support\Format::cell($column, $row), 'column' => $column])@else{{ \Acunsoft\DataTable\Laravel\Support\Format::cell($column, $row) }}@endif
