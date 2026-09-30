import React from 'react';

const PaypalInfo = () => {
  return (
    <div className='paypal'>
      
      {/*<img style={{ maxHeight : 'unset' }}  src={`${process.env.PUBLIC_URL}/images/paypalbanner.png`} alt={'company-profile'} className="topic-image" />*/}
      <h4>Simple & Secure Payments with PayPal</h4>
      <p>
        At Eljawad Motors, we prioritize security and convenience in every transaction. That’s why we’ve chosen PayPal as our trusted partner to process all payments safely and seamlessly.
      </p>
      <h4>What is PayPal?</h4>
      <p>
        PayPal is a fast and secure way to send and receive payments online. With just a few clicks, you can complete transactions, and the funds are instantly credited to the recipient’s account, streamlining the payment process.
      </p>
      <h4>How It Works:</h4>
      <ol>
        <li>Order Confirmation: Once your order is finalized, we’ll prepare an invoice tailored to your purchase.</li>
        <li>Invoice Sent: You’ll receive the invoice directly from PayPal, detailing your order and the total amount due.</li>
        <li>Secure Payment: Simply follow the link in the invoice email to securely complete your payment via PayPal’s trusted platform.</li>
      </ol>
      <h4>Convenient, Anytime Payments</h4>
      <p>
        Whether you’re at home or on the go, PayPal allows you to make payments anytime, from anywhere. This flexibility ensures you can complete transactions without being tied to a specific location or time.
      </p>
      <h4>Instant Transfers for Peace of Mind</h4>
      <p>
        Unlike traditional bank transfers, which can take 3 days or more depending on bank time and schedule, PayPal processes payments in real time. This speed reduces wait times and helps prevent potential issues associated with delayed payments.
      </p>
      <h4>Secure Transactions Without Sharing Card Details</h4>
      <p>
        With PayPal, your sensitive payment information stays private. There’s no need to share your credit card details with anyone else, adding an extra layer of security to every transaction.
      </p>
      <h4>Why Pay by Invoice?</h4>
      <p>
        Paying by invoice provides additional security and transparency, allowing you to review your order and confirm details before payment.
      </p>
      <h4>Need Assistance?</h4>
      <p>
        If you have any questions or need help with your invoice, don’t hesitate to reach out. We’re here to ensure your payment process is as smooth and secure as possible.
      </p>
      <h4>How to Register for PayPal?</h4>
      <ol>
        <li>Click <a className='cta-link paypal-link' rel="noreferrer" target='_blank' href="https://www.paypal.com/ca/for-you/account/create-account">Sign up for a PayPal account</a>.</li>
        <li>Select the type of account you would like to create, and click Get Started.</li>
        <li>Enter the required information and click Continue.</li>
        <li>Follow the instructions to complete your account sign-up.</li>
      </ol>
      <p>If you need more assistance, please feel free to contact us.</p>
    </div>
  );
};

export default PaypalInfo;
