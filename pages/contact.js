// pages/contact.js
import Contact from '../components/forms/contact';
import Head from 'next/head';
import { SITE } from '../components/utilities/siteConfig';

export default function ContactPage() {
  return (
  <>
    <Head>
      <title>{`Contact Us | ${SITE.legalName}`}</title>
      <meta name="description" content={`Get in touch with ${SITE.legalName} for inquiries about used cars.`} />
      <meta name="keywords" content={`contact, customer service, inquiries, ${SITE.legalName}, used cars`} />
      </Head>
    <Contact />
  </>
)

}
