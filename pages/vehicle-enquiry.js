// pages/vehicle-inquiry.js
import InquiryForm from '../components/vehicles/vehiculeEnquiry';
import Head from 'next/head';
import { SITE } from '../components/utilities/siteConfig';

export default function VehicleInquiryPage() {
  return (
  <>
    <Head>
      <title>{`Vehicle Inquiry | ${SITE.legalName}`}</title>
      <meta name="description" content={`Inquire about our used vehicles at ${SITE.legalNameEnd}`} />
      <meta name="keywords" content={`vehicle inquiry, used cars, ${SITE.legalName}`} />
    </Head>
    <InquiryForm />
  </>
  )
}
