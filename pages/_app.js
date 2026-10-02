// pages/_app.js
import '../styles/globals.css';
import '../styles/custom/global/App.css';                    // <-- your old CRA global CSS
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

import '../styles/custom/layout/footer.css'
import '../styles/custom/layout/header.css';
import '../styles/custom/pages/homepage.css';
import '../styles/custom/utilities/chatbot.css';
import  "../styles/custom/vehicle/vehicleInfo.css";
import '../styles/custom/utilities/toolTip.css';
import '../styles/custom/vehicle/fetchCars.css';
import '../styles/custom/forms/carForm.css';
import '../styles/custom/forms/accountancyForm.css';
import '../styles/custom/forms/addCustomer.css';
import  "../styles/custom/forms/contact.css";
import "../styles/custom/components/invoice.css";
import '../styles/custom/help/terms.css';
import '../styles/custom/help/bankInfo.css'; // Import the CSS file
import '../styles/custom/help/faq.css'; // Import the CSS file
import '../styles/custom/help/howToBuy.css';
import '../styles/custom/help/terms.css';
import "../styles/custom/forms/AdminInvoiceForm.css";
import '../styles/custom/components/invoicePreview.css'; // Custom styles for preview
import '../styles/custom/user/userHomepage.css';
import "../styles/custom/components/invoice.css";
import '../styles/custom/user/profilePage.css';
import '../styles/custom/pages/register.css';
import '../styles/custom/vehicle/cuttingCost.css';
import '../styles/custom/forms/vehicleEnquiry.css';
import '../styles/custom/pages/login.css';
//import '../styles/custom/layout/rightSidebar.css';
import '../styles/custom/layout/topbar.css'; // Adjust your CSS file path accordingly
import '../styles/custom/vehicle/cuttingCost.css';
import '../styles/custom/vehicle/savedCarsPanel.css';
import '../styles/custom/forms/forgotPassword.css';
import "../styles/custom/components/emailConfirmation.css"; // Import CSS file

import '../styles/custom/pages/feedback.css';
import '../styles/custom/utilities/scrollToTop.css';
import Head from 'next/head';
import { Inter, Space_Grotesk } from 'next/font/google';
import { ThemeProvider } from '../components/utilities/toggletheme';
import { UserProvider } from '../components/user/userContext';
import Header from '../components/common/header';
import Footer from '../components/common/footer';
import WidgetDock from '../components/utilities/widgetDock';
import CompareTray from '../components/misc/compareTray';
//import Chatbot from '../components/utilities/chatbot';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-display' });

export default function MyApp({ Component, pageProps }) {
  const getLayout = Component.getLayout ?? ((page) => (
    <>
      <Header />
      <main style={{flex: 1}}>{page}</main>
      <WidgetDock />
      <CompareTray />
      <Footer />
    </>
  ));

  return (
    <ThemeProvider>
      <div className={`${inter.variable} ${spaceGrotesk.variable} contents`}>
      <Head>
        <title>Eljawad Motors Inc. | Japanese Used Cars, Tires & Auto Parts Exporter</title>
        <meta
          name="description"
          content="Eljawad Motors Inc. exports genuine Japanese used vehicles, tires, and auto parts. Trusted by buyers worldwide for quality and reliability."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <UserProvider>
        {getLayout(<Component {...pageProps} />)}
      </UserProvider>
      </div>
    </ThemeProvider>
  );
}
