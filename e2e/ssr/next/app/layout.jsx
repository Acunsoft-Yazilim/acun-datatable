import '@acunsoft/datatable-dom/styles.css';

export const metadata = { title: 'Acun DataTable — Next.js' };

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
