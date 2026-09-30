// pages/invoice-generator.js
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useUser } from '../components/user/userContext';

const ProformaInvoiceForm = dynamic(
  () => import('../components/forms/invoiceForm'),
  { ssr: false },
);

export default function InvoiceGeneratorPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'admin') { router.push('/'); return; }
    setChecked(true);
  }, [user, loading, router]);

  if (loading || !checked) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-gray-700 border-t-primary animate-spin" />
        </div>
        <p className="text-gray-400 text-sm tracking-wide">Loading invoice generator…</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Invoice Generator | Eljawad Motors Inc.</title>
        <meta
          name="description"
          content="Generate proforma invoices for your transactions with Eljawad Motors Inc."
        />
        <meta
          name="keywords"
          content="proforma invoice, invoice generator, Eljawad Motors Inc., used cars, auto parts, vehicle shipping"
        />
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <ProformaInvoiceForm />
    </>
  );
}
