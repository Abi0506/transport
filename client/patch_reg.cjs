const fs = require('fs');
let code = fs.readFileSync('client/src/pages/Registration.jsx', 'utf8');

// The replacement logic:
const oldStep3 = `} else {
      if (step === 1) return guidelinesAccepted
      if (step === 2) return instructionsAccepted
      if (step === 3) {
        return form.employeeId && form.name && form.dateOfBirth && form.category &&
          form.designation && form.department && form.address && form.pincode &&
          form.phoneNumber && form.emergencyPhoneNumber && form.mailId
      }`;

const newStep3 = `} else {
      if (step === 1) return guidelinesAccepted
      if (step === 2) return instructionsAccepted
      if (step === 3) {
        if (!form.mailId.endsWith('@psgitech.ac.in')) return false;
        return form.employeeId && form.name && form.dateOfBirth && form.category &&
          form.designation && form.department && form.address && form.pincode &&
          form.phoneNumber && form.emergencyPhoneNumber && form.mailId
      }`;

code = code.replace(oldStep3, newStep3);

code = code.replace(
  "{isStudent && form.mailId && !form.mailId.endsWith('@psgitech.ac.in') ? { borderColor: 'var(--accent-rose)' } : {}}",
  "{form.mailId && !form.mailId.endsWith('@psgitech.ac.in') ? { borderColor: 'var(--accent-rose)' } : {}}"
);

code = code.replace(
  "{isStudent && form.mailId && !form.mailId.endsWith('@psgitech.ac.in') && (",
  "{form.mailId && !form.mailId.endsWith('@psgitech.ac.in') && ("
);

code = code.replace(
  "{isStudent && form.mailId && form.mailId.endsWith('@psgitech.ac.in') && (",
  "{form.mailId && form.mailId.endsWith('@psgitech.ac.in') && ("
);

fs.writeFileSync('client/src/pages/Registration.jsx', code);
