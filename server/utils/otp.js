const otps = new Map(); // In-memory storage (use Redis in production)

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

const storeOtp = (email, otp) => {
  otps.set(email, { otp, expires: Date.now() + 10 * 60 * 1000 }); // Expires in 10 minutes
};

const verifyOtp = (email, otp) => {
  const record = otps.get(email);
  if (!record) return false;
  if (Date.now() > record.expires) {
    otps.delete(email);
    return false;
  }
  if (record.otp !== otp) return false;
  otps.delete(email); // OTP is single-use
  return true;
};

module.exports = { generateOtp, storeOtp, verifyOtp };