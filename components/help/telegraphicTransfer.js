import React from 'react';
import  Link  from 'next/link';
const TelegraphicTransfer = () => {
  return (
    <div className = 'terms-container'>

      {/*<img style={{ maxHeight : 'unset' }} src={`${process.env.PUBLIC_URL}/images/banktransfer.jpeg`} alt={'company-profile'} className="topic-image" />*/}
      <ol>
      <h4>How to Make a Payment via Telegraphic Transfer (T/T)</h4>
        <li>
          <h4>Receive the Invoice</h4>
          <p>After placing your order, Eljawad Motors will send you a detailed invoice via email. This invoice will include:</p>
          <ul>
            <li>The total amount due.</li>
            <li>Our official bank account details (beneficiary: Eljawad Motors Inc.).</li>
            <li>A unique invoice reference number for the transaction.</li>
          </ul>
        </li>
        <li>
          <h4>Verify the Payment Details</h4>
          <ul>
            <li>Double-check the bank account information on the invoice to ensure it matches our official details.</li>
            {/* Intentionally still @artisbay.com: outbound mail still actually sends from that domain
                (see server/core/mailer.php) until the mail domain is migrated. Pointing this at the new
                brand name before that migration happens would defeat the anti-fraud check. */}
            <li>Ensure the email containing the invoice is from @artisbay.com to avoid fraudulent activity.</li>
          </ul>
        </li>
        <li>
          <h4>Initiate the Transfer</h4>
          <ul>
            <li>Visit your bank (in person or via online banking) to initiate the Telegraphic Transfer (T/T).</li>
            <li>Provide the bank with the following details:</li>
            <ul>
              <li>Beneficiary name: Eljawad Motors Inc.</li>
              <li>Bank account number and SWIFT code (as listed on the invoice).</li>
              <li>Invoice reference number to include in the transaction for easy identification.</li>
            </ul>
          </ul>
        </li>
        <li>
          <h4>Confirmation of Payment</h4>
          <ul>
            <li>Once the transfer is completed, request a payment receipt from your bank.</li>
            <li>Share the receipt with Eljawad Motors via email to confirm your payment. This helps us verify and process your order more quickly.</li>
          </ul>
        </li>
        <li>
          <h4>Order Processing</h4>
          <p>After confirming your payment, we will proceed with your order and keep you updated on its status. Check out our <Link href='/help/about-payment' className='cta-link'>payment methods</Link> page for more details.</p>
        </li>
      </ol>
    </div>
  );
};

export default TelegraphicTransfer;
