// pages/login.js
import Login from '../components/pages/login';
import Head from 'next/head';
import { SITE } from '../components/utilities/siteConfig';

export default function LoginPage() {
  return (
    <>
      <Head>
        <title>{`Login | ${SITE.legalName}`}</title>
        <meta name="description" content={`Login to your ${SITE.legalName} account to access your profile, manage orders, and more.`} />
        <meta name="keywords" content={`login, user account, ${SITE.legalName}, used cars, auto parts, vehicle shipping`} />
      </Head>
      <Login />

    </>
  )
}
