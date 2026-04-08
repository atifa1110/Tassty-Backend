import axios from 'axios';

export const createInvoice = async (invoiceData) => {
  try {
    const res = await axios.post(
      'https://api.xendit.co/v2/invoices',
      invoiceData,
      {
        auth: { username: process.env.XENDIT_SECRET, password: '' },
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return res.data;
  } catch (error) {
    console.error('Error creating invoice:', error.response?.data || error.message);
    throw error;
  }
};

export const getPaymentChannels = async () => {
  try {
    const res = await axios.get("https://api.xendit.co/payment_channels", {
      auth: {
        username: process.env.XENDIT_SECRET, // your secret key
        password: ""
      }
    });

    return res.data;
  } catch (err) {
    console.error("Error fetching payment channels:", err.response?.data || err.message);
    throw err;
  }
};

