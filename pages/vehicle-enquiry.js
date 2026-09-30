// pages/vehicle-inquiry.js
import InquiryForm from '../components/vehicles/vehiculeEnquiry';
import Head from 'next/head';

export default function VehicleInquiryPage() {
  return (
  <>
    <Head>
      <title>Vehicle Inquiry | Eljawad Motors Inc.</title>
      <meta name="description" content="Inquire about our used vehicles at Eljawad Motors Inc." />
      <meta name="keywords" content="vehicle inquiry, used cars, Eljawad Motors Inc." />
    </Head>
    <InquiryForm />
  </>
  )
}
