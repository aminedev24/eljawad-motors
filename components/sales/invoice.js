import React from 'react';
import './ProformaInvoice.css'; // Assuming you will create a separate CSS file for styles

const ProformaInvoice = () => {
    const invoiceData = {
        billedTo: {
            fullName: 'John Doe',
            company: 'Doe Enterprises',
            address: '123 Main St, Anytown, USA',
            phone: '123-456-7890',
            email: 'john.doe@example.com',
        },
        date: '2024/12/22',
        invoiceNumber: '1001',
        beneficiaryName: 'A',
        bankName: 'B',
        branchName: 'H',
        bankAddress: '3',
        swiftCode: 'N',
        accountNumber: '262',
        beneficiaryAddress: '5-10',
        items: [
            { description: 'Drayage (estimated)', size: 'N/A', unitPrice: '100,000', amount: '100,000' },
            { description: 'Loading (estimated)', size: 'N/A', unitPrice: '100,000', amount: '100,000' },
            { description: 'Nesting (estimated)', size: 'N/A', unitPrice: '300,000', amount: '300,000' },
            { description: 'Freight (estimated)', size: 'N/A', unitPrice: '612,000', amount: '612,000' },
        ],
        grandTotal: '1,112,000',
    };

    return (
        <div className="container">
            <div className="header">
                <img
                    alt="Eljawad Motors Inc. Logo"
                    height="50"
                    src="https://storage.googleapis.com/a1aa/image/6LfMKmuZf0gmKUBiJiWK8XAj2bOII5VCjDDzF78NLd14VIenA.jpg"
                    width="150"
                />
                <div className="contact-info">
                    <p>Eljawad Motors Inc</p>
                </div>
            </div>
            <div className="header">
                <div className="contact-info">
                    <p>An online platform for the sale and export of used vehicles and auto parts</p>
                    <p>Email: contact@artisbay.com</p>
                </div>
            </div>
            <div className="invoice-title">Proforma Invoice</div>
            <div className="invoice-info">
                <div className="left">
                    <p><strong>Billed to:</strong></p>
                    <p>{invoiceData.billedTo.fullName}</p>
                    <p>{invoiceData.billedTo.company}</p>
                    <p>{invoiceData.billedTo.address}</p>
                    <p>{invoiceData.billedTo.phone}</p>
                    <p>{invoiceData.billedTo.email}</p>
                </div>
                <div className="right">
                    <p>Date: {invoiceData.date}</p>
                    <p>Invoice: {invoiceData.invoiceNumber}</p>
                </div>
            </div>
            <div className="invoice-info">
                <div className="left">
                    <p>
                        <strong>Beneficiary name:</strong>
                        <span style={{ backgroundColor: 'blue', color: 'blue' }}>{invoiceData.beneficiaryName}</span>
                    </p>
                    <p>
                        <strong>Bank name:</strong>
                        <span style={{ backgroundColor: 'blue', color: 'blue' }}>{invoiceData.bankName}</span>
                    </p>
                    <p>
                        <strong>Branch name:</strong>
                        <span style={{ backgroundColor: 'blue', color: 'blue' }}>{invoiceData.branchName}</span>
                    </p>
                    <p>
                        <strong>Bank Address:</strong>
                        <span style={{ backgroundColor: 'blue', color: 'blue' }}>{invoiceData.bankAddress}</span>
                    </p>
                    <p>
                        <strong>Swift code:</strong>
                        <span style={{ backgroundColor: 'blue', color: 'blue' }}>{invoiceData.swiftCode}</span>
                    </p>
                    <p>
                        <strong>Account Number:</strong>
                        <span style={{ backgroundColor: 'blue', color: 'blue' }}>{invoiceData.accountNumber}</span>
                    </p>
                    <p>
                        <strong>Beneficiary Address:</strong>
                        <span style={{ backgroundColor : 'blue', color: 'blue' }}>{invoiceData.beneficiaryAddress}</span>
                    </p>
                </div>
            </div>
            <div className="items">
                <h3>Items</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Size</th>
                            <th>Unit Price</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoiceData.items.map((item, index) => (
                            <tr key={index}>
                                <td>{item.description}</td>
                                <td>{item.size}</td>
                                <td>{item.unitPrice}</td>
                                <td>{item.amount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="grand-total">
                <h3>Grand Total: {invoiceData.grandTotal}</h3>
            </div>
        </div>
    );
};

export default ProformaInvoice;