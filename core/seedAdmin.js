const bcrypt = require("bcryptjs");
const User = require("./models/User");

const seedAdmin = async () => {
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const adminPassword = (process.env.ADMIN_PASSWORD || "").trim();
  const adminName = (process.env.ADMIN_NAME || "Administrator").trim();

  if (!adminEmail || !adminPassword) {
    return;
  }

  const existingAdmin = await User.findOne({ email: adminEmail });
  if (existingAdmin) {
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await User.create({
    name: adminName,
    email: adminEmail,
    passwordHash,
    role: "admin",
  });

  console.log(`Seeded admin account for ${adminEmail}`);
};

module.exports = { seedAdmin };
