import React from 'react';
import Link from 'next/link';

const PaymentMethods = () => {
  return (
    <div className='howtopay'>
      
      {/*<img style={{ maxHeight : 'unset' }} src={`${process.env.PUBLIC_URL}/images/aboutpayment.jpeg`} alt={'company-profile'} className="topic-image" />*/}
      <h4>Payment Methods at Eljawad Motors Inc.</h4>
      <p>At Eljawad Motors Inc., we provide secure and reliable payment options to meet the needs of our global customers. See the sections below for details on each method.</p>
      
      <h4>1. Telegraphic Transfer (T/T)</h4>
      <p>Customers can make payments directly via T/T, a safe and widely recognized international transfer method.</p>
      
      <h4>2. PayPal</h4>
      <p>For most countries, we also accept payments through PayPal. This method allows customers to use their credit cards securely on the PayPal platform, even if direct credit card payment is unavailable on our site.</p>
      
      <h3>Note:</h3>
      <p>Eljawad Motors Inc. does not support direct credit card payments, such as swiping or manually entering credit card details on our platform. However, PayPal provides a convenient alternative for credit card transactions.</p>
      
      <h3>Payment FAQ</h3>
      <h4>How can I make a payment via Telegraphic Transfer (T/T)?</h4>
      <p>Follow these steps to complete your T/T payment:</p>
      <ol>
        <li>Use the invoice issued by Eljawad Motors Inc. to initiate the transfer at your local bank or via online banking.</li>
        <li>Include the following details during the transfer:
          <ul>
            <li>Purpose of payment: Clearly reference the invoice number.</li>
            <li>Currency: Ensure the payment is in the currency stated on the invoice.</li>
            <li>Fees: Transfer fees are the sender’s responsibility.</li>
          </ul>
        </li>
        <li>Once the transaction is complete, email us a copy of the T/T receipt to confirm your payment and expedite order processing.</li>
      </ol>
      
      <h4>Does Eljawad Motors Inc. accept payment through Letters of Credit (L/C)?</h4>
      <p>Currently, Eljawad Motors Inc. does not accept payments via Letters of Credit (L/C).</p>
      
      <h4>Can I use a credit card for payment?</h4>
      <p>While we do not accept direct credit card payments on our platform, you can use your credit card securely through PayPal to complete your transaction.</p>
      
      <h4>Is PayPal an accepted payment method?</h4>
      <p>Yes, PayPal is available for customers in most countries. Please contact us to verify if this option is available for your location.</p>
      
      <h4>What does the “Due Date” on my invoice mean?</h4>
      <p>The “Due Date” is the deadline by which we must confirm your payment. Failure to meet this deadline may result in the cancellation of your order. If you foresee any delays, please inform Eljawad Motors Inc. before the due date to discuss potential solutions.</p>
      
      <h4>Can I request an extension on the payment due date?</h4>
      <p>Extensions are not typically granted. However, under special circumstances, you may contact us for consideration. Please note that if payment is not confirmed by the due date, orders may be canceled, and partial payments may be subject to a restocking fee.</p>
      
      <h4>Can I split my payment into installments?</h4>
      <p>Installment payments are not standard practice but can be considered on a case-by-case basis. Please reach out to us directly to discuss this option.</p>
      
      <h4>Is it possible to consolidate payments for multiple orders?</h4>
      <p>Yes, you can make one payment to cover multiple purchases. Notify us in advance to ensure the funds are properly allocated to your orders.</p>
      
      <h4>How will I know when my payment has been received?</h4>
      <p>Once your payment is verified in our account, we will notify you via email. To expedite this process, please send us a copy of your T/T receipt. Most payments are confirmed within a few business days, but processing times may vary depending on your bank and other factors.</p>
      <div className='cta-container'> 
          <p className='cta-text'>Have any questions? We're here to help!</p> 
          <button className='cta-btn'>
            <Link href='/contact'>Contact Us</Link> 
          </button>
        </div>
    </div>
  );
};

export default PaymentMethods;
