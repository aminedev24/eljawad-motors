// pages/register.js
import RegisterForm from '../components/pages/register';
import Head from 'next/head';
import { SITE } from '../components/utilities/siteConfig';

export default function RegisterPage() {
  return (
  <>
    <Head>
      <title>{`Register | ${SITE.legalName}`}</title>
      <meta name="description" content={`Create an account with ${SITE.legalName} to access exclusive features and manage your orders for used cars, auto parts, and more.`} />
      <meta name="keywords" content={`register, create account, ${SITE.legalName}, used cars, auto parts, vehicle shipping`} />
    </Head>
     <RegisterForm />
  </>
 

  )
}
