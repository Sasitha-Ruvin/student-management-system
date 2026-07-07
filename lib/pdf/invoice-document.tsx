import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import {
  formatInvoiceAmount,
  formatInvoiceDate,
  formatMethodLabel,
  resolveInvoiceDisclaimer,
} from "./format-invoice";
import type { InvoiceData } from "./generate-invoice";

const BLACK = "#111111";
const GREY_HEADER = "#d9d9d9";
const GREY_BORDER = "#333333";
const GREY_TOTAL = "#d9d9d9";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: BLACK,
    paddingTop: 34,
    paddingBottom: 42,
    paddingHorizontal: 46,
    backgroundColor: "#ffffff",
  },

  pageWatermark: {
    position: "absolute",
    top: 318,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  watermarkImage: {
    width: 300,
    height: 300,
    objectFit: "contain",
  },

  logoWrap: {
    alignItems: "center",
    marginBottom: 16,
  },
  logoImage: {
    width: 280,
    height: 120,
    objectFit: "contain",
  },
  brandTheRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: 185,
  },
  brandTheLine: {
    height: 0.75,
    backgroundColor: BLACK,
    flex: 1,
  },
  brandThe: {
    fontSize: 7.5,
    letterSpacing: 2.5,
    paddingHorizontal: 5,
  },
  brandWalk: {
    fontSize: 44,
    fontFamily: "Times-Bold",
    letterSpacing: 7,
    textAlign: "center",
    marginTop: 2,
  },
  brandSub: {
    fontSize: 7,
    letterSpacing: 4.5,
    textAlign: "center",
    marginTop: 3,
  },

  invoiceTitle: {
    fontSize: 30,
    fontFamily: "Helvetica-Bold",
    marginBottom: 14,
  },

  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 30,
  },
  metaLeft: { flex: 1.05 },
  metaRight: { flex: 0.95 },

  fieldRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  fieldLabel: { fontSize: 9, width: 76 },
  fieldValue: {
    flex: 1,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    borderBottomWidth: 0.75,
    borderBottomColor: GREY_BORDER,
    paddingBottom: 2,
    minHeight: 14,
  },

  paymentMethodTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  bankLine: { fontSize: 8.5, lineHeight: 1.5 },

  table: {
    borderWidth: 0.75,
    borderColor: GREY_BORDER,
    marginBottom: 18,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: GREY_HEADER,
    borderBottomWidth: 0.75,
    borderBottomColor: GREY_BORDER,
    paddingVertical: 5,
    paddingHorizontal: 3,
  },
  lineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
  },
  lineRowLast: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 3,
  },
  tableSpacer: {
    minHeight: 130,
  },
  tableFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 0.75,
    borderTopColor: GREY_BORDER,
  },
  totalBox: {
    width: 120,
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: GREY_TOTAL,
    borderLeftWidth: 0.75,
    borderLeftColor: GREY_BORDER,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  totalLabel: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  totalValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },

  colNo: { width: "8%" },
  colDesc: { width: "44%", paddingHorizontal: 4 },
  colPrice: { width: "18%" },
  colQty: { width: "12%" },
  colTotal: { width: "18%" },

  th: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  td: { fontSize: 9, textAlign: "center" },
  tdDesc: {
    fontSize: 9,
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
  },

  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  footerLeft: { flex: 1, paddingRight: 24 },
  thankYou: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    marginBottom: 10,
  },
  contactLine: { fontSize: 8.5, marginBottom: 3 },
  signatureBlock: { width: 130, gap: 16, marginTop: 6 },
  signatureLine: {
    borderBottomWidth: 0.75,
    borderBottomColor: GREY_BORDER,
    height: 1,
  },

  disclaimer: {
    position: "absolute",
    bottom: 24,
    left: 46,
    right: 46,
    textAlign: "center",
    fontSize: 8,
    color: "#333333",
  },
});

type InvoiceDocumentProps = {
  data: InvoiceData;
  logoSrc: string | null;
  paidStampSrc: string | null;
};

