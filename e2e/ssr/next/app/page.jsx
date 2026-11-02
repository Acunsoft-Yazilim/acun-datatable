// A Server Component: it reads the rows on the server and hands them, as
// plain data, to a client component. Texts for the server come from
// @acunsoft/datatable-dom: everything from @acunsoft/datatable-react is client code.
import { labelsTr } from '@acunsoft/datatable-dom';
import { OrdersTable } from './orders-table';
import { orders } from './orders';

export default function Page() {
  return (
    <main>
      <h1>Siparişler</h1>
      <p id="server-label">{labelsTr.search}</p>
      <OrdersTable rows={orders} />
    </main>
  );
}
