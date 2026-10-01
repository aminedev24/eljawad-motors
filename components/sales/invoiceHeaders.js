
import { Document, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import React from 'react';
import { FaEnvelope, FaGlobe } from "react-icons/fa";

const styles = StyleSheet.create({
    description: {
        fontSize: "10px",
        maxWidth: "98%",
      },
      invoiceHeader: {
        display: "flex",
        flexDirection: "column",
        borderBottomWidth: 2,
        borderBottomColor: "#000",
        borderStyle: "solid",
        width: '100%'
      },
      headerFullWidth: {
        display: "flex",
        justifyContent: "flex-end",
        width: "100%",
      },
      headerFullWidthText: {
        margin: 0,
        fontSize: "10px",
        alignSelf: "flex-end",
      },
      headers: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        paddingBottom: "5px",
        alignItems: "center", // Ensure vertical alignment
        width: "100%",
      },
    
      logo: {
        width: "160px",
      },
      contactInfo: {
        maxWidth: "32%",
      },
      headerText: {
        fontSize: "10px",
      },
      companyName: {
        fontSize: "13px",
        fontWeight: "bold",
        marginBottom: "5px",
        paddingBottom: "10px",
      },
      rightText: {
        marginBottom: "5px",
        fontSize: "10px",
      },
      iconParagraph: {
        display: "flex",
        flexDirection: "row",
        fontSize: "10px",
        alignItems: "center",
      },

})

export const InvoiceHeaders = ({invoiceData, formattedInvoiceNumber, commercial}) => {
  return (
    <View style={styles.invoiceHeader}>
      <View style={styles.headerFullWidth}>
        <Text style={styles.headerFullWidthText}>
          {invoiceData.serialNumber}
        </Text>
      </View>
      <View style={styles.headers}>
        <View style={styles.headerLeft}>
          <View style={styles.contactInfo}>
            <Text style={styles.description}>
              An online platform for the sale and export of used vehicles and
              auto parts
            </Text>
            <Text style={styles.iconParagraph}>
             
              <Text>Email: contact@eljawad.com</Text>
            </Text>
            <Text style={styles.iconParagraph}>
              <Text>Website: www.eljawad.com</Text>
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.companyName}>Eljawad Motors Inc</Text>
          <Text style={styles.rightText}>
            <Text style={{ fontWeight: "bold" }}>Date:</Text>{" "}
            {invoiceData.invoiceDate}
          </Text>
          <Text style={styles.rightText}>
            <Text style={{ fontWeight: "bold" }}>Invoice Number:</Text>{" "}
            {formattedInvoiceNumber}
          </Text>
          <Text style={styles.rightText}>
            <Text style={{ fontWeight: "bold" }}>Expiry Date:</Text>{" "}
            {invoiceData.expiryDate}
          </Text>
          { !commercial? 
              <Text style={styles.rightText}>
              <Text style={{ fontWeight: "bold" }}>Purpose:</Text>{" "}
              {invoiceData.depositPurpose}
            </Text>
            : ''
          }
        
        </View>
      </View>
    </View>
  );
};
