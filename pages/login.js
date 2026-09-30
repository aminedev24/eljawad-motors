// pages/login.js
import Login from '../components/pages/login';
import Head from 'next/head';

export default function LoginPage() {
  return (
    <>
      <Head>
        <title>Login | Eljawad Motors Inc.</title>
        <meta name="description" content="Login to your Eljawad Motors Inc. account to access your profile, manage orders, and more." />
        <meta name="keywords" content="login, user account, Eljawad Motors Inc., used cars, auto parts, vehicle shipping" />
      </Head>
      <Login />

    </>
  )
}
