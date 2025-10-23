// testEmail.js
import { sendEmail } from './utils/email/sendMail.js'

sendEmail({
  to: 'teuemail@gmail.com',
  subject: 'Teste SMTP Estoqueologia',
  text: 'Se você recebeu isso, o SMTP está funcionando! 🚀',
}).catch(console.error)