function LogoBlock({ logoSrc }: { logoSrc: string | null }) {
  if (logoSrc) {
    return (
      <View style={styles.logoWrap}>
        <Image src={logoSrc} style={styles.logoImage} />
      </View>
    );
  }

  return (
    <View style={styles.logoWrap}>
      <View style={styles.brandTheRow}>
        <View style={styles.brandTheLine} />
        <Text style={styles.brandThe}>THE</Text>
        <View style={styles.brandTheLine} />
      </View>
      <Text style={styles.brandWalk}>WALK</Text>
      <Text style={styles.brandSub}>MODEL ACADEMY</Text>
    </View>
  );
}

export function InvoiceDocument({
  data,
  logoSrc,
  paidStampSrc,
}: InvoiceDocumentProps) {
  const amountStr = formatInvoiceAmount(data.paidThisReceipt);
  const lines = data.lines?.length
    ? data.lines
    : [{ description: data.lineDescription, amount: data.paidThisReceipt }];
  const spacerHeight = Math.max(90, 150 - lines.length * 28);
  const disclaimer = resolveInvoiceDisclaimer(data.invoiceTerms);
  const footerThanks = data.invoiceFooter?.trim() || "THANK YOU!";
  const billTo = data.studentName.trim().toUpperCase();

  const bankLines: string[] = [];
  if (data.bankName) bankLines.push(`Bank Name: ${data.bankName}`);
  if (data.bankAccountNumber) {
    bankLines.push(`Account Number: ${data.bankAccountNumber}`);
  }
  if (data.bankAccountName) {
    bankLines.push(`Account Name: ${data.bankAccountName}`);
  }
  if (data.bankBranch) bankLines.push(`Branch: ${data.bankBranch}`);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {paidStampSrc ? (
          <View style={styles.pageWatermark}>
            <Image src={paidStampSrc} style={styles.watermarkImage} />
          </View>
        ) : null}

        <LogoBlock logoSrc={logoSrc} />

        <Text style={styles.invoiceTitle}>INVOICE</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaLeft}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Date:</Text>
              <Text style={styles.fieldValue}>
                {formatInvoiceDate(data.paymentDate)}
              </Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>No. Invoice :</Text>
              <Text style={styles.fieldValue}>{data.invoiceNumber}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Bill to:</Text>
              <Text style={styles.fieldValue}>{billTo}</Text>
            </View>
          </View>

          <View style={styles.metaRight}>
            <Text style={styles.paymentMethodTitle}>Payment Method:</Text>
            {data.paymentMethodLabel ? (
              <Text style={styles.bankLine}>{data.paymentMethodLabel}</Text>
            ) : null}
            {bankLines.length > 0 ? (
              bankLines.map((line) => (
                <Text key={line} style={styles.bankLine}>
                  {line}
                </Text>
              ))
            ) : (
              <Text style={styles.bankLine}>
                {formatMethodLabel(data.method)}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colNo]}>NO</Text>
            <Text style={[styles.th, styles.colDesc]}>Description</Text>
            <Text style={[styles.th, styles.colPrice]}>Price</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colTotal]}>Total</Text>
          </View>

          {lines.map((line, index) => {
            const lineAmount = formatInvoiceAmount(line.amount);
            const isLast = index === lines.length - 1;
            return (
              <View
                key={`${line.description}-${index}`}
                style={isLast ? styles.lineRowLast : styles.lineRow}
              >
                <Text style={[styles.td, styles.colNo]}>{index + 1}</Text>
                <Text style={[styles.tdDesc, styles.colDesc]}>
                  {line.description}
                </Text>
                <Text style={[styles.td, styles.colPrice]}>{lineAmount}</Text>
                <Text style={[styles.td, styles.colQty]}> </Text>
                <Text style={[styles.td, styles.colTotal]}>{lineAmount}</Text>
              </View>
            );
          })}

          <View style={[styles.tableSpacer, { minHeight: spacerHeight }]} />

          <View style={styles.tableFooter}>
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>{amountStr}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.footerLeft}>
            <Text style={styles.thankYou}>{footerThanks}</Text>
            {data.academyPhone ? (
              <Text style={styles.contactLine}>{data.academyPhone}</Text>
            ) : null}
            {data.academyEmail ? (
              <Text style={styles.contactLine}>{data.academyEmail}</Text>
            ) : null}
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <View style={styles.signatureLine} />
            <View style={styles.signatureLine} />
          </View>
        </View>

        <Text style={styles.disclaimer} fixed>
          {disclaimer}
        </Text>
      </Page>
    </Document>
  );
}
